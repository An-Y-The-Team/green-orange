import { notFound } from "next/navigation";

import { BackLink } from "@/components/back-link/back-link";
import { PageHeader } from "@/components/page-header/page-header";
import { BACK_TO } from "@/constants/labels";

import { getContractTemplate } from "../../../queries";
import { TemplateEditor } from "../../template-editor/template-editor";

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
      <BackLink href="/contracts/templates">{BACK_TO.templates}</BackLink>
      <PageHeader title="Chỉnh sửa mẫu hợp đồng" description={template.name} />
      <TemplateEditor template={template} />
    </>
  );
}
