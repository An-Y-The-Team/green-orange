import { Suspense } from "react";

import { Card, CardHeader, CardTitle } from "@yan/ui/components/card";
import { Skeleton } from "@yan/ui/components/skeleton";

import { PageHeader } from "@/components/page-header/page-header";
import { FIELDS } from "@/constants/labels";

import { BillTable } from "./components/bill-table/bill-table";
import { MilestoneTable } from "./components/milestone-table/milestone-table";
import { SummaryStrip } from "./components/summary-strip/summary-strip";
import { getReceivablesSummary } from "./queries";

// Thu & công nợ — the secretary's daily money screen.
//
// Was a server-rendered dump of the first 100 đợt and the first 100 hóa đơn,
// with the overdue-first sort running in JS over that page: no search, no
// filter, no sort, no pager, and an overdue row at position 101 that never
// surfaced. The two tables now filter/sort/page against the server like every
// other list in the app, and default to hiding what has already been collected
// — 8 of the 11 seeded rows were `Đã thu`, so the screen was mostly history.
//
// The totals come from GET /receivables/summary, which aggregates in Postgres:
// the number is the same whatever page the table is on. That is what the
// dashboard's missing "Tổng công nợ" was waiting for.
export default async function ReceivablesPage() {
  const summary = await getReceivablesSummary();

  return (
    <>
      <PageHeader
        title="Thu & công nợ"
        description="Đợt thanh toán và hóa đơn của các công trình."
      />

      <div className="space-y-6">
        <SummaryStrip summary={summary} />

        <Card className="gap-3 py-4">
          <CardHeader>
            <CardTitle className="text-base">
              {FIELDS.paymentMilestone}
            </CardTitle>
          </CardHeader>
          <div className="px-4">
            {/* Both tables read their filters from the URL, so they need a
                Suspense boundary for useSearchParams — same as /projects. */}
            <Suspense fallback={<Skeleton className="h-64 w-full" />}>
              <MilestoneTable />
            </Suspense>
          </div>
        </Card>

        <Card className="gap-3 py-4">
          <CardHeader>
            <CardTitle className="text-base">Hóa đơn</CardTitle>
          </CardHeader>
          <div className="px-4">
            <Suspense fallback={<Skeleton className="h-64 w-full" />}>
              <BillTable />
            </Suspense>
          </div>
        </Card>
      </div>
    </>
  );
}
