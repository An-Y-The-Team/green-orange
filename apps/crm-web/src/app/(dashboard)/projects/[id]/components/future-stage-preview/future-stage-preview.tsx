import { Lock } from "lucide-react";

import { STAGE_OPENS } from "@/constants/labels";

import type { ProjectStage } from "../../../enums";
import type { StageGate } from "../../utils/stage-gates/stage-gates";
import { GateChecklist } from "../gate-checklist/gate-checklist";
import { StageCard } from "../stage-card/stage-card";

/**
 * A stage the job hasn't reached, opened from the nav: what it will need, with
 * no buttons. The stage opens by itself when the work before it is done
 * (crm-api-nest common/stage.ts), so the preview says what that work is instead
 * of offering a way to jump ahead — the manual move lives in the header.
 */
export function FutureStagePreview({
  stage,
  gates,
}: {
  stage: ProjectStage;
  gates: StageGate[];
}) {
  return (
    <StageCard stage={stage} contentClassName="space-y-4">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Lock aria-hidden className="size-4 shrink-0" />
        Chưa tới giai đoạn này. {STAGE_OPENS[stage]}.
      </p>
      <GateChecklist stage={stage} gates={gates} actions={{}} />
    </StageCard>
  );
}
