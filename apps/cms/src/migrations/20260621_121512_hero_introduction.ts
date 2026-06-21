import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_site_settings_hero_headline_segments_color" AS ENUM('white', 'emerald', 'orange');
  CREATE TYPE "public"."enum_site_settings_introduction_brand_values_icon" AS ENUM('Wrench', 'ShieldCheck', 'Trees');
  CREATE TYPE "public"."enum_site_settings_introduction_brand_values_accent" AS ENUM('orange', 'slate', 'emerald');
  CREATE TABLE "site_settings_hero_headline_segments" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL,
  	"color" "enum_site_settings_hero_headline_segments_color" DEFAULT 'white' NOT NULL,
  	"italic" boolean,
  	"new_line_before" boolean
  );
  
  CREATE TABLE "site_settings_hero_benefits" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"item" varchar NOT NULL
  );
  
  CREATE TABLE "site_settings_introduction_brand_values" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"description" varchar NOT NULL,
  	"icon" "enum_site_settings_introduction_brand_values_icon" NOT NULL,
  	"accent" "enum_site_settings_introduction_brand_values_accent" NOT NULL
  );
  
  CREATE TABLE "site_settings_introduction_process_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"num" varchar NOT NULL,
  	"title" varchar NOT NULL,
  	"description" varchar NOT NULL
  );
  
  ALTER TABLE "site_settings" ADD COLUMN "hero_background_image_id" integer;
  ALTER TABLE "site_settings" ADD COLUMN "hero_trust_badge" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "hero_primary_cta_label" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "hero_primary_cta_href" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "hero_secondary_cta_label" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "hero_secondary_cta_href" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "hero_trust_strap" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "introduction_eyebrow" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "introduction_heading" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "introduction_narrative" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "introduction_image_id" integer;
  ALTER TABLE "site_settings" ADD COLUMN "introduction_motto_eyebrow" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "introduction_brand_story_heading" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "introduction_brand_story_intro" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "introduction_process_eyebrow" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "introduction_process_heading" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "introduction_process_intro" varchar;
  ALTER TABLE "site_settings_hero_headline_segments" ADD CONSTRAINT "site_settings_hero_headline_segments_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_hero_benefits" ADD CONSTRAINT "site_settings_hero_benefits_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_introduction_brand_values" ADD CONSTRAINT "site_settings_introduction_brand_values_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_introduction_process_steps" ADD CONSTRAINT "site_settings_introduction_process_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "site_settings_hero_headline_segments_order_idx" ON "site_settings_hero_headline_segments" USING btree ("_order");
  CREATE INDEX "site_settings_hero_headline_segments_parent_id_idx" ON "site_settings_hero_headline_segments" USING btree ("_parent_id");
  CREATE INDEX "site_settings_hero_benefits_order_idx" ON "site_settings_hero_benefits" USING btree ("_order");
  CREATE INDEX "site_settings_hero_benefits_parent_id_idx" ON "site_settings_hero_benefits" USING btree ("_parent_id");
  CREATE INDEX "site_settings_introduction_brand_values_order_idx" ON "site_settings_introduction_brand_values" USING btree ("_order");
  CREATE INDEX "site_settings_introduction_brand_values_parent_id_idx" ON "site_settings_introduction_brand_values" USING btree ("_parent_id");
  CREATE INDEX "site_settings_introduction_process_steps_order_idx" ON "site_settings_introduction_process_steps" USING btree ("_order");
  CREATE INDEX "site_settings_introduction_process_steps_parent_id_idx" ON "site_settings_introduction_process_steps" USING btree ("_parent_id");
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_hero_background_image_id_media_id_fk" FOREIGN KEY ("hero_background_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_introduction_image_id_media_id_fk" FOREIGN KEY ("introduction_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "site_settings_hero_hero_background_image_idx" ON "site_settings" USING btree ("hero_background_image_id");
  CREATE INDEX "site_settings_introduction_introduction_image_idx" ON "site_settings" USING btree ("introduction_image_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site_settings_hero_headline_segments" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "site_settings_hero_benefits" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "site_settings_introduction_brand_values" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "site_settings_introduction_process_steps" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "site_settings_hero_headline_segments" CASCADE;
  DROP TABLE "site_settings_hero_benefits" CASCADE;
  DROP TABLE "site_settings_introduction_brand_values" CASCADE;
  DROP TABLE "site_settings_introduction_process_steps" CASCADE;
  ALTER TABLE "site_settings" DROP CONSTRAINT "site_settings_hero_background_image_id_media_id_fk";
  
  ALTER TABLE "site_settings" DROP CONSTRAINT "site_settings_introduction_image_id_media_id_fk";
  
  DROP INDEX "site_settings_hero_hero_background_image_idx";
  DROP INDEX "site_settings_introduction_introduction_image_idx";
  ALTER TABLE "site_settings" DROP COLUMN "hero_background_image_id";
  ALTER TABLE "site_settings" DROP COLUMN "hero_trust_badge";
  ALTER TABLE "site_settings" DROP COLUMN "hero_primary_cta_label";
  ALTER TABLE "site_settings" DROP COLUMN "hero_primary_cta_href";
  ALTER TABLE "site_settings" DROP COLUMN "hero_secondary_cta_label";
  ALTER TABLE "site_settings" DROP COLUMN "hero_secondary_cta_href";
  ALTER TABLE "site_settings" DROP COLUMN "hero_trust_strap";
  ALTER TABLE "site_settings" DROP COLUMN "introduction_eyebrow";
  ALTER TABLE "site_settings" DROP COLUMN "introduction_heading";
  ALTER TABLE "site_settings" DROP COLUMN "introduction_narrative";
  ALTER TABLE "site_settings" DROP COLUMN "introduction_image_id";
  ALTER TABLE "site_settings" DROP COLUMN "introduction_motto_eyebrow";
  ALTER TABLE "site_settings" DROP COLUMN "introduction_brand_story_heading";
  ALTER TABLE "site_settings" DROP COLUMN "introduction_brand_story_intro";
  ALTER TABLE "site_settings" DROP COLUMN "introduction_process_eyebrow";
  ALTER TABLE "site_settings" DROP COLUMN "introduction_process_heading";
  ALTER TABLE "site_settings" DROP COLUMN "introduction_process_intro";
  DROP TYPE "public"."enum_site_settings_hero_headline_segments_color";
  DROP TYPE "public"."enum_site_settings_introduction_brand_values_icon";
  DROP TYPE "public"."enum_site_settings_introduction_brand_values_accent";`)
}
