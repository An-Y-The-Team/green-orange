# Command Center — fitted spec (Điều hành hôm nay)

> Rewrite of the original Gemini plan, re-grounded on the **actual** crm-web
> codebase (GreenOrange cleaning/construction CRM). The original invented a
> `Job` model with crew/equipment/Zalo fields and camelCase props; none of that
> matched the repo. This version maps every idea onto real entities, the
> snake_case API contract, the RSC + server-action architecture, and `@yan/ui`.

> **2026-07-29 — status: never built, and its "ground truth" is v1.** There is no
> `command-center` route in `apps/crm-web`. This spec was written against the
> **pre-v2** codebase, so §0 below still names the 10 Vietnamese `ProjectStage`
> values and `listAcceptances()`, neither of which survived the v2 cutover (v2 has
> 8 English stages and replaced costs/acceptances with settlements + bills + an
> acceptance sub-status — see `crm-database-schema.md`). Two further changes since:
> `src/lib/` was split into `src/constants/` + `src/utils/*`, and **mock mode was
> removed** by Phase 6 of `docs/fixes/v2-business-flow/` — `CRM_API_URL` is now
> required and the dev dataset is `apps/crm-api-nest`'s seed. Stale paths and the
> mock-seeding instructions below are corrected in place (following them verbatim
> would fail); the design itself is untouched and would need a re-grounding pass
> on v2 before anyone builds it.

## 0. Ground truth (what already exists)

- **Spine is `Project` (Công Trình)**, not `Job`. Lifecycle `ProjectStage`:
  `yeu_cau → khao_sat → bao_gia → hop_dong → chuan_bi → thi_cong → nghiem_thu → quyet_toan → thanh_toan → dong`.
  See [projects/types.ts](<../../apps/crm-web/src/app/(dashboard)/projects/types.ts>), [projects/enums.ts](<../../apps/crm-web/src/app/(dashboard)/projects/enums.ts>).
- **Crew exists** ([crew/types.ts](<../../apps/crm-web/src/app/(dashboard)/crew/types.ts>)): `CrewMember` (name, phone, role, day_rate, status) and `Assignment` (`crew_id`, `project_code`, `role_on_site?`, `start_date?`) joined to a project by **`project_code`**. Reads via [crew/queries.ts](<../../apps/crm-web/src/app/(dashboard)/crew/queries.ts>) (`listCrew`, `listAssignments`).
- **Receivables** ([receivables/types.ts](<../../apps/crm-web/src/app/(dashboard)/receivables/types.ts>)): `PaymentMilestone` with `status` (`chua_den_han | cho_thanh_toan | da_thu | qua_han`).
- **Data seam**: every read is `apiFetchSafe(path, [])` in a route's `queries.ts`; every mutation is a `"use server"` action using `apiSend` ([utils/http/http.ts](../../apps/crm-web/src/utils/http/http.ts)). `CRM_API_URL` picks the backend and is **required** — a failing read degrades to `[]`, never to fixture data.
- **Pages are async Server Components.** Client behaviour lives in small `"use client"` island dialogs (see [assignments-tab.tsx](<../../apps/crm-web/src/app/(dashboard)/projects/[id]/components/assignments-tab/assignments-tab.tsx>)). **No `useEffect`** (AGENTS.md).
- **UI kit**: `@yan/ui` `Card`/`Badge`/`Table`/`Dialog`/`Button`. Labels + badge variants in [constants/labels.ts](../../apps/crm-web/src/constants/labels.ts); money via `formatVND` ([utils/format-vnd/](../../apps/crm-web/src/utils/format-vnd/format-vnd.ts)), dates via `formatDate` ([utils/format-date/](../../apps/crm-web/src/utils/format-date/format-date.ts)). **`receivables()` and `projectActuals()` no longer exist** — the old `lib/format.ts` was split up and those two rollups were dropped with it; the panels that need them (e.g. [panels/settlement/settlement.tsx](<../../apps/crm-web/src/app/(dashboard)/projects/[id]/components/panels/settlement/settlement.tsx>)) now sum milestones inline. Anything here that calls them has to compute its own total or add a shared helper first. **Vietnamese-first.** Do **not** hardcode `bg-red-100` etc. — use semantic tokens/variants.

### Fields that do NOT exist (decisions)

The original plan assumed `gateCode`, `equipmentList`, `locationContactPhone`,
`zaloDispatchSent`, `scheduledDate`, and a `BLOCKED` status. Mapping:

| Plan field               | Decision                                                                                                                         |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `scheduledDate`          | use existing `start_date` / `end_date`                                                                                           |
| `locationAddress`        | use existing `address`                                                                                                           |
| `assignedCrew: string[]` | derive from `Assignment` → `CrewMember.name` via the join                                                                        |
| `locationContactPhone`   | use the **assigned supervisor's** `phone` (crew `role = giam_sat`), not a new field                                              |
| `gateCode?`              | **net-new optional** `gate_code?: string` on `Project` (snake_case)                                                              |
| `equipmentList`          | **net-new optional** `equipment_notes?: string[]` on `Project`; section skipped when empty (there is no equipment master entity) |
| `zaloDispatchSent`       | **net-new optional** `zalo_dispatch_sent?: boolean` on `Project`                                                                 |
| `BLOCKED` status         | no such stage — the "needs attention" list is **derived** (see §3C), not a status                                                |

These three optional `Project` fields are additive and backward-compatible.
Add them to the Prisma `Project` model and set them on a project or two in [apps/crm-api-nest/src/seed.ts](../../apps/crm-api-nest/src/seed.ts) — there is no frontend fixture file to edit any more, so the column has to exist before the UI can read or write it. (The FastAPI v1 `Project` schema is a separate student exercise.)

## 1. Route & navigation

New route, **separate** from the existing financial overview at `/dashboard`
("Tổng quan"). Operations ≠ reporting; don't overwrite it.

- Path: `src/app/(dashboard)/command-center/page.tsx`
- Nav: add `{ label: "Điều hành", href: "/command-center", icon: Siren }` near the top of [config/nav.ts](../../apps/crm-web/src/config/nav.ts) (import `Siren` or `Radar` from `lucide-react`).

## 2. Data fetching (Server Component)

```tsx
// command-center/page.tsx — async RSC, parallel reads through the seams.
export default async function CommandCenterPage() {
  const [projects, assignments, crew, milestones, acceptances] =
    await Promise.all([
      listProjects(), // projects/queries
      listAssignments(), // crew/queries
      listCrew(), // crew/queries
      listPaymentMilestones(), // receivables/queries
      listAcceptances(), // projects/queries
    ]);
  const metrics = computeMetrics({
    projects,
    assignments,
    milestones,
    acceptances,
  });
  // ...derive activeProjects / pending lists, render
}
```

All joins are by **`project_code`** (mirror `byProject()` on the detail page).
Resolve crew per project: `assignments.filter(a => a.project_code === p.code)`
then map `crew.find(c => c.id === a.crew_id)`.

## 3. Component hierarchy (fitted)

```text
<CommandCenterPage>                     // async RSC — fetch + derive
  ├── <PageHeader title="Điều hành" ... />   // existing component
  ├── <ActionRibbon>                    // server; grid of 4
  │     └── <MetricCard> x4             // @yan/ui Card, semantic accent
  └── <div className="grid lg:grid-cols-[7fr_3fr] gap-6">
        ├── <DailyExecutionView>        // server, left 70%
        │     ├── date header
        │     └── <ActiveProjectRow>[]  // server; one per đang-thi-công project
        │           └── <ZaloDispatchDialog>   // "use client" island (trigger button)
        └── <PendingResolutionView>     // server, right 30%
              └── <ActionRequiredCard>[]// server; derived attention list
```

### A. ActionRibbon + MetricCard

Four metrics, all from real data (no equipment master, so the original
"equipment conflicts" becomes **crew double-booking**, which the assignment join
makes computable):

```ts
interface CommandCenterMetrics {
  unassigned_count: number; // active projects (thi_cong|chuan_bi) with 0 assignments
  crew_conflict_count: number; // crew_id assigned to >1 active project
  paperwork_count: number; // projects in stage = chuan_bi
  collectable_count: number; // milestones status in {cho_thanh_toan, qua_han}
  outstanding: number; // VND still owed — sum unpaid milestone amounts here
  //                      (`receivables()` is gone; see §0)
}
```

Cards (urgency via **semantic tokens**, not raw palette):

1. **Chưa phân công** — `unassigned_count`; `text-destructive` accent when `> 0`, else muted.
2. **Trùng lịch nhân sự** — `crew_conflict_count`; `text-destructive` when `> 0`.
3. **Chuẩn bị hồ sơ** — `paperwork_count`; `text-warning` (`warning` variant) when `> 0`.
4. **Chờ thu** — `collectable_count` with `formatVND(outstanding)` subtext; `text-success`/`text-destructive` by overdue presence.

Each card: `@yan/ui` `Card`; big number `text-3xl font-bold`, label under it. Wrap a `<Link>` to the relevant filtered list (`/projects`, `/crew`, `/receivables`) so a metric is actionable.

### B. DailyExecutionView (left, 70%)

- `Card`, header **"Công trình đang thi công"** + today's date (`formatDate(new Date().toISOString())`).
- "Active today" = `projects.filter(p => p.stage === ProjectStage.THI_CONG)` (optionally also where today ∈ [start_date, end_date]).
- List with `divide-y`. Each **`ActiveProjectRow`**:
  - **Status dot** driven by `PROJECT_STAGES[p.stage].variant` (reuse the existing variant→color mapping; don't invent new colors).
  - **Name** (bold, links to `/projects/${p.id}`) + **address** (`text-sm text-muted-foreground`).
  - **Crew badges**: assigned `CrewMember.name` as `Badge variant="secondary"` (+ `crewRole[...]`); show "Chưa phân công" `destructive` badge if none.
  - **Zalo indicator**: `Check` (lucide, `text-success`) when `p.zalo_dispatch_sent`, else a muted dot.
  - **Action**: `<ZaloDispatchDialog project={p} crewOnSite={...} />` trigger button (`size="sm" variant="outline"`).

### C. PendingResolutionView (right, 30%)

There is no `BLOCKED` status — the attention list is **derived** by unioning real
problem signals into a small typed shape, then rendered as cards:

```ts
type AttentionKind =
  | "unassigned" // active project, no crew
  | "overdue" // milestone status = qua_han
  | "acceptance" // acceptance status = co_van_de
  | "delayed"; // project schedule_outcome = delayed
interface AttentionItem {
  kind: AttentionKind;
  project_code: string;
  title: string; // project name
  detail: string; // e.g. "Quá hạn 12.500.000 ₫", "Nghiệm thu có vấn đề"
}
```

- `Card` (muted bg ok via `bg-muted/40`), header **"Cần xử lý"** (`font-semibold`).
- Each **`ActionRequiredCard`**: `border-l-4` accented by kind (`border-destructive` for overdue/acceptance, `border-warning` for unassigned/delayed), an uppercase tag `Badge` (`QUÁ HẠN` / `CHƯA PHÂN CÔNG` / `NGHIỆM THU` / `TRỄ HẠN`), title + detail, and a ghost `Button` linking to the right place (project detail, `/receivables`, or opening the crew-assign dialog).
- Empty state: "Không có việc cần xử lý 🎉".

### D. ZaloDispatchDialog (client island) + generator

`"use client"`, same shape as [assignments-tab.tsx](<../../apps/crm-web/src/app/(dashboard)/projects/[id]/components/assignments-tab/assignments-tab.tsx>):
controlled `Dialog`, `useState`, **no `useEffect`**. It is purely client-side
(clipboard) — no server action needed for copy. Optionally a tiny
`markDispatched` server action (`apiSend(/projects/{id}, "PATCH", {zalo_dispatch_sent:true})`)
to flip the flag + `revalidatePath` — which needs the column to exist in Prisma first
(see §0's field table).

```ts
// Pure helper, e.g. command-center/dispatch-text.ts. Sources only real fields.
export function buildZaloDispatch(
  project: Project,
  crewOnSite: CrewMember[]
): string {
  const supervisor = crewOnSite.find((c) => c.role === CrewRole.GIAM_SAT);
  const lines = crewOnSite.map(
    (c) => `- ${c.name} (${crewRole[c.role]}) ${c.phone}`
  );
  const equip = project.equipment_notes?.map((e) => `- ${e}`).join("\n");
  return [
    `📋 LỊCH TRÌNH THI CÔNG (${formatDate(project.start_date)})`,
    "----------------------------------",
    `🏢 Công trình: ${project.name}`,
    `📍 Địa chỉ: ${project.address}`,
    supervisor ? `📞 Giám sát: ${supervisor.name} - ${supervisor.phone}` : "",
    project.gate_code ? `🔑 Mã cổng: ${project.gate_code}` : "",
    "",
    "👷 Nhân sự:",
    lines.join("\n") || "- (chưa phân công)",
    equip ? `\n🛠️ Thiết bị cần chuẩn bị:\n${equip}` : "",
    "",
    "⚠️ Nhớ chụp hình Zalo báo cáo nhé!",
  ]
    .filter(Boolean)
    .join("\n");
}
```

- UI: `Dialog` with a readonly `<textarea>` (or `<pre>`) of the generated text + primary **"Sao chép gửi Zalo"** button → `navigator.clipboard.writeText(text)` then toast **"Đã sao chép"** (reuse the same toast the dialogs use via `@yan/shared/hooks/use-server-actions`, or call the toast lib directly for this non-action copy). On success, optionally fire `markDispatched`.

## 4. Build order

1. Add optional `gate_code?`, `equipment_notes?`, `zalo_dispatch_sent?` to the `Project` type, the Prisma model + a migration, and set them on a project or two in `apps/crm-api-nest/src/seed.ts`.
2. `computeMetrics` + derivation helpers (pure functions, unit-testable) in the route folder.
3. RSC `page.tsx` with `Promise.all` reads + `ActionRibbon`/`MetricCard` (server).
4. `DailyExecutionView` + `ActiveProjectRow` (server).
5. `ZaloDispatchDialog` client island + `buildZaloDispatch` + optional `markDispatched` action + any Vietnamese label additions to `src/constants/labels.ts`.
6. `PendingResolutionView` + `ActionRequiredCard` (server).
7. Nav entry.

## 5. Teaching-split note

Per the instructor/student division: this UI is **instructor-owned**, as is the seed
row it needs (`apps/crm-api-nest/src/seed.ts` — the frontend has no fixture files to
seed any more). The new `Project` fields and a real `PATCH /projects/{id}`
(+ `/assignments` reconciliation already stubbed) are natural **backend exercises** —
the page needs no UI change when a student's backend starts serving those fields,
because every read already goes through the `apiFetchSafe` seam.
