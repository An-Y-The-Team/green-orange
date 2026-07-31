import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { CompanyEditor } from "./company-editor/company-editor";
import { getCompany } from "./queries";

// Company profile authoring — the letterhead printed on every A4 document plus
// the Bên B details merge tokens and signature defaults read.
export default async function CompanySettingsPage() {
  const company = await getCompany();

  return (
    <>
      <Link
        href="/settings"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Quay lại danh mục
      </Link>

      <h1 className="mb-4 text-xl font-semibold">Thông tin công ty</h1>

      <CompanyEditor company={company} />
    </>
  );
}
