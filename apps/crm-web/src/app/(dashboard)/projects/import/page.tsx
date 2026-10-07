import { BackLink } from "@/components/back-link/back-link";
import { PageHeader } from "@/components/page-header/page-header";
import { BACK_TO } from "@/constants/labels";

import { listProjectTypes } from "../queries";
import { ImportWorkbooks } from "./components/import-workbooks/import-workbooks";

// "Công trình mới từ Bảng Báo Giá" — the operator's own Excel workbooks become
// công trình, matched to the clients already on file.
export default async function ImportProjectsPage() {
  const projectTypes = await listProjectTypes();

  return (
    <>
      <BackLink href="/projects">{BACK_TO.projects}</BackLink>
      <PageHeader
        title="Nhập từ báo giá"
        description="Mỗi file Báo giá thành một công trình — khách hàng, địa điểm, báo giá (và quyết toán nếu có) điền sẵn từ file."
      />
      <ImportWorkbooks projectTypes={projectTypes} />
    </>
  );
}
