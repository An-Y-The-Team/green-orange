import { ArrowLeft, Plus } from "lucide-react";
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

import { listContractTemplates } from "../queries";

export default async function ContractTemplatesPage() {
  const templates = await listContractTemplates();

  return (
    <>
      <Link
        href="/contracts"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Quay lại hợp đồng
      </Link>
      <PageHeader
        title="Mẫu hợp đồng"
        description={`${templates.length} mẫu · dùng khi tạo hợp đồng`}
        action={
          <Button size="sm" render={<Link href="/contracts/templates/new" />}>
            <Plus />
            Tạo mẫu
          </Button>
        }
      />
      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên mẫu</TableHead>
              <TableHead>Tiêu đề tài liệu</TableHead>
              <TableHead>Trạng thái</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map((template) => (
              <TableRow key={template.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/contracts/templates/${template.id}/edit`}
                    className="hover:underline"
                  >
                    {template.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {template.doc_title}
                </TableCell>
                <TableCell>
                  <Badge variant={template.is_active ? "success" : "secondary"}>
                    {template.is_active ? "Đang dùng" : "Ẩn"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
