import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, decimal, integer, boolean, jsonb, index, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => ({
    expireIdx: index("IDX_session_expire").on(table.expire),
  })
);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("firstName"),
  lastName: varchar("lastName"),
  profileImageUrl: varchar("profileImageUrl"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
  phone: text("phone").unique(),
  userType: text("userType").default("client"),
  roles: text("roles").array().default(sql`'{}'`),
  canOfferServices: boolean("canOfferServices").default(false),
  avatar: text("avatar"),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0.00"),
  totalReviews: integer("totalReviews").default(0),
  isVerified: boolean("isVerified").default(false),
  verificationStatus: text("verificationStatus").default("pending"),
  verificationDate: timestamp("verificationDate"),
  verificationNotes: text("verificationNotes"),
  identityDocumentUrl: text("identityDocumentUrl"),
  identityDocumentType: text("identityDocumentType"),
  profilePhotoUrl: text("profilePhotoUrl"),
  fullName: text("fullName"),
  documentNumber: text("documentNumber"),
  dateOfBirth: timestamp("dateOfBirth"),
  registrationCompleted: boolean("registrationCompleted").default(false),
  verificationBadge: text("verificationBadge"),
  badgeEarnedDate: timestamp("badgeEarnedDate"),
});

export const rides = pgTable("rides", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  driverId: varchar("driverId").references(() => users.id).notNull(),
  driverName: text("driverName"),
  fromAddress: varchar("fromAddress", { length: 255 }).notNull(),
  toAddress: varchar("toAddress", { length: 255 }).notNull(),
  departureDate: timestamp("departureDate").notNull(),
  departureTime: text("departureTime").notNull(),
  availableSeats: integer("availableSeats").notNull(),
  maxPassengers: integer("maxPassengers").default(4),
  pricePerSeat: decimal("pricePerSeat", { precision: 10, scale: 2 }).notNull(),
  vehicleType: varchar("vehicleType", { length: 50 }),
  additionalInfo: text("additionalInfo"),
  status: varchar("status", { length: 20 }).default("active"),
  type: varchar("type", { length: 20 }).default("regular"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

export const accommodations = pgTable("accommodations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(),
  hostId: varchar("hostId").references(() => users.id),
  address: text("address").notNull(),
  lat: decimal("lat", { precision: 10, scale: 7 }),
  lng: decimal("lng", { precision: 10, scale: 7 }),
  rating: decimal("rating", { precision: 3, scale: 1 }),
  reviewCount: integer("reviewCount").default(0),
  images: text("images").array().default(sql`'{}'`),
  amenities: text("amenities").array().default(sql`'{}'`),
  description: text("description"),
  distanceFromCenter: decimal("distanceFromCenter", { precision: 4, scale: 1 }),
  isAvailable: boolean("isAvailable").default(true),
  offerDriverDiscounts: boolean("offerDriverDiscounts").default(false),
  driverDiscountRate: decimal("driverDiscountRate", { precision: 5, scale: 2 }).default("10.00"),
  minimumDriverLevel: text("minimumDriverLevel").default("bronze"),
  partnershipBadgeVisible: boolean("partnershipBadgeVisible").default(false),
  enablePartnerships: boolean("enablePartnerships").default(false),
  accommodationDiscount: integer("accommodationDiscount").default(10),
  transportDiscount: integer("transportDiscount").default(15),
  maxGuests: integer("maxGuests").default(2),
  checkInTime: text("checkInTime"),
  checkOutTime: text("checkOutTime"),
  policies: text("policies"),
  contactEmail: text("contactEmail"),
  contactPhone: text("contactPhone"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

export const roomTypes = pgTable("roomTypes", {
  id: uuid("id").defaultRandom().primaryKey(),
  accommodationId: uuid("accommodationId")
    .notNull()
    .references(() => accommodations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull(),
  pricePerNight: decimal("pricePerNight", { precision: 8, scale: 2 }).notNull(),
  description: text("description"),
  maxOccupancy: integer("maxOccupancy").default(2),
  bedType: text("bedType"),
  bedCount: integer("bedCount").default(1),
  amenities: text("amenities").array().default(sql`'{}'`),
  images: text("images").array().default(sql`'{}'`),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

// Ratings table for all user types
export const ratings = pgTable("ratings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fromUserId: varchar("fromUserId").references(() => users.id),
  toUserId: varchar("toUserId").references(() => users.id),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  serviceType: text("serviceType").notNull(),
  bookingId: varchar("bookingId"),
  createdAt: timestamp("createdAt").defaultNow(),
});

// Chat rooms table
export const chatRooms = pgTable("chatRooms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  participantOneId: varchar("participantOneId").references(() => users.id).notNull(),
  participantTwoId: varchar("participantTwoId").references(() => users.id).notNull(),
  bookingId: varchar("bookingId"),
  serviceType: text("serviceType"),
  lastMessage: text("lastMessage"),
  lastMessageAt: timestamp("lastMessageAt"),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

// Chat messages table
export const chatMessages = pgTable("chatMessages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chatRoomId: varchar("chatRoomId").references(() => chatRooms.id).notNull(),
  fromUserId: varchar("fromUserId").references(() => users.id),
  toUserId: varchar("toUserId").references(() => users.id),
  message: text("message").notNull(),
  messageType: text("messageType").default("text"),
  bookingId: varchar("bookingId"),
  isRead: boolean("isRead").default(false),
  createdAt: timestamp("createdAt").defaultNow(),
});

// Admin actions table
export const adminActions = pgTable("adminActions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminId: varchar("adminId").references(() => users.id),
  targetUserId: varchar("targetUserId").references(() => users.id),
  action: text("action").notNull(),
  reason: text("reason").notNull(),
  duration: integer("duration"),
  notes: text("notes"),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow(),
});

// Price regulations table
export const priceRegulations = pgTable("priceRegulations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  rideType: text("rideType").notNull(),
  minPricePerKm: decimal("minPricePerKm", { precision: 8, scale: 2 }).notNull(),
  maxPricePerKm: decimal("maxPricePerKm", { precision: 8, scale: 2 }).notNull(),
  baseFare: decimal("baseFare", { precision: 8, scale: 2 }).notNull(),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

// Price negotiation requests
export const priceNegotiations = pgTable("priceNegotiations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  rideId: varchar("rideId").references(() => rides.id),
  passengerId: varchar("passengerId").references(() => users.id),
  driverId: varchar("driverId").references(() => users.id),
  originalPrice: decimal("originalPrice", { precision: 8, scale: 2 }).notNull(),
  proposedPrice: decimal("proposedPrice", { precision: 8, scale: 2 }).notNull(),
  counterPrice: decimal("counterPrice", { precision: 8, scale: 2 }),
  status: text("status").default("pending"),
  message: text("message"),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

// Pickup requests for en-route pickups
export const pickupRequests = pgTable("pickupRequests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  rideId: varchar("rideId").references(() => rides.id),
  passengerId: varchar("passengerId").references(() => users.id),
  driverId: varchar("driverId").references(() => users.id),
  pickupLocation: text("pickupLocation").notNull(),
  pickupLat: decimal("pickupLat", { precision: 10, scale: 7 }),
  pickupLng: decimal("pickupLng", { precision: 10, scale: 7 }),
  destinationLocation: text("destinationLocation").notNull(),
  destinationLat: decimal("destinationLat", { precision: 10, scale: 7 }),
  destinationLng: decimal("destinationLng", { precision: 10, scale: 7 }),
  requestedSeats: integer("requestedSeats").default(1),
  proposedPrice: decimal("proposedPrice", { precision: 8, scale: 2 }),
  status: text("status").default("pending"),
  message: text("message"),
  estimatedDetour: integer("estimatedDetour"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

// Bookings table
export const bookings = pgTable("bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  rideId: varchar("rideId").references(() => rides.id),
  passengerId: varchar("passengerId").references(() => users.id),
  accommodationId: varchar("accommodationId").references(() => accommodations.id),
  hotelRoomId: varchar("hotelRoomId").references(() => hotelRooms.id),
  type: varchar("type", { length: 20 }).default('ride'),
  status: varchar("status", { length: 20 }).default("pending"),
  totalPrice: decimal("totalPrice", { precision: 10, scale: 2 }).notNull(),
  seatsBooked: integer("seatsBooked").notNull(),
  passengers: integer("passengers").default(1),
  guestName: text("guestName"),
  guestEmail: text("guestEmail"),
  guestPhone: text("guestPhone"),
  checkInDate: timestamp("checkInDate"),
  checkOutDate: timestamp("checkOutDate"),
  nightsCount: integer("nightsCount"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

// CONSOLIDATED: Payments table
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingId: varchar("bookingId").references(() => bookings.id),
  userId: varchar("userId").references(() => users.id),
  serviceType: text("serviceType").notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  platformFee: decimal("platformFee", { precision: 10, scale: 2 }).notNull(),
  discountAmount: decimal("discountAmount", { precision: 10, scale: 2 }).default("0.00"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("paymentMethod"),
  cardLast4: text("cardLast4"),
  cardBrand: text("cardBrand"),
  mpesaNumber: text("mpesaNumber"),
  paymentStatus: text("paymentStatus").default("pending"),
  paymentReference: text("paymentReference"),
  paidAt: timestamp("paidAt"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

// Driver statistics
export const driverStats = pgTable("driverStats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  driverId: varchar("driverId").references(() => users.id).unique(),
  totalRides: integer("totalRides").default(0),
  totalDistance: decimal("totalDistance", { precision: 10, scale: 2 }).default("0.00"),
  totalEarnings: decimal("totalEarnings", { precision: 12, scale: 2 }).default("0.00"),
  averageRating: decimal("averageRating", { precision: 3, scale: 2 }).default("0.00"),
  completedRidesThisMonth: integer("completedRidesThisMonth").default(0),
  completedRidesThisYear: integer("completedRidesThisYear").default(0),
  partnershipLevel: text("partnershipLevel").default("bronze"),
  lastRideDate: timestamp("lastRideDate"),
  joinedAt: timestamp("joinedAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

// Events and Fairs System
export const eventManagers = pgTable("eventManagers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("userId").references(() => users.id),
  companyName: text("companyName").notNull(),
  companyType: text("companyType").notNull(),
  description: text("description"),
  contactEmail: text("contactEmail").notNull(),
  contactPhone: text("contactPhone"),
  website: text("website"),
  logo: text("logo"),
  isVerified: boolean("isVerified").default(false),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizerId: varchar("organizerId").references(() => users.id),
  managerId: varchar("managerId").references(() => eventManagers.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  eventType: text("eventType").notNull(),
  category: text("category").notNull(),
  venue: text("venue").notNull(),
  address: text("address").notNull(),
  lat: decimal("lat", { precision: 10, scale: 7 }),
  lng: decimal("lng", { precision: 10, scale: 7 }),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  startTime: text("startTime"),
  endTime: text("endTime"),
  isPaid: boolean("isPaid").default(false),
  ticketPrice: decimal("ticketPrice", { precision: 8, scale: 2 }).default("0"),
  maxTickets: integer("maxTickets").default(100),
  ticketsSold: integer("ticketsSold").default(0),
  enablePartnerships: boolean("enablePartnerships").default(false),
  accommodationDiscount: integer("accommodationDiscount").default(10),
  transportDiscount: integer("transportDiscount").default(15),
  organizerName: text("organizerName"),
  organizerContact: text("organizerContact"),
  organizerEmail: text("organizerEmail"),
  images: text("images").array().default(sql`'{}'`),
  maxAttendees: integer("maxAttendees"),
  currentAttendees: integer("currentAttendees").default(0),
  status: text("status").notNull().default("pending"),
  requiresApproval: boolean("requiresApproval").default(true),
  isPublic: boolean("isPublic").default(true),
  isFeatured: boolean("isFeatured").default(false),
  hasPartnerships: boolean("hasPartnerships").default(false),
  websiteUrl: text("websiteUrl"),
  socialMediaLinks: text("socialMediaLinks").array().default(sql`'{}'`),
  tags: text("tags").array().default(sql`'{}'`),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

// Loyalty System
export const loyaltyProgram = pgTable("loyaltyProgram", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("userId").references(() => users.id),
  totalPoints: integer("totalPoints").default(0),
  currentPoints: integer("currentPoints").default(0),
  membershipLevel: text("membershipLevel").default("bronze"),
  joinedAt: timestamp("joinedAt").defaultNow(),
  lastActivityAt: timestamp("lastActivityAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

export const pointsHistory = pgTable("pointsHistory", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("userId").references(() => users.id),
  loyaltyId: varchar("loyaltyId").references(() => loyaltyProgram.id),
  actionType: text("actionType").notNull(),
  pointsAmount: integer("pointsAmount").notNull(),
  reason: text("reason").notNull(),
  relatedId: varchar("relatedId"),
  createdAt: timestamp("createdAt").defaultNow(),
});

export const loyaltyRewards = pgTable("loyaltyRewards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  rewardType: text("rewardType").notNull(),
  pointsCost: integer("pointsCost").notNull(),
  discountValue: decimal("discountValue", { precision: 8, scale: 2 }),
  minimumLevel: text("minimumLevel").default("bronze"),
  isActive: boolean("isActive").default(true),
  maxRedemptions: integer("maxRedemptions"),
  validUntil: timestamp("validUntil"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

export const rewardRedemptions = pgTable("rewardRedemptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("userId").references(() => users.id),
  rewardId: varchar("rewardId").references(() => loyaltyRewards.id),
  pointsUsed: integer("pointsUsed").notNull(),
  status: text("status").notNull().default("active"),
  expiresAt: timestamp("expiresAt"),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow(),
});

// Real-time Notifications System
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("userId").references(() => users.id),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(),
  priority: text("priority").default("normal"),
  isRead: boolean("isRead").default(false),
  actionUrl: text("actionUrl"),
  relatedId: varchar("relatedId"),
  createdAt: timestamp("createdAt").defaultNow(),
  readAt: timestamp("readAt"),
});

// Driver verification documents
export const driverDocuments = pgTable("driverDocuments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  driverId: varchar("driverId").references(() => users.id).notNull(),
  vehicleRegistrationUrl: text("vehicleRegistrationUrl"),
  drivingLicenseUrl: text("drivingLicenseUrl"),
  vehicleInsuranceUrl: text("vehicleInsuranceUrl"),
  vehicleInspectionUrl: text("vehicleInspectionUrl"),
  vehicleMake: text("vehicleMake"),
  vehicleModel: text("vehicleModel"),
  vehicleYear: integer("vehicleYear"),
  vehiclePlate: text("vehiclePlate"),
  vehicleColor: text("vehicleColor"),
  isVerified: boolean("isVerified").default(false),
  verificationDate: timestamp("verificationDate"),
  verificationNotes: text("verificationNotes"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

// Hotel partnership proposals system
export const partnershipProposals = pgTable("partnershipProposals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hotelId: varchar("hotelId").references(() => accommodations.id).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  proposalType: text("proposalType").notNull(),
  targetRegions: text("targetRegions").array().default(sql`'{}'`),
  minimumDriverLevel: text("minimumDriverLevel").default("bronze"),
  requiredVehicleType: text("requiredVehicleType"),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  specificDates: text("specificDates").array().default(sql`'{}'`),
  timeSlots: text("timeSlots").array().default(sql`'{}'`),
  basePaymentMzn: decimal("basePaymentMzn", { precision: 8, scale: 2 }).notNull(),
  bonusPaymentMzn: decimal("bonusPaymentMzn", { precision: 8, scale: 2 }).default("0.00"),
  premiumRate: decimal("premiumRate", { precision: 5, scale: 2 }).default("0.00"),
  offerFreeAccommodation: boolean("offerFreeAccommodation").default(false),
  offerMeals: boolean("offerMeals").default(false),
  offerFuel: boolean("offerFuel").default(false),
  additionalBenefits: text("additionalBenefits").array().default(sql`'{}'`),
  maxDriversNeeded: integer("maxDriversNeeded").notNull(),
  currentApplicants: integer("currentApplicants").default(0),
  minimumRides: integer("minimumRides"),
  estimatedEarnings: text("estimatedEarnings"),
  status: text("status").default("active"),
  priority: text("priority").default("normal"),
  featuredUntil: timestamp("featuredUntil"),
  contactMethod: text("contactMethod").default("in_app"),
  applicationDeadline: timestamp("applicationDeadline"),
  requiresInterview: boolean("requiresInterview").default(false),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

// Tabela de junção para aplicações de motoristas
export const partnershipApplications = pgTable("partnershipApplications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  proposalId: varchar("proposalId")
    .references(() => partnershipProposals.id)
    .notNull(),
  driverId: varchar("driverId")
    .references(() => users.id)
    .notNull(),
  status: text("status").default("pending"),
  applicationDate: timestamp("applicationDate").defaultNow(),
  acceptedAt: timestamp("acceptedAt"),
  completedAt: timestamp("completedAt"),
  message: text("message"),
  estimatedCompletion: timestamp("estimatedCompletion"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

// Hotel rooms management
export const hotelRooms = pgTable("hotelRooms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accommodationId: varchar("accommodationId").references(() => accommodations.id).notNull(),
  roomNumber: text("roomNumber").notNull(),
  roomType: text("roomType").notNull(),
  description: text("description"),
  images: text("images").array().default(sql`'{}'`),
  pricePerNight: decimal("pricePerNight", { precision: 8, scale: 2 }).notNull(),
  weekendPrice: decimal("weekendPrice", { precision: 8, scale: 2 }),
  holidayPrice: decimal("holidayPrice", { precision: 8, scale: 2 }),
  maxOccupancy: integer("maxOccupancy").notNull().default(2),
  status: text("status").default("available"),
  bedType: text("bedType"),
  bedCount: integer("bedCount").default(1),
  hasPrivateBathroom: boolean("hasPrivateBathroom").default(true),
  hasAirConditioning: boolean("hasAirConditioning").default(false),
  hasWifi: boolean("hasWifi").default(false),
  hasTV: boolean("hasTV").default(false),
  hasBalcony: boolean("hasBalcony").default(false),
  hasKitchen: boolean("hasKitchen").default(false),
  roomAmenities: text("roomAmenities").array().default(sql`'{}'`),
  isAvailable: boolean("isAvailable").default(true),
  maintenanceUntil: timestamp("maintenanceUntil"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

// Hotel financial reports
export const hotelFinancialReports = pgTable("hotelFinancialReports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accommodationId: varchar("accommodationId").references(() => accommodations.id).notNull(),
  reportDate: timestamp("reportDate").notNull(),
  reportType: text("reportType").notNull(),
  totalRevenue: decimal("totalRevenue", { precision: 10, scale: 2 }).notNull(),
  roomRevenue: decimal("roomRevenue", { precision: 10, scale: 2 }).notNull(),
  serviceRevenue: decimal("serviceRevenue", { precision: 10, scale: 2 }).default("0.00"),
  totalBookings: integer("totalBookings").default(0),
  confirmedBookings: integer("confirmedBookings").default(0),
  cancelledBookings: integer("cancelledBookings").default(0),
  noShowBookings: integer("noShowBookings").default(0),
  totalRooms: integer("totalRooms").notNull(),
  occupiedRooms: integer("occupiedRooms").default(0),
  occupancyRate: decimal("occupancyRate", { precision: 5, scale: 2 }).default("0.00"),
  averageDailyRate: decimal("averageDailyRate", { precision: 8, scale: 2 }).default("0.00"),
  revenuePerAvailableRoom: decimal("revenuePerAvailableRoom", { precision: 8, scale: 2 }).default("0.00"),
  platformFees: decimal("platformFees", { precision: 8, scale: 2 }).default("0.00"),
  netRevenue: decimal("netRevenue", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
});

// System settings table
export const systemSettings = pgTable("systemSettings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  type: varchar("type"),
  updatedBy: varchar("updatedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

// Zod Schemas
export const insertUserSchema = createInsertSchema(users);
export const upsertUserSchema = createInsertSchema(users).pick({
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
  phone: true,
  userType: true,
  roles: true,
  canOfferServices: true,
});
export const insertBookingSchema = createInsertSchema(bookings);

// Schema de inserção para rides com validações customizadas
export const insertRideSchema = z.object({
  driverId: z.string(),
  driverName: z.string().optional(),
  fromAddress: z.string().min(1),
  toAddress: z.string().min(1),
  departureDate: z.union([z.string(), z.date()]).transform(val => new Date(val)),
  departureTime: z.string().min(1),
  availableSeats: z.number().int().min(1),
  maxPassengers: z.number().int().min(1).optional(),
  pricePerSeat: z.number().positive().transform(val => val.toFixed(2)),
  vehicleType: z.string().optional(),
  additionalInfo: z.string().optional(),
  status: z.string().optional(),
  type: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const insertAccommodationSchema = createInsertSchema(accommodations);
export const insertPartnershipProposalSchema = createInsertSchema(partnershipProposals);
export const insertHotelRoomSchema = createInsertSchema(hotelRooms);
export const insertRoomTypeSchema = createInsertSchema(roomTypes);
export const insertHotelFinancialReportSchema = createInsertSchema(hotelFinancialReports);
export const insertPartnershipApplicationSchema = createInsertSchema(partnershipApplications);

// Generated Types for roomTypes
export type RoomType = typeof roomTypes.$inferSelect;
export type RoomTypeInsert = typeof roomTypes.$inferInsert;

export type NewSystemSetting = typeof systemSettings.$inferInsert;