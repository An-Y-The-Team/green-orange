"use client";

import { Button } from "@yan/ui/components/button";

import { AttachmentList } from "@/components/attachments/attachment-list/attachment-list";
import { AttachmentKind } from "@/components/attachments/enums";
import type { Attachment } from "@/components/attachments/types";
import { ConfirmAction } from "@/components/confirm-action/confirm-action";

import {
  AcceptanceNoteTag,
  AcceptanceSubStatus,
} from "../../../../../../enums";
import type { Project } from "../../../../../../types";
import { gateButtonProps } from "../../../../../utils/gate-button-props/gate-button-props";
import { useAcceptanceAction } from "../../hooks/use-acceptance-action/use-acceptance-action";

/** Bước 3: signed minutes (optional) and the closing click. */
export function SignStep({
  project,
  attachments,
}: {
  project: Project;
  attachments: Attachment[];
}) {
  const { run, pending } = useAcceptanceAction({ projectId: project.id });
  const reports = attachments.filter(
    (a) => a.kind === AttachmentKind.ACCEPTANCE_REPORT
  );

  // Stamps the passed date server-side and opens Quyết toán & Thanh toán.
  const handleComplete = () =>
    run({
      patch: { acceptance_sub_status: AcceptanceSubStatus.PASSED },
      note: {
        tag: AcceptanceNoteTag.COMPLETED,
        body: "Hoàn tất nghiệm thu",
      },
    });

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Cho khách ký biên bản nghiệm thu, chụp lại và tải lên đây. Rồi bấm hoàn
        tất.
      </p>
      <AttachmentList
        owner={{ project_id: project.id }}
        kind={AttachmentKind.ACCEPTANCE_REPORT}
        initial={reports}
        title="Biên bản nghiệm thu đã ký"
        emptyMessage="Chưa đính kèm biên bản đã ký (nên có, không bắt buộc)."
        uploadLabel="Biên bản nghiệm thu đã ký"
      />
      <ConfirmAction
        trigger={
          <Button {...gateButtonProps(true)} disabled={pending}>
            Hoàn tất nghiệm thu
          </Button>
        }
        title="Hoàn tất nghiệm thu?"
        consequence="Ghi nhận nghiệm thu đạt hôm nay. Công trình sẽ chuyển sang Quyết toán & Thanh toán. Muốn quay lại sau khi hoàn tất phải dùng “Chuyển giai đoạn…” trong menu Khác."
        confirmLabel="Hoàn tất nghiệm thu"
        pending={pending}
        onConfirm={handleComplete}
      >
        {reports.length === 0 ? (
          <p className="rounded-lg bg-waiting-soft p-3 text-sm text-waiting">
            Chưa có biên bản đã ký. Vẫn hoàn tất được, nhớ bổ sung sau trong “In
            thư · Giấy tờ · Lịch sử”.
          </p>
        ) : null}
      </ConfirmAction>
      <p className="text-sm text-muted-foreground">
        Hoàn tất → công trình sang Quyết toán & Thanh toán.
      </p>
    </div>
  );
}
