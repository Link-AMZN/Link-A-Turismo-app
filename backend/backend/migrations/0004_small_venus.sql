ALTER TABLE "accommodations" ADD COLUMN "maxGuests" integer DEFAULT 2;--> statement-breakpoint
ALTER TABLE "accommodations" ADD COLUMN "checkInTime" text;--> statement-breakpoint
ALTER TABLE "accommodations" ADD COLUMN "checkOutTime" text;--> statement-breakpoint
ALTER TABLE "accommodations" ADD COLUMN "policies" text;--> statement-breakpoint
ALTER TABLE "accommodations" ADD COLUMN "contactEmail" text;--> statement-breakpoint
ALTER TABLE "accommodations" ADD COLUMN "contactPhone" text;--> statement-breakpoint
ALTER TABLE "accommodations" ADD COLUMN "createdAt" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "accommodations" ADD COLUMN "updatedAt" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "hotelRooms" ADD COLUMN "status" text DEFAULT 'available';