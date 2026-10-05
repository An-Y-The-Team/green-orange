import { Card, CardContent, CardHeader } from "@yan/ui/components/card";
import { Skeleton } from "@yan/ui/components/skeleton";

import { PROJECT_STAGE_ORDER } from "@/constants/labels";

const STAGE_COUNT = PROJECT_STAGE_ORDER.length;

// The workspace awaits loadProject plus quotes, contracts, settlements, bills,
// milestones, crew and timekeeping — the slowest route in the app. Without this
// the nearest boundary is projects/loading.tsx, which shows a list table.
// Same three panes as page.tsx: stage nav | the viewed stage | context.
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

      <div className="grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)_18rem]">
        {/* Stage nav: a chip row below lg, a vertical list from lg up. */}
        <div className="flex gap-2 overflow-hidden lg:flex-col">
          {Array.from({ length: STAGE_COUNT }, (_, i) => (
            <Skeleton key={i} className="h-8 w-24 shrink-0 lg:w-full" />
          ))}
        </div>

        <Card>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-40" />
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    </>
  );
}
