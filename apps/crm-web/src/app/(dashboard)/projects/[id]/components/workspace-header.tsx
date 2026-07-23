"use client";

import { useActionState, useState, useTransition } from "react";

import {
  type ServerActionState,
  useServerAction,
} from "@yan/shared/hooks/use-server-actions";
import { Badge } from "@yan/ui/components/badge";
import { Button } from "@yan/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@yan/ui/components/dialog";
import { Input } from "@yan/ui/components/input";
import { Label } from "@yan/ui/components/label";
import { Textarea } from "@yan/ui/components/textarea";

import { formatDate } from "@/lib/format";
import { projectStage, projectStatus } from "@/lib/labels";

import {
  type UpdateProjectFormValues,
  updateProject,
} from "../../actions/update-project";
import { ProjectStatus } from "../../enums";
import type { Project } from "../../types";

export function WorkspaceHeader({ project }: { project: Project }) {
  const [state, formAction] = useActionState(
    updateProject.bind(null, project.id),
    { success: false } as ServerActionState
  );
  const [isPending, startTransition] = useTransition();
  useServerAction(state, isPending, {
    successToastTitle: "Thành công",
    errorToastTitle: "Lỗi",
  });

  const [holdOpen, setHoldOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [followUp, setFollowUp] = useState("");
  const [reason, setReason] = useState("");

  const run = (input: UpdateProjectFormValues) =>
    startTransition(() => formAction(input));

  const frozen =
    project.status === ProjectStatus.ON_HOLD ||
    project.status === ProjectStatus.CANCELLED;

  const contacts = [
    project.working_contact,
    project.decision_maker &&
    project.decision_maker.id !== project.working_contact?.id
      ? project.decision_maker
      : null,
  ].filter((c): c is NonNullable<typeof c> => Boolean(c));

  return (
    <div className="mb-6 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {project.code}
            </span>
            <h1 className="text-xl font-semibold">{project.name}</h1>
            <Badge variant={projectStatus[project.status].variant}>
              {projectStatus[project.status].label}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted-foreground">
            <span>{project.client?.name ?? `#${project.client_id}`}</span>
            {project.location ? (
              <>
                <span>·</span>
                <span>{project.location.name}</span>
              </>
            ) : null}
            {contacts.map((c) => (
              <span key={c.id}>
                {"· "}
                {c.name}
                {c.phone ? ` (${c.phone})` : ""}
              </span>
            ))}
            {project.types.map((t) => (
              <Badge key={t.id} variant="outline">
                {t.name}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {frozen ? (
            <Button
              variant="outline"
              disabled={isPending}
              onClick={() => run({ status: ProjectStatus.ACTIVE })}
            >
              Kích hoạt lại
            </Button>
          ) : (
            <>
              {/* Hoãn — pick a follow-up date */}
              <Dialog open={holdOpen} onOpenChange={setHoldOpen}>
                <Button variant="outline" onClick={() => setHoldOpen(true)}>
                  Hoãn
                </Button>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Hoãn công trình</DialogTitle>
                    <DialogDescription>
                      Chọn ngày liên hệ lại. Công trình sẽ được đóng băng ở giai
                      đoạn hiện tại.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-1.5">
                    <Label htmlFor="follow-up-date">Hẹn liên hệ lại</Label>
                    <Input
                      id="follow-up-date"
                      type="date"
                      value={followUp}
                      onChange={(e) => setFollowUp(e.target.value)}
                    />
                  </div>
                  <DialogFooter>
                    <DialogClose
                      render={<Button variant="ghost">Đóng</Button>}
                    />
                    <Button
                      disabled={isPending || !followUp}
                      onClick={() => {
                        run({
                          status: ProjectStatus.ON_HOLD,
                          follow_up_date: followUp,
                        });
                        setHoldOpen(false);
                      }}
                    >
                      Xác nhận hoãn
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Hủy — reason required */}
              <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
                <Button
                  variant="destructive"
                  onClick={() => setCancelOpen(true)}
                >
                  Hủy
                </Button>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Hủy công trình</DialogTitle>
                    <DialogDescription>
                      Nhập lý do hủy. Thao tác này đóng băng công trình.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-1.5">
                    <Label htmlFor="cancel-reason">Lý do hủy</Label>
                    <Textarea
                      id="cancel-reason"
                      rows={3}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </div>
                  <DialogFooter>
                    <DialogClose
                      render={<Button variant="ghost">Đóng</Button>}
                    />
                    <Button
                      variant="destructive"
                      disabled={isPending || !reason.trim()}
                      onClick={() => {
                        run({
                          status: ProjectStatus.CANCELLED,
                          cancel_reason: reason.trim(),
                        });
                        setCancelOpen(false);
                      }}
                    >
                      Xác nhận hủy
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      {frozen ? (
        <div className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-2 text-sm">
          <span className="font-medium">
            {projectStatus[project.status].label}
          </span>
          {" — đóng băng ở giai đoạn "}
          <span className="font-medium">
            {projectStage[project.stage].label}
          </span>
          {project.status === ProjectStatus.CANCELLED && project.cancel_reason
            ? `. Lý do: ${project.cancel_reason}`
            : null}
          {project.status === ProjectStatus.ON_HOLD && project.follow_up_date
            ? `. Hẹn liên hệ lại: ${formatDate(project.follow_up_date)}`
            : null}
        </div>
      ) : null}
    </div>
  );
}
