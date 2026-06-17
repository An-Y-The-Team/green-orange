# [Basics] Connect the UI to the API

> **Labels:** `area:backend` · `area:frontend` · `integration` · `difficulty:easy`
> **Depends on:** #01, #02
> **Good for:** every student (this is the "aha" moment).

## Background

The whole point of this project: you build the API and the existing UI lights up
with no UI changes. `apps/crm-web` reads everything through a seam in
[`apps/crm-web/src/lib/http.ts`](../../apps/crm-web/src/lib/http.ts):

- **`CRM_API_URL` unset** → pages render bundled **mock data**.
- **`CRM_API_URL` set** → pages fetch the **real backend** (`apps/crm-api`).

Because endpoints are protected (task #02), live mode also needs a **bearer token**.
In dev that's the server-only `CRM_API_TOKEN` (you mint it the same way as task #02).

> ⚠️ The env var is **`CRM_API_URL`** (server-only, no `NEXT_PUBLIC_` prefix), so the
> backend URL is never shipped to the browser. (Some older code comments mention
> `NEXT_PUBLIC_API_URL` — that name is stale; the code reads `CRM_API_URL`.)

## What you'll learn

- How the mock → live data seam works (and why field names must match)
- That a request from the UI is just an authenticated HTTP call to your API
- How to see a page switch from mock to live data

## Task

1. With `crm-api` running (task #01), mint a dev token:

   ```bash
   curl -s -X POST http://localhost:8000/auth/token -d "username=admin&password=admin"
   ```

2. In **`apps/crm-web/`**, create `.env.local` from the example and set:

   ```bash
   cp .env.example .env.local
   # then edit .env.local:
   CRM_API_URL=http://localhost:8000
   CRM_API_TOKEN=<paste the access_token from step 1>
   ```

3. Start the UI (from the repo root or the app):

   ```bash
   turbo run dev          # or: bun --filter @yan/crm-web dev
   ```

4. Open **<http://localhost:3002/customers>**. The list now comes from **Postgres**
   (the seeded customers), not the mock file. Add a customer via the dialog — it
   `POST`s to your API and persists.
5. Now visit **<http://localhost:3002/projects>**. It's **empty** — because there is
   no `/projects` backend yet. That empty page is your Tier-2 to-do list.

## Acceptance criteria

- [ ] With `CRM_API_URL` set, `/customers` shows the **seeded DB rows** (not mock data).
- [ ] Creating a customer in the UI persists to Postgres (refresh → still there;
      confirm with `GET /customers` via curl).
- [ ] With `CRM_API_URL` **unset**, the page falls back to mock data again.
- [ ] You can explain in one sentence why `Customer` fields in
      [`src/types/index.ts`](../../apps/crm-web/src/types/index.ts) must match the
      backend's `CustomerPublic`.

## Hints & references

- The seam + transport: [`src/lib/http.ts`](../../apps/crm-web/src/lib/http.ts)
  (`apiFetch`, `apiFetchSafe`, `apiSend`).
- The customers reads: [`src/app/(dashboard)/customers/queries.ts`](<../../apps/crm-web/src/app/(dashboard)/customers/queries.ts>)
- A list query degrades to `[]` when its endpoint is missing/erroring — that's why
  unimplemented pages render **empty** in live mode instead of crashing.

## Definition of done

You've watched `/customers` flip from mock to live data and back, and you understand
the seam you'll be feeding for the rest of the tasks.
Next: [04 — Study the reference & run the tests](04-study-reference-and-tests.md).
</content>
