import Link from "next/link";
import { Suspense } from "react";

import { Button } from "@yan/ui/components/button";

import { PageHeader } from "@/components/page-header/page-header";
import { TableSkeleton } from "@/components/table-skeleton/table-skeleton";
import { FIELDS } from "@/constants/labels";

import { ClientList } from "./components/client-list/client-list";

export default function ClientsPage() {
  return (
    <>
      <PageHeader
        title={FIELDS.client}
        action={
          <Button size="sm" render={<Link href="/clients/new" />}>
            + Khách hàng mới
          </Button>
        }
      />
      {/* The list owns its filters/sort/page in the URL (usePageParams →
          useSearchParams), which requires a Suspense boundary to prerender. */}
      <Suspense fallback={<TableSkeleton columns={5} />}>
        <ClientList />
      </Suspense>
    </>
  );
}
