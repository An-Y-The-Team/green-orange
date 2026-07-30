import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { LoginFailureReason } from "@/constants/login-failure-reason";

import { headlessLogin } from "./authentik-flow";

// headlessLogin is one long network walk, so only the parts that need no live
// Authentik are covered here: the config guards and the authorize request it
// builds. Everything past the first 302 (flow executor stages, the code
// exchange) is deliberately NOT tested — simulating it would mean asserting
// against a hand-written mock of authentik 2025.10's Post/Redirect/Get
// behaviour, which pins the mock rather than the server.

const ISSUER = "https://auth.example.com/application/o/green-orange/";
const SECRET = "s3cret-client-secret";
const PASSWORD = "correct horse battery staple";

// Every request answers 302 with no Location, so the walk can't find a
// /if/flow/<slug> and bails after the authorize call we want to inspect.
// Typed with fetch's call signature rather than `typeof fetch` — the DOM/React
// fetch carries a `preconnect` property a plain mock can't satisfy.
const fetchMock = vi.fn<
  (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
>(() => Promise.resolve(new Response(null, { status: 302 })));

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("AUTH_AUTHENTIK_ISSUER", ISSUER);
  vi.stubEnv("AUTH_AUTHENTIK_ID", "crm-web");
  vi.stubEnv("AUTH_AUTHENTIK_SECRET", SECRET);
  vi.stubEnv("AUTH_URL", "https://crm.example.com");
});

afterEach(() => {
  fetchMock.mockClear();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

/** Query params of the initial /application/o/authorize/ request. */
async function authorizeParams() {
  await headlessLogin("nhanvien", PASSWORD);
  return new URL(String(fetchMock.mock.calls[0]?.[0])).searchParams;
}

test("missing Authentik config fails closed without touching the network", async () => {
  vi.stubEnv("AUTH_AUTHENTIK_SECRET", undefined);

  await expect(headlessLogin("nhanvien", PASSWORD)).resolves.toEqual({
    ok: false,
    reason: LoginFailureReason.ERROR,
  });
  expect(fetchMock).not.toHaveBeenCalled();
});

// The bug this guards: `new URL(issuer)` used to run outside the try/catch, so
// an issuer missing its scheme threw out of headlessLogin. NextAuth turns a
// throw from authorize() into a 500 — the login overlay showed nothing at all
// instead of an error, and only the server log said why.
test("a malformed issuer returns an error result instead of throwing", async () => {
  vi.stubEnv("AUTH_AUTHENTIK_ISSUER", "auth.example.com"); // no scheme

  await expect(headlessLogin("nhanvien", PASSWORD)).resolves.toEqual({
    ok: false,
    reason: LoginFailureReason.ERROR,
  });
  expect(fetchMock).not.toHaveBeenCalled();
});

test("authorize is a PKCE S256 code request on the issuer's origin", async () => {
  const params = await authorizeParams();
  const url = String(fetchMock.mock.calls[0]?.[0]);

  // Origin only — the issuer's application path must not leak into the
  // authorize endpoint.
  expect(url).toMatch(
    /^https:\/\/auth\.example\.com\/application\/o\/authorize\/\?/
  );
  expect(params.get("response_type")).toBe("code");
  expect(params.get("client_id")).toBe("crm-web");
  expect(params.get("code_challenge_method")).toBe("S256");
  // offline_access is what gets a refresh token; the rest map to the claims
  // crm-api's verifier reads.
  expect(params.get("scope")).toBe("openid email profile offline_access");
  // base64url: no +, / or = padding, or Authentik rejects the verifier later.
  expect(params.get("code_challenge")).toMatch(/^[A-Za-z0-9_-]{43}$/);
});

test("redirect_uri is built from AUTH_URL with exactly one slash", async () => {
  vi.stubEnv("AUTH_URL", "https://crm.example.com/"); // trailing slash

  expect((await authorizeParams()).get("redirect_uri")).toBe(
    "https://crm.example.com/api/auth/callback/authentik"
  );
});

// The client secret belongs in the token POST body only, and the password only
// in a flow-executor JSON body. Either one in a query string would be sitting
// in Authentik's access log and every proxy in between.
test("no secret or password is interpolated into a request URL", async () => {
  await headlessLogin("nhanvien", PASSWORD);

  expect(fetchMock).toHaveBeenCalled();
  for (const [input] of fetchMock.mock.calls) {
    const url = String(input);
    expect(url).not.toContain(SECRET);
    expect(url).not.toContain("client_secret");
    expect(url).not.toContain(PASSWORD);
    expect(url).not.toContain(encodeURIComponent(PASSWORD));
  }
});

// A fixed state or code_challenge would make the authorize request replayable.
test("state and PKCE challenge are fresh per login attempt", async () => {
  const first = await authorizeParams();
  fetchMock.mockClear();
  const second = await authorizeParams();

  expect(second.get("state")).not.toBe(first.get("state"));
  expect(second.get("code_challenge")).not.toBe(first.get("code_challenge"));
});

// Authentik answering something other than a login flow (app misconfigured,
// policy denying the app) must read as a failed login, not a hang or a crash.
test("a 302 chain that never reaches a flow gives up with an error", async () => {
  await expect(headlessLogin("nhanvien", PASSWORD)).resolves.toEqual({
    ok: false,
    reason: LoginFailureReason.ERROR,
  });
  // 1 authorize + at most 3 indirection hops — bounded, never a loop.
  expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(4);
});
