-- F18 — index the referencing side of every foreign key the app actually
-- filters on. Postgres indexes only the referenced (PK) side, so until now
-- every child-table lookup (and every ON DELETE RESTRICT check) was a seq scan
-- whose cost grew with total table size, not with the parent's own row count.
--
-- Strictly ADDITIVE: 22 CREATE INDEX statements, nothing else. No DROP, no
-- ALTER, no data change — unlike 20260723000000 / 20260723113431 (see F08),
-- this one is safe to apply to a populated database.
--
-- Plain CREATE INDEX, not CONCURRENTLY: Prisma wraps each migration in a
-- transaction and CONCURRENTLY is illegal inside one. It takes a SHARE lock
-- (reads unaffected, writes wait for the build) which is sub-second at this
-- data volume, and it is transactional — a failure rolls back cleanly instead
-- of leaving INVALID indexes behind for an operator to find. `migrate deploy`
-- runs unattended on container start, so cleanly-reversible beats lock-free.
--
-- Down migration, if ever needed: DROP INDEX for each name below. Dropping an
-- index loses no data.

-- CreateIndex
CREATE INDEX "Assignment_project_id_idx" ON "Assignment"("project_id");

-- CreateIndex
CREATE INDEX "Assignment_crew_member_id_idx" ON "Assignment"("crew_member_id");

-- CreateIndex
CREATE INDEX "Assignment_role_id_idx" ON "Assignment"("role_id");

-- CreateIndex
CREATE INDEX "Attachment_project_id_idx" ON "Attachment"("project_id");

-- CreateIndex
CREATE INDEX "Attachment_paperwork_item_id_idx" ON "Attachment"("paperwork_item_id");

-- CreateIndex
CREATE INDEX "Bill_project_id_idx" ON "Bill"("project_id");

-- CreateIndex
CREATE INDEX "Contact_client_id_idx" ON "Contact"("client_id");

-- CreateIndex
CREATE INDEX "Contract_project_id_idx" ON "Contract"("project_id");

-- CreateIndex
CREATE INDEX "Location_client_id_idx" ON "Location"("client_id");

-- CreateIndex
CREATE INDEX "Location_manager_contact_id_idx" ON "Location"("manager_contact_id");

-- CreateIndex
CREATE INDEX "PaperworkItem_project_id_idx" ON "PaperworkItem"("project_id");

-- CreateIndex
CREATE INDEX "PaymentMilestone_project_id_bill_id_idx" ON "PaymentMilestone"("project_id", "bill_id");

-- CreateIndex
CREATE INDEX "PaymentMilestone_bill_id_idx" ON "PaymentMilestone"("bill_id");

-- CreateIndex
CREATE INDEX "Project_client_id_idx" ON "Project"("client_id");

-- CreateIndex
CREATE INDEX "Project_location_id_idx" ON "Project"("location_id");

-- CreateIndex
CREATE INDEX "Project_working_contact_id_idx" ON "Project"("working_contact_id");

-- CreateIndex
CREATE INDEX "Project_decision_maker_contact_id_idx" ON "Project"("decision_maker_contact_id");

-- CreateIndex
CREATE INDEX "ProjectNote_project_id_idx" ON "ProjectNote"("project_id");

-- CreateIndex
CREATE INDEX "QuoteItem_quote_id_idx" ON "QuoteItem"("quote_id");

-- CreateIndex
CREATE INDEX "QuoteSendLog_quote_id_idx" ON "QuoteSendLog"("quote_id");

-- CreateIndex
CREATE INDEX "SettlementItem_settlement_id_idx" ON "SettlementItem"("settlement_id");

-- CreateIndex
CREATE INDEX "TimekeepingRecord_project_id_work_date_idx" ON "TimekeepingRecord"("project_id", "work_date");

