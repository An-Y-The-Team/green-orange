import { Card, CardContent, CardHeader } from "@yan/ui/components/card";
import { Skeleton } from "@yan/ui/components/skeleton";

const STAGE_COUNT = 9;

// The workspace awaits loadProject plus quotes, contracts, settlements, bills,
// milestones, crew and timekeeping — the slowest route in the app. Without this
// the nearest boundary is projects/loading.tsx, which shows a list table.
export default function ProjectWorkspaceLoading() {
  return (
    <>
      <Skeleton className="mb-4 h-5 w-40" />

      <Card className="mb-4">
        <CardHeader className="space-y-2">
          <Skeleton className="h-6 w-72" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
      </Card>

      <div className="mb-4 flex flex-wrap gap-2">
        {Array.from({ length: STAGE_COUNT }, (_, i) => (
          <Skeleton key={i} className="h-7 w-24" />
        ))}
      </div>

      <Card>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
          <Skeleton className="h-4 w-3/6" />
        </CardContent>
      </Card>
    </>
  );
}
