import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_site_settings_navigation_items_section_id" AS ENUM('hero', 'introduction', 'services', 'projects', 'testimonials', 'contact');
  CREATE TYPE "public"."enum_site_settings_footer_quick_links_section_id" AS ENUM('hero', 'introduction', 'services', 'projects', 'testimonials', 'contact');
  CREATE TABLE "site_settings_navigation_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"section_id" "enum_site_settings_navigation_items_section_id" NOT NULL
  );
  
  CREATE TABLE "site_settings_footer_quick_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"section_id" "enum_site_settings_footer_quick_links_section_id" NOT NULL
  );
  
  ALTER TABLE "site_settings" ADD COLUMN "branding_logo_text_primary" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "branding_logo_text_secondary" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "branding_header_tagline" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "branding_footer_tagline" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "navigation_header_cta_label" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "navigation_mobile_cta_label" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "footer_brand_description" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "footer_quick_links_heading" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "footer_offices_heading" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "footer_headquarters_label" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "footer_branch_label" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "footer_support_heading" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "footer_hotline_prefix" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "footer_email_prefix" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "footer_copyright_suffix" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "footer_back_to_top_label" varchar;
  ALTER TABLE "site_settings_navigation_items" ADD CONSTRAINT "site_settings_navigation_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_footer_quick_links" ADD CONSTRAINT "site_settings_footer_quick_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "site_settings_navigation_items_order_idx" ON "site_settings_navigation_items" USING btree ("_order");
  CREATE INDEX "site_settings_navigation_items_parent_id_idx" ON "site_settings_navigation_items" USING btree ("_parent_id");
  CREATE INDEX "site_settings_footer_quick_links_order_idx" ON "site_settings_footer_quick_links" USING btree ("_order");
  CREATE INDEX "site_settings_footer_quick_links_parent_id_idx" ON "site_settings_footer_quick_links" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "site_settings_navigation_items" CASCADE;
  DROP TABLE "site_settings_footer_quick_links" CASCADE;
  ALTER TABLE "site_settings" DROP COLUMN "branding_logo_text_primary";
  ALTER TABLE "site_settings" DROP COLUMN "branding_logo_text_secondary";
  ALTER TABLE "site_settings" DROP COLUMN "branding_header_tagline";
  ALTER TABLE "site_settings" DROP COLUMN "branding_footer_tagline";
  ALTER TABLE "site_settings" DROP COLUMN "navigation_header_cta_label";
  ALTER TABLE "site_settings" DROP COLUMN "navigation_mobile_cta_label";
  ALTER TABLE "site_settings" DROP COLUMN "footer_brand_description";
  ALTER TABLE "site_settings" DROP COLUMN "footer_quick_links_heading";
  ALTER TABLE "site_settings" DROP COLUMN "footer_offices_heading";
  ALTER TABLE "site_settings" DROP COLUMN "footer_headquarters_label";
  ALTER TABLE "site_settings" DROP COLUMN "footer_branch_label";
  ALTER TABLE "site_settings" DROP COLUMN "footer_support_heading";
  ALTER TABLE "site_settings" DROP COLUMN "footer_hotline_prefix";
  ALTER TABLE "site_settings" DROP COLUMN "footer_email_prefix";
  ALTER TABLE "site_settings" DROP COLUMN "footer_copyright_suffix";
  ALTER TABLE "site_settings" DROP COLUMN "footer_back_to_top_label";
  DROP TYPE "public"."enum_site_settings_navigation_items_section_id";
  DROP TYPE "public"."enum_site_settings_footer_quick_links_section_id";`)
}
