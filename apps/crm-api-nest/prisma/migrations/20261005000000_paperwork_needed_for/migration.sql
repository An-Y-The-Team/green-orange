-- Each hồ sơ item names the stage that needs it approved. Only "execution" items
-- gate the auto-advance to Thi công; the later-stage documents seeded up front
-- (đề nghị thanh toán, biên bản nghiệm thu / quyết toán) no longer block it.
ALTER TABLE "PaperworkItem" ADD COLUMN "needed_for" TEXT NOT NULL DEFAULT 'execution';
UPDATE "PaperworkItem" SET "needed_for" = 'acceptance' WHERE "name" = 'Biên bản nghiệm thu khối lượng';
UPDATE "PaperworkItem" SET "needed_for" = 'settlement' WHERE "name" IN ('Đề nghị thanh toán', 'Biên bản quyết toán');
