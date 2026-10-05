import type { Project } from "../../../types";
import type { WorkspaceView } from "../parse-view/parse-view";

/**
 * Link to one pane of the workspace. The current stage is the default view, so
 * its link carries no `?view=` — the bare URL stays the canonical one.
 */
export function viewHref({
  project,
  view,
}: {
  project: Pick<Project, "id" | "stage">;
  view: WorkspaceView;
}): string {
  const base = `/projects/${project.id}`;
  return view === project.stage ? base : `${base}?view=${view}`;
}
