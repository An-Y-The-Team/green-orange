import type {
  Assignment,
  TimekeepingRecord,
} from "@/app/(dashboard)/crew/types";
import type { Attachment } from "@/components/attachments/types";

import { GateKey, ProjectStage } from "../../../../enums";
import type { Project } from "../../../../types";
import type { StageGate } from "../../../utils/stage-gates/stage-gates";
import { GateChecklist } from "../../gate-checklist/gate-checklist";
import { StageCard } from "../../stage-card/stage-card";
import { Duration } from "./components/duration/duration";
import {
  FinishConfirm,
  FinishPhotos,
} from "./components/finish-confirm/finish-confirm";
import { Personnel } from "./components/personnel/personnel";
import { StatusStepper } from "./components/status-stepper/status-stepper";

export function ExecutionPanel({
  project,
  timekeeping,
  assignments,
  attachments,
  gates,
}: {
  project: Project;
  timekeeping: TimekeepingRecord[];
  assignments: Assignment[];
  attachments: Attachment[];
  gates: StageGate[];
}) {
  // Ngày khởi công has no button: the Duration form below is where it's typed.
  return (
    <StageCard stage={ProjectStage.EXECUTION} contentClassName="space-y-6">
      <GateChecklist
        stage={ProjectStage.EXECUTION}
        gates={gates}
        actions={{
          [GateKey.WORKS_DONE]: (primary) => (
            <FinishConfirm project={project} primary={primary} />
          ),
        }}
      />
      <StatusStepper project={project} />
      <Duration project={project} timekeeping={timekeeping} />
      <Personnel project={project} assignments={assignments} />
      <FinishPhotos project={project} attachments={attachments} />
    </StageCard>
  );
}
