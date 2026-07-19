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

  const fields: [string, string][] = [
    ["Email", client.email],
    ["Số điện thoại", client.phone],
    ["Công ty", client.company],
    ["Ngày tạo", client.created_at],
  ];

  return (
    <>
      <Link
        href="/clients"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Quay lại danh sách
      </Link>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{client.name}</CardTitle>
            <Badge variant="secondary">{client.status}</Badge>
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
    </>
  );
}
