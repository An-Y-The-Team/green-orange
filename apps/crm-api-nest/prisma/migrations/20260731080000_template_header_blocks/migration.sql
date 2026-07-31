-- Header blocks become two independent flags. They were a single either/or
-- `header_style`, which could not express "letterhead AND Quốc hiệu" — the
-- normal case for official Vietnamese paperwork.
ALTER TABLE "ContractTemplate" ADD COLUMN "show_letterhead" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ContractTemplate" ADD COLUMN "show_national" BOOLEAN NOT NULL DEFAULT true;

-- Preserve how each existing template already printed. 'national' rendered the
-- combined letterhead+Quốc hiệu header, so both flags stay on; 'letterhead'
-- rendered branding only.
UPDATE "ContractTemplate"
SET "show_letterhead" = true,
    "show_national" = ("header_style" = 'national');

ALTER TABLE "ContractTemplate" DROP COLUMN "header_style";
