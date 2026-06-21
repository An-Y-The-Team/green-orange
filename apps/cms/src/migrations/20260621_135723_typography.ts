import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_site_settings_typography_heading_font" AS ENUM('be-vietnam-pro', 'manrope', 'playfair-display', 'lora');
  CREATE TYPE "public"."enum_site_settings_typography_hero_display_font" AS ENUM('playfair-display', 'lora', 'dm-serif-display');
  CREATE TYPE "public"."enum_site_settings_typography_body_font" AS ENUM('be-vietnam-pro', 'inter', 'lexend', 'nunito-sans', 'lora');
  ALTER TABLE "site_settings" ADD COLUMN "typography_heading_font" "enum_site_settings_typography_heading_font" DEFAULT 'playfair-display' NOT NULL;
  ALTER TABLE "site_settings" ADD COLUMN "typography_hero_display_font" "enum_site_settings_typography_hero_display_font" DEFAULT 'lora' NOT NULL;
  ALTER TABLE "site_settings" ADD COLUMN "typography_body_font" "enum_site_settings_typography_body_font" DEFAULT 'lora' NOT NULL;
  ALTER TABLE "site_settings" ADD COLUMN "services_section_eyebrow" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "services_section_heading" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "services_section_description" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "projects_section_eyebrow" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "projects_section_heading" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "projects_section_description" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "testimonials_section_eyebrow" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "testimonials_section_heading" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "testimonials_section_description" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site_settings" DROP COLUMN "typography_heading_font";
  ALTER TABLE "site_settings" DROP COLUMN "typography_hero_display_font";
  ALTER TABLE "site_settings" DROP COLUMN "typography_body_font";
  ALTER TABLE "site_settings" DROP COLUMN "services_section_eyebrow";
  ALTER TABLE "site_settings" DROP COLUMN "services_section_heading";
  ALTER TABLE "site_settings" DROP COLUMN "services_section_description";
  ALTER TABLE "site_settings" DROP COLUMN "projects_section_eyebrow";
  ALTER TABLE "site_settings" DROP COLUMN "projects_section_heading";
  ALTER TABLE "site_settings" DROP COLUMN "projects_section_description";
  ALTER TABLE "site_settings" DROP COLUMN "testimonials_section_eyebrow";
  ALTER TABLE "site_settings" DROP COLUMN "testimonials_section_heading";
  ALTER TABLE "site_settings" DROP COLUMN "testimonials_section_description";
  DROP TYPE "public"."enum_site_settings_typography_heading_font";
  DROP TYPE "public"."enum_site_settings_typography_hero_display_font";
  DROP TYPE "public"."enum_site_settings_typography_body_font";`)
}
