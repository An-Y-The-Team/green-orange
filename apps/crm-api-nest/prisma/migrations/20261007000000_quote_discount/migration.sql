-- Quote gets a giảm giá trước thuế, like Settlement already has: the Excel
-- Bảng báo giá operators use prints Σ items → "Giảm giá trước thuế" → VAT on the
-- net, and a quote imported from it must total the same.
--
-- grand_total is a generated column, so its expression cannot be altered in
-- place: drop it and add it back over the net. Same rounding as before (numeric,
-- ties away from zero, like Math.round). Existing rows get discount 0, so every
-- stored grand_total is unchanged.
--
-- Down migration, if ever needed: drop grand_total, re-add it with the
-- 20260912000000_quote_grand_total expression, then DROP COLUMN "discount_amount".

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN "discount_amount" BIGINT NOT NULL DEFAULT 0;
ALTER TABLE "Quote" DROP COLUMN "grand_total";
ALTER TABLE "Quote" ADD COLUMN "grand_total" BIGINT NOT NULL
  GENERATED ALWAYS AS (
    ((total_amount - discount_amount) + round(((total_amount - discount_amount) * vat_rate)::numeric))::bigint
  ) STORED;
