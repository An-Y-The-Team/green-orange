-- Search that matches Vietnamese typed WITHOUT diacritics.
--
-- Every search box was case-insensitive but accent-sensitive, so hunting
-- "Công ty TNHH An Phát" by typing `an phat` — which is how Vietnamese is typed
-- at speed, and how anyone types on a phone — returned ZERO rows. Not a longer
-- list: nothing. That hit /projects, /clients, /quotes, the crew roster and both
-- entity pickers.
--
-- Shape: one STORED generated column per searched name, holding
-- `lower(unaccent(name))`, which the list endpoints compare against a
-- similarly-normalized query. The alternative — `unaccent()` inside the
-- predicate — cannot be expressed in a Prisma `where`, and would have dropped
-- all twelve search sites into `$queryRaw`.

-- `unaccent()` is STABLE, not IMMUTABLE (it depends on a dictionary), so
-- Postgres refuses it in a generated column or an index:
--   ERROR: generation expression is not immutable
-- Pinning the dictionary by name makes the call deterministic, which is the
-- documented way to wrap it.
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION immutable_unaccent(text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT AS $$
  SELECT public.unaccent('public.unaccent'::regdictionary, $1)
$$;

-- GENERATED ALWAYS, not a trigger or an application write: Postgres maintains it
-- on every insert and update, so it cannot drift from `name`, and it stays
-- correct for rows written by the OTHER backend (which knows nothing about it).
ALTER TABLE "Client"
  ADD COLUMN "name_norm" TEXT GENERATED ALWAYS AS (lower(immutable_unaccent(name))) STORED;
ALTER TABLE "Project"
  ADD COLUMN "name_norm" TEXT GENERATED ALWAYS AS (lower(immutable_unaccent(name))) STORED;
ALTER TABLE "CrewMember"
  ADD COLUMN "name_norm" TEXT GENERATED ALWAYS AS (lower(immutable_unaccent(name))) STORED;

-- Trigram GIN, because the predicate is `LIKE '%…%'`: a btree index cannot serve
-- an unanchored match at all, so without these the normalization would just be
-- a seq scan wearing a new column.
CREATE INDEX "Client_name_norm_trgm_idx" ON "Client" USING GIN ("name_norm" gin_trgm_ops);
CREATE INDEX "Project_name_norm_trgm_idx" ON "Project" USING GIN ("name_norm" gin_trgm_ops);
CREATE INDEX "CrewMember_name_norm_trgm_idx" ON "CrewMember" USING GIN ("name_norm" gin_trgm_ops);

-- Codes, tax codes and phone numbers are deliberately NOT normalized: they are
-- ASCII, so `lower()` already matches everything a user could type.
