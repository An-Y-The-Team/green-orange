import { Card, CardContent } from "@yan/ui/components/card";
import { Skeleton } from "@yan/ui/components/skeleton";

import { PageHeader } from "@/components/page-header/page-header";

// Tạo hợp đồng awaits the project list to fill a single select, so only the
// picker card is unknown — the heading is static and rendered for real. Without
// this the nearest boundary is contracts/loading.tsx, a full list table.
export default function NewContractLoading() {
  return (
    <>
      <Skeleton className="mb-4 h-5 w-36" />
      <PageHeader title="Tạo hợp đồng" description="Chọn công trình để soạn" />
      <Card className="max-w-xl">
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="flex justify-end">
            <Skeleton className="h-9 w-24" />
          </div>
        </CardContent>
      </Card>
    </>
  );
}
