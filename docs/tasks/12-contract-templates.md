# [Intermediate] Implement Contract Templates / Mẫu hợp đồng

> **Labels:** `area:backend` · `crud` · `domain:greenorange` · `difficulty:medium`
> **Depends on:** #10
> **Good for:** 1 student.

## Background

**Mẫu hợp đồng (Contract Template)** is user-authored boilerplate — rich-text
clauses and headings with **merge-field tokens** (e.g. `customer`, `value`,
`company.name`) that get merged with a contract's data when the printable
document is rendered. The _variable_ data lives on the `Contract`; the _reusable
prose_ lives on the template. A contract optionally references one via a
`template_id` field; on create the template's body is **copied** onto the
contract's own `body` (then editable per contract). When a contract has a body
its detail page renders the merged document; otherwise it falls back to the
built-in hard-coded layout.

> **Editor note:** the body is authored in a **Lexical** rich-text editor and
> stored as the string form of `editorState.toJSON()` (a JSON document, not
> `{{token}}` text). Merge fields are first-class editor nodes. The API still
> only stores/returns this as an opaque long string — see the field table and
> the client-side note below.

The **entire UI is built and works on mock data** (`apps/crm-web`):

- `Mẫu hợp đồng` list + editor with a token palette and a live preview:
  [`contracts/templates/`](<../../apps/crm-web/src/app/(dashboard)/contracts/templates>).
- The token whitelist + context builders are a pure module:
  [`lib/merge-template.ts`](../../apps/crm-web/src/lib/merge-template.ts). The
  merge itself is node-level — merge-field nodes in the Lexical body are resolved
  against a contract's data by
  [`components/editor/lexical-document.tsx`](../../apps/crm-web/src/components/editor/lexical-document.tsx);
  unknown tokens render as `⟨token?⟩`.
- The contract create form is now a **page** (`/contracts/new`, not a modal) with
  a template picker.

The backend doesn't exist yet, so in **live mode** (`CRM_API_URL` set) the
template list comes back empty and the `template_id` is never persisted. This
task builds the missing API so the feature lights up end-to-end.

Types: `ContractTemplate` and the new `Contract.template_id` in
[`src/types/index.ts`](../../apps/crm-web/src/types/index.ts).

## Fields (match the `ContractTemplate` TS type exactly)

| Field          | Type | Notes                                                 |
| -------------- | ---- | ----------------------------------------------------- |
| `id`           | int  | server-assigned                                       |
| `name`         | str  | internal name, e.g. "Hợp đồng dịch vụ vệ sinh"        |
| `doc_title`    | str  | printed heading, e.g. "HỢP ĐỒNG DỊCH VỤ VỆ SINH"      |
| `body`         | str  | Lexical editorState JSON, string form (long/text)     |
| `header_style` | str  | `"letterhead" \| "national"` (default `"letterhead"`) |
| `is_active`    | bool | default `true`; only active templates are pickable    |

Plus a **migration on `contracts`** adding these nullable columns (all opaque to
the API — stored and returned as-is, no server-side parsing):

- `template_id` (int, FK to `contract_templates.id`, no cascade — clearing a
  template shouldn't delete contracts).
- `body` (long `str`/`text`) — the contract's own rich clause prose (seeded from
  the template, edited per contract).
- Party A profile: `customer_address`, `customer_tax_code`, `customer_rep`,
  `customer_position`, `customer_phone` (`str`).
- `vat_rate` (float; e.g. `0.08`) — drives the document's financial breakdown
  tokens (`value_before_tax`, `vat_amount`, `value_in_words`), all computed on the
  client.

> **Line-items block:** the contract's pricing table is **not** a stored column —
> it's a placeholder node in `body` that the client renders from the linked
> **Quote** (`items` + `vat_rate`, resolved by `project_code`). No contract-side
> storage; nothing for the API to do here beyond the existing quotes endpoints.

## Task

1. Model `app/models/contract_template.py`
   (`Base`/table/`Create`/`Public`/`Update`).
2. Add the nullable contract columns above (`template_id`, `body`, the Party A
   fields, `vat_rate`) to the `Contract` model (#10) + `ContractPublic`/`Update`.
3. Register both in
   [`app/models/__init__.py`](../../apps/crm-api/app/models/__init__.py).
4. Routes `app/api/routes/contract_templates.py` — full CRUD,
   `CurrentUser`-protected, mounted at `/contract-templates` (note the **hyphen**
   — it must match
   [`contracts/queries.ts`](<../../apps/crm-web/src/app/(dashboard)/contracts/queries.ts>)).
5. Register the router in
   [`app/main.py`](../../apps/crm-api/app/main.py).
6. Migration: `uv run alembic revision --autogenerate -m "contract templates"`
   → `upgrade head` (creates the table **and** adds `contracts.template_id`).
7. Test `tests/test_contract_templates.py`.

## Acceptance criteria

- [ ] Full CRUD on `/contract-templates` works in `/docs`.
- [ ] `ContractTemplatePublic` matches the `ContractTemplate` type 1:1.
- [ ] `POST/PATCH /contracts` accepts and persists the new contract columns
      (`template_id`, `body`, Party A fields, `vat_rate`).
- [ ] Router registered; migration + test committed and passing.
- [ ] Live mode: the **Mẫu hợp đồng** page lists templates, the editor saves, and
      a contract with a `template_id` renders the **merged** printable document.

## Hints & references

- Same flat-CRUD pattern as [#05 — Contacts](05-contacts-crud.md) and
  [#10 — Contracts](10-contracts-crud.md); `body` is just a long `str`/`text`
  column holding a JSON string — **do not parse it server-side**.
- The endpoint path uses a **hyphen** (`/contract-templates`); the UI calls that
  exact path in `listContractTemplates` / `getContractTemplate` / `saveTemplate`.
- The merge/import/export logic is **all client-side or server-render-only in
  crm-web** — the API only stores and returns the raw `body` string (Lexical
  JSON). Don't render, expand tokens, or validate the JSON on the server.
- `template_id` is nullable on purpose: a template-less contract uses the
  fallback layout, so the column must allow `NULL`.

## Definition of done

The Mẫu hợp đồng page and the contract template editor work against the live API,
and a contract pointing at a template prints its merged document.
Next: revisit [11 — Payment Milestones / Thu-Nợ](11-payment-milestones.md).
