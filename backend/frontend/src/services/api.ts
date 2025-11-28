import { auth } from '@/shared/lib/firebaseConfig';
import { Booking, RideBookingRequest, HotelBookingRequest } from '@/shared/types/booking';
import { formatDateOnly, formatTimeOnly, formatLongDate, formatWeekday, formatDateTime } from '../utils/dateFormatter';

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

// ✅✅✅ INTERFACE RIDE COMPLETAMENTE CORRIGIDA - COMPATÍVEL COM get_rides_smart_final
export interface Ride {
  // ✅ Campos ORIGINAIS do PostgreSQL (get_rides_smart_final)
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
  
  // ✅ Campos de matching inteligente
  match_type?: string;
  direction_score?: number;
  
  // ✅ Campos opcionais
  from_province?: string;
  to_province?: string;
  
  // ✅✅✅ ALIAS para compatibilidade com frontend existente
  id: string;
  driverId: string;
  driverName: string;
  driverRating: number;
  fromLocation: string;
  toLocation: string;
  fromAddress: string;
  toAddress: string;
  fromCity: string;
  toCity: string;
  fromProvince?: string;
  toProvince?: string;
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
  
  // ✅ Campos adicionais para compatibilidade
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
  
  description?: string;
  vehiclePhoto?: string;
  estimatedDuration?: number;
  estimatedDistance?: number;
  allowNegotiation?: boolean;
  allowPickupEnRoute?: boolean;
  isVerifiedDriver?: boolean;
  availableIn?: number;
  route_compatibility?: number;
  match_description?: string;
  vehicleFeatures?: string[];
  driver?: {
    firstName?: string;
    lastName?: string;
    rating?: number;
    isVerified?: boolean;
  };
  distanceFromCityKm?: number;
  distanceToCityKm?: number;
  
  // ✅ Campos formatados
  departureDateFormatted?: string;
  departureTimeFormatted?: string;
  departureDateTimeFormatted?: string;
  departureLongDate?: string;
  departureWeekday?: string;
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

// ✅ INTERFACE PARA MATCHSTATS ATUALIZADA
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

// ✅✅✅ FUNÇÃO DE NORMALIZAÇÃO COMPLETAMENTE CORRIGIDA - COMPATÍVEL COM get_rides_smart_final
export function normalizeRide(apiRide: any): Ride {
  console.log('🔄 [NORMALIZAÇÃO] Processando ride:', {
    ride_id: apiRide.ride_id,
    driver_name: apiRide.driver_name,
    match_type: apiRide.match_type,
    direction_score: apiRide.direction_score
  });

  // ✅✅✅ CORREÇÃO CRÍTICA: Extrair dados do PostgreSQL e criar aliases
  const normalized: Ride = {
    // ✅ Campos ORIGINAIS do PostgreSQL (get_rides_smart_final)
    ride_id: apiRide.ride_id || apiRide.id || '',
    driver_id: apiRide.driver_id || apiRide.driverId || '',
    driver_name: apiRide.driver_name || apiRide.driverName || 'Motorista',
    driver_rating: Number(apiRide.driver_rating ?? apiRide.driverRating ?? 4.5),
    vehicle_make: apiRide.vehicle_make || apiRide.vehicleMake || '',
    vehicle_model: apiRide.vehicle_model || apiRide.vehicleModel || '',
    vehicle_type: apiRide.vehicle_type || apiRide.vehicleType || 'economy',
    vehicle_plate: apiRide.vehicle_plate || apiRide.vehiclePlate || '',
    vehicle_color: apiRide.vehicle_color || apiRide.vehicleColor || '',
    max_passengers: Number(apiRide.max_passengers ?? apiRide.maxPassengers ?? 4),
    from_city: apiRide.from_city || apiRide.fromCity || '',
    to_city: apiRide.to_city || apiRide.toCity || '',
    from_lat: Number(apiRide.from_lat ?? apiRide.fromLat ?? 0),
    from_lng: Number(apiRide.from_lng ?? apiRide.fromLng ?? 0),
    to_lat: Number(apiRide.to_lat ?? apiRide.toLat ?? 0),
    to_lng: Number(apiRide.to_lng ?? apiRide.toLng ?? 0),
    departuredate: apiRide.departuredate || apiRide.departureDate || new Date().toISOString(),
    availableseats: Number(apiRide.availableseats ?? apiRide.availableSeats ?? 0),
    priceperseat: Number(apiRide.priceperseat ?? apiRide.pricePerSeat ?? 0),
    distance_from_city_km: Number(apiRide.distance_from_city_km ?? apiRide.distanceFromCityKm ?? 0),
    distance_to_city_km: Number(apiRide.distance_to_city_km ?? apiRide.distanceToCityKm ?? 0),
    
    // ✅ Campos de matching inteligente
    match_type: apiRide.match_type || 'traditional',
    direction_score: Number(apiRide.direction_score ?? 0),
    
    // ✅ Campos opcionais
    from_province: apiRide.from_province || apiRide.fromProvince,
    to_province: apiRide.to_province || apiRide.toProvince,
    
    // ✅✅✅ ALIAS para compatibilidade com frontend existente
    id: apiRide.ride_id || apiRide.id || '',
    driverId: apiRide.driver_id || apiRide.driverId || '',
    driverName: apiRide.driver_name || apiRide.driverName || 'Motorista',
    driverRating: Number(apiRide.driver_rating ?? apiRide.driverRating ?? 4.5),
    fromLocation: apiRide.from_city || apiRide.fromCity || '',
    toLocation: apiRide.to_city || apiRide.toCity || '',
    fromAddress: apiRide.from_city || apiRide.fromCity || '',
    toAddress: apiRide.to_city || apiRide.toCity || '',
    fromCity: apiRide.from_city || apiRide.fromCity || '',
    toCity: apiRide.to_city || apiRide.toCity || '',
    fromProvince: apiRide.from_province || apiRide.fromProvince,
    toProvince: apiRide.to_province || apiRide.toProvince,
    departureDate: apiRide.departuredate || apiRide.departureDate || new Date().toISOString(),
    departureTime: apiRide.departureTime || '08:00',
    price: Number(apiRide.priceperseat ?? apiRide.pricePerSeat ?? 0),
    pricePerSeat: Number(apiRide.priceperseat ?? apiRide.pricePerSeat ?? 0),
    availableSeats: Number(apiRide.availableseats ?? apiRide.availableSeats ?? 0),
    maxPassengers: Number(apiRide.max_passengers ?? apiRide.maxPassengers ?? 4),
    currentPassengers: apiRide.currentPassengers || 0,
    vehicle: apiRide.vehicle_type || apiRide.vehicleType || 'Veículo',
    vehicleType: apiRide.vehicle_type || apiRide.vehicleType || 'economy',
    vehicleMake: apiRide.vehicle_make || apiRide.vehicleMake || '',
    vehicleModel: apiRide.vehicle_model || apiRide.vehicleModel || '',
    vehiclePlate: apiRide.vehicle_plate || apiRide.vehiclePlate || '',
    vehicleColor: apiRide.vehicle_color || apiRide.vehicleColor || '',
    status: apiRide.status || 'available',
    type: apiRide.type || apiRide.vehicle_type || 'economy',
    
    // ✅ Campos adicionais para compatibilidade
    vehicleInfo: {
      make: apiRide.vehicle_make || apiRide.vehicleMake || '',
      model: apiRide.vehicle_model || apiRide.vehicleModel || '',
      type: apiRide.vehicle_type || apiRide.vehicleType || 'economy',
      typeDisplay: 'Económico', // Placeholder
      typeIcon: '🚗', // Placeholder
      plate: apiRide.vehicle_plate || apiRide.vehiclePlate || '',
      color: apiRide.vehicle_color || apiRide.vehicleColor || '',
      maxPassengers: Number(apiRide.max_passengers ?? apiRide.maxPassengers ?? 4)
    },
    
    route_compatibility: Number(apiRide.direction_score ?? apiRide.route_compatibility ?? 0),
    distanceFromCityKm: Number(apiRide.distance_from_city_km ?? apiRide.distanceFromCityKm ?? 0),
    distanceToCityKm: Number(apiRide.distance_to_city_km ?? apiRide.distanceToCityKm ?? 0),
    
    // ✅ Campos formatados
    departureDateFormatted: formatDateOnly(apiRide.departuredate || apiRide.departureDate),
    departureTimeFormatted: formatTimeOnly(apiRide.departuredate || apiRide.departureDate),
    departureDateTimeFormatted: formatDateTime(apiRide.departuredate || apiRide.departureDate),
    departureLongDate: formatLongDate(apiRide.departuredate || apiRide.departureDate),
    departureWeekday: formatWeekday(apiRide.departuredate || apiRide.departureDate)
  };
  
  console.log('✅ [NORMALIZAÇÃO] Ride normalizado:', {
    id: normalized.id,
    driver_name: normalized.driver_name,
    priceperseat: normalized.priceperseat,
    match_type: normalized.match_type,
    direction_score: normalized.direction_score
  });
  
  return normalized;
}

// ✅ FUNÇÃO DE NORMALIZAÇÃO DE LISTA
export function normalizeRides(backendRides: any[]): Ride[] {
  console.log(`🔄 [NORMALIZAÇÃO] Normalizando ${backendRides?.length || 0} rides`);
  return (backendRides || []).map(normalizeRide);
}

// ✅ CRIAR MATCHSTATS PADRÃO
export function createDefaultMatchStats(): MatchStats {
  return {
    exact_match: 0,
    same_segment: 0,
    same_direction: 0,
    potential: 0,
    traditional: 0,
    smart_matches: 0,
    drivers_with_ratings: 0,
    average_driver_rating: 0,
    vehicle_types: {},
    match_types: {},
    total_smart_matches: 0,
    average_direction_score: 0,
    total: 0
  };
}

// ✅ FUNÇÃO AUXILIAR: Obter nome do motorista
export function getDriverName(ride: Ride): string {
  return ride.driver_name || ride.driverName || 'Motorista não disponível';
}

// ✅ FUNÇÃO AUXILIAR: Obter rating do motorista
export function getDriverRating(ride: Ride): number {
  return ride.driver_rating || ride.driverRating || 4.5;
}

// ✅✅✅ CORREÇÃO: formatPrice aceita qualquer tipo mas converte para number
export function formatPrice(price: number | string | null | undefined): string {
  // ✅ Converter para número com fallback para 0
  const priceNumber = Number(price) || 0;
  
  return new Intl.NumberFormat('pt-MZ', {
    style: 'currency',
    currency: 'MZN',
    minimumFractionDigits: 2
  }).format(priceNumber);
}

// ✅ FUNÇÃO AUXILIAR: Obter informações completas do veículo
export function getVehicleInfo(ride: Ride): string {
  const parts = [];
  
  if (ride.vehicle_plate || ride.vehiclePlate) {
    parts.push(`🚗 ${ride.vehicle_plate || ride.vehiclePlate}`);
  }
  
  if (ride.vehicle_type || ride.vehicleType) {
    parts.push(ride.vehicle_type || ride.vehicleType);
  } else if (ride.vehicle) {
    parts.push(ride.vehicle);
  }
  
  return parts.length > 0 ? parts.join(' • ') : 'Veículo não disponível';
}

// ✅ FUNÇÃO AUXILIAR: Obter detalhes do veículo
export function getVehicleDetails(ride: Ride): string {
  const details = [];
  
  const make = ride.vehicle_make || ride.vehicleMake;
  const model = ride.vehicle_model || ride.vehicleModel;
  if (make && model) {
    details.push(`${make} ${model}`);
  }
  
  const color = ride.vehicle_color || ride.vehicleColor;
  if (color) {
    details.push(color);
  }
  
  const maxPassengers = ride.max_passengers || ride.maxPassengers;
  if (maxPassengers) {
    details.push(`Até ${maxPassengers} passageiros`);
  }
  
  return details.join(' • ');
}

/**
 * Serviço central de API para todas as apps
 * ATUALIZADO para compatibilidade com get_rides_smart_final
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

  // ✅✅✅ NOVO: Método para chamadas RPC (PostgreSQL Functions)
  private async rpcRequest<T>(
    functionName: string,
    parameters: Record<string, any> = {}
  ): Promise<T> {
    const headers = await this.getAuthHeaders();
    const url = `${this.baseURL}/api/rpc`;
    
    const payload = {
      function: functionName,
      parameters: parameters
    };
    
    console.log(`🧠 RPC Call ${functionName}:`, parameters);
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${response.status}: ${errorText || 'RPC request failed'}`);
      }
      
      const result = await response.json() as T;
      console.log(`✅ RPC Response: ${functionName}`, result);
      return result;
    } catch (error) {
      console.error(`❌ RPC Error: ${functionName}`, error);
      throw error;
    }
  }

  // ===== RIDES API COMPLETAMENTE ATUALIZADA =====
  async searchRides(params: RideSearchParams): Promise<RideSearchResponse> {
    try {
      console.log('🔍 [API] Buscando rides com parâmetros:', params);
      
      // ✅✅✅ CORREÇÃO CRÍTICA: Usar RPC call para get_rides_smart_final
      const rpcParams = {
        search_from: params.from || '',
        search_to: params.to || '',
        radius_km: params.radiusKm || params.maxDistance || 100,
        max_results: 50 // Default da função
      };
      
      console.log('🧠 [API] Chamando get_rides_smart_final via RPC:', rpcParams);
      
      const rpcResponse = await this.rpcRequest<any[]>('get_rides_smart_final', rpcParams);
      
      // ✅ Processar resposta RPC
      const ridesData = Array.isArray(rpcResponse) ? rpcResponse : [];
      
      console.log(`✅ [API] RPC retornou ${ridesData.length} rides`);
      
      // ✅ Calcular estatísticas de matching
      const matchStats: MatchStats = {
        total: ridesData.length,
        match_types: ridesData.reduce((acc, ride) => {
          const matchType = ride.match_type || 'traditional';
          acc[matchType] = (acc[matchType] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        total_smart_matches: ridesData.filter(ride => ride.match_type && ride.match_type !== 'traditional').length,
        average_direction_score: ridesData.length > 0 ? 
          ridesData.reduce((sum, ride) => sum + (ride.direction_score || 0), 0) / ridesData.length : 0,
        average_driver_rating: ridesData.length > 0 ?
          ridesData.reduce((sum, ride) => sum + (ride.driver_rating || 0), 0) / ridesData.length : 0
      };
      
      const searchParamsResponse = {
        from: params.from || '',
        to: params.to || '',
        date: params.date,
        passengers: params.passengers,
        smartSearch: true,
        radiusKm: rpcParams.radius_km,
        searchMethod: 'get_rides_smart_final',
        functionUsed: 'get_rides_smart_final',
        appliedFilters: params
      };

      return {
        success: true,
        rides: normalizeRides(ridesData),
        matchStats: matchStats,
        searchParams: searchParamsResponse,
        total: ridesData.length,
        smart_search: true
      };
      
    } catch (error) {
      console.error('❌ [API] Erro na busca de rides via RPC:', error);
      
      // ✅ Fallback para busca tradicional se RPC falhar
      try {
        const searchParams = new URLSearchParams();
        if (params.from) searchParams.append('from', params.from);
        if (params.to) searchParams.append('to', params.to);
        if (params.date) searchParams.append('date', params.date);
        if (params.passengers) searchParams.append('passengers', params.passengers.toString());

        console.log(`🔍 [API] Fallback para busca tradicional: ${params.from} → ${params.to}`);
        
        const response = await this.request<any>('GET', `/api/rides/search?${searchParams.toString()}`);
        
        const rides = response.results || response.data?.rides || response.rides || [];
        
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
          rides: normalizeRides(rides),
          matchStats: response.matchStats || response.data?.stats || createDefaultMatchStats(),
          searchParams: searchParamsResponse,
          total: response.total || rides.length || 0,
          smart_search: response.smart_search || false
        };
      } catch (fallbackError) {
        console.error('❌ [API] Fallback também falhou:', fallbackError);
        throw error; // Lançar erro original
      }
    }
  }

  // ✅ BUSCA INTELIGENTE ESPECÍFICA
  async searchSmartRides(params: {
    from: string;
    to: string;
    date?: string;
    passengers?: number;
    radiusKm?: number;
  }): Promise<RideSearchResponse> {
    console.log('🧠 [API] Busca SMART específica:', params);
    
    // ✅ Reutilizar a função principal
    return this.searchRides({
      from: params.from,
      to: params.to,
      date: params.date,
      passengers: params.passengers,
      radiusKm: params.radiusKm,
      smartSearch: true
    });
  }

  // ✅ BUSCA UNIVERSAL INTELIGENTE
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
    console.log('🌍 [API] Busca universal inteligente', params);
    
    // ✅ Reutilizar a função principal
    return this.searchRides({
      from: params.from,
      to: params.to,
      radiusKm: params.radiusKm,
      smartSearch: true
    });
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

  // 🆕 OBTER DETALHES DE UM RIDE ESPECÍFICO
  async getRideDetails(rideId: string): Promise<{ success: boolean; data: { ride: Ride } }> {
    const response = await this.request<any>('GET', `/api/rides/${rideId}`);
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

  // 🆕 BUSCAR RIDES PRÓXIMOS
  async getNearbyRides(location: string, radius: number = 50, passengers: number = 1): Promise<RideSearchResponse> {
    console.log('📍 [API] Buscando rides próximos:', { location, radius, passengers });
    
    // ✅ Usar busca inteligente com mesma localização
    return this.searchRides({
      from: location,
      to: location,
      radiusKm: radius,
      passengers: passengers,
      smartSearch: true
    });
  }

  // 🆕 SOLICITAR RESERVA DE VIAGEM
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
      type: 'ride'
    });
  }

  // 🆕 OBTER ESTATÍSTICAS DE MATCHING
  async getRideMatchStats(from: string, to: string): Promise<{ success: boolean; data: { stats: MatchStats } }> {
    console.log('📊 [API] Buscando estatísticas de matching:', { from, to });
    
    // ✅ Fazer uma busca para calcular estatísticas
    const searchResponse = await this.searchRides({
      from: from,
      to: to,
      smartSearch: true
    });
    
    return {
      success: true,
      data: {
        stats: searchResponse.matchStats || createDefaultMatchStats()
      }
    };
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
          passengerId: user.uid,
          seatsBooked: bookingData.passengers,
          totalPrice: bookingData.totalAmount,
          guestName: bookingData.guestInfo?.name,
          guestEmail: bookingData.guestInfo?.email,
          guestPhone: bookingData.guestInfo?.phone,
          rideDetails: bookingData.rideDetails,
          type: 'ride'
        };
        
        const result = await this.bookRide(payload);
        return { success: true, data: result.data };
        
      } else if (type === 'hotel') {
        payload = {
          accommodationId: bookingData.accommodationId,
          passengerId: user.uid,
          totalPrice: bookingData.totalAmount,
          guestName: bookingData.guestInfo?.name,
          guestEmail: bookingData.guestInfo?.email,
          guestPhone: bookingData.guestInfo?.phone,
          checkInDate: bookingData.checkInDate,
          checkOutDate: bookingData.checkOutDate,
          type: 'hotel'
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