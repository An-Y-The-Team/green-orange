import { ProjectStage, WorkspacePane } from "../../../enums";

export type WorkspaceView = ProjectStage | WorkspacePane;

const VIEWS = new Set<string>([
  ...Object.values(ProjectStage),
  ...Object.values(WorkspacePane),
]);

/**
 * `?view=` on /projects/[id] → which pane the workspace shows. Absent, unknown
 * or repeated (`?view=a&view=b`) falls back to the project's current stage, so a
 * stale bookmark renders instead of breaking — same rule as `useTabParam`.
 */
export function parseView({
  raw,
  currentStage,
}: {
  raw: string | string[] | undefined;
  currentStage: ProjectStage;
}): WorkspaceView {
  return typeof raw === "string" && VIEWS.has(raw)
    ? (raw as WorkspaceView)
    : currentStage;
}

/** True when the view is one of the eight stages (not Giấy tờ / Nhân sự). */
export function isStageView(view: WorkspaceView): view is ProjectStage {
  return (Object.values(ProjectStage) as string[]).includes(view);
}
