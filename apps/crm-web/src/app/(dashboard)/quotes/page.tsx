import Link from "next/link";

import { Badge } from "@yan/ui/components/badge";
import { Button } from "@yan/ui/components/button";
import { Card } from "@yan/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@yan/ui/components/table";

import { PageHeader } from "@/components/page-header/page-header";
import { quoteChannel, quoteStatus, quoteSuperseded } from "@/constants/labels";
import { MAX_PAGE_SIZE } from "@/constants/pagination";
import { formatDate } from "@/utils/format-date/format-date";
import { formatVND } from "@/utils/format-vnd/format-vnd";
import { labelOf } from "@/utils/label-of/label-of";

import { QuoteStatus } from "./enums";
import { listQuotes } from "./queries";
import type { QuoteListRow } from "./types";

/** Unique channels this quote went out on, in Vietnamese. */
function sentChannels(quote: QuoteListRow): string {
  const labels = (quote?.send_logs ?? [])
    .map((log) => quoteChannel?.[log?.channel] ?? log?.channel)
    .filter(Boolean);
  return [...new Set(labels)].join(", ");
}

export default async function QuotesPage() {
  const quotes = await listQuotes();
  const waiting = quotes.filter((q) => q.status === QuoteStatus.WAITING).length;

  // ponytail: the endpoint returns rows, not a total, so a response that fills
  // the page can only honestly call itself a page — both counts below are
  // page-scoped then. Needs a total in the response (or page controls) to say N.
  const counts = `${quotes.length} báo giá · ${waiting} chờ duyệt`;

  return (
    <>
      <PageHeader
        title="Báo giá"
        description={
          quotes.length >= MAX_PAGE_SIZE ? `Trang đầu · ${counts}` : counts
        }
        action={
          <Button size="sm" render={<Link href="/quotes/new" />}>
            + Báo giá mới
          </Button>
        }
      />
      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Báo giá</TableHead>
              <TableHead>Công trình</TableHead>
              <TableHead>Khách hàng</TableHead>
              <TableHead className="text-right">Tổng (trước VAT)</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Đã gửi</TableHead>
              <TableHead>Ngày chốt</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quotes.map((quote) => {
              // Server-computed (a newer version exists for this project), so it
              // holds on any page. `=== false` on purpose: a response without the
              // field must not paint every row "Đã thay thế".
              const superseded = quote?.is_latest === false;
              // Status is a raw wire value — labelOf degrades an unmapped one to
              // a neutral badge instead of crashing the list.
              const badge = superseded
                ? quoteSuperseded
                : labelOf(quoteStatus, quote.status);
              return (
                <TableRow key={quote.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/quotes/${quote.id}`}
                      className="hover:underline"
                    >
                      BG-{String(quote.id).padStart(3, "0")} · v{quote.version}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {quote?.project_id ? (
                      <Link
                        href={`/projects/${quote.project_id}`}
                        className="hover:underline"
                      >
                        {quote?.project
                          ? `${quote.project?.code} · ${quote.project?.name}`
                          : `Công trình #${quote.project_id}`}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {quote?.project?.client?.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatVND(quote.total_amount)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {sentChannels(quote) || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {quote.decided_date ? formatDate(quote.decided_date) : "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
