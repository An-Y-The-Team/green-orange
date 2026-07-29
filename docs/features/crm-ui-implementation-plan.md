# CRM UI v2 — Implementation Plan (phases 2–6, file-level)

Working plan for building `apps/crm-web` against the v2 backend. Written so
a fresh session can pick up any phase without prior context. Iterate on
this doc as phases land — tick items, adjust file lists, log decisions in
the changelog.

**Read first, in order:**

1. `docs/features/crm-ui-redesign.md` — the design truth (all stage panels
   confirmed, wireframes, IA, principles). **8 stages since 2026-07-25** —
   phases 1–6 below shipped against the older 9-stage numbering, so read their
   stage numbers as historical; phase 7 is the merge.
2. This doc — build mechanics.
3. For payload shapes: the Nest controllers are authoritative —
   `apps/crm-api-nest/src/<feature>/*.module.ts` (types in crm-web already
   mirror them as of phase 1).
4. `docs/features/crm-database-schema.md` — columns + EN↔VN glossary.

> **2026-07-29 — mock mode was removed; the phase notes below are history.**
> Phases 1–7 really were accepted via a **mock-mode smoke test** (`CRM_API_URL=`
> unset → pages rendered fixtures from `apps/crm-web/src/data/mock/`). Phase 6 of
> `docs/fixes/v2-business-flow/` deleted that path entirely, so those exact
> commands and every `data/mock/*` file listed below no longer exist. The phase
> notes are left as written — they record how the work was actually verified.
> **The equivalent check today** is against a seeded stack: Postgres up,
> `prisma migrate deploy` + `bun run seed` in `apps/crm-api-nest`, the API
> running, and `CRM_API_URL` pointed at it (root `README.md` has the setup;
> `docs/fixes/v2-business-flow/F41-seed-replaces-mock-coverage.md` is why the seed
> now carries the edge cases the fixtures used to). The **Standing rules** section
> immediately below is live guidance and has been corrected in place.

## Standing rules (do not relearn these)

- **Pages, not dialogs**: entity create/edit = dedicated route or inline
  form. Dialogs ONLY for tiny confirms (Hủy reason, date pick, status
  flip, channel picker). User strongly dislikes modal forms.
- Vietnamese ONLY via `src/constants/labels.ts`; enums/fields English.
- `*_date` = 'YYYY-MM-DD' strings; `*_at` = full ISO; money/hours numbers.
- Derived, never stored: Quá hạn (`src/utils/is-overdue/is-overdue.ts`), trễ
  chip, superseded quotes (`version < max` per project), timekeeping
  conflicts.
- Data seam: per-feature `queries.ts` reading through `apiFetchSafe`,
  writes = `"use server"` actions in `<feature>/actions/*.ts` calling
  `apiSend` (`src/utils/http/http.ts`), zod schema colocated, `revalidatePath`,
  `ServerActionState` + `use-server-actions` hook from `@yan/shared`.
  Phase 1 deleted all v1 actions — recreate per phase with v2 payloads.
- Stage-gate 400s from the server → toast the server message; but panels
  must show gate checklists so users rarely hit them.
- Bun only; user owns ALL git operations; Codex reviews output.
- Local run: `CRM_API_URL` is **required** — there is no offline mode. Seed the
  DB once (`prisma migrate deploy` + `bun run seed` in `apps/crm-api-nest`),
  boot the API `PORT=8001 AUTH_MODE=local node dist/main.js`, then web with
  `CRM_API_URL=http://localhost:8001 bun run start` (port pinned 3002).
  `AUTH_AUTHENTIK_ISSUER=` unset still turns auth off — that switch is
  independent and survives.
- Verify each phase: `bunx tsc --noEmit`, `bunx eslint src
--max-warnings 0`, `bun run build`, curl smoke against the seeded stack.

## Current state (after phase 1, 2026-07-23)

Contract layer done: v2 `enums.ts`/`types.ts`/mocks per feature,
`labels.ts`/`format.ts`/nav rebuilt, legacy routes (leads/deals/tasks/
contacts) and ALL v1 dialogs/actions/schema.ts deleted. Every page is
**read-only** and renders in mock + live. `projects/[id]/page.tsx` is a
placeholder (badge strip + facts card). Template editor
(`contracts/templates/**`) compiles on v2. Backend fully implements the
design (deltas applied, incl. closed-project lock, settlement sign
choreography, auto-seeded paperwork).

## Phase 2 — Workspace shell + intake ✅ (2026-07-23)

Goal: the guided workspace skeleton (header, interactive stepper, status
actions, Zone-3 tabs) + the `/projects/new` intake page. Stage panels
render as simple stubs (facts only); panel logic is phases 3–4.

**Shipped.** All files below created/changed; `tsc`, `eslint
--max-warnings 0`, `bun run build` clean; mock-mode smoke of
`/projects/new`, `/projects/[id]`, `/projects`, `/dashboard` all 200.
Notes: `POST /projects` has no `appointment_at` — `createProject` does
POST then PATCH; `listProjectTypes` added to `projects/queries.ts`; no
`<Select>` in `@yan/ui` (native `<select>` + `selectClass`); `@yan/ui`
`Button` is Base UI (`render={<Link/>}`, not `asChild`). Zone-3 Nhân sự
(phase 5) + Thanh toán (phase 4) tabs are stubs.

New files:

- `projects/new/page.tsx` — intake page per redesign "Stage 1" wireframe:
  client search-select (existing clients via `listClients`), inline
  expandable quick-create (name+type only), contact/location selects
  auto-filled from chosen client (individuals: hide both), type-tag
  multi-select (`listProjectTypes`), name auto-suggest "{type}
  {location}", request_note, referral_source, appointment date+time
  (today prefilled). Submit → POST /projects → redirect to workspace.
  Server component + one client form component
  (`projects/new/intake-form.tsx`).
- `projects/actions/create-project.ts` — zod + apiSend POST /projects
  (payload: client_id, location_id, working_contact_id?,
  decision_maker_contact_id?, name, type_ids, request_note?,
  referral_source?, appointment_at). Backend defaults contacts + seeds
  paperwork.
- `projects/actions/update-project.ts` — generic PATCH /projects/:id used
  by: stage moves, status changes (cancelled needs cancel_reason; on_hold
  needs follow_up_date; reactivate), field edits. One action, zod'd.
- `clients/actions/create-client.ts` — quick-create (name, type) for the
  intake inline section.
- `projects/[id]/components/workspace-header.tsx` — code/name/status
  badge/type tags/client→location→contacts line; actions: [Hoãn ▾]
  (date confirm), [Hủy] (reason confirm), [Kích hoạt lại]; banner when
  on_hold/cancelled (frozen stage + reason/follow-up).
- `projects/[id]/components/stage-stepper.tsx` — 9 steps from
  `projectStageOrder`; past filled, current highlighted; next-step is a
  button calling update-project (server rejects if gated → toast); below
  `md`: compact "4/9 · Hợp đồng" pill.
- `projects/[id]/components/stage-panel.tsx` — switch on `project.stage`
  rendering `panels/<stage>.tsx`; phase 2 ships stubs showing the facts
  already on the placeholder page.
- `projects/[id]/components/workspace-tabs.tsx` — Zone 3: Báo giá
  (quotes list for project, read-only), Hồ sơ (paperwork table from
  phase 1), Nhân sự (assignments read-only), Thanh toán (milestones/bills
  read-only), Ghi chú & tệp (notes timeline + attachments +
  add-note form).
- `projects/actions/add-note.ts` — POST /project-notes (notes allowed
  even on closed projects).

Changed files:

- `projects/[id]/page.tsx` — compose header + stepper + panel + tabs;
  fetch project detail + quotes + paperwork + milestones/bills (gate
  data) server-side.
- `projects/queries.ts` — add `getProjectQuotes`/reuse quotes feature
  queries; whatever include gaps surface.
- `projects/page.tsx` + `dashboard/page.tsx` — "+ Tiếp nhận yêu cầu"
  buttons → link `/projects/new`.
- `data/mock/*` — only if new includes are needed.

## Phase 3 — Stage panels 1–5 + quote builder ✅ (2026-07-23)

Goal: pre-execution pipeline fully operational.

**Shipped.** All panels/actions/pages below built; `tsc`, `eslint
--max-warnings 0`, `bun run build` clean; mock-smoke of every real panel
(request/survey/quote/contract/paperwork via temporary stage-flips),
quote builder (`?from=survey`/`?edit=`/blank), contract authoring, and
worker-list print — all 200. Contract findings: vat_rate is a **fraction
0..1** (UI shows %); milestone status advances **one step at a time**
(record-deposit = POST + 2 PATCHes); contract template body is **not**
copied server-side (editor pre-fills client-side); paperwork has **no**
server forward-only guard (UI enforces). New per-project queries added:
`getProjectContracts`, `getProjectMilestones`, `listProjectAttachments`.
`stage-panel.tsx` dispatches to `panels/*.tsx`; contract panel returns a
bare body so the dispatcher wraps it in the standard Card. Attachments
are metadata-only (`s3_key`=filename). Worker-list print is live (reused
`listAssignments`). Stages 6–9 remain read-only stubs (phase 4).

New files:

- `projects/[id]/components/panels/request.tsx` — appointment card,
  [Dời hẹn] (date-time confirm → update-project), [Đã gặp khách] (sets
  visit_date + stage survey in one PATCH).
- `projects/[id]/components/panels/survey.tsx` — survey_items inline row
  editor (add/remove/edit rows → update-project), survey_note textarea
  with save, attachments metadata list (`projects/actions/
add-attachment.ts` + delete), [Đủ dữ liệu — lập báo giá] (stage→quote +
  redirect to builder).
- `projects/[id]/quotes/new/page.tsx` + `quote-builder-form.tsx` —
  builder per redesign: items table prefilled from `survey_items`
  (`?from=survey`) or a superseded version (`?revise=<quoteId>`), VAT
  editable (default 8), terms textarea (note), [Lưu nháp] / [Lưu & gửi
  ngay]. Display totals via `quoteTotals`; server authoritative.
- `quotes/actions/`: `create-quote.ts` (POST /quotes), `update-quote.ts`
  (PATCH draft), `send-quote.ts` (POST /quotes/:id/send — channels
  multi-select → one call per channel, sent_by), `decide-quote.ts` (POST
  /quotes/:id/decide + **chained**: deal → nothing extra; on_hold →
  update-project on_hold + follow_up_date; rejected → update-project
  cancelled + reason. Prompts prefilled "Khách hoãn/hủy báo giá v{n}"),
  `revise-quote.ts` (POST /quotes/:id/revise → redirect builder),
  `delete-quote.ts` (drafts).
- `projects/[id]/components/panels/quote.tsx` — versions rail per
  redesign stage-3 wireframe; per-state actions; send = small dialog
  (channel checkboxes + sent_by — allowed tiny confirm).
- `projects/[id]/components/panels/contract.tsx` — gate checklist (quote
  deal ✓ from data; [Ghi nhận đã ký] date confirm → client_signed_date;
  [Ghi nhận cọc] amount+date confirm, prefill 60% of deal quote total →
  `receivables/actions/record-deposit.ts`: POST /payment-milestones
  type deposit + transition to paid); contracts card (list, [+ Tạo hợp
  đồng] → existing template flow — re-add a v2 `contracts/new` page
  reusing the Lexical editor with project_id param; [Đánh dấu đã ký] →
  `contracts/actions/sign-contract.ts` PATCH status signed + chained
  update-project client_signed_date if empty).
- `projects/[id]/components/panels/paperwork.tsx` — checklist rows:
  one-tap status advance (`paperwork/…` actions live in
  `projects/actions/paperwork.ts`: create/update/advance/delete item,
  due_date field), expandable note+attachment, derived overdue chip,
  [Tạo từ phân công] → printable worker-list page
  `projects/[id]/print/worker-list/page.tsx` (DocumentShell, rows from
  assignments).

Changed: `stage-panel.tsx` switch; `quotes/page.tsx` link "new version"
into builder; `contracts` list page gets [+] back (to the v2 new page).

## Phase 4 — Stage panels 6–9 + receivables writes ✅ (2026-07-24)

**Shipped.** All panels/actions/pages below built; `tsc`, `eslint
--max-warnings 0`, `bun run build` clean; mock-smoke of every panel
(execution/acceptance/settlement/closed via temp stage-flips), settlement
builder, settlement+bill printables, acceptance-request letter, and
receivables row actions — all 200. Findings baked in: **no `/send`
routes** (status flips are `PATCH {status}`); **settlement create
auto-makes a draft bill**; **sign = `PATCH {status:signed}`** (server
does bill officialize + deposit attach + remainder milestone); bill
status = any forward jump, settlement/milestone = one step; **no `code`**
on settlements/bills (shown as `QT #id`/`HĐ #id`); `acceptance_sub_status:
"request_sent"` is **not** auto-set → the stage-6 exit sends
`{works_done_at, stage:acceptance, acceptance_sub_status:request_sent}` in
one PATCH. **`"use server"` files must export only `async` functions** —
a non-async `export function` gets silently dropped ("module has no
exports"), caught at build not tsc. New project-scoped queries:
`getProjectBills`, `getProjectSettlements`, `getProjectAssignments`,
`getProjectTimekeeping`. Intake `?from=<id>` repeat-business prefill added.

New files:

- `panels/execution.tsx` — sub-status stepper (skippable Dựng rào), note
  prompt per advance (→ add-note with sub-status context), start_date /
  est_duration_days / actual_duration_days fields, derived est-end +
  "trễ" chip, timekeeping-derived hours+days beside manual with ⚠ +
  [Xem chênh lệch] comparison modal (per-day records; allowed dialog),
  [Xác nhận hoàn tất thi công] (works_done_at + stage acceptance) with
  optional image-log attachments.
- `panels/acceptance.tsx` — transitions per redesign (rework note
  REQUIRED), history from notes, [In thư yêu cầu] →
  `projects/[id]/print/acceptance-request/page.tsx` (DocumentShell
  letter: lịch + biên bản + hình ảnh), Đạt stamps handled server-side.
- `panels/settlement.tsx` — settlement cards list (phases), embedded
  bill + its milestones per card, totals footer, [+ Quyết toán mới].
- `projects/[id]/settlements/new/page.tsx` + `[settlementId]/edit` —
  builder like quote builder, prefilled from deal-quote items
  (quantities → actuals); `receivables/actions/`: create/update/delete
  settlement (drafts), `send-settlement.ts`, `sign-settlement.ts`
  (backend does bill flip + cọc allocation + remainder milestone),
  `update-bill.ts` (sent/paid flips, dates default today),
  `milestone-actions.ts` (create/split/edit/transition/delete not_due).
- Settlement printable `receivables`-side or
  `projects/[id]/print/settlement/[id]/page.tsx`; bill printable "Đề
  nghị thanh toán" similar.
- `panels/closed.tsx` — read-only recap (stamps, money, doc links),
  [Mở lại] (update-project stage settlement — allowed on closed),
  [+ Công trình mới tại địa điểm này] → `/projects/new?from=<id>`
  (intake page prefills client/location/contacts from query param).

Changed: `receivables/page.tsx` gets row actions (record payment, bill
flips) via the new actions; workspace lock UX: when stage closed, hide
mutating controls except notes + reopen (server enforces anyway).

## Phase 5 — Crew, dashboard money blocks, settings ✅ (2026-07-24)

**Shipped.** `tsc`, `eslint --max-warnings 0`, `bun run build` clean;
route smoke of `/crew` (tabs), `/crew/new`, `/crew/[id]/edit`,
`/settings`, `/dashboard` (Công nợ), `/projects/[id]` (Nhân sự tab) all 200. Contract findings: crew member DELETE 409s if it has
assignments/timekeeping (UI's primary "leave" action = `PATCH
{status:"left"}`, delete only for never-used); role + project-type DELETE
409 if referenced; role name `@unique` (dup → raw error, surfaced);
timekeeping POST is an **upsert** on `(crew_member_id, project_id,
work_date, source)`, no PATCH, UI writes `source:"manual"`, `zalo_app`
rows read-only; assignment `overlaps` only on POST/PATCH responses
(non-blocking amber chip). `apiSend` discards the 409 JSON body so
counts (e.g. "N project(s)") aren't shown — generic VN message instead.
`WorkspaceTabs` gained `{assignments, crew, roles}` props (fed by
`page.tsx`, assignments now fetched every stage). Added
`listAllPaperworkItems` (dashboard overdue feed). Built via 4 fan-out
subagents (crew page / timekeeping grid / assignments / dashboard+settings);
integrator wired the `page.tsx` → `WorkspaceTabs` seam.

- `crew/new/page.tsx` + `crew/[id]/edit/page.tsx` (or inline edit on
  detail) + `crew/actions/` (member CRUD; roles CRUD with 409 handling).
- `/crew` tabs: Danh sách · Vai trò (role list manage) · Chấm công
  (grid: pick project → member×day hours entry, upsert via
  `crew/actions/timekeeping.ts`; zalo_app rows read-only chip).
- Assignments editing in workspace Nhân sự tab (`crew/actions/
assignments.ts`, non-blocking overlap warning from response
  `overlaps`).
- `dashboard/page.tsx` — add Công nợ block (awaiting + derived overdue
  from receivables queries) alongside existing Hôm nay / pipeline / Cần
  theo dõi; paperwork-overdue feeds Cần theo dõi.
- `app/(dashboard)/settings/page.tsx` — Danh mục: project-types CRUD
  (`projects/actions/project-types.ts`) + link card to templates; add
  nav item (Settings icon) in `config/nav.ts`.

## Phase 6 — Field mode (`/field`) ✅ (2026-07-24)

**Shipped — final phase; crm-web v2 rebuild complete.** `tsc`, `eslint
--max-warnings 0`, `bun run build` clean; `/field` smoked 200 with all
four cards rendering (appointment w/ Gọi `tel:` + Bắt đầu khảo sát, quote
Chốt/Hoãn/Hủy, execution Xác nhận hoàn tất, intake link + bottom bar).
New `(field)` route group with its OWN layout (no middleware exists —
auth is per-layout, so the `force-dynamic` + `authEnabled`/`auth()`/
`needsLogin`→`<LoginOverlay/>` block was cloned from `(dashboard)/
layout.tsx`; providers are root-level, not re-added). Reuses
`decideQuote`/`updateProject`/`listProjects`/`listQuotes` — no new
backend. **Gotcha: `GET /projects` list omits `working_contact`**, so the
[Gọi] tel link needs the detail — the page refetches today's appointments
via `getProject` (detail includes the contact); embedded `working_contact`
in the mock so it mirrors the detail endpoint + is verifiable. **Ops
gotcha: killing the `bun run start` wrapper leaves the child `next start`
holding port 3002** → next boot silently binds nothing and a STALE server
answers (false-negative smokes). Always `lsof -ti tcp:3002 | xargs kill`
and confirm "✓ Ready" before smoking. Built by one focused agent (a 4-way
fan-out would be over-engineering for one page + one layout).

- Route group `app/(field)/field/page.tsx` with own minimal layout
  (bottom bar, no sidebar; reuse auth/providers). Blocks per redesign:
  today's appointments (tap → Gọi tel: link / Bắt đầu khảo sát), quick
  intake link, Chờ quyết định quote cards ([Chốt]/[Hoãn]/[Hủy] reusing
  decide action), stage-6/7 sub-status bump buttons for projects in
  execution/acceptance. Everything else deep-links to desktop pages.
- Decide after usage: whether TanStack Query (already provisioned in
  providers) is needed for snappier field interactions.

## Phase 7 — collapse Yêu cầu + Khảo sát into one stage ✅ (2026-07-25)

Business change: the appointment **is** the khảo sát visit (same day), so
`request` + `survey` become one stage `request` — 9 stages → 8. Design in
`crm-ui-redesign.md` "Stage merge delta" + Stage 1.

**Shipped.** `tsc`, `eslint --max-warnings 0`, `bun run build` clean both
apps; nest tests 14 pass. Mock smoke: `/projects/4` (new stage-1 mock) shows
the appointment half only, and with `visit_date` temp-set the survey half
(Hạng mục đo đạc / Ghi chú khảo sát / Hình ảnh / Đủ dữ liệu) renders in the
same card while the [Đã gặp khách] input disappears; stepper renders 8 steps
with no bare "Khảo sát" chip anywhere; `/dashboard`, `/projects`, `/field`,
`/projects/new` all 200 (intake stage selector offers `request`,`quote`,… no
`survey`). Live: migration applied to local `crm_nest` and **verified on a
real row** (a project temp-set to `survey` came out `request`), `migrate
status` clean, API boots on the new schema.

Findings: `projects.module.ts` derives its stage whitelist from `STAGE_ORDER`
(`const STAGE = STAGE_ORDER`, `@IsIn(STAGE)` on both DTOs), so dropping the
value from `common/stage.ts` tightens validation everywhere — **the `"survey"`
at `projects.module.ts:45` is `ATTACHMENT_KIND`, not a stage; touching it
would have broken survey photo uploads.** Same trap in `[id]/page.tsx` and
`mock/attachments.ts`: `listProjectAttachments(id, "survey")` is the file
category and stays. The dashboard has **no** pipeline block anymore (removed
in `02501ac`), so the redesign's "8 columns" is spec-only.

Backend (`apps/crm-api-nest`):

- `prisma/migrations/20260725000000_merge_request_survey_stage/migration.sql`
  — data-only: `UPDATE "Project" SET stage='request' WHERE stage='survey'`.
  `stage` is a plain `String` column, so no type surgery.
- `src/common/stage.ts` — `"survey"` out of `STAGE_ORDER` (8 entries).
  `advanceStage` compares indices, so every later stage shifts down one.
- `prisma/schema.prisma` — stage comment; `visit_date` re-documented as an
  in-stage marker; `survey_note`/`survey_items` now "stage 1";
  `client_signed_date` "stage-3 gate 1".
- `src/contract.test.ts` — new case: `STAGE_ORDER` has 8 entries, no
  `"survey"`, starts at `"request"` (re-adding one would silently shift
  every index).

Frontend (`apps/crm-web`):

- `projects/enums.ts` — `SURVEY` deleted, stage comments renumbered.
- `src/constants/labels.ts` (then `lib/labels.ts`) — out of `projectStageOrder`; `REQUEST` relabelled
  "Yêu cầu & Khảo sát". Stepper, the "n/8" pill and the intake stage selector
  all derive from that array — no edits needed there.
- `panels/request.tsx` — takes `attachments`; [Đã gặp khách] PATCHes
  `{visit_date}` only (no stage move) and that input/button is replaced by
  `<SurveyPanel/>` once `visit_date` is set.
- `panels/survey.tsx` — now a **bare body** (`<div className="space-y-6
border-t …">`), same pattern as `ContractPanel`; keeps its own
  "Đã gặp khách: … [sửa]" row and its `stage: QUOTE` exit.
- `stage-panel.tsx` — `SURVEY` case deleted; the contract case's hardcoded
  "Giai đoạn 4" is now computed from `projectStageOrder`.
- `[id]/page.tsx` — `isSurvey` → `isRequest` (gates the survey-attachment
  fetch).
- `(field)/components/field-appointment-card.tsx` — `{visit_date}`-only PATCH.
- **`dashboard/page.tsx` + `(field)/field/page.tsx` — "Hôm nay" filters gained
  `!p.visit_date`.** Without it a visited project stays in stage 1 and would
  sit on the Hôm nay list forever offering "Bắt đầu khảo sát" again.
- `data/mock/projects.ts` — new project 4 at stage 1, appointment today, no
  `visit_date`: the only state that exercises both Hôm nay blocks and the
  pre-visit panel (nothing was seeded at stage 1 before).

Not done: authenticated live HTTP smoke of the PATCH paths — no local dev
credentials on this machine (`CRM_DEV_USER`/`CRM_DEV_PASSWORD` are unset in
both `.env`s; only the argon2 hash for `admin` exists in the DB). Run
`curl -X PATCH :8001/projects/<id> -d '{"stage":"survey"}'` with a real token
to confirm the 400, and one `{"visit_date":"…"}` PATCH for the happy path.

Not in scope: renumbering the shipped-phase notes below — they are history.
The Python `crm-api` sandbox still has its own `KHAO_SAT` stage (already on
the deferred list below).

## Deferred / blocked (do not build without a new decision)

- Cost module (own design session), S3 uploads (attachments stay
  metadata-only), Zalo mini-app ingest, bank-feed bill auto-flip,
  Python crm-api + docs/tasks update for students.

## Changelog

- 2026-07-25 — phase 7 shipped: stages 1+2 collapsed into one "Yêu cầu &
  Khảo sát" stage — the appointment is the survey visit. 9 → 8 stages,
  `survey` dropped from `STAGE_ORDER`/`ProjectStage` + a data-only migration,
  [Đã gặp khách] stops moving the stage and instead reveals the survey half of
  the same panel (`survey.tsx` became a bare body embedded by `request.tsx`).
  Both "Hôm nay" filters gained `!visit_date` so visited jobs drop off. New
  stage-1 mock project. Docs updated (business-flow, database-schema,
  ui-redesign). Phases 1–6 notes keep their original 9-stage numbering as
  history.
- 2026-07-24 — phase 6 shipped (FINAL): field mode `(field)` route group at
  `/field` — thumb-first mobile with its own auth-gated layout (cloned from
  dashboard) + bottom bar. Blocks: today's appointments (Gọi tel: + one-tap
  Bắt đầu khảo sát), quick intake link, Chờ quyết định quote cards
  (Chốt/Hoãn/Hủy reusing decideQuote), Đang thi công/nghiệm thu sub-status
  bumps + Xác nhận hoàn tất (reusing updateProject). All reuse existing
  actions/queries. Fixed [Gọi] (list omits working_contact → refetch detail
  via getProject). **crm-web v2 rebuild complete (phases 1–6).**
- 2026-07-24 — phase 5 shipped: crew management + dashboard money + settings.
  `/crew` is now a tabbed page (Danh sách roster + member CRUD via
  `/crew/new` + `/crew/[id]/edit`; Vai trò inline role CRUD; Chấm công
  members×days weekly timekeeping grid w/ manual-upsert-on-blur + read-only
  zalo_app cells). Workspace Nhân sự tab is a live assignments editor
  (add/edit/delete + non-blocking overlap chip). Dashboard gained a Công nợ
  block + overdue-paperwork in Cần theo dõi. New /settings (Danh mục:
  project-types inline CRUD + templates link) + nav item. Built via 4
  fan-out subagents; integrator wired page.tsx → WorkspaceTabs props.
- 2026-07-24 — phase 4 shipped: stage panels 6–9 + receivables writes.
  Execution (sub-status stepper w/ skippable hoarding, optional notes,
  duration dual-source + Xem chênh lệch timekeeping modal, exit stamps
  works_done_at + enters acceptance w/ request_sent), acceptance
  (transitions w/ required rework note, history from notes, printable
  request letter), settlement (cards list, builder prefilled from deal
  quote, send/sign choreography, bill + milestone actions, settlement &
  bill printables), closed (recap + Mở lại → settlement + repeat-business
  intake ?from). Receivables page gained row actions. Built via 4
  fan-out subagents (one interrupted at its report step but files were
  complete); integrator wired the full 9-stage dispatcher + page.tsx
  stage-gated fetches, fixed a `"use server"` non-async-export build error.
- 2026-07-23 — phase 3 shipped: stage panels 1–5 wired into the workspace
  dispatcher. Quotes (builder page `?from=survey`/`?edit=`, versions rail,
  send/decide/revise/delete actions with chained project on_hold/cancelled),
  contracts (gate checklist + client-signed + 60%-deposit via record-deposit
  3-step, contract authoring page reusing Lexical editor, sign-contract
  chaining client_signed_date), paperwork (one-way status stepper + due_date
  overdue), request/survey panels + attachments layer (metadata-only). Built
  via 4 fan-out subagents (one per stage-group); integrator wired
  stage-panel switch + page.tsx stage-gated fetches.
- 2026-07-23 — phase 2 shipped: `/projects/new` intake (search-select
  client + inline quick-create + dependent contact/location selects via
  `loadClient` loader action), workspace shell (header w/ Hoãn/Hủy/Kích
  hoạt lại, 9-step stepper w/ server-gated stage moves, stub stage
  panels, Zone-3 tabs), 4 server actions (create/update-project,
  add-note, create-client) + `listProjectTypes`; "+ Tiếp nhận yêu cầu"
  wired on projects list + dashboard.
- 2026-07-23 — plan created after phase 1 shipped; phases renumbered
  (original phase 2+3 merged into "workspace shell + intake" then
  "panels 1–5") to match what phase 1 already covered.
