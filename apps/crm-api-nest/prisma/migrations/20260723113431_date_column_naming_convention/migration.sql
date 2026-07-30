/*
  Part of the intentional v1 → v2 reset begun in 20260723000000_v2_greenorange_flow,
  which drops and recreates the schema rather than migrating v1 data.

  These *_at → *_date renames carry NO backfill on purpose: `crm_nest` held no
  production data when this shipped (confirmed 2026-07-29, Y Do — see DEPLOY.md §6c),
  so there was nothing to preserve. Do NOT copy this pattern once prod carries data —
  the additive form is
      ALTER TABLE x ADD COLUMN c_date DATE;
      UPDATE x SET c_date = (c_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
      ALTER TABLE x DROP COLUMN c_at;
  and note the timezone cast: a bare ::date reintroduces the UTC day-shift bug that
  businessToday() exists to prevent.

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
