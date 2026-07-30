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
        {/* Never render `error.message`: in a production build Next replaces
            server-component messages with an English digest string, so the
            Vietnamese fallback was unreachable exactly where it mattered. The
            digest is the only part worth surfacing — it ties a user report to
            the server log. */}
        <p className="text-sm text-muted-foreground">
          Không tải được dữ liệu. Thử lại, hoặc tải lại trang nếu bạn đã bị đăng
          xuất.
        </p>
        {error.digest ? (
          <p className="text-xs text-muted-foreground">
            Mã lỗi: {error.digest}
          </p>
        ) : null}
        <Button size="sm" onClick={reset}>
          Thử lại
        </Button>
      </Card>
    </>
  );
}
