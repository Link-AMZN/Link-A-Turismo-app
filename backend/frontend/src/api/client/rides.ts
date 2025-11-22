import { apiRequest } from '../../shared/lib/queryClient';

export interface RideSearchParams {
  from?: string;
  to?: string;
  date?: string;
  passengers?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
  smartSearch?: boolean;
  minPrice?: number;
  vehicleType?: string;
  fromCity?: string;
  toCity?: string;
  // ✅ CAMPOS DE COORDENADAS PARA BUSCA INTELIGENTE
  fromLat?: number;
  fromLng?: number;
  toLat?: number;
  toLng?: number;
  radius?: number;
  maxDistance?: number; // ✅ NOVO: Parâmetro específico para busca inteligente
}

export interface Ride {
  id: string;
  driverId: string;
  fromAddress: string;
  toAddress: string;
  fromProvince?: string;
  toProvince?: string;
  fromCity?: string;
  toCity?: string;
  fromLocation?: string;
  toLocation?: string;
  departureDate: string;
  departureTime: string;
  availableSeats: number;
  maxPassengers?: number;
  pricePerSeat: number;
  price?: number;
  vehicleType: string;
  vehicleInfo?: string;
  vehicleFeatures?: string[];
  description?: string;
  status: string;
  allowNegotiation: boolean;
  isRecurring: boolean;
  createdAt: string;
  updatedAt: string;
  
  driver?: {
    id: string;
    firstName: string;
    lastName: string;
    rating?: number;
    isVerified?: boolean;
    profileImageUrl?: string;
  };
  
  // ✅ CAMPOS DE MATCHING INTELIGENTE DO BACKEND
  match_type?: string;
  route_compatibility?: number;
  match_description?: string;
  
  // ✅ CAMPOS DE COMPATIBILIDADE PARA FRONTEND
  matchScore?: number;
  matchType?: string;
  matchDescription?: string;
  
  estimatedDuration?: number;
  estimatedDistance?: number;
  isVerifiedDriver?: boolean;
  driverRating?: number;
  currentPassengers?: number;
  type?: string;
  driverName?: string;
  vehiclePhoto?: string | null;
  availableIn?: number;
  isRoundTrip?: boolean;
  allowPickupEnRoute?: boolean;
}

export interface MatchStats {
  exact_match?: number;
  same_segment?: number;
  same_direction?: number;
  same_origin?: number;
  same_destination?: number;
  potential?: number;
  traditional?: number;
  smart_matches?: number; // ✅ NOVO: Campo específico para busca inteligente
  total: number;
}

export interface SearchParams {
  from: string;
  to: string;
  date?: string;
  passengers?: number;
  smartSearch: boolean;
  appliedFilters?: any;
  location?: string;
  radius?: number;
  radiusKm?: number; // ✅ NOVO: Raio usado na busca
  searchMethod?: string; // ✅ NOVO: Método de busca usado
}

export interface RideSearchResponse {
  success: boolean;
  rides: Ride[];
  matchStats?: MatchStats;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
  searchParams?: SearchParams;
  total?: number;
  data?: {
    rides: Ride[];
    stats?: MatchStats;
    searchParams?: SearchParams;
    smart_search?: boolean; // ✅ NOVO: Indicador de busca inteligente
  };
  smart_search?: boolean; // ✅ NOVO: Indicador global de busca inteligente
}

// ✅ Interface para resposta da API
interface ApiResponse {
  success: boolean;
  data?: any;
  rides?: any[];
  ride?: any;
  stats?: MatchStats;
  total?: number;
  pagination?: any;
  matchStats?: MatchStats;
  message?: string;
  booking?: any;
  rideDetails?: any;
  recommendations?: string[];
  smart_search?: boolean; // ✅ NOVO: Suporte para indicador de busca inteligente
}

// ✅ FUNÇÃO AUXILIAR: Normalizar cidade
const normalizeCity = (city?: string) => city?.trim().toLowerCase() ?? '';

// ✅ FUNÇÃO AUXILIAR: Converter para número com fallback
const toNumber = (value: any, fallback = 0) => {
  if (value === null || value === undefined) return fallback;
  const n = Number(value);
  return isNaN(n) ? fallback : n;
};

// ✅ FUNÇÃO AUXILIAR: Construir parâmetros de busca
function buildRideParams(params: RideSearchParams): URLSearchParams {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  
  return searchParams;
}

// ✅ FUNÇÃO AUXILIAR: Construir parâmetros para busca inteligente
function buildSmartSearchParams(params: RideSearchParams): URLSearchParams {
  const searchParams = new URLSearchParams();
  
  // ✅ PARÂMETROS ESPECÍFICOS PARA BUSCA INTELIGENTE
  if (params.from) searchParams.append('from', params.from);
  if (params.to) searchParams.append('to', params.to);
  if (params.date) searchParams.append('date', params.date);
  if (params.passengers) searchParams.append('passengers', params.passengers.toString());
  
  // ✅ RAIO DE BUSCA INTELIGENTE (padrão 100km)
  const maxDistance = params.maxDistance || params.radius || 100;
  searchParams.append('maxDistance', maxDistance.toString());
  
  return searchParams;
}

// ✅ FUNÇÃO AUXILIAR: Construir resposta padronizada
function buildRideSearchResponse(
  rides: any[], 
  stats?: MatchStats, 
  params?: SearchParams,
  pagination?: any,
  smartSearch: boolean = false
): RideSearchResponse {
  return {
    success: true,
    rides: normalizeRides(rides),
    matchStats: stats || createDefaultMatchStats(),
    searchParams: params || { from: '', to: '', smartSearch },
    pagination,
    total: rides.length,
    smart_search: smartSearch // ✅ NOVO: Indicador explícito
  };
}

// ✅ WRAPPER GENÉRICO PARA API REQUESTS
async function apiGet<T>(url: string): Promise<T> {
  const res = await apiRequest('GET', url) as Response;
  const data = await res.json();
  return data as T;
}

async function apiPost<T>(url: string, body?: any): Promise<T> {
  const res = await apiRequest('POST', url, body) as Response;
  const data = await res.json();
  return data as T;
}

// ✅ FUNÇÃO AUXILIAR: Normalizar ride do backend para frontend
function normalizeRide(backendRide: any): Ride {
  const normalized: Ride = {
    id: backendRide.id ?? backendRide.ride_id ?? '',
    driverId: backendRide.driverId ?? backendRide.driver_id ?? '',
    fromAddress: backendRide.fromAddress ?? backendRide.from_address ?? backendRide.fromLocation ?? '',
    toAddress: backendRide.toAddress ?? backendRide.to_address ?? backendRide.toLocation ?? '',
    fromProvince: backendRide.fromProvince ?? backendRide.from_province,
    toProvince: backendRide.toProvince ?? backendRide.to_province,
    fromCity: normalizeCity(backendRide.fromCity ?? backendRide.from_city),
    toCity: normalizeCity(backendRide.toCity ?? backendRide.to_city),
    fromLocation: backendRide.fromAddress ?? backendRide.from_address ?? backendRide.fromLocation ?? backendRide.from_city ?? '',
    toLocation: backendRide.toAddress ?? backendRide.to_address ?? backendRide.toLocation ?? backendRide.to_city ?? '',
    departureDate: backendRide.departureDate ?? backendRide.departure_date ?? '',
    departureTime: backendRide.departureTime ?? backendRide.departure_time ?? '08:00',
    availableSeats: toNumber(backendRide.availableSeats ?? backendRide.available_seats),
    maxPassengers: toNumber(backendRide.maxPassengers ?? backendRide.max_passengers, toNumber(backendRide.availableSeats ?? backendRide.available_seats, 4)),
    pricePerSeat: toNumber(backendRide.pricePerSeat ?? backendRide.price_per_seat ?? backendRide.price),
    price: toNumber(backendRide.pricePerSeat ?? backendRide.price_per_seat ?? backendRide.price),
    vehicleType: backendRide.vehicleType ?? backendRide.vehicle_type ?? 'car',
    status: backendRide.status ?? 'active',
    allowNegotiation: backendRide.allowNegotiation ?? false,
    isRecurring: backendRide.isRecurring ?? false,
    createdAt: backendRide.createdAt ?? new Date().toISOString(),
    updatedAt: backendRide.updatedAt ?? new Date().toISOString(),
  };

  // Campos opcionais
  if (backendRide.vehicleInfo !== undefined) normalized.vehicleInfo = backendRide.vehicleInfo;
  if (backendRide.vehicleFeatures !== undefined) normalized.vehicleFeatures = backendRide.vehicleFeatures;
  if (backendRide.description !== undefined) normalized.description = backendRide.description;

  // ✅ CAMPOS DE MATCHING DO BACKEND (snake_case)
  if (backendRide.match_type !== undefined) normalized.match_type = backendRide.match_type;
  if (backendRide.route_compatibility !== undefined) normalized.route_compatibility = backendRide.route_compatibility;
  if (backendRide.match_description !== undefined) normalized.match_description = backendRide.match_description;

  // ✅ CAMPOS DE COMPATIBILIDADE PARA FRONTEND (camelCase)
  normalized.matchType = backendRide.match_type !== undefined ? backendRide.match_type : backendRide.matchType;
  normalized.matchScore = backendRide.route_compatibility !== undefined ? backendRide.route_compatibility : backendRide.matchScore;
  normalized.matchDescription = backendRide.match_description !== undefined ? backendRide.match_description : backendRide.matchDescription;

  // Informações do driver
  if (backendRide.driver) {
    normalized.driver = {
      id: backendRide.driver.id || backendRide.driverId || backendRide.driver_id,
      firstName: backendRide.driver.firstName ?? backendRide.driver_name?.split(' ')[0] ?? '',
      lastName: backendRide.driver.lastName ?? backendRide.driver_name?.split(' ').slice(1).join(' ') ?? '',
      rating: toNumber(backendRide.driver.rating),
      isVerified: backendRide.driver.isVerified ?? false,
      profileImageUrl: backendRide.driver.profileImageUrl
    };
    normalized.driverName = `${normalized.driver.firstName} ${normalized.driver.lastName}`.trim();
    normalized.isVerifiedDriver = normalized.driver.isVerified;
    normalized.driverRating = normalized.driver.rating;
  }

  // ✅ CORREÇÃO: Campos específicos do driver_name do backend
  if (backendRide.driver_name && !normalized.driverName) {
    normalized.driverName = backendRide.driver_name;
  }

  // Campos de UI calculados
  if (backendRide.estimatedDuration !== undefined) normalized.estimatedDuration = toNumber(backendRide.estimatedDuration);
  if (backendRide.estimatedDistance !== undefined) normalized.estimatedDistance = toNumber(backendRide.estimatedDistance);
  if (backendRide.currentPassengers !== undefined) normalized.currentPassengers = toNumber(backendRide.currentPassengers);
  if (backendRide.type !== undefined) normalized.type = backendRide.type;
  if (backendRide.vehiclePhoto !== undefined) normalized.vehiclePhoto = backendRide.vehiclePhoto;
  if (backendRide.availableIn !== undefined) normalized.availableIn = toNumber(backendRide.availableIn);
  if (backendRide.isRoundTrip !== undefined) normalized.isRoundTrip = backendRide.isRoundTrip;
  if (backendRide.allowPickupEnRoute !== undefined) normalized.allowPickupEnRoute = backendRide.allowPickupEnRoute;

  return normalized;
}

// ✅ FUNÇÃO AUXILIAR: Normalizar lista de rides
function normalizeRides(backendRides: any[]): Ride[] {
  return (backendRides || []).map(normalizeRide);
}

// ✅ FUNÇÃO AUXILIAR: Criar MatchStats padrão
function createDefaultMatchStats(): MatchStats {
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

// ✅ FUNÇÃO AUXILIAR: Detectar se é busca inteligente
export function isSmartSearch(ride: Ride): boolean {
  return !!(ride.match_type || ride.route_compatibility || ride.match_description);
}

// ✅ FUNÇÃO AUXILIAR: Obter badge de compatibilidade
export function getCompatibilityBadge(ride: Ride): { label: string; color: string } {
  const compatibility = ride.route_compatibility ?? ride.matchScore;
  
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

// ✅ CACHE OPACIONAL PARA BUSCAS
const getCachedResults = <T>(cacheKey: string): T | null => {
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      return JSON.parse(cached) as T;
    }
  } catch (error) {
    console.warn('⚠️ Erro ao recuperar cache:', error);
  }
  return null;
};

const setCachedResults = <T>(cacheKey: string, data: T): void => {
  try {
    sessionStorage.setItem(cacheKey, JSON.stringify(data));
  } catch (error) {
    console.warn('⚠️ Erro ao salvar cache:', error);
  }
};

// API Client para clientes buscarem viagens
export const clientRidesApi = {
  // Buscar viagens disponíveis com sistema inteligente
  search: async (params: RideSearchParams): Promise<RideSearchResponse> => {
    console.log('🔍 [CLIENT API] Buscando viagens:', params);
    
    // ✅ VERIFICAR CACHE
    const cacheKey = `rides_${JSON.stringify(params)}`;
    const cached = getCachedResults<RideSearchResponse>(cacheKey);
    if (cached) {
      console.log('✅ [CLIENT API] Usando resultados em cache');
      return cached;
    }
    
    try {
      // ✅ PRIMEIRO TENTA BUSCA INTELIGENTE SE smartSearch=true
      if (params.smartSearch !== false) {
        try {
          // ✅ USAR FUNÇÃO ESPECÍFICA PARA BUSCA INTELIGENTE
          const smartParams = buildSmartSearchParams(params);
          console.log('🧠 [CLIENT API] Tentando busca inteligente...', {
            from: params.from,
            to: params.to,
            maxDistance: params.maxDistance || params.radius || 100
          });
          
          const smartData = await apiGet<ApiResponse>(`/api/rides/smart/search?${smartParams}`);
          
          if (smartData.success && smartData.data) {
            console.log('✅ [CLIENT API] Busca inteligente bem-sucedida:', {
              rides: smartData.data.rides?.length || 0,
              stats: smartData.data.stats,
              method: smartData.data.searchParams?.searchMethod
            });
            
            const searchParams: SearchParams = {
              from: params.from || '',
              to: params.to || '',
              date: params.date,
              passengers: params.passengers,
              smartSearch: true,
              radiusKm: params.maxDistance || params.radius || 100,
              searchMethod: smartData.data.searchParams?.searchMethod || 'smart_final_direct',
              appliedFilters: params
            };
            
            const response = buildRideSearchResponse(
              smartData.data.rides || [],
              smartData.data.stats,
              searchParams,
              undefined,
              true // ✅ Indicar que é busca inteligente
            );
            
            // ✅ SALVAR NO CACHE
            setCachedResults(cacheKey, response);
            return response;
          }
        } catch (smartError) {
          console.warn('⚠️ [CLIENT API] Busca inteligente falhou, usando tradicional:', smartError);
        }
      }
      
      // ✅ FALLBACK PARA BUSCA TRADICIONAL
      const traditionalParams = buildRideParams(params);
      traditionalParams.append('status', 'active');

      console.log('🔍 [CLIENT API] Usando busca tradicional...');
      
      // ✅✅✅ CORREÇÃO CRÍTICA: Mudar de /api/rides/search para /api/rides/smart/search
      const traditionalData = await apiGet<ApiResponse>(`/api/rides/smart/search?${traditionalParams}`);
      
      console.log('✅ [CLIENT API] Busca tradicional bem-sucedida:', {
        rides: traditionalData.rides?.length || traditionalData.data?.rides?.length || 0
      });

      const ridesData = traditionalData.rides || traditionalData.data?.rides || [];
      
      const searchParams: SearchParams = {
        from: params.from || '',
        to: params.to || '',
        date: params.date,
        passengers: params.passengers,
        smartSearch: false,
        appliedFilters: params
      };
      
      const response = buildRideSearchResponse(
        ridesData,
        traditionalData.matchStats || traditionalData.data?.stats,
        searchParams,
        traditionalData.pagination || traditionalData.data?.pagination || {
          page: params.page || 1,
          limit: params.limit || 20,
          total: traditionalData.total || traditionalData.data?.total || ridesData.length,
          totalPages: Math.ceil((traditionalData.total || traditionalData.data?.total || ridesData.length) / (params.limit || 20)),
          hasMore: (params.page || 1) < Math.ceil((traditionalData.total || traditionalData.data?.total || ridesData.length) / (params.limit || 20))
        },
        false // ❌ Não é busca inteligente
      );
      
      // ✅ SALVAR NO CACHE
      setCachedResults(cacheKey, response);
      return response;
      
    } catch (error) {
      console.error('❌ [CLIENT API] Erro na busca de viagens:', error);
      throw error;
    }
  },

  // ✅ NOVO: Busca inteligente específica
  searchSmart: async (params: {
    from: string;
    to: string;
    date?: string;
    passengers?: number;
    maxDistance?: number;
  }): Promise<RideSearchResponse> => {
    console.log('🧠 [CLIENT API] Busca SMART específica:', params);
    
    const smartParams = buildSmartSearchParams(params);
    const maxDistance = params.maxDistance || 100;
    
    console.log(`🧠 [CLIENT API] Buscando rides inteligentes: ${params.from} → ${params.to} (${maxDistance}km)`);

    const smartData = await apiGet<ApiResponse>(`/api/rides/smart/search?${smartParams}`);
    
    if (smartData.success && smartData.data) {
      const searchParams: SearchParams = {
        from: params.from,
        to: params.to,
        date: params.date,
        passengers: params.passengers,
        smartSearch: true,
        radiusKm: maxDistance,
        searchMethod: smartData.data.searchParams?.searchMethod || 'smart_final_direct',
        appliedFilters: params
      };

      return buildRideSearchResponse(
        smartData.data.rides || [],
        smartData.data.stats,
        searchParams,
        undefined,
        true
      );
    }

    throw new Error('Busca inteligente falhou');
  },

  // ✅ NOVO: Busca universal inteligente
  searchUniversal: async (params: {
    from?: string;
    to?: string;
    lat?: number;
    lng?: number;
    toLat?: number;
    toLng?: number;
    radiusKm?: number;
    maxResults?: number;
  }): Promise<RideSearchResponse> => {
    console.log('🌍 [CLIENT API] Busca universal inteligente', params);
    
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

    const data = await apiGet<ApiResponse>(`/api/rides/search/universal?${searchParams.toString()}`);
    
    if (data.success && data.data) {
      const searchParamsResponse: SearchParams = {
        from: params.from || '',
        to: params.to || '',
        smartSearch: true,
        radiusKm: radiusKm,
        appliedFilters: params
      };

      return buildRideSearchResponse(
        data.data.rides || [],
        data.data.stats,
        searchParamsResponse,
        undefined,
        data.data.smart_search || true
      );
    }

    throw new Error('Busca universal falhou');
  },

  // Obter detalhes de uma viagem específica
  getDetails: async (rideId: string): Promise<{ success: boolean; ride: Ride }> => {
    console.log('🔍 [CLIENT API] Buscando detalhes da viagem:', rideId);
    
    try {
      const data = await apiGet<ApiResponse>(`/api/rides/${rideId}`);
      
      if (data.success) {
        const rideData = data.data?.ride || data.ride || data;
        return {
          success: true,
          ride: normalizeRide(rideData)
        };
      } else {
        throw new Error(data.message || 'Erro ao buscar detalhes da viagem');
      }
    } catch (error) {
      console.error('❌ [CLIENT API] Erro ao buscar detalhes:', error);
      throw error;
    }
  },

  // Buscar rides próximos
  getNearby: async (location: string, radius: number = 50, passengers: number = 1): Promise<RideSearchResponse> => {
    console.log('📍 [CLIENT API] Buscando rides próximos:', { location, radius, passengers });
    
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('location', location);
      queryParams.append('radius', radius.toString());
      queryParams.append('passengers', passengers.toString());
      queryParams.append('status', 'active');

      const data = await apiGet<ApiResponse>(`/api/rides/nearby?${queryParams}`);
      
      const ridesData = data.rides || data.data?.rides || [];
      
      const searchParams: SearchParams = {
        from: location,
        to: location,
        passengers,
        smartSearch: false,
        location,
        radius,
        appliedFilters: { location, radius, passengers }
      };
      
      return buildRideSearchResponse(
        ridesData,
        data.matchStats || data.data?.stats,
        searchParams,
        undefined,
        data.smart_search || data.data?.smart_search || false
      );
    } catch (error) {
      console.error('❌ [CLIENT API] Erro ao buscar rides próximos:', error);
      throw error;
    }
  },

  // Solicitar reserva de viagem
  requestRide: async (rideId: string, passengers: number, pickupLocation?: string, notes?: string): Promise<{ 
    success: boolean; 
    message: string; 
    booking: any;
    rideDetails: any;
  }> => {
    console.log('📋 [CLIENT API] Solicitando viagem:', { rideId, passengers });
    
    try {
      const data = await apiPost<ApiResponse>('/api/bookings', {
        rideId,
        passengers,
        pickupLocation,
        notes,
        type: 'ride'
      });
      
      if (data.success) {
        return {
          success: true,
          message: data.message || 'Reserva solicitada com sucesso',
          booking: data.data?.booking || data.booking,
          rideDetails: data.data?.rideDetails ? normalizeRide(data.data.rideDetails) : data.rideDetails
        };
      } else {
        throw new Error(data.message || 'Erro ao solicitar viagem');
      }
    } catch (error) {
      console.error('❌ [CLIENT API] Erro ao solicitar viagem:', error);
      throw error;
    }
  },

  // Buscar viagens por motorista
  getByDriver: async (driverId: string): Promise<{ success: boolean; rides: Ride[] }> => {
    console.log('👤 [CLIENT API] Buscando viagens do motorista:', driverId);
    
    try {
      const data = await apiGet<ApiResponse>(`/api/rides/driver/${driverId}`);
      
      const ridesData = data.rides || data.data?.rides || [];
      
      return {
        success: true,
        rides: normalizeRides(ridesData)
      };
    } catch (error) {
      console.error('❌ [CLIENT API] Erro ao buscar viagens do motorista:', error);
      throw error;
    }
  },

  // Buscar estatísticas de matching para uma rota específica
  getMatchStats: async (from: string, to: string): Promise<{ 
    success: boolean; 
    stats: MatchStats;
    recommendations?: string[];
  }> => {
    console.log('📊 [CLIENT API] Buscando estatísticas de matching:', { from, to });
    
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('from', from);
      queryParams.append('to', to);
      
      const data = await apiGet<ApiResponse>(`/api/rides/match-stats?${queryParams}`);
      
      return {
        success: true,
        stats: data.data?.stats || data.stats || createDefaultMatchStats(),
        recommendations: data.data?.recommendations || data.recommendations
      };
    } catch (error) {
      console.error('❌ [CLIENT API] Erro ao buscar estatísticas:', error);
      throw error;
    }
  }
};

export default clientRidesApi;