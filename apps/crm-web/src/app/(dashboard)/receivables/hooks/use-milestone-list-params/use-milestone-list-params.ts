"use client";

import { z } from "zod";

import { SORT_ORDER } from "@yan/shared/constants/filters";
import { cap, usePageParams } from "@yan/shared/hooks";
import { createPaginationConfigWithSearch } from "@yan/shared/utils";

import { filterReset } from "@/hooks/use-filter-list/filter-reset";
import { useFilterList } from "@/hooks/use-filter-list/use-filter-list";

import { MilestoneStatus } from "../../enums";
import type { PaymentMilestone } from "../../types";

export const MILESTONE_SORT_KEYS = [
  "due_date",
  "paid_date",
  "amount",
  "id",
] as const;
export type MilestoneSortKey = (typeof MILESTONE_SORT_KEYS)[number];

/**
 * `Đã thu` is hidden by DEFAULT — the same call the projects list makes about
 * `cancelled`. Before this, the money screen showed every đợt ever collected:
 * on the seeded data 8 of 11 rows were `Đã thu`, so the screen whose job is
 * "what do I still need to collect" was mostly history.
 */
const DEFAULT_STATUS = [
  MilestoneStatus.NOT_DUE,
  MilestoneStatus.AWAITING_PAYMENT,
];

const { schema, pageSizes, defaults } = createPaginationConfigWithSearch({
  allowedSortBy: MILESTONE_SORT_KEYS,
  // Soonest due first: with `paid` filtered out the oldest due dates ARE the
  // overdue ones, so "quá hạn on top" comes from the ordering and survives
  // pagination. It used to be a JS sort over one page.
  defaultSortBy: "due_date",
  defaultSortOrder: SORT_ORDER.ASC,
  customLimit: 20,
});

const ParamsSchema = schema.extend({
  status: z.array(z.nativeEnum(MilestoneStatus)).catch(DEFAULT_STATUS),
  /**
   * `overdue=true` REPLACES `status` server-side (overdue already implies one,
   * so the two fight for the same Prisma key). Kept as its own mode rather than
   * a fourth status option, and the UI disables the status filter while it is on
   * instead of letting them silently contradict each other.
   */
  overdue: z.boolean().catch(false),
});

export type MilestoneListParams = z.infer<typeof ParamsSchema>;

const DEFAULT_PARAMS: MilestoneListParams = {
  ...defaults,
  status: DEFAULT_STATUS,
  overdue: false,
};

export function useMilestoneListParams() {
  const { params, setParams, registerDynamicParamsGuard } =
    usePageParams<MilestoneListParams>({
      defaultParams: DEFAULT_PARAMS,
      schema: ParamsSchema,
    });

  const setListParams = (updates: Partial<Omit<MilestoneListParams, "page">>) =>
    setParams((prev) => ({ ...prev, ...updates, page: 1 }));

  const list = useFilterList<PaymentMilestone>({
    resource: "payment-milestones",
    params: {
      page: params.page,
      limit: params.limit,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
      search: params.search,
      // Send one or the other, never both — see the schema note above.
      filters: params.overdue ? { overdue: "true" } : { status: params.status },
    },
  });

  registerDynamicParamsGuard({
    page: cap(list.isLoading ? undefined : list.totalPages),
  });

  // The empty state needs to know whether it is empty because of the filters
  // or because there is nothing there — see ListEmptyState.
  const reset = filterReset({
    params,
    defaults: DEFAULT_PARAMS,
    keys: ["search", "status", "overdue"] as const,
    apply: setListParams,
  });

  return {
    params,
    setListParams,
    ...reset,
    setPage: (page: number) => setParams((prev) => ({ ...prev, page })),
    pageSizes,
    ...list,
  };
}
