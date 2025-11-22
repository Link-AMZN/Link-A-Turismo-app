import { auth } from '@/shared/lib/firebaseConfig';
import { Booking, RideBookingRequest, HotelBookingRequest } from '@/shared/types/booking';

/**
 * Interfaces para tipagem
 */
interface Hotel {
  id: string;
  userId: string;
  name: string;
  description: string;
  address: string;
  contactEmail: string;
  contactPhone: string;
  amenities: string[];
  images: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface RoomType {
  id: string;
  hotelId: string;
  name: string;
  type: string;
  description?: string;
  pricePerNight: number;
  totalRooms: number;
  availableRooms: number;
  maxGuests: number;
  images?: string[];
  amenities?: string[];
  size?: number;
  bedType?: string;
  hasBalcony: boolean;
  hasSeaView: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface HotelStats {
  totalBookings: number;
  monthlyRevenue: number;
  averageRating: number;
  averageOccupancy: number;
  totalEvents: number;
  upcomingEvents: number;
  activePartnerships: number;
  partnershipEarnings: number;
  totalRoomTypes: number;
  totalRooms: number;
  availableRooms: number;
}

interface HotelEvent {
  id: string;
  title: string;
  description: string;
  eventType: string;
  venue: string;
  startDate: string;
  endDate: string;
  ticketPrice: number;
  maxTickets: number;
  ticketsSold: number;
  status: string;
  organizerId?: string;
}

interface DriverPartnership {
  id: string;
  driver: string;
  route: string;
  commission: number;
  clientsBrought: number;
  totalEarnings: number;
  lastMonth: number;
  rating: number;
  joinedDate: string;
  status: string;
}

interface ChatMessage {
  id: number;
  sender: string;
  message: string;
  time: string;
  isHotel: boolean;
}

// ✅ CORREÇÃO: Interfaces para Rides com tipagem consistente
export interface Ride {
  id: string;
  driverId: string;
  fromLocation: string;
  toLocation: string;
  fromAddress?: string;
  toAddress?: string;
  fromProvince?: string;
  toProvince?: string;
  departureDate: string;
  departureTime: string;
  price: number;
  pricePerSeat?: number;
  availableSeats: number;
  maxPassengers: number;
  vehicleType?: string;
  vehicleInfo?: string;
  vehicleFeatures?: string[];
  driver?: {
    firstName: string;
    lastName: string;
    rating?: number; // ✅ CORREÇÃO: Apenas number
    isVerified?: boolean;
  };
  estimatedDuration?: number;
  estimatedDistance?: number;
  allowNegotiation?: boolean;
  isVerifiedDriver?: boolean;
  status: string;
  type?: string;
  currentPassengers?: number;
  driverName?: string;
  driverRating?: number; // ✅ CORREÇÃO: Apenas number | undefined
  description?: string;
  vehiclePhoto?: string | null;
  availableIn?: number;
  isRoundTrip?: boolean;
  allowPickupEnRoute?: boolean;
  
  // ✅ CORREÇÃO: Campos de matching inteligente - nomes do backend
  match_type?: string;
  route_compatibility?: number;
  match_description?: string;
  
  // ✅ CORREÇÃO: Campos para compatibilidade (camelCase para frontend)
  matchScore?: number;
  matchType?: string;
  matchDescription?: string;
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
  maxDistance?: number; // ✅ NOVO: Parâmetro para busca inteligente
}

// ✅ CORREÇÃO: Interface para MatchStats alinhada com backend
export interface MatchStats {
  exact_match?: number;
  same_segment?: number;
  same_direction?: number;
  same_origin?: number;
  same_destination?: number;
  potential?: number;
  traditional?: number;
  total: number;
  smart_matches?: number; // ✅ NOVO: Campo específico para busca inteligente
}

export interface RideSearchResponse {
  success: boolean;
  rides: Ride[];
  matchStats?: MatchStats; // ✅ CORREÇÃO: Tipo específico
  searchParams?: {
    from: string;
    to: string;
    date?: string;
    passengers?: number;
    smartSearch: boolean;
    appliedFilters?: any; // ✅ CORREÇÃO: Tornado opcional
    radiusKm?: number; // ✅ NOVO: Raio usado na busca
    searchMethod?: string; // ✅ NOVO: Método de busca usado
  };
  total?: number;
  data?: {
    rides: Ride[];
    stats?: MatchStats;
    searchParams?: any;
    smart_search?: boolean; // ✅ NOVO: Indicador de busca inteligente
  };
  smart_search?: boolean; // ✅ NOVO: Indicador global de busca inteligente
}

// ✅ FUNÇÃO AUXILIAR: Obter label de localização para UI
export function getRideLocation(ride: Ride, type: 'from' | 'to'): string {
  if (type === 'from') {
    return ride.fromLocation || ride.fromProvince || '';
  }
  return ride.toLocation || ride.toProvince || '';
}

// ✅ FUNÇÃO AUXILIAR: Obter route compatibility para UI
export function getRouteCompatibility(ride: Ride): number | undefined {
  // ✅ CORREÇÃO: Usar route_compatibility do backend ou matchScore do frontend
  return ride.route_compatibility !== undefined ? ride.route_compatibility : ride.matchScore;
}

// ✅ FUNÇÃO AUXILIAR: Obter match type para UI
export function getMatchType(ride: Ride): string | undefined {
  // ✅ CORREÇÃO: Usar match_type do backend ou matchType do frontend
  return ride.match_type !== undefined ? ride.match_type : ride.matchType;
}

// ✅ FUNÇÃO AUXILIAR: Obter match description para UI
export function getMatchDescription(ride: Ride): string | undefined {
  // ✅ CORREÇÃO: Usar match_description do backend ou matchDescription do frontend
  return ride.match_description !== undefined ? ride.match_description : ride.matchDescription;
}

// ✅ CORREÇÃO: Função para determinar se é uma busca inteligente
export function isSmartSearch(ride: Ride): boolean {
  return !!(ride.match_type || ride.route_compatibility || ride.match_description);
}

// ✅ CORREÇÃO: Função para obter badge de compatibilidade
export function getCompatibilityBadge(ride: Ride): { label: string; color: string } {
  const compatibility = getRouteCompatibility(ride);
  
  if (!compatibility) {
    return { label: 'Tradicional', color: 'gray' };
  }
  
  if (compatibility >= 90) {
    return { label: 'Perfeito', color: 'green' };
  } else if (compatibility >= 75) {
    return { label: 'Excelente', color: 'blue' };
  } else if (compatibility >= 60) {
    return { label: 'Bom', color: 'yellow' };
  } else {
    return { label: 'Compatível', color: 'orange' };
  }
}

// ✅ CORREÇÃO: Exportar funções de normalização para reutilização
export function normalizeRide(backendRide: any): Ride {
  const normalized: Ride = {
    id: backendRide.id || backendRide.ride_id || '',
    driverId: backendRide.driverId || backendRide.driver_id || '',
    fromLocation: backendRide.fromLocation || backendRide.from_address || backendRide.from_city || '',
    toLocation: backendRide.toLocation || backendRide.to_address || backendRide.to_city || '',
    fromAddress: backendRide.fromAddress || backendRide.from_address || backendRide.fromLocation || '',
    toAddress: backendRide.toAddress || backendRide.to_address || backendRide.toLocation || '',
    fromProvince: backendRide.fromProvince || backendRide.from_province,
    toProvince: backendRide.toProvince || backendRide.to_province,
    departureDate: backendRide.departureDate || backendRide.departure_date || '',
    departureTime: backendRide.departureTime || backendRide.departure_time || '08:00',
    // ✅ CORREÇÃO: Usar nullish coalescing para evitar duplicidade
    price: Number(backendRide.price ?? backendRide.pricePerSeat ?? backendRide.price_per_seat ?? 0),
    pricePerSeat: Number(backendRide.pricePerSeat ?? backendRide.price_per_seat ?? backendRide.price ?? 0),
    availableSeats: backendRide.availableSeats || backendRide.available_seats || 0,
    maxPassengers: backendRide.maxPassengers || backendRide.max_passengers || backendRide.availableSeats || backendRide.available_seats || 4,
    vehicleType: backendRide.vehicleType || backendRide.vehicle_type || 'car',
    status: backendRide.status || 'active',
    // ✅ CORREÇÃO: Normalizar driverRating para number
    driverRating: backendRide.driverRating ? Number(backendRide.driverRating) : undefined,
  };

  // ✅ CORREÇÃO: Campos opcionais - verificar explicitamente por undefined
  if (backendRide.vehicleInfo !== undefined) normalized.vehicleInfo = backendRide.vehicleInfo;
  if (backendRide.vehicleFeatures !== undefined) normalized.vehicleFeatures = backendRide.vehicleFeatures;
  if (backendRide.description !== undefined) normalized.description = backendRide.description;
  if (backendRide.estimatedDuration !== undefined) normalized.estimatedDuration = backendRide.estimatedDuration;
  if (backendRide.estimatedDistance !== undefined) normalized.estimatedDistance = backendRide.estimatedDistance;
  if (backendRide.currentPassengers !== undefined) normalized.currentPassengers = backendRide.currentPassengers;
  if (backendRide.type !== undefined) normalized.type = backendRide.type;
  if (backendRide.vehiclePhoto !== undefined) normalized.vehiclePhoto = backendRide.vehiclePhoto;
  if (backendRide.availableIn !== undefined) normalized.availableIn = backendRide.availableIn;
  if (backendRide.isRoundTrip !== undefined) normalized.isRoundTrip = backendRide.isRoundTrip;
  if (backendRide.allowPickupEnRoute !== undefined) normalized.allowPickupEnRoute = backendRide.allowPickupEnRoute;
  if (backendRide.allowNegotiation !== undefined) normalized.allowNegotiation = backendRide.allowNegotiation;
  if (backendRide.isVerifiedDriver !== undefined) normalized.isVerifiedDriver = backendRide.isVerifiedDriver;

  // ✅ CORREÇÃO: Campos de matching do backend (snake_case)
  if (backendRide.match_type !== undefined) normalized.match_type = backendRide.match_type;
  if (backendRide.route_compatibility !== undefined) normalized.route_compatibility = backendRide.route_compatibility;
  if (backendRide.match_description !== undefined) normalized.match_description = backendRide.match_description;

  // ✅ CORREÇÃO: Campos de compatibilidade para frontend (camelCase)
  // Mapear snake_case do backend para camelCase do frontend
  normalized.matchType = backendRide.match_type !== undefined ? backendRide.match_type : backendRide.matchType;
  normalized.matchScore = backendRide.route_compatibility !== undefined ? backendRide.route_compatibility : backendRide.matchScore;
  normalized.matchDescription = backendRide.match_description !== undefined ? backendRide.match_description : backendRide.matchDescription;

  // ✅ CORREÇÃO: Informações do driver
  if (backendRide.driver) {
    normalized.driver = {
      firstName: backendRide.driver.firstName || '',
      lastName: backendRide.driver.lastName || '',
      // ✅ CORREÇÃO: Normalizar rating para number
      rating: backendRide.driver.rating ? Number(backendRide.driver.rating) : undefined,
      isVerified: backendRide.driver.isVerified || false,
    };
    normalized.driverName = `${normalized.driver.firstName} ${normalized.driver.lastName}`.trim();
    normalized.isVerifiedDriver = normalized.driver.isVerified;
    // ✅ CORREÇÃO: Usar rating do driver se disponível
    if (normalized.driver.rating !== undefined) {
      normalized.driverRating = normalized.driver.rating;
    }
  }

  // ✅ CORREÇÃO: Campos específicos do driver_name do backend
  if (backendRide.driver_name && !normalized.driverName) {
    normalized.driverName = backendRide.driver_name;
  }

  return normalized;
}

// ✅ CORREÇÃO: Exportar função de normalização de lista
export function normalizeRides(backendRides: any[]): Ride[] {
  return (backendRides || []).map(normalizeRide);
}

// ✅ CORREÇÃO: Criar MatchStats padrão
export function createDefaultMatchStats(): MatchStats {
  return {
    exact_match: 0,
    same_segment: 0,
    same_direction: 0,
    same_origin: 0,
    same_destination: 0,
    potential: 0,
    traditional: 0,
    smart_matches: 0,
    total: 0
  };
}

/**
 * Serviço central de API para todas as apps
 * Gerencia autenticação Firebase e comunicação com Railway backend
 */
class ApiService {
  private baseURL: string;

  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    console.log('🏗️ API Base URL:', this.baseURL);
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    try {
      const token = await auth.currentUser?.getIdToken() || localStorage.getItem('authToken');
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      } else {
        console.debug('No auth token available');
      }
    } catch (error) {
      console.debug('Error fetching auth token:', error);
    }
    return headers;
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: unknown
  ): Promise<T> {
    const headers = await this.getAuthHeaders();
    const url = `${this.baseURL}${endpoint}`;
    const config: RequestInit = { method, headers, credentials: 'include' };
    if (data && method !== 'GET') config.body = JSON.stringify(data);
    
    console.log(`🔧 API Request: ${method} ${url}`, data || '');
    
    try {
      const response = await fetch(url, config);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${response.status}: ${errorText || 'Request failed'}`);
      }
      const result = await response.json() as T;
      console.log(`✅ API Response: ${method} ${endpoint}`, result);
      return result;
    } catch (error) {
      console.error(`❌ API Error: ${method} ${endpoint}`, error);
      throw error;
    }
  }

  // ===== RIDES API ATUALIZADA =====
  async searchRides(params: RideSearchParams): Promise<RideSearchResponse> {
    try {
      // ✅ PRIMEIRO TENTA BUSCA INTELIGENTE SE smartSearch=true
      if (params.smartSearch !== false) {
        try {
          const searchParams = new URLSearchParams();
          if (params.from) searchParams.append('from', params.from);
          if (params.to) searchParams.append('to', params.to);
          if (params.passengers) searchParams.append('passengers', params.passengers.toString());
          if (params.date) searchParams.append('date', params.date);
          // ✅ NOVO: Adicionar maxDistance para busca inteligente (padrão 100km)
          const maxDistance = params.maxDistance || 100;
          searchParams.append('maxDistance', maxDistance.toString());
          
          console.log(`🧠 FRONTEND: Buscando rides inteligentes: ${params.from} → ${params.to} (raio: ${maxDistance}km)`);
          
          const response = await this.request<any>('GET', `/api/rides/smart/search?${searchParams.toString()}`);
          
          // ✅ NORMALIZAR RESPOSTA DO BACKEND
          if (response.success && response.data) {
            const searchParamsResponse = {
              from: params.from || '',
              to: params.to || '',
              date: params.date,
              passengers: params.passengers,
              smartSearch: true,
              radiusKm: maxDistance,
              searchMethod: response.data.searchParams?.searchMethod || 'smart_final_direct',
              appliedFilters: params
            };

            return {
              success: true,
              rides: normalizeRides(response.data.rides),
              matchStats: response.data.stats || createDefaultMatchStats(),
              searchParams: searchParamsResponse,
              total: response.data.rides?.length || 0,
              data: response.data,
              smart_search: response.data.smart_search || true // ✅ NOVO: Indicador de busca inteligente
            };
          }
        } catch (smartError) {
          console.warn('❌ FRONTEND: Busca inteligente falhou, usando busca tradicional:', smartError);
        }
      }
      
      // ✅ FALLBACK PARA BUSCA TRADICIONAL
      const searchParams = new URLSearchParams();
      // ✅ CORREÇÃO: Usar parâmetros que o backend espera
      if (params.from) searchParams.append('from', params.from);
      if (params.to) searchParams.append('to', params.to);
      if (params.date) searchParams.append('date', params.date);
      if (params.passengers) searchParams.append('passengers', params.passengers.toString());
      if (params.minPrice) searchParams.append('minPrice', params.minPrice.toString());
      if (params.maxPrice) searchParams.append('maxPrice', params.maxPrice.toString());
      if (params.vehicleType) searchParams.append('vehicleType', params.vehicleType);

      console.log(`🔍 FRONTEND: Buscando rides tradicionais: ${params.from} → ${params.to}`);
      
      // ✅✅✅ CORREÇÃO CRÍTICA: Mudar de /api/rides/search para /api/rides/smart/search
      const response = await this.request<any>('GET', `/api/rides/smart/search?${searchParams.toString()}`);
      
      const searchParamsResponse = {
        from: params.from || '',
        to: params.to || '',
        date: params.date,
        passengers: params.passengers,
        smartSearch: false,
        appliedFilters: params
      };

      return {
        success: true,
        rides: normalizeRides(response.rides || response.data?.rides),
        matchStats: response.matchStats || response.data?.stats || createDefaultMatchStats(),
        searchParams: searchParamsResponse,
        total: response.total || response.data?.total || 0,
        smart_search: response.smart_search || response.data?.smart_search || false // ✅ NOVO: Indicador explícito
      };
      
    } catch (error) {
      console.error('❌ FRONTEND: Erro na busca de rides:', error);
      throw error;
    }
  }

  // ✅ NOVO: Busca inteligente específica (para uso direto)
  async searchSmartRides(params: {
    from: string;
    to: string;
    date?: string;
    passengers?: number;
    maxDistance?: number;
  }): Promise<RideSearchResponse> {
    const searchParams = new URLSearchParams();
    searchParams.append('from', params.from);
    searchParams.append('to', params.to);
    if (params.date) searchParams.append('date', params.date);
    if (params.passengers) searchParams.append('passengers', params.passengers.toString());
    const maxDistance = params.maxDistance || 100;
    searchParams.append('maxDistance', maxDistance.toString());

    console.log(`🧠 FRONTEND: Busca SMART específica: ${params.from} → ${params.to} (${maxDistance}km)`);

    const response = await this.request<any>('GET', `/api/rides/smart/search?${searchParams.toString()}`);
    
    if (response.success && response.data) {
      const searchParamsResponse = {
        from: params.from,
        to: params.to,
        date: params.date,
        passengers: params.passengers,
        smartSearch: true,
        radiusKm: maxDistance,
        searchMethod: response.data.searchParams?.searchMethod || 'smart_final_direct',
        appliedFilters: params
      };

      return {
        success: true,
        rides: normalizeRides(response.data.rides),
        matchStats: response.data.stats || createDefaultMatchStats(),
        searchParams: searchParamsResponse,
        total: response.data.rides?.length || 0,
        data: response.data,
        smart_search: true
      };
    }

    throw new Error('Busca inteligente falhou');
  }

  // ✅ NOVO: Busca universal inteligente
  async searchUniversalRides(params: {
    from?: string;
    to?: string;
    lat?: number;
    lng?: number;
    toLat?: number;
    toLng?: number;
    radiusKm?: number;
    maxResults?: number;
  }): Promise<RideSearchResponse> {
    const searchParams = new URLSearchParams();
    if (params.from) searchParams.append('from', params.from);
    if (params.to) searchParams.append('to', params.to);
    if (params.lat) searchParams.append('lat', params.lat.toString());
    if (params.lng) searchParams.append('lng', params.lng.toString());
    if (params.toLat) searchParams.append('toLat', params.toLat.toString());
    if (params.toLng) searchParams.append('toLng', params.toLng.toString());
    const radiusKm = params.radiusKm || 100;
    searchParams.append('radiusKm', radiusKm.toString());
    if (params.maxResults) searchParams.append('maxResults', params.maxResults.toString());

    console.log(`🌍 FRONTEND: Busca universal inteligente`, params);

    const response = await this.request<any>('GET', `/api/rides/search/universal?${searchParams.toString()}`);
    
    if (response.success && response.data) {
      const searchParamsResponse = {
        from: params.from || '',
        to: params.to || '',
        smartSearch: true,
        radiusKm: radiusKm,
        appliedFilters: params
      };

      return {
        success: true,
        rides: normalizeRides(response.data.rides),
        matchStats: response.data.stats || createDefaultMatchStats(),
        searchParams: searchParamsResponse,
        total: response.data.rides?.length || 0,
        data: response.data,
        smart_search: response.data.smart_search || true
      };
    }

    throw new Error('Busca universal falhou');
  }

  async createRide(rideData: {
    fromLocation: string;
    toLocation: string;
    departureDate: string;
    departureTime: string;
    pricePerSeat: number;
    availableSeats: number;
    vehicleType?: string;
    additionalInfo?: string;
    fromProvince?: string;
    toProvince?: string;
  }): Promise<any> {
    return this.request('POST', '/api/rides', rideData);
  }

  // 🆕 Obter detalhes de um ride específico
  async getRideDetails(rideId: string): Promise<{ success: boolean; data: { ride: Ride } }> {
    const response = await this.request<any>('GET', `/api/rides/${rideId}`);
    // ✅ CORREÇÃO: Normalizar a resposta
    if (response.success) {
      return {
        success: true,
        data: {
          ride: normalizeRide(response.data?.ride || response.ride || response)
        }
      };
    }
    return response;
  }

  // 🆕 Buscar rides próximos
  async getNearbyRides(location: string, radius: number = 50, passengers: number = 1): Promise<RideSearchResponse> {
    const searchParams = new URLSearchParams();
    searchParams.append('location', location);
    searchParams.append('radius', radius.toString());
    searchParams.append('passengers', passengers.toString());

    const response = await this.request<any>('GET', `/api/rides/nearby?${searchParams.toString()}`);
    
    const searchParamsResponse = {
      from: location,
      to: location,
      passengers,
      smartSearch: false,
      appliedFilters: { location, radius, passengers }
    };

    return {
      success: true,
      rides: normalizeRides(response.data?.rides || response.rides),
      matchStats: response.data?.stats || createDefaultMatchStats(),
      searchParams: searchParamsResponse,
      total: response.data?.total || response.total || 0,
      smart_search: response.data?.smart_search || false
    };
  }

  // 🆕 Solicitar reserva de viagem
  async requestRide(rideId: string, passengers: number, pickupLocation?: string, notes?: string): Promise<{ 
    success: boolean; 
    message: string; 
    booking: any;
    rideDetails: any;
  }> {
    return this.request('POST', '/api/bookings', {
      rideId,
      passengers,
      pickupLocation,
      notes,
      type: 'ride' // ✅ CORREÇÃO: Especificar tipo de booking
    });
  }

  // ===== BOOKINGS API =====
  async bookRide(bookingData: RideBookingRequest): Promise<{ success: boolean; data: { booking: Booking } }> {
    return this.request('POST', '/api/bookings', bookingData);
  }

  async bookHotel(bookingData: HotelBookingRequest): Promise<{ success: boolean; data: { booking: Booking } }> {
    return this.request('POST', '/api/bookings', bookingData);
  }

  async createBooking(
    type: 'ride' | 'hotel',
    bookingData: any
  ): Promise<{ success: boolean; data?: { booking: Booking }; error?: string }> {
    try {
      const user = auth.currentUser;
      if (!user) {
        return { 
          success: false, 
          error: 'Usuário não autenticado' 
        };
      }

      let payload: any;

      if (type === 'ride') {
        payload = {
          rideId: bookingData.rideId,
          passengerId: user.uid, // ✅ CORREÇÃO: Verificar se backend usa passengerId ou userId
          seatsBooked: bookingData.passengers, // ✅ CORREÇÃO: Verificar se backend usa seatsBooked ou passengers
          totalPrice: bookingData.totalAmount,
          guestName: bookingData.guestInfo?.name,
          guestEmail: bookingData.guestInfo?.email,
          guestPhone: bookingData.guestInfo?.phone,
          rideDetails: bookingData.rideDetails,
          type: 'ride' // ✅ CORREÇÃO: Especificar tipo
        };
        
        const result = await this.bookRide(payload);
        return { success: true, data: result.data };
        
      } else if (type === 'hotel') {
        payload = {
          accommodationId: bookingData.accommodationId,
          passengerId: user.uid, // ✅ CORREÇÃO: Verificar se backend usa passengerId ou userId
          totalPrice: bookingData.totalAmount,
          guestName: bookingData.guestInfo?.name,
          guestEmail: bookingData.guestInfo?.email,
          guestPhone: bookingData.guestInfo?.phone,
          checkInDate: bookingData.checkInDate,
          checkOutDate: bookingData.checkOutDate,
          type: 'hotel' // ✅ CORREÇÃO: Especificar tipo
        };
        
        const result = await this.bookHotel(payload);
        return { success: true, data: result.data };
        
      } else {
        return { 
          success: false, 
          error: 'Tipo de booking inválido' 
        };
      }
    } catch (error: any) {
      console.error('❌ Erro ao criar booking:', error);
      return { 
        success: false, 
        error: error.message || 'Erro ao criar reserva' 
      };
    }
  }

  async getUserBookings(): Promise<{ success: boolean; data: { bookings: Booking[] } }> {
    return this.request('GET', '/api/bookings/user');
  }

  // ===== USER/AUTH API =====
  async getUserProfile(): Promise<{ success: boolean; data: any }> {
    return this.request('GET', '/api/auth/profile');
  }

  async updateUserProfile(userData: any): Promise<{ success: boolean; data: any }> {
    return this.request('PUT', '/api/auth/profile', userData);
  }

  // ===== HOTELS API =====
  async searchAccommodations(params: { location?: string; checkIn?: string; checkOut?: string; guests?: number }): Promise<{ success: boolean; data: { accommodations: Hotel[] } }> {
    const searchParams = new URLSearchParams();
    if (params.location) searchParams.append('location', params.location);
    if (params.checkIn) searchParams.append('checkIn', params.checkIn);
    if (params.checkOut) searchParams.append('checkOut', params.checkOut);
    if (params.guests) searchParams.append('guests', params.guests.toString());
    
    return this.request('GET', `/api/search/accommodations?${searchParams.toString()}`);
  }

  async createAccommodation(accommodationData: any): Promise<{ success: boolean; data: { hotel: Hotel } }> {
    return this.request('POST', '/api/hotels', accommodationData);
  }

  async getUserAccommodations(): Promise<{ success: boolean; data: { hotels: Hotel[] } }> {
    try {
      return await this.request('GET', '/api/hotels/my-hotels');
    } catch (error) {
      console.error('Erro ao buscar acomodações do usuário:', error);
      return { success: false, data: { hotels: [] } };
    }
  }

  async getHotelById(hotelId: string): Promise<{ success: boolean; data: { hotel: Hotel } }> {
    return this.request('GET', `/api/hotels/${hotelId}`);
  }

  async updateHotel(hotelId: string, hotelData: Partial<Hotel>): Promise<{ success: boolean; data: { hotel: Hotel } }> {
    return this.request('PUT', `/api/hotels/${hotelId}`, hotelData);
  }

  async deleteHotel(hotelId: string): Promise<{ success: boolean }> {
    return this.request('DELETE', `/api/hotels/${hotelId}`);
  }

  async updateRoom(roomId: string, roomData: Partial<RoomType>): Promise<{ success: boolean; data: { room: RoomType } }> {
    return this.request('PUT', `/api/rooms/${roomId}`, roomData);
  }

  async getHotelStats(hotelId: string): Promise<{ success: boolean; data: { stats: HotelStats } }> {
    return this.request('GET', `/api/hotels/${hotelId}/stats`);
  }

  // ===== ROOMS API =====
  async getRoomsByHotelId(hotelId: string): Promise<{ success: boolean; data: { rooms: RoomType[] } }> {
    return this.request('GET', `/api/hotels/${hotelId}/rooms`);
  }

  async createRoom(roomData: Partial<RoomType>): Promise<{ success: boolean; data: { room: RoomType } }> {
    return this.request('POST', '/api/rooms', roomData);
  }

  async deleteRoom(roomId: string): Promise<{ success: boolean }> {
    return this.request('DELETE', `/api/rooms/${roomId}`);
  }

  // ===== PARTNERSHIPS API =====
  async createPartnership(partnershipData: { partnerId: string; type: 'driver-hotel' | 'hotel-driver'; terms: string }): Promise<{ success: boolean; data: any }> {
    return this.request('POST', '/api/partnerships/create', partnershipData);
  }

  async getPartnershipRequests(): Promise<{ success: boolean; data: { requests: any[] } }> {
    return this.request('GET', '/api/partnerships/requests');
  }

  async getDriverPartnerships(hotelId: string): Promise<{ success: boolean; data: { partnerships: DriverPartnership[] } }> {
    return this.request('GET', `/api/partnerships/driver?hotelId=${hotelId}`);
  }

  // ===== EVENTS API =====
  async getEvents(hotelId?: string): Promise<{ success: boolean; data: { events: HotelEvent[] } }> {
    const url = hotelId ? `/api/events?hotelId=${hotelId}` : '/api/events';
    return this.request('GET', url);
  }

  async createEvent(eventData: any): Promise<{ success: boolean; data: { event: HotelEvent } }> {
    return this.request('POST', '/api/events/create', eventData);
  }

  async updateEvent(eventId: string, eventData: Partial<HotelEvent>): Promise<{ success: boolean; data: { event: HotelEvent } }> {
    return this.request('PUT', `/api/events/${eventId}`, eventData);
  }

  // ===== FEATURED OFFERS API =====
  async getFeaturedOffers(): Promise<{ success: boolean; data: { offers: any[] } }> {
    return this.request('GET', '/api/offers/featured');
  }

  // ===== CHAT API =====
  async getChatRooms(): Promise<{ success: boolean; data: { rooms: any[] } }> {
    return this.request('GET', '/api/chat/rooms');
  }

  async getChatMessages(roomId: string): Promise<{ success: boolean; data: { messages: ChatMessage[] } }> {
    return this.request('GET', `/api/chat/messages/${roomId}`);
  }

  async sendChatMessage(roomId: string, messageData: { message: string }): Promise<{ success: boolean; data: { message: ChatMessage } }> {
    return this.request('POST', `/api/chat/messages/${roomId}`, messageData);
  }

  // ===== ADMIN API =====
  async getAdminStats(): Promise<{ success: boolean; data: any }> {
    return this.request('GET', '/api/admin/stats');
  }

  async getAdminRides(): Promise<{ success: boolean; data: { rides: any[] } }> {
    return this.request('GET', '/api/admin/rides');
  }

  async getAdminBookings(): Promise<{ success: boolean; data: { bookings: Booking[] } }> {
    return this.request('GET', '/api/admin/bookings');
  }

  // ===== LOCATIONS API =====
  async searchLocations(query: string, limit: number = 10): Promise<{ success: boolean; data: any[] }> {
    const searchParams = new URLSearchParams();
    searchParams.append('q', query);
    searchParams.append('limit', limit.toString());
    
    return this.request('GET', `/api/locations/autocomplete?${searchParams.toString()}`);
  }
}

export const apiService = new ApiService();
export default apiService;