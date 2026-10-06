"use client";

import { FileCheck2, Printer } from "lucide-react";
import Link from "next/link";
import { useActionState, useState, useTransition } from "react";

import { useServerAction } from "@yan/shared/hooks/use-server-actions";
import { Badge } from "@yan/ui/components/badge";
import { Button } from "@yan/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@yan/ui/components/dialog";
import { Label } from "@yan/ui/components/label";
import { Textarea } from "@yan/ui/components/textarea";

import { AttachmentList } from "@/components/attachments/attachment-list/attachment-list";
import { AttachmentKind } from "@/components/attachments/enums";
import type { Attachment } from "@/components/attachments/types";
import { ConfirmAction } from "@/components/confirm-action/confirm-action";
import { ACCEPTANCE_SUB_STATUSES, ACTIONS } from "@/constants/labels";
import {
  ACTION_TOAST_TITLES,
  INITIAL_ACTION_STATE,
} from "@/constants/server-action";
import { formatDate } from "@/utils/format-date/format-date";
import { labelOf } from "@/utils/label-of/label-of";

import { updateProject } from "../../../../actions/update-project";
import { updateProjectWithNote } from "../../../../actions/update-project-with-note";
import { AcceptanceSubStatus, GateKey, ProjectStage } from "../../../../enums";
import type { Project } from "../../../../types";
import { gateButtonProps } from "../../../utils/gate-button-props/gate-button-props";
import type { StageGate } from "../../../utils/stage-gates/stage-gates";
import {
  type GateActions,
  GateChecklist,
} from "../../gate-checklist/gate-checklist";
import { StageCard } from "../../stage-card/stage-card";

// Sub-status progress line: Gửi yêu cầu → Nghiệm thu ⇄ Bổ sung → Đạt.
// rework is the ⇄ branch off inspecting, so it renders inline with it.
const PROGRESS: AcceptanceSubStatus[] = Object.values(AcceptanceSubStatus);

// Notes tagged as acceptance events (only "rework" is produced by this panel).
const ACCEPTANCE_TAGS = new Set(["rework"]);

export function AcceptancePanel({
  project,
  attachments,
  gates,
}: {
  project: Project;
  attachments: Attachment[];
  gates: StageGate[];
}) {
  // Entering stage 6 already set request_sent; guard the null just in case.
  const sub = project.acceptance_sub_status ?? AcceptanceSubStatus.REQUEST_SENT;
  const passed = sub === AcceptanceSubStatus.PASSED;

  // Simple transitions (hẹn lịch → inspecting, bổ sung xong → inspecting,
  // Đạt → passed). Server stamps acceptance_passed_date on the passed hop.
  const [statusState, statusAction] = useActionState(
    updateProject.bind(null, project.id),
    INITIAL_ACTION_STATE
  );
  const [statusPending, startStatus] = useTransition();
  useServerAction(statusState, statusPending, ACTION_TOAST_TITLES);
  const setStatus = (next: AcceptanceSubStatus) =>
    startStatus(() => statusAction({ acceptance_sub_status: next }));

  // Rework: note (what the client found, required) THEN status → rework.
  const [reworkOpen, setReworkOpen] = useState(false);
  const [reworkBody, setReworkBody] = useState("");
  // One action, not a note action chained into a status action: the note is the
  // reason for the rework, so it goes first, and a failing status change now
  // says the note was already saved instead of inviting a duplicate retry.
  const [reworkState, reworkAction] = useActionState(
    updateProjectWithNote.bind(null, project.id),
    INITIAL_ACTION_STATE
  );
  const [reworkPending, startRework] = useTransition();
  useServerAction(reworkState, reworkPending, {
    ...ACTION_TOAST_TITLES,
    onSuccess: () => {
      setReworkOpen(false);
      setReworkBody("");
    },
  });

  const history = (project.notes ?? [])
    .filter((n) => n.tag && ACCEPTANCE_TAGS.has(n.tag))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  const label = labelOf(ACCEPTANCE_SUB_STATUSES, sub);

  const defects = attachments.filter(
    (a) => a.kind === AttachmentKind.DEFECT_IMAGE
  );

  // Đạt is only a real choice while the inspection is underway; before the
  // schedule or during rework the body's transition buttons do the work.
  const actions: GateActions =
    sub === AcceptanceSubStatus.INSPECTING
      ? {
          [GateKey.ACCEPTANCE_PASSED]: (primary) => (
            <ConfirmAction
              trigger={
                <Button {...gateButtonProps(primary)} disabled={statusPending}>
                  <FileCheck2 className="size-4" />✓ Đạt — ký BB
                </Button>
              }
              title="Nghiệm thu đạt?"
              consequence="Ghi nhận nghiệm thu đạt hôm nay và mở Quyết toán & Thanh toán. Đây là trạng thái cuối của Nghiệm thu — muốn quay lại Bổ sung phải lùi giai đoạn thủ công."
              confirmLabel="Nghiệm thu đạt"
              pending={statusPending}
              onConfirm={() => setStatus(AcceptanceSubStatus.PASSED)}
            />
          ),
        }
      : {};

  return (
    <StageCard
      stage={ProjectStage.ACCEPTANCE}
      contentClassName="space-y-5"
      aside={<Badge variant={label.variant}>{label.label}</Badge>}
      footer={
        <>
          <Button
            variant="outline"
            render={
              <Link
                href={`/projects/${project.id}/print/acceptance-request`}
                target="_blank"
              >
                <Printer className="size-4" />
                In thư yêu cầu nghiệm thu
              </Link>
            }
          />
          <Button
            variant="outline"
            render={
              <Link
                href={`/projects/${project.id}/print/acceptance-request?to=building`}
                target="_blank"
              >
                <Printer className="size-4" />
                In thư gửi BQL tòa nhà
              </Link>
            }
          />
        </>
      }
    >
      <GateChecklist
        stage={ProjectStage.ACCEPTANCE}
        gates={gates}
        actions={actions}
      />
      {/* Progress line */}
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        {PROGRESS.map((s, i) => (
          <li key={s} className="flex items-center gap-2">
            {i > 0 ? (
              <span aria-hidden className="text-muted-foreground">
                {s === AcceptanceSubStatus.REWORK ? "⇄" : "→"}
              </span>
            ) : null}
            <span
              className={
                s === sub
                  ? "font-medium text-foreground"
                  : "text-muted-foreground"
              }
            >
              {labelOf(ACCEPTANCE_SUB_STATUSES, s).label}
            </span>
          </li>
        ))}
      </ol>

      {/* Transition buttons driven by current sub-status */}
      <div className="flex flex-wrap gap-2">
        {sub === AcceptanceSubStatus.REQUEST_SENT ? (
          <Button
            variant="outline"
            size="sm"
            disabled={statusPending}
            onClick={() => setStatus(AcceptanceSubStatus.INSPECTING)}
          >
            Khách đã hẹn lịch
          </Button>
        ) : null}

        {sub === AcceptanceSubStatus.INSPECTING ? (
          <>
            <Dialog open={reworkOpen} onOpenChange={setReworkOpen}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReworkOpen(true)}
              >
                Khách báo lỗi → Bổ sung
              </Button>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Khách báo lỗi cần bổ sung</DialogTitle>
                </DialogHeader>
                <div className="space-y-1.5">
                  <Label htmlFor="rework-note">
                    Khách phản ánh gì (bắt buộc)
                  </Label>
                  <Textarea
                    id="rework-note"
                    rows={3}
                    value={reworkBody}
                    placeholder="VD: ố kính tầng 15, còn bụi khu vực sảnh…"
                    onChange={(e) => setReworkBody(e.target.value)}
                  />
                </div>
                <DialogFooter>
                  <DialogClose
                    render={<Button variant="outline">{ACTIONS.close}</Button>}
                  />
                  <Button
                    disabled={reworkPending || !reworkBody.trim()}
                    onClick={() =>
                      startRework(() =>
                        reworkAction({
                          noteFirst: true,
                          note: { body: reworkBody.trim(), tag: "rework" },
                          patch: {
                            acceptance_sub_status: AcceptanceSubStatus.REWORK,
                          },
                        })
                      )
                    }
                  >
                    Chuyển sang Bổ sung
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        ) : null}

        {sub === AcceptanceSubStatus.REWORK ? (
          <Button
            variant="outline"
            size="sm"
            disabled={statusPending}
            onClick={() => setStatus(AcceptanceSubStatus.INSPECTING)}
          >
            Bổ sung xong — nghiệm thu lại
          </Button>
        ) : null}

        {passed && project.acceptance_passed_date ? (
          <span className="flex items-center text-sm text-muted-foreground">
            Nghiệm thu đạt {formatDate(project.acceptance_passed_date)}
          </span>
        ) : null}
      </div>

      {/* Photos of what the client wants fixed — optional. Shown during Bổ
          sung, and kept afterwards once any exist so the crew can still
          compare against them at the re-inspection. */}
      {sub === AcceptanceSubStatus.REWORK || defects.length > 0 ? (
        <div className="rounded-lg border p-3">
          <AttachmentList
            owner={{ project_id: project.id }}
            kind={AttachmentKind.DEFECT_IMAGE}
            initial={defects}
            title="Ảnh lỗi cần sửa (tùy chọn)"
            emptyMessage="Chưa có ảnh lỗi."
            withNote
            uploadLabel="Ảnh lỗi cần sửa"
          />
        </div>
      ) : null}

      {/* Signed biên bản — optional, attachable whenever it arrives (the
          client may sign before or after the Đạt click). Never gates Đạt. */}
      <AcceptanceReport project={project} attachments={attachments} />

      {/* Lịch sử — rework/acceptance notes, newest first */}
      {history.length > 0 ? (
        <section className="space-y-2">
          <h3 className="text-sm font-medium">Lịch sử</h3>
          <ul className="space-y-1.5 text-sm">
            {history.map((n) => (
              <li key={n.id} className="flex gap-2">
                <span className="shrink-0 text-muted-foreground">
                  {formatDate(n.created_at)}
                </span>
                <span>{n.body}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </StageCard>
  );
}

// The signed biên bản — kind acceptance_report, open from request_sent on. A list, not
// a bare uploader: this is the document the job is closed on, so it has to be
// re-readable and replaceable after it goes up.
function AcceptanceReport({
  project,
  attachments,
}: {
  project: Project;
  attachments: Attachment[];
}) {
  return (
    <div className="rounded-lg border p-3">
      <AttachmentList
        owner={{ project_id: project.id }}
        kind={AttachmentKind.ACCEPTANCE_REPORT}
        initial={attachments.filter(
          (a) => a.kind === AttachmentKind.ACCEPTANCE_REPORT
        )}
        title="Biên bản nghiệm thu đã ký"
        emptyMessage="Chưa đính kèm biên bản đã ký."
        uploadLabel="Biên bản nghiệm thu đã ký"
      />
    </div>
  );
}
