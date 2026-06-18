import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";

import { TemplateEditor } from "../template-editor";

export default function NewContractTemplatePage() {
  return (
    <>
      <Link
        href="/contracts/templates"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Quay lại danh sách mẫu
      </Link>
      <PageHeader
        title="Mẫu hợp đồng mới"
        description="Soạn nội dung và chèn các trường dữ liệu sẽ được điền tự động."
      />
      <TemplateEditor />
    </>
  );
}
