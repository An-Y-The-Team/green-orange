"use client";

import { Badge } from "@yan/ui/components/badge";

import type { Attachment } from "@/components/attachments/types";
import { StepState } from "@/components/step-list/enums";
import { type StepItem, StepList } from "@/components/step-list/step-list";
import { ACCEPTANCE_SUB_STATUSES } from "@/constants/labels";

import { AcceptanceSubStatus, ProjectStage } from "../../../../enums";
import type { Project } from "../../../../types";
import { StageCard } from "../../stage-card/stage-card";
import { AcceptanceDrawer } from "./components/acceptance-drawer/acceptance-drawer";
import { AgreedSummary } from "./components/agreed-summary/agreed-summary";
import { InspectStep } from "./components/inspect-step/inspect-step";
import {
  ReportLines,
  ReworkLines,
} from "./components/passed-summary/passed-summary";
import { ScheduleStep } from "./components/schedule-step/schedule-step";
import { SignStep } from "./components/sign-step/sign-step";
import { AcceptanceStepKey } from "./enums";
import { acceptanceSteps } from "./utils/acceptance-step/acceptance-step";

const STEP_TITLES: Record<AcceptanceStepKey, string> = {
  [AcceptanceStepKey.SCHEDULE]: "Hẹn ngày nghiệm thu",
  [AcceptanceStepKey.INSPECT]: "Thực hiện Nghiệm thu",
  [AcceptanceStepKey.SIGN]: "Biên bản đã ký & hoàn tất",
};

/**
 * Nghiệm thu as a three-step stepper. The sub-status decides the open step
 * (see acceptanceSteps); the stepper replaces the gate checklist.
 */
export function AcceptancePanel({
  project,
  attachments,
}: {
  project: Project;
  attachments: Attachment[];
}) {
  const sub = project.acceptance_sub_status ?? AcceptanceSubStatus.REQUEST_SENT;
  const passed = sub === AcceptanceSubStatus.PASSED;
  const signing = sub === AcceptanceSubStatus.SIGNING;
  const { steps } = acceptanceSteps({ project });

  const bodies: Record<AcceptanceStepKey, React.ReactNode> = {
    [AcceptanceStepKey.SCHEDULE]: <ScheduleStep project={project} />,
    [AcceptanceStepKey.INSPECT]: (
      <InspectStep project={project} attachments={attachments} />
    ),
    [AcceptanceStepKey.SIGN]: (
      <SignStep project={project} attachments={attachments} />
    ),
  };

  // Summary of a finished step; the passed view adds what happened inside it.
  const summaryOf = (
    key: AcceptanceStepKey,
    text?: string
  ): React.ReactNode => {
    if (key === AcceptanceStepKey.INSPECT && signing && text) {
      return <AgreedSummary projectId={project.id} text={text} />;
    }
    if (key === AcceptanceStepKey.INSPECT && passed) {
      return (
        <>
          {text}
          <ReworkLines project={project} />
        </>
      );
    }
    if (key === AcceptanceStepKey.SIGN && passed) {
      return (
        <>
          {text}
          <ReportLines attachments={attachments} />
        </>
      );
    }
    return text;
  };

  const items: StepItem[] = steps.map((step) => ({
    key: step.key,
    title: STEP_TITLES[step.key],
    state: step.state,
    summary:
      step.state === StepState.DONE
        ? summaryOf(step.key, step.summary)
        : undefined,
    badge: step.badge ? (
      <Badge
        variant={ACCEPTANCE_SUB_STATUSES[AcceptanceSubStatus.REWORK].variant}
      >
        {step.badge}
      </Badge>
    ) : undefined,
    children: bodies[step.key],
  }));

  return (
    <StageCard stage={ProjectStage.ACCEPTANCE} contentClassName="space-y-4">
      <div className="flex justify-end">
        <AcceptanceDrawer project={project} attachments={attachments} />
      </div>
      <StepList steps={items} aria-label="Các bước nghiệm thu" />
    </StageCard>
  );
}
