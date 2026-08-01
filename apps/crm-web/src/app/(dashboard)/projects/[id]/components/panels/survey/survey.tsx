"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";

import {
  type ServerActionState,
  useServerAction,
} from "@yan/shared/hooks/use-server-actions";
import { Button } from "@yan/ui/components/button";
import { DateInput } from "@yan/ui/components/date-input/date-input";
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

import { ACTIONS, FIELDS, LINE_ITEM_COLUMNS } from "@/constants/labels";
import {
  ACTION_TOAST_TITLES,
  INITIAL_ACTION_STATE,
} from "@/constants/server-action";
import { formatDate } from "@/utils/format-date/format-date";

import {
  addAttachment,
  deleteAttachment,
} from "../../../../actions/attachments";
import { updateProject } from "../../../../actions/update-project";
import { AttachmentKind, ProjectStage } from "../../../../enums";
import type { Attachment, Project, SurveyItem } from "../../../../types";

// Survey half of the stage-1 panel — a bare body, rendered by RequestPanel
// below the appointment card once `visit_date` is set (the visit happened).
export function SurveyPanel({
  project,
  attachments,
}: {
  project: Project;
  attachments: Attachment[];
}) {
  const router = useRouter();

  // Field edits (visit_date / survey_items / survey_note) share one action.
  const [saveState, saveAction] = useActionState(
    updateProject.bind(null, project.id),
    INITIAL_ACTION_STATE
  );
  const [savePending, startSave] = useTransition();
  useServerAction(saveState, savePending, {
    ...ACTION_TOAST_TITLES,
  });
  const save = (input: Parameters<typeof updateProject>[2]) =>
    startSave(() => saveAction(input));

  // Exit → move to quote, then jump to the survey-prefilled quote builder.
  const [exitState, exitAction] = useActionState(
    updateProject.bind(null, project.id),
    INITIAL_ACTION_STATE
  );
  const [exitPending, startExit] = useTransition();
  useServerAction(exitState, exitPending, {
    ...ACTION_TOAST_TITLES,
    onSuccess: () =>
      router.push(`/projects/${project.id}/quotes/new?from=survey`),
  });

  // --- visit_date [sửa] --------------------------------------------------
  const [visitOpen, setVisitOpen] = useState(false);
  const [visitDate, setVisitDate] = useState(project.visit_date ?? "");

  // --- survey_items inline rows -----------------------------------------
  const [items, setItems] = useState<SurveyItem[]>(project.survey_items ?? []);
  const setItem = (i: number, patch: Partial<SurveyItem>) =>
    setItems((prev) =>
      prev.map((it, j) => (j === i ? { ...it, ...patch } : it))
    );

  // --- survey_note -------------------------------------------------------
  const [surveyNote, setSurveyNote] = useState(project.survey_note ?? "");

  // --- attachments (kind=survey) ----------------------------------------
  const [rows, setRows] = useState<Attachment[]>(attachments);
  const [showAdd, setShowAdd] = useState(false);
  const [newFilename, setNewFilename] = useState("");
  const [newNote, setNewNote] = useState("");

  const [addState, addAction] = useActionState(
    addAttachment.bind(null, project.id),
    INITIAL_ACTION_STATE
  );
  const [addPending, startAdd] = useTransition();
  useServerAction(addState, addPending, {
    ...ACTION_TOAST_TITLES,
    onSuccess: (data: Attachment) => {
      setRows((prev) => [data, ...prev]);
      setNewFilename("");
      setNewNote("");
      setShowAdd(false);
    },
  });

  // Saves the edited visit date, then closes the dialog optimistically — the
  // toast reports the outcome, so there's nothing left to see behind it.
  const handleSaveVisitDate = () => {
    save({ visit_date: visitDate });
    setVisitOpen(false);
  };

  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [delState, delAction] = useActionState(
    (prev: ServerActionState, id: number) =>
      deleteAttachment(id, project.id, prev),
    INITIAL_ACTION_STATE
  );
  const [delPending, startDel] = useTransition();
  useServerAction(delState, delPending, {
    ...ACTION_TOAST_TITLES,
    onSuccess: (data: { id: number }) =>
      setRows((prev) => prev.filter((r) => r.id !== data.id)),
  });

  // Remembers which row is going away so only that button shows as pending.
  const handleDeleteAttachment = (id: number) => {
    setDeletingId(id);
    startDel(() => delAction(id));
  };

  return (
    <div className="space-y-6 border-t border-border pt-4">
      {/* Đã gặp khách + [sửa] */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span>
          Đã gặp khách:{" "}
          {project.visit_date ? formatDate(project.visit_date) : "—"}
        </span>
        <Dialog open={visitOpen} onOpenChange={setVisitOpen}>
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0"
            onClick={() => setVisitOpen(true)}
          >
            sửa
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Sửa ngày gặp khách</DialogTitle>
            </DialogHeader>
            <div className="space-y-1.5">
              <Label htmlFor="visit-date">Ngày gặp khách</Label>
              <DateInput
                id="visit-date"
                value={visitDate}
                onChange={setVisitDate}
              />
            </div>
            <DialogFooter>
              <DialogClose
                render={<Button variant="ghost">{ACTIONS.close}</Button>}
              />
              <Button
                disabled={savePending || !visitDate}
                onClick={handleSaveVisitDate}
              >
                {ACTIONS.save}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Hạng mục đo đạc */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Hạng mục đo đạc</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setItems((prev) => [...prev, { name: "" }])}
          >
            {ACTIONS.addRow}
          </Button>
        </div>
        {items.length > 0 ? (
          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <Input
                  className="min-w-40 flex-1"
                  placeholder={LINE_ITEM_COLUMNS.item}
                  value={it.name}
                  onChange={(e) => setItem(i, { name: e.target.value })}
                />
                <Input
                  className="w-20"
                  type="number"
                  placeholder="SL"
                  value={it.quantity ?? ""}
                  onChange={(e) =>
                    setItem(i, {
                      quantity:
                        e.target.value === ""
                          ? undefined
                          : Number(e.target.value),
                    })
                  }
                />
                <Input
                  className="w-20"
                  placeholder="ĐV"
                  value={it.unit ?? ""}
                  onChange={(e) => setItem(i, { unit: e.target.value })}
                />
                <Input
                  className="min-w-32 flex-1"
                  placeholder={FIELDS.note}
                  value={it.note ?? ""}
                  onChange={(e) => setItem(i, { note: e.target.value })}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setItems((prev) => prev.filter((_, j) => j !== i))
                  }
                >
                  {ACTIONS.delete}
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Chưa có hạng mục.</p>
        )}
        <div>
          <Button
            size="sm"
            disabled={savePending}
            onClick={() => save({ survey_items: items })}
          >
            Lưu hạng mục
          </Button>
        </div>
      </div>

      {/* Ghi chú khảo sát */}
      <div className="space-y-2">
        <Label htmlFor="survey-note">
          Ghi chú khảo sát (giờ làm, an toàn, tiếp cận…)
        </Label>
        <Textarea
          id="survey-note"
          rows={3}
          value={surveyNote}
          onChange={(e) => setSurveyNote(e.target.value)}
        />
        <Button
          size="sm"
          disabled={savePending}
          onClick={() => save({ survey_note: surveyNote })}
        >
          Lưu ghi chú
        </Button>
      </div>

      {/* Hình ảnh */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Hình ảnh ({rows.length})</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdd((v) => !v)}
          >
            + Thêm ảnh
          </Button>
        </div>
        {rows.length > 0 ? (
          <ul className="space-y-1 text-sm">
            {rows.map((a) => (
              <li key={a.id} className="flex items-center gap-2">
                <span>
                  · {a.s3_key}
                  {a.note ? ` — "${a.note}"` : ""}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0"
                  disabled={delPending && deletingId === a.id}
                  onClick={() => handleDeleteAttachment(a.id)}
                >
                  {ACTIONS.delete}
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Chưa có ảnh.</p>
        )}
        {showAdd ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 p-3">
            <Input
              className="min-w-40 flex-1"
              placeholder="tên-tệp.jpg"
              value={newFilename}
              onChange={(e) => setNewFilename(e.target.value)}
            />
            <Input
              className="min-w-40 flex-1"
              placeholder={FIELDS.note}
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
            />
            <Button
              size="sm"
              disabled={addPending || !newFilename.trim()}
              onClick={() =>
                startAdd(() =>
                  addAction({
                    kind: AttachmentKind.SURVEY,
                    filename: newFilename.trim(),
                    note: newNote.trim() || undefined,
                  })
                )
              }
            >
              {ACTIONS.add}
            </Button>
          </div>
        ) : null}
      </div>

      {/* Exit → quote builder */}
      <div className="border-t border-border pt-4">
        <Button
          disabled={exitPending}
          onClick={() =>
            startExit(() => exitAction({ stage: ProjectStage.QUOTE }))
          }
        >
          ✓ Đủ dữ liệu — lập báo giá
        </Button>
      </div>
    </div>
  );
}
