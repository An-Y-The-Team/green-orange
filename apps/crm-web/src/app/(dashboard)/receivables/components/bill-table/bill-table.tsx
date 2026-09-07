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
import { BILL_STATUSES, FIELDS } from "@/constants/labels";

import { BillStatus } from "../../enums";
import {
  type BillSortKey,
  useBillListParams,
} from "../../hooks/use-bill-list-params/use-bill-list-params";
import { BillRow } from "../../receivable-rows/receivable-rows";

const STATUS_OPTIONS = Object.entries(BILL_STATUSES).map(
  ([value, { label }]) => ({ value, label })
);

const UNPAID = [BillStatus.DRAFT, BillStatus.OFFICIAL, BillStatus.SENT];

/** Hóa đơn, on the same server-filtered/sorted/paged footing as the đợt table. */
export function BillTable() {
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
  } = useBillListParams();

  const onSort = (sort: { sortBy: BillSortKey; sortOrder: SortOrder }) =>
    setListParams(sort);

  const hasFilters =
    Boolean(params.search) ||
    params.status.length !== UNPAID.length ||
    !UNPAID.every((s) => params.status.includes(s));

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
            setListParams({ status: status as BillStatus[] })
          }
          placeholder={FIELDS.status}
          className="min-w-32"
        />
        <span className="ml-auto text-sm text-muted-foreground">
          {total} hóa đơn
        </span>
      </div>

      {isLoading ? (
        <TableSkeleton columns={6} />
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
                  <SortableTableHeader
                    label="Tổng tiền"
                    sortKey="total_amount"
                    sortBy={params.sortBy}
                    sortOrder={params.sortOrder}
                    onSort={onSort}
                    className="text-right"
                  />
                  <TableHead>{FIELDS.status}</TableHead>
                  <SortableTableHeader
                    label="Ngày gửi"
                    sortKey="sent_date"
                    sortBy={params.sortBy}
                    sortOrder={params.sortOrder}
                    onSort={onSort}
                  />
                  <SortableTableHeader
                    label="Ngày thanh toán"
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
                    <TableCell colSpan={6} className="text-destructive">
                      Không tải được hóa đơn — thử tải lại trang.
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <div className="flex flex-wrap items-center gap-3 py-2 text-muted-foreground">
                        {hasFilters ? (
                          <>
                            Không có hóa đơn nào khớp bộ lọc.
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setListParams({ search: "", status: UNPAID })
                              }
                            >
                              Xóa bộ lọc
                            </Button>
                          </>
                        ) : (
                          "Không còn hóa đơn nào phải thu."
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((b) => (
                    <BillRow
                      key={b.id}
                      bill={b}
                      projectCode={b.project?.code ?? `#${b.project_id}`}
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
        itemName="hóa đơn"
        pageSizes={pageSizes}
      />
    </div>
  );
}
