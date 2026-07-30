-- AlterTable
ALTER TABLE "PaperworkItem" ADD COLUMN     "due_date" DATE;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "acceptance_passed_date" DATE,
ADD COLUMN     "referral_source" TEXT,
ADD COLUMN     "request_note" TEXT,
ADD COLUMN     "survey_items" JSONB;

-- AlterTable
ALTER TABLE "Settlement" ADD COLUMN     "total_amount" BIGINT NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "SettlementItem" (
    "id" SERIAL NOT NULL,
    "settlement_id" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "unit" TEXT,
    "quantity" DECIMAL(65,30) NOT NULL,
    "unit_price" BIGINT NOT NULL,
    "amount" BIGINT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SettlementItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SettlementItem" ADD CONSTRAINT "SettlementItem_settlement_id_fkey" FOREIGN KEY ("settlement_id") REFERENCES "Settlement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
