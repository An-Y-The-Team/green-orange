"use client";

import { Pencil } from "lucide-react";
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
import type { Project, ProjectContact, ProjectType } from "../../types";

export function WorkspaceHeader({
  project,
  contacts,
  projectTypes,
}: {
  project: Project;
  contacts: ProjectContact[];
  projectTypes: ProjectType[];
}) {
  const [state, formAction] = useActionState(
    updateProject.bind(null, project.id),
    { success: false } as ServerActionState
  );
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  useServerAction(state, isPending, {
    successToastTitle: "Thành công",
    errorToastTitle: "Lỗi",
    onSuccess: () => setEditing(false),
  });

  const [holdOpen, setHoldOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [followUp, setFollowUp] = useState("");
  const [reason, setReason] = useState("");

  const [draft, setDraft] = useState({
    name: project.name,
    working_contact_id: project.working_contact_id,
    decision_maker_contact_id: project.decision_maker_contact_id,
    type_ids: project.types.map((t) => t.id),
    request_note: project.request_note ?? "",
    referral_source: project.referral_source ?? "",
  });
  const openEdit = () => {
    setDraft({
      name: project.name,
      working_contact_id: project.working_contact_id,
      decision_maker_contact_id: project.decision_maker_contact_id,
      type_ids: project.types.map((t) => t.id),
      request_note: project.request_note ?? "",
      referral_source: project.referral_source ?? "",
    });
    setEditing(true);
  };
  const saveEdit = () =>
    run({
      name: draft.name.trim(),
      working_contact_id: draft.working_contact_id,
      decision_maker_contact_id: draft.decision_maker_contact_id,
      type_ids: draft.type_ids,
      request_note: draft.request_note.trim(),
      referral_source: draft.referral_source.trim(),
    });

  const run = (input: UpdateProjectFormValues) =>
    startTransition(() => formAction(input));

  const frozen =
    project.status === ProjectStatus.ON_HOLD ||
    project.status === ProjectStatus.CANCELLED;

  const shownContacts = [
    project.working_contact,
    project.decision_maker &&
    project.decision_maker.id !== project.working_contact?.id
      ? project.decision_maker
      : null,
  ].filter((c): c is NonNullable<typeof c> => Boolean(c));

  const editForm = (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="space-y-1.5">
        <Label htmlFor="project-name">Tên công trình</Label>
        <Input
          id="project-name"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Loại công trình</Label>
        <div className="flex flex-wrap gap-2">
          {projectTypes.map((t) => {
            const active = draft.type_ids.includes(t.id);
            return (
              <Button
                key={t.id}
                type="button"
                size="sm"
                variant={active ? "default" : "outline"}
                onClick={() =>
                  setDraft({
                    ...draft,
                    type_ids: active
                      ? draft.type_ids.filter((id) => id !== t.id)
                      : [...draft.type_ids, t.id],
                  })
                }
              >
                {t.name}
              </Button>
            );
          })}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="working-contact">Người liên hệ</Label>
          <select
            id="working-contact"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            value={draft.working_contact_id}
            onChange={(e) =>
              setDraft({ ...draft, working_contact_id: Number(e.target.value) })
            }
          >
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="decision-maker">Người quyết định</Label>
          <select
            id="decision-maker"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            value={draft.decision_maker_contact_id}
            onChange={(e) =>
              setDraft({
                ...draft,
                decision_maker_contact_id: Number(e.target.value),
              })
            }
          >
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="request-note">Yêu cầu</Label>
        <Textarea
          id="request-note"
          rows={2}
          value={draft.request_note}
          onChange={(e) => setDraft({ ...draft, request_note: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="referral-source">Nguồn</Label>
        <Input
          id="referral-source"
          value={draft.referral_source}
          onChange={(e) =>
            setDraft({ ...draft, referral_source: e.target.value })
          }
        />
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={isPending || !draft.name.trim()}
          onClick={saveEdit}
        >
          {isPending ? "Đang lưu..." : "Lưu"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
          Hủy
        </Button>
      </div>
    </div>
  );

  return (
    <div className="mb-6 space-y-3">
      {editing ? (
        editForm
      ) : (
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
              {shownContacts.map((c) => (
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
                        Chọn ngày liên hệ lại. Công trình sẽ được đóng băng ở
                        giai đoạn hiện tại.
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
            <Button variant="ghost" onClick={openEdit}>
              <Pencil className="size-4" />
              Sửa
            </Button>
          </div>
        </div>
      )}

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
