import { PageHeader } from "@/components/page-header/page-header";
import { TableSkeleton } from "@/components/table-skeleton/table-skeleton";
import { FIELDS } from "@/constants/labels";

export default function ProjectsLoading() {
  return (
    <>
      <PageHeader title={FIELDS.project} />
      <TableSkeleton columns={9} />
    </>
  );
}
