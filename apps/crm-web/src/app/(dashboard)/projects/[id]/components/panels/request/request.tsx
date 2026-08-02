"use client";

import { useActionState, useState, useTransition } from "react";

import { useServerAction } from "@yan/shared/hooks/use-server-actions";
import { Button } from "@yan/ui/components/button";
import { DateInput } from "@yan/ui/components/date-input/date-input";
import { Input } from "@yan/ui/components/input";
import { Label } from "@yan/ui/components/label";

import { ACTIONS, FIELDS } from "@/constants/labels";
import {
  ACTION_TOAST_TITLES,
  INITIAL_ACTION_STATE,
} from "@/constants/server-action";
import { todayISO } from "@/utils/today-iso/today-iso";

import { updateProject } from "../../../../actions/update-project";
import type { Attachment, Project } from "../../../../types";
import { StageCard } from "../../stage-card/stage-card";
import { SurveyPanel } from "../survey/survey";

// Stage 1 = Yêu cầu & Khảo sát: the appointment IS the survey visit, so one
// panel with two halves. `visit_date` (set by "Đã gặp khách") reveals the
// survey half in place — it is NOT a stage move.
export function RequestPanel({
  project,
  attachments,
}: {
  project: Project;
  attachments: Attachment[];
}) {
  const [state, formAction] = useActionState(
    updateProject.bind(null, project.id),
    INITIAL_ACTION_STATE
  );
  const [isPending, startTransition] = useTransition();
  useServerAction(state, isPending, {
    ...ACTION_TOAST_TITLES,
  });

  const run = (input: Parameters<typeof updateProject>[2]) =>
    startTransition(() => formAction(input));

  // Dời hẹn — edit appointment_at in place (no history).
  const initialDate = project.appointment_at?.slice(0, 10) ?? todayISO();
  const initialTime = project.appointment_at?.slice(11, 16) ?? "09:00";
  const [apptDate, setApptDate] = useState(initialDate);
  const [apptTime, setApptTime] = useState(initialTime);

  // "Đã gặp khách" — visit date defaults to today, editable inline.
  const [visitDate, setVisitDate] = useState(todayISO);

  // Combines the date + time inputs into one ISO instant; the toast reports
  // the outcome.
  const handleReschedule = () =>
    run({
      appointment_at: new Date(
        `${apptDate}T${apptTime || "00:00"}`
      ).toISOString(),
    });

  return (
    <StageCard project={project} contentClassName="space-y-4">
      <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
        {project.request_note ? (
          <div className="contents">
            <dt className="text-muted-foreground">Yêu cầu</dt>
            <dd>{project.request_note}</dd>
          </div>
        ) : null}
        {project.referral_source ? (
          <div className="contents">
            <dt className="text-muted-foreground">{FIELDS.source}</dt>
            <dd>{project.referral_source}</dd>
          </div>
        ) : null}
      </dl>

      {project.appointment_at ? (
        <div className="space-y-2">
          {project.location ? (
            <p className="text-sm text-muted-foreground">
              📍 {project.location.name}
            </p>
          ) : null}
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="appt-date">Ngày hẹn gặp</Label>
              <DateInput
                id="appt-date"
                className="w-auto"
                value={apptDate}
                onChange={setApptDate}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="appt-time">Giờ</Label>
              <Input
                id="appt-time"
                className="w-auto"
                type="time"
                value={apptTime}
                onChange={(e) => setApptTime(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              disabled={
                isPending ||
                !apptDate ||
                (apptDate === initialDate && apptTime === initialTime)
              }
              onClick={handleReschedule}
            >
              {ACTIONS.save}
            </Button>
          </div>
        </div>
      ) : null}

      {project.visit_date ? (
        <SurveyPanel project={project} attachments={attachments} />
      ) : (
        <div className="flex flex-wrap items-end gap-2 border-t border-border pt-4">
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
            disabled={isPending || !visitDate}
            onClick={() => run({ visit_date: visitDate })}
          >
            ✓ Đã gặp khách — bắt đầu khảo sát
          </Button>
        </div>
      )}
    </StageCard>
  );
}
