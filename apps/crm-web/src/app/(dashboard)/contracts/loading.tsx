import { PageHeader } from "@/components/page-header/page-header";
import { TableSkeleton } from "@/components/table-skeleton/table-skeleton";

export default function ContractsLoading() {
  return (
    <>
      <PageHeader title="Hợp đồng" />
      <TableSkeleton columns={6} />
    </>
  );
}
