import { clients } from "@/data/mock/clients";
import { API_URL, apiFetch, apiFetchSafe } from "@/lib/http";

import type { Client } from "./types";

// Degrades to [] if the backend is unreachable/erroring — same as the other list
// queries. The dashboard fans out to all of these in one Promise.all, so a single
// hard-throwing fetch here would 500 the entire page instead of rendering empty.
export async function listClients(): Promise<Client[]> {
  return API_URL ? apiFetchSafe<Client[]>("/clients", []) : clients;
}

export async function getClient(id: number): Promise<Client | undefined> {
  if (API_URL) {
    return apiFetch<Client>(`/clients/${id}`).catch(() => undefined);
  }
  return clients.find((c) => c.id === id);
}
