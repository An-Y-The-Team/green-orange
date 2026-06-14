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
import { contractStatus } from "@/lib/labels";

import { ContractFormDialog } from "./components/contract-form-dialog/contract-form-dialog";
import { listContracts } from "./queries";

export default async function ContractsPage() {
  const contracts = await listContracts();
  const total = contracts.reduce((sum, c) => sum + c.value, 0);

  return (
    <>
      <PageHeader
        title="Hợp đồng"
        description={`${contracts.length} hợp đồng · ${formatVND(total)} tổng giá trị`}
        action={<ContractFormDialog />}
      />
      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã</TableHead>
              <TableHead>Tiêu đề</TableHead>
              <TableHead>Khách hàng</TableHead>
              <TableHead>Ngày ký</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Giá trị</TableHead>
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
                <TableCell>{contract.title}</TableCell>
                <TableCell className="text-muted-foreground">
                  {contract.customer}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(contract.signed_date)}
                </TableCell>
                <TableCell>
                  <Badge variant={contractStatus[contract.status].variant}>
                    {contractStatus[contract.status].label}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {formatVND(contract.value)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
