-- Quyết toán is 1:1 with the Công Trình: a project settles once. Corrections
-- revise that single row (signed → draft) instead of adding a second phase.
-- Settlements are financial records, so this migration NEVER deletes: if any
-- project already has two, it fails loudly and the operator merges them.
DO $$
DECLARE dups text;
BEGIN
  SELECT string_agg(project_id::text, ', ') INTO dups
  FROM (
    SELECT "project_id" FROM "Settlement" GROUP BY "project_id" HAVING count(*) > 1
  ) d;

  IF dups IS NOT NULL THEN
    RAISE EXCEPTION
      'Settlement is now 1:1 with Project, but these projects have more than one: %. Merge them into a single settlement (keep the signed/latest one, delete the rest with their bills), then re-run this migration.', dups;
  END IF;
END $$;

CREATE UNIQUE INDEX "Settlement_project_id_key" ON "Settlement"("project_id");
