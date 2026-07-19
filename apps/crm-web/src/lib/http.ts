/**
 * Low-level HTTP transport for talking to crm-api — NOT a catalog of resource
 * calls. Each resource's reads live in its route's `queries.ts`; each mutation
 * lives directly in its server action. They share only these primitives.
 *
 *   • CRM_API_URL unset → callers fall back to bundled mock data.
 *   • CRM_API_URL set   → these hit the FastAPI backend (apps/crm-api).
 *
 * Runs server-side only — CRM_API_URL is a server-only var (no NEXT_PUBLIC_
 * prefix), so the backend URL is never inlined into the client bundle, and the
 * backend itself can stay unexposed on an internal network. The bearer token is,
 * in order: the user's Authentik session token when OIDC is enabled; an explicit
 * CRM_API_TOKEN override if set; else one auto-minted from /auth/token with the
 * local dev credentials (AUTH_MODE=local) and cached until it 401s.
 */
import { api } from "@yan/shared/api";

import { auth } from "@/auth";
import { authEnabled } from "@/auth.config";

export const API_URL = process.env.CRM_API_URL;
export const isLiveMode = Boolean(API_URL);

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

// Whether a 401 should trigger a token re-mint + retry — only for the auto-mint
// path (local mode, no explicit override). Authentik/override tokens self-heal elsewhere.
const canRemint = () => !authEnabled && !process.env.CRM_API_TOKEN;

// Sends a request with the bearer attached; on a 401 in local mode, re-mints the
// dev token once and retries so an expired token self-heals instead of erroring.
async function fetchWithAuth(
  fetcher: (url: string, opts: RequestInit) => Promise<Response>,
  url: string,
  init: RequestInit
): Promise<Response> {
  const call = (token?: string) =>
    fetcher(url, {
      ...init,
      cache: "no-store",
      headers: {
        ...init.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  const res = await call(await getBearer());
  if (res.status === 401 && canRemint()) return call(await getBearer(true));
  return res;
}

export async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetchWithAuth(
    (u, o) => api.fetch(u, o),
    `${API_URL}${path}`,
    {}
  );
  if (!res.ok) {
    throw new Error(`API ${path} failed: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// Degrades a not-yet-implemented endpoint (student exercises return 501) to a
// fallback so list pages still render instead of crashing.
export async function apiFetchSafe<T>(path: string, fallback: T): Promise<T> {
  try {
    return await apiFetch<T>(path);
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[crm-web] ${path} not available yet, using fallback:`, err);
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
  const res = await fetchWithAuth((u, o) => fetch(u, o), `${API_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(
      `API ${method} ${path} failed: ${res.status} ${res.statusText}`
    );
  }
  return res.json() as Promise<T>;
}

// Mock-mode helpers for synthesizing a created record's server-side fields.
export const nextId = <T extends { id: number }>(rows: T[]) =>
  Math.max(0, ...rows.map((r) => r.id)) + 1;
export const seq = (n: number) => String(n).padStart(3, "0");
