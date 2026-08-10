"use client";

import { z } from "zod";

import { SORT_ORDER } from "@yan/shared/constants/filters";
import { cap, usePageParams } from "@yan/shared/hooks";
import { createPaginationConfigWithSearch } from "@yan/shared/utils";

import { useFilterList } from "@/hooks/use-filter-list/use-filter-list";

import { QuoteStatus } from "../../../../enums";
import type { QuoteListRow } from "../../../../types";

export const QUOTE_SORT_KEYS = [
  "id",
  "version",
  "total_amount",
  "decided_date",
] as const;
export type QuoteSortKey = (typeof QUOTE_SORT_KEYS)[number];

const { schema, pageSizes, defaults } = createPaginationConfigWithSearch({
  // Default `id desc` (newest quote first) rather than the endpoint's
  // version-desc fallback — version desc across projects interleaves every
  // project's v3s before any v1, which reads as random in a sorted UI.
  allowedSortBy: QUOTE_SORT_KEYS,
  defaultSortBy: "id",
  defaultSortOrder: SORT_ORDER.DESC,
  customLimit: 20,
});

const ParamsSchema = schema.extend({
  status: z.array(z.nativeEnum(QuoteStatus)).catch([]),
});

export type QuoteListParams = z.infer<typeof ParamsSchema>;

const DEFAULT_PARAMS: QuoteListParams = { ...defaults, status: [] };

export function useQuoteListParams() {
  const { params, setParams, registerDynamicParamsGuard } =
    usePageParams<QuoteListParams>({
      defaultParams: DEFAULT_PARAMS,
      schema: ParamsSchema,
    });

  const setListParams = (updates: Partial<Omit<QuoteListParams, "page">>) =>
    setParams((prev) => ({ ...prev, ...updates, page: 1 }));

  const list = useFilterList<QuoteListRow>({
    resource: "quotes",
    params: {
      page: params.page,
      limit: params.limit,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
      search: params.search,
      // Superseded versions keep their historical status, so e.g.
      // `status=deal` can also return old deal versions of a renegotiated
      // quote — the "Đã thay thế" badge still marks them in the table.
      filters: { status: params.status },
    },
  });

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
