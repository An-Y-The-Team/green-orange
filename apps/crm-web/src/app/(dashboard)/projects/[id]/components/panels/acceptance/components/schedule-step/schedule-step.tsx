"use client";

import { useState } from "react";

import { Button } from "@yan/ui/components/button";
import { DateInput } from "@yan/ui/components/date-input/date-input";

import { FieldLabel } from "@/components/form-bits/form-bits";
import { formatDate } from "@/utils/format-date/format-date";

import {
  AcceptanceNoteTag,
  AcceptanceSubStatus,
} from "../../../../../../enums";
import type { Project } from "../../../../../../types";
import { gateButtonProps } from "../../../../../utils/gate-button-props/gate-button-props";
import { useAcceptanceAction } from "../../hooks/use-acceptance-action/use-acceptance-action";
import { PrintLinks } from "../print-links/print-links";

/** Bước 1: print the letters, then record the date the client picked. */
export function ScheduleStep({ project }: { project: Project }) {
  const [date, setDate] = useState("");
  const { run, pending } = useAcceptanceAction({ projectId: project.id });

  // Client named a date: moves to Thực hiện Nghiệm thu and keeps the date.
  const handleSchedule = () =>
    run({
      patch: {
        acceptance_sub_status: AcceptanceSubStatus.INSPECTING,
        acceptance_scheduled_date: date,
      },
      note: {
        tag: AcceptanceNoteTag.SCHEDULED,
        body: `Khách hẹn nghiệm thu ${formatDate(date)}`,
      },
    });

  const inputId = `scheduled-${project.id}`;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        In thư yêu cầu nghiệm thu, gửi cho khách (và Ban quản lý tòa nhà nếu
        công trình ở chung cư). Khách hẹn ngày nào thì ghi vào đây.
      </p>
      <PrintLinks projectId={project.id} />
      <div className="space-y-1.5">
        <FieldLabel htmlFor={inputId} required>
          Ngày khách hẹn nghiệm thu
        </FieldLabel>
        <DateInput id={inputId} value={date} onChange={setDate} required />
      </div>
      <Button
        {...gateButtonProps(true)}
        disabled={pending || !date}
        onClick={handleSchedule}
      >
        Khách đã hẹn lịch
      </Button>
    </div>
  );
}
