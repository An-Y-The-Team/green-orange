# Plan: CMS-driven color theme (1 select, 5 presets)

> **Audience**: a fresh agent picking this up cold. Assume nothing.
> **Outcome**: the business owner can change the site's brand color palette
> from the Directus admin UI without a deploy, choosing from 5 curated presets.

## Why this exists

The site (`apps/web`) used a hardcoded "Green-Orange" brand palette
(emerald + orange) sprinkled as Tailwind utilities across all 8 section
components. This feature moves palette selection into the Directus
`site_settings` singleton so picking a different color scheme is a one-click
change — the same pattern used for CMS-driven typography.

## Approach: curated presets, not raw hex

A raw-hex approach (two `inputColor` fields) won't work here: the brand
colors are used across many shade variants (50–950), in gradients, with
opacity modifiers, and in tinted overlays. A single hex can't produce all
shades reliably.

Instead, the editor picks a named **preset** from a dropdown. Each preset
maps to a full pre-baked 50–950 oklch shade scale stored in
`apps/web/src/lib/color-themes.ts`. This mirrors the typography feature's
font-roster approach.

## Color theme roster (locked)

| Slug | Primary (was emerald) | Secondary (was orange) |
|------|-----------------------|------------------------|
| `green-orange` *(default)* | emerald | orange |
| `ocean` | blue | sky |
| `royal` | violet | fuchsia |
| `crimson` | rose | red |
| `forest` | teal | indigo |

The `green-orange` preset reproduces Tailwind's emerald + orange oklch
values byte-for-byte (copied from `node_modules/tailwindcss/theme.css`) so
the default look is identical to the pre-theme site.

## Architecture: the four-step Tailwind v4 pattern

```
CSS Variable Definition → @theme inline Mapping → Tailwind Utility Class
--brand-primary-500      → --color-brand-primary-500 → bg-brand-primary-500
```

1. **`globals.css` `:root`** — defines `--brand-primary-*` and
   `--brand-secondary-*` with default (green-orange) oklch values.
2. **`globals.css` `@theme inline`** — maps each to `--color-brand-*` so
   Tailwind generates `bg-brand-primary-500`, `text-brand-secondary-600`,
   `from-brand-primary-400`, etc.
3. **`page.tsx` inline `style`** — calls `themeCssVars(slug)` to override
   the `:root` defaults with the active theme's values at runtime.
4. **Components** — use `brand-primary-*` / `brand-secondary-*` utilities
   instead of hardcoded `emerald-*` / `orange-*`.

## Files changed

### New
- `apps/web/src/lib/color-themes.ts` — theme registry + `themeCssVars()` helper

### Web frontend
- `apps/web/src/app/globals.css` — `:root` brand vars + `@theme inline` mappings
- `apps/web/src/app/page.tsx` — spread `themeCssVars()` into root div style
- `apps/web/src/lib/directus.ts` — `color_theme` field on `DirectusSiteSettings`
- `apps/web/src/data.ts` — `ColorThemeSettings` type, `pickColorTheme()` helper,
  `DEFAULT_SETTINGS.colorTheme`, `getSiteSettings` mapping
- 8 section components + `contact-form/constants.ts` — `emerald-*` →
  `brand-primary-*`, `orange-*` → `brand-secondary-*`

### CMS
- `apps/cms/scripts/build-schema.ts` — `color_theme` dropdown on `site_settings`
- `apps/cms/seed/seed.ts` — `colorTheme: 'green-orange'` default + field mapping
- `apps/cms/scripts/migrate-from-payload.ts` — `color_theme: 'green-orange'`
- `apps/cms/snapshots/snapshot.yaml` — `color_theme` field definition

## Deploy

No migration needed — the new field defaults to `null` at the DB level and
the frontend falls back to `green-orange` via `pickColorTheme()`. Seed is
optional (only if you want to explicitly set the value). Standard deploy
path applies. After deploy, re-snapshot on the VPS:
`docker exec <cms-container> npx directus schema snapshot --yes /directus/snapshots/snapshot.yaml`

## Out of scope

- Per-element color tags (`HeadlineColor`, `BrandValueAccent`) still use
  literal hue names (`emerald`, `orange`, `slate`). Their *class maps*
  now reference `brand-primary-*` / `brand-secondary-*` utilities, so they
  track the active theme visually, but the Directus field *choices* still
  say "emerald"/"orange". Renaming those to role-based ("primary"/
  "secondary"/"neutral") is a follow-up PR — it changes existing data.
- Raw hex color inputs. Presets only, for v1.
- Neutral colors (`slate`, `gray`, `white`) remain hardcoded — they're
  structural, not brand.