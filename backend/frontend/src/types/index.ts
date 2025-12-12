// src/types/index.ts
// ✅ ARQUIVO ÚNICO COM TODOS OS TIPOS DO SISTEMA - VERSÃO FINAL CORRIGIDA

// ====================== TIPOS BASE ======================
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  count?: number;
  total?: number;
}

// ====================== HOTEL TYPES ======================
export interface Hotel {
  id: string;
  hotel_id?: string;
  hotel_name?: string;
  name: string;
  slug?: string;
  hotel_slug?: string;

  description?: string;
  address: string;
  locality: string;
  province: string;
  country?: string;

  // ✅ REALIDADE: location é STRING (ex: "-25.969248,32.573179")
  location?: string;
  // Lat/Lng também são strings do backend
  lat?: string;
  lng?: string;

  images?: string[];
  amenities?: string[];

  distance_km?: number;

  min_price_per_night?: number;
  max_price_per_night?: number;
  rating?: string | number;
  total_reviews?: number;

  contact_email: string;
  contact_phone?: string;

  check_in_time?: string;
  check_out_time?: string;
  policies?: string;

  host_id?: string;
  created_by?: string;
  updated_by?: string;

  is_active?: boolean;
  created_at?: string | Date;
  updated_at?: string | Date;

  available_room_types?: RoomType[];
  match_score?: number;
  total_available_rooms?: number;

  price_range?: {
    min: number;
    max: number;
  };
}

export interface RoomType {
  id: string;
  room_type_id?: string;
  room_type_name?: string;
  name: string;

  hotel_id?: string;

  description?: string;
  amenities?: string[];
  images?: string[];

  base_price: number | string;
  total_units: number;

  base_occupancy: number;
  max_occupancy: number;
  min_nights_default?: number; // ✅ ADICIONADO

  size?: string;
  bed_type?: string;
  bed_types?: string[];
  bathroom_type?: string;

  available_units?: number;
  price_per_night?: number;
  total_price?: number;

  extra_adult_price?: number | string;
  extra_child_price?: number | string;
  children_policy?: string;

  is_active?: boolean;
  created_at?: string | Date;
  updated_at?: string | Date;

  availability?: {
    available: boolean;
    available_units: number;
    min_nights?: number;
    max_nights?: number;
  };
}

// ====================== EVENT SPACE TYPES ======================
export interface EventSpace {
  id: string;
  event_space_id?: string;
  hotel_id: string;
  name: string;
  description?: string;
  
  capacity_min: number;
  capacity_max: number;
  size_sqm?: number;
  
  price_per_hour?: number;
  price_per_half_day?: number;
  price_per_day?: number;
  
  space_type: 'conference' | 'banquet' | 'meeting' | 'outdoor' | 'ballroom' | 'theater' | 'other';
  
  amenities?: string[];
  equipment?: string[];
  images?: string[];
  
  is_active?: boolean;
  created_at?: string | Date;
  updated_at?: string | Date;
}

export interface EventSpaceCreateRequest {
  name: string;
  description?: string;
  capacityMin: number;
  capacityMax: number;
  sizeSqm?: number;
  pricePerHour?: number;
  pricePerHalfDay?: number;
  pricePerDay?: number;
  spaceType: 'conference' | 'banquet' | 'meeting' | 'outdoor' | 'ballroom' | 'theater' | 'other';
  amenities?: string[];
  equipment?: string[];
  images?: string[];
  isActive?: boolean;
}

export interface EventSpaceUpdateRequest {
  name?: string;
  description?: string;
  capacityMin?: number;
  capacityMax?: number;
  sizeSqm?: number;
  pricePerHour?: number;
  pricePerHalfDay?: number;
  pricePerDay?: number;
  spaceType?: 'conference' | 'banquet' | 'meeting' | 'outdoor' | 'ballroom' | 'theater' | 'other';
  amenities?: string[];
  equipment?: string[];
  images?: string[];
  isActive?: boolean;
}

export interface EventSpaceListResponse {
  success: boolean;
  data?: EventSpace[];
  eventSpaces?: EventSpace[];
  count?: number;
  total?: number;
  error?: string;
}

// ====================== HOTEL MANAGEMENT ======================
export interface HotelCreateRequest {
  name: string;
  description?: string;
  address: string;
  locality: string;
  province: string;
  lat?: number;
  lng?: number;
  images?: string[];
  amenities?: string[];
  contactEmail: string;
  contactPhone?: string;
  hostId?: string;
  policies?: string;
  checkInTime?: string;
  checkOutTime?: string;
  country?: string;
}

export interface HotelUpdateRequest {
  name?: string;
  description?: string;
  address?: string;
  locality?: string;
  province?: string;
  lat?: number;
  lng?: number;
  images?: string[];
  amenities?: string[];
  contactEmail?: string;
  contactPhone?: string;
  policies?: string;
  checkInTime?: string;
  checkOutTime?: string;
  isActive?: boolean;
  country?: string;
}

export interface RoomTypeCreateRequest {
  name: string;
  description?: string;
  basePrice: number;
  totalUnits: number;
  baseOccupancy?: number;
  maxOccupancy?: number;
  minNightsDefault?: number; 
  extraAdultPrice?: number;
  extraChildPrice?: number;
  amenities?: string[];
  images?: string[];
  isActive?: boolean; // ✅ ADICIONADO
  
  // Campos opcionais para compatibilidade
  size?: string;
  bedType?: string;
  bedTypes?: string[];
  bathroomType?: string;
  availableUnits?: number;
  childrenPolicy?: string;
}

export interface RoomTypeUpdateRequest {
  name?: string;
  description?: string;
  basePrice?: number;
  totalUnits?: number;
  baseOccupancy?: number;
  maxOccupancy?: number;
  minNightsDefault?: number; // ✅ ADICIONADO
  extraAdultPrice?: number;
  extraChildPrice?: number;
  amenities?: string[];
  images?: string[];
  isActive?: boolean; // ✅ ADICIONADO
  
  // Campos opcionais para compatibilidade
  size?: string;
  bedType?: string;
  bedTypes?: string[];
  bathroomType?: string;
  availableUnits?: number;
  childrenPolicy?: string;
}

export interface BulkAvailabilityUpdate {
  roomTypeId: string;
  startDate: string;
  endDate: string;
  price?: number;
  availableUnits?: number;
  stopSell?: boolean;
}

export interface HotelOperationResponse {
  success: boolean;
  hotel?: Hotel;
  hotelId?: string;
  roomType?: RoomType;
  roomTypeId?: string;
  message?: string;
  error?: string;
  details?: any;
}

export interface HotelListResponse {
  success: boolean;
  data?: Hotel[];
  hotels?: Hotel[];
  count?: number;
  total?: number;
  error?: string;
}

export interface RoomTypeListResponse {
  success: boolean;
  data?: RoomType[];
  roomTypes?: RoomType[];
  count?: number;
  total?: number;
  error?: string;
}

// ====================== HOTEL STATISTICS ======================
export interface HotelStatistics {
  total_bookings?: number;
  total_revenue?: number;
  occupancy_rate?: number;
  average_daily_rate?: number;
  revenue_per_available_room?: number;
  upcoming_bookings?: number;
  current_guests?: number;
  available_rooms?: number;
  cancelled_bookings?: number;
  monthly_revenue?: {
    month: string;
    revenue: number;
    bookings: number;
  }[];
  top_room_types?: {
    room_type_id: string;
    room_type_name: string;
    bookings: number;
    revenue: number;
    occupancy: number;
  }[];
}

// ====================== HOTEL PERFORMANCE ======================
export interface HotelPerformance {
  period: {
    start_date: string;
    end_date: string;
  };
  metrics: {
    total_revenue: number;
    total_bookings: number;
    total_cancellations: number;
    average_booking_value: number;
    occupancy_rate: number;
    average_daily_rate: number;
    revenue_per_available_room: number;
  };
  daily_metrics?: {
    date: string;
    revenue: number;
    bookings: number;
    occupancy: number;
    average_rate: number;
  }[];
  room_type_performance?: {
    room_type_id: string;
    room_type_name: string;
    revenue: number;
    bookings: number;
    occupancy: number;
    average_rate: number;
  }[];
}

// ====================== AVAILABILITY ======================
export interface RoomAvailability {
  date: string;
  available_units: number;
  price: number;
  stop_sell: boolean;
  min_nights?: number;
  max_nights?: number;
}

export interface AvailabilityCalendar {
  room_type_id: string;
  room_type_name: string;
  calendar: RoomAvailability[];
}

// ====================== SEARCH TYPES ======================
export interface SearchParams {
  location?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  roomType?: string;
  maxPrice?: number;
  amenities?: string[];
  radius?: number;
  limit?: number;
  page?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface SearchResponse {
  success: boolean;
  data: Hotel[];
  count: number;
  total?: number;
  page?: number;
  limit?: number;
  filters?: any;
  error?: string;
  metadata?: {
    total_count?: number;
    per_page?: number;
    has_more?: boolean;
  };
}

export interface HotelSearchResponse {
  success: boolean;
  data: Hotel[];
  hotels?: Hotel[];
  count: number;
  total?: number;
  page?: number;
  limit?: number;
  filters_applied?: {
    location?: string;
    check_in?: string;
    check_out?: string;
    guests?: number;
    room_type?: string;
    max_price?: number;
    amenities?: string[];
  };
}

// ====================== AVAILABILITY CHECK ======================
export interface AvailabilityCheck {
  is_available?: boolean;
  available?: boolean;
  min_nights_required?: number;
  total_price?: number;
  nightly_prices?: NightlyPrice[];
  available_units?: number;
  message?: string;
  validation_errors?: string[];
  data?: any;
  
  // ✅ CORREÇÃO: ADICIONAR PROPRIEDADE AUSENTE
  availability?: Array<{
    date: string;
    available_units: number;
    price: number | string;
    stop_sell?: boolean;
  }>;
}

export interface NightlyPrice {
  date: string;
  base_price: number;
  season_multiplier?: number;
  promotion_discount?: number;
  final_price: number;
  min_nights?: number;
  stop_sell?: boolean;
}

// ====================== BOOKING TYPES ======================
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'checked_in' | 'checked_out';
export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed';

export interface HotelBookingRequest {
  hotelId: string;
  roomTypeId: string;
  checkIn: string;
  checkOut: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  adults?: number;
  children?: number;
  units?: number;
  specialRequests?: string;
  promoCode?: string;
}

export interface HotelBookingData {
  // Campos camelCase
  bookingId?: string;
  hotelId?: string;
  roomTypeId?: string;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  checkIn?: string;
  checkOut?: string;
  nights?: number;
  units?: number;
  adults?: number;
  children?: number;
  basePrice?: number;
  extraCharges?: number;
  totalPrice?: number;
  specialRequests?: string;
  status?: BookingStatus;
  paymentStatus?: PaymentStatus;
  promoCode?: string;
  createdAt?: string;
  updatedAt?: string;
  confirmationCode?: string;
  
  // Campos snake_case para compatibilidade
  booking_id?: string;
  hotel_id?: string;
  room_type_id?: string;
  guest_name?: string;
  guest_email?: string;
  guest_phone?: string;
  check_in?: string;
  check_out?: string;
  base_price?: number;
  extra_charges?: number;
  total_price?: number;
  special_requests?: string;
  payment_status?: string;
  promo_code?: string;
  created_at?: string;
  updated_at?: string;
  confirmation_code?: string;
}

export interface HotelBookingResponse {
  success: boolean;
  booking?: HotelBookingData;
  bookingId?: string;
  booking_id?: string;
  message?: string;
  error?: string;
  totalPrice?: number;
  total_price?: number;
  confirmationCode?: string;
  confirmation_code?: string;
}

export interface MyHotelBookingsResponse {
  success: boolean;
  bookings?: HotelBookingData[];
  count?: number;
  error?: string;
}

// ====================== RIDE TYPES ======================
export interface Ride {
  ride_id: string;
  driver_id: string;
  driver_name: string;
  driver_rating: number;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_type: string;
  vehicle_plate: string;
  vehicle_color: string;
  max_passengers: number;
  from_city: string;
  to_city: string;
  from_lat: number;
  from_lng: number;
  to_lat: number;
  to_lng: number;
  departuredate: string;
  availableseats: number;
  priceperseat: number;
  distance_from_city_km: number;
  distance_to_city_km: number;
  
  match_type?: string;
  direction_score?: number;
  from_province?: string;
  to_province?: string;
  
  // Aliases para compatibilidade
  id: string;
  driverId: string;
  driverName: string;
  fromLocation: string;
  toLocation: string;
  fromAddress: string;
  toAddress: string;
  fromCity: string;
  toCity: string;
  departureDate: string;
  departureTime: string;
  price: number;
  pricePerSeat: number;
  availableSeats: number;
  maxPassengers: number;
  currentPassengers: number;
  vehicle: string;
  vehicleType: string;
  vehicleMake: string;
  vehicleModel: string;
  vehiclePlate: string;
  vehicleColor: string;
  status: string;
  type: string;
  
  vehicleInfo?: {
    make: string;
    model: string;
    type: string;
    typeDisplay: string;
    typeIcon: string;
    plate: string;
    color: string;
    maxPassengers: number;
  };
}

export interface RideSearchParams {
  from?: string;
  to?: string;
  date?: string;
  passengers?: number;
  minPrice?: number;
  maxPrice?: number;
  vehicleType?: string;
  smartSearch?: boolean;
  maxDistance?: number;
  radiusKm?: number;
}

export interface MatchStats {
  exact_match?: number;
  same_segment?: number;
  same_direction?: number;
  potential?: number;
  traditional?: number;
  total: number;
  smart_matches?: number;
  drivers_with_ratings?: number;
  average_driver_rating?: number;
  vehicle_types?: Record<string, number>;
  match_types?: Record<string, number>;
  total_smart_matches?: number;
  average_direction_score?: number;
}

export interface RideSearchResponse {
  success: boolean;
  rides: Ride[];
  matchStats?: MatchStats;
  searchParams?: {
    from: string;
    to: string;
    date?: string;
    passengers?: number;
    smartSearch: boolean;
    appliedFilters?: any;
    radiusKm?: number;
    searchMethod?: string;
    functionUsed?: string;
  };
  total?: number;
  data?: {
    rides: Ride[];
    stats?: MatchStats;
    searchParams?: any;
    smart_search?: boolean;
  };
  smart_search?: boolean;
}

export interface RideBookingRequest {
  rideId: string;
  passengerId: string;
  seatsBooked: number;
  totalPrice: number;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  rideDetails?: any;
  type?: 'ride';
}

// ====================== CHAT TYPES ======================
export interface ChatMessage {
  id: string;
  threadId: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  isRead: boolean;
  type?: 'text' | 'image' | 'file';
}

export interface ChatThread {
  id: string;
  participants: Array<{
    id: string;
    name: string;
    avatar?: string;
  }>;
  lastMessage?: ChatMessage;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SendMessageRequest {
  message: string;
  threadId?: string;
  type?: 'text' | 'image' | 'file';
}

export interface SendMessageResponse {
  success: boolean;
  message?: ChatMessage;
  error?: string;
}

// ====================== NOTIFICATION TYPES ======================
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'booking' | 'message' | 'system' | 'promotion';
  isRead: boolean;
  data?: any;
  createdAt: string;
}

export interface NotificationsResponse {
  success: boolean;
  notifications: Notification[];
  unreadCount: number;
  error?: string;
}

// ====================== UPLOAD TYPES ======================
export interface UploadResponse {
  success: boolean;
  url?: string;
  fileName?: string;
  fileSize?: number;
  error?: string;
}

// ====================== USER & AUTH TYPES ======================
export interface User {
  id: string;
  uid?: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  role?: 'user' | 'host' | 'admin' | 'driver';
  isVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role?: 'user' | 'host' | 'driver';
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
  message?: string;
}

// ====================== UTILITY TYPES ======================
export interface GeoLocation {
  lat: number;
  lng: number;
  address?: string;
  locality?: string;
  province?: string;
  country?: string;
}

export interface PriceRange {
  min: number;
  max: number;
  currency?: string;
}

export interface HotelFilters {
  location?: string;
  check_in?: string;
  check_out?: string;
  guests?: number;
  room_type?: string;
  price_range?: PriceRange;
  amenities?: string[];
  rating?: number;
  distance?: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export interface HotelBookingSummary {
  hotel_id: string;
  hotel_name: string;
  room_type_id: string;
  room_type_name: string;
  total_bookings: number;
  total_revenue: number;
  average_stay_length: number;
  cancellation_rate: number;
}

// ====================== API RESPONSE TYPES ======================
export interface HotelByIdResponse extends ApiResponse<Hotel> {}
export interface RoomTypesResponse extends ApiResponse<RoomType[]> {}
export interface AvailabilityResponse extends ApiResponse<AvailabilityCheck> {}

// ====================== FUNÇÕES UTILITÁRIAS ======================
/**
 * Extrai lat/lng como números do hotel (se disponível)
 */
export function getHotelCoordinates(hotel: Hotel): { lat: number; lng: number } | null {
  // Primeiro tenta da string location
  if (typeof hotel.location === 'string' && hotel.location) {
    const [latStr, lngStr] = hotel.location.split(',');
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    if (!isNaN(lat) && !isNaN(lng)) {
      return { lat, lng };
    }
  }
  
  // Tenta dos campos lat/lng individuais (são strings)
  if (typeof hotel.lat === 'string' && typeof hotel.lng === 'string') {
    const lat = parseFloat(hotel.lat);
    const lng = parseFloat(hotel.lng);
    if (!isNaN(lat) && !isNaN(lng)) {
      return { lat, lng };
    }
  }
  
  return null;
}

/**
 * Formata location string para exibição (se disponível)
 */
export function formatHotelLocation(hotel: Hotel): string {
  if (typeof hotel.location === 'string' && hotel.location) {
    const coords = getHotelCoordinates(hotel);
    if (coords) {
      return `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
    }
    return hotel.location;
  }
  
  if (hotel.lat && hotel.lng) {
    const latStr = typeof hotel.lat === 'string' ? hotel.lat : String(hotel.lat);
    const lngStr = typeof hotel.lng === 'string' ? hotel.lng : String(hotel.lng);
    return `${latStr}, ${lngStr}`;
  }
  
  return 'Localização não disponível';
}

// ====================== EXPORT ALL TYPES ======================
// ✅ Exportação completa - agora você importa tudo de '@/types'
export type {
  Hotel as IHotel,
  RoomType as IRoomType,
  HotelCreateRequest as IHotelCreateRequest,
  HotelUpdateRequest as IHotelUpdateRequest,
  RoomTypeCreateRequest as IRoomTypeCreateRequest,
  RoomTypeUpdateRequest as IRoomTypeUpdateRequest,
  BulkAvailabilityUpdate as IBulkAvailabilityUpdate,
  HotelOperationResponse as IHotelOperationResponse,
  HotelListResponse as IHotelListResponse,
  RoomTypeListResponse as IRoomTypeListResponse,
  HotelStatistics as IHotelStatistics,
  HotelPerformance as IHotelPerformance,
  RoomAvailability as IRoomAvailability,
  AvailabilityCalendar as IAvailabilityCalendar,
  HotelSearchResponse as IHotelSearchResponse,
  SearchParams as ISearchParams,
  SearchResponse as ISearchResponse,
  AvailabilityCheck as IAvailabilityCheck,
  NightlyPrice as INightlyPrice,
  BookingStatus as IBookingStatus,
  PaymentStatus as IPaymentStatus,
  HotelBookingRequest as IHotelBookingRequest,
  HotelBookingData as IHotelBookingData,
  HotelBookingResponse as IHotelBookingResponse,
  MyHotelBookingsResponse as IMyHotelBookingsResponse,
  Ride as IRide,
  RideSearchParams as IRideSearchParams,
  MatchStats as IMatchStats,
  RideSearchResponse as IRideSearchResponse,
  RideBookingRequest as IRideBookingRequest,
  ChatMessage as IChatMessage,
  ChatThread as IChatThread,
  SendMessageRequest as ISendMessageRequest,
  SendMessageResponse as ISendMessageResponse,
  Notification as INotification,
  NotificationsResponse as INotificationsResponse,
  UploadResponse as IUploadResponse,
  User as IUser,
  LoginRequest as ILoginRequest,
  RegisterRequest as IRegisterRequest,
  AuthResponse as IAuthResponse,
  GeoLocation as IGeoLocation,
  PriceRange as IPriceRange,
  HotelFilters as IHotelFilters,
  PaginationParams as IPaginationParams,
  PaginatedResponse as IPaginatedResponse,
  HotelBookingSummary as IHotelBookingSummary,
  ApiResponse as IApiResponse,
  HotelByIdResponse as IHotelByIdResponse,
  RoomTypesResponse as IRoomTypesResponse,
  AvailabilityResponse as IAvailabilityResponse
};