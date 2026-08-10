"use client";

import { Loader2, Plus } from "lucide-react";
import Link from "next/link";

import { Badge } from "@yan/ui/components/badge";
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
import {
  CREW_MEMBER_STATUSES,
  EMPLOYMENT_TYPES,
  FIELDS,
} from "@/constants/labels";
import { labelOf } from "@/utils/label-of/label-of";

import { CrewMemberStatus, EmploymentType } from "../../enums";
import type { CrewRole } from "../../types";
import { useRosterListParams } from "./hooks/use-roster-list-params/use-roster-list-params";

const STATUS_OPTIONS = Object.entries(CREW_MEMBER_STATUSES).map(
  ([value, { label }]) => ({ value, label })
);
const EMPLOYMENT_OPTIONS = Object.entries(EMPLOYMENT_TYPES).map(
  ([value, label]) => ({ value, label })
);

/**
 * Self-fetching roster: filters/sort/page live in the URL, rows come from
 * GET /api/crm/crew. The pager lives INSIDE the tab now, so it no longer
 * shows on Vị trí / Chấm công (the old page-level TablePager wart).
 */
export function RosterTab({ roles }: { roles: CrewRole[] }) {
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
  } = useRosterListParams();

  const roleOptions = roles.map((role) => ({
    value: String(role.id),
    label: role.name,
  }));

  // Vị trí filter — MultiSelect values are strings, the API wants role ids.
  const handleRoleChange = (roleIds: string[]) =>
    setListParams({ role_id: roleIds.map(Number) });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          defaultValue={params.search}
          onChange={(search) => setListParams({ search })}
          placeholder="Tìm tên, SĐT…"
          className="w-64"
        />
        <MultiSelect
          options={STATUS_OPTIONS}
          value={params.status}
          onChange={(status) =>
            setListParams({ status: status as CrewMemberStatus[] })
          }
          placeholder={FIELDS.status}
          className="min-w-32"
        />
        <MultiSelect
          options={EMPLOYMENT_OPTIONS}
          value={params.employment_type}
          onChange={(employment_type) =>
            setListParams({
              employment_type: employment_type as EmploymentType[],
            })
          }
          placeholder={FIELDS.employmentType}
          className="min-w-32"
        />
        <MultiSelect
          options={roleOptions}
          value={params.role_id.map(String)}
          onChange={handleRoleChange}
          placeholder={FIELDS.defaultRole}
          className="min-w-32"
        />
        <span className="ml-auto text-sm text-muted-foreground">
          {total} nhân sự
        </span>
        <Button size="sm" render={<Link href="/crew/new" />}>
          <Plus className="size-4" />
          Thêm nhân sự
        </Button>
      </div>

      {isLoading ? (
        <TableSkeleton columns={5} />
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
                    label={FIELDS.fullName}
                    sortKey="name"
                    sortBy={params.sortBy}
                    sortOrder={params.sortOrder}
                    onSort={(sort) => setListParams(sort)}
                  />
                  <TableHead>{FIELDS.phone}</TableHead>
                  <TableHead>{FIELDS.defaultRole}</TableHead>
                  <TableHead>{FIELDS.employmentType}</TableHead>
                  <TableHead>{FIELDS.status}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isError ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-destructive">
                      Không tải được danh sách nhân sự — thử tải lại trang.
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground">
                      Không có nhân sự nào khớp bộ lọc.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((member) => {
                    const status = labelOf(CREW_MEMBER_STATUSES, member.status);
                    return (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">
                          <Link
                            href={`/crew/${member.id}`}
                            className="hover:underline"
                          >
                            {member.name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {member.phone ?? "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {member.default_role?.name ?? "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              member.employment_type ===
                              EmploymentType.PERMANENT
                                ? "default"
                                : "secondary"
                            }
                          >
                            {EMPLOYMENT_TYPES[member.employment_type] ??
                              member.employment_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>{status.label}</Badge>
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
        itemName="nhân sự"
        pageSizes={pageSizes}
      />
    </div>
  );
}
