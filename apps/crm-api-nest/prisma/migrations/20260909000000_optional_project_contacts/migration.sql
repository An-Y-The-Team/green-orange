-- A công trình may be opened before anyone at the company is named: both
-- contact columns become nullable. Existing rows keep their values.
ALTER TABLE "Project" ALTER COLUMN "working_contact_id" DROP NOT NULL;
ALTER TABLE "Project" ALTER COLUMN "decision_maker_contact_id" DROP NOT NULL;
