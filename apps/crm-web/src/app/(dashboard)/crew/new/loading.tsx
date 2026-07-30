import { Card, CardContent } from "@yan/ui/components/card";
import { Skeleton } from "@yan/ui/components/skeleton";

import { PageHeader } from "@/components/page-header/page-header";

// CrewForm fields: họ và tên, điện thoại, hình thức, vai trò, trạng thái.
const FIELD_COUNT = 5;

// Thêm nhân sự awaits the role list before its form renders. The nearest
// boundary is crew/loading.tsx, which draws the roster tab strip and table —
// a list, on a create form.
export default function NewCrewMemberLoading() {
  return (
    <>
      <Skeleton className="mb-4 h-5 w-40" />
      <PageHeader title="Thêm nhân sự" />

      <div className="max-w-2xl space-y-6">
        <Card>
          <CardContent className="space-y-4">
            {Array.from({ length: FIELD_COUNT }, (_, field) => (
              <div key={field} className="space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
            {/* Ghi chú is a 3-row textarea. */}
            <div className="space-y-1">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-16 w-full" />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
    </>
  );
}
