import { Card, CardContent, CardHeader } from "@yan/ui/components/card";
import { Skeleton } from "@yan/ui/components/skeleton";

const FIELD_COUNT = 4;
const ROW_COUNT = 4;

// Hồ sơ nhân sự awaits the member plus a 90-day timekeeping window: a member
// card over two record tables. The nearest boundary is crew/loading.tsx, which
// draws the roster tab strip and its six-column list — the wrong page entirely.
export default function CrewDetailLoading() {
  return (
    <>
      <Skeleton className="mb-4 h-5 w-40" />

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-5 w-20" />
              </div>
              <Skeleton className="h-8 w-28" />
            </div>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {Array.from({ length: FIELD_COUNT }, (_, field) => (
                <div key={field} className="space-y-1.5">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-4 w-36" />
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        {/* Phân công + Chấm công: a heading over table rows inside the card. */}
        {Array.from({ length: 2 }, (_, section) => (
          <Card key={section} className="gap-3 py-4">
            <CardHeader>
              <Skeleton className="h-5 w-56" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: ROW_COUNT }, (_, row) => (
                <Skeleton key={row} className="h-8 w-full" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
