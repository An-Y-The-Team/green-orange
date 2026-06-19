import { contacts } from "@/data/mock/contacts";
import { API_URL, apiFetchSafe } from "@/lib/http";

import type { Contact } from "./types";

export async function listContacts(): Promise<Contact[]> {
  return API_URL ? apiFetchSafe<Contact[]>("/contacts", []) : contacts;
}
