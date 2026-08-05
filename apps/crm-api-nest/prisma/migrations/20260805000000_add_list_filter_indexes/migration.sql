-- CreateIndex
CREATE INDEX "Project_stage_idx" ON "Project"("stage");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE INDEX "Quote_status_idx" ON "Quote"("status");

-- CreateIndex
CREATE INDEX "CrewMember_status_idx" ON "CrewMember"("status");

-- CreateIndex
CREATE INDEX "CrewMember_employment_type_idx" ON "CrewMember"("employment_type");

-- CreateIndex
CREATE INDEX "CrewMember_default_role_id_idx" ON "CrewMember"("default_role_id");
