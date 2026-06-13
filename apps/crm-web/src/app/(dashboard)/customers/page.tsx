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
import Link from "next/link";

import { CustomerFormDialog } from "@/components/customer-form-dialog";
import { PageHeader } from "@/components/page-header";
import { listCustomers } from "@/lib/api";
import type { CustomerStatus } from "@/types";

const statusVariant: Record<
  CustomerStatus,
  "success" | "secondary" | "destructive"
> = {
  active: "success",
  lead: "secondary",
  churned: "destructive",
};

const statusLabel: Record<CustomerStatus, string> = {
  active: "Đang hoạt động",
  lead: "Tiềm năng",
  churned: "Đã rời bỏ",
};

export default async function CustomersPage() {
  const customers = await listCustomers();

  return (
    <>
      <PageHeader
        title="Khách hàng"
        description={`${customers.length} khách hàng`}
        action={<CustomerFormDialog />}
      />
      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên</TableHead>
              <TableHead>Công ty</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Ngày tạo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/customers/${customer.id}`}
                    className="hover:underline"
                  >
                    {customer.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {customer.company}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {customer.email}
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant[customer.status]}>
                    {statusLabel[customer.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {customer.created_at}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
