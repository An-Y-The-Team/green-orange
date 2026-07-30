import { apiFetchDetail, apiFetchList, apiFetchSafe } from "@/utils/http/http";
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

/**
 * One page of the list PLUS how many khách hàng exist in total, from the
 * response's `X-Total-Count`. Separate from {@link listClients} because that one
 * is a picker window whose callers want rows and nothing else.
 */
export async function listClientsPage(page: {
  limit: number;
  offset: number;
}): Promise<{ rows: ClientListItem[]; total: number }> {
  return apiFetchList<ClientListItem>(`/clients${pageQuery(page)}`);
}

// GET /clients/:id nests contacts + locations, so the detail page is one call.
export async function getClient(id: number): Promise<ClientDetail | undefined> {
  return apiFetchDetail<ClientDetail>(`/clients/${id}`);
}
