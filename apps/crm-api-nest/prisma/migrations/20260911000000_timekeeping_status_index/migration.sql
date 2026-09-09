-- Serves the three status-filtered reads the mini app's operator UI added:
-- GET /timekeeping?status=open (Đang làm card), ?status=pending (Chờ duyệt card)
-- and ?status=open&to=<yesterday> (the dashboard's "Đang làm quá hạn" panel).
-- None of them passes project_id, so @@index([project_id, work_date]) could not
-- be used and each one seq-scanned + sorted TimekeepingRecord — on two
-- force-dynamic pages, per request, on the fastest-growing table in the schema.
--
-- Plain CREATE INDEX, not CONCURRENTLY, for the reasons already written out in
-- 20260728000000_fk_indexes: Prisma wraps each migration in a transaction and
-- CONCURRENTLY is illegal inside one; the SHARE lock is sub-second at this data
-- volume and a failure rolls back cleanly instead of leaving an INVALID index for
-- an operator to find.
--
-- Down migration, if ever needed: DROP INDEX "TimekeepingRecord_status_work_date_idx";

-- CreateIndex
CREATE INDEX "TimekeepingRecord_status_work_date_idx" ON "TimekeepingRecord"("status", "work_date");
