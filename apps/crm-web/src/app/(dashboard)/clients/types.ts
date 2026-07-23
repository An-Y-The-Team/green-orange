// Khách hàng — v2 contract. Mirrors crm-api-nest Prisma models 1:1
// (snake_case; *_at fields are full ISO strings; optionals come back as null).
import type { ClientType } from "./enums";

export interface Client {
  id: number;
  name: string;
  type: ClientType;
  tax_code: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: number;
  client_id: number;
  name: string;
  phone: string | null; // also Zalo identity
  email: string | null;
  title: string | null;
  note: string | null;
}

export interface Location {
  id: number;
  client_id: number;
  name: string;
  address: string;
  manager_contact_id: number | null;
}

// GET /clients — list rows carry relation counts.
export interface ClientListItem extends Client {
  _count: { locations: number; projects: number };
}

// GET /clients/:id — detail nests contacts + locations.
export interface ClientDetail extends Client {
  contacts: Contact[];
  locations: Location[];
}
