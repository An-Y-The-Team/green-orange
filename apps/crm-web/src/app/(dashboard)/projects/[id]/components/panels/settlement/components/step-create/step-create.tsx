import Link from "next/link";

import { Button } from "@yan/ui/components/button";

import type { Quote } from "@/app/(dashboard)/quotes/types";
import { EmptyState } from "@/components/empty-state/empty-state";

/** Bước 1: no quyết toán yet. One primary link into the form. */
export function StepCreate({
  projectId,
  dealQuote,
}: {
  projectId: number;
  dealQuote?: Quote;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Hạng mục lấy sẵn từ báo giá đã chốt. Chỉ cần sửa khối lượng thực tế và
        giảm giá nếu có.
      </p>
      <EmptyState
        message={
          dealQuote
            ? "Chưa có quyết toán. Quyết toán mới sẽ lấy hạng mục từ báo giá đã chốt."
            : "Chưa có quyết toán."
        }
      />
      <Button
        render={
          <Link
            data-edit-link
            href={`/projects/${projectId}/settlements/new`}
          />
        }
      >
        Lập quyết toán
      </Button>
    </div>
  );
}
