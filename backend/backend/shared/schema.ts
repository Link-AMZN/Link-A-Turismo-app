import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, decimal, integer, boolean, jsonb, index, uuid } from "drizzle-orm/pg-core";
import { pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ==================== ENUMS GLOBAIS (COM pgEnum) ====================
export const statusEnum = pgEnum("status", [
  'pending', 'active', 'available', 'confirmed', 'cancelled', 
  'completed', 'expired', 'in_progress', 'checked_in', 'checked_out',
  'approved', 'rejected', 'pending_payment'
]);

export const serviceTypeEnum = pgEnum("service_type", ['ride', 'accommodation', 'event', 'hotel']);
export const userTypeEnum = pgEnum("user_type", ['client', 'driver', 'host', 'admin']);
export const partnershipLevelEnum = pgEnum("partnership_level", ['bronze', 'silver', 'gold', 'platinum']);
export const verificationStatusEnum = pgEnum("verification_status", ['pending', 'in_review', 'verified', 'rejected']);
export const paymentMethodEnum = pgEnum("payment_method", ['card', 'mpesa', 'bank', 'mobile_money', 'bank_transfer', 'pending']);
export const rideTypeEnum = pgEnum("ride_type", ['regular', 'premium', 'shared', 'express']);
export const vehicleTypeEnum = pgEnum("vehicle_type", ['economy', 'comfort', 'luxury', 'family', 'premium', 'van', 'suv']);

// ✅ NOVO: Enums para sistema hoteleiro
export const roomStatusEnum = pgEnum("room_status", ['available', 'occupied', 'maintenance', 'cleaning']);
export const bookingSourceEnum = pgEnum("booking_source", ['website', 'mobile_app', 'agency', 'walk_in', 'phone']);

// ==================== TABELAS BASE ====================

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

// ✅ CORREÇÃO: users.id mantido como TEXT para Firebase
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: varchar("email").unique(),
  firstName: varchar("firstName"),
  lastName: varchar("lastName"),
  fullName: text("fullName"),
  profileImageUrl: varchar("profileImageUrl"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
  phone: text("phone").unique(),
  userType: userTypeEnum("userType").default('client'),
  roles: text("roles").array().default(sql`'{}'`),
  canOfferServices: boolean("canOfferServices").default(false),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0.00"),
  totalReviews: integer("totalReviews").default(0),
  isVerified: boolean("isVerified").default(false),
  verificationStatus: verificationStatusEnum("verificationStatus").default('pending'),
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

// ==================== TABELA DE LOCALIDADES ====================

export const mozambiqueLocations = pgTable("mozambique_locations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  province: varchar("province", { length: 100 }),
  district: varchar("district", { length: 100 }),
  lat: decimal("lat", { precision: 10, scale: 7 }).notNull(),
  lng: decimal("lng", { precision: 10, scale: 7 }).notNull(),
  geom: text("geom"), // ✅ CORREÇÃO: Adicionado campo geom para PostGIS
  type: varchar("type", { length: 20 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
}, (table) => ({
  nameIdx: index("locations_name_idx").on(table.name),
  provinceIdx: index("locations_province_idx").on(table.province),
  geoIdx: index("locations_geo_idx").on(table.lat, table.lng),
}));

// ==================== TABELA DE VEÍCULOS ====================

export const vehicles = pgTable("vehicles", {
  id: uuid("id").primaryKey().defaultRandom(),
  driver_id: text("driver_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  plate_number: varchar("plate_number", { length: 20 }).notNull().unique(),
  plate_number_raw: varchar("plate_number_raw", { length: 20 }).notNull(),
  make: varchar("make", { length: 100 }).notNull(),
  model: varchar("model", { length: 100 }).notNull(),
  color: varchar("color", { length: 50 }).notNull(),
  year: integer("year"),
  vehicle_type: vehicleTypeEnum("vehicle_type").notNull(),
  max_passengers: integer("max_passengers").notNull(),
  features: text("features").array().default(sql`'{}'`),
  photo_url: text("photo_url"),
  is_active: boolean("is_active").default(true),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
}, (table) => ({
  driverIdx: index("vehicles_driver_idx").on(table.driver_id),
  plateIdx: index("vehicles_plate_idx").on(table.plate_number),
  activeIdx: index("vehicles_active_idx").on(table.is_active).where(sql`is_active = true`),
  typeIdx: index("vehicles_type_idx").on(table.vehicle_type),
}));

// ==================== SISTEMA HOTELEIRO (CORRIGIDO) ====================

// ✅ TABELA PRINCIPAL DE HOTÉIS (CORRIGIDA)
export const hotels = pgTable("hotels", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  description: text("description"),
  address: text("address").notNull(),
  locality: varchar("locality", { length: 100 }).notNull(),
  province: varchar("province", { length: 100 }).notNull(),
  country: varchar("country", { length: 100 }).default('Moçambique'),
  lat: decimal("lat", { precision: 10, scale: 7 }),
  lng: decimal("lng", { precision: 10, scale: 7 }),
  location_geom: text("location_geom"), // Para PostGIS
  images: text("images").array().default(sql`'{}'`),
  amenities: text("amenities").array().default(sql`'{}'`),
  contact_email: text("contact_email").notNull(),
  contact_phone: text("contact_phone"),
  host_id: text("host_id").references(() => users.id, { onDelete: "set null" }),
  check_in_time: timestamp("check_in_time", { mode: 'string' }).default('14:00:00'),
  check_out_time: timestamp("check_out_time", { mode: 'string' }).default('12:00:00'),
  policies: text("policies"),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0.00"),
  total_reviews: integer("total_reviews").default(0),
  is_active: boolean("is_active").default(true),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
  created_by: text("created_by"),
  updated_by: text("updated_by"),
}, (table) => ({
  nameIdx: index("hotels_name_idx").on(table.name),
  slugIdx: index("hotels_slug_idx").on(table.slug),
  locationIdx: index("hotels_location_idx").on(table.locality, table.province),
  activeIdx: index("hotels_active_idx").on(table.is_active).where(sql`is_active = true`),
}));

// ✅ TABELA DE TIPOS DE QUARTO (CORRIGIDA)
export const room_types = pgTable("room_types", {
  id: uuid("id").primaryKey().defaultRandom(),
  hotel_id: uuid("hotel_id").references(() => hotels.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  base_price: decimal("base_price", { precision: 10, scale: 2 }).notNull(),
  base_price_low: decimal("base_price_low", { precision: 10, scale: 2 }),
  base_price_high: decimal("base_price_high", { precision: 10, scale: 2 }),
  total_units: integer("total_units").notNull().default(1),
  base_occupancy: integer("base_occupancy").notNull().default(2),
  max_occupancy: integer("max_occupancy").notNull().default(2),
  min_nights_default: integer("min_nights_default").default(1),
  extra_adult_price: decimal("extra_adult_price", { precision: 10, scale: 2 }).default("0.00"),
  extra_child_price: decimal("extra_child_price", { precision: 10, scale: 2 }).default("0.00"),
  amenities: text("amenities").array().default(sql`'{}'`),
  images: text("images").array().default(sql`'{}'`),
  is_active: boolean("is_active").default(true),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
}, (table) => ({
  hotelIdx: index("room_types_hotel_idx").on(table.hotel_id),
  activeIdx: index("room_types_active_idx").on(table.is_active).where(sql`is_active = true`),
}));

// ✅ TABELA DE DISPONIBILIDADE (CRÍTICA - CORRIGIDA) - ÚNICA ALTERAÇÃO
export const room_availability = pgTable("room_availability", {
  id: uuid("id").primaryKey().defaultRandom(),
  hotel_id: uuid("hotel_id").references(() => hotels.id, { onDelete: "cascade" }).notNull(),
  room_type_id: uuid("room_type_id").references(() => room_types.id, { onDelete: "cascade" }).notNull(),
  date: timestamp("date", { mode: 'date' }).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  remaining_units: integer("remaining_units").notNull().default(0),
  stop_sell: boolean("stop_sell").default(false),
  min_nights: integer("min_nights").default(1),
  max_stay: integer("max_stay"),
  min_stay: integer("min_stay").default(1),
  max_available_units: integer("max_available_units"),
  blocked_reason: text("blocked_reason"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // ✅ CORREÇÃO: Removido .unique() do índice
  roomTypeDateIdx: index("room_availability_room_type_date_idx").on(table.room_type_id, table.date),
  hotelDateIdx: index("room_availability_hotel_date_idx").on(table.hotel_id, table.date),
  dateIdx: index("room_availability_date_idx").on(table.date),
  // ❌ REMOVIDO: uniqueConstraint: index("room_availability_unique").on(table.room_type_id, table.date).unique(),
}));

// ✅ TABELA DE RESERVAS DE HOTEL (NOVA - CORRIGIDA)
export const hotel_bookings = pgTable("hotel_bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  hotel_id: uuid("hotel_id").references(() => hotels.id, { onDelete: "cascade" }).notNull(),
  room_type_id: uuid("room_type_id").references(() => room_types.id, { onDelete: "cascade" }).notNull(),
  guest_name: text("guest_name").notNull(),
  guest_email: text("guest_email").notNull(),
  guest_phone: text("guest_phone"),
  check_in: timestamp("check_in", { mode: 'date' }).notNull(),
  check_out: timestamp("check_out", { mode: 'date' }).notNull(),
  nights: integer("nights").notNull(),
  units: integer("units").notNull().default(1),
  adults: integer("adults").notNull().default(2),
  children: integer("children").notNull().default(0),
  base_price: decimal("base_price", { precision: 10, scale: 2 }).notNull(),
  extra_charges: decimal("extra_charges", { precision: 10, scale: 2 }).default("0.00"),
  total_price: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  special_requests: text("special_requests"),
  status: statusEnum("status").notNull().default('confirmed'),
  payment_status: statusEnum("payment_status").notNull().default('pending'),
  cancellation_reason: text("cancellation_reason"),
  checked_in_at: timestamp("checked_in_at"),
  checked_out_at: timestamp("checked_out_at"),
  cancelled_at: timestamp("cancelled_at"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
}, (table) => ({
  hotelIdx: index("hotel_bookings_hotel_idx").on(table.hotel_id),
  guestEmailIdx: index("hotel_bookings_guest_email_idx").on(table.guest_email),
  datesIdx: index("hotel_bookings_dates_idx").on(table.check_in, table.check_out),
  statusIdx: index("hotel_bookings_status_idx").on(table.status),
  paymentStatusIdx: index("hotel_bookings_payment_status_idx").on(table.payment_status),
}));

// ✅ TABELA DE TEMPORADAS/PROMOÇÕES
export const hotel_seasons = pgTable("hotel_seasons", {
  id: uuid("id").primaryKey().defaultRandom(),
  hotel_id: uuid("hotel_id").references(() => hotels.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  start_date: timestamp("start_date", { mode: 'date' }).notNull(),
  end_date: timestamp("end_date", { mode: 'date' }).notNull(),
  multiplier: decimal("multiplier", { precision: 5, scale: 2 }).notNull().default("1.00"),
  is_active: boolean("is_active").default(true),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const hotel_promotions = pgTable("hotel_promotions", {
  id: uuid("id").primaryKey().defaultRandom(),
  hotel_id: uuid("hotel_id").references(() => hotels.id, { onDelete: "cascade" }).notNull(),
  room_type_id: uuid("room_type_id").references(() => room_types.id, { onDelete: "cascade" }),
  promo_code: text("promo_code").notNull(),
  discount_percent: integer("discount_percent"),
  discount_amount: decimal("discount_amount", { precision: 10, scale: 2 }),
  start_date: timestamp("start_date", { mode: 'date' }).notNull(),
  end_date: timestamp("end_date", { mode: 'date' }).notNull(),
  max_uses: integer("max_uses"),
  current_uses: integer("current_uses").default(0),
  is_active: boolean("is_active").default(true),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// ==================== RIDES & TRANSPORTATION (MANTIDA FUNCIONAL) ====================

export const rides = pgTable("rides", {
  id: uuid("id").primaryKey().defaultRandom(),
  driverId: text("driverId").references(() => users.id, { onDelete: "cascade" }).notNull(),
  driverName: text("driverName"),
  fromAddress: varchar("fromAddress", { length: 255 }).notNull(),
  toAddress: varchar("toAddress", { length: 255 }).notNull(),
  fromCity: varchar("fromCity", { length: 100 }),
  toCity: varchar("toCity", { length: 100 }),
  fromDistrict: varchar("fromDistrict", { length: 100 }),
  toDistrict: varchar("toDistrict", { length: 100 }),
  fromLocality: varchar("fromLocality", { length: 100 }),
  fromProvince: varchar("fromProvince", { length: 100 }),
  toLocality: varchar("toLocality", { length: 100 }),
  toProvince: varchar("toProvince", { length: 100 }),
  departureDate: timestamp("departureDate").notNull(),
  departureTime: text("departureTime").notNull(),
  availableSeats: integer("availableSeats").notNull(),
  maxPassengers: integer("maxPassengers").default(4),
  pricePerSeat: varchar("pricePerSeat").notNull(),
  vehicleType: varchar("vehicleType", { length: 50 }),
  vehicle_uuid: uuid("vehicle_uuid").references(() => vehicles.id, { onDelete: "set null" }),
  additionalInfo: text("additionalInfo"),
  status: statusEnum("status").default('available'),
  type: rideTypeEnum("type").default("regular"),
  from_geom: text("from_geom"),
  to_geom: text("to_geom"),
  distance_real_km: decimal("distance_real_km", { precision: 10, scale: 2 }),
  polyline: text("polyline"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
}, (table) => ({
  fromLocationIdx: index("rides_from_location_idx").on(table.fromLocality, table.fromProvince),
  toLocationIdx: index("rides_to_location_idx").on(table.toLocality, table.toProvince),
  fromCityIdx: index("rides_from_city_idx").on(table.fromCity),
  toCityIdx: index("rides_to_city_idx").on(table.toCity),
  statusIdx: index("rides_status_idx").on(table.status),
  driverIdx: index("rides_driver_idx").on(table.driverId),
  fromDistrictIdx: index("rides_from_district_idx").on(table.fromDistrict),
  toDistrictIdx: index("rides_to_district_idx").on(table.toDistrict),
  vehicleIdx: index("rides_vehicle_idx").on(table.vehicle_uuid),
}));

// ==================== BOOKINGS & PAYMENTS (CORRIGIDA) ====================

// ✅ TABELA DE BOOKINGS DE RIDES (MANTIDA)
export const bookings = pgTable("bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  rideId: uuid("rideId").references(() => rides.id, { onDelete: "cascade" }),
  passengerId: text("passengerId").references(() => users.id, { onDelete: "cascade" }),
  accommodationId: uuid("accommodationId").references(() => hotels.id, { onDelete: "cascade" }), // ✅ CORREÇÃO: Referencia hotels
  hotelRoomId: uuid("hotelRoomId").references(() => room_types.id, { onDelete: "cascade" }), // ✅ CORREÇÃO: Referencia room_types
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

// ✅ TABELA DE PAGAMENTOS (CRITICAMENTE CORRIGIDA)
export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  bookingId: uuid("bookingId"), // ✅ CORREÇÃO: Referencia bookings.id (para rides) ou hotel_bookings.id
  // ✅ NOVA REFERÊNCIA: Adicionado bookingId para hotel_bookings
  hotel_booking_id: uuid("hotel_booking_id").references(() => hotel_bookings.id, { onDelete: "cascade" }),
  userId: text("userId").references(() => users.id, { onDelete: "cascade" }).notNull(),
  serviceType: serviceTypeEnum("serviceType").notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  platformFee: decimal("platformFee", { precision: 10, scale: 2 }).notNull(),
  discountAmount: decimal("discountAmount", { precision: 10, scale: 2 }).default("0.00"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: paymentMethodEnum("paymentMethod"),
  cardLast4: text("cardLast4"),
  cardBrand: text("cardBrand"),
  mpesaNumber: text("mpesaNumber"),
  paymentStatus: statusEnum("paymentStatus").default('pending'),
  paymentReference: text("paymentReference"),
  paidAt: timestamp("paidAt"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
}, (table) => ({
  // ✅ CORREÇÃO: Adicionado índice para hotel_booking_id
  hotelBookingIdx: index("payments_hotel_booking_idx").on(table.hotel_booking_id),
  bookingIdx: index("payments_booking_idx").on(table.bookingId),
  userIdx: index("payments_user_idx").on(table.userId),
}));

// ==================== TABELAS LEGACY (PARA COMPATIBILIDADE) ====================

// ✅ TABELAS LEGACY - Mantidas para compatibilidade com código existente
export const accommodations = pgTable("accommodations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  hostId: text("hostId").references(() => users.id, { onDelete: "set null" }).notNull(),
  address: text("address").notNull(),
  locality: varchar("locality", { length: 100 }),
  province: varchar("province", { length: 100 }),
  country: varchar("country", { length: 100 }).default('Moçambique'),
  searchRadius: integer("searchRadius").default(50),
  lat: decimal("lat", { precision: 10, scale: 7 }),
  lng: decimal("lng", { precision: 10, scale: 7 }),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0.00"),
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
  locationIdx: index("accommodations_location_idx").on(table.locality, table.province),
  geoIdx: index("accommodations_geo_idx").on(table.lat, table.lng),
  hostIdx: index("accommodations_host_idx").on(table.hostId),
}));

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
  status: statusEnum("status").default("available"),
  bedType: text("bedType"),
  bedCount: integer("bedCount").default(1),
  hasPrivateBathroom: boolean("hasPrivateBathroom").default(true),
  hasAirConditioning: boolean("hasAirConditioning").default(false),
  hasWifi: boolean("hasWifi").default(false),
  hasTV: boolean("hasTV").default(false),
  hasBalcony: boolean("hasBalcony").default(false),
  hasKitchen: boolean("hasKitchen").default(false),
  amenities: text("amenities").array().default(sql`'{}'`),
  isAvailable: boolean("isAvailable").default(true),
  maintenanceUntil: timestamp("maintenanceUntil"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

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
  status: statusEnum("status").default('active'),
  basePrice: decimal("basePrice", { precision: 8, scale: 2 }),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

// ==================== TABELAS RESTANTES (MANTIDAS) ====================

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

export const partnershipProposals = pgTable("partnershipProposals", {
  id: uuid("id").primaryKey().defaultRandom(),
  hotelId: uuid("hotelId").references(() => hotels.id, { onDelete: "cascade" }).notNull(), // ✅ CORREÇÃO: Referencia hotels
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
  rideType: rideTypeEnum("rideType").notNull(),
  minPricePerKm: decimal("minPricePerKm", { precision: 8, scale: 2 }).notNull(),
  maxPricePerKm: decimal("maxPricePerKm", { precision: 8, scale: 2 }).notNull(),
  baseFare: decimal("baseFare", { precision: 8, scale: 2 }).notNull(),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

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
  accommodationId: uuid("accommodationId").references(() => hotels.id, { onDelete: "cascade" }).notNull(), // ✅ CORREÇÃO: Referencia hotels
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

// ==================== ZOD SCHEMAS (ATUALIZADOS) ====================

const userTypeZod = z.enum(["client", "driver", "host", "admin"]);
const statusZod = z.enum(["pending", "active", "available", "confirmed", "cancelled", "completed", "expired", "in_progress", "checked_in", "checked_out", "approved", "rejected", "pending_payment"]);
const serviceTypeZod = z.enum(["ride", "accommodation", "event", "hotel"]);
const partnershipLevelZod = z.enum(["bronze", "silver", "gold", "platinum"]);
const verificationStatusZod = z.enum(["pending", "in_review", "verified", "rejected"]);
const paymentMethodZod = z.enum(["card", "mpesa", "bank", "mobile_money", "bank_transfer", "pending"]);
const rideTypeZod = z.enum(["regular", "premium", "shared", "express"]);
const locationTypeZod = z.enum(["city", "town", "village"]);
const vehicleTypeZod = z.enum(["economy", "comfort", "luxury", "family", "premium", "van", "suv"]);

// ✅ NOVO: Schema para hotéis
export const insertHotelSchema = createInsertSchema(hotels, {
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255),
  contact_email: z.string().email(),
  contact_phone: z.string().optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  is_active: z.boolean().default(true),
}).omit({
  id: true,
  created_at: true,
  updated_at: true,
  created_by: true,
  updated_by: true,
});

// ✅ NOVO: Schema para room_types
export const insertRoomTypeSchema = createInsertSchema(room_types, {
  base_price: z.number().positive(),
  total_units: z.number().int().positive(),
  base_occupancy: z.number().int().positive(),
  max_occupancy: z.number().int().positive(),
  min_nights_default: z.number().int().positive().default(1),
  extra_adult_price: z.number().nonnegative(),
  extra_child_price: z.number().nonnegative(),
  is_active: z.boolean().default(true),
}).omit({
  id: true,
  hotel_id: true,
  created_at: true,
  updated_at: true,
});

// ✅ NOVO: Schema para room_availability
export const insertRoomAvailabilitySchema = createInsertSchema(room_availability, {
  date: z.date(),
  price: z.number().positive(),
  remaining_units: z.number().int().nonnegative(),
  stop_sell: z.boolean().default(false),
  min_nights: z.number().int().positive().default(1),
}).omit({
  id: true,
  hotel_id: true,
  room_type_id: true,
  created_at: true,
  updated_at: true,
});

// ✅ NOVO: Schema para hotel_bookings
export const insertHotelBookingSchema = createInsertSchema(hotel_bookings, {
  guest_name: z.string().min(1),
  guest_email: z.string().email(),
  guest_phone: z.string().optional(),
  check_in: z.date(),
  check_out: z.date(),
  nights: z.number().int().positive(),
  units: z.number().int().positive().default(1),
  adults: z.number().int().positive().default(2),
  children: z.number().int().nonnegative().default(0),
  base_price: z.number().positive(),
  extra_charges: z.number().nonnegative().default(0),
  total_price: z.number().positive(),
  status: statusZod.default('confirmed'),
  payment_status: statusZod.default('pending'),
}).omit({
  id: true,
  hotel_id: true,
  room_type_id: true,
  created_at: true,
  updated_at: true,
});

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

export const insertRideSchema = createInsertSchema(rides, {
  fromAddress: z.string().min(1),
  toAddress: z.string().min(1),
  fromCity: z.string().optional(),
  toCity: z.string().optional(),
  fromDistrict: z.string().optional(),
  toDistrict: z.string().optional(),
  fromLocality: z.string().optional(),
  fromProvince: z.string().optional(),
  toLocality: z.string().optional(),
  toProvince: z.string().optional(),
  departureDate: z.date(),
  availableSeats: z.number().int().min(1).max(10),
  pricePerSeat: z.string().min(1),
  status: statusZod.optional(),
  type: rideTypeZod.optional(),
  vehicleId: z.string().uuid().optional(),
  distance_real_km: z.number().optional(),
  from_geom: z.string().optional(),
  to_geom: z.string().optional(),
  polyline: z.string().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateRideSchema = createInsertSchema(rides, {
  fromAddress: z.string().min(1).optional(),
  toAddress: z.string().min(1).optional(),
  fromCity: z.string().optional(),
  toCity: z.string().optional(),
  fromDistrict: z.string().optional(),
  toDistrict: z.string().optional(),
  fromLocality: z.string().optional(),
  fromProvince: z.string().optional(),
  toLocality: z.string().optional(),
  toProvince: z.string().optional(),
  departureDate: z.date().optional(),
  availableSeats: z.number().int().min(1).max(10).optional(),
  pricePerSeat: z.string().min(1).optional(),
  status: statusZod.optional(),
  type: rideTypeZod.optional(),
  vehicleId: z.string().uuid().optional(),
  distance_real_km: z.number().optional(),
  from_geom: z.string().optional(),
  to_geom: z.string().optional(),
  polyline: z.string().optional(),
}).partial().omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const vehicleSchema = z.object({
  plateNumber: z.string().min(3).max(20),
  make: z.string().min(1).max(100),
  model: z.string().min(1).max(100),
  color: z.string().min(1).max(50),
  year: z.number().min(1900).max(new Date().getFullYear() + 1).optional(),
  vehicleType: vehicleTypeZod,
  maxPassengers: z.number().min(1).max(50),
  features: z.array(z.string()).optional(),
  photoUrl: z.string().url().optional().or(z.literal(''))
});

export const insertVehicleSchema = createInsertSchema(vehicles, {
  plate_number: z.string().min(3).max(20),
  plate_number_raw: z.string().min(3).max(20),
  make: z.string().min(1).max(100),
  model: z.string().min(1).max(100),
  color: z.string().min(1).max(50),
  year: z.number().min(1900).max(new Date().getFullYear() + 1).optional(),
  vehicle_type: vehicleTypeZod,
  max_passengers: z.number().min(1).max(50),
  features: z.array(z.string()).optional(),
  photo_url: z.string().url().optional().or(z.literal('')),
  is_active: z.boolean().default(true),
}).omit({
  id: true,
  driver_id: true,
  created_at: true,
  updated_at: true,
});

export const createRideSchema = z.object({
  fromLocation: z.object({
    name: z.string().min(1),
    lat: z.number(),
    lng: z.number(),
    address: z.string().optional()
  }),
  toLocation: z.object({
    name: z.string().min(1),
    lat: z.number(),
    lng: z.number(),
    address: z.string().optional()
  }),
  departureDate: z.string().datetime(),
  departureTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  pricePerSeat: z.number().min(1),
  maxPassengers: z.number().min(1),
  vehicleId: z.string().uuid(),
  description: z.string().optional(),
  allowNegotiation: z.boolean().default(false),
  allowPickupEnRoute: z.boolean().default(true)
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

// ==================== TIPOS TYPESCRIPT (ATUALIZADOS) ====================

export type User = typeof users.$inferSelect;
export type UserInsert = typeof users.$inferInsert;

export type Ride = typeof rides.$inferSelect;
export type RideInsert = typeof rides.$inferInsert;

export type Vehicle = typeof vehicles.$inferSelect;
export type VehicleInsert = typeof vehicles.$inferInsert;

// ✅ NOVO: Tipos para sistema hoteleiro
export type Hotel = typeof hotels.$inferSelect;
export type HotelInsert = typeof hotels.$inferInsert;

export type RoomType = typeof room_types.$inferSelect;
export type RoomTypeInsert = typeof room_types.$inferInsert;

export type RoomAvailability = typeof room_availability.$inferSelect;
export type RoomAvailabilityInsert = typeof room_availability.$inferInsert;

export type HotelBooking = typeof hotel_bookings.$inferSelect;
export type HotelBookingInsert = typeof hotel_bookings.$inferInsert;

export type Booking = typeof bookings.$inferSelect;
export type BookingInsert = typeof bookings.$inferInsert;

export type MozambiqueLocation = typeof mozambiqueLocations.$inferSelect;
export type MozambiqueLocationInsert = typeof mozambiqueLocations.$inferInsert;

export type NewSystemSetting = typeof systemSettings.$inferInsert;

// ✅ CORREÇÃO: Interface para busca de hotéis (atualizada)
export interface HotelSearchParams {
  location: LocationSuggestion | null;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  searchRadius?: number;
  roomTypeFilter?: string;
  maxPrice?: number;
  requiredAmenities?: string[];
}

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

export interface CreateRideRequest {
  fromLocation: {
    name: string;
    lat: number;
    lng: number;
    address?: string;
  };
  toLocation: {
    name: string;
    lat: number;
    lng: number;
    address?: string;
  };
  departureDate: string;
  departureTime: string;
  pricePerSeat: number;
  maxPassengers: number;
  vehicleId: string;
  description?: string;
  allowNegotiation?: boolean;
  allowPickupEnRoute?: boolean;
}