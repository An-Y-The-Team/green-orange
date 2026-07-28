import { ChevronLeft, ChevronRight } from "lucide-react";

import { PagerButton } from "./components/pager-button/pager-button";

/**
 * Trước/Sau pager for the server-rendered list pages, driven entirely by `?page=`
 * so the visible rows are reproducible from the URL.
 *
 * No page count and no "trang N / M": the list endpoints return a bare array
 * with no total (F17), so `hasNext` is all that can be substantiated — callers
 * establish it by asking the API for one row more than they render. Which page
 * you are on is stated once, in the page header's description.
 */
export function TablePager({
  page,
  hasNext,
  basePath,
}: {
  page: number;
  hasNext: boolean;
  basePath: string;
}) {
  // Single page — no controls at all rather than two dead buttons.
  if (page === 1 && !hasNext) return null;

  // Page 1 is the bare path so the canonical URL carries no redundant query.
  const href = (target: number) =>
    target === 1 ? basePath : `${basePath}?page=${target}`;

  return (
    <div className="mt-4 flex justify-end gap-2">
      <PagerButton href={href(page - 1)} disabled={page <= 1}>
        <ChevronLeft />
        Trước
      </PagerButton>
      <PagerButton href={href(page + 1)} disabled={!hasNext}>
        Sau
        <ChevronRight />
      </PagerButton>
    </div>
  );
}
