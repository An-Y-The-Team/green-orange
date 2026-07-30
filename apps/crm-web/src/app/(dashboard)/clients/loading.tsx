import { PageHeader } from "@/components/page-header/page-header";
import { TableSkeleton } from "@/components/table-skeleton/table-skeleton";

export default function ClientsLoading() {
  return (
    <>
      <PageHeader title="Khách hàng" />
      <TableSkeleton columns={6} />
    </>
  );
}
