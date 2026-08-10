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
import { CLIENT_TYPES, FIELDS } from "@/constants/labels";
import { formatDate } from "@/utils/format-date/format-date";

import { ClientType } from "../../enums";
import {
  type ClientSortKey,
  useClientListParams,
} from "./hooks/use-client-list-params/use-client-list-params";

const TYPE_OPTIONS = Object.entries(CLIENT_TYPES).map(([value, label]) => ({
  value,
  label,
}));

export function ClientList() {
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
  } = useClientListParams();

  const onSort = (sort: { sortBy: ClientSortKey; sortOrder: SortOrder }) =>
    setListParams(sort);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          defaultValue={params.search}
          onChange={(search) => setListParams({ search })}
          placeholder="Tìm tên, MST…"
          className="w-64"
        />
        <MultiSelect
          options={TYPE_OPTIONS}
          value={params.type}
          onChange={(type) => setListParams({ type: type as ClientType[] })}
          placeholder="Loại"
          className="min-w-28"
        />
        <span className="ml-auto text-sm text-muted-foreground">
          {total} khách hàng
        </span>
      </div>

      {isLoading ? (
        <TableSkeleton columns={5} />
      ) : (
        <div className="relative">
          {/* Refetch keeps the previous rows visible, dimmed — a skeleton here
              would throw the layout away on every keystroke
              (frontend-code-style.md §Loading UI). */}
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
                    label="Tên"
                    sortKey="name"
                    sortBy={params.sortBy}
                    sortOrder={params.sortOrder}
                    onSort={onSort}
                  />
                  <TableHead>Loại</TableHead>
                  <TableHead className="text-right">
                    {FIELDS.location}
                  </TableHead>
                  <TableHead className="text-right">Dự án</TableHead>
                  <SortableTableHeader
                    label={FIELDS.createdDate}
                    sortKey="created_at"
                    sortBy={params.sortBy}
                    sortOrder={params.sortOrder}
                    onSort={onSort}
                  />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isError ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-destructive">
                      Không tải được danh sách khách hàng — thử tải lại trang.
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground">
                      Không có khách hàng nào khớp bộ lọc.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/clients/${client.id}`}
                          className="hover:underline"
                        >
                          {client.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            client.type === ClientType.COMPANY
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {CLIENT_TYPES[client.type]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {client._count?.locations}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {client._count?.projects}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(client.created_at)}
                      </TableCell>
                    </TableRow>
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
        itemName="khách hàng"
        pageSizes={pageSizes}
      />
    </div>
  );
}
