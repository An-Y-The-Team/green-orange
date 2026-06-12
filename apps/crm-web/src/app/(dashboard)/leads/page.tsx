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
import { listLeads } from "@/lib/api";
import { formatUSD } from "@/lib/format";
import type { LeadStatus } from "@/types";

const statusVariant: Record<
  LeadStatus,
  "default" | "secondary" | "success" | "destructive"
> = {
  new: "secondary",
  contacted: "default",
  qualified: "success",
  lost: "destructive",
};

export default async function LeadsPage() {
  const leads = await listLeads();

  return (
    <>
      <PageHeader title="Tiềm năng" description={`${leads.length} tiềm năng`} />
      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên</TableHead>
              <TableHead>Công ty</TableHead>
              <TableHead>Nguồn</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Phụ trách</TableHead>
              <TableHead className="text-right">Giá trị</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => (
              <TableRow key={lead.id}>
                <TableCell className="font-medium">{lead.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {lead.company}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {lead.source}
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant[lead.status]}>
                    {lead.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {lead.owner}
                </TableCell>
                <TableCell className="text-right">
                  {formatUSD(lead.value)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
