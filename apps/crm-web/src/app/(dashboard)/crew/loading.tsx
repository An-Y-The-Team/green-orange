import { Skeleton } from "@yan/ui/components/skeleton";

import { PageHeader } from "@/components/page-header/page-header";
import { TableSkeleton } from "@/components/table-skeleton/table-skeleton";
import { FIELDS } from "@/constants/labels";

const TAB_COUNT = 3;

// Nhân sự opens on the Danh sách tab, so the roster table is what to placeholder.
// The tab strip is included so the table doesn't jump down when it arrives.
export default function CrewLoading() {
  return (
    <>
      <PageHeader title={FIELDS.crew} />
      <div className="mb-4 flex gap-1 border-b pb-2">
        {Array.from({ length: TAB_COUNT }, (_, i) => (
          <Skeleton key={i} className="h-5 w-20" />
        ))}
      </div>
      <TableSkeleton columns={6} />
    </>
  );
}
