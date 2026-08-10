"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";

import type { SortOrder } from "@yan/shared/constants/filters";
import { Badge } from "@yan/ui/components/badge";
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
import {
  FIELDS,
  QUOTE_CHANNELS,
  QUOTE_STATUSES,
  QUOTE_SUPERSEDED_LABEL,
} from "@/constants/labels";
import { formatDate } from "@/utils/format-date/format-date";
import { formatVND } from "@/utils/format-vnd/format-vnd";
import { labelOf } from "@/utils/label-of/label-of";

import { QuoteStatus } from "../../enums";
import type { QuoteListRow } from "../../types";
import {
  type QuoteSortKey,
  useQuoteListParams,
} from "./hooks/use-quote-list-params/use-quote-list-params";

const STATUS_OPTIONS = Object.entries(QUOTE_STATUSES).map(
  ([value, { label }]) => ({ value, label })
);

/** Unique channels this quote went out on, in Vietnamese. */
function sentChannels(quote: QuoteListRow): string {
  const labels = (quote?.send_logs ?? [])
    .map((log) => QUOTE_CHANNELS?.[log?.channel] ?? log?.channel)
    .filter(Boolean);
  return [...new Set(labels)].join(", ");
}

export function QuoteList() {
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
  } = useQuoteListParams();

  const onSort = (sort: { sortBy: QuoteSortKey; sortOrder: SortOrder }) =>
    setListParams(sort);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          defaultValue={params.search}
          onChange={(search) => setListParams({ search })}
          placeholder="Tìm công trình, khách hàng…"
          className="w-64"
        />
        <MultiSelect
          options={STATUS_OPTIONS}
          value={params.status}
          onChange={(status) =>
            setListParams({ status: status as QuoteStatus[] })
          }
          placeholder={FIELDS.status}
          className="min-w-32"
        />
        <span className="ml-auto text-sm text-muted-foreground">
          {total} báo giá
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
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHeader
                    label="Báo giá"
                    sortKey="id"
                    sortBy={params.sortBy}
                    sortOrder={params.sortOrder}
                    onSort={onSort}
                  />
                  <TableHead>{FIELDS.project}</TableHead>
                  <TableHead>{FIELDS.client}</TableHead>
                  <SortableTableHeader
                    label="Tổng (trước VAT)"
                    sortKey="total_amount"
                    sortBy={params.sortBy}
                    sortOrder={params.sortOrder}
                    onSort={onSort}
                    className="text-right"
                  />
                  <TableHead>{FIELDS.status}</TableHead>
                  <TableHead>Đã gửi</TableHead>
                  <SortableTableHeader
                    label="Ngày chốt"
                    sortKey="decided_date"
                    sortBy={params.sortBy}
                    sortOrder={params.sortOrder}
                    onSort={onSort}
                  />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isError ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-destructive">
                      Không tải được danh sách báo giá — thử tải lại trang.
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-muted-foreground">
                      Không có báo giá nào khớp bộ lọc.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((quote) => {
                    // Server-computed (a newer version exists for this
                    // project), so it holds on any page. `=== false` on
                    // purpose: a response without the field must not paint
                    // every row "Đã thay thế".
                    const superseded = quote?.is_latest === false;
                    const badge = superseded
                      ? QUOTE_SUPERSEDED_LABEL
                      : labelOf(QUOTE_STATUSES, quote.status);
                    return (
                      <TableRow key={quote.id}>
                        <TableCell className="font-medium">
                          <Link
                            href={`/quotes/${quote.id}`}
                            className="hover:underline"
                          >
                            BG-{String(quote.id).padStart(3, "0")} · v
                            {quote.version}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {quote?.project_id ? (
                            <Link
                              href={`/projects/${quote.project_id}`}
                              className="hover:underline"
                            >
                              {quote?.project
                                ? `${quote.project?.code} · ${quote.project?.name}`
                                : `Công trình #${quote.project_id}`}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {quote?.project?.client?.name ?? "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatVND(quote.total_amount)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {sentChannels(quote) || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {quote.decided_date
                            ? formatDate(quote.decided_date)
                            : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })
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
        itemName="báo giá"
        pageSizes={pageSizes}
      />
    </div>
  );
}
