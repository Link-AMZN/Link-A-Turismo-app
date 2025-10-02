ALTER TABLE "roomTypes" RENAME COLUMN "accommodation_id" TO "accommodationId";--> statement-breakpoint
ALTER TABLE "roomTypes" DROP CONSTRAINT "roomTypes_accommodation_id_accommodations_id_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "roomTypes" ADD CONSTRAINT "roomTypes_accommodationId_accommodations_id_fk" FOREIGN KEY ("accommodationId") REFERENCES "accommodations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
