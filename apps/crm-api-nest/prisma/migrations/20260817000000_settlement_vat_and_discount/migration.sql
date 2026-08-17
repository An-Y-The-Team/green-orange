-- The quyết toán needs the same money shape as the báo giá it settles: a giảm
-- giá trước thuế and a VAT rate. Without them Bill.total_amount was the pre-VAT
-- subtotal while the contract stated the VAT-inclusive figure, so every đề nghị
-- thanh toán under-asked by the tax.
--
-- Defaults apply to existing rows too (no signed settlements in prod at the time
-- of this migration, so nothing already-signed is restated).
-- AlterTable
ALTER TABLE "Settlement" ADD COLUMN     "discount_amount" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN     "vat_rate" DOUBLE PRECISION NOT NULL DEFAULT 0.08;
