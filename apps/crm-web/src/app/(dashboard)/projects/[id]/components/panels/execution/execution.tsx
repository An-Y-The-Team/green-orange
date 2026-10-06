import type {
  Assignment,
  TimekeepingRecord,
} from "@/app/(dashboard)/crew/types";
import { AttachmentList } from "@/components/attachments/attachment-list/attachment-list";
import { AttachmentKind } from "@/components/attachments/enums";
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
      {/* Progress photos while the works run — optional, gates nothing. */}
      <AttachmentList
        owner={{ project_id: project.id }}
        kind={AttachmentKind.SITE_LOG}
        initial={attachments.filter((a) => a.kind === AttachmentKind.SITE_LOG)}
        title="Ảnh thi công (tùy chọn)"
        emptyMessage="Chưa có ảnh thi công."
        withNote
        uploadLabel="Ảnh thi công"
      />
      <FinishPhotos project={project} attachments={attachments} />
    </StageCard>
  );
}
