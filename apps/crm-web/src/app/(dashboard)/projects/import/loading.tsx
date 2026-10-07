import { PageHeader } from "@/components/page-header/page-header";
import { TableSkeleton } from "@/components/table-skeleton/table-skeleton";

export default function ImportProjectsLoading() {
  return (
    <>
      <PageHeader title="Nhập từ báo giá" />
      <TableSkeleton columns={3} />
    </>
  );
}
