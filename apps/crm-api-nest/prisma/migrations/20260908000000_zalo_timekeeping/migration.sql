-- Normalize existing phones BEFORE the unique index so dirty legacy data fails
-- loudly here (duplicate key) instead of silently misrouting a worker's logins.
-- Same rules as src/common/phone.ts: digits only, 84xxxxxxxxx → 0xxxxxxxxx.
UPDATE "CrewMember" SET phone = regexp_replace(phone, '\D', '', 'g') WHERE phone IS NOT NULL;
UPDATE "CrewMember" SET phone = '0' || substring(phone from 3) WHERE phone LIKE '84%' AND length(phone) = 11;
UPDATE "CrewMember" SET phone = NULL WHERE phone = '';

-- AlterTable
ALTER TABLE "TimekeepingRecord" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "end_time" TEXT,
ADD COLUMN     "start_time" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'approved';

-- CreateIndex
CREATE UNIQUE INDEX "CrewMember_phone_key" ON "CrewMember"("phone");
