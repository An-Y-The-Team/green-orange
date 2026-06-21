import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  // Idempotent ADDs: in dev, the `push` mode may already have created these
  // columns, and a re-run must not fail. On a clean (prod) DB these add the
  // columns normally. Purely additive — no existing data is touched.
  await db.execute(sql`
   ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "enable_a_p_i_key" boolean;
  ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "api_key" varchar;
  ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "api_key_index" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users" DROP COLUMN IF EXISTS "enable_a_p_i_key";
  ALTER TABLE "users" DROP COLUMN IF EXISTS "api_key";
  ALTER TABLE "users" DROP COLUMN IF EXISTS "api_key_index";`)
}
