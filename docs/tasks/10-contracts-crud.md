# [Intermediate] Implement Contracts / Hợp đồng

> **Labels:** `area:backend` · `crud` · `domain:greenorange` · `difficulty:medium`
> **Depends on:** #07
> **Good for:** 1 student.

## Background

**Hợp đồng (Contract)** is the signed agreement for a project — it carries the agreed
value and payment terms, and it's the parent of the payment milestones in
[#11](11-payment-milestones.md). This is the v1 shape of that resource, and it is
what you build here. crm-web does call `GET /contracts`, `GET /contracts/{id}`,
`POST /contracts` (see
[`contracts/queries.ts`](<../../apps/crm-web/src/app/(dashboard)/contracts/queries.ts>)
and [`create-contract.ts`](<../../apps/crm-web/src/app/(dashboard)/contracts/actions/create-contract.ts>)),
but against the **v2** field shapes — read those files for flavour, not as your
contract.

This is a **flat resource** like contacts — no nesting — but it's a visible business
page, and its `code` is referenced by payment milestones. Good warm-up before the
gated logic in #11.

The field table below **is** the contract for this task. (It used to be checked
against a `Contract` type in crm-web; that file is gone — see
[00 — Choose your backend](00-choose-your-backend.md).)

## Fields (match the table below exactly)

| Field           | Type | Notes                                                                    |
| --------------- | ---- | ------------------------------------------------------------------------ |
| `id`            | int  | server-assigned                                                          |
| `code`          | str  | e.g. `HD-001` — index it (milestones reference it)                       |
| `project_code`  | str  | the project — index it                                                   |
| `customer`      | str  |                                                                          |
| `title`         | str  |                                                                          |
| `value`         | int  | contract value (VND)                                                     |
| `signed_date`   | date |                                                                          |
| `start_date`    | date |                                                                          |
| `end_date`      | date |                                                                          |
| `status`        | str  | `"nhap" \| "da_ky" \| "dang_thuc_hien" \| "thanh_ly"` (default `"nhap"`) |
| `payment_terms` | str  | free text                                                                |

> The `Contract` type also carries several **optional** fields used only by the
> printable document feature — all **out of scope here**; [#12 — Contract
> Templates](12-contract-templates.md) adds them with the related table:
>
> - `template_id` (int, FK) and `body` (rich clause prose — a Lexical editorState
>   JSON string, stored as an opaque long `str`/`text`, never parsed server-side).
> - Party A profile: `customer_address`, `customer_tax_code`, `customer_rep`,
>   `customer_position`, `customer_phone` (all nullable `str`).
> - `vat_rate` (float, nullable; e.g. `0.08`) — the document's financial breakdown
>   is derived from this on the client; the API just stores/returns it.

## Task

1. Model `app/models/contract.py` (`Base`/table/`Create`/`Public`/`Update`); index
   `code` and `project_code`.
2. Register in [`app/models/__init__.py`](../../apps/crm-api/app/models/__init__.py).
3. Routes `app/api/routes/contracts.py` — full CRUD, `CurrentUser`-protected.
4. Register the router in [`app/main.py`](../../apps/crm-api/app/main.py).
5. Migration: `uv run alembic revision --autogenerate -m "contracts"` → `upgrade head`.
6. Test `tests/test_contracts.py`.

## Acceptance criteria

- [ ] Full CRUD on `/contracts` works in `/docs`.
- [ ] `ContractPublic` matches the field table above 1:1.
- [ ] Router registered; migration + test committed and passing.
- [ ] A `curl` round-trip creates a contract and reads it back at `/contracts/{id}`.

## Hints & references

- This is the same flat pattern as [#05 — Contacts](05-contacts-crud.md), just with
  more fields and `date` columns (see how `client.py` types dates).
- `code` is the key that [#11 — Payment Milestones](11-payment-milestones.md) groups
  by (`contract_code`) — index it.

## Definition of done

`/contracts` is a working, tested CRUD resource.
Next: [11 — Payment Milestones / Thu-Nợ](11-payment-milestones.md).
</content>
