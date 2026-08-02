# Document headers, company profile & templates (crm-web)

How every printed A4 document in the CRM gets its header, where the company
data lives, and how a signed contract stays reproducible. Written after the
live-contract-editing work (PR #64) and the header rework that followed.

Related: [crm-business-flow.md](./crm-business-flow.md) ·
[crm-database-schema.md](./crm-database-schema.md)

---

## 1. The model in one picture

```text
CompanyProfile (single row, id=1)          ContractTemplate (per template)
├─ name, tagline, address, tax_id,         ├─ body            (Lexical JSON)
│  phone, email, website                   ├─ doc_title
├─ representative, representative_title    ├─ show_letterhead (bool, default true)
├─ bank_account, bank_name, bank_branch    └─ show_national   (bool, default true)
├─ letterhead_body  (Lexical JSON)
├─ national_body    (Lexical JSON)                  │
└─ logo             (data URL)                      │
             │                                      │
             └──────────────┬───────────────────────┘
                            ▼
                     DocumentShell
        renders: [logo + letterhead_body] then [national_body]
        gated by headerBlocks { letterhead, national }
```

**Two header blocks, independent — not alternatives.** Official Vietnamese
paperwork carries the Quốc hiệu, and the company letterhead sits above it, so
**both print by default on every document**. A template may switch either off.

> This was originally an either/or enum (`HeaderVariant = letterhead | national`),
> which made "letterhead AND Quốc hiệu" impossible to express. That is why the
> Quốc hiệu kept appearing in the wrong set of documents. Replaced by
> `HeaderBlocks { letterhead: boolean; national: boolean }` in
> `src/constants/header-blocks.ts`.

## 2. Templates are the unit of header configuration

Header flags live on the **template**, not on the document type and not on a
print page. Contracts are the only templated document today, but báo giá,
nghiệm thu, quyết toán and receivables are heading the same way, so nothing in
the header path is contract-specific:

- a document **with** a template uses that template's two flags;
- a document **without** one gets `DEFAULT_HEADER_BLOCKS` (both on).

Adding templates for another paperwork type therefore needs **no header work** —
only the template type itself.

## 3. Company data vs. templates (the editing model)

`/settings/company` is deliberately split in two, mirroring contract templates:

| Left — templates                      | Right — data                                                             |
| ------------------------------------- | ------------------------------------------------------------------------ |
| Letterhead (rich text + `Chèn` chips) | Thông tin công ty: tên, slogan, địa chỉ, MST, điện thoại, email, website |
| Quốc hiệu (rich text + `Chèn` chips)  | Đại diện pháp luật: họ tên, chức vụ                                      |
| Logo upload                           | Tài khoản ngân hàng: số TK, ngân hàng, chi nhánh                         |

Templates never contain typed-in company data — they contain **merge chips**
(green), which are populated from the fields on the right. Chip labels in the
`Chèn` menu match the field labels exactly (`Tên công ty`, not `Bên B: Tên`) so
an operator can trace a chip back to the field that fills it.

**Chips are display-resolved but token-stored.** While editing, a chip shows its
live value (`resolveMergeFieldText`); before saving, the display text is reset to
the token label (`stripMergeFieldText`). Without that pairing, a template's
_sample_ values were persisted and later surfaced as fake financial figures on
real contracts (see §6).

### Logo

Single logo, stored inline as a data URL in `CompanyProfile.logo`. The upload UI
validates the type, rejects >8 MB, and downscales to a 600px longest edge before
saving; SVG passes through untouched. The API caps the field as a backstop. It
prints to the left of the letterhead on every document.

## 4. Print-time company resolution

`settings/company/queries.ts` exposes two entry points:

- `loadCompany()` → `{ company, degraded }`
- `getCompany()` → just the company (for chrome that can live with defaults)

`degraded` means **the stored profile could not be read** (expired session, dead
backend) — deliberately distinct from _"no profile saved yet"_, where the
built-in defaults in `config/company.ts` are the truth and nothing is wrong. A
200 with `{}` and a 501 (Python sandbox) are **not** degraded.

Documents carrying money or legal identity — the **bill** and the **contract** —
refuse to render when `degraded`, showing `CompanyUnavailable` instead of quietly
printing the built-in default bank account or the wrong Bên B. Everything else
degrades silently. Same "refuse rather than emit a wrong document" stance as the
contract page's missing-chốt-quote guard.

## 5. Signed contracts are frozen (`print_snapshot`)

A signed contract must reprint exactly as signed, so the signing step freezes
everything outside its `body` into `Contract.print_snapshot` (JSON):

```ts
{ company: CompanyData, header_blocks: HeaderBlocks, doc_title: string }
```

- The print page prefers the snapshot; drafts render live.
- The snapshot is fed to the shell through `CompanyProvider`, so the letterhead,
  header templates and Bên B signature default all read the frozen copy at once.
- **Signing is refused when `degraded`** — freezing a guess would immortalise the
  wrong party.
- Contracts signed before snapshots existed have none and fall back to live
  values, exactly as before.

## 6. Content-freeze rules on a signed contract

Enforced in three layers, because hiding a link is not enforcement:

1. **Backend** (`contracts.module.ts`): PATCH rejects changes to any
   `CONTRACT_CONTENT_FIELDS` (body, note, template*id, the six `rep*\*`fields,`print_snapshot`) once `status !== "draft"`. `status`/`signed_date` stay
   writable so signing still works.
2. **Page**: `/projects/:id/contracts/new?edit=:id` refuses to mount the editor
   for a signed contract — the URL is hand-typable and the editor autosaves.
3. **Links**: `Sửa` renders only for drafts (contracts list, contract detail,
   project stage-4 panel).

## 7. Editors

Three editors share one stack (Lexical 0.41):

| Editor            | Component             | Shape                                     |
| ----------------- | --------------------- | ----------------------------------------- |
| Contract          | `contract-editor.tsx` | Full A4 sheet (`PageEditor`)              |
| Contract template | `template-editor.tsx` | Full A4 sheet (`PageEditor`)              |
| Header templates  | `TemplateBlock`       | Small standalone blocks, several per page |

### 7a. `PageEditor` — the shared A4 surface

Google-Docs-style: **you type directly on the sheet**, with the letterhead,
Quốc hiệu, document title and signature footer rendered around the caret — no
separate edit/preview columns. It supplies a sticky toolbar (formatting +
alignment, a `Chèn` merge-chip menu, `Nhập .docx` import), a grey canvas around
a centred white page, live page breaks (`PaginationPlugin`), and slots the host
fills: `title`, `toolbarExtra`, `status`, `footer`, `headerBlocks`, `resolve`.

Seeding is **uncontrolled**: `value` is read once at mount, so reseeding
(picking a different template) means remounting via a changed React `key`.

### 7b. Contract editor (`/projects/:id/contracts/new[?edit=:id]`)

Authoring one contract. On top of the shared surface:

- **Template picker** in the toolbar. Choosing one refills the body from the
  template; if the current body has content it confirms first
  (`Thay nội dung hiện tại bằng nội dung mẫu?`), since there is no Save button
  to back out of. Header blocks follow the chosen template.
- **Autosave mints the draft.** No Save button: the first meaningful change
  POSTs a new contract, then `history.replaceState` swaps the URL to
  `?edit=<id>` so a refresh resumes it — without `router.replace`, which would
  remount the editor mid-typing. An empty document never mints a contract.
- **Body seeding**, in order: the contract's own body → its template's body →
  `DEFAULT_CONTRACT_BODY` (only for an existing contract; a fresh one starts
  blank so the template picker does not immediately nag). `ensureLexicalBody`
  wraps v1-era plain-text bodies so old contracts stay editable.
- **Editable signature footer** (`EditableSignatureBlocks`) replaces the static
  one: column label, signer name and title are inline inputs for both parties,
  stored as six `rep_*` columns. Labels prefill with `ĐẠI DIỆN BÊN A/B`;
  placeholders show the fallback that prints when a line is left empty (the
  company representative on Bên B).
- **Chips resolve to real contract values** (client, project, quote money) while
  editing, and are stripped back to tokens on save.
- Signed contracts never reach this editor — see §6.

### 7c. Contract-template editor (`/contracts/templates/new|:id/edit`)

Authoring reusable boilerplate. Same surface, different framing:

- **The printed document title is edited inline on the page** (the big centred
  heading), not in a side form.
- **Template meta lives in the toolbar**: `Tên mẫu`, the two header-block
  checkboxes (`Letterhead`, `Quốc hiệu`), `Đang sử dụng`, and `Xuất .docx (mẫu)`.
- **Chips show sample values** (`previewContext()`) so the page reads like a
  finished document, and are stripped to tokens before saving — this pairing is
  what stops demo figures leaking into real contracts (§3).
- **Validity gating**: until name, title and body all exist, autosave reports
  `invalid` and creates nothing — the badge says what is missing rather than
  silently minting junk templates.
- `saveTemplate` refuses bodies containing unresolvable merge tokens (e.g. from
  a .docx import) and names them; that message surfaces on the badge and in the
  "Xong" toast.

### 7d. Shared autosave

All three autosave through `useAutosave` (`components/editor/use-autosave.tsx`):

- debounced 1.5s, coalescing changes that arrive mid-flight;
- `run()` wraps the persist in try/catch with `inflight` cleared in `finally` —
  without it one rejected save wedged autosave permanently on "Đang lưu…";
- `SaveResult` carries the **server's own message**, so actionable refusals (e.g.
  save-template's unknown-merge-token error) reach the badge and a toast instead
  of collapsing into a bare "Lỗi khi lưu";
- `flush()` returns the result so "Xong" can explain why it will not navigate.

### Pagination (`PaginationPlugin`)

Draws Google-Docs-style page breaks on the editable sheet. Two subtleties, both
learned the hard way:

- `minHeight` must be cleared **before** measuring — it floors `scrollHeight`.
- The gap bands are portaled into the same sheet, so they must be excluded from
  the block walk (`data-page-band`) and the page count derived from the last real
  block's bottom. Counting them made pagination self-feeding: each band added
  height → a page → another band, and the count could never come back down.

## 8. Gotchas worth remembering

- **`turbo prune --docker` installs differently from the repo root.** Optional
  peer deps (e.g. `@types/react-dom`, an optional peer of Radix) exist locally but
  not in the image, so `check-types` passes in CI while the Docker build fails.
  Declare every type package a workspace actually imports.
- **Nest's `whitelist: true` silently strips unknown DTO fields.** After adding a
  column, a stale API process will drop the new field with no error — restart it
  before concluding the code is wrong.
- **Schema changes that drop a column need a hand-written migration.** Both the
  `header_body` split and the `header_style` → two-flags change copy data forward
  before dropping, so no operator customisation is silently discarded.
- **.docx export ignores the header entirely** — it exports title + body only, so
  a Word export currently lacks the letterhead and Quốc hiệu. Known gap.
- Block **alignment** is a Lexical element-level string `format`; it must be
  mapped explicitly both in the HTML renderer and the .docx exporter, or the
  centred Quốc hiệu exports left-aligned.
