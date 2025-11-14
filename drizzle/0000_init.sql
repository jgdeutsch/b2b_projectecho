CREATE TABLE IF NOT EXISTS "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "linkedin_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"post_url" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "linkedin_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"profile_url" text NOT NULL,
	"name" text,
	"headline" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
 ALTER TABLE "linkedin_posts" ADD CONSTRAINT "linkedin_posts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "linkedin_profiles" ADD CONSTRAINT "linkedin_profiles_post_id_linkedin_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "linkedin_posts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "linkedin_posts_project_id_idx" ON "linkedin_posts" ("project_id");
CREATE INDEX IF NOT EXISTS "linkedin_profiles_post_id_idx" ON "linkedin_profiles" ("post_id");

