-- GET /quotes sorts by the after-VAT total the UI prints (storedTotals in
-- crm-web), not the pre-tax total_amount. Prisma orderBy cannot take an
-- expression and VAT rate varies per quote, so the DB keeps the figure as a
-- STORED generated column.
--
-- Ties round half up like Math.round: round(double precision) goes to even in
-- Postgres (round(2.5) = 2), so the product is rounded as numeric, where ties go
-- away from zero — identical for the non-negative money this holds.
--
-- ADD COLUMN … STORED rewrites Quote under ACCESS EXCLUSIVE inside Prisma's
-- migration transaction; sub-second at this volume (≤ 10³ rows) and the API is
-- restarting anyway. Both inputs are NOT NULL, so no row can fail the backfill.
--
-- Down migration, if ever needed: ALTER TABLE "Quote" DROP COLUMN "grand_total";

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN "grand_total" BIGINT NOT NULL
  GENERATED ALWAYS AS ((total_amount + round((total_amount * vat_rate)::numeric))::bigint) STORED;
