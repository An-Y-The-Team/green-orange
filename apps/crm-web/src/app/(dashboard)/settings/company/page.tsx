import { PageHeader } from "@/components/page-header/page-header";

import { CompanyEditor } from "./company-editor/company-editor";
import { getCompany } from "./queries";

// Company profile authoring — the letterhead printed on every A4 document plus
// the Bên B details merge tokens and signature defaults read. Its own nav
// destination, not a sub-page of Danh mục.
export default async function CompanySettingsPage() {
  const company = await getCompany();

  return (
    <>
      <PageHeader
        title="Thông tin công ty"
        description="Đầu trang tài liệu (letterhead) & thông tin Bên B của công ty."
      />

      <CompanyEditor company={company} />
    </>
  );
}
