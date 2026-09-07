import { Card, CardContent } from "@yan/ui/components/card";
import { cn } from "@yan/ui/lib/utils";

import { formatVND } from "@/utils/format-vnd/format-vnd";

import type { ReceivablesSummary } from "../../types";

/**
 * The totals the app never had.
 *
 * The dashboard deliberately printed no "Tổng công nợ", with the reason written
 * down: a sum over one 100-row page understates the debt and looks
 * authoritative doing it. These come from `GET /receivables/summary`, which
 * aggregates in Postgres over every row — so they are the same number whatever
 * page the table is on.
 */
export function SummaryStrip({ summary }: { summary: ReceivablesSummary }) {
  const { by_status: milestones, overdue } = summary.milestones;
  const bills = summary.bills.by_status;

  const cells = [
    {
      label: "Chờ thu",
      hint: "đợt chưa đến hạn + đang chờ thanh toán",
      count: milestones.not_due.count + milestones.awaiting_payment.count,
      total: milestones.not_due.total + milestones.awaiting_payment.total,
    },
    {
      label: "Quá hạn",
      hint: "đã qua hạn thu và chưa thu",
      count: overdue.count,
      total: overdue.total,
      alarming: overdue.count > 0,
    },
    {
      label: "Hóa đơn chưa thu",
      hint: "đã gửi, chưa thanh toán",
      count: bills.sent.count,
      total: bills.sent.total,
    },
    {
      label: "Đã thu",
      hint: "tổng đã thu theo đợt",
      count: milestones.paid.count,
      total: milestones.paid.total,
      muted: true,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cells.map((cell) => (
        <Card key={cell.label} className="py-0">
          <CardContent className="space-y-1 p-4">
            <p className="text-xs text-muted-foreground">{cell.label}</p>
            <p
              className={cn(
                "text-lg font-semibold tabular-nums",
                cell.alarming && "text-destructive",
                cell.muted && "text-muted-foreground"
              )}
            >
              {formatVND(cell.total)}
            </p>
            <p className="text-xs text-muted-foreground">
              {cell.count} {cell.hint}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
