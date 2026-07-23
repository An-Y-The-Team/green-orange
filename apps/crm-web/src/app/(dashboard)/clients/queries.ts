import { clients } from "@/data/mock/clients";
import { contacts } from "@/data/mock/contacts";
import { locations } from "@/data/mock/locations";
import { API_URL, apiFetch, apiFetchSafe } from "@/lib/http";

import type { ClientDetail, ClientListItem } from "./types";

// Degrades to [] if the backend is unreachable — a hard throw here would 500
// any page that fans out to several list queries at once.
export async function listClients(): Promise<ClientListItem[]> {
  if (API_URL) return apiFetchSafe<ClientListItem[]>("/clients", []);
  return clients.map((c) => ({
    ...c,
    _count: {
      locations: locations.filter((l) => l.client_id === c.id).length,
      // ponytail: mock project count stays 0 — live mode has the real _count,
      // and importing the projects mock would couple us to a feature in flux.
      projects: 0,
    },
  }));
}

// GET /clients/:id nests contacts + locations, so the detail page is one call.
export async function getClient(id: number): Promise<ClientDetail | undefined> {
  if (API_URL) {
    return apiFetch<ClientDetail>(`/clients/${id}`).catch(() => undefined);
  }
  const client = clients.find((c) => c.id === id);
  if (!client) return undefined;
  return {
    ...client,
    contacts: contacts.filter((c) => c.client_id === id),
    locations: locations.filter((l) => l.client_id === id),
  };
}
