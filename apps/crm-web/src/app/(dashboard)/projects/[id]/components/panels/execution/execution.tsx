import type {
  Assignment,
  TimekeepingRecord,
} from "@/app/(dashboard)/crew/types";

import type { Project } from "../../../../types";
import { StageCard } from "../../stage-card/stage-card";
import { Duration } from "./components/duration/duration";
import { FinishConfirm } from "./components/finish-confirm/finish-confirm";
import { Personnel } from "./components/personnel/personnel";
import { StatusStepper } from "./components/status-stepper/status-stepper";

export function ExecutionPanel({
  project,
  timekeeping,
  assignments,
}: {
  project: Project;
  timekeeping: TimekeepingRecord[];
  assignments: Assignment[];
}) {
  return (
    <StageCard project={project} contentClassName="space-y-6">
      <StatusStepper project={project} />
      <Duration project={project} timekeeping={timekeeping} />
      <Personnel project={project} assignments={assignments} />
      <FinishConfirm project={project} />
    </StageCard>
  );
}
