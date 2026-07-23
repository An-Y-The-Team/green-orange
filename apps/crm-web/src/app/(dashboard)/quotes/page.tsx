import Link from "next/link";

import { Badge } from "@yan/ui/components/badge";
import { Card } from "@yan/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@yan/ui/components/table";

import { PageHeader } from "@/components/page-header";
import { formatDate, formatVND } from "@/lib/format";
import { quoteChannel, quoteStatus, quoteSuperseded } from "@/lib/labels";

import { QuoteStatus } from "./enums";
import { listQuotes } from "./queries";
import type { Quote } from "./types";

/** Unique channels this quote went out on, in Vietnamese. */
function sentChannels(quote: Quote): string {
  const channels = [...new Set(quote.send_logs.map((l) => l.channel))];
  return channels.map((c) => quoteChannel[c]).join(", ");
}

export default async function QuotesPage() {
  const quotes = await listQuotes();
  const waiting = quotes.filter((q) => q.status === QuoteStatus.WAITING).length;

  // Older-than-latest versions per project are "Đã thay thế" (derived).
  const maxVersion = new Map<number, number>();
  for (const q of quotes) {
    maxVersion.set(
      q.project_id,
      Math.max(maxVersion.get(q.project_id) ?? 0, q.version)
    );
  }
  const isSuperseded = (q: Quote) =>
    q.version < (maxVersion.get(q.project_id) ?? q.version);

  return (
    <>
      <PageHeader
        title="Báo giá"
        description={`${quotes.length} báo giá · ${waiting} chờ duyệt`}
      />
      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Báo giá</TableHead>
              <TableHead>Công trình</TableHead>
              <TableHead className="text-right">Tổng (trước VAT)</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Đã gửi</TableHead>
              <TableHead>Ngày chốt</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quotes.map((quote) => {
              const superseded = isSuperseded(quote);
              const badge = superseded
                ? quoteSuperseded
                : quoteStatus[quote.status];
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
                    <Link
                      href={`/projects/${quote.project_id}`}
                      className="hover:underline"
                    >
                      Công trình #{quote.project_id}
                    </Link>
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
