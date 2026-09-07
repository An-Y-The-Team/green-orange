import { BackLink } from "@/components/back-link/back-link";
import { PageHeader } from "@/components/page-header/page-header";
import { BACK_TO } from "@/constants/labels";

import { TemplateEditor } from "../template-editor/template-editor";

export default function NewContractTemplatePage() {
  return (
    <>
      <BackLink href="/contracts/templates">{BACK_TO.templates}</BackLink>
      <PageHeader
        title="Mẫu hợp đồng mới"
        description="Soạn nội dung và chèn các trường dữ liệu sẽ được điền tự động."
      />
      <TemplateEditor />
    </>
  );
}
