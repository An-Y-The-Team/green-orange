import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@yan/ui/components/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@yan/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@yan/ui/components/table";

import { formatDate } from "@/lib/format";
import { clientType } from "@/lib/labels";

import { ClientType } from "../enums";
import { getClient } from "../queries";

export default async function ClientDetailPage({
  params,
}: {
  // Next 16 route params are async.
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await getClient(Number(id));

  if (!client) {
    notFound();
  }

  const isCompany = client.type === ClientType.COMPANY;
  const managerName = (contactId: number | null) =>
    client.contacts.find((c) => c.id === contactId)?.name ?? "—";
  const managedLocations = (contactId: number) =>
    client.locations
      .filter((l) => l.manager_contact_id === contactId)
      .map((l) => l.name)
      .join(", ");

  const fields: [string, string][] = [
    ["Loại", clientType[client.type]],
    ["Ngày tạo", formatDate(client.created_at)],
  ];
  if (isCompany) {
    fields.push(["Mã số thuế", client.tax_code ?? "—"]);
  } else {
    // Individuals get one auto-created location — surface it as a plain
    // address instead of a "sites" table.
    fields.push(["Địa chỉ", client.locations[0]?.address ?? "—"]);
  }
  if (client.note) fields.push(["Ghi chú", client.note]);

  return (
    <>
      <Link
        href="/clients"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Quay lại danh sách
      </Link>
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{client.name}</CardTitle>
              <Badge variant={isCompany ? "secondary" : "outline"}>
                {clientType[client.type]}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {fields.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="text-sm">{value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        {isCompany && (
          <Card className="gap-3">
            <CardHeader>
              <CardTitle className="text-base">
                Địa điểm ({client.locations.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Tên</TableHead>
                    <TableHead>Địa chỉ</TableHead>
                    <TableHead className="pr-6">Người quản lý</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {client.locations.map((location) => (
                    <TableRow key={location.id}>
                      <TableCell className="pl-6 font-medium">
                        {location.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {location.address}
                      </TableCell>
                      <TableCell className="pr-6 text-muted-foreground">
                        {managerName(location.manager_contact_id)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <Card className="gap-3">
          <CardHeader>
            <CardTitle className="text-base">
              Liên hệ ({client.contacts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Tên</TableHead>
                  <TableHead>Số điện thoại</TableHead>
                  <TableHead>Chức vụ</TableHead>
                  {isCompany && (
                    <TableHead className="pr-6">Quản lý địa điểm</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {client.contacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell className="pl-6 font-medium">
                      {contact.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {contact.phone ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {contact.title ?? "—"}
                    </TableCell>
                    {isCompany && (
                      <TableCell className="pr-6 text-muted-foreground">
                        {managedLocations(contact.id) || "—"}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
