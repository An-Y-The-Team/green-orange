// Bounds for every user-bounded collection endpoint (`.claude/code-review.md`:
// unbounded collection queries block merge; backend-code-style.md §Pagination
// requires limit/offset plus a MAX_PAGE_SIZE cap).
//
// The default is deliberately larger than a typical web page size: no crm-web
// list view sends limit/offset yet (F17 wave 2 wires that up), and several
// callers aggregate the whole array in JS — dashboard debt totals, the quotes
// `maxVersion` map, timekeeping hour totals — so a small default would silently
// return wrong numbers instead of visibly paginating.
export const DEFAULT_PAGE_SIZE = 100;
export const MAX_PAGE_SIZE = 500;

// OFFSET is a scan, and Prisma rejects a skip above Int32 with a 500. Cap it:
// past this depth the answer is keyset pagination (order by id, `cursor`), not
// a bigger offset.
export const MAX_OFFSET = 1_000_000;

/** Raw `?limit=&offset=` exactly as they arrive on the query string. */
export type PageQuery = { limit?: string; offset?: string };

// Nonsense (missing, NaN, negative, fractional, limit=0) floors to the default
// rather than 400ing — a list view with a mangled query string should still
// render its first page.
const intOrDefault = ({
  raw,
  min,
  fallback,
}: {
  raw?: string;
  min: number;
  fallback: number;
}): number => {
  const n = Number(raw);
  return Number.isInteger(n) && n >= min ? n : fallback;
};

/**
 * Prisma `take`/`skip` for a list query, clamped to MAX_PAGE_SIZE / MAX_OFFSET.
 * Pair it with a total ordering (a unique tiebreaker) or pages overlap.
 */
export const pageArgs = ({
  limit,
  offset,
}: PageQuery): { take: number; skip: number } => ({
  take: Math.min(
    intOrDefault({ raw: limit, min: 1, fallback: DEFAULT_PAGE_SIZE }),
    MAX_PAGE_SIZE
  ),
  skip: Math.min(
    intOrDefault({ raw: offset, min: 0, fallback: 0 }),
    MAX_OFFSET
  ),
});
