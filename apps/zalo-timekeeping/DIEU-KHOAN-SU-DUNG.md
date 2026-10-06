# Điều khoản sử dụng — Mini App "Chấm công Ý Ân"

**The terms are no longer kept in this file.** They live on the public site, at:

> <https://dichvuyan.com/dieu-khoan-su-dung>

That URL is what Zalo's version review wants under **Bước 2 → Thiết lập chung →
Điều khoản sử dụng**, and it must stay reachable for as long as the mini app is
published.

## Where the content actually comes from

| Layer                    | Where                                                                |
| ------------------------ | -------------------------------------------------------------------- |
| **Edited by the office** | Directus → **Legal Terms** (singleton) + its **sections** (sortable) |
| **Rendered by**          | `apps/web/src/app/dieu-khoan-su-dung/page.tsx`                       |
| **Fallback copy**        | `DEFAULT_LEGAL_TERMS` in `apps/web/src/data.ts`                      |
| **Seeded from**          | `LEGAL_TERMS` in `apps/cms/seed/seed.ts`                             |

The page renders from the CMS, and falls back to `DEFAULT_LEGAL_TERMS` if
Directus is unreachable — so the reviewer can always open it. Change the wording
in Directus; change `DEFAULT_LEGAL_TERMS` **and** the seed too if the change is
substantive, or a CMS outage would serve the old text.

### Body formatting in the CMS

Each section's **body** is a plain multiline field (this CMS has no rich-text
interface anywhere, on purpose). It supports exactly three things:

- a blank line separates paragraphs
- a block of lines starting with `- ` becomes a bullet list
- `**text**` renders bold

Section numbers come from the sort order — reorder the sections in Directus and
the document renumbers itself. Never type "1." into a heading.

## Legal entity

The operator block (company name, tax code, address, email, phone) is CMS-edited
too, but it must stay the **registered** company — it is deliberately separate
from the marketing company fields in `site_settings`.
