# CRM UI v2 — Implementation Plan (phases 2–6, file-level)

Working plan for building `apps/crm-web` against the v2 backend. Written so
a fresh session can pick up any phase without prior context. Iterate on
this doc as phases land — tick items, adjust file lists, log decisions in
the changelog.

**Read first, in order:**

1. `docs/features/crm-ui-redesign.md` — the design truth (all 9 stage
   panels confirmed, wireframes, IA, principles).
2. This doc — build mechanics.
3. For payload shapes: the Nest controllers are authoritative —
   `apps/crm-api-nest/src/<feature>/*.module.ts` (types in crm-web already
   mirror them as of phase 1).
4. `docs/features/crm-database-schema.md` — columns + EN↔VN glossary.

## Standing rules (do not relearn these)

- **Pages, not dialogs**: entity create/edit = dedicated route or inline
  form. Dialogs ONLY for tiny confirms (Hủy reason, date pick, status
  flip, channel picker). User strongly dislikes modal forms.
- Vietnamese ONLY via `src/lib/labels.ts`; enums/fields English.
- `*_date` = 'YYYY-MM-DD' strings; `*_at` = full ISO; money/hours numbers.
- Derived, never stored: Quá hạn (`isOverdue` in `lib/format.ts`), trễ
  chip, superseded quotes (`version < max` per project), timekeeping
  conflicts.
- Data seam: per-feature `queries.ts` (`API_URL ? apiFetchSafe : mock`),
  writes = `"use server"` actions in `<feature>/actions/*.ts` calling
  `apiSend` (`lib/http.ts`), zod schema colocated, `revalidatePath`,
  `ServerActionState` + `use-server-actions` hook from `@yan/shared`.
  Phase 1 deleted all v1 actions — recreate per phase with v2 payloads.
- Stage-gate 400s from the server → toast the server message; but panels
  must show gate checklists so users rarely hit them.
- Bun only; user owns ALL git operations; Codex reviews output.
- Local run gotcha: `apps/crm-web/.env` sets `CRM_API_URL` + Authentik →
  mock-mode smoke needs `CRM_API_URL= AUTH_AUTHENTIK_ISSUER= bun run
start` (port pinned 3002). Live test: boot API from `apps/crm-api-nest`
  `PORT=8001 AUTH_MODE=local node dist/main.js`, web with
  `CRM_API_URL=http://localhost:8001`.
- Verify each phase: `bunx tsc --noEmit`, `bunx eslint src
--max-warnings 0`, `bun run build`, curl smoke in mock AND live mode.

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

## Deferred / blocked (do not build without a new decision)

- Cost module (own design session), S3 uploads (attachments stay
  metadata-only), Zalo mini-app ingest, bank-feed bill auto-flip,
  Python crm-api + docs/tasks update for students.

## Changelog

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
