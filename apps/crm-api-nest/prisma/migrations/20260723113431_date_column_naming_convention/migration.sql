/*
  Warnings:

  - You are about to drop the column `paid_at` on the `Bill` table. All the data in the column will be lost.
  - You are about to drop the column `sent_at` on the `Bill` table. All the data in the column will be lost.
  - You are about to drop the column `signed_at` on the `Contract` table. All the data in the column will be lost.
  - You are about to drop the column `paid_at` on the `PaymentMilestone` table. All the data in the column will be lost.
  - You are about to drop the column `client_signed_at` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `visited_at` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `decided_at` on the `Quote` table. All the data in the column will be lost.
  - You are about to drop the column `signed_at` on the `Settlement` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Bill" DROP COLUMN "paid_at",
DROP COLUMN "sent_at",
ADD COLUMN     "paid_date" DATE,
ADD COLUMN     "sent_date" DATE;

-- AlterTable
ALTER TABLE "Contract" DROP COLUMN "signed_at",
ADD COLUMN     "signed_date" DATE;

-- AlterTable
ALTER TABLE "PaymentMilestone" DROP COLUMN "paid_at",
ADD COLUMN     "paid_date" DATE;

-- AlterTable
ALTER TABLE "Project" DROP COLUMN "client_signed_at",
DROP COLUMN "visited_at",
ADD COLUMN     "client_signed_date" DATE,
ADD COLUMN     "visit_date" DATE;

-- AlterTable
ALTER TABLE "Quote" DROP COLUMN "decided_at",
ADD COLUMN     "decided_date" DATE;

-- AlterTable
ALTER TABLE "Settlement" DROP COLUMN "signed_at",
ADD COLUMN     "signed_date" DATE;
