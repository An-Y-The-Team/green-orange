# [Intermediate] Implement Payment Milestones / Thu-Nợ (with a business rule)

> **Labels:** `area:backend` · `crud` · `domain:greenorange` · `business-logic` · `difficulty:hard`
> **Depends on:** #08, #10
> **Good for:** 1 student — the capstone; introduces a **server-enforced rule**.

## Background

**Thanh toán theo đợt (Payment Milestones)** is the công nợ / receivables view: a
contract is collected in stages — tạm ứng (advance), theo tiến độ (progress), on
nghiệm thu (acceptance), and a retained amount held until warranty ends. The **Thu /
Nợ** sidebar page is built but empty in live mode; it calls `GET /payment-milestones`
and `POST /payment-milestones` (see
[`receivables/queries.ts`](<../../apps/crm-web/src/app/(dashboard)/receivables/queries.ts>)
and [`add-payment-milestone.ts`](<../../apps/crm-web/src/app/(dashboard)/receivables/actions/add-payment-milestone.ts>)).

**New concept — a business rule, not just CRUD.** Some milestones are
`gated_by_acceptance`: they **cannot be collected until the project's nghiệm thu is
done** (an `Acceptance` row with `status == "da_nghiem_thu"`, from
[#08](08-costs-and-acceptances.md)). This is the first task where the API enforces
domain logic the UI alone can't be trusted with.

Type: `PaymentMilestone` in
[`src/types/index.ts`](../../apps/crm-web/src/types/index.ts).

## Fields (match the `PaymentMilestone` TS type exactly)

| Field                 | Type | Notes                                                         |
| --------------------- | ---- | ------------------------------------------------------------- |
| `id`                  | int  | server-assigned                                               |
| `contract_code`       | str  | parent contract `code` — index it                             |
| `project_code`        | str  | parent project `code` — index it                              |
| `customer`            | str  |                                                               |
| `name`                | str  | e.g. "Tạm ứng đợt 1"                                          |
| `type`                | str  | `"tam_ung" \| "tien_do" \| "nghiem_thu" \| "giu_bao_hanh"`    |
| `status`              | str  | `"chua_den_han" \| "cho_thanh_toan" \| "da_thu" \| "qua_han"` |
| `due_amount`          | int  | amount due (VND)                                              |
| `paid_amount`         | int  | amount collected so far (VND), default `0`                    |
| `due_date`            | date |                                                               |
| `gated_by_acceptance` | bool | cannot collect until nghiệm thu is done                       |

## Task

1. Model `app/models/payment_milestone.py`; index `contract_code` + `project_code`.
2. Register in [`app/models/__init__.py`](../../apps/crm-api/app/models/__init__.py).
3. Routes `app/api/routes/payment_milestones.py` (prefix `/payment-milestones`) —
   `list`, `create`, plus a **collect** action (see below). `CurrentUser`-protected.
   Add an optional `contract_code` filter on `list`.
4. **Business rule** — add `POST /payment-milestones/{id}/collect` that marks a
   milestone collected (`status="da_thu"`, `paid_amount=due_amount`). It must
   **reject with `409 Conflict`** when `gated_by_acceptance` is true and the
   milestone's project has no `Acceptance` with `status == "da_nghiem_thu"`. (Query
   the `acceptance` table by `project_code`.)
5. Register the router in [`app/main.py`](../../apps/crm-api/app/main.py).
6. Migration: `uv run alembic revision --autogenerate -m "payment_milestones"` →
   `upgrade head`.
7. Test `tests/test_payment_milestones.py` — cover **both** branches of the gate:
   collect blocked (409) with no acceptance, collect allowed (200) once an accepted
   `Acceptance` exists.

## Acceptance criteria

- [ ] `GET/POST /payment-milestones` work; `?contract_code=HD-001` filters correctly.
- [ ] `PaymentMilestonePublic` matches the `PaymentMilestone` type 1:1.
- [ ] `POST /payment-milestones/{id}/collect` returns **409** when gated and the
      project isn't accepted, and **200** (status → `da_thu`) when it is.
- [ ] Router registered; migration + tests (both gate branches) committed and passing.
- [ ] **Thu / Nợ** page shows live milestones in live mode.

## Hints & references

- The gate query joins on the string `project_code`:
  `session.exec(select(Acceptance).where(Acceptance.project_code == m.project_code, Acceptance.status == "da_nghiem_thu")).first()`.
- Raise `HTTPException(status_code=409, detail="Chưa nghiệm thu — không thể thu tiền.")`.
- Depends on Acceptances ([#08](08-costs-and-acceptances.md)) and Contracts
  ([#10](10-contracts-crud.md)) existing.

## Definition of done

The Thu / Nợ page renders live receivables, and the collect endpoint refuses to
collect a gated milestone until the project is accepted — a rule enforced by the
**server**, not the UI. This is the capstone of the backend track. 🎉
</content>
