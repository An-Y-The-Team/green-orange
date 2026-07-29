/**
 * Low-level HTTP transport for talking to crm-api — NOT a catalog of resource
 * calls. Each resource's reads live in its route's `queries.ts`; each mutation
 * lives directly in its server action. They share only these primitives.
 *
 * CRM_API_URL is REQUIRED — there is no mock fallback any more. Unset, every call
 * targets "undefined/…" and fails, which is the intended behaviour: a missing
 * backend must look broken, not empty. It normally points at the NestJS backend
 * (apps/crm-api-nest, :8001), which implements the whole UI. apps/crm-api
 * (FastAPI, :8000) is the v1 teaching sandbox and no longer UI-compatible.
 *
 * Runs server-side only — CRM_API_URL is a server-only var (no NEXT_PUBLIC_
 * prefix), so the backend URL is never inlined into the client bundle, and the
 * backend itself can stay unexposed on an internal network. The bearer token is,
 * in order: the user's Authentik session token when OIDC is enabled; an explicit
 * CRM_API_TOKEN override if set; else one auto-minted from /auth/token with the
 * local dev credentials (AUTH_MODE=local) and cached until it 401s.
 */
import { auth } from "@/auth";
import { authEnabled } from "@/auth.config";

export const API_URL = process.env.CRM_API_URL;

// Local dev credentials used to auto-mint a token in AUTH_MODE=local. Never used
// when Authentik/OIDC is enabled or CRM_API_TOKEN is set. Seeded user is admin/admin.
const DEV_USER = process.env.CRM_DEV_USER ?? "admin";
const DEV_PASSWORD = process.env.CRM_DEV_PASSWORD ?? "admin";

// Cached local token — minted on demand, re-minted on a 401. Module-level means
// one mint per server process, which is all dev needs.
// ponytail: in-memory cache, no refresh-token dance — an expired token just re-mints.
let localToken: string | undefined;

async function mintLocalToken(): Promise<string | undefined> {
  const res = await fetch(`${API_URL}/auth/token`, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username: DEV_USER, password: DEV_PASSWORD }),
  });
  if (!res.ok) return undefined;
  localToken = ((await res.json()) as { access_token: string }).access_token;
  return localToken;
}

async function getBearer(forceRefresh = false): Promise<string | undefined> {
  if (authEnabled) return (await auth())?.accessToken;
  if (process.env.CRM_API_TOKEN) return process.env.CRM_API_TOKEN;
  if (forceRefresh || !localToken) return mintLocalToken();
  return localToken;
}

export const SESSION_EXPIRED =
  "Phiên đăng nhập đã hết hạn — tải lại trang để đăng nhập lại.";

// Whether a 401 should trigger a token re-mint + retry — only for the auto-mint
// path (local mode, no explicit override). Authentik/override tokens self-heal elsewhere.
const canRemint = () => !authEnabled && !process.env.CRM_API_TOKEN;

// A hung backend must become a visible error rather than a request that never
// settles. Reads used to get this from `api.fetch`; now both reads and writes do.
const REQUEST_TIMEOUT_MS = 30_000;

// Sends a request with the bearer attached; on a 401 in local mode, re-mints the
// dev token once and retries so an expired token self-heals instead of erroring.
//
// Deliberately plain `fetch`, not `@yan/shared/api`'s wrapper: that one THROWS on
// a non-2xx instead of returning the Response, so every 401 check below was
// unreachable for reads — an expired dev token could not self-heal, and a dead
// session surfaced as a raw 401 instead of SESSION_EXPIRED. The wrapper also gave
// us nothing else here: its plugins are client-only (`initializeApi` no-ops on the
// server) and crm-web never calls `configure()`, so only its timeout mattered and
// that is now explicit above.
async function fetchWithAuth(
  url: string,
  init: RequestInit
): Promise<Response> {
  const call = (token?: string) =>
    fetch(url, {
      ...init,
      cache: "no-store",
      // Fresh signal per attempt, so the 401 retry gets its own full budget.
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: {
        ...init.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  const res = await call(await getBearer());
  if (res.status === 401 && canRemint()) return call(await getBearer(true));
  // Live auth + 401 → the session's token is dead (expired or revoked). Fail with
  // a human message here so all ~40 server actions surface "log in again" from
  // their existing catch instead of a raw "401 Unauthorized"; reloading the page
  // then hits the layout's auth gate, which shows the login overlay.
  if (res.status === 401 && authEnabled) throw new Error(SESSION_EXPIRED);
  return res;
}

// Carries the HTTP status as data so callers can branch on it. A plain Error only
// interpolates the status into its message, which forces string-parsing.
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetchWithAuth(`${API_URL}${path}`, {});
  if (!res.ok) {
    throw new ApiError(
      res.status,
      `API ${path} failed: ${res.status} ${res.statusText}`
    );
  }
  return res.json() as Promise<T>;
}

// The Python teaching sandbox answers 501 for endpoints students haven't built
// yet; degrade ONLY that so their pages still render.
const NOT_IMPLEMENTED = 501;

// Everything else — 500, timeout, dead backend — rethrows and lands on the route
// group's error.tsx. Swallowing it would make an outage indistinguishable from
// "no records", which is exactly how /projects used to answer 200 + [] with the
// backend down.
export async function apiFetchSafe<T>(path: string, fallback: T): Promise<T> {
  try {
    return await apiFetch<T>(path);
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== NOT_IMPLEMENTED) throw err;
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[crm-web] ${path} not implemented (501), using fallback`);
    }
    return fallback;
  }
}

// Write counterpart of apiFetch — sends a JSON body with the bearer token.
export async function apiSend<T>(
  path: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown
): Promise<T> {
  const res = await fetchWithAuth(`${API_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `API ${method} ${path} failed: ${res.status} ${res.statusText}${detail ? ` — ${detail}` : ""}`
    );
  }
  // DELETE handlers answer 204 with an empty body — res.json() would throw
  // "Unexpected end of JSON input" after the row is already gone.
  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}
