import { Card, CardContent, CardHeader } from "@yan/ui/components/card";
import { Skeleton } from "@yan/ui/components/skeleton";

// The (field) group has no loading.tsx at any level, so this route had no
// fallback at all. Four stacked cards mirror the page: Hôm nay · Tiếp nhận yêu
// cầu · Chờ quyết định · Đang thi công.
const CARD_COUNT = 4;

export default function FieldLoading() {
  return (
    <div className="space-y-4">
      {Array.from({ length: CARD_COUNT }, (_, card) => (
        <Card key={card}>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
