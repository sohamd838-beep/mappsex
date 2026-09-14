CREATE TABLE "ai_images" (
	"id" serial PRIMARY KEY,
	"place_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"blob_key" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "checkins" (
	"id" serial PRIMARY KEY,
	"place_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"photo_blob_key" text NOT NULL,
	"points" integer DEFAULT 50 NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "places" (
	"id" serial PRIMARY KEY,
	"osm_id" text NOT NULL UNIQUE,
	"name" text NOT NULL,
	"category" text DEFAULT 'place' NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reels" (
	"id" serial PRIMARY KEY,
	"place_id" integer NOT NULL,
	"url" text NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "ai_images" ADD CONSTRAINT "ai_images_place_id_places_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id");--> statement-breakpoint
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_place_id_places_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id");--> statement-breakpoint
ALTER TABLE "reels" ADD CONSTRAINT "reels_place_id_places_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id");