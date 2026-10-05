"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";

import { useServerAction } from "@yan/shared/hooks/use-server-actions";
import { Button } from "@yan/ui/components/button";
import { DateInput } from "@yan/ui/components/date-input/date-input";
import { Input } from "@yan/ui/components/input";
import { Label } from "@yan/ui/components/label";
import { Textarea } from "@yan/ui/components/textarea";

import { EmptyState } from "@/components/empty-state/empty-state";
import { ACTIONS, FIELDS, LINE_ITEM_COLUMNS } from "@/constants/labels";
import {
  ACTION_TOAST_TITLES,
  INITIAL_ACTION_STATE,
} from "@/constants/server-action";

import { updateProject } from "../../../../actions/update-project";
import { AttachmentKind } from "../../../../enums";
import type { Attachment, Project, SurveyItem } from "../../../../types";
import { gateButtonProps } from "../../../utils/gate-button-props/gate-button-props";
import { AttachmentList } from "../../attachment-list/attachment-list";

// Survey half of the stage-1 panel — a bare body, rendered by RequestPanel
// below the appointment card once `visit_date` is set (the visit happened).
export function SurveyPanel({
  project,
  attachments,
}: {
  project: Project;
  attachments: Attachment[];
}) {
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

  // --- visit_date --------------------------------------------------------
  const [visitDate, setVisitDate] = useState(project.visit_date ?? "");

  // --- survey_items inline rows -----------------------------------------
  const [items, setItems] = useState<SurveyItem[]>(project.survey_items ?? []);
  const setItem = (i: number, patch: Partial<SurveyItem>) =>
    setItems((prev) =>
      prev.map((it, j) => (j === i ? { ...it, ...patch } : it))
    );

  // --- survey_note -------------------------------------------------------
  const [surveyNote, setSurveyNote] = useState(project.survey_note ?? "");

  return (
    <div className="space-y-6 border-t border-border pt-4">
      {/* Ngày gặp khách */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="visit-date">Ngày gặp khách</Label>
          <DateInput
            id="visit-date"
            className="w-auto"
            value={visitDate}
            onChange={setVisitDate}
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={
            savePending || !visitDate || visitDate === project.visit_date
          }
          onClick={() => save({ visit_date: visitDate })}
        >
          {ACTIONS.save}
        </Button>
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
                  variant="destructive"
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
          <EmptyState message="Chưa có hạng mục — thêm ở dòng bên dưới." />
        )}
        <div>
          <Button
            variant="outline"
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
          variant="outline"
          size="sm"
          disabled={savePending}
          onClick={() => save({ survey_note: surveyNote })}
        >
          Lưu ghi chú
        </Button>
      </div>

      <AttachmentList
        projectId={project.id}
        kind={AttachmentKind.SURVEY}
        initial={attachments.filter((a) => a.kind === AttachmentKind.SURVEY)}
        title="Hình ảnh"
        emptyMessage="Chưa có ảnh khảo sát."
        withNote
      />
    </div>
  );
}

/**
 * Stage 1's exit: the GateChecklist action on the "Lập báo giá từ khảo sát" row.
 *
 * A plain link to the builder — no stage PATCH. Creating the quote is what
 * moves the job to Báo giá (the server auto-advances on quote create), so an
 * operator who opens the builder and backs out leaves the job where it was.
 */
export function SurveyExit({
  project,
  primary,
}: {
  project: Project;
  primary: boolean;
}) {
  return (
    <Button
      {...gateButtonProps(primary)}
      render={
        <Link
          data-edit-link
          href={`/projects/${project.id}/quotes/new?from=survey`}
        >
          Lập báo giá
        </Link>
      }
    />
  );
}
