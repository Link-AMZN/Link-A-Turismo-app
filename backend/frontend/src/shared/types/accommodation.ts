// ✅ TIPO UNIFICADO COMPLETO PARA ACCOMMODATION - FONTE ÚNICA
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
  pricePerNight?: number;
  
  // Campos de data
  createdAt: string;
  updatedAt: string;
  
  // ✅ NOVOS CAMPOS PARA BUSCA INTELIGENTE (POSTGIS)
  match_type?: number;
  distance?: number;
  hasAvailableRooms?: boolean;
  availableRoomsList?: any[];
  rooms?: any[];
  locality?: string;
  province?: string;
  
  // ✅ CAMPOS ADICIONAIS DA PRIMEIRA VERSÃO PARA COMPATIBILIDADE
  location?: string;
  price?: number;
  availableRooms?: number;
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

// ✅ INTERFACES ADICIONAIS PARA BUSCA E SUGESTÕES
export interface SearchFilters {
  address?: string;
  location?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  isAvailable?: boolean;
}

export interface LocationSuggestion {
  id: string;
  name: string;
  province: string;
  district: string;
  type: string;
  lat: number;
  lng: number;
  relevance_rank?: number; // ✅ CORRIGIDO: tornado opcional para compatibilidade
}