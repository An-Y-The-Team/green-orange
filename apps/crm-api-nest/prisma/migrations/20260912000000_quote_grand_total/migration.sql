-- GET /quotes sorts by the after-VAT total the UI prints (storedTotals in
-- crm-web), not the pre-tax total_amount. Prisma orderBy cannot take an
-- expression and VAT rate varies per quote, so the DB keeps the figure as a
-- generated column. round() on double precision mirrors Math.round for positive
-- money; the ::bigint cast matches total_amount's type.
--
-- Down migration, if ever needed: ALTER TABLE "Quote" DROP COLUMN "grand_total";

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN "grand_total" BIGINT NOT NULL
  GENERATED ALWAYS AS ((total_amount + round(total_amount * vat_rate))::bigint) STORED;
