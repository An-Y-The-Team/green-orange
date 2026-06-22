# Plan: CMS-driven typography (3 selects, 8 fonts)

> ⚠️ **HISTORICAL — backend changed.** The typography feature still exists, but
> this plan targets the **removed Payload backend** (`payload.config.ts`,
> `payload migrate`, `PayloadSiteSettings`). The fields now live on the **Directus
> `site_settings` singleton** and are read via the Directus SDK in
> `apps/web/src/data.ts`. Use this only for the design rationale; for the current
> data model see [`../payload-to-directus-migration/`](../payload-to-directus-migration/).

> **Audience**: a fresh agent picking this up cold. Assume nothing.
> **Outcome**: the business owner can change the heading, hero-display, and body
> fonts from the Payload admin UI without a deploy, choosing from a curated list
> of 8 Vietnamese-friendly Google Fonts.

## Why this exists

The site (`apps/web`) is Vietnamese, has three distinct typographic roles
(section headings, hero display, body), and currently loads fonts via a
`@import url('https://fonts.googleapis.com/...')` line in `globals.css` —
unmanaged, unoptimised, not editor-controlled. We move font selection into the
Payload `site-settings` global and self-host all eight options via
`next/font/google` so picking a different pair is a one-click change.

## Sequencing

1 PR on branch `feat/cms-typography`. Off `main`.

---

## 0. Font roster (locked)

These 8 Google Fonts are the universe. Each appears in the role-selects shown.
**Do not add or rename without revisiting the schema + the role lists.**

| Slug (CSS var + select value) | `next/font/google` import | Weights to load             | Heading | Hero display | Body |
| ----------------------------- | ------------------------- | --------------------------- | :-----: | :----------: | :--: |
| `be-vietnam-pro`              | `Be_Vietnam_Pro`          | `['400','500','700','900']` |   ✅    |      —       |  ✅  |
| `inter`                       | `Inter`                   | `['400','500','700','900']` |    —    |      —       |  ✅  |
| `lexend`                      | `Lexend`                  | `['400','500','700','900']` |    —    |      —       |  ✅  |
| `nunito-sans`                 | `Nunito_Sans`             | `['400','700','900']`       |    —    |      —       |  ✅  |
| `manrope`                     | `Manrope`                 | `['400','700','800']`       |   ✅    |      —       |  —   |
| `playfair-display`            | `Playfair_Display`        | `['400','700','900']`       |   ✅    |      ✅      |  —   |
| `lora`                        | `Lora`                    | `['400','500','700']`       |   ✅    |      ✅      |  —   |
| `dm-serif-display`            | `DM_Serif_Display`        | `['400']`                   |    —    |      ✅      |  —   |

**Subsets for every font**: `['latin', 'vietnamese']`. If a font fails to build
because the subset isn't supported, that font is dropped from the roster — do
NOT silently fall back to `latin` only.

**Defaults (preserve today's look exactly)**:

- `headingFont`: `playfair-display`
- `heroDisplayFont`: `lora`
- `bodyFont`: `lora`

(Yes, body in serif is unusual but it's what the current `globals.css` does.
The owner can switch body to `be-vietnam-pro` from the CMS once this lands —
that's the entire point. Don't pre-change the default.)

---

## 1. CMS schema — `apps/cms/src/globals/SiteSettings.ts`

The schema **already uses bilingual labels** (`{ en, vi }`) everywhere —
look at any existing field. Copy that pattern; do not add an English-only field.

Add a new tab **`Typography`** after `Branding & Nav` and before `Hero`. Inside,
add one `typography` group with three `select` fields:

```ts
{
  label: { en: 'Typography', vi: 'Kiểu chữ' },
  fields: [
    {
      name: 'typography',
      type: 'group',
      label: { en: 'Typography', vi: 'Kiểu chữ' },
      admin: {
        description: {
          en: 'Font family for headings, the hero display headline, and body text. Changes apply site-wide on the next request.',
          vi: 'Phông chữ cho tiêu đề, dòng tiêu đề lớn ở khu vực Hero, và nội dung. Thay đổi áp dụng cho toàn site ở lần tải kế tiếp.',
        },
      },
      fields: [
        {
          name: 'headingFont',
          type: 'select',
          required: true,
          defaultValue: 'playfair-display',
          label: { en: 'Heading Font', vi: 'Phông tiêu đề' },
          admin: {
            description: {
              en: 'Applied to all section headings (h2/h3/h4) via the font-heading utility.',
              vi: 'Áp dụng cho tất cả tiêu đề mục (h2/h3/h4) qua tiện ích font-heading.',
            },
          },
          options: [
            { label: { en: 'Be Vietnam Pro (sans)', vi: 'Be Vietnam Pro (sans)' }, value: 'be-vietnam-pro' },
            { label: { en: 'Manrope (sans)', vi: 'Manrope (sans)' }, value: 'manrope' },
            { label: { en: 'Playfair Display (serif)', vi: 'Playfair Display (serif)' }, value: 'playfair-display' },
            { label: { en: 'Lora (serif)', vi: 'Lora (serif)' }, value: 'lora' },
          ],
        },
        {
          name: 'heroDisplayFont',
          type: 'select',
          required: true,
          defaultValue: 'lora',
          label: { en: 'Hero Display Font', vi: 'Phông Hero' },
          admin: {
            description: {
              en: 'Applied to the hero h1 + stat numbers via the font-serif utility. Should pair with the heading font.',
              vi: 'Áp dụng cho dòng tiêu đề h1 và các con số thống kê ở Hero, qua tiện ích font-serif.',
            },
          },
          options: [
            { label: { en: 'Playfair Display (serif)', vi: 'Playfair Display (serif)' }, value: 'playfair-display' },
            { label: { en: 'Lora (serif)', vi: 'Lora (serif)' }, value: 'lora' },
            { label: { en: 'DM Serif Display (serif)', vi: 'DM Serif Display (serif)' }, value: 'dm-serif-display' },
          ],
        },
        {
          name: 'bodyFont',
          type: 'select',
          required: true,
          defaultValue: 'lora',
          label: { en: 'Body Font', vi: 'Phông nội dung' },
          admin: {
            description: {
              en: 'Applied to paragraphs and UI labels via the font-sans utility. Be Vietnam Pro has the best Vietnamese diacritic rendering.',
              vi: 'Áp dụng cho đoạn văn và nhãn UI qua tiện ích font-sans. Be Vietnam Pro hiển thị dấu tiếng Việt tốt nhất.',
            },
          },
          options: [
            { label: { en: 'Be Vietnam Pro', vi: 'Be Vietnam Pro' }, value: 'be-vietnam-pro' },
            { label: { en: 'Inter', vi: 'Inter' }, value: 'inter' },
            { label: { en: 'Lexend', vi: 'Lexend' }, value: 'lexend' },
            { label: { en: 'Nunito Sans', vi: 'Nunito Sans' }, value: 'nunito-sans' },
            { label: { en: 'Lora', vi: 'Lora' }, value: 'lora' },
          ],
        },
      ],
    },
  ],
}
```

Notes for Gemini:

- The `value`s are the slugs from the roster table. They MUST match the CSS
  variable names used in `layout.tsx` (`--font-be-vietnam-pro` etc.). If you
  change a value here, change every other place too.
- `required: true` + `defaultValue` means the field is always non-null in
  Payload responses. Don't add fallback logic for null in the mapper.

## 2. Migration

```bash
cd apps/cms
bun run payload migrate:create typography
```

Expect 3 new varchar columns + 3 new enum types on `site_settings`:
`typography_heading_font`, `typography_hero_display_font`,
`typography_body_font`. Verify the generated SQL before committing. Migration
file lands in `apps/cms/src/migrations/` and gets auto-appended to
`migrations/index.ts` — DO NOT hand-edit either.

Then regenerate types:

```bash
bun run generate:types
```

Confirm `payload-types.ts` now mentions `headingFont`, `heroDisplayFont`,
`bodyFont`.

## 3. Seed — `apps/cms/src/seed.ts`

Add to the `SITE_SETTINGS` object (insert it alongside `branding`,
`navigation`, etc. — the position doesn't matter to Payload, but keep it next
to `branding` for readability):

```ts
typography: {
  headingFont: 'playfair-display',
  heroDisplayFont: 'lora',
  bodyFont: 'lora',
},
```

**Do not change** the defaults to "improve" the look. We're preserving current
production appearance; the owner switches body to Be Vietnam Pro themselves.

---

## 4. Web — `apps/web/src/data.ts`

### 4a. Add the union + interface (alongside the existing exported types like `HeadlineColor`)

```ts
export type FontSlug =
  | "be-vietnam-pro"
  | "inter"
  | "lexend"
  | "nunito-sans"
  | "manrope"
  | "playfair-display"
  | "lora"
  | "dm-serif-display";

export interface TypographySettings {
  headingFont: FontSlug;
  heroDisplayFont: FontSlug;
  bodyFont: FontSlug;
}
```

### 4b. Extend `SiteSettings` interface

Add `typography: TypographySettings` — order it next to `branding`.

### 4c. Extend `DEFAULT_SETTINGS`

```ts
typography: {
  headingFont: 'playfair-display',
  heroDisplayFont: 'lora',
  bodyFont: 'lora',
},
```

### 4d. Extend `PayloadSiteSettings`

```ts
typography?: {
  headingFont?: string | null;
  heroDisplayFont?: string | null;
  bodyFont?: string | null;
} | null;
```

### 4e. Add a whitelist + mapper helper (sibling to `HEADLINE_COLORS`,

`BRAND_ICONS`, `BRAND_ACCENTS`)

```ts
const FONT_SLUGS = new Set<string>([
  "be-vietnam-pro",
  "inter",
  "lexend",
  "nunito-sans",
  "manrope",
  "playfair-display",
  "lora",
  "dm-serif-display",
]);

const pickFont = (
  raw: string | null | undefined,
  fallback: FontSlug
): FontSlug => (raw && FONT_SLUGS.has(raw) ? (raw as FontSlug) : fallback);
```

### 4f. Wire it into `getSiteSettings()`

Add inside the returned object, near `branding`:

```ts
typography: {
  headingFont: pickFont(
    s.typography?.headingFont,
    d.typography.headingFont,
  ),
  heroDisplayFont: pickFont(
    s.typography?.heroDisplayFont,
    d.typography.heroDisplayFont,
  ),
  bodyFont: pickFont(s.typography?.bodyFont, d.typography.bodyFont),
},
```

The `pickFont` whitelist matters: an unknown CMS value (e.g. someone fat-fingers
an enum in psql) would otherwise become a CSS variable that resolves to nothing.
The whitelist makes us fall back to the default.

---

## 5. Web — `apps/web/src/app/layout.tsx`

Today this file just imports `globals.css`, declares `<html lang="vi">`, and
renders `<body className="antialiased">{children}</body>`. We need to:

1. Import all 8 fonts from `next/font/google`.
2. Attach all 8 `.variable` classNames to `<body>` so the
   `--font-<slug>` CSS variables exist on the document root.
3. Set `preload: false` on every font (see "Preload tradeoff" below).

Replace the file contents with (preserving the existing `generateMetadata`
function as-is — do not delete it):

```tsx
import {
  Be_Vietnam_Pro,
  DM_Serif_Display,
  Inter,
  Lexend,
  Lora,
  Manrope,
  Nunito_Sans,
  Playfair_Display,
} from "next/font/google";

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "700", "900"],
  display: "swap",
  preload: false,
  variable: "--font-be-vietnam-pro",
});
const inter = Inter({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "700", "900"],
  display: "swap",
  preload: false,
  variable: "--font-inter",
});
const lexend = Lexend({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "700", "900"],
  display: "swap",
  preload: false,
  variable: "--font-lexend",
});
const nunitoSans = Nunito_Sans({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "700", "900"],
  display: "swap",
  preload: false,
  variable: "--font-nunito-sans",
});
const manrope = Manrope({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "700", "800"],
  display: "swap",
  preload: false,
  variable: "--font-manrope",
});
const playfair = Playfair_Display({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "700", "900"],
  display: "swap",
  preload: false,
  variable: "--font-playfair-display",
});
const lora = Lora({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "700"],
  display: "swap",
  preload: false,
  variable: "--font-lora",
});
const dmSerif = DM_Serif_Display({
  subsets: ["latin", "vietnamese"],
  weight: "400",
  display: "swap",
  preload: false,
  variable: "--font-dm-serif-display",
});

const FONT_VARIABLES = [
  beVietnamPro.variable,
  inter.variable,
  lexend.variable,
  nunitoSans.variable,
  manrope.variable,
  playfair.variable,
  lora.variable,
  dmSerif.variable,
].join(" ");

// ... existing generateMetadata stays here ...

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={FONT_VARIABLES}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
```

Notes for Gemini:

- `next/font/google` exports use **underscored names**: `Be_Vietnam_Pro`,
  `DM_Serif_Display`, `Nunito_Sans`, `Playfair_Display`. Not camelCase. Not
  spaced. Get this wrong and `bun run dev` errors immediately.
- Variable name MUST match the slug, kebab-cased and prefixed with `--font-`
  (e.g. `--font-be-vietnam-pro`). The CSS variable consumers in
  `page.tsx` (step 7) build the var name by string-concatenation: a typo here
  breaks the font silently (no CSS error, just no font applied).
- `DM_Serif_Display` only has weight 400. Passing an array with extra weights
  is a build error.
- Don't add `preload: true` "just to be safe" — see Preload tradeoff below.

---

## 6. Web — `apps/web/src/app/globals.css`

Two edits:

**6a.** **Delete** this line at the top:

```css
@import url("https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400..700;1,400..700&family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap");
```

`next/font` now self-hosts these. Leaving the `@import` would double-load
Lora/Playfair (one self-hosted, one from Google CDN) — wasted bytes.

**6b.** Update the `@theme inline` block so the three role variables fall
back to next/font variables:

```css
@theme inline {
  --font-heading: var(--font-playfair-display), Georgia, serif;
  --font-serif: var(--font-lora), Georgia, serif;
  --font-sans: var(--font-lora), Georgia, serif;
}
```

This is just the default mapping; the active CMS values are layered on top in
`page.tsx` (step 7) via inline style. If `page.tsx` somehow doesn't override
(extremely unlikely — it's the only page), the page still renders with the
current production fonts thanks to this fallback.

---

## 7. Web — `apps/web/src/app/page.tsx`

`page.tsx` already fetches `settings` via `getSiteSettings()`. The root render
opens with:

```tsx
return (
  <div className="min-h-screen flex flex-col bg-white overflow-x-hidden antialiased font-sans">
```

Add an inline `style` attribute to this div that re-points the three role
variables to the chosen `--font-<slug>` variable:

```tsx
return (
  <div
    className="min-h-screen flex flex-col bg-white overflow-x-hidden antialiased font-sans"
    style={
      {
        "--font-heading": `var(--font-${settings.typography.headingFont})`,
        "--font-serif": `var(--font-${settings.typography.heroDisplayFont})`,
        "--font-sans": `var(--font-${settings.typography.bodyFont})`,
      } as React.CSSProperties
    }
  >
```

Notes for Gemini:

- The `as React.CSSProperties` cast is required — TS rejects custom CSS
  properties (`--foo`) on `CSSProperties` without it.
- CSS variables cascade. Setting them on this div overrides whatever
  `:root`/`@theme` set, for everything inside the div. Since this div wraps
  the whole page, that's all of it.
- The template literal `var(--font-${slug})` is the only place the slug → CSS
  variable mapping is implicit. The `FONT_SLUGS` whitelist in `data.ts`
  guarantees `slug` is one of the eight known values, so the generated
  variable name will always exist (assuming layout.tsx declared all 8).
- Don't add this style to `<body>` in `layout.tsx` instead — `layout.tsx`
  doesn't have access to `settings` without a second `getSiteSettings()` call,
  which works (React fetch dedupe) but couples layout to content. Keep it
  here.

---

## 8. Preload tradeoff (read before touching `preload:`)

`next/font/google` defaults to `preload: true`, which emits
`<link rel="preload">` for every font whose `.variable` className is on the
document. We attach all 8 `.variable`s to `<html>` so all CSS variables exist —
that would mean **8 simultaneous font preloads on every page load**, which
competes for bandwidth and slows first paint.

Setting `preload: false` on all 8 stops the preload tags. The font still loads
when first referenced in CSS (via `@font-face` declarations next/font inlines),
just without the eager `<link rel="preload">` hint. For a marketing site this
is acceptable — small FOUT for visitors on slow connections, but no
bandwidth waste preloading 5 fonts the page won't even use.

If first-paint timing becomes a complaint later: set `preload: true` on the
three current-default fonts (`playfair-display`, `lora` — Lora covers both
hero-display and body) and keep the other six as `preload: false`. Document
in a follow-up.

**Don't** try to make preload dynamic per CMS settings — `next/font` decides
preload at build time, not request time. This is a known limitation.

---

## 9. Verification

In order, from repo root:

```bash
turbo run lint --filter=@yan-portf/web --filter=@yan-portf/cms
turbo run check-types --filter=@yan-portf/web --filter=@yan-portf/cms
turbo run build --filter=@yan-portf/web --filter=@yan-portf/cms
```

All three must pass before commit. The web build will download font files from
Google during build (this is `next/font`'s expected behaviour) — if you're
offline this WILL fail. That's not your bug.

Then locally:

1. `turbo run dev` and confirm the home page loads with the current
   look (Playfair headings, Lora elsewhere).
2. Open the CMS admin → Settings → Site Settings → Typography tab. Verify the
   three selects appear with the bilingual labels and the right option lists.
3. Change `bodyFont` to **Be Vietnam Pro**, save, reload the home page. Body
   copy should now be in Be Vietnam Pro (most obvious in the section
   paragraphs and the footer brand description).
4. Change it back to **Lora**, save, reload. Body should revert.
5. Try each of the 4 heading options. Visible change on every section h2/h3.
6. Try each of the 3 hero-display options. Visible change on the hero h1 +
   the stats counters.

If a change in the CMS doesn't reflect after reload: the page revalidates
every 300s (see `REVALIDATE_SECONDS` in `data.ts`). Wait 5 minutes or hard
reload the dev server.

---

## 10. Deploy

Standard flow per `DEPLOY.md`:

```bash
# On the VPS
cd /root/green-orange
docker compose -f docker-compose.prod.yml --env-file .env.production pull
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
docker compose -f docker-compose.prod.yml --env-file .env.production logs cms --tail=50
# expect: "Migrating: <timestamp>_typography" → "Migrated: ..."
```

Seed is **NOT** required — the new fields default to current values via
`defaultValue` on the schema. Only re-seed if you also want to reset all of
`site-settings`, and the operator should know this overwrites prior owner
edits.

---

## 11. Gotchas / pitfalls (for Gemini specifically)

1. **Slugs MUST match in 4 places**: schema option `value`, seed default,
   `FontSlug` union in `data.ts`, and the `variable` arg in `next/font/google`
   declarations. A typo in any one breaks silently (no font applied / TS
   error). Search the whole repo for the slug string before committing.
2. **Bilingual labels are not optional in this codebase**. Every field label
   and description must be `{ en, vi }`. Don't introduce English-only labels.
3. **`generateMetadata` in `layout.tsx` is async** and already calls
   `getSiteSettings()`. Do not "factor out" the layout's settings fetch into
   the new typography logic — keep `layout.tsx` font-roster-only, and let
   `page.tsx` own the active-font mapping.
4. **`@theme inline` is a Tailwind v4 feature**. Don't migrate it to
   `tailwind.config.ts` — this project's Tailwind config lives in CSS.
5. **The new tab order in `SiteSettings.ts` matters for the editor**. Place
   Typography after `Branding & Nav` and before `Hero` so related concerns
   group together.
6. **Don't forget the migration index registration**. `payload migrate:create`
   appends it automatically; if you edit the migration filename afterward you
   must update `migrations/index.ts` to match.
7. **The `style` attribute in `page.tsx` needs the `as React.CSSProperties`
   cast** because TypeScript otherwise rejects `--foo` keys. Don't replace
   with `// @ts-expect-error` or `as any` — the cast is correct and minimal.
8. **`preload: false` is intentional**. Read § 8 if tempted to change.

---

## 12. Out of scope for this PR

- Per-element font overrides (e.g. CTA button = different font). Roles are
  the only granularity.
- Letter spacing, line height, font-size scales. Just the family.
- Font weights as CMS-editable values. Weights are baked into the loader.
- Adding more fonts than the 8 listed. New fonts require schema + roster
  changes; that's a new PR.
- Removing the `@fontsource-variable/geist` import in `globals.css` — that's
  used by `@yan/ui` components, unrelated.

---

## 13. Acceptance checklist

- [ ] Schema has a Typography tab with three required selects, bilingual labels.
- [ ] Migration generated, types regenerated, both committed.
- [ ] Seed writes the three typography defaults to `site-settings`.
- [ ] `data.ts` has `FontSlug` union, `TypographySettings`, extended interfaces,
      `pickFont` helper, mapper hook.
- [ ] `layout.tsx` declares all 8 fonts via `next/font/google` with
      `preload: false`, attaches all 8 `.variable` classNames to `<html>`.
- [ ] `globals.css`: deleted Google Fonts `@import url(...)`, `@theme inline`
      points the three role variables at `var(--font-<slug>)`.
- [ ] `page.tsx`: inline `style` on root div re-maps the three role variables
      based on active settings.
- [ ] Lint + check-types + build pass for both `@yan-portf/web` and
      `@yan-portf/cms`.
- [ ] Manual verification per § 9 done.
- [ ] DEPLOY.md needs no edit (standard deploy path applies).
