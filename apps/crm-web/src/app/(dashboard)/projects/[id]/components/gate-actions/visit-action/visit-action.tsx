"use client";

import { useActionState, useState, useTransition } from "react";

import { useServerAction } from "@yan/shared/hooks/use-server-actions";
import { Button } from "@yan/ui/components/button";
import { DateInput } from "@yan/ui/components/date-input/date-input";
import { Label } from "@yan/ui/components/label";

import {
  ACTION_TOAST_TITLES,
  INITIAL_ACTION_STATE,
} from "@/constants/server-action";
import { todayISO } from "@/utils/today-iso/today-iso";

import { updateProject } from "../../../../actions/update-project";
import type { Project } from "../../../../types";
import { gateButtonProps } from "../../../utils/gate-button-props/gate-button-props";

/**
 * "Đã gặp khách" — the action on stage 1's visit row. Stamps the REAL visit
 * date (appointments slip, so it defaults to today but stays editable); that
 * date reveals the survey half of the panel. Not a stage move.
 */
export function VisitAction({
  project,
  primary,
}: {
  project: Project;
  primary: boolean;
}) {
  const [state, formAction] = useActionState(
    updateProject.bind(null, project.id),
    INITIAL_ACTION_STATE
  );
  const [isPending, startTransition] = useTransition();
  useServerAction(state, isPending, { ...ACTION_TOAST_TITLES });

  const [visitDate, setVisitDate] = useState(todayISO);

  // Stamp the chosen visit date on the project.
  const handleVisit = () =>
    startTransition(() => formAction({ visit_date: visitDate }));

  return (
    <span className="flex flex-wrap items-end gap-2">
      <span className="space-y-1.5">
        <Label htmlFor="visit-date">Ngày gặp khách</Label>
        <DateInput
          id="visit-date"
          className="w-auto"
          value={visitDate}
          onChange={setVisitDate}
        />
      </span>
      <Button
        {...gateButtonProps(primary)}
        disabled={isPending || !visitDate}
        onClick={handleVisit}
      >
        Đã gặp khách
      </Button>
    </span>
  );
}
