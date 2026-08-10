"use client";

import { z } from "zod";

import { SORT_ORDER } from "@yan/shared/constants/filters";
import { cap, usePageParams } from "@yan/shared/hooks";
import { createPaginationConfigWithSearch } from "@yan/shared/utils";

import { useFilterList } from "@/hooks/use-filter-list/use-filter-list";

import { ClientType } from "../../../../enums";
import type { ClientListItem } from "../../../../types";

export const CLIENT_SORT_KEYS = ["name", "created_at"] as const;
export type ClientSortKey = (typeof CLIENT_SORT_KEYS)[number];

const { schema, pageSizes, defaults } = createPaginationConfigWithSearch({
  allowedSortBy: CLIENT_SORT_KEYS,
  defaultSortBy: "name",
  defaultSortOrder: SORT_ORDER.ASC,
  customLimit: 20,
});

// Every field self-heals via `.catch` — a tampered URL falls back to defaults
// instead of erroring, so any /clients?... link someone saved keeps opening.
const ParamsSchema = schema.extend({
  type: z.array(z.nativeEnum(ClientType)).catch([]),
});

export type ClientListParams = z.infer<typeof ParamsSchema>;

const DEFAULT_PARAMS: ClientListParams = { ...defaults, type: [] };

/**
 * URL ↔ state ↔ query for the clients table: filters/sort/page live in the
 * URL (usePageParams), the rows come from GET /api/crm/clients
 * (useFilterList). One hook so the container stays markup.
 */
export function useClientListParams() {
  const { params, setParams, registerDynamicParamsGuard } =
    usePageParams<ClientListParams>({
      defaultParams: DEFAULT_PARAMS,
      schema: ParamsSchema,
    });

  // Any filter/sort/limit change restarts at page 1 — page 5 of a result set
  // that no longer has 5 pages is an empty table.
  const setListParams = (updates: Partial<Omit<ClientListParams, "page">>) =>
    setParams((prev) => ({ ...prev, ...updates, page: 1 }));

  const list = useFilterList<ClientListItem>({
    resource: "clients",
    params: {
      page: params.page,
      limit: params.limit,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
      search: params.search,
      filters: { type: params.type },
    },
  });

  // A URL pointing past the last page self-corrects once the total is known.
  registerDynamicParamsGuard({
    page: cap(list.isLoading ? undefined : list.totalPages),
  });

  return {
    params,
    setListParams,
    setPage: (page: number) => setParams((prev) => ({ ...prev, page })),
    pageSizes,
    ...list,
  };
}
