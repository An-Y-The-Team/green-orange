import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@yan/ui/components/card";

import type {
  Assignment,
  TimekeepingRecord,
} from "@/app/(dashboard)/crew/types";
import { projectStage } from "@/constants/labels";

import { ProjectStage } from "../../../../enums";
import type { Project } from "../../../../types";
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
    <Card id="stage-execution" className="mb-6 scroll-mt-4">
      <CardHeader>
        <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
          Giai đoạn 6 · {projectStage[ProjectStage.EXECUTION].label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <StatusStepper project={project} />
        <Duration project={project} timekeeping={timekeeping} />
        <Personnel project={project} assignments={assignments} />
        <FinishConfirm project={project} />
      </CardContent>
    </Card>
  );
}
