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
CREATE TABLE IF NOT EXISTS "accommodations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"hostId" uuid,
	"address" text NOT NULL,
	"locality" varchar(100),
	"province" varchar(100),
	"country" varchar(100) DEFAULT 'Moçambique',
	"searchRadius" integer DEFAULT 50,
	"lat" numeric(10, 7),
	"lng" numeric(10, 7),
	"rating" numeric(3, 1),
	"reviewCount" integer DEFAULT 0,
	"images" text[] DEFAULT '{}',
	"amenities" text[] DEFAULT '{}',
	"description" text,
	"distanceFromCenter" numeric(4, 1),
	"isAvailable" boolean DEFAULT true,
	"offerDriverDiscounts" boolean DEFAULT false,
	"driverDiscountRate" numeric(5, 2) DEFAULT '10.00',
	"minimumDriverLevel" "partnership_level" DEFAULT 'bronze',
	"partnershipBadgeVisible" boolean DEFAULT false,
	"enablePartnerships" boolean DEFAULT false,
	"accommodationDiscount" integer DEFAULT 10,
	"transportDiscount" integer DEFAULT 15,
	"maxGuests" integer DEFAULT 2,
	"checkInTime" text,
	"checkOutTime" text,
	"policies" text,
	"contactEmail" text,
	"contactPhone" text,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "adminActions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"adminId" uuid,
	"targetUserId" uuid,
	"action" text NOT NULL,
	"reason" text NOT NULL,
	"duration" integer,
	"notes" text,
	"isActive" boolean DEFAULT true,
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rideId" uuid,
	"passengerId" uuid,
	"accommodationId" uuid,
	"hotelRoomId" uuid,
	"type" "service_type" DEFAULT 'ride',
	"status" "status" DEFAULT 'pending',
	"totalPrice" numeric(10, 2) NOT NULL,
	"seatsBooked" integer NOT NULL,
	"passengers" integer DEFAULT 1,
	"guestName" text,
	"guestEmail" text,
	"guestPhone" text,
	"checkInDate" timestamp,
	"checkOutDate" timestamp,
	"nightsCount" integer,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chatMessages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chatRoomId" uuid NOT NULL,
	"fromUserId" uuid,
	"toUserId" uuid,
	"message" text NOT NULL,
	"messageType" text DEFAULT 'text',
	"bookingId" uuid,
	"isRead" boolean DEFAULT false,
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chatRooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participantOneId" uuid NOT NULL,
	"participantTwoId" uuid NOT NULL,
	"bookingId" uuid,
	"serviceType" "service_type",
	"lastMessage" text,
	"lastMessageAt" timestamp,
	"isActive" boolean DEFAULT true,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "driverDocuments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"driverId" uuid NOT NULL,
	"vehicleRegistrationUrl" text,
	"drivingLicenseUrl" text,
	"vehicleInsuranceUrl" text,
	"vehicleInspectionUrl" text,
	"vehicleMake" text,
	"vehicleModel" text,
	"vehicleYear" integer,
	"vehiclePlate" text,
	"vehicleColor" text,
	"isVerified" boolean DEFAULT false,
	"verificationDate" timestamp,
	"verificationNotes" text,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "driverStats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"driverId" uuid,
	"totalRides" integer DEFAULT 0,
	"totalDistance" numeric(10, 2) DEFAULT '0.00',
	"totalEarnings" numeric(12, 2) DEFAULT '0.00',
	"averageRating" numeric(3, 2) DEFAULT '0.00',
	"completedRidesThisMonth" integer DEFAULT 0,
	"completedRidesThisYear" integer DEFAULT 0,
	"partnershipLevel" "partnership_level" DEFAULT 'bronze',
	"lastRideDate" timestamp,
	"joinedAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now(),
	CONSTRAINT "driverStats_driverId_unique" UNIQUE("driverId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "eventManagers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid,
	"companyName" text NOT NULL,
	"companyType" text NOT NULL,
	"description" text,
	"contactEmail" text NOT NULL,
	"contactPhone" text,
	"website" text,
	"logo" text,
	"isVerified" boolean DEFAULT false,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizerId" uuid,
	"managerId" uuid,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"eventType" text NOT NULL,
	"category" text NOT NULL,
	"venue" text NOT NULL,
	"address" text NOT NULL,
	"locality" varchar(100),
	"province" varchar(100),
	"lat" numeric(10, 7),
	"lng" numeric(10, 7),
	"startDate" timestamp NOT NULL,
	"endDate" timestamp NOT NULL,
	"startTime" text,
	"endTime" text,
	"isPaid" boolean DEFAULT false,
	"ticketPrice" numeric(8, 2) DEFAULT '0',
	"maxTickets" integer DEFAULT 100,
	"ticketsSold" integer DEFAULT 0,
	"enablePartnerships" boolean DEFAULT false,
	"accommodationDiscount" integer DEFAULT 10,
	"transportDiscount" integer DEFAULT 15,
	"organizerName" text,
	"organizerContact" text,
	"organizerEmail" text,
	"images" text[] DEFAULT '{}',
	"maxAttendees" integer,
	"currentAttendees" integer DEFAULT 0,
	"status" "status" DEFAULT 'pending' NOT NULL,
	"requiresApproval" boolean DEFAULT true,
	"isPublic" boolean DEFAULT true,
	"isFeatured" boolean DEFAULT false,
	"hasPartnerships" boolean DEFAULT false,
	"websiteUrl" text,
	"socialMediaLinks" text[] DEFAULT '{}',
	"tags" text[] DEFAULT '{}',
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hotelFinancialReports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"accommodationId" uuid NOT NULL,
	"reportDate" timestamp NOT NULL,
	"reportType" text NOT NULL,
	"totalRevenue" numeric(10, 2) NOT NULL,
	"roomRevenue" numeric(10, 2) NOT NULL,
	"serviceRevenue" numeric(10, 2) DEFAULT '0.00',
	"totalBookings" integer DEFAULT 0,
	"confirmedBookings" integer DEFAULT 0,
	"cancelledBookings" integer DEFAULT 0,
	"noShowBookings" integer DEFAULT 0,
	"totalRooms" integer NOT NULL,
	"occupiedRooms" integer DEFAULT 0,
	"occupancyRate" numeric(5, 2) DEFAULT '0.00',
	"averageDailyRate" numeric(8, 2) DEFAULT '0.00',
	"revenuePerAvailableRoom" numeric(8, 2) DEFAULT '0.00',
	"platformFees" numeric(8, 2) DEFAULT '0.00',
	"netRevenue" numeric(10, 2) NOT NULL,
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hotelRooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"accommodationId" uuid NOT NULL,
	"roomNumber" text NOT NULL,
	"roomType" text NOT NULL,
	"description" text,
	"images" text[] DEFAULT '{}',
	"pricePerNight" numeric(8, 2) NOT NULL,
	"weekendPrice" numeric(8, 2),
	"holidayPrice" numeric(8, 2),
	"maxOccupancy" integer DEFAULT 2 NOT NULL,
	"status" text DEFAULT 'available',
	"bedType" text,
	"bedCount" integer DEFAULT 1,
	"hasPrivateBathroom" boolean DEFAULT true,
	"hasAirConditioning" boolean DEFAULT false,
	"hasWifi" boolean DEFAULT false,
	"hasTV" boolean DEFAULT false,
	"hasBalcony" boolean DEFAULT false,
	"hasKitchen" boolean DEFAULT false,
	"roomAmenities" text[] DEFAULT '{}',
	"isAvailable" boolean DEFAULT true,
	"maintenanceUntil" timestamp,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "loyaltyProgram" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid,
	"totalPoints" integer DEFAULT 0,
	"currentPoints" integer DEFAULT 0,
	"membershipLevel" "partnership_level" DEFAULT 'bronze',
	"joinedAt" timestamp DEFAULT now(),
	"lastActivityAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "loyaltyRewards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"rewardType" text NOT NULL,
	"pointsCost" integer NOT NULL,
	"discountValue" numeric(8, 2),
	"minimumLevel" "partnership_level" DEFAULT 'bronze',
	"isActive" boolean DEFAULT true,
	"maxRedemptions" integer,
	"validUntil" timestamp,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mozambique_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"province" varchar(100),
	"district" varchar(100),
	"lat" numeric(10, 7) NOT NULL,
	"lng" numeric(10, 7) NOT NULL,
	"type" varchar(20) NOT NULL,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"type" text NOT NULL,
	"priority" text DEFAULT 'normal',
	"isRead" boolean DEFAULT false,
	"actionUrl" text,
	"relatedId" uuid,
	"createdAt" timestamp DEFAULT now(),
	"readAt" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "partnershipApplications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proposalId" uuid NOT NULL,
	"driverId" uuid NOT NULL,
	"status" "status" DEFAULT 'pending',
	"applicationDate" timestamp DEFAULT now(),
	"acceptedAt" timestamp,
	"completedAt" timestamp,
	"message" text,
	"estimatedCompletion" timestamp,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "partnershipProposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hotelId" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" "status" DEFAULT 'pending' NOT NULL,
	"startDate" timestamp DEFAULT now(),
	"endDate" timestamp NOT NULL,
	"province" varchar,
	"city" varchar,
	"offerFuel" boolean DEFAULT false,
	"offerMeals" boolean DEFAULT false,
	"offerFreeAccommodation" boolean DEFAULT false,
	"premiumRate" numeric DEFAULT '0',
	"minimumDriverLevel" "partnership_level" DEFAULT 'bronze',
	"requiredVehicleType" varchar DEFAULT 'any',
	"currentApplicants" integer DEFAULT 0,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bookingId" uuid,
	"userId" uuid,
	"serviceType" "service_type" NOT NULL,
	"subtotal" numeric(10, 2) NOT NULL,
	"platformFee" numeric(10, 2) NOT NULL,
	"discountAmount" numeric(10, 2) DEFAULT '0.00',
	"total" numeric(10, 2) NOT NULL,
	"paymentMethod" text,
	"cardLast4" text,
	"cardBrand" text,
	"mpesaNumber" text,
	"paymentStatus" "status" DEFAULT 'pending',
	"paymentReference" text,
	"paidAt" timestamp,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pickupRequests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rideId" uuid,
	"passengerId" uuid,
	"driverId" uuid,
	"pickupLocation" text NOT NULL,
	"pickupLat" numeric(10, 7),
	"pickupLng" numeric(10, 7),
	"destinationLocation" text NOT NULL,
	"destinationLat" numeric(10, 7),
	"destinationLng" numeric(10, 7),
	"requestedSeats" integer DEFAULT 1,
	"proposedPrice" numeric(8, 2),
	"status" "status" DEFAULT 'pending',
	"message" text,
	"estimatedDetour" integer,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pointsHistory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid,
	"loyaltyId" uuid,
	"actionType" text NOT NULL,
	"pointsAmount" integer NOT NULL,
	"reason" text NOT NULL,
	"relatedId" uuid,
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "priceNegotiations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rideId" uuid,
	"passengerId" uuid,
	"driverId" uuid,
	"originalPrice" numeric(8, 2) NOT NULL,
	"proposedPrice" numeric(8, 2) NOT NULL,
	"counterPrice" numeric(8, 2),
	"status" "status" DEFAULT 'pending',
	"message" text,
	"expiresAt" timestamp,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "priceRegulations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rideType" text NOT NULL,
	"minPricePerKm" numeric(8, 2) NOT NULL,
	"maxPricePerKm" numeric(8, 2) NOT NULL,
	"baseFare" numeric(8, 2) NOT NULL,
	"isActive" boolean DEFAULT true,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fromUserId" uuid,
	"toUserId" uuid,
	"rating" integer NOT NULL,
	"comment" text,
	"serviceType" "service_type" NOT NULL,
	"bookingId" uuid,
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rewardRedemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid,
	"rewardId" uuid,
	"pointsUsed" integer NOT NULL,
	"status" "status" DEFAULT 'active' NOT NULL,
	"expiresAt" timestamp,
	"usedAt" timestamp,
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"driverId" uuid NOT NULL,
	"driverName" text,
	"fromAddress" varchar(255) NOT NULL,
	"toAddress" varchar(255) NOT NULL,
	"fromLocality" varchar(100),
	"fromProvince" varchar(100),
	"toLocality" varchar(100),
	"toProvince" varchar(100),
	"departureDate" timestamp NOT NULL,
	"departureTime" text NOT NULL,
	"availableSeats" integer NOT NULL,
	"maxPassengers" integer DEFAULT 4,
	"pricePerSeat" numeric(10, 2) NOT NULL,
	"vehicleType" varchar(50),
	"additionalInfo" text,
	"status" "status" DEFAULT 'active',
	"type" varchar(20) DEFAULT 'regular',
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "roomTypes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"accommodationId" uuid NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"pricePerNight" numeric(8, 2) NOT NULL,
	"description" text,
	"maxOccupancy" integer DEFAULT 2,
	"bedType" text,
	"bedCount" integer DEFAULT 1,
	"amenities" text[] DEFAULT '{}',
	"images" text[] DEFAULT '{}',
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "systemSettings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"type" varchar,
	"updatedBy" uuid,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "systemSettings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"firstName" varchar,
	"lastName" varchar,
	"profileImageUrl" varchar,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now(),
	"phone" text,
	"userType" "user_type" DEFAULT 'client',
	"roles" text[] DEFAULT '{}',
	"canOfferServices" boolean DEFAULT false,
	"avatar" text,
	"rating" numeric(3, 2) DEFAULT '0.00',
	"totalReviews" integer DEFAULT 0,
	"isVerified" boolean DEFAULT false,
	"verificationStatus" text DEFAULT 'pending',
	"verificationDate" timestamp,
	"verificationNotes" text,
	"identityDocumentUrl" text,
	"identityDocumentType" text,
	"profilePhotoUrl" text,
	"fullName" text,
	"documentNumber" text,
	"dateOfBirth" timestamp,
	"registrationCompleted" boolean DEFAULT false,
	"verificationBadge" text,
	"badgeEarnedDate" timestamp,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "accommodations_location_idx" ON "accommodations" ("locality","province");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "accommodations_geo_idx" ON "accommodations" ("lat","lng");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "accommodations_province_idx" ON "accommodations" ("province");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bookings_status_idx" ON "bookings" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bookings_type_idx" ON "bookings" ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bookings_passenger_idx" ON "bookings" ("passengerId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_messages_room_idx" ON "chatMessages" ("chatRoomId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_messages_from_user_idx" ON "chatMessages" ("fromUserId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_rooms_participants_idx" ON "chatRooms" ("participantOneId","participantTwoId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_location_idx" ON "events" ("locality","province");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_status_idx" ON "events" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "locations_name_idx" ON "mozambique_locations" ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "locations_province_idx" ON "mozambique_locations" ("province");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "locations_type_idx" ON "mozambique_locations" ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "locations_geo_idx" ON "mozambique_locations" ("lat","lng");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "locations_search_idx" ON "mozambique_locations" ("name","province","type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_idx" ON "notifications" ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_is_read_idx" ON "notifications" ("isRead");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "partnership_applications_status_idx" ON "partnershipApplications" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "partnership_applications_driver_idx" ON "partnershipApplications" ("driverId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "partnership_proposals_status_idx" ON "partnershipProposals" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "partnership_proposals_hotel_idx" ON "partnershipProposals" ("hotelId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ratings_to_user_idx" ON "ratings" ("toUserId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ratings_service_type_idx" ON "ratings" ("serviceType");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rides_from_location_idx" ON "rides" ("fromLocality","fromProvince");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rides_to_location_idx" ON "rides" ("toLocality","toProvince");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rides_status_idx" ON "rides" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_expire_idx" ON "sessions" ("expire");--> statement-breakpoint
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
 ALTER TABLE "adminActions" ADD CONSTRAINT "adminActions_targetUserId_users_id_fk" FOREIGN KEY ("targetUserId") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
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
 ALTER TABLE "bookings" ADD CONSTRAINT "bookings_passengerId_users_id_fk" FOREIGN KEY ("passengerId") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bookings" ADD CONSTRAINT "bookings_accommodationId_accommodations_id_fk" FOREIGN KEY ("accommodationId") REFERENCES "accommodations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bookings" ADD CONSTRAINT "bookings_hotelRoomId_hotelRooms_id_fk" FOREIGN KEY ("hotelRoomId") REFERENCES "hotelRooms"("id") ON DELETE cascade ON UPDATE no action;
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
 ALTER TABLE "chatMessages" ADD CONSTRAINT "chatMessages_fromUserId_users_id_fk" FOREIGN KEY ("fromUserId") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chatMessages" ADD CONSTRAINT "chatMessages_toUserId_users_id_fk" FOREIGN KEY ("toUserId") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
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
 ALTER TABLE "chatRooms" ADD CONSTRAINT "chatRooms_participantTwoId_users_id_fk" FOREIGN KEY ("participantTwoId") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
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
 ALTER TABLE "events" ADD CONSTRAINT "events_managerId_eventManagers_id_fk" FOREIGN KEY ("managerId") REFERENCES "eventManagers"("id") ON DELETE set null ON UPDATE no action;
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
 ALTER TABLE "partnershipApplications" ADD CONSTRAINT "partnershipApplications_driverId_users_id_fk" FOREIGN KEY ("driverId") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
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
 ALTER TABLE "payments" ADD CONSTRAINT "payments_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
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
 ALTER TABLE "pickupRequests" ADD CONSTRAINT "pickupRequests_passengerId_users_id_fk" FOREIGN KEY ("passengerId") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pickupRequests" ADD CONSTRAINT "pickupRequests_driverId_users_id_fk" FOREIGN KEY ("driverId") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
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
 ALTER TABLE "pointsHistory" ADD CONSTRAINT "pointsHistory_loyaltyId_loyaltyProgram_id_fk" FOREIGN KEY ("loyaltyId") REFERENCES "loyaltyProgram"("id") ON DELETE cascade ON UPDATE no action;
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
 ALTER TABLE "priceNegotiations" ADD CONSTRAINT "priceNegotiations_passengerId_users_id_fk" FOREIGN KEY ("passengerId") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "priceNegotiations" ADD CONSTRAINT "priceNegotiations_driverId_users_id_fk" FOREIGN KEY ("driverId") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
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
 ALTER TABLE "ratings" ADD CONSTRAINT "ratings_toUserId_users_id_fk" FOREIGN KEY ("toUserId") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
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
 ALTER TABLE "rewardRedemptions" ADD CONSTRAINT "rewardRedemptions_rewardId_loyaltyRewards_id_fk" FOREIGN KEY ("rewardId") REFERENCES "loyaltyRewards"("id") ON DELETE cascade ON UPDATE no action;
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
DO $$ BEGIN
 ALTER TABLE "roomTypes" ADD CONSTRAINT "roomTypes_accommodationId_accommodations_id_fk" FOREIGN KEY ("accommodationId") REFERENCES "accommodations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
