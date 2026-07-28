import { Card, CardContent, CardHeader } from "@yan/ui/components/card";
import { Skeleton } from "@yan/ui/components/skeleton";

import { PageHeader } from "@/components/page-header/page-header";

// Danh mục is a two-card grid, not a table — placeholder that shape so the real
// cards swap in without a layout jump.
export default function SettingsLoading() {
  return (
    <>
      <PageHeader
        title="Danh mục"
        description="Quản lý danh mục dùng chung của hệ thống."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {[0, 1].map((card) => (
          <Card key={card}>
            <CardHeader className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-5/6" />
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
