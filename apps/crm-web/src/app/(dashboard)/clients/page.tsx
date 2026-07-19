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

import { ClientFormDialog } from "./components/client-form-dialog/client-form-dialog";
import { ClientStatus } from "./enums";
import { listClients } from "./queries";

const statusVariant: Record<
  ClientStatus,
  "success" | "secondary" | "destructive"
> = {
  [ClientStatus.ACTIVE]: "success",
  [ClientStatus.LEAD]: "secondary",
  [ClientStatus.CHURNED]: "destructive",
};

const statusLabel: Record<ClientStatus, string> = {
  [ClientStatus.ACTIVE]: "Đang hoạt động",
  [ClientStatus.LEAD]: "Tiềm năng",
  [ClientStatus.CHURNED]: "Đã rời bỏ",
};

export default async function ClientsPage() {
  const clients = await listClients();

  return (
    <>
      <PageHeader
        title="Khách hàng"
        description={`${clients.length} khách hàng`}
        action={<ClientFormDialog />}
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
            {clients.map((client) => (
              <TableRow key={client.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/clients/${client.id}`}
                    className="hover:underline"
                  >
                    {client.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {client.company}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {client.email}
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant[client.status]}>
                    {statusLabel[client.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {client.created_at}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
