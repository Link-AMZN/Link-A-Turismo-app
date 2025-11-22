ALTER TABLE "roomTypes" ALTER COLUMN "type" SET DEFAULT 'standard';--> statement-breakpoint
ALTER TABLE "hotelRooms" ADD COLUMN "amenities" text[] DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "roomTypes" ADD COLUMN "isAvailable" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "roomTypes" ADD COLUMN "status" text DEFAULT 'active';--> statement-breakpoint
ALTER TABLE "roomTypes" ADD COLUMN "basePrice" numeric(8, 2);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "accommodations_search_name_idx" ON "accommodations" ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "accommodations_search_address_idx" ON "accommodations" ("address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "accommodations_search_locality_idx" ON "accommodations" ("locality");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "locations_text_search_idx" ON "mozambique_locations" ("name");