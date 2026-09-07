"use client";

import { z } from "zod";

import { SORT_ORDER } from "@yan/shared/constants/filters";
import { cap, usePageParams } from "@yan/shared/hooks";
import { createPaginationConfigWithSearch } from "@yan/shared/utils";

import { useFilterList } from "@/hooks/use-filter-list/use-filter-list";

import { BillStatus } from "../../enums";
import type { Bill } from "../../types";

export const BILL_SORT_KEYS = [
  "sent_date",
  "paid_date",
  "total_amount",
  "id",
] as const;
export type BillSortKey = (typeof BILL_SORT_KEYS)[number];

/** Paid hóa đơn are history too — same default as the đợt table. */
const DEFAULT_STATUS = [BillStatus.DRAFT, BillStatus.OFFICIAL, BillStatus.SENT];

const { schema, pageSizes, defaults } = createPaginationConfigWithSearch({
  allowedSortBy: BILL_SORT_KEYS,
  defaultSortBy: "id",
  defaultSortOrder: SORT_ORDER.ASC,
  customLimit: 20,
});

const ParamsSchema = schema.extend({
  status: z.array(z.nativeEnum(BillStatus)).catch(DEFAULT_STATUS),
});

export type BillListParams = z.infer<typeof ParamsSchema>;

const DEFAULT_PARAMS: BillListParams = { ...defaults, status: DEFAULT_STATUS };

export function useBillListParams() {
  const { params, setParams, registerDynamicParamsGuard } =
    usePageParams<BillListParams>({
      defaultParams: DEFAULT_PARAMS,
      schema: ParamsSchema,
    });

  const setListParams = (updates: Partial<Omit<BillListParams, "page">>) =>
    setParams((prev) => ({ ...prev, ...updates, page: 1 }));

  const list = useFilterList<Bill>({
    resource: "bills",
    params: {
      page: params.page,
      limit: params.limit,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
      search: params.search,
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
