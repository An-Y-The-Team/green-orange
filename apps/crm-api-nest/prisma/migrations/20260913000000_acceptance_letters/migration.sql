-- Stage-7 letters become editable per project: the client letter and the same
-- request addressed to the building management. NULL = built-in wording.
ALTER TABLE "Project" ADD COLUMN "acceptance_letter_body" TEXT;
ALTER TABLE "Project" ADD COLUMN "building_letter_body" TEXT;
