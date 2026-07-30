import { ChevronLeft, ChevronRight } from "lucide-react";

import { pageCount } from "@/utils/page-param/page-param";

import { PagerButton } from "./components/pager-button/pager-button";

/**
 * Trước/Sau pager for the server-rendered list pages, driven entirely by `?page=`
 * so the visible rows are reproducible from the URL.
 *
 * `total` is the whole collection's row count, read from the list response's
 * `X-Total-Count` header — so the page count is computed here, instead of every
 * caller fetching one row more than it renders to guess whether a next page
 * exists. `pageRows` must be the `limit` the caller actually sent, or the count
 * is wrong.
 */
export function TablePager({
  page,
  total,
  pageRows,
  basePath,
}: {
  page: number;
  total: number;
  pageRows: number;
  basePath: string;
}) {
  const pages = pageCount({ total, pageRows });

  // Single page — no controls at all rather than two dead buttons. An
  // out-of-range `?page=` (page > pages) keeps them, so Trước leads back.
  if (pages === 1 && page <= pages) return null;

  // Page 1 is the bare path so the canonical URL carries no redundant query.
  const href = (target: number) =>
    target === 1 ? basePath : `${basePath}?page=${target}`;

  return (
    <div className="mt-4 flex items-center justify-end gap-3">
      <span className="text-xs text-muted-foreground">
        trang {page} / {pages}
      </span>
      <div className="flex gap-2">
        <PagerButton href={href(page - 1)} disabled={page <= 1}>
          <ChevronLeft />
          Trước
        </PagerButton>
        <PagerButton href={href(page + 1)} disabled={page >= pages}>
          Sau
          <ChevronRight />
        </PagerButton>
      </div>
    </div>
  );
}
