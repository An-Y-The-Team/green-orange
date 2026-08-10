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
import { FIELDS, PROJECT_STAGES, PROJECT_STATUSES } from "@/constants/labels";
import { formatDate } from "@/utils/format-date/format-date";
import { labelOf } from "@/utils/label-of/label-of";

import { ProjectStage, ProjectStatus } from "../../enums";
import {
  type ProjectSortKey,
  useProjectListParams,
} from "./hooks/use-project-list-params/use-project-list-params";

// Options in pipeline order — the label records are declared in stage order.
const STAGE_OPTIONS = Object.entries(PROJECT_STAGES).map(
  ([value, { label }]) => ({ value, label })
);
const STATUS_OPTIONS = Object.entries(PROJECT_STATUSES).map(
  ([value, { label }]) => ({ value, label })
);

export function ProjectList() {
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
  } = useProjectListParams();

  const onSort = (sort: { sortBy: ProjectSortKey; sortOrder: SortOrder }) =>
    setListParams(sort);

  // Un-checking every status means "show everything, cancelled too" — but an
  // empty array is cleaned out of the URL and a reload would restore the
  // hide-cancelled default. All-three-selected shows the same rows AND
  // round-trips, so map empty to it.
  const handleStatusChange = (status: string[]) =>
    setListParams({
      status: status.length
        ? (status as ProjectStatus[])
        : Object.values(ProjectStatus),
    });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          defaultValue={params.search}
          onChange={(search) => setListParams({ search })}
          placeholder="Tìm mã, tên, khách hàng…"
          className="w-64"
        />
        <MultiSelect
          options={STAGE_OPTIONS}
          value={params.stage}
          onChange={(stage) =>
            setListParams({ stage: stage as ProjectStage[] })
          }
          placeholder={FIELDS.stage}
          className="min-w-32"
        />
        <MultiSelect
          options={STATUS_OPTIONS}
          value={params.status}
          onChange={handleStatusChange}
          placeholder={FIELDS.status}
          className="min-w-32"
        />
        <span className="ml-auto text-sm text-muted-foreground">
          {total} công trình
        </span>
      </div>

      {isLoading ? (
        <TableSkeleton columns={8} />
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
                    label="Mã"
                    sortKey="code"
                    sortBy={params.sortBy}
                    sortOrder={params.sortOrder}
                    onSort={onSort}
                  />
                  <SortableTableHeader
                    label={FIELDS.projectName}
                    sortKey="name"
                    sortBy={params.sortBy}
                    sortOrder={params.sortOrder}
                    onSort={onSort}
                  />
                  <TableHead>{FIELDS.client}</TableHead>
                  <TableHead>{FIELDS.location}</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>{FIELDS.stage}</TableHead>
                  <TableHead>{FIELDS.status}</TableHead>
                  <SortableTableHeader
                    label="Hẹn khảo sát"
                    sortKey="appointment_at"
                    sortBy={params.sortBy}
                    sortOrder={params.sortOrder}
                    onSort={onSort}
                  />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isError ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-destructive">
                      Không tải được danh sách công trình — thử tải lại trang.
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-muted-foreground">
                      Không có công trình nào khớp bộ lọc.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((project) => {
                    const stage = labelOf(PROJECT_STAGES, project.stage);
                    const status = labelOf(PROJECT_STATUSES, project.status);
                    return (
                      <TableRow key={project.id}>
                        <TableCell className="font-medium">
                          <Link
                            href={`/projects/${project.id}`}
                            className="hover:underline"
                          >
                            {project.code}
                          </Link>
                        </TableCell>
                        <TableCell>{project.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {project.client?.name ?? `#${project.client_id}`}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {project.location?.name ?? `#${project.location_id}`}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {project.types?.map((type) => (
                              <Badge key={type.id} variant="outline">
                                {type.name}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={stage.variant}>{stage.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {project.appointment_at
                            ? formatDate(project.appointment_at)
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
        itemName="công trình"
        pageSizes={pageSizes}
      />
    </div>
  );
}
