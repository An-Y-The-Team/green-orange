import type { Response } from "express";

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

/**
 * Row count of the WHOLE filtered collection, not of the page — so a list view
 * can say "N công trình" instead of labelling one page's length as a total.
 *
 * A header, not a `{ rows, total }` envelope: additive, so all existing
 * consumers of these 15 endpoints keep reading a bare array untouched and each
 * page opts in when it wants the number.
 *
 * NOT in `Access-Control-Expose-Headers` (see `main.ts`'s `enableCors`): every
 * reader is a crm-web Server Component doing a server-to-server fetch, where
 * CORS does not apply. Exposing it would advertise a browser contract nothing
 * uses; add it the day browser JS calls these endpoints directly.
 */
export const TOTAL_COUNT_HEADER = "X-Total-Count";

/**
 * Answers a paginated list with its `X-Total-Count`.
 *
 * Callers build the `where` ONCE and pass it to both queries, so the count
 * cannot describe a different filter than the rows it counts — a total that
 * silently drifts from its page is worse than no total at all.
 *
 * `Promise.all`, not `$transaction`: Prisma runs an interactive transaction's
 * statements sequentially, and at Postgres' default READ COMMITTED each
 * statement takes its own snapshot anyway — so a transaction would double the
 * latency and hold a connection longer while buying no consistency. Worst case
 * a concurrent insert makes the header off by one for one request.
 *
 * Handlers must obtain `res` as `@Res({ passthrough: true })`. Without
 * `passthrough` Nest stops managing the response, the returned array is never
 * sent and the global `SerializeInterceptor` never runs — BigInt money and
 * `*_date` columns would leave in their raw form, breaking the contract
 * silently.
 */
export const withTotalCount = async <TRow>(
  res: Response,
  rows: Promise<TRow[]>,
  total: Promise<number>
): Promise<TRow[]> => {
  const [page, count] = await Promise.all([rows, total]);
  res.setHeader(TOTAL_COUNT_HEADER, count);
  return page;
};
