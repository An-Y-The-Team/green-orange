/**
 * Server-only transport + access gate for the Người dùng page, which manages
 * CRM accounts in Authentik's REST API (`/api/v3/`) with a service-account
 * token. Design: docs/authentik-user-management-future.md. Endpoint strings
 * live in the feature folder (`settings/users/`), this file only knows how to
 * call Authentik and who may.
 *
 * The API base is the ISSUER's origin — the public Authentik URL the headless
 * login already talks to — not the Docker-internal hostname: Authentik builds
 * recovery links from the request host, and a link to `authentik-server:9000`
 * is useless to the person receiving it.
 */
import { auth } from "@/auth";
import { ApiError } from "@/utils/http/http";

/** Authentik group whose members may manage accounts (admin + secretary). */
export const USER_ADMIN_GROUP = "crm-admins";

const TOKEN = process.env.AUTHENTIK_ADMIN_TOKEN;
const ISSUER = process.env.AUTH_AUTHENTIK_ISSUER;

/** The page exists only when the operator minted a token (see .env.example). */
export const usersEnabled = Boolean(TOKEN && ISSUER);

const REQUEST_TIMEOUT_MS = 30_000;

/**
 * One Authentik call. Non-2xx → ApiError so the actions' `toActionError` maps
 * it like a crm-api failure; 204 → undefined.
 */
export async function akFetch<T>(path: string, init?: RequestInit): Promise<T> {
  if (!usersEnabled) throw new Error("Authentik admin API is not configured");
  const res = await fetch(`${new URL(ISSUER!).origin}/api/v3${path}`, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...init?.headers,
      Authorization: `Bearer ${TOKEN}`,
    },
  });
  if (!res.ok) {
    const raw = await res.text().catch(() => "");
    const line = `Authentik ${init?.method ?? "GET"} ${path} failed: ${res.status}${raw ? ` — ${raw}` : ""}`;
    console.error(`[crm-web] ${line}`);
    throw new ApiError(res.status, line, authentikMessage(raw));
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

// DRF error bodies: {"detail": "…"}, {"non_field_errors": ["…"]} or
// {"username": ["…"]} — pick the first sentence, whatever the key.
function authentikMessage(raw: string): string | undefined {
  try {
    const body = JSON.parse(raw) as Record<string, unknown>;
    for (const value of Object.values(body)) {
      if (typeof value === "string") return value;
      if (Array.isArray(value) && typeof value[0] === "string") return value[0];
    }
  } catch {
    /* not JSON */
  }
  return undefined;
}

/** Thrown by {@link requireUserAdmin}; actions turn it into `state.message`. */
export class ForbiddenError extends Error {
  constructor() {
    super("Bạn không có quyền quản lý người dùng.");
    this.name = "ForbiddenError";
  }
}

type AkSelf = {
  is_superuser: boolean;
  groups_obj: { name: string }[];
};

/**
 * Who is signed in, by Authentik username. Read from the access token's `sub`
 * (the provider is `sub_mode: user_username`, and crm-api resolves identity the
 * same way) — NOT `session.user.name`, which the redirect provider fills with
 * the display name. The token came out of our own encrypted session cookie, so
 * decoding without re-verifying is fine here.
 */
export async function sessionUsername(): Promise<string | undefined> {
  const token = (await auth())?.accessToken;
  const payload = token?.split(".")[1];
  if (!payload) return undefined;
  try {
    const claims = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as { sub?: unknown };
    return typeof claims.sub === "string" && claims.sub
      ? claims.sub
      : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The gate: signed in AND (superuser OR member of {@link USER_ADMIN_GROUP}).
 * One Authentik lookup per call — the page and every action re-check, because
 * server actions are directly callable and a hidden card is not security.
 * Anything unexpected (no session, Authentik down) answers false, never throws.
 */
export async function isUserAdmin(): Promise<boolean> {
  if (!usersEnabled) return false;
  try {
    const username = await sessionUsername();
    if (!username) return false;
    const { results } = await akFetch<{ results: AkSelf[] }>(
      `/core/users/?username=${encodeURIComponent(username)}`
    );
    const me = results[0];
    return Boolean(
      me &&
      (me.is_superuser ||
        me.groups_obj.some((g) => g.name === USER_ADMIN_GROUP))
    );
  } catch {
    return false;
  }
}

/** {@link isUserAdmin} for server actions: throws {@link ForbiddenError}. */
export async function requireUserAdmin(): Promise<void> {
  if (!(await isUserAdmin())) throw new ForbiddenError();
}
