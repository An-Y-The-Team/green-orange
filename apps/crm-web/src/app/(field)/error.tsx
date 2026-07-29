"use client";

import { Button } from "@yan/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@yan/ui/components/card";

/**
 * Group-level error boundary, the (field) twin of (dashboard)/error.tsx. Needed
 * now that reads rethrow a backend outage instead of degrading to an empty list
 * (see apiFetchSafe) — without it a dead backend blanks the whole phone screen.
 *
 * Never renders `error.message`: Next replaces server-component messages with an
 * English digest in production builds, so the copy has to be ours.
 */
export default function FieldError({ reset }: { reset: () => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Đã xảy ra lỗi</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Không tải được dữ liệu. Kiểm tra kết nối rồi thử lại.
        </p>
        <Button className="w-full" size="lg" onClick={reset}>
          Thử lại
        </Button>
      </CardContent>
    </Card>
  );
}
