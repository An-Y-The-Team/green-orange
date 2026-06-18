import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";

import { getContractTemplate } from "../../../queries";
import { TemplateEditor } from "../../template-editor";

export default async function EditContractTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const template = await getContractTemplate(Number(id));

  if (!template) {
    notFound();
  }

  return (
    <>
      <Link
        href="/contracts/templates"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Quay lại danh sách mẫu
      </Link>
      <PageHeader title="Chỉnh sửa mẫu hợp đồng" description={template.name} />
      <TemplateEditor template={template} />
    </>
  );
}
