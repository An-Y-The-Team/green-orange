-- Uploads everywhere: an attachment is owned by a project OR a crew member
-- (CCCD / chứng chỉ scans) and may link to the exact record it documents.
-- Hand-trimmed: `migrate dev` also proposed dropping the trigram indexes and
-- name_norm defaults, which are raw-SQL objects Prisma cannot model — not drift.
ALTER TABLE "Attachment" ADD COLUMN "crew_member_id" INTEGER,
ADD COLUMN "quote_id" INTEGER,
ADD COLUMN "contract_id" INTEGER,
ADD COLUMN "payment_milestone_id" INTEGER,
ADD COLUMN "bill_id" INTEGER,
ALTER COLUMN "project_id" DROP NOT NULL;

-- Exactly one owner. Prisma cannot express this; Python's model declares the
-- same CheckConstraint so its create_all/alembic schema matches.
ALTER TABLE "Attachment" ADD CONSTRAINT "attachment_one_owner"
  CHECK (("project_id" IS NULL) <> ("crew_member_id" IS NULL));

CREATE INDEX "Attachment_crew_member_id_idx" ON "Attachment"("crew_member_id");
CREATE INDEX "Attachment_quote_id_idx" ON "Attachment"("quote_id");
CREATE INDEX "Attachment_contract_id_idx" ON "Attachment"("contract_id");
CREATE INDEX "Attachment_payment_milestone_id_idx" ON "Attachment"("payment_milestone_id");
CREATE INDEX "Attachment_bill_id_idx" ON "Attachment"("bill_id");

ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_crew_member_id_fkey" FOREIGN KEY ("crew_member_id") REFERENCES "CrewMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_payment_milestone_id_fkey" FOREIGN KEY ("payment_milestone_id") REFERENCES "PaymentMilestone"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "Bill"("id") ON DELETE SET NULL ON UPDATE CASCADE;
