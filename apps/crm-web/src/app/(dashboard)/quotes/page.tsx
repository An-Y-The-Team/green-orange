import Link from "next/link";
import { Suspense } from "react";

import { Button } from "@yan/ui/components/button";

import { PageHeader } from "@/components/page-header/page-header";
import { TableSkeleton } from "@/components/table-skeleton/table-skeleton";

import { QuoteList } from "./components/quote-list/quote-list";

export default function QuotesPage() {
  return (
    <>
      <PageHeader
        title="Báo giá"
        action={
          <Button size="sm" render={<Link href="/quotes/new" />}>
            + Báo giá mới
          </Button>
        }
      />
      {/* The list owns its filters/sort/page in the URL (usePageParams →
          useSearchParams), which requires a Suspense boundary to prerender.
          The old "Trang đầu · N chờ duyệt" header died with the 500-row
          fetch: the total now comes from X-Total-Count via the list query. */}
      <Suspense fallback={<TableSkeleton columns={7} />}>
        <QuoteList />
      </Suspense>
    </>
  );
}
