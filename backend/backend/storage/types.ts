// Storage Types and Interfaces for Link-A Platform
// ✅ ATUALIZADO: Importa tipos principais de ../src/shared/types
import { 
  UserRole, 
  VerificationStatus, 
  BookingStatus, 
  BookingType, 
  ServiceType, 
  DocumentType,
  PaymentMethod, 
  PaymentStatus, 
  MessageType, 
  NotificationType,
  BaseEntity,
  UserProfile,
  CreateUserData as SharedCreateUserData,
  UpdateUserData as SharedUpdateUserData,
  ApiError,
  ApiResponse
} from '../src/shared/types';

// Legacy types for backward compatibility
export type VehicleDocType = 'registration' | 'license' | 'insurance';

// ===== BASE INTERFACES =====
// ✅ REMOVIDAS duplicações - usar BaseEntity importado

export interface TimePeriod {
  startDate: Date;
  endDate: Date;
}

export interface DateRange {
  from: Date;
  to: Date;
}

export interface GeoLocation {
  lat: number;
  lng: number;
  address?: string;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SearchFilters {
  [key: string]: any;
}

// ===== USER & AUTH INTERFACES =====
// ✅ REMOVIDA duplicação - usar UserProfile importado
export interface User extends UserProfile {
  // Campos específicos de storage se necessário
}

// ✅ REMOVIDAS duplicações - usar tipos importados
export interface CreateUserData extends SharedCreateUserData {}
export interface UpdateUserData extends SharedUpdateUserData {}

export interface DriverDocuments {
  vehicleRegistrationUrl?: string;
  drivingLicenseUrl?: string;
  vehicleInsuranceUrl?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  vehiclePlate?: string;
  vehicleColor?: string;
}

export interface DriverStats {
  totalRides: number;
  completedRides: number;
  totalEarnings: number;
  averageRating: number;
  totalReviews: number;
}

// ===== RIDE INTERFACES =====
export interface Ride extends BaseEntity {
  driverId: string;
  fromLocation: string;
  toLocation: string;
  departureDate: Date;
  departureTime: string;
  availableSeats: number;
  pricePerSeat: string;
  vehicleType?: string;
  additionalInfo?: string;
  status: string;
  driver?: User;
}

export interface CreateRideData {
  driverId: string;
  fromLocation: string;
  toLocation: string;
  departureDate: Date;
  departureTime: string;
  availableSeats: number;
  pricePerSeat: number;
  vehicleType?: string;
  additionalInfo?: string;
}

export interface UpdateRideData {
  fromLocation?: string;
  toLocation?: string;
  departureDate?: Date;
  departureTime?: string;
  availableSeats?: number;
  pricePerSeat?: number;
  vehicleType?: string;
  additionalInfo?: string;
  status?: string;
}

export interface RideSearchCriteria {
  fromLocation?: string;
  toLocation?: string;
  departureDate?: Date;
  minSeats?: number;
  maxPrice?: number;
  driverId?: string;
}

// ===== ACCOMMODATION INTERFACES =====
export interface Accommodation extends BaseEntity {
  name: string;
  type: string;
  hostId: string;
  address: string;
  lat?: string;
  lng?: string;
  pricePerNight: string;
  rating?: string;
  reviewCount: number;
  images: string[];
  amenities: string[];
  description?: string;
  distanceFromCenter?: string;
  isAvailable: boolean;
  offerDriverDiscounts: boolean;
  driverDiscountRate: string;
  minimumDriverLevel: string;
  partnershipBadgeVisible: boolean;
  host?: User;
  // ✅ ADICIONADO: Para suportar filtro de hóspedes
  maxGuests?: number;
}

export interface CreateAccommodationData {
  name: string;
  type: string;
  hostId: string;
  address: string;
  lat?: number;
  lng?: number;
  pricePerNight: number;
  images?: string[];
  amenities?: string[];
  description?: string;
  offerDriverDiscounts?: boolean;
  driverDiscountRate?: number;
  // ✅ ADICIONADO: Para suportar filtro de hóspedes
  maxGuests?: number;
}

export interface UpdateAccommodationData {
  name?: string;
  type?: string;
  address?: string;
  pricePerNight?: number;
  images?: string[];
  amenities?: string[];
  description?: string;
  isAvailable?: boolean;
  offerDriverDiscounts?: boolean;
  driverDiscountRate?: number;
  partnershipBadgeVisible?: boolean;
  // ✅ ADICIONADO: Para suportar atualização de hóspedes
  maxGuests?: number;
}

export interface AccommodationSearchCriteria {
  location?: string;
  checkIn?: Date;
  checkOut?: Date;
  maxPrice?: number;
  type?: string;
  amenities?: string[];
  hostId?: string;
  // ✅ ADICIONADAS: Para suportar os filtros do controller
  isAvailable?: boolean;
  guests?: number;
  minPrice?: number;
}

export interface PartnershipProgram {
  offerDriverDiscounts: boolean;
  driverDiscountRate: number;
  minimumDriverLevel: string;
  partnershipBadgeVisible: boolean;
}

// ===== BOOKING INTERFACES =====
export interface Booking extends BaseEntity {
  id: string;
  rideId?: string;
  passengerId?: string;
  seatsBooked: number;
  totalPrice: string;
  status?: string;
  accommodationId?: string;
  eventId?: string;
  type: BookingType;
  guestInfo: {
    name: string;
    email: string;
    phone: string;
  };
  details: {
    passengers?: number;
    checkIn?: string;
    checkOut?: string;
    totalAmount: number;
  };
  clientId?: string;
  providerId?: string;
  serviceName?: string;
}

export interface CreateBookingData {
  rideId?: string;
  accommodationId?: string;
  eventId?: string;
  type: BookingType;
  passengerId: string;
  seatsBooked?: number;
  totalPrice: number;
  guestInfo: {
    name: string;
    email: string;
    phone: string;
  };
  details: {
    passengers?: number;
    checkIn?: string;
    checkOut?: string;
    totalAmount: number;
  };
}

export interface BookingStats {
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
  averageBookingValue: number;
  bookingsByType: { [key in BookingType]: number };
}

// ===== PAYMENT & BILLING INTERFACES =====
export interface Payment extends BaseEntity {
  bookingId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method: PaymentMethod;
  transactionId?: string;
  gatewayResponse?: any;
  processedAt?: Date;
}

export interface Fee extends BaseEntity {
  bookingId: string;
  type: 'platform_commission' | 'payment_processing' | 'service_charge';
  amount: number; // ✅ CORRIGIDO: mudado de string para number
  percentage: number;
  description?: string;
}

export interface PaymentData {
  method: PaymentMethod;
  amount: number;
  currency?: string;
  description?: string;
  details?: any;
}

export interface FeeData {
  type: string;
  amount: number;
  percentage: number;
  description?: string;
}

export interface Earnings {
  totalEarnings: number;
  platformFees: number;
  netEarnings: number;
  period: TimePeriod;
}

export interface RevenueReport {
  totalRevenue: number;
  platformFees: number;
  netRevenue: number;
  transactionCount: number;
  period: TimePeriod;
}

export interface Transaction {
  id: string;
  type: 'payment' | 'refund' | 'payout' | 'fee';
  amount: number;
  currency: string;
  status: string;
  userId: string;
  bookingId?: string;
  createdAt: Date;
}

export interface TransactionFilters {
  userId?: string;
  type?: string;
  status?: string;
  dateRange?: DateRange;
  minAmount?: number;
  maxAmount?: number;
}

// ===== CHAT INTERFACES =====
export interface ChatRoom extends BaseEntity {
  bookingId: string;
  fromUserId: string;
  toUserId: string;
  lastMessage?: string;
  lastMessageAt?: Date;
  isActive: boolean;
  participants?: User[];
  messages?: Message[];
}

export interface Message extends BaseEntity {
  chatRoomId: string;
  senderId: string;
  message: string;
  messageType: MessageType;
  isRead: boolean;
  sender?: User;
}

export interface MessageData {
  message: string;
  messageType?: MessageType;
}

export interface SupportTicket extends BaseEntity {
  userId: string;
  issue: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedAgentId?: string;
}

// ===== RATING INTERFACES =====
export interface Rating extends BaseEntity {
  fromUserId: string;
  toUserId: string;
  rating: number;
  comment?: string;
  serviceType: ServiceType;
  bookingId?: string;
  serviceId?: string;
}

export interface CreateRatingData {
  fromUserId: string;
  toUserId: string;
  rating: number;
  comment?: string;
  serviceType: ServiceType;
  bookingId?: string;
  serviceId?: string;
}

export interface ModerationAction {
  action: 'approve' | 'reject' | 'flag' | 'remove';
  reason?: string;
  moderatorId: string;
}

// ===== FILE & DOCUMENT INTERFACES =====
export interface Document extends BaseEntity {
  userId: string;
  type: DocumentType;
  url: string;
  filename: string;
  size: number;
  mimeType: string;
  verified: boolean;
}

export interface FileUploadResult {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
}

// ===== NOTIFICATION INTERFACES =====
export interface Notification extends BaseEntity {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  read: boolean;
  actionUrl?: string;
}

export interface CreateNotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  actionUrl?: string;
}

// ===== ANALYTICS INTERFACES =====
export interface AnalyticsData {
  userMetrics: {
    totalUsers: number;
    activeUsers: number;
    newRegistrations: number;
    verifiedUsers: number;
  };
  businessMetrics: {
    totalRides: number;
    totalAccommodations: number;
    totalBookings: number;
    totalRevenue: number;
  };
  performanceMetrics: {
    averageResponseTime: number;
    systemUptime: number;
    errorRate: number;
  };
}

// ===== ERROR INTERFACES =====
export interface StorageError extends Error {
  code: string;
  details?: any;
}

export interface ValidationError extends StorageError {
  field: string;
  value: any;
}