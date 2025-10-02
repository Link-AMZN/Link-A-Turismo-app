ALTER TABLE "hotelRooms" RENAME COLUMN "basePrice" TO "pricePerNight";--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "hotelRoomId" varchar;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "nightsCount" integer;--> statement-breakpoint
ALTER TABLE "roomTypes" ADD COLUMN "name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "roomTypes" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "roomTypes" ADD COLUMN "maxOccupancy" integer DEFAULT 2;--> statement-breakpoint
ALTER TABLE "roomTypes" ADD COLUMN "bedType" text;--> statement-breakpoint
ALTER TABLE "roomTypes" ADD COLUMN "bedCount" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "roomTypes" ADD COLUMN "amenities" text[] DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "roomTypes" ADD COLUMN "images" text[] DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "roomTypes" ADD COLUMN "createdAt" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "roomTypes" ADD COLUMN "updatedAt" timestamp DEFAULT now();--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bookings" ADD CONSTRAINT "bookings_hotelRoomId_hotelRooms_id_fk" FOREIGN KEY ("hotelRoomId") REFERENCES "hotelRooms"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "accommodations" DROP COLUMN IF EXISTS "pricePerNight";