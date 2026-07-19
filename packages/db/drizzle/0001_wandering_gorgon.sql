CREATE TABLE "artifact_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"build_id" uuid,
	"revision_number" integer NOT NULL,
	"edit_request" text,
	"artifact" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "artifact_revisions" ADD CONSTRAINT "artifact_revisions_build_id_builds_id_fk" FOREIGN KEY ("build_id") REFERENCES "public"."builds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "artifact_revisions_build_revision_unique" ON "artifact_revisions" USING btree ("build_id","revision_number");