-- The day the client booked the acceptance inspection (nghiệm thu). The UI
-- requires it when leaving Bước 1; the server stays permissive (nullable).
-- The new acceptance_sub_status value "signing" needs no DDL: that column is
-- TEXT with no CHECK constraint.
ALTER TABLE "Project" ADD COLUMN "acceptance_scheduled_date" DATE;
