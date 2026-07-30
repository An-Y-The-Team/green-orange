-- Stages 1+2 collapse into one "Yêu cầu & Khảo sát" stage: the appointment IS
-- the survey visit (same day), so tracking them separately was friction.
-- `stage` is a plain String column (no enum type), so this is data-only.
-- Where inside stage 1 a project sits is now told by `visit_date`.
UPDATE "Project" SET "stage" = 'request' WHERE "stage" = 'survey';
