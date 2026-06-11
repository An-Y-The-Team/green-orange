import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "services_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_services_v_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "projects_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_projects_v_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  -- Remap existing locale rows from the old 'en' code to 'vi' before the enum is
  -- narrowed to only 'vi' — otherwise the cast back to the enum below fails.
  UPDATE "services_locales" SET "_locale" = 'vi' WHERE "_locale" = 'en';
  UPDATE "_services_v_locales" SET "_locale" = 'vi' WHERE "_locale" = 'en';
  UPDATE "projects_locales" SET "_locale" = 'vi' WHERE "_locale" = 'en';
  UPDATE "_projects_v_locales" SET "_locale" = 'vi' WHERE "_locale" = 'en';
  DROP TYPE "public"."_locales";
  CREATE TYPE "public"."_locales" AS ENUM('vi');
  ALTER TABLE "services_locales" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_services_v_locales" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "projects_locales" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_projects_v_locales" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_services_v" ALTER COLUMN "published_locale" SET DATA TYPE text;
  UPDATE "_services_v" SET "published_locale" = 'vi' WHERE "published_locale" = 'en';
  DROP TYPE "public"."enum__services_v_published_locale";
  CREATE TYPE "public"."enum__services_v_published_locale" AS ENUM('vi');
  ALTER TABLE "_services_v" ALTER COLUMN "published_locale" SET DATA TYPE "public"."enum__services_v_published_locale" USING "published_locale"::"public"."enum__services_v_published_locale";
  ALTER TABLE "_projects_v" ALTER COLUMN "published_locale" SET DATA TYPE text;
  UPDATE "_projects_v" SET "published_locale" = 'vi' WHERE "published_locale" = 'en';
  DROP TYPE "public"."enum__projects_v_published_locale";
  CREATE TYPE "public"."enum__projects_v_published_locale" AS ENUM('vi');
  ALTER TABLE "_projects_v" ALTER COLUMN "published_locale" SET DATA TYPE "public"."enum__projects_v_published_locale" USING "published_locale"::"public"."enum__projects_v_published_locale";
  ALTER TABLE "_testimonials_v" ALTER COLUMN "published_locale" SET DATA TYPE text;
  UPDATE "_testimonials_v" SET "published_locale" = 'vi' WHERE "published_locale" = 'en';
  DROP TYPE "public"."enum__testimonials_v_published_locale";
  CREATE TYPE "public"."enum__testimonials_v_published_locale" AS ENUM('vi');
  ALTER TABLE "_testimonials_v" ALTER COLUMN "published_locale" SET DATA TYPE "public"."enum__testimonials_v_published_locale" USING "published_locale"::"public"."enum__testimonials_v_published_locale";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "services_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_services_v_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "projects_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_projects_v_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  UPDATE "services_locales" SET "_locale" = 'en' WHERE "_locale" = 'vi';
  UPDATE "_services_v_locales" SET "_locale" = 'en' WHERE "_locale" = 'vi';
  UPDATE "projects_locales" SET "_locale" = 'en' WHERE "_locale" = 'vi';
  UPDATE "_projects_v_locales" SET "_locale" = 'en' WHERE "_locale" = 'vi';
  DROP TYPE "public"."_locales";
  CREATE TYPE "public"."_locales" AS ENUM('en');
  ALTER TABLE "services_locales" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_services_v_locales" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "projects_locales" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_projects_v_locales" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_services_v" ALTER COLUMN "published_locale" SET DATA TYPE text;
  UPDATE "_services_v" SET "published_locale" = 'en' WHERE "published_locale" = 'vi';
  DROP TYPE "public"."enum__services_v_published_locale";
  CREATE TYPE "public"."enum__services_v_published_locale" AS ENUM('en');
  ALTER TABLE "_services_v" ALTER COLUMN "published_locale" SET DATA TYPE "public"."enum__services_v_published_locale" USING "published_locale"::"public"."enum__services_v_published_locale";
  ALTER TABLE "_projects_v" ALTER COLUMN "published_locale" SET DATA TYPE text;
  UPDATE "_projects_v" SET "published_locale" = 'en' WHERE "published_locale" = 'vi';
  DROP TYPE "public"."enum__projects_v_published_locale";
  CREATE TYPE "public"."enum__projects_v_published_locale" AS ENUM('en');
  ALTER TABLE "_projects_v" ALTER COLUMN "published_locale" SET DATA TYPE "public"."enum__projects_v_published_locale" USING "published_locale"::"public"."enum__projects_v_published_locale";
  ALTER TABLE "_testimonials_v" ALTER COLUMN "published_locale" SET DATA TYPE text;
  UPDATE "_testimonials_v" SET "published_locale" = 'en' WHERE "published_locale" = 'vi';
  DROP TYPE "public"."enum__testimonials_v_published_locale";
  CREATE TYPE "public"."enum__testimonials_v_published_locale" AS ENUM('en');
  ALTER TABLE "_testimonials_v" ALTER COLUMN "published_locale" SET DATA TYPE "public"."enum__testimonials_v_published_locale" USING "published_locale"::"public"."enum__testimonials_v_published_locale";`)
}
