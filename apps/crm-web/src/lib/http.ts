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
 * backend itself can stay unexposed on an internal network. The bearer token is
 * the user's Authentik session token when OIDC is enabled, else the server-only
 * CRM_API_TOKEN dev fallback.
 */
import { api } from "@yan/shared/api";

import { auth } from "@/auth";
import { authEnabled } from "@/auth.config";

export const API_URL = process.env.CRM_API_URL;
export const isLiveMode = Boolean(API_URL);

async function getBearer(): Promise<string | undefined> {
  if (authEnabled) {
    const session = await auth();
    if (session?.accessToken) return session.accessToken;
  }
  return process.env.CRM_API_TOKEN;
}

export async function apiFetch<T>(path: string): Promise<T> {
  const token = await getBearer();
  const res = await api.fetch(`${API_URL}${path}`, {
    cache: "no-store",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
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
  const token = await getBearer();
  const res = await fetch(`${API_URL}${path}`, {
    method,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
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
