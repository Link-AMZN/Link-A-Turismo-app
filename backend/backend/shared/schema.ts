import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, decimal, integer, boolean, jsonb, index, uuid } from "drizzle-orm/pg-core";
import { pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ==================== ENUMS GLOBAIS (COM pgEnum) ====================
// ✅ CORREÇÃO: Enums padronizados e completos
export const statusEnum = pgEnum("status", [
  'pending', 'active', 'available', 'confirmed', 'cancelled', 
  'completed', 'expired', 'in_progress', 'approved', 'rejected'
]);

export const serviceTypeEnum = pgEnum("service_type", ['ride', 'accommodation', 'event']);
export const userTypeEnum = pgEnum("user_type", ['client', 'driver', 'host', 'admin']);
export const partnershipLevelEnum = pgEnum("partnership_level", ['bronze', 'silver', 'gold', 'platinum']);
export const verificationStatusEnum = pgEnum("verification_status", ['pending', 'in_review', 'verified', 'rejected']);
export const paymentMethodEnum = pgEnum("payment_method", ['card', 'mpesa', 'bank', 'mobile_money', 'bank_transfer']);
export const rideTypeEnum = pgEnum("ride_type", ['regular', 'premium', 'shared', 'express']);

// Constantes para uso no código
export const STATUS_ENUM = {
  PENDING: 'pending',
  ACTIVE: 'active',
  AVAILABLE: 'available',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  EXPIRED: 'expired',
  IN_PROGRESS: 'in_progress',
  APPROVED: 'approved',
  REJECTED: 'rejected'
} as const;

export const SERVICE_TYPE_ENUM = {
  RIDE: 'ride',
  ACCOMMODATION: 'accommodation',
  EVENT: 'event'
} as const;

export const USER_TYPE_ENUM = {
  CLIENT: 'client',
  DRIVER: 'driver',
  HOST: 'host',
  ADMIN: 'admin'
} as const;

export const PARTNERSHIP_LEVEL_ENUM = {
  BRONZE: 'bronze',
  SILVER: 'silver',
  GOLD: 'gold',
  PLATINUM: 'platinum'
} as const;

export const VERIFICATION_STATUS_ENUM = {
  PENDING: 'pending',
  IN_REVIEW: 'in_review',
  VERIFIED: 'verified',
  REJECTED: 'rejected'
} as const;

// ==================== TABELAS BASE ====================

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => ({
    expireIdx: index("sessions_expire_idx").on(table.expire),
  })
);

// ✅ CORREÇÃO: users.id agora é TEXT para compatibilidade com Firebase IDs
// ✅ CORREÇÃO: Campos redundantes removidos e padronizados
export const users = pgTable("users", {
  id: text("id").primaryKey(), // Firebase IDs são strings, não UUIDs
  email: varchar("email").unique(),
  firstName: varchar("firstName"),
  lastName: varchar("lastName"),
  fullName: text("fullName"),
  profileImageUrl: varchar("profileImageUrl"), // ✅ Mantido como principal
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
  phone: text("phone").unique(),
  userType: userTypeEnum("userType").default('client'),
  roles: text("roles").array().default(sql`'{}'`),
  canOfferServices: boolean("canOfferServices").default(false),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0.00"),
  totalReviews: integer("totalReviews").default(0),
  isVerified: boolean("isVerified").default(false),
  verificationStatus: verificationStatusEnum("verificationStatus").default('pending'), // ✅ CORREÇÃO: Usando enum
  verificationDate: timestamp("verificationDate"),
  verificationNotes: text("verificationNotes"),
  identityDocumentUrl: text("identityDocumentUrl"),
  identityDocumentType: text("identityDocumentType"),
  documentNumber: text("documentNumber"),
  dateOfBirth: timestamp("dateOfBirth"),
  registrationCompleted: boolean("registrationCompleted").default(false),
  verificationBadge: text("verificationBadge"),
  badgeEarnedDate: timestamp("badgeEarnedDate"),
});

// ==================== TABELA DE LOCALIDADES OSM (ATUALIZADA) ====================

export const mozambiqueLocations = pgTable("mozambique_locations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  province: varchar("province", { length: 100 }),
  district: varchar("district", { length: 100 }),
  lat: decimal("lat", { precision: 10, scale: 7 }).notNull(),
  lng: decimal("lng", { precision: 10, scale: 7 }).notNull(),
  type: varchar("type", { length: 20 }).notNull(), // 'city' | 'town' | 'village'
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
}, (table) => ({
  nameIdx: index("locations_name_idx").on(table.name),
  provinceIdx: index("locations_province_idx").on(table.province),
  typeIdx: index("locations_type_idx").on(table.type),
  geoIdx: index("locations_geo_idx").on(table.lat, table.lng),
  // ✅ CORREÇÃO: Índices otimizados - removido searchIdx redundante
  textSearchIdx: index("locations_text_search_idx").on(table.name),
}));

// ==================== ACCOMMODATIONS & RELATED TABLES ====================

// ✅ CORREÇÃO: hostId agora é TEXT para compatibilidade
// ✅ CORREÇÃO: Campos padronizados e redundâncias removidas
export const accommodations = pgTable("accommodations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  hostId: text("hostId").references(() => users.id, { onDelete: "set null" }).notNull(), // ✅ CORREÇÃO: notNull adicionado
  address: text("address").notNull(),
  // CAMPOS PARA LOCALIZAÇÃO INTELIGENTE
  locality: varchar("locality", { length: 100 }),
  province: varchar("province", { length: 100 }),
  country: varchar("country", { length: 100 }).default('Moçambique'),
  searchRadius: integer("searchRadius").default(50),
  lat: decimal("lat", { precision: 10, scale: 7 }), // ✅ CORREÇÃO: Mantido nullable
  lng: decimal("lng", { precision: 10, scale: 7 }), // ✅ CORREÇÃO: Mantido nullable
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0.00"), // ✅ CORREÇÃO: Escala padronizada para 2
  reviewCount: integer("reviewCount").default(0),
  images: text("images").array().default(sql`'{}'`),
  amenities: text("amenities").array().default(sql`'{}'`),
  description: text("description"),
  distanceFromCenter: decimal("distanceFromCenter", { precision: 4, scale: 1 }),
  isAvailable: boolean("isAvailable").default(true),
  offerDriverDiscounts: boolean("offerDriverDiscounts").default(false),
  driverDiscountRate: decimal("driverDiscountRate", { precision: 5, scale: 2 }).default("10.00"),
  minimumDriverLevel: partnershipLevelEnum("minimumDriverLevel").default('bronze'),
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
}, (table) => ({
  // ✅ CORREÇÃO: Índices otimizados
  locationIdx: index("accommodations_location_idx").on(table.locality, table.province),
  geoIdx: index("accommodations_geo_idx").on(table.lat, table.lng),
  hostIdx: index("accommodations_host_idx").on(table.hostId),
}));

// ✅ CORREÇÃO: Campos redundantes removidos (amenities vs roomAmenities)
export const hotelRooms = pgTable("hotelRooms", {
  id: uuid("id").primaryKey().defaultRandom(),
  accommodationId: uuid("accommodationId").references(() => accommodations.id, { onDelete: "cascade" }).notNull(),
  roomNumber: text("roomNumber").notNull(),
  roomType: text("roomType").notNull(),
  description: text("description"),
  images: text("images").array().default(sql`'{}'`),
  pricePerNight: decimal("pricePerNight", { precision: 8, scale: 2 }).notNull(),
  weekendPrice: decimal("weekendPrice", { precision: 8, scale: 2 }),
  holidayPrice: decimal("holidayPrice", { precision: 8, scale: 2 }),
  maxOccupancy: integer("maxOccupancy").notNull().default(2),
  status: statusEnum("status").default("available"), // ✅ CORREÇÃO: Usando enum
  bedType: text("bedType"),
  bedCount: integer("bedCount").default(1),
  hasPrivateBathroom: boolean("hasPrivateBathroom").default(true),
  hasAirConditioning: boolean("hasAirConditioning").default(false),
  hasWifi: boolean("hasWifi").default(false),
  hasTV: boolean("hasTV").default(false),
  hasBalcony: boolean("hasBalcony").default(false),
  hasKitchen: boolean("hasKitchen").default(false),
  amenities: text("amenities").array().default(sql`'{}'`), // ✅ CORREÇÃO: Mantido apenas um campo
  isAvailable: boolean("isAvailable").default(true),
  maintenanceUntil: timestamp("maintenanceUntil"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

// ✅ CORREÇÃO: Status padronizado para usar enum
export const roomTypes = pgTable("roomTypes", {
  id: uuid("id").defaultRandom().primaryKey(),
  accommodationId: uuid("accommodationId")
    .notNull()
    .references(() => accommodations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull().default('standard'),
  pricePerNight: decimal("pricePerNight", { precision: 8, scale: 2 }).notNull(),
  description: text("description"),
  maxOccupancy: integer("maxOccupancy").default(2),
  bedType: text("bedType"),
  bedCount: integer("bedCount").default(1),
  amenities: text("amenities").array().default(sql`'{}'`),
  images: text("images").array().default(sql`'{}'`),
  isAvailable: boolean("isAvailable").default(true),
  status: statusEnum("status").default('active'), // ✅ CORREÇÃO: Usando enum
  basePrice: decimal("basePrice", { precision: 8, scale: 2 }),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

// ==================== RIDES & TRANSPORTATION ====================

// ✅ CORREÇÃO: driverId agora é TEXT para compatibilidade
// ✅ CORREÇÃO: Campos padronizados e tipo de ride usando enum
// ✅ CORREÇÃO ADICIONAL: Adicionados campos fromCity e toCity
// ✅ CORREÇÃO CRÍTICA: pricePerSeat alterado para varchar
// ✅ CORREÇÃO COMPLETA: Adicionados todos os campos faltantes (usando text para campos geométricos)
export const rides = pgTable("rides", {
  id: uuid("id").primaryKey().defaultRandom(),
  driverId: text("driverId").references(() => users.id, { onDelete: "cascade" }).notNull(),
  driverName: text("driverName"),
  fromAddress: varchar("fromAddress", { length: 255 }).notNull(),
  toAddress: varchar("toAddress", { length: 255 }).notNull(),
  
  // ✅ CORREÇÃO ADICIONAL: CAMPOS NOVOS fromCity e toCity
  fromCity: varchar("fromCity", { length: 100 }),
  toCity: varchar("toCity", { length: 100 }),
  
  // ✅ CORREÇÃO COMPLETA: CAMPOS FALTANTES ADICIONADOS
  fromDistrict: varchar("fromDistrict", { length: 100 }),
  toDistrict: varchar("toDistrict", { length: 100 }),
  
  // CAMPOS PARA LOCALIZAÇÃO INTELIGENTE
  fromLocality: varchar("fromLocality", { length: 100 }),
  fromProvince: varchar("fromProvince", { length: 100 }),
  toLocality: varchar("toLocality", { length: 100 }),
  toProvince: varchar("toProvince", { length: 100 }),
  
  departureDate: timestamp("departureDate").notNull(),
  departureTime: text("departureTime").notNull(),
  availableSeats: integer("availableSeats").notNull(),
  maxPassengers: integer("maxPassengers").default(4),
  
  // ✅ CORREÇÃO CRÍTICA: Alterado de decimal para varchar
  pricePerSeat: varchar("pricePerSeat").notNull(),
  
  vehicleType: varchar("vehicleType", { length: 50 }),
  additionalInfo: text("additionalInfo"),
  status: statusEnum("status").default('available'),
  type: rideTypeEnum("type").default("regular"), // ✅ CORREÇÃO: Usando enum
  
  // ✅ CORREÇÃO COMPLETA: CAMPOS GEOMÉTRICOS E DE ROTA ADICIONADOS (usando text)
  from_geom: text("from_geom"), // Será armazenado como texto (WKT ou GeoJSON)
  to_geom: text("to_geom"), // Será armazenado como texto (WKT ou GeoJSON)
  distance_real_km: decimal("distance_real_km", { precision: 10, scale: 2 }),
  polyline: text("polyline"), // Será armazenado como texto (encoded polyline)
  
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
}, (table) => ({
  fromLocationIdx: index("rides_from_location_idx").on(table.fromLocality, table.fromProvince),
  toLocationIdx: index("rides_to_location_idx").on(table.toLocality, table.toProvince),
  // ✅ CORREÇÃO ADICIONAL: Índices para os novos campos
  fromCityIdx: index("rides_from_city_idx").on(table.fromCity),
  toCityIdx: index("rides_to_city_idx").on(table.toCity),
  statusIdx: index("rides_status_idx").on(table.status),
  driverIdx: index("rides_driver_idx").on(table.driverId),
  // ✅ CORREÇÃO COMPLETA: Índices para campos de distrito
  fromDistrictIdx: index("rides_from_district_idx").on(table.fromDistrict),
  toDistrictIdx: index("rides_to_district_idx").on(table.toDistrict),
}));

// ==================== BOOKINGS & PAYMENTS ====================

// ✅ CORREÇÃO: passengerId agora é TEXT para compatibilidade
export const bookings = pgTable("bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  rideId: uuid("rideId").references(() => rides.id, { onDelete: "cascade" }),
  passengerId: text("passengerId").references(() => users.id, { onDelete: "cascade" }), // ✅ CORREÇÃO: Mantido nullable
  accommodationId: uuid("accommodationId").references(() => accommodations.id, { onDelete: "cascade" }),
  hotelRoomId: uuid("hotelRoomId").references(() => hotelRooms.id, { onDelete: "cascade" }),
  type: serviceTypeEnum("type").default('ride'),
  status: statusEnum("status").default('pending'),
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
}, (table) => ({
  statusIdx: index("bookings_status_idx").on(table.status),
  typeIdx: index("bookings_type_idx").on(table.type),
  passengerIdx: index("bookings_passenger_idx").on(table.passengerId),
}));

// ✅ CORREÇÃO: userId agora é TEXT para compatibilidade
export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  bookingId: uuid("bookingId").references(() => bookings.id, { onDelete: "cascade" }).notNull(),
  userId: text("userId").references(() => users.id, { onDelete: "cascade" }).notNull(),
  serviceType: serviceTypeEnum("serviceType").notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  platformFee: decimal("platformFee", { precision: 10, scale: 2 }).notNull(),
  discountAmount: decimal("discountAmount", { precision: 10, scale: 2 }).default("0.00"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: paymentMethodEnum("paymentMethod"), // ✅ CORREÇÃO: Usando enum
  cardLast4: text("cardLast4"),
  cardBrand: text("cardBrand"),
  mpesaNumber: text("mpesaNumber"),
  paymentStatus: statusEnum("paymentStatus").default('pending'),
  paymentReference: text("paymentReference"),
  paidAt: timestamp("paidAt"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

// ==================== RATINGS & REVIEWS ====================

// ✅ CORREÇÃO: fromUserId e toUserId agora são TEXT para compatibilidade
export const ratings = pgTable("ratings", {
  id: uuid("id").primaryKey().defaultRandom(),
  fromUserId: text("fromUserId").references(() => users.id, { onDelete: "cascade" }).notNull(),
  toUserId: text("toUserId").references(() => users.id, { onDelete: "cascade" }).notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  serviceType: serviceTypeEnum("serviceType").notNull(),
  bookingId: uuid("bookingId"),
  createdAt: timestamp("createdAt").defaultNow(),
}, (table) => ({
  toUserIdx: index("ratings_to_user_idx").on(table.toUserId),
  serviceTypeIdx: index("ratings_service_type_idx").on(table.serviceType),
}));

// ==================== CHAT SYSTEM ====================

// ✅ CORREÇÃO: participantOneId e participantTwoId agora são TEXT para compatibilidade
export const chatRooms = pgTable("chatRooms", {
  id: uuid("id").primaryKey().defaultRandom(),
  participantOneId: text("participantOneId").references(() => users.id, { onDelete: "cascade" }).notNull(),
  participantTwoId: text("participantTwoId").references(() => users.id, { onDelete: "cascade" }).notNull(),
  bookingId: uuid("bookingId"),
  serviceType: serviceTypeEnum("serviceType"),
  lastMessage: text("lastMessage"),
  lastMessageAt: timestamp("lastMessageAt"),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
}, (table) => ({
  participantsIdx: index("chat_rooms_participants_idx").on(table.participantOneId, table.participantTwoId),
}));

// ✅ CORREÇÃO: fromUserId e toUserId agora são TEXT para compatibilidade
export const chatMessages = pgTable("chatMessages", {
  id: uuid("id").primaryKey().defaultRandom(),
  chatRoomId: uuid("chatRoomId").references(() => chatRooms.id, { onDelete: "cascade" }).notNull(),
  fromUserId: text("fromUserId").references(() => users.id, { onDelete: "cascade" }).notNull(),
  toUserId: text("toUserId").references(() => users.id, { onDelete: "cascade" }).notNull(),
  message: text("message").notNull(),
  messageType: text("messageType").default("text"),
  bookingId: uuid("bookingId"),
  isRead: boolean("isRead").default(false),
  createdAt: timestamp("createdAt").defaultNow(),
}, (table) => ({
  chatRoomIdx: index("chat_messages_room_idx").on(table.chatRoomId),
  fromUserIdx: index("chat_messages_from_user_idx").on(table.fromUserId),
}));

// ==================== PARTNERSHIP SYSTEM ====================

export const partnershipProposals = pgTable("partnershipProposals", {
  id: uuid("id").primaryKey().defaultRandom(),
  hotelId: uuid("hotelId").references(() => accommodations.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: statusEnum("status").notNull().default('pending'),
  startDate: timestamp("startDate").defaultNow(),
  endDate: timestamp("endDate").notNull(),
  province: varchar("province"),
  city: varchar("city"),
  offerFuel: boolean("offerFuel").default(false),
  offerMeals: boolean("offerMeals").default(false),
  offerFreeAccommodation: boolean("offerFreeAccommodation").default(false),
  premiumRate: decimal("premiumRate").default("0"),
  minimumDriverLevel: partnershipLevelEnum("minimumDriverLevel").default('bronze'),
  requiredVehicleType: varchar("requiredVehicleType").default("any"),
  currentApplicants: integer("currentApplicants").default(0),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
}, (table) => ({
  statusIdx: index("partnership_proposals_status_idx").on(table.status),
  hotelIdx: index("partnership_proposals_hotel_idx").on(table.hotelId),
}));

// ✅ CORREÇÃO: driverId agora é TEXT para compatibilidade
export const partnershipApplications = pgTable("partnershipApplications", {
  id: uuid("id").primaryKey().defaultRandom(),
  proposalId: uuid("proposalId")
    .references(() => partnershipProposals.id, { onDelete: "cascade" })
    .notNull(),
  driverId: text("driverId")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  status: statusEnum("status").default('pending'),
  applicationDate: timestamp("applicationDate").defaultNow(),
  acceptedAt: timestamp("acceptedAt"),
  completedAt: timestamp("completedAt"),
  message: text("message"),
  estimatedCompletion: timestamp("estimatedCompletion"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
}, (table) => ({
  statusIdx: index("partnership_applications_status_idx").on(table.status),
  driverIdx: index("partnership_applications_driver_idx").on(table.driverId),
}));

// ==================== ADMIN & SYSTEM TABLES ====================

// ✅ CORREÇÃO: adminId e targetUserId agora são TEXT para compatibilidade
export const adminActions = pgTable("adminActions", {
  id: uuid("id").primaryKey().defaultRandom(),
  adminId: text("adminId").references(() => users.id, { onDelete: "set null" }).notNull(),
  targetUserId: text("targetUserId").references(() => users.id, { onDelete: "cascade" }).notNull(),
  action: text("action").notNull(),
  reason: text("reason").notNull(),
  duration: integer("duration"),
  notes: text("notes"),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow(),
});

export const priceRegulations = pgTable("priceRegulations", {
  id: uuid("id").primaryKey().defaultRandom(),
  rideType: rideTypeEnum("rideType").notNull(), // ✅ CORREÇÃO: Usando enum
  minPricePerKm: decimal("minPricePerKm", { precision: 8, scale: 2 }).notNull(),
  maxPricePerKm: decimal("maxPricePerKm", { precision: 8, scale: 2 }).notNull(),
  baseFare: decimal("baseFare", { precision: 8, scale: 2 }).notNull(),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

// ✅ CORREÇÃO: passengerId e driverId agora são TEXT para compatibilidade
export const priceNegotiations = pgTable("priceNegotiations", {
  id: uuid("id").primaryKey().defaultRandom(),
  rideId: uuid("rideId").references(() => rides.id, { onDelete: "cascade" }),
  passengerId: text("passengerId").references(() => users.id, { onDelete: "cascade" }).notNull(),
  driverId: text("driverId").references(() => users.id, { onDelete: "cascade" }).notNull(),
  originalPrice: decimal("originalPrice", { precision: 8, scale: 2 }).notNull(),
  proposedPrice: decimal("proposedPrice", { precision: 8, scale: 2 }).notNull(),
  counterPrice: decimal("counterPrice", { precision: 8, scale: 2 }),
  status: statusEnum("status").default('pending'),
  message: text("message"),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

// ✅ CORREÇÃO: passengerId e driverId agora são TEXT para compatibilidade
export const pickupRequests = pgTable("pickupRequests", {
  id: uuid("id").primaryKey().defaultRandom(),
  rideId: uuid("rideId").references(() => rides.id, { onDelete: "cascade" }),
  passengerId: text("passengerId").references(() => users.id, { onDelete: "cascade" }).notNull(),
  driverId: text("driverId").references(() => users.id, { onDelete: "cascade" }).notNull(),
  pickupLocation: text("pickupLocation").notNull(),
  pickupLat: decimal("pickupLat", { precision: 10, scale: 7 }),
  pickupLng: decimal("pickupLng", { precision: 10, scale: 7 }),
  destinationLocation: text("destinationLocation").notNull(),
  destinationLat: decimal("destinationLat", { precision: 10, scale: 7 }),
  destinationLng: decimal("destinationLng", { precision: 10, scale: 7 }),
  requestedSeats: integer("requestedSeats").default(1),
  proposedPrice: decimal("proposedPrice", { precision: 8, scale: 2 }),
  status: statusEnum("status").default('pending'),
  message: text("message"),
  estimatedDetour: integer("estimatedDetour"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

// ==================== DRIVER & VEHICLE MANAGEMENT ====================

// ✅ CORREÇÃO: driverId agora é TEXT para compatibilidade
export const driverStats = pgTable("driverStats", {
  id: uuid("id").primaryKey().defaultRandom(),
  driverId: text("driverId").references(() => users.id, { onDelete: "cascade" }).unique().notNull(),
  totalRides: integer("totalRides").default(0),
  totalDistance: decimal("totalDistance", { precision: 10, scale: 2 }).default("0.00"),
  totalEarnings: decimal("totalEarnings", { precision: 12, scale: 2 }).default("0.00"),
  averageRating: decimal("averageRating", { precision: 3, scale: 2 }).default("0.00"),
  completedRidesThisMonth: integer("completedRidesThisMonth").default(0),
  completedRidesThisYear: integer("completedRidesThisYear").default(0),
  partnershipLevel: partnershipLevelEnum("partnershipLevel").default('bronze'),
  lastRideDate: timestamp("lastRideDate"),
  joinedAt: timestamp("joinedAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

// ✅ CORREÇÃO: driverId agora é TEXT para compatibilidade
export const driverDocuments = pgTable("driverDocuments", {
  id: uuid("id").primaryKey().defaultRandom(),
  driverId: text("driverId").references(() => users.id, { onDelete: "cascade" }).notNull(),
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

// ==================== EVENTS & FAIRS SYSTEM ====================

// ✅ CORREÇÃO: userId agora é TEXT para compatibilidade
export const eventManagers = pgTable("eventManagers", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("userId").references(() => users.id, { onDelete: "cascade" }).notNull(),
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

// ✅ CORREÇÃO: organizerId agora é TEXT para compatibilidade
export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizerId: text("organizerId").references(() => users.id, { onDelete: "set null" }).notNull(),
  managerId: uuid("managerId").references(() => eventManagers.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  eventType: text("eventType").notNull(),
  category: text("category").notNull(),
  venue: text("venue").notNull(),
  address: text("address").notNull(),
  locality: varchar("locality", { length: 100 }),
  province: varchar("province", { length: 100 }),
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
  status: statusEnum("status").notNull().default('pending'),
  requiresApproval: boolean("requiresApproval").default(true),
  isPublic: boolean("isPublic").default(true),
  isFeatured: boolean("isFeatured").default(false),
  hasPartnerships: boolean("hasPartnerships").default(false),
  websiteUrl: text("websiteUrl"),
  socialMediaLinks: text("socialMediaLinks").array().default(sql`'{}'`),
  tags: text("tags").array().default(sql`'{}'`),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
}, (table) => ({
  eventLocationIdx: index("events_location_idx").on(table.locality, table.province),
  statusIdx: index("events_status_idx").on(table.status),
}));

// ==================== LOYALTY SYSTEM ====================

// ✅ CORREÇÃO: userId agora é TEXT para compatibilidade
export const loyaltyProgram = pgTable("loyaltyProgram", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("userId").references(() => users.id, { onDelete: "cascade" }).notNull(),
  totalPoints: integer("totalPoints").default(0),
  currentPoints: integer("currentPoints").default(0),
  membershipLevel: partnershipLevelEnum("membershipLevel").default('bronze'),
  joinedAt: timestamp("joinedAt").defaultNow(),
  lastActivityAt: timestamp("lastActivityAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

// ✅ CORREÇÃO: userId agora é TEXT para compatibilidade
export const pointsHistory = pgTable("pointsHistory", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("userId").references(() => users.id, { onDelete: "cascade" }).notNull(),
  loyaltyId: uuid("loyaltyId").references(() => loyaltyProgram.id, { onDelete: "cascade" }),
  actionType: text("actionType").notNull(),
  pointsAmount: integer("pointsAmount").notNull(),
  reason: text("reason").notNull(),
  relatedId: uuid("relatedId"),
  createdAt: timestamp("createdAt").defaultNow(),
});

export const loyaltyRewards = pgTable("loyaltyRewards", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  rewardType: text("rewardType").notNull(),
  pointsCost: integer("pointsCost").notNull(),
  discountValue: decimal("discountValue", { precision: 8, scale: 2 }),
  minimumLevel: partnershipLevelEnum("minimumLevel").default('bronze'),
  isActive: boolean("isActive").default(true),
  maxRedemptions: integer("maxRedemptions"),
  validUntil: timestamp("validUntil"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

// ✅ CORREÇÃO: userId agora é TEXT para compatibilidade
export const rewardRedemptions = pgTable("rewardRedemptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("userId").references(() => users.id, { onDelete: "cascade" }).notNull(),
  rewardId: uuid("rewardId").references(() => loyaltyRewards.id, { onDelete: "cascade" }),
  pointsUsed: integer("pointsUsed").notNull(),
  status: statusEnum("status").notNull().default('active'),
  expiresAt: timestamp("expiresAt"),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow(),
});

// ==================== NOTIFICATIONS & FINANCIAL REPORTS ====================

// ✅ CORREÇÃO: userId agora é TEXT para compatibilidade
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("userId").references(() => users.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(),
  priority: text("priority").default("normal"),
  isRead: boolean("isRead").default(false),
  actionUrl: text("actionUrl"),
  relatedId: uuid("relatedId"),
  createdAt: timestamp("createdAt").defaultNow(),
  readAt: timestamp("readAt"),
}, (table) => ({
  userIdx: index("notifications_user_idx").on(table.userId),
  isReadIdx: index("notifications_is_read_idx").on(table.isRead),
}));

export const hotelFinancialReports = pgTable("hotelFinancialReports", {
  id: uuid("id").primaryKey().defaultRandom(),
  accommodationId: uuid("accommodationId").references(() => accommodations.id, { onDelete: "cascade" }).notNull(),
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

export const systemSettings = pgTable("systemSettings", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: varchar("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  type: varchar("type"),
  updatedBy: uuid("updatedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

// ==================== ZOD SCHEMAS COMPLETOS ====================

// ✅ CORREÇÃO: Enums Zod atualizados e completos
const userTypeZod = z.enum(["client", "driver", "host", "admin"]);
const statusZod = z.enum(["pending", "active", "available", "confirmed", "cancelled", "completed", "expired", "in_progress", "approved", "rejected"]);
const serviceTypeZod = z.enum(["ride", "accommodation", "event"]);
const partnershipLevelZod = z.enum(["bronze", "silver", "gold", "platinum"]);
const verificationStatusZod = z.enum(["pending", "in_review", "verified", "rejected"]);
const paymentMethodZod = z.enum(["card", "mpesa", "bank", "mobile_money", "bank_transfer"]);
const rideTypeZod = z.enum(["regular", "premium", "shared", "express"]);
const locationTypeZod = z.enum(["city", "town", "village"]);

export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email(),
  phone: z.string().optional(),
  userType: userTypeZod,
  verificationStatus: verificationStatusZod.optional(),
  rating: z.number().min(0).max(5).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

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

// ✅ CORREÇÃO: Schema para rides com campos novos fromCity e toCity
// ✅ CORREÇÃO: pricePerSeat agora é string no schema Zod também
// ✅ CORREÇÃO COMPLETA: Adicionados todos os campos faltantes ao schema
export const insertRideSchema = createInsertSchema(rides, {
  fromAddress: z.string().min(1),
  toAddress: z.string().min(1),
  // ✅ CORREÇÃO ADICIONAL: Campos fromCity e toCity adicionados
  fromCity: z.string().optional(),
  toCity: z.string().optional(),
  // ✅ CORREÇÃO COMPLETA: Campos fromDistrict e toDistrict adicionados
  fromDistrict: z.string().optional(),
  toDistrict: z.string().optional(),
  fromLocality: z.string().optional(),
  fromProvince: z.string().optional(),
  toLocality: z.string().optional(),
  toProvince: z.string().optional(),
  departureDate: z.date(),
  availableSeats: z.number().int().min(1).max(10),
  // ✅ CORREÇÃO: pricePerSeat agora é string
  pricePerSeat: z.string().min(1),
  status: statusZod.optional(),
  type: rideTypeZod.optional(),
  // ✅ CORREÇÃO COMPLETA: Campos geométricos adicionados
  distance_real_km: z.number().optional(),
  from_geom: z.string().optional(),
  to_geom: z.string().optional(),
  polyline: z.string().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// ✅ CORREÇÃO: Schema para atualização de rides com campos novos
export const updateRideSchema = createInsertSchema(rides, {
  fromAddress: z.string().min(1).optional(),
  toAddress: z.string().min(1).optional(),
  // ✅ CORREÇÃO ADICIONAL: Campos fromCity e toCity adicionados
  fromCity: z.string().optional(),
  toCity: z.string().optional(),
  // ✅ CORREÇÃO COMPLETA: Campos fromDistrict e toDistrict adicionados
  fromDistrict: z.string().optional(),
  toDistrict: z.string().optional(),
  fromLocality: z.string().optional(),
  fromProvince: z.string().optional(),
  toLocality: z.string().optional(),
  toProvince: z.string().optional(),
  departureDate: z.date().optional(),
  availableSeats: z.number().int().min(1).max(10).optional(),
  // ✅ CORREÇÃO: pricePerSeat agora é string
  pricePerSeat: z.string().min(1).optional(),
  status: statusZod.optional(),
  type: rideTypeZod.optional(),
  // ✅ CORREÇÃO COMPLETA: Campos geométricos adicionados
  distance_real_km: z.number().optional(),
  from_geom: z.string().optional(),
  to_geom: z.string().optional(),
  polyline: z.string().optional(),
}).partial().omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAccommodationSchema = createInsertSchema(accommodations, {
  name: z.string().min(1).max(255),
  type: z.string().min(1),
  address: z.string().min(1),
  contactEmail: z.string().email().optional(),
  rating: z.number().min(0).max(5).optional(),
  maxGuests: z.number().int().min(1).max(20),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBookingSchema = createInsertSchema(bookings, {
  type: serviceTypeZod,
  status: statusZod,
  totalPrice: z.number().positive(),
  seatsBooked: z.number().int().min(1),
  passengers: z.number().int().min(1).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// SCHEMA ATUALIZADO para mozambique_locations
export const insertMozambiqueLocationSchema = createInsertSchema(mozambiqueLocations, {
  name: z.string().min(1).max(100),
  province: z.string().max(100).optional(),
  district: z.string().max(100).optional(),
  type: locationTypeZod,
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertHotelRoomSchema = createInsertSchema(hotelRooms);
export const insertRoomTypeSchema = createInsertSchema(roomTypes);
export const insertPaymentSchema = createInsertSchema(payments);
export const insertRatingSchema = createInsertSchema(ratings);
export const insertChatRoomSchema = createInsertSchema(chatRooms);
export const insertChatMessageSchema = createInsertSchema(chatMessages);
export const insertPartnershipProposalSchema = createInsertSchema(partnershipProposals);
export const insertPartnershipApplicationSchema = createInsertSchema(partnershipApplications);
export const insertEventSchema = createInsertSchema(events);
export const insertNotificationSchema = createInsertSchema(notifications);
export const insertDriverStatsSchema = createInsertSchema(driverStats);
export const insertDriverDocumentsSchema = createInsertSchema(driverDocuments);
export const insertLoyaltyProgramSchema = createInsertSchema(loyaltyProgram);
export const insertPointsHistorySchema = createInsertSchema(pointsHistory);
export const insertLoyaltyRewardsSchema = createInsertSchema(loyaltyRewards);
export const insertRewardRedemptionsSchema = createInsertSchema(rewardRedemptions);
export const insertSystemSettingsSchema = createInsertSchema(systemSettings);

// ==================== TIPOS TYPESCRIPT ====================

export type User = typeof users.$inferSelect;
export type UserInsert = typeof users.$inferInsert;

export type Ride = typeof rides.$inferSelect;
export type RideInsert = typeof rides.$inferInsert;

export type Accommodation = typeof accommodations.$inferSelect;
export type AccommodationInsert = typeof accommodations.$inferInsert;

export type Booking = typeof bookings.$inferSelect;
export type BookingInsert = typeof bookings.$inferInsert;

export type MozambiqueLocation = typeof mozambiqueLocations.$inferSelect;
export type MozambiqueLocationInsert = typeof mozambiqueLocations.$inferInsert;

export type HotelRoom = typeof hotelRooms.$inferSelect;
export type HotelRoomInsert = typeof hotelRooms.$inferInsert;

export type RoomType = typeof roomTypes.$inferSelect;
export type RoomTypeInsert = typeof roomTypes.$inferInsert;

export type NewSystemSetting = typeof systemSettings.$inferInsert;

// Interface para busca inteligente (ATUALIZADA)
export interface LocationSuggestion {
  id: string;
  name: string;
  province: string | null;
  district: string | null;
  lat: number;
  lng: number;
  type: string;
  distance_m?: number;
}

export interface SearchBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface IntelligentSearchParams {
  location: LocationSuggestion | null;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  searchRadius?: number;
}

export interface RideSearchParams {
  fromLocation: LocationSuggestion | null;
  toLocation: LocationSuggestion | null;
  date?: string;
  passengers?: number;
}