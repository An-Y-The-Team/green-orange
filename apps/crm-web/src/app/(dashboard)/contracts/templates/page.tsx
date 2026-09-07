import { Plus } from "lucide-react";
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

import { BackLink } from "@/components/back-link/back-link";
import { PageHeader } from "@/components/page-header/page-header";
import { BACK_TO, FIELDS } from "@/constants/labels";

import { listContractTemplates } from "../queries";

export default async function ContractTemplatesPage() {
  const templates = await listContractTemplates();

  return (
    <>
      <BackLink href="/contracts">{BACK_TO.contract}</BackLink>
      <PageHeader
        title={FIELDS.contractTemplate}
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
              <TableHead>{FIELDS.status}</TableHead>
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
