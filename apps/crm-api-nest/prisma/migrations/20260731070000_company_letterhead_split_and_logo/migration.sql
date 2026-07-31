-- Split the combined header template in two. The letterhead prints on EVERY
-- document; the Quốc hiệu block is statutory and belongs only on legal ones, so
-- keeping both in one template leaked the Quốc hiệu onto quotes and bills.
ALTER TABLE "CompanyProfile" ADD COLUMN "letterhead_body" TEXT;
ALTER TABLE "CompanyProfile" ADD COLUMN "national_body" TEXT;
-- Single company logo, inline data URL (one row, small).
ALTER TABLE "CompanyProfile" ADD COLUMN "logo" TEXT;

-- The old template held letterhead + Quốc hiệu together, so it carries over as
-- the national header. The letterhead falls back to the built-in default until
-- an operator edits it — no customisation is silently discarded.
UPDATE "CompanyProfile"
SET "national_body" = "header_body"
WHERE "header_body" IS NOT NULL;

ALTER TABLE "CompanyProfile" DROP COLUMN "header_body";
