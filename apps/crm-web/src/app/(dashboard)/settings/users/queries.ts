import { akFetch } from "@/utils/authentik-admin/authentik-admin";
import { ApiError } from "@/utils/http/http";

import type { AkUser } from "./types";

// Well above any real headcount here; the page has no pager on purpose.
const PAGE_SIZE = 200;
const NOT_FOUND = 404;

/**
 * Human accounts (`type=internal`), by username. Service accounts and outpost
 * users are Authentik plumbing and stay out of the list. `search` is
 * Authentik's contains-match over username / name / email.
 */
export async function listUsers(search = ""): Promise<AkUser[]> {
  const query = new URLSearchParams({
    type: "internal",
    ordering: "username",
    page_size: String(PAGE_SIZE),
  });
  if (search.trim()) query.set("search", search.trim());
  const { results } = await akFetch<{ results: AkUser[] }>(
    `/core/users/?${query}`
  );
  return results;
}

/** One account by Authentik pk; null when it does not exist. */
export async function getUser(pk: number): Promise<AkUser | null> {
  try {
    return await akFetch<AkUser>(`/core/users/${pk}/`);
  } catch (error) {
    if (error instanceof ApiError && error.status === NOT_FOUND) return null;
    throw error;
  }
}
