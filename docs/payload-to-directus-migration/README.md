# Payload → Directus Migration (Execution Guide)

This folder contains the **step-by-step execution plan** to replace Payload CMS (`apps/cms`) with **Directus**, in order to get a free, open-source **Visual Editor** (Payload only ships that on its Enterprise tier).

> ⚠️ **READ THIS FIRST — every phase depends on it.**
>
> Before writing ANY code in ANY phase, open and obey these files:
>
> - [`.claude/frontend-code-style.md`](../../.claude/frontend-code-style.md) — React/Next.js rules (strict typing, **no `any`**, enums not string-unions, named handlers, no props-drilling, etc.)
> - [`.claude/backend-code-style.md`](../../.claude/backend-code-style.md) — Python/FastAPI rules (only relevant if you touch `apps/crm-api`; this migration normally does NOT).
> - [`AGENTS.md`](../../AGENTS.md) — **Use Bun, never npm/yarn/pnpm.** Discourage `useEffect`. This Next.js has breaking changes — read `node_modules/next/dist/docs/` before writing Next code.
>
> If a phase doc and a style guide ever disagree, **the style guide wins.**

## Why we are doing this

- The site is **decoupled**: a headless CMS at `cms.<domain>` + a Next.js frontend (`apps/web`) at `<domain>`.
- We already built Payload **Live Preview** (iframe refresh). What we still cannot get without paying for Payload Enterprise is the **Visual Editor** — clicking an element on the live page to edit it in place.
- **Directus** ships an open-source Visual Editor (`@directus/visual-editing`). Migrating unlocks it for free while keeping the same decoupled architecture.

## Decisions already made (do NOT re-litigate these)

1. **Run mode:** Directus runs as the **official `directus/directus` Docker image** (a compose service). We do **not** build a custom CMS image anymore. Config lives as code under `apps/cms` (`snapshots/`, `seed/`, `extensions/`).
2. **Database:** A **brand-new `directus` Postgres database** is created next to the existing `cms`/`crm`/`authentik` databases. The old Payload `cms` database is **left untouched** for rollback.
3. **SiteSettings repeaters:** Rich multi-field arrays (hero headline segments, brand values, process steps, nav items, footer links, stats) become **relational collections (O2M)**. Simple single-string lists (a service's benefits/features, a project's tags, hero benefits) become **JSON list fields**.
4. **Frontend client:** `apps/web/src/data.ts` is rewritten to use the **`@directus/sdk`**.

## Execute the phases IN ORDER

Each phase has its own document. Do not start a phase until the previous one's "Definition of Done" checklist passes.

| #   | Document                                                       | What it does                                                                                                |
| --- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 1   | [`phase-1-infrastructure.md`](./phase-1-infrastructure.md)     | Make a blank Directus run locally and in prod (Docker, new DB, env vars, Caddy, CI).                        |
| 2   | [`phase-2-data-model.md`](./phase-2-data-model.md)             | Build all collections/fields/relations in the Directus Studio, then snapshot them to a committed YAML file. |
| 3   | [`phase-3-roles-and-seed.md`](./phase-3-roles-and-seed.md)     | Set up roles/permissions + a read-only API token, then seed all content with an SDK script.                 |
| 4   | [`phase-4-frontend.md`](./phase-4-frontend.md)                 | Rewrite `apps/web` to fetch from Directus via the SDK and add the Visual Editor.                            |
| 5   | [`phase-5-cleanup-and-docs.md`](./phase-5-cleanup-and-docs.md) | Delete the old Payload code/deps and update the deploy docs.                                                |

> **Real prod content** is a separate concern from the phases above. `seed/seed.ts` only loads DEMO data. To carry the live, editor-edited Payload content (text + uploaded media) into Directus at cutover, follow [`prod-data-migration.md`](./prod-data-migration.md) (operator-run export → `migrate-from-payload.ts`). Run it during Phase 5 cutover, before retiring Payload.

## Glossary (so the steps are unambiguous)

- **Studio** = the Directus admin web app (served at `http://localhost:8055` in dev).
- **Collection** = a database table you manage in Directus (the equivalent of a Payload "collection").
- **Singleton** = a collection that holds exactly one row (the equivalent of a Payload "global"). `site_settings` is a singleton.
- **O2M (one-to-many)** = a parent row owns many child rows in another collection (e.g. one `site_settings` owns many `site_hero_segments`).
- **M2O (many-to-one)** = the child side of an O2M (each `site_hero_segment` points back to one `site_settings`).
- **Asset URL** = how the frontend loads a file: `${DIRECTUS_URL}/assets/<file-id>`.
- **Snapshot** = a YAML file describing the data model (collections/fields/relations) that Directus can re-apply to any environment. **It does NOT contain roles, permissions, content, or files.**
