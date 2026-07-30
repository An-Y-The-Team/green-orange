import { PageHeader } from "@/components/page-header/page-header";
import { TableSkeleton } from "@/components/table-skeleton/table-skeleton";

export default function ProjectsLoading() {
  return (
    <>
      <PageHeader title="Công trình" />
      <TableSkeleton columns={9} />
    </>
  );
}
