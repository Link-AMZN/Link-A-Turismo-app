DO $$ BEGIN
 CREATE TYPE "partnership_level" AS ENUM('bronze', 'silver', 'gold', 'platinum');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "service_type" AS ENUM('ride', 'accommodation', 'event');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "status" AS ENUM('pending', 'active', 'confirmed', 'cancelled', 'completed', 'expired');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "user_type" AS ENUM('client', 'driver', 'host', 'admin');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "accommodations" DROP CONSTRAINT "accommodations_hostId_users_id_fk";
--> statement-breakpoint
ALTER TABLE "adminActions" DROP CONSTRAINT "adminActions_adminId_users_id_fk";
--> statement-breakpoint
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_rideId_rides_id_fk";
--> statement-breakpoint
ALTER TABLE "chatMessages" DROP CONSTRAINT "chatMessages_chatRoomId_chatRooms_id_fk";
--> statement-breakpoint
ALTER TABLE "chatRooms" DROP CONSTRAINT "chatRooms_participantOneId_users_id_fk";
--> statement-breakpoint
ALTER TABLE "driverDocuments" DROP CONSTRAINT "driverDocuments_driverId_users_id_fk";
--> statement-breakpoint
ALTER TABLE "driverStats" DROP CONSTRAINT "driverStats_driverId_users_id_fk";
--> statement-breakpoint
ALTER TABLE "eventManagers" DROP CONSTRAINT "eventManagers_userId_users_id_fk";
--> statement-breakpoint
ALTER TABLE "events" DROP CONSTRAINT "events_organizerId_users_id_fk";
--> statement-breakpoint
ALTER TABLE "hotelFinancialReports" DROP CONSTRAINT "hotelFinancialReports_accommodationId_accommodations_id_fk";
--> statement-breakpoint
ALTER TABLE "hotelRooms" DROP CONSTRAINT "hotelRooms_accommodationId_accommodations_id_fk";
--> statement-breakpoint
ALTER TABLE "loyaltyProgram" DROP CONSTRAINT "loyaltyProgram_userId_users_id_fk";
--> statement-breakpoint
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_userId_users_id_fk";
--> statement-breakpoint
ALTER TABLE "partnershipApplications" DROP CONSTRAINT "partnershipApplications_proposalId_partnershipProposals_id_fk";
--> statement-breakpoint
ALTER TABLE "partnershipProposals" DROP CONSTRAINT "partnershipProposals_hotelId_accommodations_id_fk";
--> statement-breakpoint
ALTER TABLE "payments" DROP CONSTRAINT "payments_bookingId_bookings_id_fk";
--> statement-breakpoint
ALTER TABLE "pickupRequests" DROP CONSTRAINT "pickupRequests_rideId_rides_id_fk";
--> statement-breakpoint
ALTER TABLE "pointsHistory" DROP CONSTRAINT "pointsHistory_userId_users_id_fk";
--> statement-breakpoint
ALTER TABLE "priceNegotiations" DROP CONSTRAINT "priceNegotiations_rideId_rides_id_fk";
--> statement-breakpoint
ALTER TABLE "ratings" DROP CONSTRAINT "ratings_fromUserId_users_id_fk";
--> statement-breakpoint
ALTER TABLE "rewardRedemptions" DROP CONSTRAINT "rewardRedemptions_userId_users_id_fk";
--> statement-breakpoint
ALTER TABLE "rides" DROP CONSTRAINT "rides_driverId_users_id_fk";
--> statement-breakpoint
ALTER TABLE "accommodations" ALTER COLUMN "minimumDriverLevel" SET DATA TYPE partnership_level;--> statement-breakpoint
ALTER TABLE "bookings" ALTER COLUMN "type" SET DATA TYPE service_type;--> statement-breakpoint
ALTER TABLE "bookings" ALTER COLUMN "status" SET DATA TYPE status;--> statement-breakpoint
ALTER TABLE "chatRooms" ALTER COLUMN "serviceType" SET DATA TYPE service_type;--> statement-breakpoint
ALTER TABLE "driverStats" ALTER COLUMN "partnershipLevel" SET DATA TYPE partnership_level;--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "status" SET DATA TYPE status;--> statement-breakpoint
ALTER TABLE "loyaltyProgram" ALTER COLUMN "membershipLevel" SET DATA TYPE partnership_level;--> statement-breakpoint
ALTER TABLE "loyaltyRewards" ALTER COLUMN "minimumLevel" SET DATA TYPE partnership_level;--> statement-breakpoint
ALTER TABLE "mozambique_locations" ALTER COLUMN "province" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "partnershipApplications" ALTER COLUMN "status" SET DATA TYPE status;--> statement-breakpoint
ALTER TABLE "partnershipProposals" ALTER COLUMN "status" SET DATA TYPE status;--> statement-breakpoint
ALTER TABLE "partnershipProposals" ALTER COLUMN "minimumDriverLevel" SET DATA TYPE partnership_level;--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "serviceType" SET DATA TYPE service_type;--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "paymentStatus" SET DATA TYPE status;--> statement-breakpoint
ALTER TABLE "pickupRequests" ALTER COLUMN "status" SET DATA TYPE status;--> statement-breakpoint
ALTER TABLE "priceNegotiations" ALTER COLUMN "status" SET DATA TYPE status;--> statement-breakpoint
ALTER TABLE "ratings" ALTER COLUMN "serviceType" SET DATA TYPE service_type;--> statement-breakpoint
ALTER TABLE "rewardRedemptions" ALTER COLUMN "status" SET DATA TYPE status;--> statement-breakpoint
ALTER TABLE "rides" ALTER COLUMN "status" SET DATA TYPE status;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "userType" SET DATA TYPE user_type;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "accommodations" ADD CONSTRAINT "accommodations_hostId_users_id_fk" FOREIGN KEY ("hostId") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "adminActions" ADD CONSTRAINT "adminActions_adminId_users_id_fk" FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bookings" ADD CONSTRAINT "bookings_rideId_rides_id_fk" FOREIGN KEY ("rideId") REFERENCES "rides"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chatMessages" ADD CONSTRAINT "chatMessages_chatRoomId_chatRooms_id_fk" FOREIGN KEY ("chatRoomId") REFERENCES "chatRooms"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chatRooms" ADD CONSTRAINT "chatRooms_participantOneId_users_id_fk" FOREIGN KEY ("participantOneId") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "driverDocuments" ADD CONSTRAINT "driverDocuments_driverId_users_id_fk" FOREIGN KEY ("driverId") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "driverStats" ADD CONSTRAINT "driverStats_driverId_users_id_fk" FOREIGN KEY ("driverId") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "eventManagers" ADD CONSTRAINT "eventManagers_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "events" ADD CONSTRAINT "events_organizerId_users_id_fk" FOREIGN KEY ("organizerId") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hotelFinancialReports" ADD CONSTRAINT "hotelFinancialReports_accommodationId_accommodations_id_fk" FOREIGN KEY ("accommodationId") REFERENCES "accommodations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hotelRooms" ADD CONSTRAINT "hotelRooms_accommodationId_accommodations_id_fk" FOREIGN KEY ("accommodationId") REFERENCES "accommodations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "loyaltyProgram" ADD CONSTRAINT "loyaltyProgram_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "partnershipApplications" ADD CONSTRAINT "partnershipApplications_proposalId_partnershipProposals_id_fk" FOREIGN KEY ("proposalId") REFERENCES "partnershipProposals"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "partnershipProposals" ADD CONSTRAINT "partnershipProposals_hotelId_accommodations_id_fk" FOREIGN KEY ("hotelId") REFERENCES "accommodations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payments" ADD CONSTRAINT "payments_bookingId_bookings_id_fk" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pickupRequests" ADD CONSTRAINT "pickupRequests_rideId_rides_id_fk" FOREIGN KEY ("rideId") REFERENCES "rides"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pointsHistory" ADD CONSTRAINT "pointsHistory_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "priceNegotiations" ADD CONSTRAINT "priceNegotiations_rideId_rides_id_fk" FOREIGN KEY ("rideId") REFERENCES "rides"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ratings" ADD CONSTRAINT "ratings_fromUserId_users_id_fk" FOREIGN KEY ("fromUserId") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rewardRedemptions" ADD CONSTRAINT "rewardRedemptions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rides" ADD CONSTRAINT "rides_driverId_users_id_fk" FOREIGN KEY ("driverId") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "mozambique_locations" DROP COLUMN IF EXISTS "population";--> statement-breakpoint
ALTER TABLE "mozambique_locations" DROP COLUMN IF EXISTS "tourismInterest";--> statement-breakpoint
ALTER TABLE "mozambique_locations" DROP COLUMN IF EXISTS "searchPriority";