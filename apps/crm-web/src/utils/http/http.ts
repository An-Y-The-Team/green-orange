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
import { AUTH_ENABLED } from "@/auth.config";
import { UNKNOWN_ERROR_MESSAGE } from "@/constants/server-action";
import {
  apiErrorMessage,
  unmappedApiMessage,
} from "@/utils/api-error-message/api-error-message";

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
  if (AUTH_ENABLED) return (await auth())?.accessToken;
  if (process.env.CRM_API_TOKEN) return process.env.CRM_API_TOKEN;
  if (forceRefresh || !localToken) return mintLocalToken();
  return localToken;
}

export const SESSION_EXPIRED =
  "Phiên đăng nhập đã hết hạn — tải lại trang để đăng nhập lại.";

// Whether a 401 should trigger a token re-mint + retry — only for the auto-mint
// path (local mode, no explicit override). Authentik/override tokens self-heal elsewhere.
const canRemint = () => !AUTH_ENABLED && !process.env.CRM_API_TOKEN;

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
  // then hits the layout's probe read (loadCompany → sessionExpired), which
  // re-gates with the login overlay even though Auth.js still holds a session.
  if (res.status === 401 && AUTH_ENABLED) throw new Error(SESSION_EXPIRED);
  return res;
}

// Carries the HTTP status as data so callers can branch on it. A plain Error only
// interpolates the status into its message, which forces string-parsing.
//
// `message` stays the full diagnostic line (verb, path, status, body) because
// that is what belongs in a server log. `backendMessage` is the sentence the API
// actually complained with, and is the ONLY part allowed anywhere near a toast —
// via `toActionError`, which translates it. Nothing should render `.message`.
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly backendMessage?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * The API's own complaint, pulled out of the error body: Nest answers
 * `{statusCode, message, error}` (message is a string, or an array when its
 * validation pipe rejects a DTO), FastAPI answers `{detail}` — the two shapes
 * `AGENTS.md` records as a deliberate difference. Anything unparseable yields
 * undefined and the caller falls back to a per-status sentence.
 */
async function readBackendMessage(res: Response): Promise<{
  backendMessage?: string;
  raw: string;
}> {
  const raw = await res.text().catch(() => "");
  try {
    const body: unknown = JSON.parse(raw);
    if (!body || typeof body !== "object") return { raw };
    const { message, detail } = body as {
      message?: unknown;
      detail?: unknown;
    };
    const pick = message ?? detail;
    if (typeof pick === "string") return { backendMessage: pick, raw };
    // Nest's ValidationPipe sends string[]; FastAPI's 422 sends objects with a
    // `msg`. Join so a DTO rejection still says which fields.
    if (Array.isArray(pick)) {
      const parts = pick
        .map((item) =>
          typeof item === "string"
            ? item
            : typeof (item as { msg?: unknown })?.msg === "string"
              ? String((item as { msg: string }).msg)
              : undefined
        )
        .filter((part): part is string => Boolean(part));
      if (parts.length) return { backendMessage: parts.join("; "), raw };
    }
    return { raw };
  } catch {
    return { raw };
  }
}

/**
 * Every non-2xx becomes an ApiError whose diagnostic line is logged HERE, once,
 * server-side. Before this, the line was the throw's message and each action
 * handed it to a toast — the operator read the HTTP verb and the URL.
 */
async function failure(label: string, res: Response): Promise<ApiError> {
  const { backendMessage, raw } = await readBackendMessage(res);
  const line = `API ${label} failed: ${res.status} ${res.statusText}${raw ? ` — ${raw}` : ""}`;
  console.error(`[crm-web] ${line}`);
  if (process.env.NODE_ENV !== "production") {
    const unmapped = unmappedApiMessage(res.status, backendMessage);
    if (unmapped) console.warn(unmapped);
  }
  return new ApiError(res.status, line, backendMessage);
}

/**
 * Any thrown value → the Vietnamese sentence an action returns as
 * `state.message`. The single conversion point for all 32 action files, so no
 * `catch` has to remember not to leak `error.message`.
 *
 * `fallback` is the action's own "Không thể …" line, used only where the status
 * has no better wording of its own.
 */
export function toActionError(error: unknown, fallback?: string): string {
  if (error instanceof ApiError)
    return apiErrorMessage({
      status: error.status,
      backendMessage: error.backendMessage,
      fallback,
    });
  // Already a human sentence, thrown by fetchWithAuth for a dead session.
  if (error instanceof Error && error.message === SESSION_EXPIRED)
    return SESSION_EXPIRED;
  // Timeout / DNS / connection refused — the request never got an answer, so
  // there is no status and the caller's "không thể cập nhật X" would blame the
  // data for an outage.
  if (error instanceof Error) {
    console.error(`[crm-web] request failed: ${error.message}`);
    return apiErrorMessage({});
  }
  return fallback ?? UNKNOWN_ERROR_MESSAGE;
}

// GET + the ApiError, shared by the two read helpers below. Returns the Response
// itself so a caller can read headers, not just the body.
async function get(path: string): Promise<Response> {
  const res = await fetchWithAuth(`${API_URL}${path}`, {});
  if (!res.ok) throw await failure(`GET ${path}`, res);
  return res;
}

export async function apiFetch<T>(path: string): Promise<T> {
  return (await get(path)).json() as Promise<T>;
}

/**
 * Detail read behind a `notFound()`: `undefined` ONLY when the row really is
 * absent. Every other failure rethrows onto the route group's error.tsx.
 *
 * The bug this exists for: `apiFetch(...).catch(() => undefined)` made the page
 * answer 404 for a 500 too, so an un-applied migration (the API failing on a
 * column that doesn't exist yet) read as "this quote doesn't exist" — a made-up
 * fact about the data instead of the outage it was.
 */
export async function apiFetchDetail<T>(path: string): Promise<T | undefined> {
  try {
    return await apiFetch<T>(path);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return undefined;
    throw err;
  }
}

/** Set by every paginated list endpoint — `crm-api-nest/src/common/pagination.ts`. */
const TOTAL_COUNT_HEADER = "X-Total-Count";

/**
 * A list read that also reports how many rows the WHOLE filtered collection has,
 * so a view can print a total instead of labelling one page's length as one.
 * Same transport as {@link apiFetch} — bearer, 401 re-mint + retry, 30s timeout —
 * it just keeps the Response instead of discarding it.
 *
 * A missing or non-numeric `X-Total-Count` falls back to `rows.length`: the
 * page-scoped figure every list showed before the header existed. Deliberately
 * not an error — an endpoint that doesn't send it (the Python sandbox) must still
 * render, and the fallback is only ever an undercount, never an invented number.
 */
export async function apiFetchList<T>(
  path: string
): Promise<{ rows: T[]; total: number }> {
  const res = await get(path);
  const rows = (await res.json()) as T[];
  const header = res.headers.get(TOTAL_COUNT_HEADER)?.trim();
  const total = header ? Number(header) : NaN;
  return {
    rows,
    total: Number.isInteger(total) && total >= 0 ? total : rows.length,
  };
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
  if (!res.ok) throw await failure(`${method} ${path}`, res);
  // DELETE handlers answer 204 with an empty body — res.json() would throw
  // "Unexpected end of JSON input" after the row is already gone.
  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}
