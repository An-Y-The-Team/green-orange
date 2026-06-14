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
import { formatUSD } from "@/lib/format";
import type { DealStage } from "@/types";

import { listDeals } from "./queries";

const stageVariant: Record<
  DealStage,
  "default" | "secondary" | "warning" | "success" | "destructive"
> = {
  prospect: "secondary",
  proposal: "default",
  negotiation: "warning",
  won: "success",
  lost: "destructive",
};

export default async function DealsPage() {
  const deals = await listDeals();
  const total = deals
    .filter((d) => d.stage !== "lost")
    .reduce((sum, d) => sum + d.amount, 0);

  return (
    <>
      <PageHeader
        title="Cơ hội"
        description={`${deals.length} cơ hội · ${formatUSD(total)} pipeline`}
      />
      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cơ hội</TableHead>
              <TableHead>Công ty</TableHead>
              <TableHead>Giai đoạn</TableHead>
              <TableHead>Ngày chốt</TableHead>
              <TableHead className="text-right">Giá trị</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deals.map((deal) => (
              <TableRow key={deal.id}>
                <TableCell className="font-medium">{deal.title}</TableCell>
                <TableCell className="text-muted-foreground">
                  {deal.company}
                </TableCell>
                <TableCell>
                  <Badge variant={stageVariant[deal.stage]}>{deal.stage}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {deal.close_date}
                </TableCell>
                <TableCell className="text-right">
                  {formatUSD(deal.amount)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
