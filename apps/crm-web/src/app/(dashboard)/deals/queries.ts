import { deals } from "@/data/mock/deals";
import { API_URL, apiFetchSafe } from "@/lib/http";

import type { Deal } from "./types";

export async function listDeals(): Promise<Deal[]> {
  return API_URL ? apiFetchSafe<Deal[]>("/deals", []) : deals;
}
