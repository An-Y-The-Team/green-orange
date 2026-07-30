# v2-business-flow review — what's left

The 46-fix plan and its 20 follow-ups are **done**; the per-fix working docs were deleted
once complete. This is the residue: everything that was deliberately deferred, plus the
decisions that need a human rather than a patch.

Nothing here blocks a merge or a deploy. Verified state at the time of writing:
`turbo run check-types lint test` 16/16 · builds green both apps · 138/138 crm-api-nest ·
97/97 crm-web · `prisma migrate diff` reports no drift.

## Testing gaps

- **`apiSend`'s 204 early-return has no regression test.** This is the P0 that broke every
  delete in live mode (`res.json()` on an empty body). The fix is one guard in
  `apps/crm-web/src/utils/http/http.ts`; a test stubbing a `Response` with
  `status: 204` and an empty body is ~5 lines. **This is the highest-value item on the
  page** — an untested P0 fix on 12 call sites. It has also never been exercised against a
  real backend, only reasoned about.
- **No DB-backed integration tests anywhere.** Both apps test pure logic against a fake
  Prisma; there is no Postgres test harness. The cross-entity ownership guards (a bill
  belonging to another project, a contact belonging to another client) are unit-tested but
  never exercised against real foreign keys.
- **`OidcService.verify` / `getJwks` untested** — needs a real Authentik or a
  monkey-patched global `fetch` plus an RS256 keypair. The refactor would be injecting the
  fetcher. The guard's _contract_ with it (verify throws → 401) is covered.
- **`AuthService.token()` untested** — argon2 verification and the signing path.
- **`clients`, `contracts`, `paperwork` modules untested** — deliberately deprioritised;
  the money modules (receivables, quotes, projects, crew) and auth are covered.
- **`docx-import` has no test, on purpose.** It is a 3-line `mammoth` wrapper with nothing
  pure to test — and it is **browser-only**: `{ arrayBuffer }` is honoured by mammoth's
  browser build but rejected by its node build. **Do not call `docxToHtml` server-side.**

## Small code residue

- `apps/crm-api-nest/src/common/pagination.ts:10` still justifies its large
  `DEFAULT_PAGE_SIZE` by citing the quotes `maxVersion` map among the JS-aggregating
  callers. That map is gone (replaced by a server-computed `is_latest`), so the comment is
  now wrong.
- **`revalidatePath` sweep never completed.** Only the two gaps found by review were
  fixed. Every action mutating an entity that appears on a list page needs both the detail
  and the list route revalidated; nothing enforces it.
- **`duration.tsx` is an async server shell wrapping a client child**, because fetching the
  timekeeping summary from a `"use client"` component without `useEffect` is impossible.
  Moving that fetch into `projects/[id]/page.tsx` beside the other parallel reads would
  remove both the extra file and a render waterfall (the summary currently resolves _after_
  the page's `Promise.all`).
- **`TimekeepingSummary` sits in `crew/queries.ts`** rather than `crew/types.ts`, purely for
  ownership reasons during the change. Trivial to move.
- **Two auth hardenings**, both one-liners, neither reachable with Authentik in practice —
  documented in `src/auth/auth.test.ts` as gaps rather than endorsed behaviour:
  an OIDC token with no identity claim provisions a shared `unknown` account; a local token
  without `sub` yields `req.user.username === undefined` while the type promises `string`
  (downstream that becomes a 500, not a 401).
- **`docx-import-button.tsx` has `try/finally` with no `catch`** and is called as
  `void handleFile(e)`, so a malformed or non-.docx upload is an unhandled rejection: the
  button re-enables and the user sees nothing. Same shape as the export-button bug already
  fixed. Also, mammoth's `messages` array (warnings about structure it could not map) is
  discarded, so content lost during import is silent.
- **The six `projects/[id]/print/*` routes have no `loading.tsx`** and therefore inherit the
  project workspace skeleton, briefly showing 9 stage chips over a document. Deliberate —
  they are opened by an explicit click, not navigated. One shared document-shaped skeleton
  at `projects/[id]/print/loading.tsx` would close it if it ever surfaces.

## Product decisions, not code

- **Correcting a partly-collected settlement has no in-app path.** The server refuses to
  un-sign once any non-deposit đợt is paid, and the UI now says so honestly instead of
  promising otherwise. The real answer is a credit-note / adjustment đợt — a product
  decision. The guard was deliberately not loosened.
- **Stored contract-template bodies were never migrated.** Save-time token validation
  protects templates authored from now on; a pre-existing body using one of the nine
  retired merge tokens still renders (loudly, in red) and fails its .docx export. Moot
  while prod has no data — reconsider if templates are ever authored before a migration.

## Files no fix owned

- **`apps/crm-api/app/api/routes/contacts.py`** docstring still promises crm-web's
  `/contacts` page will render live data when `NEXT_PUBLIC_API_URL` is set. Wrong twice —
  there is no such page in v2, and the variable is `CRM_API_URL`. It is the first file a
  student opens.
- **`.claude/agent-memory/codebase-navigator/crm-401-stale-dev-token.md`** describes
  "local/mock dev" (mock mode is gone) and points at `apps/crm-web/src/lib/http.ts` (now
  `src/utils/http/http.ts`). Left alone because `.claude/` is user configuration.

## Operational

- **The destructive-migration sign-off covers exactly one cutover.** `DEPLOY.md` §6c 2a
  records that the v2 drop-and-recreate was accepted because `crm_nest` held no production
  data (confirmed 2026-07-29). Once it carries real data, destructive changes need the
  additive `add column → backfill → drop` form — with an `AT TIME ZONE 'Asia/Ho_Chi_Minh'`
  cast, since a bare `::date` reintroduces the UTC day-shift bug — and a `pg_dump` first.
  `prisma migrate deploy` is idempotent (verified: data survives repeated redeploys, and a
  lost migration ledger aborts on the first `CREATE` rather than replaying the drops), but
  it will faithfully apply whatever new migration you commit, unattended, on container
  start.
- **`GET /timekeeping/summary` and the quotes `is_latest` field do not exist in the Python
  v1 sandbox**, so "switching backends is one env var" remains false for those panels —
  consistent with what `AGENTS.md` now says.
