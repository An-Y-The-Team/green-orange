import { Skeleton } from "@yan/ui/components/skeleton";

import { PageHeader } from "@/components/page-header/page-header";
import { TableSkeleton } from "@/components/table-skeleton/table-skeleton";
import { FIELDS } from "@/constants/labels";

// Same Card > Table shape as the inherited contracts/loading.tsx, but this list
// has three columns, its own title and a back link — the inherited fallback says
// "Hợp đồng" over six columns, which reads as the wrong page.
export default function ContractTemplatesLoading() {
  return (
    <>
      <Skeleton className="mb-4 h-5 w-40" />
      <PageHeader
        title={FIELDS.contractTemplate}
        description="dùng khi tạo hợp đồng"
        action={<Skeleton className="h-8 w-24" />}
      />
      <TableSkeleton columns={3} />
    </>
  );
}
