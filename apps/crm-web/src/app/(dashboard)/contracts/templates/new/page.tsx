import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/page-header/page-header";
import { BACK_TO } from "@/constants/labels";

import { TemplateEditor } from "../template-editor/template-editor";

export default function NewContractTemplatePage() {
  return (
    <>
      <Link
        href="/contracts/templates"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {BACK_TO.templates}
      </Link>
      <PageHeader
        title="Mẫu hợp đồng mới"
        description="Soạn nội dung và chèn các trường dữ liệu sẽ được điền tự động."
      />
      <TemplateEditor />
    </>
  );
}
