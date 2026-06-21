# Feature plan: Payload Live Preview against the web front-end

> **Audience:** an implementing agent. Follow the steps **in order**. Do not
> improvise an alternative architecture — the approach below is chosen deliberately
> for this **decoupled** setup. Read the "Why this approach" section once, then
> execute. Every file path is repo-relative.

---

## 1. Goal

When an operator edits a `services`, `projects`, or `testimonials` document (or the
`site-settings` global) in the Payload admin (`apps/cms`, port **3001**), show a live
iframe preview of the actual web front-end (`apps/web`, port **3000**) that updates
when the document is saved/autosaved — including **unpublished draft** content.

## 2. Why this approach (read once, do not deviate)

We use **server-side Live Preview** = Payload's `RefreshRouteOnSave` component +
Next.js **Draft Mode** + **API-key-authenticated** draft fetches.

Two facts about this repo force this choice:

1. **The front-end is decoupled.** `apps/web` is a separate Next.js app that reads the
   CMS over **REST** (`apps/web/src/data.ts`). It has **no `@payloadcms/*` deps, no
   Payload Local API, and no DB access.** So the canonical Payload preview route
   (`getPayload()` + `payload.auth()` inside the front-end) is **not possible here.**
   The admin's auth cookie lives on the CMS origin (`:3001`) and will **not** reach the
   web origin (`:3000`), so we cannot forward the user's session. We authenticate
   draft reads with a **Payload API key** (server-to-server) instead.

2. **The site is a single aggregate page.** `apps/web/src/app/page.tsx` renders _all_
   collections as lists inside client components. The client-side `useLivePreview`
   hook is built around a _single edited document_ and would require merge-by-id logic
   and rewriting the render layer. `RefreshRouteOnSave` instead just re-runs the
   server page on save → re-fetch all collections with drafts → re-render. Minimal,
   fits the existing `data.ts` + server-component architecture.

**Tradeoff (acceptable):** preview updates on **save/autosave**, not on every
keystroke. See §9 for the security tradeoff of the static-secret approach.

### Data flow

```text
Admin (:3001) edit view
  └─ Live Preview iframe  src = http://localhost:3000/api/preview?secret=…&redirect=/
        └─ /api/preview route: validate secret → draftMode().enable() (sets cookie on :3000) → redirect /
              └─ page.tsx (server, draftMode ON) → data.ts fetches with ?draft=true + Authorization: API-Key
                    └─ renders draft content; <RefreshRouteOnSave/> mounted
  └─ operator saves doc → admin postMessage → RefreshRouteOnSave calls router.refresh()
        └─ page re-runs server fetch (cache:'no-store') → latest draft shown
```

## 3. Files touched (summary)

| File                                                             | Action                                            |
| ---------------------------------------------------------------- | ------------------------------------------------- |
| `apps/cms/src/collections/Users.ts`                              | Enable API key auth                               |
| `apps/cms/src/payload.config.ts`                                 | Add `admin.livePreview` + two env-derived consts  |
| `apps/cms/src/migrations/*`                                      | New migration for the API-key columns (generated) |
| `apps/web/package.json`                                          | Add `@payloadcms/live-preview-react`              |
| `apps/web/src/app/api/preview/route.ts`                          | **New** — enable Draft Mode                       |
| `apps/web/src/app/api/exit-preview/route.ts`                     | **New** — disable Draft Mode                      |
| `apps/web/src/components/live-preview/refresh-route-on-save.tsx` | **New** — client refresh component                |
| `apps/web/src/data.ts`                                           | Make fetches draft-aware                          |
| `apps/web/src/app/page.tsx`                                      | Conditionally mount `RefreshRouteOnSave`          |
| `apps/web/.env` + `apps/cms/.env`                                | New env vars (§4)                                 |

## 4. Environment variables

Add these. **Never** prefix the secret or API key with `NEXT_PUBLIC_` — they must stay
server-only. Generate the secret with `openssl rand -hex 32`.

**`apps/cms/.env`**

```bash
WEB_PUBLIC_URL=http://localhost:3000
PAYLOAD_PREVIEW_SECRET=<same-random-string-as-web>
```

**`apps/web/.env`** (or `.env.local`)

```bash
PAYLOAD_PREVIEW_SECRET=<same-random-string-as-cms>
CMS_PREVIEW_API_KEY=<filled in step 5.4 from the admin UI>
```

> `PAYLOAD_PREVIEW_SECRET` **must be identical** in both apps.
> `NEXT_PUBLIC_CMS_URL` (default `http://localhost:3001`) already exists and is reused.

---

## 5. CMS changes (`apps/cms`)

### 5.1 Enable API key auth on Users

In `apps/cms/src/collections/Users.ts`, change `auth: true` (line 16) to:

```ts
  auth: {
    useAPIKey: true,
  },
```

Leave everything else in that file unchanged.

### 5.2 Add Live Preview config to `payload.config.ts`

Near the existing `serverURL` / `corsOrigins` consts (around lines 25–32), add:

```ts
// Public origin of the decoupled web front-end, used to build Live Preview
// iframe URLs. Falls back to the local web dev server.
const webURL = process.env.WEB_PUBLIC_URL || "http://localhost:3000";

// Shared secret the web app's /api/preview route validates before enabling
// Next.js Draft Mode. Must match PAYLOAD_PREVIEW_SECRET in the web app's env.
const previewSecret = process.env.PAYLOAD_PREVIEW_SECRET || "";
```

Then replace the existing `admin` block (currently lines 36–41) with:

```ts
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    livePreview: {
      // The iframe loads the web app's preview route, which validates the
      // secret, turns on Draft Mode, then redirects to the page being previewed.
      // This is a single-page site, so every document previews the home route.
      url: () => `${webURL}/api/preview?secret=${previewSecret}&redirect=/`,
      collections: ['services', 'projects', 'testimonials'],
      globals: ['site-settings'],
      breakpoints: [
        { name: 'mobile', label: 'Mobile', width: 375, height: 667 },
        { name: 'tablet', label: 'Tablet', width: 768, height: 1024 },
        { name: 'desktop', label: 'Desktop', width: 1440, height: 900 },
      ],
    },
  },
```

> Do **not** point `url` directly at `/` — it must go through `/api/preview` so Draft
> Mode is enabled inside the iframe's browsing context.

### 5.3 Generate types + migration for the API-key columns

Enabling `useAPIKey` adds columns to the `users` table (Postgres adapter). From
`apps/cms/`:

```bash
bun payload generate:types
bun payload migrate:create live_preview_api_key
```

- Commit the new file under `apps/cms/src/migrations/` and the updated
  `apps/cms/src/migrations/index.ts` and `payload-types.ts`.
- **Local dev:** apply with `bun payload migrate` (or let `turbo run dev` apply on
  boot if push is enabled).
- **Production:** per `AGENTS.md`, prod is behind the VPN/VPS — **do not run the
  migration against prod from this machine.** Hand the `payload migrate` command to
  the operator to run on the VPS (inside the CMS container).

### 5.4 Create the preview API key (manual, in the admin UI)

1. Start the stack (`turbo run dev`) and open `http://localhost:3001/admin`.
2. Go to **Users**. Use a dedicated **editor**-role user for least privilege (create
   one if needed — editor is enough; `readPublishedOrAuth` grants drafts to _any_
   authenticated request).
3. Edit that user → toggle **Enable API Key** → **Save** → copy the generated key.
4. Put it in `apps/web/.env` as `CMS_PREVIEW_API_KEY=<key>` and restart the web dev
   server.

---

## 6. Web changes (`apps/web`)

### 6.1 Install the dependency

From `apps/web/` (Bun only — never npm/yarn/pnpm):

```bash
bun add @payloadcms/live-preview-react
```

Commit the updated `apps/web/package.json` and root `bun.lock`.

### 6.2 New file — `apps/web/src/app/api/preview/route.ts`

```ts
import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

// Entry point the Payload CMS Live Preview iframe loads. Validates the shared
// secret, turns on Next.js Draft Mode (a cookie scoped to this web origin), then
// redirects into the page so server fetches return draft content.
export async function GET(req: NextRequest): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");
  const redirectPath = searchParams.get("redirect") || "/";

  if (secret !== process.env.PAYLOAD_PREVIEW_SECRET) {
    return new Response("Invalid preview secret", { status: 401 });
  }
  // Only allow relative, same-site redirects.
  if (!redirectPath.startsWith("/")) {
    return new Response("Invalid redirect target", { status: 400 });
  }

  (await draftMode()).enable();
  redirect(redirectPath);
}
```

> `redirect()` works by throwing `NEXT_REDIRECT`. **Do not** wrap it in try/catch.
> `draftMode()` is **async** in Next 16 — always `await` it.

### 6.3 New file — `apps/web/src/app/api/exit-preview/route.ts`

```ts
import { draftMode } from "next/headers";
import { redirect } from "next/navigation";

// Disables Draft Mode and returns to the published site.
export async function GET(): Promise<Response> {
  (await draftMode()).disable();
  redirect("/");
}
```

### 6.4 New file — `apps/web/src/components/live-preview/refresh-route-on-save.tsx`

```tsx
"use client";

import { RefreshRouteOnSave as PayloadRefreshRouteOnSave } from "@payloadcms/live-preview-react";
import { useRouter } from "next/navigation";

// Read the public CMS origin directly from the inlined env var. Do NOT import
// CMS_URL from `data.ts` — that module is server-only territory (it would pull
// in server APIs) and importing it here drags them into the client bundle.
const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL || "http://localhost:3001";

// Listens for postMessage events from the Payload admin Live Preview host and
// refreshes the route (re-running server components) whenever a document is
// saved/autosaved, so the preview reflects the latest draft. `serverURL` MUST be
// the admin origin that posts the messages.
//
// Pass the STABLE `router.refresh` reference — NOT an inline `() => router.refresh()`.
// The inline arrow is a new identity each render, which churns the package's
// internal listener effect and causes an infinite refresh/reload loop.
export function RefreshRouteOnSave() {
  const router = useRouter();
  return (
    <PayloadRefreshRouteOnSave refresh={router.refresh} serverURL={CMS_URL} />
  );
}
```

> **Critical:** this is a **client** component (`"use client"`). It must NOT import
> anything from `data.ts`. `data.ts` is imported by other client components only for
> the `CMS_URL` constant and types — keep `data.ts` free of server-only APIs (see
> §6.5) and read `NEXT_PUBLIC_CMS_URL` directly here.

### 6.5 Make `data.ts` draft-aware

> **DO NOT import `next/headers` (or `draftMode`) into `data.ts`.** This module is
> imported by **client** components (the contact form reads `CMS_URL`; the header
> reads the `SiteSettings` value). Importing a server-only API at the top of `data.ts`
> poisons the client bundle and fails the build with:
> _"You're importing a module that depends on 'next/headers'…"_.
> Instead, the getters take a `draft` boolean **parameter**, and the server component
> that calls them (`page.tsx`, §6.6) reads `draftMode()` and passes it in.

In `apps/web/src/data.ts`:

**(a)** Do **not** add any new import. (No `next/headers`.)

**(b)** Add below the `REVALIDATE_SECONDS` const (after line 25):

```ts
// Server-only Payload API key used to read draft documents in preview. Payload
// expects the format `users API-Key <key>`. Never expose this to the client.
//
// NOTE: this module is imported by client components (e.g. the contact form reads
// CMS_URL), so it must NOT import `next/headers`. Draft Mode is read by the server
// components that call the getters below; they pass a `draft` flag in.
const PREVIEW_API_KEY = process.env.CMS_PREVIEW_API_KEY;
```

**(c)** Replace `fetchJson` (lines 87–103) with a draft-aware version:

```ts
async function fetchJson<T>(url: string, draft = false): Promise<T | null> {
  try {
    const res = await api.fetch(url, {
      // In preview: bypass the cache and authenticate so Payload returns drafts.
      // Otherwise: use the shared ISR revalidate window.
      ...(draft
        ? {
            cache: "no-store" as const,
            ...(PREVIEW_API_KEY
              ? {
                  headers: {
                    Authorization: `users API-Key ${PREVIEW_API_KEY}`,
                  },
                }
              : {}),
          }
        : { next: { revalidate: REVALIDATE_SECONDS } }),
      // Never let an unreachable CMS hang a build/render; fail fast.
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.error(`CMS fetch failed for "${url}": ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.error(`CMS fetch error for "${url}":`, err);
    return null;
  }
}
```

**(d)** Replace `fetchCollection` (lines 107–112):

```ts
async function fetchCollection<T>(slug: string, draft = false): Promise<T[]> {
  const json = await fetchJson<PayloadList<T>>(
    `${SERVER_CMS_URL}/api/${slug}?limit=100&depth=0&sort=order${draft ? "&draft=true" : ""}`,
    draft
  );
  return json?.docs ?? [];
}
```

**(e)** Give the three collection getters a `draft` parameter (default `false`) and
pass it through. The **caller** decides the value (§6.6):

```ts
export async function getServices(draft = false): Promise<Service[]> {
  const docs = await fetchCollection<PayloadService>("services", draft);
  return docs.map(mapService);
}

export async function getProjects(draft = false): Promise<Project[]> {
  const docs = await fetchCollection<PayloadProject>("projects", draft);
  return docs.map(mapProject);
}

export async function getTestimonials(draft = false): Promise<Testimonial[]> {
  const docs = await fetchCollection<PayloadTestimonial>("testimonials", draft);
  return docs.map(mapTestimonial);
}
```

**(f)** Give `getSiteSettings` (around line 787) the same `draft` parameter.
**Important:** `site-settings` is **NOT** drafts-enabled (see the comment in
`SiteSettings.ts`), so do **NOT** append `&draft=true` to its URL — only pass the
draft flag so the cache is bypassed and saved edits show on refresh:

```ts
export async function getSiteSettings(draft = false): Promise<SiteSettings> {
  const d = DEFAULT_SETTINGS;
  const s = await fetchJson<PayloadSiteSettings>(
    `${SERVER_CMS_URL}/api/globals/site-settings?depth=1`,
    draft // bypass cache in preview; no &draft=true — this global isn't versioned
  );
  if (!s) return d;
  // ... rest of the function unchanged ...
```

### 6.6 Mount `RefreshRouteOnSave` in `page.tsx`

In `apps/web/src/app/page.tsx`:

**(a)** Add imports:

```ts
import { draftMode } from "next/headers";

import { RefreshRouteOnSave } from "../components/live-preview/refresh-route-on-save";
```

**(b)** At the start of the `Page` component body (before the `Promise.all`), read
Draft Mode and pass it into every getter — this is the **only** place `draftMode()` is
read for content fetching:

```ts
const { isEnabled: isPreviewMode } = await draftMode();

const [services, projects, testimonials, settings] = await Promise.all([
  getServices(isPreviewMode),
  getProjects(isPreviewMode),
  getTestimonials(isPreviewMode),
  getSiteSettings(isPreviewMode),
]);
```

**(c)** Render the component as the first child of the root `<div>` (right after the
opening `<div ... >` on line 81):

```tsx
{
  isPreviewMode && <RefreshRouteOnSave />;
}
```

> Keep `export const dynamic = "force-dynamic"` (line 24) — it's already correct and
> required so Draft Mode reads work per-request.

---

## 7. Verification checklist

Run `bun install` at the repo root, then `turbo run dev`. Then:

1. **Published site unaffected:** open `http://localhost:3000` directly — renders as
   before (published content, cached). No preview component in the DOM.
2. **Admin shows Live Preview:** open `http://localhost:3001/admin`, edit a **Project**
   → a **Live Preview** view/toggle appears with the front-end in an iframe and the
   mobile/tablet/desktop breakpoint switcher.
3. **Drafts render in the iframe:** change the project title, **Save draft** (or wait
   for autosave). The iframe refreshes and shows the new title — **without publishing**.
4. **Auth works:** if the iframe shows published (stale) content after a draft save,
   `CMS_PREVIEW_API_KEY` is wrong/missing — re-check step 5.4.
5. **Global preview:** edit the `site-settings` global, save, confirm the iframe
   reflects it (this one publishes immediately since it isn't drafts-enabled).
6. **Exit preview:** visit `http://localhost:3000/api/exit-preview` → redirects to `/`
   and serves published content again.
7. `turbo run lint` and `turbo run build` pass.

## 8. Common failure modes (check these first if it breaks)

- **Build error "You're importing a module that depends on 'next/headers'":** something
  in the **client** graph imports `data.ts` while `data.ts` imports `next/headers`.
  Fix = keep `next/headers`/`draftMode` out of `data.ts` entirely (§6.5) and don't
  import `data.ts` from `refresh-route-on-save.tsx` (§6.4). The import trace in the
  error names the offending client component — follow it.
- **Preview never settles / CMS logs flood (infinite refresh-reload loop):** the
  `RefreshRouteOnSave` wrapper is passing an inline `refresh={() => router.refresh()}`
  instead of the stable `refresh={router.refresh}`. The new function identity each
  render churns the package's listener effect and loops. Use the stable reference
  (§6.4).
- **Iframe is blank / "refused to connect":** a CSP or `X-Frame-Options` header is
  blocking framing. The web app sets none by default (verified in `next.config.ts`).
  If one is added later, allow the CMS origin via `frame-ancestors`.
- **`401 Invalid preview secret`:** `PAYLOAD_PREVIEW_SECRET` differs between the two
  `.env` files. They must be byte-identical.
- **Build error "draftMode() outside request":** caused by `draftMode()` not awaited or
  called at module scope. It is only called inside the route handlers and the `Page`
  server component here — keep it that way.
- **Drafts not returned (always published):** the API-key user lacks auth, the key is
  malformed, or the `Authorization` header value isn't exactly
  `users API-Key <key>` (collection slug is `users`).

## 9. Security & production notes

- This preview gate is a **static shared secret**, not per-user auth — a deliberate
  consequence of the decoupled front-end (it cannot use Payload's Local API to verify
  the editing user). Keep `PAYLOAD_PREVIEW_SECRET` and `CMS_PREVIEW_API_KEY`
  **server-only** (no `NEXT_PUBLIC_`), rotate them periodically, and scope the API-key
  user to **editor** role (least privilege).
- For production, set `WEB_PUBLIC_URL`, `PAYLOAD_PREVIEW_SECRET` (CMS) and
  `PAYLOAD_PREVIEW_SECRET` + `CMS_PREVIEW_API_KEY` (web) in the deployed env, and
  ensure the CMS `serverURL`/`CMS_PUBLIC_URL` and web `NEXT_PUBLIC_CMS_URL` point at
  the real CMS origin so the `RefreshRouteOnSave` `serverURL` (the message origin)
  matches.
- Run the API-key migration on the VPS (not locally) per `AGENTS.md`.

## 10. Out of scope (do NOT do)

- Do **not** add `@payloadcms/*` server packages or DB access to `apps/web`.
- Do **not** switch to the client-side `useLivePreview` hook (see §2).
- Do **not** create per-collection detail routes — this is a single-page site;
  everything previews `/`.
