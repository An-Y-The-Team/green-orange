import { apiFetch, apiFetchSafe } from "@/utils/http/http";
import { pageQuery } from "@/utils/page-param/page-param";

import type { ClientDetail, ClientListItem } from "./types";

// Degrades to [] if the backend is unreachable — a hard throw here would 500
// any page that fans out to several list queries at once.
// GET /clients pages at DEFAULT_PAGE_SIZE=100 / MAX_PAGE_SIZE=500 (F17), so this
// is a window: callers using it as a lookup must pass an explicit `limit`.
export async function listClients({
  limit,
  offset,
}: { limit?: number; offset?: number } = {}): Promise<ClientListItem[]> {
  return apiFetchSafe<ClientListItem[]>(
    `/clients${pageQuery({ limit, offset })}`,
    []
  );
}

// GET /clients/:id nests contacts + locations, so the detail page is one call.
export async function getClient(id: number): Promise<ClientDetail | undefined> {
  return apiFetch<ClientDetail>(`/clients/${id}`).catch(() => undefined);
}
