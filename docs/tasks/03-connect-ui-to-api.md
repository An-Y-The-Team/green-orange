# [Basics] Connect the UI to the API

> **Labels:** `area:backend` · `area:frontend` · `integration` · `difficulty:easy`
> **Depends on:** #01, #02
> **Good for:** every student (this is the "aha" moment).

## Background

`apps/crm-web` reads everything through a seam in
[`apps/crm-web/src/utils/http/http.ts`](../../apps/crm-web/src/utils/http/http.ts):

- **`CRM_API_URL` unset** → pages render bundled **mock data**.
- **`CRM_API_URL` set** → pages fetch that backend over authenticated HTTP.

> **⚠️ Read [00 — Choose your backend](00-choose-your-backend.md) first.** Since the
> v2 cutover, crm-web speaks the **v2** contract and `apps/crm-api` still implements
> **v1** — different endpoints _and_ different field shapes. Pointing the seam at
> `:8000` therefore renders **empty pages**, not live data: a failing list read
> degrades to `[]` (never to mock rows), so there is nothing to see and no error to
> read. The UI "lighting up" is what `apps/crm-api-nest` on `:8001` does.
>
> This task is still worth doing — it's how you see that a UI read is just an
> authenticated HTTP call, and it's where you learn the token dance. Just verify the
> call with `curl` and Swagger, not by watching a page fill in.

Because endpoints are protected (task #02), live mode also needs a **bearer token**.
In dev that's the server-only `CRM_API_TOKEN` (you mint it the same way as task #02).

> ⚠️ The env var is **`CRM_API_URL`** (server-only, no `NEXT_PUBLIC_` prefix), so the
> backend URL is never shipped to the browser. (Some older code comments mention
> `NEXT_PUBLIC_API_URL` — that name is stale; the code reads `CRM_API_URL`.)

## What you'll learn

- How the mock → live data seam works (and why field names must match)
- That a request from the UI is just an authenticated HTTP call to your API
- Why a contract mismatch shows up as an **empty page**, not an error — and why that
  makes tests, not the UI, your feedback loop

## Task

1. With `crm-api` running (task #01), mint a dev token:

   ```bash
   TOKEN=$(curl -s -X POST http://localhost:8000/auth/token \
     -d "username=admin&password=admin" | jq -r .access_token)
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

4. Confirm the read your API is actually serving, with the token from step 1:

   ```bash
   curl -s http://localhost:8000/clients -H "Authorization: Bearer $TOKEN"
   ```

   Those are the seeded rows out of **Postgres**. Same call, same token, same
   response as the one crm-web's server component makes.

5. Open **<http://localhost:3002/clients>**. It is **empty**, and so is every other
   page. That is the v1/v2 mismatch, not a bug in your setup: the v2 UI asks for a
   `Client` with `type` / `tax_code` and nested `contacts` + `locations`, and v1
   answers with `email` / `phone` / `company` / `status`. Check the crm-web server
   log — you'll see a `not available yet, using fallback` warning per read.

## Acceptance criteria

- [ ] With `CRM_API_URL` set to `:8000`, you can `curl` `/clients` with a bearer
      token and get the **seeded DB rows** back.
- [ ] Creating a client via `POST /clients` (curl or `/docs`) persists to Postgres
      (`GET /clients` again → still there).
- [ ] With `CRM_API_URL` **unset**, the page falls back to mock data again.
- [ ] You can explain in one sentence why a `*Public` response schema's field names
      must match the consumer's type exactly — and why v1 `ClientPublic` therefore
      cannot feed the v2 `Client` in
      [`src/app/(dashboard)/clients/types.ts`](<../../apps/crm-web/src/app/(dashboard)/clients/types.ts>).

## Hints & references

- The seam + transport: [`src/utils/http/http.ts`](../../apps/crm-web/src/utils/http/http.ts)
  (`apiFetch`, `apiFetchSafe`, `apiSend`).
- The clients reads: [`src/app/(dashboard)/clients/queries.ts`](<../../apps/crm-web/src/app/(dashboard)/clients/queries.ts>)
  (v2 shapes — read it to see what the UI expects, not as your target contract)
- A list query degrades to `[]` when its endpoint is missing/erroring — that's why a
  missing or mismatched endpoint renders **empty** in live mode instead of crashing.
  `[]` is the only fallback `apiFetchSafe` ever returns; it does **not** reach for
  mock data.

## Definition of done

You've made an authenticated call to your own API and seen the same response crm-web
would get, and you understand the seam — including why it stays empty against v1 and
why `/docs` + `uv run pytest` are your signal for the rest of the tasks.
Next: [04 — Study the reference & run the tests](04-study-reference-and-tests.md).
