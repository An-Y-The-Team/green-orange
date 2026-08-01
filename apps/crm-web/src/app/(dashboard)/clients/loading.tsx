import { PageHeader } from "@/components/page-header/page-header";
import { TableSkeleton } from "@/components/table-skeleton/table-skeleton";
import { FIELDS } from "@/constants/labels";

export default function ClientsLoading() {
  return (
    <>
      <PageHeader title={FIELDS.client} />
      <TableSkeleton columns={6} />
    </>
  );
}
