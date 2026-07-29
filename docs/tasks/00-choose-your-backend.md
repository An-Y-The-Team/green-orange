# 00 — Choose your backend: NestJS (production) or Python (learning)

There are **two** CRM backends in this repo, and since the **v2 cutover** they no
longer serve the same contract. Read this before you point `crm-web` anywhere.

| Backend                          | Port | Contract | Role                                                                   |
| -------------------------------- | ---- | -------- | ---------------------------------------------------------------------- |
| **`apps/crm-api-nest`** (NestJS) | 8001 | **v2**   | **Production** — the only backend that serves the current UI           |
| `apps/crm-api` (Python/FastAPI)  | 8000 | **v1**   | **Learning sandbox** — the backlog below; does **not** drive the v2 UI |

## ⚠️ The Python sandbox no longer drives the UI

`crm-web` was rebuilt for the v2 domain model (see
[`docs/features/crm-database-schema.md`](../features/crm-database-schema.md)).
`apps/crm-api` was **not** — it still implements the v1 contract. Two things
diverged at once:

- **Endpoints the UI now calls that v1 doesn't have:** `/settlements`, `/bills`,
  `/paperwork-items`, `/crew-roles`, `/assignments`, `/timekeeping`,
  `/project-types`, `/locations`, `/project-notes`, `/attachments`, `/crew`,
  `/quotes`, `/contracts`, `/contract-templates`, `/payment-milestones`.
- **Endpoints v1 has that the UI no longer calls:** `/leads`, `/deals`, `/tasks`
  (501 stubs), and `/costs` / `/acceptances` (never built; v2 replaced them with
  settlements/bills and an acceptance sub-status on the project).

Even where the **name** survived, the **shape** changed. v1 `Client` is
`name/email/phone/company/status`; v2 `Client` is `name/type/tax_code/email/note`
with nested `contacts` + `locations`. v1 `Contact` is a flat record with a
`company` string; v2 `Contact` hangs off a `client_id`. v1 `ProjectStage` has 10
Vietnamese-valued stages (`yeu_cau`, `khao_sat`, …); v2 has 8 English ones
(`request`, `quote`, …).

**So `CRM_API_URL=http://localhost:8000` does not render a working app.** Do not
use the UI as your signal that the Python backend works.

## How the seam actually behaves (no, it doesn't fall back to mock)

There are exactly two modes, decided by whether `CRM_API_URL` is set:

- **`CRM_API_URL` unset** → every page renders bundled **mock data**. No HTTP at all.
- **`CRM_API_URL` set** → every page hits that backend. `apiFetchSafe` degrades a
  failing list read to an **empty array**, never to mock data — so a missing or
  incompatible endpoint shows an **empty page**, not mock rows and not an error.
  That silence is why pointing the UI at `:8000` looks like "no data" rather than
  "wrong backend".

## Switching

One line in `apps/crm-web/.env`:

```bash
CRM_API_URL=http://localhost:8001   # NestJS — the working app
```

Restart crm-web after changing it. `turbo run dev` runs crm-web and both backends
at once. See [`apps/crm-api-nest/README.md`](../../apps/crm-api-nest/README.md)
for the NestJS backend; everything below (tasks 01–14) is the **Python v1**
learning track.

## What to do instead, as a student

The exercise is still real: **build the v1 contract in `apps/crm-api`.** What
changes is how you verify it.

1. **Verify with `/docs` and tests, not the UI.** `uv run pytest` plus the
   FastAPI Swagger UI at <http://localhost:8000/docs> are your feedback loop.
   Every task's "Definition of done" that says "the UI shows live data" now means
   "the endpoint works in `/docs` and a test covers it".
2. **Keep `CRM_API_URL` on `:8001`** (or unset) whenever you want a working UI to
   look at. Never point it at `:8000` expecting pages to light up.
3. **Read the v1 types from the backend itself**, not from crm-web. The
   `apps/crm-api/app/models/*.py` `*Public` schemas are now the contract of
   record for this track — crm-web's feature-scoped `types.ts` files describe v2.

### Which task files describe v1-only endpoints

All of tasks 01–14 target the v1 contract. Specifically flagged:

| Task                                                    | v1-only caveat                                                          |
| ------------------------------------------------------- | ----------------------------------------------------------------------- |
| [05 — Contacts](05-contacts-crud.md)                    | v1 flat `Contact` (has `company`); v2 contacts hang off `client_id`     |
| [07 — Projects](07-projects-crud.md)                    | v1 10-stage Vietnamese `ProjectStage`; v2 has 8 English stages          |
| [08 — Costs & Acceptances](08-costs-and-acceptances.md) | `/costs` + `/acceptances` don't exist in v2 at all — pure v1 exercise   |
| [09 — Quotes](09-quotes-crud.md)                        | v2 quotes are versioned with a send/decide/revise flow; v1 is flat CRUD |
| [10 — Contracts](10-contracts-crud.md)                  | v2 contracts are 0..n per project; v1 is one flat resource              |
| [11 — Payment milestones](11-payment-milestones.md)     | v2 splits this into settlements + bills + milestones                    |
| [12 — Contract templates](12-contract-templates.md)     | v2 template bodies are Lexical editorState JSON with merge fields       |
| [13 — Crew & Assignments](13-crew-and-assignments.md)   | v2 adds `/crew-roles` + `/timekeeping` alongside crew/assignments       |

Porting the v2 contract into `apps/crm-api` is a deliberate non-goal — it would
duplicate the NestJS backend and remove the exercise.
