"use client";

import { Button } from "@yan/ui/components/button";
import { Card } from "@yan/ui/components/card";

import { PageHeader } from "@/components/page-header/page-header";

/**
 * Group-level error boundary. Most failures here are the crm-api being
 * unreachable or a dead session, so `reset()` (re-render the segment) is the
 * useful recovery — a reload after signing back in usually clears it.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <>
      <PageHeader title="Đã xảy ra lỗi" />
      <Card className="space-y-4 p-6">
        <p className="text-sm text-muted-foreground">
          {error.message || "Không tải được dữ liệu."}
        </p>
        <Button size="sm" onClick={reset}>
          Thử lại
        </Button>
      </Card>
    </>
  );
}
