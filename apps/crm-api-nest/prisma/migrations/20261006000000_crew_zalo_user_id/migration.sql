-- Zalo's platform webhook for "user rút lại sự đồng ý và xoá dữ liệu" sends
--   { event: "user.revoke.consent", appId, userId, timestamp }
-- and NO phone number, so the per-app Zalo user id is the only thing a
-- revocation can be matched on. Captured best-effort at mini-app login
-- (src/auth/auth.service.ts); null for every member who has not logged in since
-- this shipped, and for everyone added by the office.
--
-- Nullable + UNIQUE: Postgres allows many NULLs under a unique index, so
-- existing rows need no backfill and cannot collide.

-- AlterTable
ALTER TABLE "CrewMember" ADD COLUMN     "zalo_user_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "CrewMember_zalo_user_id_key" ON "CrewMember"("zalo_user_id");
