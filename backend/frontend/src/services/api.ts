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

// ✅✅✅ INTERFACE RIDE COMPLETAMENTE CORRIGIDA COM TODOS OS NOVOS DADOS DO POSTGRESQL
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
    rating?: number;
    isVerified?: boolean;
  };
  estimatedDuration?: number;
  estimatedDistance?: number;
  allowNegotiation?: boolean;
  isVerifiedDriver?: boolean;
  status: string;
  type?: string;
  currentPassengers?: number;
  
  // ✅✅✅ NOVOS CAMPOS: Dados do motorista do PostgreSQL
  driverName?: string;
  driverRating?: number;
  
  // ✅✅✅ NOVOS CAMPOS: Dados completos do veículo do PostgreSQL
  vehicleInfoComplete?: {
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
  vehiclePhoto?: string | null;
  availableIn?: number;
  isRoundTrip?: boolean;
  allowPickupEnRoute?: boolean;
  
  // ✅✅✅ CAMPOS DE MATCHING INTELIGENTE - nomes do backend
  match_type?: string;
  route_compatibility?: number;
  match_description?: string;
  
  // ✅✅✅ CAMPOS PARA COMPATIBILIDADE (camelCase para frontend)
  matchScore?: number;
  matchType?: string;
  matchDescription?: string;
  
  // ✅✅✅ NOVOS CAMPOS: Dados geográficos do PostgreSQL
  from_lat?: number;
  from_lng?: number;
  to_lat?: number;
  to_lng?: number;
  distance_from_city_km?: number;
  distance_to_city_km?: number;
  
  // ✅✅✅ NOVOS CAMPOS: Dados de busca inteligente
  search_metadata?: {
    original_search: { from: string; to: string };
    normalized_search: { from: string; to: string };
    function_used?: string;
    fallback_used?: boolean;
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
  radiusKm?: number; // ✅✅✅ NOVO: Parâmetro para busca inteligente
}

// ✅✅✅ INTERFACE PARA MATCHSTATS ALINHADA COM BACKEND
export interface MatchStats {
  exact_match?: number;
  same_segment?: number;
  same_direction?: number;
  same_origin?: number;
  same_destination?: number;
  potential?: number;
  traditional?: number;
  total: number;
  smart_matches?: number;
  // ✅✅✅ NOVAS ESTATÍSTICAS: Dados dos motoristas e veículos
  drivers_with_ratings?: number;
  average_driver_rating?: number;
  vehicle_types?: Record<string, number>;
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
    // ✅✅✅ NOVOS: Dados de normalização
    normalization?: {
      applied: boolean;
      original: { from: string; to: string };
      normalized: { from: string; to: string };
    };
  };
  total?: number;
  data?: {
    rides: Ride[];
    stats?: MatchStats;
    searchParams?: any;
    smart_search?: boolean;
    // ✅✅✅ NOVOS: Dados de debug e completude
    debug_info?: {
      normalization_applied: boolean;
      original_input: { from: string; to: string };
      normalized_input: { from: string; to: string };
      data_completeness: {
        driver_names: number;
        driver_ratings: number;
        vehicle_data: number;
        prices: number;
      };
    };
  };
  smart_search?: boolean;
}

// ✅✅✅ MAPEAMENTO PARA TIPOS DE VEÍCULO
const VEHICLE_TYPE_DISPLAY: Record<string, { label: string; icon: string }> = {
  economy: { label: 'Económico', icon: '🚗' },
  comfort: { label: 'Conforto', icon: '🚙' },
  luxury: { label: 'Luxo', icon: '🏎️' },
  family: { label: 'Familiar', icon: '🚐' },
  cargo: { label: 'Carga', icon: '🚚' },
  motorcycle: { label: 'Moto', icon: '🏍️' }
};

// ✅✅✅ FUNÇÃO DE NORMALIZAÇÃO COMPLETAMENTE CORRIGIDA - VERSÃO FINAL
export function normalizeRide(backendRide: any): Ride {
  console.log('🔧 [NORMALIZAÇÃO] Dados brutos do backend:', backendRide);

  // ✅✅✅ CORREÇÃO CRÍTICA: Extrair dados COMPLETOS do vehicleInfo do PostgreSQL
  const vehicleInfoComplete = backendRide.vehicleInfo ? {
    make: backendRide.vehicleInfo.make || backendRide.vehicle_make || '',
    model: backendRide.vehicleInfo.model || backendRide.vehicle_model || 'Veículo',
    type: backendRide.vehicleInfo.type || backendRide.vehicle_type || 'economy',
    typeDisplay: backendRide.vehicleInfo.typeDisplay || VEHICLE_TYPE_DISPLAY[backendRide.vehicle_type || 'economy']?.label || 'Económico',
    typeIcon: backendRide.vehicleInfo.typeIcon || VEHICLE_TYPE_DISPLAY[backendRide.vehicle_type || 'economy']?.icon || '🚗',
    plate: backendRide.vehicleInfo.plate || backendRide.vehicle_plate || 'Não informada',
    color: backendRide.vehicleInfo.color || backendRide.vehicle_color || 'Não informada',
    maxPassengers: backendRide.vehicleInfo.maxPassengers || backendRide.max_passengers || 4
  } : {
    // ✅✅✅ SE vehicleInfo não existe, usar dados diretos do PostgreSQL
    make: backendRide.vehicle_make || '',
    model: backendRide.vehicle_model || 'Veículo',
    type: backendRide.vehicle_type || 'economy',
    typeDisplay: VEHICLE_TYPE_DISPLAY[backendRide.vehicle_type || 'economy']?.label || 'Económico',
    typeIcon: VEHICLE_TYPE_DISPLAY[backendRide.vehicle_type || 'economy']?.icon || '🚗',
    plate: backendRide.vehicle_plate || 'Não informada',
    color: backendRide.vehicle_color || 'Não informada',
    maxPassengers: backendRide.max_passengers || 4
  };

  // ✅✅✅ CORREÇÃO: Converter todos os campos numéricos
  const pricePerSeatNum = Number(backendRide.pricePerSeat ?? backendRide.priceperseat ?? backendRide.price ?? 0);
  const driverRatingNum = Number(backendRide.driverRating ?? backendRide.driver_rating ?? backendRide.driver?.rating ?? 4.5);
  const availableSeatsNum = Number(backendRide.availableSeats ?? backendRide.availableseats ?? 0);
  const maxPassengersNum = Number(backendRide.maxPassengers ?? backendRide.max_passengers ?? vehicleInfoComplete.maxPassengers ?? 4);

  // ✅✅✅ CORREÇÃO: Formatar data e hora
  const departureDate = backendRide.departureDate || backendRide.departuredate;
  const departureDateFormatted = departureDate ? formatDate(departureDate) : '';
  const departureTimeFormatted = departureDate ? formatTime(departureDate) : '08:00';

  const normalized: Ride = {
    id: backendRide.id || backendRide.ride_id || '',
    driverId: backendRide.driverId || backendRide.driver_id || '',
    fromLocation: backendRide.fromLocation || backendRide.from_address || backendRide.from_city || '',
    toLocation: backendRide.toLocation || backendRide.to_address || backendRide.to_city || '',
    fromAddress: backendRide.fromAddress || backendRide.from_address || backendRide.fromLocation || '',
    toAddress: backendRide.toAddress || backendRide.to_address || backendRide.toLocation || '',
    fromProvince: backendRide.fromProvince || backendRide.from_province,
    toProvince: backendRide.toProvince || backendRide.to_province,
    departureDate: departureDate || '',
    departureTime: backendRide.departureTime || departureTimeFormatted,
    price: pricePerSeatNum,
    pricePerSeat: pricePerSeatNum,
    availableSeats: availableSeatsNum,
    maxPassengers: maxPassengersNum,
    vehicleType: backendRide.vehicleType || backendRide.vehicle_type || 'economy',
    status: backendRide.status || 'active',
    
    // ✅✅✅ DADOS DO MOTORISTA DO POSTGRESQL
    driverName: backendRide.driver_name || backendRide.driverName || 'Motorista',
    driverRating: driverRatingNum,
    
    // ✅✅✅ DADOS COMPLETOS DO VEÍCULO DO POSTGRESQL
    vehicleInfoComplete: vehicleInfoComplete,
    
    // ✅✅✅ DADOS GEOGRÁFICOS DO POSTGRESQL
    from_lat: backendRide.from_lat,
    from_lng: backendRide.from_lng,
    to_lat: backendRide.to_lat,
    to_lng: backendRide.to_lng,
    distance_from_city_km: backendRide.distance_from_city_km,
    distance_to_city_km: backendRide.distance_to_city_km,
  };

  // ✅✅✅ CORREÇÃO: Campos opcionais - verificar explicitamente por undefined
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

  // ✅✅✅ CORREÇÃO: Campos de matching do backend (snake_case)
  if (backendRide.match_type !== undefined) normalized.match_type = backendRide.match_type;
  if (backendRide.route_compatibility !== undefined) normalized.route_compatibility = backendRide.route_compatibility;
  if (backendRide.match_description !== undefined) normalized.match_description = backendRide.match_description;

  // ✅✅✅ CORREÇÃO: Campos de compatibilidade para frontend (camelCase)
  normalized.matchType = backendRide.match_type !== undefined ? backendRide.match_type : backendRide.matchType;
  normalized.matchScore = backendRide.route_compatibility !== undefined ? backendRide.route_compatibility : backendRide.matchScore;
  normalized.matchDescription = backendRide.match_description !== undefined ? backendRide.match_description : backendRide.matchDescription;

  // ✅✅✅ CORREÇÃO: Informações do driver
  if (backendRide.driver) {
    normalized.driver = {
      firstName: backendRide.driver.firstName || '',
      lastName: backendRide.driver.lastName || '',
      rating: backendRide.driver.rating ? Number(backendRide.driver.rating) : undefined,
      isVerified: backendRide.driver.isVerified || false,
    };
    // ✅✅✅ Priorizar driver_name do PostgreSQL se disponível
    if (!normalized.driverName || normalized.driverName === 'Motorista') {
      normalized.driverName = `${normalized.driver.firstName} ${normalized.driver.lastName}`.trim() || 'Motorista';
    }
    normalized.isVerifiedDriver = normalized.driver.isVerified;
    if (normalized.driver.rating !== undefined && !normalized.driverRating) {
      normalized.driverRating = normalized.driver.rating;
    }
  }

  // ✅✅✅ CORREÇÃO: Search metadata
  if (backendRide.search_metadata) {
    normalized.search_metadata = backendRide.search_metadata;
  }

  console.log('✅ [NORMALIZAÇÃO] Ride normalizado:', {
    id: normalized.id,
    driverName: normalized.driverName,
    driverRating: normalized.driverRating,
    vehicleInfo: normalized.vehicleInfoComplete,
    price: normalized.pricePerSeat,
    availableSeats: normalized.availableSeats
  });

  return normalized;
}

// ✅✅✅ FUNÇÕES AUXILIARES PARA FORMATAÇÃO
function formatDate(dateString: string | Date): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-MZ');
  } catch (error) {
    console.warn('Erro ao formatar data:', error);
    return '';
  }
}

function formatTime(dateString: string | Date): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' });
  } catch (error) {
    console.warn('Erro ao formatar hora:', error);
    return '08:00';
  }
}

// ✅✅✅ FUNÇÃO DE NORMALIZAÇÃO DE LISTA
export function normalizeRides(backendRides: any[]): Ride[] {
  console.log(`🔄 [NORMALIZAÇÃO] Normalizando ${backendRides?.length || 0} rides`);
  return (backendRides || []).map(normalizeRide);
}

// ✅✅✅ CRIAR MATCHSTATS PADRÃO
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
    drivers_with_ratings: 0,
    average_driver_rating: 0,
    vehicle_types: {},
    total: 0
  };
}

// ✅✅✅ FUNÇÃO PARA OBTER INFORMAÇÕES DO VEÍCULO
export function getVehicleInfo(ride: Ride) {
  if (ride.vehicleInfoComplete) {
    return {
      display: `${ride.vehicleInfoComplete.make} ${ride.vehicleInfoComplete.model} - ${ride.vehicleInfoComplete.color}`,
      typeDisplay: ride.vehicleInfoComplete.typeDisplay,
      typeIcon: ride.vehicleInfoComplete.typeIcon,
      plate: ride.vehicleInfoComplete.plate,
      color: ride.vehicleInfoComplete.color,
      maxPassengers: ride.vehicleInfoComplete.maxPassengers,
      make: ride.vehicleInfoComplete.make,
      model: ride.vehicleInfoComplete.model
    };
  }
  
  const typeInfo = VEHICLE_TYPE_DISPLAY[ride.vehicleType || ride.type || 'economy'] || VEHICLE_TYPE_DISPLAY.economy;
  
  return {
    display: ride.vehicleType || ride.type || 'Veículo',
    typeDisplay: typeInfo.label,
    typeIcon: typeInfo.icon,
    plate: 'Não informada',
    color: 'Não informada',
    maxPassengers: ride.maxPassengers || 4,
    make: '',
    model: 'Veículo'
  };
}

// ✅✅✅ FUNÇÃO PARA OBTER NOME DO MOTORISTA
export function getDriverName(ride: Ride): string {
  // ✅✅✅ Priorizar driver_name do PostgreSQL
  if (ride.driverName && ride.driverName !== 'Motorista') {
    return ride.driverName;
  }
  
  return ride.driver
    ? `${ride.driver.firstName ?? ''} ${ride.driver.lastName ?? ''}`.trim() || 'Motorista'
    : 'Motorista';
}

// ✅✅✅ FUNÇÃO PARA OBTER RATING DO MOTORISTA
export function getDriverRating(ride: Ride): number {
  // ✅✅✅ Priorizar driver_rating do PostgreSQL
  if (ride.driverRating && ride.driverRating > 0) {
    return ride.driverRating;
  }
  
  return ride.driver?.rating ?? 4.5;
}

// ✅✅✅ FUNÇÃO AUXILIAR: Obter label de localização para UI
export function getRideLocation(ride: Ride, type: 'from' | 'to'): string {
  if (type === 'from') {
    return ride.fromLocation ?? ride.fromAddress ?? ride.fromProvince ?? '';
  }
  return ride.toLocation ?? ride.toAddress ?? ride.toProvince ?? '';
}

// ✅✅✅ FUNÇÃO AUXILIAR: Obter route compatibility para UI
export function getRouteCompatibility(ride: Ride): number | undefined {
  return ride.route_compatibility !== undefined ? ride.route_compatibility : ride.matchScore;
}

// ✅✅✅ FUNÇÃO AUXILIAR: Obter match type para UI
export function getMatchType(ride: Ride): string | undefined {
  return ride.match_type !== undefined ? ride.match_type : ride.matchType;
}

// ✅✅✅ FUNÇÃO AUXILIAR: Obter match description para UI
export function getMatchDescription(ride: Ride): string | undefined {
  return ride.match_description !== undefined ? ride.match_description : ride.matchDescription;
}

// ✅✅✅ FUNÇÃO PARA DETERMINAR SE É UMA BUSCA INTELIGENTE
export function isSmartSearch(ride: Ride): boolean {
  return !!(ride.match_type || ride.route_compatibility || ride.match_description);
}

// ✅✅✅ FUNÇÃO PARA OBTER BADGE DE COMPATIBILIDADE
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

  // ===== RIDES API COMPLETAMENTE CORRIGIDA =====
  async searchRides(params: RideSearchParams): Promise<RideSearchResponse> {
    try {
      // ✅✅✅ PRIMEIRO TENTA BUSCA INTELIGENTE SE smartSearch=true
      if (params.smartSearch !== false) {
        try {
          const searchParams = new URLSearchParams();
          if (params.from) searchParams.append('from', params.from);
          if (params.to) searchParams.append('to', params.to);
          if (params.passengers) searchParams.append('passengers', params.passengers.toString());
          if (params.date) searchParams.append('date', params.date);
          // ✅✅✅ NOVO: Usar radiusKm para busca inteligente (padrão 100km)
          const radiusKm = params.radiusKm || params.maxDistance || 100;
          searchParams.append('radiusKm', radiusKm.toString());
          
          console.log(`🧠 FRONTEND: Buscando rides inteligentes: ${params.from} → ${params.to} (raio: ${radiusKm}km)`);
          
          const response = await this.request<any>('GET', `/api/rides/smart/search?${searchParams.toString()}`);
          
          // ✅✅✅ NORMALIZAR RESPOSTA DO BACKEND COM NOVOS DADOS
          if (response.success && response.data) {
            const searchParamsResponse = {
              from: params.from || '',
              to: params.to || '',
              date: params.date,
              passengers: params.passengers,
              smartSearch: true,
              radiusKm: radiusKm,
              searchMethod: response.data.searchParams?.searchMethod || 'smart_final_direct',
              appliedFilters: params,
              normalization: response.data.debug_info?.normalization_applied ? {
                applied: true,
                original: response.data.debug_info.original_input,
                normalized: response.data.debug_info.normalized_input
              } : undefined
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
        } catch (smartError) {
          console.warn('❌ FRONTEND: Busca inteligente falhou, usando busca tradicional:', smartError);
        }
      }
      
      // ✅✅✅ FALLBACK PARA BUSCA TRADICIONAL
      const searchParams = new URLSearchParams();
      if (params.from) searchParams.append('from', params.from);
      if (params.to) searchParams.append('to', params.to);
      if (params.date) searchParams.append('date', params.date);
      if (params.passengers) searchParams.append('passengers', params.passengers.toString());
      if (params.minPrice) searchParams.append('minPrice', params.minPrice.toString());
      if (params.maxPrice) searchParams.append('maxPrice', params.maxPrice.toString());
      if (params.vehicleType) searchParams.append('vehicleType', params.vehicleType);

      console.log(`🔍 FRONTEND: Buscando rides tradicionais: ${params.from} → ${params.to}`);
      
      // ✅✅✅ CORREÇÃO: Usar endpoint de busca inteligente como fallback
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
        smart_search: response.smart_search || response.data?.smart_search || false
      };
      
    } catch (error) {
      console.error('❌ FRONTEND: Erro na busca de rides:', error);
      throw error;
    }
  }

  // ✅✅✅ BUSCA INTELIGENTE ESPECÍFICA
  async searchSmartRides(params: {
    from: string;
    to: string;
    date?: string;
    passengers?: number;
    radiusKm?: number;
  }): Promise<RideSearchResponse> {
    const searchParams = new URLSearchParams();
    searchParams.append('from', params.from);
    searchParams.append('to', params.to);
    if (params.date) searchParams.append('date', params.date);
    if (params.passengers) searchParams.append('passengers', params.passengers.toString());
    const radiusKm = params.radiusKm || 100;
    searchParams.append('radiusKm', radiusKm.toString());

    console.log(`🧠 FRONTEND: Busca SMART específica: ${params.from} → ${params.to} (${radiusKm}km)`);

    const response = await this.request<any>('GET', `/api/rides/smart/search?${searchParams.toString()}`);
    
    if (response.success && response.data) {
      const searchParamsResponse = {
        from: params.from,
        to: params.to,
        date: params.date,
        passengers: params.passengers,
        smartSearch: true,
        radiusKm: radiusKm,
        searchMethod: response.data.searchParams?.searchMethod || 'smart_final_direct',
        appliedFilters: params,
        normalization: response.data.debug_info?.normalization_applied ? {
          applied: true,
          original: response.data.debug_info.original_input,
          normalized: response.data.debug_info.normalized_input
        } : undefined
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

  // ✅✅✅ BUSCA UNIVERSAL INTELIGENTE
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