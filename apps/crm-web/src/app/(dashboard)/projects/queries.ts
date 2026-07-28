import { attachments } from "@/data/mock/attachments";
import { paperworkItems } from "@/data/mock/paperwork-items";
import { projectTypes } from "@/data/mock/project-types";
import { projects } from "@/data/mock/projects";
import { API_URL, apiFetch, apiFetchSafe } from "@/utils/http/http";
import { isOverdue } from "@/utils/is-overdue/is-overdue";

import { PaperworkStatus } from "./enums";
import type { Attachment, PaperworkItem, Project, ProjectType } from "./types";

/**
 * Cross-project project list, newest first. Every list endpoint pages at
 * DEFAULT_PAGE_SIZE=100 / MAX_PAGE_SIZE=500 (F17), so callers that use the
 * result as a lookup table must pass an explicit `limit` and treat a miss as a
 * miss — this is a window, never the whole table.
 */
export async function listProjects({ limit }: { limit?: number } = {}): Promise<
  Project[]
> {
  if (API_URL) {
    const path = limit ? `/projects?limit=${limit}` : "/projects";
    return apiFetchSafe<Project[]>(path, []);
  }
  return limit ? projects.slice(0, limit) : projects;
}

export async function getProject(id: number): Promise<Project | undefined> {
  if (API_URL) {
    return apiFetch<Project>(`/projects/${id}`).catch(() => undefined);
  }
  return projects.find((p) => p.id === id);
}

export async function listPaperworkItems(
  projectId: number
): Promise<PaperworkItem[]> {
  if (API_URL) {
    return apiFetchSafe<PaperworkItem[]>(
      `/paperwork-items?project_id=${projectId}`,
      []
    );
  }
  return paperworkItems.filter((i) => i.project_id === projectId);
}

export async function listProjectAttachments(
  projectId: number,
  kind?: string
): Promise<Attachment[]> {
  if (API_URL) {
    return apiFetchSafe<Attachment[]>(
      `/attachments?project_id=${projectId}${kind ? `&kind=${kind}` : ""}`,
      []
    );
  }
  return attachments.filter(
    (a) => a.project_id === projectId && (!kind || a.kind === kind)
  );
}

/**
 * Cross-project paperwork items for dashboard overdue surfacing.
 *
 * `overdue` maps to `?overdue=true`, which the server expands to the derived
 * rule (`due_date < today AND status != approved`) — the scan stays where the
 * rows are instead of shipping every project's checklist to filter in JS (F20).
 * Mock mode reuses `isOverdue` so both branches share one definition.
 */
export async function listAllPaperworkItems({
  overdue,
  limit,
}: { overdue?: boolean; limit?: number } = {}): Promise<PaperworkItem[]> {
  if (API_URL) {
    const params = new URLSearchParams();
    if (overdue) params.set("overdue", "true");
    if (limit) params.set("limit", String(limit));
    const query = params.toString();
    return apiFetchSafe<PaperworkItem[]>(
      `/paperwork-items${query ? `?${query}` : ""}`,
      []
    );
  }
  const rows = overdue
    ? paperworkItems.filter((i) =>
        isOverdue(i?.due_date, i?.status === PaperworkStatus.APPROVED)
      )
    : paperworkItems;
  return limit ? rows.slice(0, limit) : rows;
}

export async function listProjectTypes(): Promise<ProjectType[]> {
  return API_URL
    ? apiFetchSafe<ProjectType[]>("/project-types", [])
    : projectTypes;
}
