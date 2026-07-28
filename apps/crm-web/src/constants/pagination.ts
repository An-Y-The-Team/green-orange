/**
 * Mirrors `apps/crm-api-nest/src/common/pagination.ts` — every list endpoint now
 * takes `?limit=&offset=`, defaults to 100 rows and clamps to 500.
 *
 * A read that came back with exactly MAX_PAGE_SIZE rows may have been cut off,
 * so anything that aggregates a whole list in JS must say so rather than show a
 * total that silently undercounts.
 */
export const MAX_PAGE_SIZE = 500;
