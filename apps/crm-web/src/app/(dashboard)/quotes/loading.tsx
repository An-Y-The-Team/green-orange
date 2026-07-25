import { PageHeader } from "@/components/page-header/page-header";
import { TableSkeleton } from "@/components/table-skeleton/table-skeleton";

export default function QuotesLoading() {
  return (
    <>
      <PageHeader title="Báo giá" />
      <TableSkeleton columns={7} />
    </>
  );
}
