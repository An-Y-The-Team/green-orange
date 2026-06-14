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
import { formatDate, formatVND, quoteTotals } from "@/lib/format";
import { quoteStatus, quoteType } from "@/lib/labels";

import { QuoteFormDialog } from "./components/quote-form-dialog/quote-form-dialog";
import { listQuotes } from "./queries";

export default async function QuotesPage() {
  const quotes = await listQuotes();
  const pending = quotes.filter((q) => q.status === "da_gui").length;

  return (
    <>
      <PageHeader
        title="Báo giá"
        description={`${quotes.length} báo giá · ${pending} chờ duyệt`}
        action={<QuoteFormDialog />}
      />
      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã</TableHead>
              <TableHead>Tiêu đề</TableHead>
              <TableHead>Khách hàng</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead>Ngày lập</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Tổng cộng</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quotes.map((quote) => (
              <TableRow key={quote.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/quotes/${quote.id}`}
                    className="hover:underline"
                  >
                    {quote.code}
                  </Link>
                </TableCell>
                <TableCell>{quote.title}</TableCell>
                <TableCell className="text-muted-foreground">
                  {quote.customer}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {quoteType[quote.type]}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(quote.issue_date)}
                </TableCell>
                <TableCell>
                  <Badge variant={quoteStatus[quote.status].variant}>
                    {quoteStatus[quote.status].label}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {formatVND(quoteTotals(quote.items, quote.vat_rate).total)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
