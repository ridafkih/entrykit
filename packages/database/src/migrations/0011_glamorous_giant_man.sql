CREATE TABLE "container_dependencies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"container_id" uuid NOT NULL,
	"depends_on_container_id" uuid NOT NULL,
	"condition" text DEFAULT 'service_started' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "container_dependencies" ADD CONSTRAINT "container_dependencies_container_id_containers_id_fk" FOREIGN KEY ("container_id") REFERENCES "public"."containers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "container_dependencies" ADD CONSTRAINT "container_dependencies_depends_on_container_id_containers_id_fk" FOREIGN KEY ("depends_on_container_id") REFERENCES "public"."containers"("id") ON DELETE cascade ON UPDATE no action;