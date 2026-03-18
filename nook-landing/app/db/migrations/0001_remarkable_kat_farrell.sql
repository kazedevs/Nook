ALTER TABLE "licenses" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "licenses" CASCADE;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "plan" SET DEFAULT 'free';--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "is_active" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "dodo_purchase_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_dodo_purchase_id_unique" UNIQUE("dodo_purchase_id");