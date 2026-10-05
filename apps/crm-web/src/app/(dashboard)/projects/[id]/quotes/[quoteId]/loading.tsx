import { PageHeader } from "@/components/page-header/page-header";
import { TableSkeleton } from "@/components/table-skeleton/table-skeleton";

// The quote's line grid — not the three-pane workspace skeleton that
// projects/[id]/loading.tsx would otherwise show while a document opens.
export default function ProjectQuoteLoading() {
  return (
    <>
      <PageHeader title="Báo giá" />
      <TableSkeleton columns={6} />
    </>
  );
}
