"use client";

import { z } from "zod";

import { SORT_ORDER } from "@yan/shared/constants/filters";
import { cap, usePageParams } from "@yan/shared/hooks";
import { createPaginationConfigWithSearch } from "@yan/shared/utils";

import { useFilterList } from "@/hooks/use-filter-list/use-filter-list";

import { CrewMemberStatus, EmploymentType } from "../../../../enums";
import type { CrewMember } from "../../../../types";

export const CREW_SORT_KEYS = ["name", "created_at"] as const;
export type CrewSortKey = (typeof CREW_SORT_KEYS)[number];

const { schema, pageSizes, defaults } = createPaginationConfigWithSearch({
  allowedSortBy: CREW_SORT_KEYS,
  defaultSortBy: "name",
  defaultSortOrder: SORT_ORDER.ASC,
  customLimit: 20,
});

const ParamsSchema = schema.extend({
  status: z.array(z.nativeEnum(CrewMemberStatus)).catch([]),
  employment_type: z.array(z.nativeEnum(EmploymentType)).catch([]),
  // Vị trí ids; coerce covers both the JSON-array URL form and select values.
  role_id: z.array(z.coerce.number().int()).catch([]),
});

export type RosterListParams = z.infer<typeof ParamsSchema>;

const DEFAULT_PARAMS: RosterListParams = {
  ...defaults,
  status: [],
  employment_type: [],
  role_id: [],
};

export function useRosterListParams() {
  const { params, setParams, registerDynamicParamsGuard } =
    usePageParams<RosterListParams>({
      defaultParams: DEFAULT_PARAMS,
      schema: ParamsSchema,
    });

  const setListParams = (updates: Partial<Omit<RosterListParams, "page">>) =>
    setParams((prev) => ({ ...prev, ...updates, page: 1 }));

  const list = useFilterList<CrewMember>({
    resource: "crew",
    params: {
      page: params.page,
      limit: params.limit,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
      search: params.search,
      filters: {
        status: params.status,
        employment_type: params.employment_type,
        role_id: params.role_id,
      },
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
