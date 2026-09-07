"use client";

import { Loader2 } from "lucide-react";

import type { SortOrder } from "@yan/shared/constants/filters";
import { Button } from "@yan/ui/components/button";
import { Card } from "@yan/ui/components/card";
import { MultiSelect } from "@yan/ui/components/multi-select";
import { SearchInput } from "@yan/ui/components/search-input";
import { SortableTableHeader } from "@yan/ui/components/sortable-table-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@yan/ui/components/table";
import { TablePagination } from "@yan/ui/components/table-pagination";
import { cn } from "@yan/ui/lib/utils";

import { TableSkeleton } from "@/components/table-skeleton/table-skeleton";
import { FIELDS, MILESTONE_STATUSES } from "@/constants/labels";

import { MilestoneStatus } from "../../enums";
import {
  type MilestoneSortKey,
  useMilestoneListParams,
} from "../../hooks/use-milestone-list-params/use-milestone-list-params";
import { MilestoneRow } from "../../receivable-rows/receivable-rows";

const STATUS_OPTIONS = Object.entries(MILESTONE_STATUSES).map(
  ([value, { label }]) => ({ value, label })
);

/**
 * Đợt thanh toán, filtered/sorted/paged by the server — the same
 * `usePageParams` + `useFilterList` pattern the other four lists share.
 *
 * It used to be a server-rendered dump of the first 100 rows with the
 * overdue-first sort running in JS over that page, so an overdue đợt at
 * position 101 never appeared on the screen whose whole job is surfacing
 * overdue đợt. The page said so in a notice; the pager replaces it.
 */
export function MilestoneTable() {
  const {
    params,
    setListParams,
    setPage,
    pageSizes,
    rows,
    total,
    isLoading,
    isFetching,
    isError,
  } = useMilestoneListParams();

  const onSort = (sort: { sortBy: MilestoneSortKey; sortOrder: SortOrder }) =>
    setListParams(sort);

  const hasFilters =
    Boolean(params.search) ||
    params.overdue ||
    params.status.length !== 2 ||
    !params.status.every((s) => s !== MilestoneStatus.PAID);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          defaultValue={params.search}
          onChange={(search) => setListParams({ search })}
          placeholder="Tìm mã công trình…"
          className="w-56"
        />
        <MultiSelect
          options={STATUS_OPTIONS}
          value={params.status}
          onChange={(status) =>
            setListParams({ status: status as MilestoneStatus[] })
          }
          placeholder={FIELDS.status}
          className="min-w-32"
          // `overdue=true` replaces `status` server-side, so offering both at
          // once would let the UI contradict what the API actually applies.
          disabled={params.overdue}
        />
        <Button
          size="sm"
          variant={params.overdue ? "default" : "outline"}
          onClick={() => setListParams({ overdue: !params.overdue })}
        >
          Chỉ quá hạn
        </Button>
        {params.overdue ? (
          <span className="text-xs text-muted-foreground">
            Đang lọc theo quá hạn — bỏ lọc để chọn trạng thái.
          </span>
        ) : null}
        <span className="ml-auto text-sm text-muted-foreground">
          {total} đợt
        </span>
      </div>

      {isLoading ? (
        <TableSkeleton columns={7} />
      ) : (
        <div className="relative">
          {isFetching && !isLoading && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          <Card
            className={cn(
              "py-0",
              isFetching && !isLoading && "opacity-60 transition-opacity"
            )}
          >
            <Table className="[&_td]:px-2 [&_th]:px-2">
              <TableHeader>
                <TableRow>
                  <TableHead>{FIELDS.project}</TableHead>
                  <TableHead>Đợt</TableHead>
                  <SortableTableHeader
                    label={FIELDS.amount}
                    sortKey="amount"
                    sortBy={params.sortBy}
                    sortOrder={params.sortOrder}
                    onSort={onSort}
                    className="text-right"
                  />
                  <SortableTableHeader
                    label={FIELDS.dueDate}
                    sortKey="due_date"
                    sortBy={params.sortBy}
                    sortOrder={params.sortOrder}
                    onSort={onSort}
                  />
                  <TableHead>{FIELDS.status}</TableHead>
                  <SortableTableHeader
                    label={FIELDS.collectDate}
                    sortKey="paid_date"
                    sortBy={params.sortBy}
                    sortOrder={params.sortOrder}
                    onSort={onSort}
                  />
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isError ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-destructive">
                      Không tải được đợt thanh toán — thử tải lại trang.
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <div className="flex flex-wrap items-center gap-3 py-2 text-muted-foreground">
                        {hasFilters ? (
                          <>
                            Không có đợt nào khớp bộ lọc.
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setListParams({
                                  search: "",
                                  overdue: false,
                                  status: [
                                    MilestoneStatus.NOT_DUE,
                                    MilestoneStatus.AWAITING_PAYMENT,
                                  ],
                                })
                              }
                            >
                              Xóa bộ lọc
                            </Button>
                          </>
                        ) : (
                          "Không còn đợt nào phải thu."
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((m) => (
                    <MilestoneRow
                      key={m.id}
                      milestone={m}
                      projectCode={m.project?.code ?? `#${m.project_id}`}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      <TablePagination
        page={params.page}
        limit={params.limit}
        totalCount={total}
        onPageChange={setPage}
        onLimitChange={(limit) => setListParams({ limit })}
        isLoading={isFetching}
        itemName="đợt"
        pageSizes={pageSizes}
      />
    </div>
  );
}
