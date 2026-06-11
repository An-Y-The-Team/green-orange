import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'editor');
  CREATE TYPE "public"."enum_services_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__services_v_version_category" AS ENUM('cleaning', 'construction');
  CREATE TYPE "public"."enum__services_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__services_v_published_locale" AS ENUM('en');
  CREATE TYPE "public"."enum_projects_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__projects_v_version_category" AS ENUM('cleaning', 'construction');
  CREATE TYPE "public"."enum__projects_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__projects_v_published_locale" AS ENUM('en');
  CREATE TYPE "public"."enum_testimonials_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__testimonials_v_version_category" AS ENUM('cleaning', 'construction', 'both');
  CREATE TYPE "public"."enum__testimonials_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__testimonials_v_published_locale" AS ENUM('en');
  CREATE TABLE "_services_v_version_benefits" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"item" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_services_v_version_features" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"item" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_services_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_title" varchar,
  	"version_description" varchar,
  	"version_category" "enum__services_v_version_category",
  	"version_duration" varchar,
  	"version_icon_name" varchar,
  	"version_popular" boolean DEFAULT false,
  	"version_order" numeric DEFAULT 0,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__services_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__services_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_services_v_locales" (
  	"version_meta_title" varchar,
  	"version_meta_description" varchar,
  	"version_meta_image_id" integer,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_projects_v_version_tags" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"item" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_projects_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_title" varchar,
  	"version_client" varchar,
  	"version_category" "enum__projects_v_version_category",
  	"version_location" varchar,
  	"version_area" varchar,
  	"version_completion_time" varchar,
  	"version_description" varchar,
  	"version_achievement" varchar,
  	"version_image_id" integer,
  	"version_image_url" varchar,
  	"version_testimonial_author" varchar,
  	"version_testimonial_role" varchar,
  	"version_testimonial_content" varchar,
  	"version_testimonial_avatar_id" integer,
  	"version_testimonial_avatar_url" varchar,
  	"version_testimonial_rating" numeric,
  	"version_order" numeric DEFAULT 0,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__projects_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__projects_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_projects_v_locales" (
  	"version_meta_title" varchar,
  	"version_meta_description" varchar,
  	"version_meta_image_id" integer,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_testimonials_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_author" varchar,
  	"version_role" varchar,
  	"version_company" varchar,
  	"version_content" varchar,
  	"version_rating" numeric,
  	"version_avatar_id" integer,
  	"version_avatar_url" varchar,
  	"version_category" "enum__testimonials_v_version_category",
  	"version_order" numeric DEFAULT 0,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__testimonials_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__testimonials_v_published_locale",
  	"latest" boolean
  );
  
  ALTER TABLE "services_benefits" ALTER COLUMN "item" DROP NOT NULL;
  ALTER TABLE "services_features" ALTER COLUMN "item" DROP NOT NULL;
  ALTER TABLE "services" ALTER COLUMN "slug" DROP NOT NULL;
  ALTER TABLE "services" ALTER COLUMN "title" DROP NOT NULL;
  ALTER TABLE "services" ALTER COLUMN "description" DROP NOT NULL;
  ALTER TABLE "services" ALTER COLUMN "category" DROP NOT NULL;
  ALTER TABLE "services" ALTER COLUMN "duration" DROP NOT NULL;
  ALTER TABLE "services" ALTER COLUMN "icon_name" DROP NOT NULL;
  ALTER TABLE "projects_tags" ALTER COLUMN "item" DROP NOT NULL;
  ALTER TABLE "projects" ALTER COLUMN "slug" DROP NOT NULL;
  ALTER TABLE "projects" ALTER COLUMN "title" DROP NOT NULL;
  ALTER TABLE "projects" ALTER COLUMN "client" DROP NOT NULL;
  ALTER TABLE "projects" ALTER COLUMN "category" DROP NOT NULL;
  ALTER TABLE "projects" ALTER COLUMN "location" DROP NOT NULL;
  ALTER TABLE "projects" ALTER COLUMN "area" DROP NOT NULL;
  ALTER TABLE "projects" ALTER COLUMN "completion_time" DROP NOT NULL;
  ALTER TABLE "projects" ALTER COLUMN "description" DROP NOT NULL;
  ALTER TABLE "projects" ALTER COLUMN "achievement" DROP NOT NULL;
  ALTER TABLE "projects" ALTER COLUMN "image_url" DROP NOT NULL;
  ALTER TABLE "testimonials" ALTER COLUMN "slug" DROP NOT NULL;
  ALTER TABLE "testimonials" ALTER COLUMN "author" DROP NOT NULL;
  ALTER TABLE "testimonials" ALTER COLUMN "role" DROP NOT NULL;
  ALTER TABLE "testimonials" ALTER COLUMN "company" DROP NOT NULL;
  ALTER TABLE "testimonials" ALTER COLUMN "content" DROP NOT NULL;
  ALTER TABLE "testimonials" ALTER COLUMN "rating" DROP NOT NULL;
  ALTER TABLE "testimonials" ALTER COLUMN "avatar_url" DROP NOT NULL;
  ALTER TABLE "testimonials" ALTER COLUMN "category" DROP NOT NULL;
  ALTER TABLE "users" ADD COLUMN "role" "enum_users_role" DEFAULT 'editor' NOT NULL;
  ALTER TABLE "services" ADD COLUMN "_status" "enum_services_status" DEFAULT 'draft';
  ALTER TABLE "projects" ADD COLUMN "_status" "enum_projects_status" DEFAULT 'draft';
  ALTER TABLE "testimonials" ADD COLUMN "_status" "enum_testimonials_status" DEFAULT 'draft';
  ALTER TABLE "_services_v_version_benefits" ADD CONSTRAINT "_services_v_version_benefits_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_services_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_services_v_version_features" ADD CONSTRAINT "_services_v_version_features_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_services_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_services_v" ADD CONSTRAINT "_services_v_parent_id_services_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_services_v_locales" ADD CONSTRAINT "_services_v_locales_version_meta_image_id_media_id_fk" FOREIGN KEY ("version_meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_services_v_locales" ADD CONSTRAINT "_services_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_services_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_projects_v_version_tags" ADD CONSTRAINT "_projects_v_version_tags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_projects_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_projects_v" ADD CONSTRAINT "_projects_v_parent_id_projects_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_projects_v" ADD CONSTRAINT "_projects_v_version_image_id_media_id_fk" FOREIGN KEY ("version_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_projects_v" ADD CONSTRAINT "_projects_v_version_testimonial_avatar_id_media_id_fk" FOREIGN KEY ("version_testimonial_avatar_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_projects_v_locales" ADD CONSTRAINT "_projects_v_locales_version_meta_image_id_media_id_fk" FOREIGN KEY ("version_meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_projects_v_locales" ADD CONSTRAINT "_projects_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_projects_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_testimonials_v" ADD CONSTRAINT "_testimonials_v_parent_id_testimonials_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."testimonials"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_testimonials_v" ADD CONSTRAINT "_testimonials_v_version_avatar_id_media_id_fk" FOREIGN KEY ("version_avatar_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "_services_v_version_benefits_order_idx" ON "_services_v_version_benefits" USING btree ("_order");
  CREATE INDEX "_services_v_version_benefits_parent_id_idx" ON "_services_v_version_benefits" USING btree ("_parent_id");
  CREATE INDEX "_services_v_version_features_order_idx" ON "_services_v_version_features" USING btree ("_order");
  CREATE INDEX "_services_v_version_features_parent_id_idx" ON "_services_v_version_features" USING btree ("_parent_id");
  CREATE INDEX "_services_v_parent_idx" ON "_services_v" USING btree ("parent_id");
  CREATE INDEX "_services_v_version_version_slug_idx" ON "_services_v" USING btree ("version_slug");
  CREATE INDEX "_services_v_version_version_updated_at_idx" ON "_services_v" USING btree ("version_updated_at");
  CREATE INDEX "_services_v_version_version_created_at_idx" ON "_services_v" USING btree ("version_created_at");
  CREATE INDEX "_services_v_version_version__status_idx" ON "_services_v" USING btree ("version__status");
  CREATE INDEX "_services_v_created_at_idx" ON "_services_v" USING btree ("created_at");
  CREATE INDEX "_services_v_updated_at_idx" ON "_services_v" USING btree ("updated_at");
  CREATE INDEX "_services_v_snapshot_idx" ON "_services_v" USING btree ("snapshot");
  CREATE INDEX "_services_v_published_locale_idx" ON "_services_v" USING btree ("published_locale");
  CREATE INDEX "_services_v_latest_idx" ON "_services_v" USING btree ("latest");
  CREATE INDEX "_services_v_version_meta_version_meta_image_idx" ON "_services_v_locales" USING btree ("version_meta_image_id","_locale");
  CREATE UNIQUE INDEX "_services_v_locales_locale_parent_id_unique" ON "_services_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_projects_v_version_tags_order_idx" ON "_projects_v_version_tags" USING btree ("_order");
  CREATE INDEX "_projects_v_version_tags_parent_id_idx" ON "_projects_v_version_tags" USING btree ("_parent_id");
  CREATE INDEX "_projects_v_parent_idx" ON "_projects_v" USING btree ("parent_id");
  CREATE INDEX "_projects_v_version_version_slug_idx" ON "_projects_v" USING btree ("version_slug");
  CREATE INDEX "_projects_v_version_version_image_idx" ON "_projects_v" USING btree ("version_image_id");
  CREATE INDEX "_projects_v_version_testimonial_version_testimonial_avat_idx" ON "_projects_v" USING btree ("version_testimonial_avatar_id");
  CREATE INDEX "_projects_v_version_version_updated_at_idx" ON "_projects_v" USING btree ("version_updated_at");
  CREATE INDEX "_projects_v_version_version_created_at_idx" ON "_projects_v" USING btree ("version_created_at");
  CREATE INDEX "_projects_v_version_version__status_idx" ON "_projects_v" USING btree ("version__status");
  CREATE INDEX "_projects_v_created_at_idx" ON "_projects_v" USING btree ("created_at");
  CREATE INDEX "_projects_v_updated_at_idx" ON "_projects_v" USING btree ("updated_at");
  CREATE INDEX "_projects_v_snapshot_idx" ON "_projects_v" USING btree ("snapshot");
  CREATE INDEX "_projects_v_published_locale_idx" ON "_projects_v" USING btree ("published_locale");
  CREATE INDEX "_projects_v_latest_idx" ON "_projects_v" USING btree ("latest");
  CREATE INDEX "_projects_v_version_meta_version_meta_image_idx" ON "_projects_v_locales" USING btree ("version_meta_image_id","_locale");
  CREATE UNIQUE INDEX "_projects_v_locales_locale_parent_id_unique" ON "_projects_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_testimonials_v_parent_idx" ON "_testimonials_v" USING btree ("parent_id");
  CREATE INDEX "_testimonials_v_version_version_slug_idx" ON "_testimonials_v" USING btree ("version_slug");
  CREATE INDEX "_testimonials_v_version_version_avatar_idx" ON "_testimonials_v" USING btree ("version_avatar_id");
  CREATE INDEX "_testimonials_v_version_version_updated_at_idx" ON "_testimonials_v" USING btree ("version_updated_at");
  CREATE INDEX "_testimonials_v_version_version_created_at_idx" ON "_testimonials_v" USING btree ("version_created_at");
  CREATE INDEX "_testimonials_v_version_version__status_idx" ON "_testimonials_v" USING btree ("version__status");
  CREATE INDEX "_testimonials_v_created_at_idx" ON "_testimonials_v" USING btree ("created_at");
  CREATE INDEX "_testimonials_v_updated_at_idx" ON "_testimonials_v" USING btree ("updated_at");
  CREATE INDEX "_testimonials_v_snapshot_idx" ON "_testimonials_v" USING btree ("snapshot");
  CREATE INDEX "_testimonials_v_published_locale_idx" ON "_testimonials_v" USING btree ("published_locale");
  CREATE INDEX "_testimonials_v_latest_idx" ON "_testimonials_v" USING btree ("latest");
  CREATE INDEX "services__status_idx" ON "services" USING btree ("_status");
  CREATE INDEX "projects__status_idx" ON "projects" USING btree ("_status");
  CREATE INDEX "testimonials__status_idx" ON "testimonials" USING btree ("_status");

  -- Data backfill for existing rows (no-op on a fresh database) ----------------
  -- Pre-RBAC users had full access, so existing accounts become admins (the new
  -- column default is 'editor', applied only to rows created after this point).
  UPDATE "users" SET "role" = 'admin';
  -- Existing content was already live; mark it published so drafts-enabled reads
  -- keep showing it (new docs still default to 'draft').
  UPDATE "services" SET "_status" = 'published';
  UPDATE "projects" SET "_status" = 'published';
  UPDATE "testimonials" SET "_status" = 'published';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "_services_v_version_benefits" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_services_v_version_features" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_services_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_services_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_projects_v_version_tags" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_projects_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_projects_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_testimonials_v" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "_services_v_version_benefits" CASCADE;
  DROP TABLE "_services_v_version_features" CASCADE;
  DROP TABLE "_services_v" CASCADE;
  DROP TABLE "_services_v_locales" CASCADE;
  DROP TABLE "_projects_v_version_tags" CASCADE;
  DROP TABLE "_projects_v" CASCADE;
  DROP TABLE "_projects_v_locales" CASCADE;
  DROP TABLE "_testimonials_v" CASCADE;
  DROP INDEX "services__status_idx";
  DROP INDEX "projects__status_idx";
  DROP INDEX "testimonials__status_idx";
  ALTER TABLE "services_benefits" ALTER COLUMN "item" SET NOT NULL;
  ALTER TABLE "services_features" ALTER COLUMN "item" SET NOT NULL;
  ALTER TABLE "services" ALTER COLUMN "slug" SET NOT NULL;
  ALTER TABLE "services" ALTER COLUMN "title" SET NOT NULL;
  ALTER TABLE "services" ALTER COLUMN "description" SET NOT NULL;
  ALTER TABLE "services" ALTER COLUMN "category" SET NOT NULL;
  ALTER TABLE "services" ALTER COLUMN "duration" SET NOT NULL;
  ALTER TABLE "services" ALTER COLUMN "icon_name" SET NOT NULL;
  ALTER TABLE "projects_tags" ALTER COLUMN "item" SET NOT NULL;
  ALTER TABLE "projects" ALTER COLUMN "slug" SET NOT NULL;
  ALTER TABLE "projects" ALTER COLUMN "title" SET NOT NULL;
  ALTER TABLE "projects" ALTER COLUMN "client" SET NOT NULL;
  ALTER TABLE "projects" ALTER COLUMN "category" SET NOT NULL;
  ALTER TABLE "projects" ALTER COLUMN "location" SET NOT NULL;
  ALTER TABLE "projects" ALTER COLUMN "area" SET NOT NULL;
  ALTER TABLE "projects" ALTER COLUMN "completion_time" SET NOT NULL;
  ALTER TABLE "projects" ALTER COLUMN "description" SET NOT NULL;
  ALTER TABLE "projects" ALTER COLUMN "achievement" SET NOT NULL;
  ALTER TABLE "projects" ALTER COLUMN "image_url" SET NOT NULL;
  ALTER TABLE "testimonials" ALTER COLUMN "slug" SET NOT NULL;
  ALTER TABLE "testimonials" ALTER COLUMN "author" SET NOT NULL;
  ALTER TABLE "testimonials" ALTER COLUMN "role" SET NOT NULL;
  ALTER TABLE "testimonials" ALTER COLUMN "company" SET NOT NULL;
  ALTER TABLE "testimonials" ALTER COLUMN "content" SET NOT NULL;
  ALTER TABLE "testimonials" ALTER COLUMN "rating" SET NOT NULL;
  ALTER TABLE "testimonials" ALTER COLUMN "avatar_url" SET NOT NULL;
  ALTER TABLE "testimonials" ALTER COLUMN "category" SET NOT NULL;
  ALTER TABLE "users" DROP COLUMN "role";
  ALTER TABLE "services" DROP COLUMN "_status";
  ALTER TABLE "projects" DROP COLUMN "_status";
  ALTER TABLE "testimonials" DROP COLUMN "_status";
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."enum_services_status";
  DROP TYPE "public"."enum__services_v_version_category";
  DROP TYPE "public"."enum__services_v_version_status";
  DROP TYPE "public"."enum__services_v_published_locale";
  DROP TYPE "public"."enum_projects_status";
  DROP TYPE "public"."enum__projects_v_version_category";
  DROP TYPE "public"."enum__projects_v_version_status";
  DROP TYPE "public"."enum__projects_v_published_locale";
  DROP TYPE "public"."enum_testimonials_status";
  DROP TYPE "public"."enum__testimonials_v_version_category";
  DROP TYPE "public"."enum__testimonials_v_version_status";
  DROP TYPE "public"."enum__testimonials_v_published_locale";`)
}
