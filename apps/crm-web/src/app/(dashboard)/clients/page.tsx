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

import { PageHeader } from "@/components/page-header/page-header";
import { TablePager } from "@/components/table-pager/table-pager";
import { clientType } from "@/constants/labels";
import { formatDate } from "@/utils/format-date/format-date";
import { pageFromParam } from "@/utils/page-param/page-param";

import { ClientType } from "./enums";
import { listClients } from "./queries";

// Rows per page. Explicit rather than leaning on the API's default so the pager
// and the offsets it builds agree with what is actually rendered.
const PAGE_ROWS = 100;

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const page = pageFromParam((await searchParams)?.page);
  // One row more than we render: GET /clients returns a bare array with no
  // total, so an extra row is the only honest way to know a next page exists.
  const rows = await listClients({
    limit: PAGE_ROWS + 1,
    offset: (page - 1) * PAGE_ROWS,
  });
  const hasNext = rows.length > PAGE_ROWS;
  const clients = rows.slice(0, PAGE_ROWS);

  // Page-scoped count whenever more than one page exists — same treatment as
  // quotes/page.tsx: say which page rather than imply a total the API never sent.
  const counts = `${clients.length} khách hàng`;

  return (
    <>
      <PageHeader
        title="Khách hàng"
        description={hasNext || page > 1 ? `Trang ${page} · ${counts}` : counts}
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
      <TablePager page={page} hasNext={hasNext} basePath="/clients" />
    </>
  );
}
