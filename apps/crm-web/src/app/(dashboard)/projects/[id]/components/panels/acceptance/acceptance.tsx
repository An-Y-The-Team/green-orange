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
import { Input } from "@yan/ui/components/input";
import { Label } from "@yan/ui/components/label";
import { Textarea } from "@yan/ui/components/textarea";

import { ACCEPTANCE_SUB_STATUSES, ACTIONS } from "@/constants/labels";
import {
  ACTION_TOAST_TITLES,
  INITIAL_ACTION_STATE,
} from "@/constants/server-action";
import { formatDate } from "@/utils/format-date/format-date";
import { labelOf } from "@/utils/label-of/label-of";

import { addNote } from "../../../../actions/add-note";
import { addAttachment } from "../../../../actions/attachments";
import { updateProject } from "../../../../actions/update-project";
import { AcceptanceSubStatus, AttachmentKind } from "../../../../enums";
import type { Project } from "../../../../types";
import { StageCard } from "../../stage-card/stage-card";

// Sub-status progress line: Gửi yêu cầu → Nghiệm thu ⇄ Bổ sung → Đạt.
// rework is the ⇄ branch off inspecting, so it renders inline with it.
const PROGRESS: AcceptanceSubStatus[] = [
  AcceptanceSubStatus.REQUEST_SENT,
  AcceptanceSubStatus.INSPECTING,
  AcceptanceSubStatus.REWORK,
  AcceptanceSubStatus.PASSED,
];

// Notes tagged as acceptance events (only "rework" is produced by this panel).
const ACCEPTANCE_TAGS = new Set(["rework"]);

export function AcceptancePanel({ project }: { project: Project }) {
  // Entering stage 7 already set request_sent; guard the null just in case.
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
  const [noteState, noteAction] = useActionState(
    addNote.bind(null, project.id),
    INITIAL_ACTION_STATE
  );
  const [reworkStatusState, reworkStatusAction] = useActionState(
    updateProject.bind(null, project.id),
    INITIAL_ACTION_STATE
  );
  const [reworkPending, startRework] = useTransition();
  // Note toast is silent — the status update below is the user-facing confirm.
  useServerAction(noteState, reworkPending, {
    ...ACTION_TOAST_TITLES,
    silent: true,
    onSuccess: () =>
      startRework(() =>
        reworkStatusAction({
          acceptance_sub_status: AcceptanceSubStatus.REWORK,
        })
      ),
  });
  useServerAction(reworkStatusState, reworkPending, {
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

  return (
    <StageCard
      project={project}
      contentClassName="space-y-5"
      aside={<Badge variant={label.variant}>{label.label}</Badge>}
    >
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
            disabled={statusPending}
            onClick={() => setStatus(AcceptanceSubStatus.INSPECTING)}
          >
            Khách đã hẹn lịch
          </Button>
        ) : null}

        {sub === AcceptanceSubStatus.INSPECTING ? (
          <>
            <Dialog open={reworkOpen} onOpenChange={setReworkOpen}>
              <Button variant="outline" onClick={() => setReworkOpen(true)}>
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
                    render={<Button variant="ghost">{ACTIONS.close}</Button>}
                  />
                  <Button
                    disabled={reworkPending || !reworkBody.trim()}
                    onClick={() =>
                      startRework(() =>
                        noteAction({ body: reworkBody.trim(), tag: "rework" })
                      )
                    }
                  >
                    Chuyển sang Bổ sung
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button
              disabled={statusPending}
              onClick={() => setStatus(AcceptanceSubStatus.PASSED)}
            >
              <FileCheck2 className="size-4" />✓ Đạt — ký BB
            </Button>
          </>
        ) : null}

        {sub === AcceptanceSubStatus.REWORK ? (
          <Button
            variant="outline"
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

      {/* Signed biên bản — optional attachment once passed */}
      {passed ? <AcceptanceReport projectId={project.id} /> : null}

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
    </StageCard>
  );
}

// Attach the signed biên bản (metadata only) after Đạt — kind acceptance_report.
function AcceptanceReport({ projectId }: { projectId: number }) {
  const [state, formAction] = useActionState(
    addAttachment.bind(null, projectId),
    INITIAL_ACTION_STATE
  );
  const [isPending, startTransition] = useTransition();
  const [filename, setFilename] = useState("");
  useServerAction(state, isPending, {
    ...ACTION_TOAST_TITLES,
    onSuccess: () => setFilename(""),
  });

  return (
    <div className="flex items-end gap-2 rounded-lg border p-3">
      <div className="flex-1 space-y-1.5">
        <Label htmlFor="acceptance-report">Biên bản nghiệm thu (tên tệp)</Label>
        <Input
          id="acceptance-report"
          value={filename}
          placeholder="bien-ban-nghiem-thu.pdf"
          disabled={isPending}
          onChange={(e) => setFilename(e.target.value)}
        />
      </div>
      <Button
        variant="outline"
        disabled={isPending || !filename.trim()}
        onClick={() =>
          startTransition(() =>
            formAction({
              kind: AttachmentKind.ACCEPTANCE_REPORT,
              filename: filename.trim(),
            })
          )
        }
      >
        Đính kèm
      </Button>
    </div>
  );
}
