/**
 * `?page=` → a 1-based page number.
 *
 * Junk (missing, NaN, 0, negative, fractional, an array from a repeated key)
 * floors to 1 — a mangled URL should still render the first page rather than
 * throw or send the API a negative offset. Mirrors the backend's own tolerance
 * (`crm-api-nest/src/common/pagination.ts` floors bad `limit`/`offset` too).
 *
 * ponytail: no upper bound here. The API clamps `offset` at MAX_OFFSET
 * (1_000_000), so an absurd `?page=` lands on an empty page instead of a 500;
 * the real answer past that depth is keyset paging, not a bigger offset.
 */
export function pageFromParam(raw: string | string[] | undefined): number {
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

/**
 * `?limit=&offset=` suffix for a list endpoint, empty when neither is set so the
 * API applies its own defaults (DEFAULT_PAGE_SIZE = 100).
 */
export function pageQuery({
  limit,
  offset,
}: {
  limit?: number;
  offset?: number;
}): string {
  const query = new URLSearchParams();
  if (limit) query.set("limit", String(limit));
  if (offset) query.set("offset", String(offset));
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

/**
 * How many pages `total` rows make at `pageRows` each — `total` being the whole
 * collection's count from the list response's `X-Total-Count`.
 *
 * Never 0: an empty list is one empty page, so callers can compare `page` against
 * this without a second "is it empty" branch.
 */
export function pageCount({
  total,
  pageRows,
}: {
  total: number;
  pageRows: number;
}): number {
  return Math.max(1, Math.ceil(total / pageRows));
}
