-- Clock in/out + đơn bù công for the Zalo mini app.
--
-- No DDL for the new status value: `status` is a plain TEXT column with no CHECK or
-- enum, so "open" (clocked in, not yet out) needs nothing here. The vocabulary lives in
-- src/crew/crew.module.ts (TIMEKEEPING_STATUS_*) and must stay in sync with it.
--
-- remedy_reason is the discriminator, not just a note: with every zalo row landing
-- `pending`, it is the only thing that tells the operator these times were claimed after
-- the fact rather than stamped by the server. flag carries "over_cap" for a clock-out
-- past MAX_SHIFT_HOURS (src/worker/worker.module.ts), whose hours are clamped to 16.

-- AlterTable
ALTER TABLE "TimekeepingRecord" ADD COLUMN     "flag" TEXT,
ADD COLUMN     "remedy_reason" TEXT;
