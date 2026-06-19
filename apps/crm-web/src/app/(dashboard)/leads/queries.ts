import { leads } from "@/data/mock/leads";
import { API_URL, apiFetchSafe } from "@/lib/http";

import type { Lead } from "./types";

export async function listLeads(): Promise<Lead[]> {
  return API_URL ? apiFetchSafe<Lead[]>("/leads", []) : leads;
}
