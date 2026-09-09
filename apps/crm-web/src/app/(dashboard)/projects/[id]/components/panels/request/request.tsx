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
import {
  localDateOf,
  localISO,
  localTimeOf,
  todayISO,
} from "@/utils/today-iso/today-iso";

import { updateProject } from "../../../../actions/update-project";
import type { Attachment, Project } from "../../../../types";
import { StageCard } from "../../stage-card/stage-card";
import { SurveyExit, SurveyPanel } from "../survey/survey";

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

  // Dời hẹn — edit appointment_at in place (no history). Read through the local
  // helpers, never `iso.slice(0, 10)`: that is the UTC day, so an appointment
  // before 07:00 ICT prefilled this form with yesterday's date and 23:xx.
  const initialDate = project.appointment_at
    ? localDateOf(project.appointment_at)
    : todayISO();
  const initialTime = project.appointment_at
    ? localTimeOf(project.appointment_at)
    : "09:00";
  const [apptDate, setApptDate] = useState(initialDate);
  const [apptTime, setApptTime] = useState(initialTime);

  // "Đã gặp khách" — visit date defaults to today, editable inline.
  const [visitDate, setVisitDate] = useState(todayISO);

  // Combines the date + time inputs into one ISO instant; the toast reports
  // the outcome.
  const handleReschedule = () =>
    run({ appointment_at: localISO(apptDate, apptTime) });

  // Footer = the stage's next step: before the visit it's "Đã gặp khách"
  // (with the date it stamps), after it the move to Báo giá.
  const footer = project.visit_date ? (
    <SurveyExit project={project} />
  ) : (
    <>
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
    </>
  );

  return (
    <StageCard project={project} contentClassName="space-y-4" footer={footer}>
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
              size="sm"
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
      ) : null}
    </StageCard>
  );
}
