import { customers } from "@/data/mock/customers";
import { API_URL, apiFetch, apiFetchSafe } from "@/lib/http";

import type { Customer } from "./types";

// Degrades to [] if the backend is unreachable/erroring — same as the other list
// queries. The dashboard fans out to all of these in one Promise.all, so a single
// hard-throwing fetch here would 500 the entire page instead of rendering empty.
export async function listCustomers(): Promise<Customer[]> {
  return API_URL ? apiFetchSafe<Customer[]>("/customers", []) : customers;
}

export async function getCustomer(id: number): Promise<Customer | undefined> {
  if (API_URL) {
    return apiFetch<Customer>(`/customers/${id}`).catch(() => undefined);
  }
  return customers.find((c) => c.id === id);
}
