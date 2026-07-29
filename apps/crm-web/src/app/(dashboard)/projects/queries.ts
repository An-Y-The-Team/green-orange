import { apiFetch, apiFetchSafe } from "@/utils/http/http";
import { pageQuery } from "@/utils/page-param/page-param";

import type { Attachment, PaperworkItem, Project, ProjectType } from "./types";

/**
 * Cross-project project list, newest first. Every list endpoint pages at
 * DEFAULT_PAGE_SIZE=100 / MAX_PAGE_SIZE=500 (F17), so callers that use the
 * result as a lookup table must pass an explicit `limit` and treat a miss as a
 * miss — this is a window, never the whole table.
 */
export async function listProjects({
  limit,
  offset,
}: { limit?: number; offset?: number } = {}): Promise<Project[]> {
  return apiFetchSafe<Project[]>(
    `/projects${pageQuery({ limit, offset })}`,
    []
  );
}

export async function getProject(id: number): Promise<Project | undefined> {
  return apiFetch<Project>(`/projects/${id}`).catch(() => undefined);
}

export async function listPaperworkItems(
  projectId: number
): Promise<PaperworkItem[]> {
  return apiFetchSafe<PaperworkItem[]>(
    `/paperwork-items?project_id=${projectId}`,
    []
  );
}

export async function listProjectAttachments(
  projectId: number,
  kind?: string
): Promise<Attachment[]> {
  return apiFetchSafe<Attachment[]>(
    `/attachments?project_id=${projectId}${kind ? `&kind=${kind}` : ""}`,
    []
  );
}

/**
 * Cross-project paperwork items for dashboard overdue surfacing.
 *
 * `overdue` maps to `?overdue=true`, which the server expands to the derived
 * rule (`due_date < today AND status != approved`) — the scan stays where the
 * rows are instead of shipping every project's checklist to filter in JS (F20).
 */
export async function listAllPaperworkItems({
  overdue,
  limit,
}: { overdue?: boolean; limit?: number } = {}): Promise<PaperworkItem[]> {
  const params = new URLSearchParams();
  if (overdue) params.set("overdue", "true");
  if (limit) params.set("limit", String(limit));
  const query = params.toString();
  return apiFetchSafe<PaperworkItem[]>(
    `/paperwork-items${query ? `?${query}` : ""}`,
    []
  );
}

export async function listProjectTypes(): Promise<ProjectType[]> {
  return apiFetchSafe<ProjectType[]>("/project-types", []);
}
