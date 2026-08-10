"use client";

import { z } from "zod";

import { SORT_ORDER } from "@yan/shared/constants/filters";
import { cap, usePageParams } from "@yan/shared/hooks";
import { createPaginationConfigWithSearch } from "@yan/shared/utils";

import { useFilterList } from "@/hooks/use-filter-list/use-filter-list";

import { ProjectStage, ProjectStatus } from "../../../../enums";
import type { Project } from "../../../../types";

export const PROJECT_SORT_KEYS = [
  "code",
  "name",
  "appointment_at",
  "created_at",
] as const;
export type ProjectSortKey = (typeof PROJECT_SORT_KEYS)[number];

// Cancelled jobs are hidden by DEFAULT, not by a hardcoded post-filter — the
// filter is in the URL, so "show cancelled too" is just selecting it. This
// replaces the old client-side `rows.filter(!CANCELLED)` + separate
// countProjects(CANCELLED) call.
const DEFAULT_STATUS = [ProjectStatus.ACTIVE, ProjectStatus.ON_HOLD];

const { schema, pageSizes, defaults } = createPaginationConfigWithSearch({
  allowedSortBy: PROJECT_SORT_KEYS,
  defaultSortBy: "created_at",
  defaultSortOrder: SORT_ORDER.DESC,
  customLimit: 20,
});

const ParamsSchema = schema.extend({
  stage: z.array(z.nativeEnum(ProjectStage)).catch([]),
  status: z.array(z.nativeEnum(ProjectStatus)).catch(DEFAULT_STATUS),
});

export type ProjectListParams = z.infer<typeof ParamsSchema>;

const DEFAULT_PARAMS: ProjectListParams = {
  ...defaults,
  stage: [],
  status: DEFAULT_STATUS,
};

export function useProjectListParams() {
  const { params, setParams, registerDynamicParamsGuard } =
    usePageParams<ProjectListParams>({
      defaultParams: DEFAULT_PARAMS,
      schema: ParamsSchema,
    });

  const setListParams = (updates: Partial<Omit<ProjectListParams, "page">>) =>
    setParams((prev) => ({ ...prev, ...updates, page: 1 }));

  const list = useFilterList<Project>({
    resource: "projects",
    params: {
      page: params.page,
      limit: params.limit,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
      search: params.search,
      filters: { stage: params.stage, status: params.status },
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
