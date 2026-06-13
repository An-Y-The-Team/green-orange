/**
 * Data-access layer — the single seam between the UI and the data source.
 *
 * Every page imports its data from here and NEVER from the mock files or via a
 * raw fetch. That indirection is the whole point:
 *
 *   • NEXT_PUBLIC_API_URL unset  → return the bundled mock data (design mode).
 *   • NEXT_PUBLIC_API_URL set     → fetch the FastAPI backend (apps/crm-api).
 *
 * Students implement the backend; flipping one env var switches the entire UI
 * over to live data with zero changes to any component. Response shapes match
 * the types in src/types, so no mapping is needed.
 *
 * These functions run in Server Components. The bearer token sent to crm-api is
 * resolved by getBearer() below: the user's Authentik session token when OIDC is
 * enabled, else the server-only CRM_API_TOKEN dev fallback.
 */
import { auth } from "@/auth";
import { authEnabled } from "@/auth.config";
import { contacts } from "@/data/mock/contacts";
import { customers } from "@/data/mock/customers";
import { deals } from "@/data/mock/deals";
import { leads } from "@/data/mock/leads";
import { tasks } from "@/data/mock/tasks";
import type { Contact, Customer, Deal, Lead, Task } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const isLiveMode = Boolean(API_URL);

// Resolve the bearer token for crm-api. Two sources, in order:
//   1. The logged-in user's Authentik access token (when OIDC is enabled).
//   2. CRM_API_TOKEN — a server-only dev token (mint via crm-api's /auth/token)
//      for working against a local-auth backend without a login flow.
// Server-only either way; never shipped to the browser.
async function getBearer(): Promise<string | undefined> {
  if (authEnabled) {
    const session = await auth();
    if (session?.accessToken) return session.accessToken;
  }
  return process.env.CRM_API_TOKEN;
}

async function apiFetch<T>(path: string): Promise<T> {
  // No caching so the dashboard always reflects the latest backend state while
  // students iterate.
  const token = await getBearer();
  const res = await fetch(`${API_URL}${path}`, {
    cache: "no-store",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) {
    throw new Error(`API ${path} failed: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// For the exercise resources (contacts/leads/deals/tasks): until a student
// implements that endpoint it returns 501. Degrade to an empty list so the
// dashboard and list pages still render instead of crashing — the page just
// shows "0" / an empty table until the backend exists. `customers` (the worked
// reference) stays strict so real errors there surface loudly.
async function apiFetchSafe<T>(path: string, fallback: T): Promise<T> {
  try {
    return await apiFetch<T>(path);
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[crm-web] ${path} not available yet, using empty data:`,
        err
      );
    }
    return fallback;
  }
}

export async function listCustomers(): Promise<Customer[]> {
  return API_URL ? apiFetch<Customer[]>("/customers") : customers;
}

export async function getCustomer(id: number): Promise<Customer | undefined> {
  if (API_URL) {
    return apiFetch<Customer>(`/customers/${id}`).catch(() => undefined);
  }
  return customers.find((c) => c.id === id);
}

export async function listContacts(): Promise<Contact[]> {
  return API_URL ? apiFetchSafe<Contact[]>("/contacts", []) : contacts;
}

export async function listLeads(): Promise<Lead[]> {
  return API_URL ? apiFetchSafe<Lead[]>("/leads", []) : leads;
}

export async function listDeals(): Promise<Deal[]> {
  return API_URL ? apiFetchSafe<Deal[]>("/deals", []) : deals;
}

export async function listTasks(): Promise<Task[]> {
  return API_URL ? apiFetchSafe<Task[]>("/tasks", []) : tasks;
}
