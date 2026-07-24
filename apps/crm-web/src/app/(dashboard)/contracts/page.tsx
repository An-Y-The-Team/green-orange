import { FileText } from "lucide-react";
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

import { PageHeader } from "@/components/page-header";
import { formatDate } from "@/lib/format";
import { contractStatus } from "@/lib/labels";

import { ContractStatus } from "./enums";
import { listContracts } from "./queries";

export default async function ContractsPage() {
  const contracts = await listContracts();
  const signed = contracts.filter(
    (c) => c.status === ContractStatus.SIGNED
  ).length;

  return (
    <>
      <PageHeader
        title="Hợp đồng"
        description={`${contracts.length} hợp đồng · ${signed} đã ký`}
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              render={<Link href="/contracts/templates" />}
            >
              <FileText />
              Mẫu hợp đồng
            </Button>
            <Button size="sm" render={<Link href="/contracts/new" />}>
              + Hợp đồng mới
            </Button>
          </div>
        }
      />
      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã</TableHead>
              <TableHead>Công trình</TableHead>
              <TableHead>Khách hàng</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Ngày ký</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contracts.map((contract) => (
              <TableRow key={contract.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/contracts/${contract.id}`}
                    className="hover:underline"
                  >
                    {contract.code}
                  </Link>
                </TableCell>
                <TableCell>
                  {contract.project_id ? (
                    <Link
                      href={`/projects/${contract.project_id}`}
                      className="hover:underline"
                    >
                      {contract.project
                        ? `${contract.project.code} · ${contract.project.name}`
                        : `Công trình #${contract.project_id}`}
                    </Link>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {contract.project?.client.name ?? "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={contractStatus[contract.status].variant}>
                    {contractStatus[contract.status].label}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {contract.signed_date
                    ? formatDate(contract.signed_date)
                    : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
