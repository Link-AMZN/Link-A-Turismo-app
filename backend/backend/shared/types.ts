/**
 * SHARED TYPES - Link-A Platform
 * Centralized type definitions for consistency across the application
 */

import { Request } from 'express';
import { z } from 'zod';

// ===== CORE ENUMS & CONSTANTS =====

export const USER_ROLES = ['client', 'driver', 'hotel_manager', 'admin'] as const;
export const VERIFICATION_STATUSES = ['pending', 'in_review', 'verified', 'rejected'] as const;
export const BOOKING_STATUSES = [
  'pending',
  'confirmed',
  'cancelled',
  'completed',
  'in_progress',
  'approved',
  'rejected',
  'available', // ✅ adicionado
] as const;
export const BOOKING_TYPES = ['ride', 'accommodation', 'event'] as const;
export const SERVICE_TYPES = ['ride', 'stay', 'event'] as const;
export const DOCUMENT_TYPES = ['identity', 'profile_photo', 'vehicle_registration', 'driving_license', 'vehicle_insurance'] as const;
export const PAYMENT_METHODS = ['card', 'mpesa', 'bank', 'mobile_money', 'bank_transfer'] as const;
export const PAYMENT_STATUSES = ['pending', 'completed', 'failed', 'refunded'] as const;
export const MESSAGE_TYPES = ['text', 'image', 'file', 'system'] as const;
export const NOTIFICATION_TYPES = ['booking', 'message', 'payment', 'verification', 'system'] as const;
export const RIDE_STATUSES = [
  'pending',
  'active',
  'completed',
  'cancelled',
  'available', // ✅ adicionado
] as const;

// ===== TYPE UNIONS =====

export type UserRole = typeof USER_ROLES[number];
export type VerificationStatus = typeof VERIFICATION_STATUSES[number];
export type BookingStatus = typeof BOOKING_STATUSES[number];
export type BookingType = typeof BOOKING_TYPES[number];
export type ServiceType = typeof SERVICE_TYPES[number];
export type DocumentType = typeof DOCUMENT_TYPES[number];
export type PaymentMethod = typeof PAYMENT_METHODS[number];
export type PaymentStatus = typeof PAYMENT_STATUSES[number];
export type MessageType = typeof MESSAGE_TYPES[number];
export type NotificationType = typeof NOTIFICATION_TYPES[number];
export type RideStatus = typeof RIDE_STATUSES[number];

// ===== BASE INTERFACES =====

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt?: Date | null;
}

export interface TimestampedEntity extends BaseEntity {
  updatedAt: Date;
}

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

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface SearchFilters {
  [key: string]: any;
}

// ===== AUTHENTICATION TYPES =====

export interface AuthenticatedUser {
  id: string;          // Database user ID
  uid: string;         // Firebase UID
  email?: string;
  roles?: UserRole[];
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  [key: string]: any;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

// ===== USER TYPES =====

export interface UserProfile extends BaseEntity {
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  phone: string | null;
  
  userType: UserRole;
  roles: UserRole[];
  canOfferServices: boolean;
  isVerified: boolean;
  isBlocked?: boolean;
  
  profileImageUrl: string | null;
  avatar: string | null;
  rating: number;
  totalReviews: number;
  
  verificationStatus: VerificationStatus;
  verificationDate: Date | null;
  verificationNotes: string | null;
  verificationBadge: string | null;
  badgeEarnedDate: Date | null;
  
  identityDocumentUrl: string | null;
  identityDocumentType: string | null;
  profilePhotoUrl: string | null;
  documentNumber: string | null;
  dateOfBirth: Date | null;
  
  registrationCompleted: boolean;

  claims?: {
    sub?: string;
    email?: string;
    [key: string]: any;
  };
}

export interface CreateUserData {
  email?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  phone?: string;
  userType?: UserRole;
  firebaseUid: string;
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  phone?: string;
  profileImageUrl?: string;
  verificationStatus?: VerificationStatus;
  verificationNotes?: string;
  canOfferServices?: boolean;
  roles?: UserRole[];
  isBlocked?: boolean;
}

// ===== CHAT TYPES =====

export interface ChatRoom extends BaseEntity {
  participantOneId: string;
  participantTwoId: string;
  bookingId?: string;
  serviceType?: string;
  lastMessage?: string;
  lastMessageAt?: Date;
  isActive: boolean;
  participants?: UserProfile[];
  messages?: ChatMessage[];
}

export interface ChatMessage extends BaseEntity {
  chatRoomId: string;
  fromUserId: string;
  toUserId: string;
  message: string;
  messageType: MessageType;
  bookingId?: string;
  isRead: boolean;
  sender?: UserProfile;
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

export interface SimpleChatRoom {
  id: string;
  fromUserId: string;
  toUserId: string;
  bookingId?: string;
  lastMessage?: string;
  lastMessageAt?: Date;
  isActive: boolean;
}

// ===== API RESPONSE TYPES =====

export interface ApiError {
  success: false;
  message: string;
  code: string;
  details?: any;
  timestamp: string;
}

export interface ApiResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

// ===== BOOKING TYPES =====

export interface Booking extends BaseEntity {
  rideId?: string;
  passengerId?: string;
  seatsBooked: number;
  totalPrice: number; // ✅ CORRIGIDO: de string para number
  status?: BookingStatus; // ✅ CORRIGIDO: usando enum
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

// ===== RIDE TYPES =====

export interface Ride extends BaseEntity {
  driverId: string;
  fromLocation: string;
  toLocation: string;
  departureDate: Date;
  departureTime: string;
  availableSeats: number;
  pricePerSeat: number; // ✅ CORRIGIDO: de string para number
  vehicleType?: string;
  additionalInfo?: string;
  status: RideStatus; // ✅ CORRIGIDO: usando enum
  driver?: UserProfile;
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

// ===== ACCOMMODATION TYPES =====

export interface Accommodation extends BaseEntity {
  name: string;
  type: string;
  hostId: string;
  address: string;
  lat?: number; // ✅ CORRIGIDO: de string para number
  lng?: number; // ✅ CORRIGIDO: de string para number
  pricePerNight: number; // ✅ CORRIGIDO: de string para number
  rating?: number; // ✅ CORRIGIDO: de string para number
  reviewCount: number;
  images: string[];
  amenities: string[];
  description?: string;
  distanceFromCenter?: string;
  isAvailable: boolean;
  offerDriverDiscounts: boolean;
  driverDiscountRate: number; // ✅ CORRIGIDO: de string para number
  minimumDriverLevel: number; // ✅ CORRIGIDO: de string para number
  partnershipBadgeVisible: boolean;
  host?: UserProfile;
}

// ===== VALIDATION SCHEMAS =====

export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const createUserSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().min(2).max(50).optional(),
  lastName: z.string().min(2).max(50).optional(),
  fullName: z.string().min(2).max(100).optional(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
  userType: z.enum(USER_ROLES).default('client'),
  firebaseUid: z.string().min(1),
});

export const updateUserSchema = z.object({
  firstName: z.string().min(2).max(50).optional(),
  lastName: z.string().min(2).max(50).optional(),
  fullName: z.string().min(2).max(100).optional(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
  profileImageUrl: z.string().url().optional(),
  verificationStatus: z.enum(VERIFICATION_STATUSES).optional(),
  verificationNotes: z.string().max(500).optional(),
  canOfferServices: z.boolean().optional(),
  roles: z.array(z.enum(USER_ROLES)).optional(),
  isBlocked: z.boolean().optional(),
});

export const messageDataSchema = z.object({
  message: z.string().min(1).max(1000),
  messageType: z.enum(MESSAGE_TYPES).default('text'),
});

// ✅ ATUALIZADO: Schema para Ride agora inclui 'available'
export const createRideSchema = z.object({
  driverId: z.string(),
  fromLocation: z.string().min(1, "Local de partida é obrigatório"),
  toLocation: z.string().min(1, "Local de destino é obrigatório"),
  departureDate: z.date(),
  departureTime: z.string().min(1, "Horário de partida é obrigatório"),
  availableSeats: z.number().int().positive("Número de assentos deve ser positivo"),
  pricePerSeat: z.number().positive("Preço por assento deve ser positivo"),
  vehicleType: z.string().optional(),
  additionalInfo: z.string().optional(),
  status: z.enum(RIDE_STATUSES).optional(), // ✅ inclui 'available'
});

export const updateRideSchema = createRideSchema.partial();

// ✅ ATUALIZADO: Schema para Booking agora inclui 'available'
export const createBookingSchema = z.object({
  rideId: z.string().optional(),
  accommodationId: z.string().optional(),
  eventId: z.string().optional(),
  type: z.enum(BOOKING_TYPES),
  passengerId: z.string(),
  seatsBooked: z.number().int().positive().optional(),
  totalPrice: z.number().positive("Preço total deve ser positivo"),
  guestInfo: z.object({
    name: z.string().min(1, "Nome é obrigatório"),
    email: z.string().email("Email inválido"),
    phone: z.string().min(1, "Telefone é obrigatório"),
  }),
  details: z.object({
    passengers: z.number().int().positive().optional(),
    checkIn: z.string().optional(),
    checkOut: z.string().optional(),
    totalAmount: z.number().positive("Valor total deve ser positivo"),
  }),
  status: z.enum(BOOKING_STATUSES).optional(), // ✅ inclui 'available'
});

export const updateBookingSchema = createBookingSchema.partial();

// ✅ ADICIONADO: Schema para Accommodation
export const createAccommodationSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  type: z.string().min(1, "Tipo é obrigatório"),
  hostId: z.string(),
  address: z.string().min(1, "Endereço é obrigatório"),
  lat: z.number().optional(),
  lng: z.number().optional(),
  pricePerNight: z.number().positive("Preço por noite deve ser positivo"),
  rating: z.number().min(0).max(5).optional(),
  reviewCount: z.number().int().nonnegative().default(0),
  images: z.array(z.string().url()).default([]),
  amenities: z.array(z.string()).default([]),
  description: z.string().optional(),
  distanceFromCenter: z.string().optional(),
  isAvailable: z.boolean().default(true),
  offerDriverDiscounts: z.boolean().default(false),
  driverDiscountRate: z.number().min(0).max(100).default(0),
  minimumDriverLevel: z.number().int().nonnegative().default(0),
  partnershipBadgeVisible: z.boolean().default(false),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type MessageDataInput = z.infer<typeof messageDataSchema>;
export type CreateRideInput = z.infer<typeof createRideSchema>;
export type UpdateRideInput = z.infer<typeof updateRideSchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;
export type CreateAccommodationInput = z.infer<typeof createAccommodationSchema>;

// ===== HELPER FUNCTIONS =====

export function isAuthenticatedUser(user: any): user is AuthenticatedUser {
  return user && 
         typeof user.id === 'string' && 
         typeof user.uid === 'string';
}

export function assertAuthenticated(user: any): asserts user is AuthenticatedUser {
  if (!isAuthenticatedUser(user)) {
    throw new Error('User not authenticated');
  }
}

export function ensureAuthenticated(user: any): AuthenticatedUser {
  assertAuthenticated(user);
  return user;
}

export function isAdmin(user: AuthenticatedUser): boolean {
  return user.roles?.includes('admin') || false;
}

export function hasRole(user: AuthenticatedUser, role: UserRole): boolean {
  return user.roles?.includes(role) || false;
}

export function hasAnyRole(user: AuthenticatedUser, roles: UserRole[]): boolean {
  return roles.some(role => user.roles?.includes(role)) || false;
}

export function isAuthenticatedRequest(req: Request): req is AuthenticatedRequest {
  return 'user' in req;
}

export function getAuthenticatedUser(req: Request): AuthenticatedUser | null {
  return isAuthenticatedRequest(req) && req.user ? req.user : null;
}

export function requireAuthenticatedUser(req: Request): AuthenticatedUser {
  const user = getAuthenticatedUser(req);
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}

// ✅ ATUALIZADO: Funções de validação para enums agora incluem 'available'
export function isValidBookingStatus(status: string): status is BookingStatus {
  return BOOKING_STATUSES.includes(status as BookingStatus);
}

export function isValidRideStatus(status: string): status is RideStatus {
  return RIDE_STATUSES.includes(status as RideStatus);
}

export function isValidUserRole(role: string): role is UserRole {
  return USER_ROLES.includes(role as UserRole);
}

// ✅ ADICIONADO: Funções de conversão para garantir tipos numéricos
export function ensureNumber(value: any): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

export function ensurePositiveNumber(value: any, defaultValue: number = 0): number {
  const num = ensureNumber(value);
  return num >= 0 ? num : defaultValue;
}