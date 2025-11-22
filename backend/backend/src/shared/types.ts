/**
 * SHARED TYPES - Link-A Platform
 * Centralized type definitions for consistency across the application
 */

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

// ===== VALIDATION SCHEMAS =====

export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const dateRangeSchema = z.object({
  from: z.date(),
  to: z.date(),
}).refine(data => data.from <= data.to, {
  message: "Data de início deve ser anterior à data de fim",
});

export const geoLocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  address: z.string().optional(),
});

// ===== USER TYPES =====

export interface UserProfile extends BaseEntity {
  // Core info
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  phone: string | null;
  
  // System data
  userType: UserRole;
  roles: UserRole[];
  canOfferServices: boolean;
  isVerified: boolean;
  
  // Profile data
  profileImageUrl: string | null;
  avatar: string | null;
  rating: number;
  totalReviews: number;
  
  // Verification data
  verificationStatus: VerificationStatus;
  verificationDate: Date | null;
  verificationNotes: string | null;
  verificationBadge: string | null;
  badgeEarnedDate: Date | null;
  
  // Documents
  identityDocumentUrl: string | null;
  identityDocumentType: string | null;
  profilePhotoUrl: string | null;
  documentNumber: string | null;
  dateOfBirth: Date | null;
  
  // Status
  registrationCompleted: boolean;
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

// ===== VALIDATION SCHEMAS FOR USER =====

export const createUserSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().min(2).max(50).optional(),
  lastName: z.string().min(2).max(50).optional(),
  fullName: z.string().min(2).max(100).optional(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(), // E.164 format
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

// ✅ ADICIONADO: Schemas para validação de status
export const bookingStatusSchema = z.enum(BOOKING_STATUSES);
export const rideStatusSchema = z.enum(RIDE_STATUSES);

// ✅ ADICIONADO: Funções helper para validação de status
export function isValidBookingStatus(status: string): status is BookingStatus {
  return BOOKING_STATUSES.includes(status as BookingStatus);
}

export function isValidRideStatus(status: string): status is RideStatus {
  return RIDE_STATUSES.includes(status as RideStatus);
}

export function isValidUserRole(role: string): role is UserRole {
  return USER_ROLES.includes(role as UserRole);
}

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;

// ✅ CORRIGIDO: Exportação correta de todos os tipos
export * from "../../shared/types";