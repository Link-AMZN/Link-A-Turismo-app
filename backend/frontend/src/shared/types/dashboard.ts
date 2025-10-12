// src/shared/types/dashboard.ts

// Tipos baseados no schema do banco de dados - ATUALIZADO COM TODAS AS COLUNAS
export interface Accommodation {
  id: string;
  name: string;
  type: string;
  hostId: string;
  address: string;
  lat?: number;
  lng?: number;
  rating?: number; // ✅ CORRIGIDO: Agora é opcional
  reviewCount?: number; // ✅ CORRIGIDO: Agora é opcional
  images: string[];
  amenities: string[];
  description?: string;
  distanceFromCenter?: number;
  
  // ✅ PROPRIEDADES CONFIRMADAS NO BANCO DE DADOS:
  isAvailable?: boolean;
  offerDriverDiscounts?: boolean;
  driverDiscountRate?: number;
  minimumDriverLevel?: string;
  partnershipBadgeVisible?: boolean;
  enablePartnerships?: boolean;
  accommodationDiscount?: number;
  transportDiscount?: number;
  maxGuests?: number;
  checkInTime?: string;
  checkOutTime?: string;
  policies?: string;
  contactEmail?: string;
  contactPhone?: string;
  
  // ✅ NOVA PROPRIEDADE ADICIONADA:
  roomTypes?: RoomType[];
  
  createdAt: string;
  updatedAt: string;
}

// ✅ NOVA INTERFACE: RoomType
export interface RoomType {
  id: string;
  accommodationId: string;
  name: string;
  type: string;
  pricePerNight: number;
  description?: string;
  maxOccupancy?: number;
  bedType?: string;
  bedCount?: number;
  amenities?: string[];
  images?: string[];
  isAvailable?: boolean;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface HotelRoom {
  id: string;
  accommodationId: string;
  roomNumber: string;
  roomType: string;
  pricePerNight: number; // ✅ Em Metical (MT)
  maxOccupancy: number;
  status: string;
  amenities: string[];
  images: string[];
  isAvailable: boolean;
}

export interface Booking {
  id: string;
  accommodationId: string;
  passengerId: string;
  type: 'ride' | 'hotel';
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'in_progress';
  totalPrice: number; // ✅ Em Metical (MT)
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  checkInDate?: string;
  checkOutDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PartnershipProposal {
  id: string;
  hotelId: string;
  title: string;
  description: string;
  proposalType: string;
  basePaymentMzn: number; // ✅ Já estava em Metical
  maxDriversNeeded: number;
  currentApplicants: number;
  status: string;
  startDate: string;
  endDate: string;
}

export interface PartnershipApplication {
  id: string;
  proposalId: string;
  driverId: string;
  status: string;
  applicationDate: string;
}

// Tipos específicos para o dashboard baseados na função getHotelDashboardData
export interface DashboardStats {
  occupancy: {
    today: number;
    currentRooms: number;
    totalRooms: number;
  };
  revenue: {
    today: number; // ✅ Em Metical (MT)
    changePercent: string;
  };
  checkins: {
    today: number;
    pending: number;
  };
  rating: {
    average: number;
    totalReviews: number;
  };
  todayCheckins: Array<{
    id: string;
    guestName: string;
    roomType: string;
    nights: number;
    checkInTime: string;
    status: string;
    price: number; // ✅ Em Metical (MT)
  }>;
  weeklyOccupancy: Array<{
    day: string;
    date: string;
    occupancy: number;
    rooms: string;
  }>;
  pendingTasks: Array<{
    id: string;
    type: string;
    description: string;
    detail: string;
    priority: string;
  }>;
}

export interface HotelDashboardData {
  stats: DashboardStats;
  accommodations?: Accommodation[];
  bookings?: Booking[];
  partnershipProposals?: PartnershipProposal[];
}

// Tipos para as ofertas ativas (baseado nos erros do dashboard.tsx)
export interface Offer {
  id: string;
  roomType: string;
  date: string;
  originalPrice: number; // ✅ Em Metical (MT)
  discountPrice: number; // ✅ Em Metical (MT)
  driverCommission: number; // ✅ Em Metical (MT)
  availableRooms: number;
  requests: number;
}

export interface Hotel {
  id: string;
  name: string;
  route: string;
  rating: number;
  commission: number; // ✅ Em Metical (MT) - valor percentual ou absoluto
  clientsBrought: number;
  lastMonth: number; // ✅ Em Metical (MT) - faturamento último mês
  activeOffers?: Offer[];
}

// Interface HotelPartner para os parceiros motoristas
export interface HotelPartner {
  id: string;
  name: string;
  route: string;
  rating: number;
  commission: number; // ✅ Em Metical (MT)
  clientsBrought: number;
  lastMonth: number; // ✅ Em Metical (MT)
}

// Tipo principal para o estado do dashboard
export interface DashboardData {
  activeOffers: Offer[];
  hotels?: HotelPartner[];
  stats?: DashboardStats;
  accommodations?: Accommodation[];
  bookings?: Booking[];
  partnershipProposals?: PartnershipProposal[];
}

// Tipos de usuário e resposta API
export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
  isVerified: boolean;
  profileImageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  timestamp?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  total?: number;
  totalPages?: number;
}

export interface SearchParams {
  query?: string;
  filters?: Record<string, any>;
  sort?: string;
  order?: 'asc' | 'desc';
}

// ✅ NOVO: Configuração de moeda para Metical
export interface CurrencyConfig {
  symbol: 'MT';
  code: 'MZN';
  decimalPlaces: 2;
  thousandsSeparator: '.';
  decimalSeparator: ',';
  locale: 'pt-MZ';
}

// ✅ NOVO: Tipo para valores monetários com metadados
export interface MonetaryValue {
  amount: number;
  currency: 'MZN';
  formatted: string;
}

// ✅ NOVO: Utilitários de formatação (para usar nos componentes)
export const formatMetical = (value: number): string => {
  return new Intl.NumberFormat('pt-MZ', {
    style: 'currency',
    currency: 'MZN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

// ✅ NOVO: Converter string para número (para inputs)
export const parseMeticalInput = (value: string): number => {
  if (!value) return 0;
  
  // Remove tudo exceto números, vírgula e ponto
  const cleanValue = value.replace(/[^\d,.-]/g, '');
  
  // Substitui vírgula por ponto para parseFloat
  const numericValue = cleanValue.replace(',', '.');
  
  const result = parseFloat(numericValue);
  return isNaN(result) ? 0 : Math.max(0, result);
};

// ✅ NOVO: Validar input monetário
export const isValidMoneyInput = (value: string): boolean => {
  const regex = /^\d*([,.]\d{0,2})?$/;
  return regex.test(value);
};

// ✅ NOVO: Formatar para input (sem símbolo MT)
export const formatForInput = (value: number): string => {
  if (!value || value === 0) return '';
  return value.toFixed(2).replace('.', ',');
};