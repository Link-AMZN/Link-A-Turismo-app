ALTER TABLE "roomTypes" DROP CONSTRAINT "roomTypes_accommodationId_accommodations_id_fk";
--> statement-breakpoint
ALTER TABLE "roomTypes" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "roomTypes" ADD COLUMN "accommodation_id" uuid NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "roomTypes" ADD CONSTRAINT "roomTypes_accommodation_id_accommodations_id_fk" FOREIGN KEY ("accommodation_id") REFERENCES "accommodations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "roomTypes" DROP COLUMN IF EXISTS "accommodationId";