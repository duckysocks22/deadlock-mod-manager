CREATE TABLE "profile_sync" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_hardware_id" text NOT NULL,
	"join_code" text NOT NULL,
	"name" text NOT NULL,
	"latest_revision" integer DEFAULT 0 NOT NULL,
	"current_profile" json,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "profile_sync_join_code_key" UNIQUE("join_code")
);
--> statement-breakpoint
CREATE TABLE "profile_sync_member" (
	"id" text PRIMARY KEY NOT NULL,
	"sync_id" text NOT NULL,
	"hardware_id" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "profile_sync_member_unique" UNIQUE("sync_id","hardware_id")
);
--> statement-breakpoint
ALTER TABLE "profile_sync_member" ADD CONSTRAINT "profile_sync_member_sync_id_profile_sync_id_fk" FOREIGN KEY ("sync_id") REFERENCES "public"."profile_sync"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "profile_sync_owner_idx" ON "profile_sync" USING btree ("owner_hardware_id");--> statement-breakpoint
CREATE INDEX "profile_sync_member_hardware_idx" ON "profile_sync_member" USING btree ("hardware_id");