"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { cn } from "../lib/utils";
import { Button } from "./button";

/**
 * Client-side pagination footer for filtered tables: range summary, page-size
 * select, Trước/Sau. Page-size uses a native <select> — the repo's sanctioned
 * single-select — styled to mirror Input.
 */
function TablePagination({
  page,
  limit,
  totalCount,
  onPageChange,
  onLimitChange,
  isLoading = false,
  itemName,
  pageSizes,
  className,
}: {
  page: number;
  limit: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  isLoading?: boolean;
  /** e.g. "công trình", "khách hàng" — reads "Hiển thị 1–20 / 53 công trình". */
  itemName: string;
  pageSizes: number[];
  className?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));
  const start = totalCount === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, totalCount);

  return (
    <div
      data-slot="table-pagination"
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground",
        className
      )}
    >
      <span>
        Hiển thị {start}–{end} / {totalCount} {itemName}
      </span>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2">
          Mỗi trang
          <select
            value={limit}
            disabled={isLoading}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {pageSizes.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-2">
          <span>
            Trang {totalCount === 0 ? 0 : page} / {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1 || totalCount === 0 || isLoading}
          >
            <ChevronLeftIcon />
            <span className="sr-only">Trang trước</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages || totalCount === 0 || isLoading}
          >
            <ChevronRightIcon />
            <span className="sr-only">Trang sau</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

export { TablePagination };
