// TIPO UNIFICADO COMPLETO PARA ACCOMMODATION
export interface Accommodation {
  id: string;
  hostId: string;
  name: string;
  type: string;
  address: string;
  description: string;
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  amenities: string[];
  images: string[];
  isAvailable: boolean;
  rating?: number;
  reviewCount?: number;
  unavailableDates?: string[];
  
  // ✅ PROPRIEDADES ADICIONAIS PARA COMPATIBILIDADE COMPLETA
  lat?: number;
  lng?: number;
  distanceFromCenter?: number;
  offerDriverDiscounts?: boolean;
  driverDiscountRate?: number;
  minimumDriverLevel?: string;
  partnershipBadgeVisible?: boolean;
  enablePartnerships?: boolean;
  accommodationDiscount?: number;
  transportDiscount?: number;
  checkInTime?: string;
  checkOutTime?: string;
  policies?: string;
  contactEmail?: string;
  contactPhone?: string;
  roomTypes?: any[];
  
  // ✅ PROPRIEDADE CRÍTICA QUE ESTAVA FALTANDO:
  pricePerNight?: number; // ⚠️ ESSA ERA A QUE ESTAVA CAUSANDO O ERRO!
  
  // Campos de data
  createdAt: string;
  updatedAt: string;
}

export interface CreateAccommodationData {
  name: string;
  type: string;
  address: string;
  description: string;
  maxGuests?: number;
  bedrooms?: number;
  bathrooms?: number;
  amenities?: string[];
  images?: string[];
  isAvailable?: boolean;
  // Campos opcionais para compatibilidade
  pricePerNight?: number;
  lat?: number;
  lng?: number;
}