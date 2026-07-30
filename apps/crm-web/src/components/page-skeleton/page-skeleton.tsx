import { Card } from "@yan/ui/components/card";
import { Skeleton } from "@yan/ui/components/skeleton";

/**
 * Generic cold-load placeholder — a title block plus a content card. Used by the
 * group-level `loading.tsx` for routes that aren't a single table (detail pages,
 * forms, the tabbed crew/receivables pages).
 */
export function PageSkeleton() {
  return (
    <>
      <div className="mb-6 space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Card className="space-y-4 p-6">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
        <Skeleton className="h-4 w-3/6" />
      </Card>
    </>
  );
}
