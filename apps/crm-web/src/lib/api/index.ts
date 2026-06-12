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
 * These functions run in Server Components (no token handling here yet). When
 * Authentik OIDC lands, attach the bearer token in `apiFetch` below.
 */
import { contacts } from "@/data/mock/contacts";
import { customers } from "@/data/mock/customers";
import { deals } from "@/data/mock/deals";
import { leads } from "@/data/mock/leads";
import { tasks } from "@/data/mock/tasks";
import type { Contact, Customer, Deal, Lead, Task } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Server-only bearer token (NOT NEXT_PUBLIC — never shipped to the browser).
// The crm-api endpoints are auth-protected, so live mode must present a token.
// For local dev, mint one and export it:
//   TOKEN=$(curl -s -X POST $API/auth/token -d "username=admin&password=admin" | jq -r .access_token)
//   CRM_API_TOKEN=$TOKEN NEXT_PUBLIC_API_URL=http://localhost:8000 bun dev
// When Authentik OIDC lands, this is replaced by the user's session token.
const API_TOKEN = process.env.CRM_API_TOKEN;

export const isLiveMode = Boolean(API_URL);

async function apiFetch<T>(path: string): Promise<T> {
  // No caching so the dashboard always reflects the latest backend state while
  // students iterate.
  const res = await fetch(`${API_URL}${path}`, {
    cache: "no-store",
    headers: API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : undefined,
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
