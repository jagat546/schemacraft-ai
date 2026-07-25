CREATE TABLE "sandbox_generations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ip_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "sandbox_generations_ip_hash_idx" ON "sandbox_generations" USING btree ("ip_hash");