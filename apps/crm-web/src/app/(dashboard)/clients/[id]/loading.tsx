import { Card, CardContent, CardHeader } from "@yan/ui/components/card";
import { Skeleton } from "@yan/ui/components/skeleton";

const FIELD_COUNT = 4;
const ROW_COUNT = 2;

// Hồ sơ khách hàng is a stack of cards (thông tin, địa điểm, người liên hệ), not
// a table — without this the nearest boundary is clients/loading.tsx, which
// flashes the roster table on the way into a detail page.
export default function ClientDetailLoading() {
  return (
    <>
      <Skeleton className="mb-4 h-5 w-40" />

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-56" />
              <Skeleton className="h-5 w-24" />
            </div>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {Array.from({ length: FIELD_COUNT }, (_, field) => (
                <div key={field} className="space-y-1.5">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-4 w-40" />
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        {/* Địa điểm + Người liên hệ: same card with a heading over bordered rows. */}
        {Array.from({ length: 2 }, (_, section) => (
          <Card key={section} className="gap-3">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-8 w-20" />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {Array.from({ length: ROW_COUNT }, (_, row) => (
                <Skeleton key={row} className="h-11 w-full" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
