ALTER TABLE "github_settings" ADD COLUMN "access_token_encrypted" text;--> statement-breakpoint
ALTER TABLE "github_settings" ADD COLUMN "access_token_nonce" text;--> statement-breakpoint
ALTER TABLE "github_settings" ADD COLUMN "oauth_scopes" text;--> statement-breakpoint
ALTER TABLE "github_settings" ADD COLUMN "oauth_connected_at" timestamp with time zone;