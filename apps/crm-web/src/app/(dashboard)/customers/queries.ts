import { customers } from "@/data/mock/customers";
import { API_URL, apiFetch } from "@/lib/http";
import type { Customer } from "@/types";

export async function listCustomers(): Promise<Customer[]> {
  return API_URL ? apiFetch<Customer[]>("/customers") : customers;
}

export async function getCustomer(id: number): Promise<Customer | undefined> {
  if (API_URL) {
    return apiFetch<Customer>(`/customers/${id}`).catch(() => undefined);
  }
  return customers.find((c) => c.id === id);
}
