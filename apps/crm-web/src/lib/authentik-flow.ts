/**
 * Headless Authentik login — drives the Flow Executor API server-to-server so a
 * user can sign in without leaving the page. Design + trade-offs documented in
 * docs/authentik-headless-login-future.md. Only Identification / Password
 * stages are supported; anything else (MFA, captcha, consent, passkeys…)
 * returns "unsupported_stage" and the UI falls back to the hosted /login.
 *
 * fetch + Web Crypto only — safe in the edge-shared auth config.
 */

export type HeadlessLogin =
  | { ok: true; accessToken: string; refreshToken?: string; expiresAt: number }
  | {
      ok: false;
      reason: "invalid_credentials" | "unsupported_stage" | "error";
    };

// Shape of a flow-executor challenge (only the fields we branch on).
type Challenge = {
  type?: string;
  component?: string;
  to?: string;
  password_fields?: boolean;
  response_errors?: Record<string, unknown>;
};

const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

async function pkce() {
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(32)));
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier)
  );
  return { verifier, challenge: b64url(new Uint8Array(digest)) };
}

// ponytail: naive name→value jar (no path/expiry) — plenty for one login sequence.
class CookieJar {
  private jar = new Map<string, string>();
  absorb(res: Response) {
    for (const sc of res.headers.getSetCookie()) {
      const pair = sc.split(";", 1)[0];
      const eq = pair.indexOf("=");
      if (eq > 0)
        this.jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
    }
  }
  header() {
    return [...this.jar].map(([k, v]) => `${k}=${v}`).join("; ");
  }
  get(name: string) {
    return this.jar.get(name);
  }
}

export async function headlessLogin(
  username: string,
  password: string
): Promise<HeadlessLogin> {
  const issuer = process.env.AUTH_AUTHENTIK_ISSUER;
  const clientId = process.env.AUTH_AUTHENTIK_ID;
  const clientSecret = process.env.AUTH_AUTHENTIK_SECRET;
  if (!issuer || !clientId || !clientSecret)
    return { ok: false, reason: "error" };
  const origin = new URL(issuer).origin;

  // Must match a redirect URI registered on the Authentik app. No browser ever
  // lands on it in this path — it only anchors the code exchange.
  const appUrl = (
    process.env.AUTH_URL ?? `http://localhost:${process.env.PORT ?? 3002}`
  ).replace(/\/$/, "");
  const redirectUri = `${appUrl}/api/auth/callback/authentik`;

  const jar = new CookieJar();
  const { verifier, challenge } = await pkce();

  try {
    // 1. Kick off authorize (PKCE); unauthenticated → 302 into the login flow.
    const authorize = await fetch(
      `${origin}/application/o/authorize/?${new URLSearchParams({
        response_type: "code",
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: "openid email profile offline_access",
        state: b64url(crypto.getRandomValues(new Uint8Array(16))),
        code_challenge: challenge,
        code_challenge_method: "S256",
      })}`,
      { redirect: "manual", cache: "no-store" }
    );
    jar.absorb(authorize);
    // The 302 chain may pass through the default-flow indirection URL
    // (/flows/-/default/authentication/?next=…) before landing on the flow
    // interface (/if/flow/<slug>/) — follow it until the slug appears.
    let flowLocation = authorize.headers.get("location") ?? "";
    for (let i = 0; i < 3 && !flowLocation.includes("/if/flow/"); i++) {
      const hop = await fetch(new URL(flowLocation, origin), {
        redirect: "manual",
        cache: "no-store",
        headers: { Cookie: jar.header() },
      });
      jar.absorb(hop);
      flowLocation = hop.headers.get("location") ?? "";
    }
    const slug = /\/if\/flow\/([^/?]+)/.exec(flowLocation)?.[1];
    if (!slug) return { ok: false, reason: "error" };
    const flowQuery = new URL(flowLocation, origin).search.replace(/^\?/, "");

    // 2. Walk the flow executor: identification → password → redirect.
    const executor = `${origin}/api/v3/flows/executor/${slug}/?query=${encodeURIComponent(flowQuery)}`;
    const step = async (body?: object): Promise<Challenge> => {
      const csrf = jar.get("authentik_csrf");
      let res = await fetch(executor, {
        method: body ? "POST" : "GET",
        redirect: "manual",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          Cookie: jar.header(),
          ...(body ? { "Content-Type": "application/json" } : {}),
          // Authentik CSRF-protects session-authenticated POSTs.
          ...(csrf ? { "X-authentik-CSRF": csrf } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      jar.absorb(res);
      // Executor answers POSTs with Post/Redirect/Get (observed against
      // authentik 2025.10) — follow the 3xx chain until JSON arrives. A
      // finished authorize can surface directly as a redirect carrying the code.
      for (let i = 0; i < 5 && res.status >= 300 && res.status < 400; i++) {
        const loc = res.headers.get("location") ?? "";
        if (loc.includes("code=")) return { type: "redirect", to: loc };
        res = await fetch(new URL(loc, origin), {
          redirect: "manual",
          cache: "no-store",
          headers: { Accept: "application/json", Cookie: jar.header() },
        });
        jar.absorb(res);
      }
      return (await res.json()) as Challenge;
    };

    let ch = await step();
    for (let i = 0; i < 6; i++) {
      if (ch.type === "redirect" || ch.component === "xak-flow-redirect") break;
      if (ch.response_errors && Object.keys(ch.response_errors).length) {
        return { ok: false, reason: "invalid_credentials" };
      }
      if (ch.component === "ak-stage-identification") {
        // A combined ident+password stage takes the password in the same POST.
        ch = await step({
          component: "ak-stage-identification",
          uid_field: username,
          ...(ch.password_fields ? { password } : {}),
        });
      } else if (ch.component === "ak-stage-password") {
        ch = await step({ component: "ak-stage-password", password });
      } else {
        return { ok: false, reason: "unsupported_stage" };
      }
    }
    if (
      !(ch.type === "redirect" || ch.component === "xak-flow-redirect") ||
      !ch.to
    ) {
      return { ok: false, reason: "error" };
    }

    // 3. Follow the terminating redirect to collect the authorization code —
    //    do NOT follow into crm-web's callback; just read `code` off Location.
    const finish = await fetch(new URL(ch.to, origin), {
      redirect: "manual",
      cache: "no-store",
      headers: { Cookie: jar.header() },
    });
    jar.absorb(finish);
    const code = new URL(
      finish.headers.get("location") ?? "",
      appUrl
    ).searchParams.get("code");
    if (!code) return { ok: false, reason: "error" };

    // 4. Standard code exchange (PKCE + client secret) — same token endpoint
    //    the redirect flow uses; crm-api verifies the result identically.
    const tokenRes = await fetch(`${origin}/application/o/token/`, {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
        code_verifier: verifier,
      }),
    });
    if (!tokenRes.ok) return { ok: false, reason: "error" };
    const tok = (await tokenRes.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };
    return {
      ok: true,
      accessToken: tok.access_token,
      refreshToken: tok.refresh_token,
      expiresAt: Math.floor(Date.now() / 1000) + tok.expires_in,
    };
  } catch {
    return { ok: false, reason: "error" };
  }
}
