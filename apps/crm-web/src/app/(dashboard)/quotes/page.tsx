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

  // Older-than-latest versions per project are "Đã thay thế" (derived).
  // Correct on a paginated response only because GET /quotes orders by version
  // desc from offset 0: a newer sibling always sorts BEFORE this row, so it is
  // inside the same prefix we fetched.
  // ponytail: that guarantee dies the moment this list sends an offset or the
  // server reorders — the upgrade is a server-computed `is_latest` per row.
  const maxVersion = new Map<number, number>();
  for (const q of quotes) {
    if (q?.project_id == null) continue; // standalone quotes have no siblings
    maxVersion.set(
      q.project_id,
      Math.max(maxVersion.get(q.project_id) ?? 0, q.version)
    );
  }
  const isSuperseded = (q: QuoteListRow) =>
    q?.project_id != null &&
    q.version < (maxVersion.get(q.project_id) ?? q.version);

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
              const superseded = isSuperseded(quote);
              // Status is a raw wire value — an unmapped one must not crash the
              // list, so fall back to showing the key.
              const badge = superseded
                ? quoteSuperseded
                : (quoteStatus?.[quote?.status] ?? {
                    label: quote?.status,
                    variant: "secondary" as const,
                  });
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
