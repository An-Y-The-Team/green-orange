# [Intermediate] Implement Contracts / Hợp đồng

> **Labels:** `area:backend` · `crud` · `domain:greenorange` · `difficulty:medium`
> **Depends on:** #07
> **Good for:** 1 student.

## Background

**Hợp đồng (Contract)** is the signed agreement for a project — it carries the agreed
value and payment terms, and it's the parent of the payment milestones in
[#11](11-payment-milestones.md). The UI list + a printable contract document are
built; the backend isn't, so the **Hợp đồng** sidebar page is empty in live mode.
The UI calls `GET /contracts`, `GET /contracts/{id}`, `POST /contracts` (see
[`contracts/queries.ts`](<../../apps/crm-web/src/app/(dashboard)/contracts/queries.ts>)
and [`add-contract.ts`](<../../apps/crm-web/src/app/(dashboard)/contracts/actions/add-contract.ts>)).

This is a **flat resource** like contacts — no nesting — but it's a visible business
page, and its `code` is referenced by payment milestones. Good warm-up before the
gated logic in #11.

Type: `Contract` in [`src/types/index.ts`](../../apps/crm-web/src/types/index.ts).

## Fields (match the `Contract` TS type exactly)

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

> The `Contract` type also has an optional `template_id` (printable template). It
> is **out of scope here** — leave it out for now; [#12 — Contract
> Templates](12-contract-templates.md) adds the column and the related table.

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
- [ ] `ContractPublic` matches the `Contract` type 1:1.
- [ ] Router registered; migration + test committed and passing.
- [ ] **Hợp đồng** list page shows live rows and the printable contract document
      renders (live mode).

## Hints & references

- This is the same flat pattern as [#05 — Contacts](05-contacts-crud.md), just with
  more fields and `date` columns (see how `customer.py` types dates).
- `code` is the key that [#11 — Payment Milestones](11-payment-milestones.md) groups
  by (`contract_code`) — index it.

## Definition of done

The Hợp đồng page renders live contracts.
Next: [11 — Payment Milestones / Thu-Nợ](11-payment-milestones.md).
</content>
