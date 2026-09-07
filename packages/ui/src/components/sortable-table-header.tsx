"use client";

import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from "lucide-react";

import { SORT_ORDER, type SortOrder } from "@yan/shared/constants/filters";

import { cn } from "../lib/utils";
import { Button } from "./button";
import { TableHead } from "./table";

/**
 * Clickable column header for server-sorted tables. Inactive → sorts desc;
 * active → flips direction. The column key is the API's `sort_by` value.
 */
function SortableTableHeader<T extends string>({
  label,
  sortKey,
  sortBy,
  sortOrder,
  onSort,
  className,
}: {
  label: string;
  sortKey: T;
  sortBy?: T;
  sortOrder?: SortOrder;
  onSort: (params: { sortBy: T; sortOrder: SortOrder }) => void;
  className?: string;
}) {
  const isActive = sortBy === sortKey;
  const Icon = !isActive
    ? ArrowUpDownIcon
    : sortOrder === SORT_ORDER.ASC
      ? ArrowUpIcon
      : ArrowDownIcon;

  return (
    <TableHead
      data-slot="sortable-table-header"
      // The sort state was visible only as an arrow glyph; `aria-sort` is what a
      // screen reader reads, and it is the attribute the role expects.
      aria-sort={
        !isActive
          ? "none"
          : sortOrder === SORT_ORDER.ASC
            ? "ascending"
            : "descending"
      }
      className={className}
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() =>
          onSort({
            sortBy: sortKey,
            sortOrder:
              isActive && sortOrder === SORT_ORDER.DESC
                ? SORT_ORDER.ASC
                : SORT_ORDER.DESC,
          })
        }
        // Hover did nothing at all (ghost + hover:bg-transparent), so a
        // sortable column was distinguishable from a plain one only by a
        // low-contrast glyph. Underline on hover is the affordance.
        className="-ml-2 h-auto p-1 font-medium hover:bg-transparent hover:underline hover:underline-offset-4"
      >
        {label}
        <Icon
          // muted-foreground on the header row read as decoration; this is the
          // only cue that the column sorts at all.
          className={cn("size-3.5", !isActive && "text-foreground/60")}
        />
      </Button>
    </TableHead>
  );
}

export { SortableTableHeader };
