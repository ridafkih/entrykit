CREATE TABLE "platform_chat_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform" text NOT NULL,
	"platform_chat_id" text NOT NULL,
	"platform_user_id" text,
	"session_id" uuid NOT NULL,
	"last_activity_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "platform_chat_unique" UNIQUE("platform","platform_chat_id")
);
--> statement-breakpoint
ALTER TABLE "platform_chat_mappings" ADD CONSTRAINT "platform_chat_mappings_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "platform_chat_lookup_idx" ON "platform_chat_mappings" USING btree ("platform","platform_chat_id");--> statement-breakpoint
CREATE INDEX "platform_session_idx" ON "platform_chat_mappings" USING btree ("session_id");