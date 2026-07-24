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
import { clientType } from "@/lib/labels";

import { ClientType } from "./enums";
import { listClients } from "./queries";

export default async function ClientsPage() {
  const clients = await listClients();

  return (
    <>
      <PageHeader
        title="Khách hàng"
        description={`${clients.length} khách hàng`}
        action={
          <Button size="sm" render={<Link href="/clients/new" />}>
            + Khách hàng mới
          </Button>
        }
      />
      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead className="text-right">Địa điểm</TableHead>
              <TableHead className="text-right">Dự án</TableHead>
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
                <TableCell>
                  <Badge
                    variant={
                      client.type === ClientType.COMPANY
                        ? "secondary"
                        : "outline"
                    }
                  >
                    {clientType[client.type]}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {client._count.locations}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {client._count.projects}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(client.created_at)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
