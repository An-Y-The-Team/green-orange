import { akFetch } from "@/utils/authentik-admin/authentik-admin";

import type { AkUser } from "./types";

// Well above any real headcount here; the page has no pager on purpose.
const PAGE_SIZE = 200;

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
