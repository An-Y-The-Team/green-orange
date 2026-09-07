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
