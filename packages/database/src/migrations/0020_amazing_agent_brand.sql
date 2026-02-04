CREATE TABLE "orchestrator_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform" text NOT NULL,
	"platform_chat_id" text NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"session_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "orchestrator_messages_chat_idx" ON "orchestrator_messages" USING btree ("platform","platform_chat_id");--> statement-breakpoint
CREATE INDEX "orchestrator_messages_created_idx" ON "orchestrator_messages" USING btree ("created_at");