"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { api } from "@yan/shared/api";
import type { SortOrder } from "@yan/shared/constants/filters";
import { appendParam } from "@yan/shared/utils";

/**
 * The one client-side list query (StoryCo has a near-identical hook per
 * entity; the duplication is collapsed here). Serializes the page's URL state
 * into the API dialect — camelCase page/sortBy on the page, snake_case
 * `offset`/`sort_by` csv params on the wire — and GETs the `/api/crm/*`
 * proxy, which answers `{ rows, total }` from the Nest `X-Total-Count`.
 *
 * `placeholderData: keepPreviousData` keeps the previous rows rendered while
 * a filter change refetches, so pages dim the stale table instead of
 * re-skeletoning (frontend-code-style.md §Loading UI).
 */
export type FilterListParams = {
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: SortOrder;
  search: string;
  /** Entity filters; arrays go on the wire as csv (`status=a,b`). */
  filters?: Record<string, string[] | number[] | string | undefined>;
};

type ListResponse<T> = { rows: T[]; total: number };

export function useFilterList<T>({
  resource,
  params,
}: {
  resource: "projects" | "clients" | "crew" | "quotes";
  params: FilterListParams;
}) {
  const { data, isLoading, isFetching, isError } = useQuery<ListResponse<T>>({
    queryKey: [resource, "list", params],
    queryFn: () => {
      const qs = new URLSearchParams();
      appendParam(qs, "limit", params.limit);
      appendParam(qs, "offset", (params.page - 1) * params.limit);
      appendParam(qs, "search", params.search.trim());
      appendParam(qs, "sort_by", params.sortBy);
      appendParam(qs, "sort_order", params.sortOrder);
      for (const [key, value] of Object.entries(params.filters ?? {})) {
        appendParam(qs, key, Array.isArray(value) ? value.join(",") : value);
      }
      // Same-origin relative URL — the shared client needs no configure().
      return api.get<ListResponse<T>>(`/api/crm/${resource}?${qs}`);
    },
    placeholderData: keepPreviousData,
  });

  const total = data?.total ?? 0;
  return {
    rows: data?.rows ?? [],
    total,
    totalPages: Math.max(1, Math.ceil(total / params.limit)),
    isLoading,
    isFetching,
    isError,
  };
}
