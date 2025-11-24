// src/api/client/rides.ts
import { apiRequest } from '../../shared/lib/queryClient';

// ✅ Interface de parâmetros de busca COMPLETA
export interface RideSearchParams {
  from?: string;
  to?: string;
  date?: string;
  passengers?: number;
  maxPrice?: number;
  minPrice?: number;
  page?: number;
  limit?: number;
  smartSearch?: boolean;
  vehicleType?: string;
  fromLat?: number;
  fromLng?: number;
  toLat?: number;
  toLng?: number;
  radius?: number;
  maxDistance?: number;
  radiusKm?: number;
}

// ✅ Interface Ride - estrutura direta do backend COMPLETA
export interface Ride {
  ride_id: string;
  driver_id: string;
  driver_name: string;
  driver_rating: string;
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
  priceperseat: string;

  distance_from_city_km: number;
  distance_to_city_km: number;

  // ✅ Campos de matching inteligente
  match_type?: string;
  route_compatibility?: number;
  match_description?: string;

  // ✅ Campos de metadados de busca
  search_metadata?: {
    original_search: { from: string; to: string };
    normalized_search: { from: string; to: string };
    function_used?: string;
    fallback_used?: boolean;
  };
}

// ✅ Interface de estatísticas de matching
export interface MatchStats {
  exact_match?: number;
  same_segment?: number;
  same_direction?: number;
  same_origin?: number;
  same_destination?: number;
  potential?: number;
  traditional?: number;
  smart_matches?: number;
  drivers_with_ratings?: number;
  average_driver_rating?: number;
  vehicle_types?: Record<string, number>;
  total: number;
}

// ✅ Interface de resposta completa
export interface RideSearchResponse {
  success: boolean;
  rides: Ride[];
  matchStats?: MatchStats;
  total?: number;
  smart_search?: boolean;
  data?: any;
  searchParams?: {
    from: string;
    to: string;
    date?: string;
    passengers?: number;
    smartSearch: boolean;
    appliedFilters?: any;
    radiusKm?: number;
    searchMethod?: string;
    normalization?: {
      applied: boolean;
      original: { from: string; to: string };
      normalized: { from: string; to: string };
    };
  };
}

// ✅ WRAPPERS genéricos para requisições
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

// ✅ FUNÇÃO AUXILIAR: Construir parâmetros de busca tradicional
function buildRideParams(params: RideSearchParams): URLSearchParams {
  const searchParams = new URLSearchParams();
  
  if (params.from) searchParams.append('from', params.from);
  if (params.to) searchParams.append('to', params.to);
  if (params.date) searchParams.append('date', params.date);
  if (params.passengers) searchParams.append('passengers', params.passengers.toString());
  if (params.minPrice) searchParams.append('minPrice', params.minPrice.toString());
  if (params.maxPrice) searchParams.append('maxPrice', params.maxPrice.toString());
  if (params.vehicleType) searchParams.append('vehicleType', params.vehicleType);
  if (params.smartSearch !== undefined) searchParams.append('smartSearch', params.smartSearch.toString());
  
  return searchParams;
}

// ✅ FUNÇÃO AUXILIAR: Construir parâmetros para busca inteligente
function buildSmartSearchParams(params: RideSearchParams): URLSearchParams {
  const searchParams = new URLSearchParams();
  
  if (params.from) searchParams.append('from', params.from);
  if (params.to) searchParams.append('to', params.to);
  if (params.date) searchParams.append('date', params.date);
  if (params.passengers) searchParams.append('passengers', params.passengers.toString());
  
  const radiusKm = params.radiusKm || params.maxDistance || params.radius || 100;
  searchParams.append('radiusKm', radiusKm.toString());
  
  if (params.fromLat) searchParams.append('fromLat', params.fromLat.toString());
  if (params.fromLng) searchParams.append('fromLng', params.fromLng.toString());
  if (params.toLat) searchParams.append('toLat', params.toLat.toString());
  if (params.toLng) searchParams.append('toLng', params.toLng.toString());
  
  return searchParams;
}

// ✅ CLIENT API principal COMPLETA
export const clientRidesApi = {
  // ✅ Busca principal com fallback inteligente/tradicional
  search: async (params: RideSearchParams): Promise<RideSearchResponse> => {
    console.log('🔍 [CLIENT API] Buscando viagens:', params);
    
    try {
      // ✅ Primeiro tenta busca inteligente se solicitada
      if (params.smartSearch !== false) {
        try {
          const smartParams = buildSmartSearchParams(params);
          const radiusKm = params.radiusKm || params.maxDistance || params.radius || 100;
          
          console.log('🧠 [CLIENT API] Tentando busca inteligente...', {
            from: params.from,
            to: params.to,
            radiusKm
          });
          
          const smartData = await apiGet<any>(`/api/rides/smart/search?${smartParams}`);
          
          if (smartData.success && smartData.data) {
            console.log('✅ [CLIENT API] Busca inteligente bem-sucedida:', {
              rides: smartData.data.rides?.length || 0
            });
            
            return {
              success: true,
              rides: smartData.data.rides || [],
              matchStats: smartData.data.stats,
              total: smartData.data.rides?.length || 0,
              smart_search: true,
              data: smartData.data,
              searchParams: {
                from: params.from || '',
                to: params.to || '',
                date: params.date,
                passengers: params.passengers,
                smartSearch: true,
                radiusKm: radiusKm,
                searchMethod: smartData.data.searchParams?.searchMethod || 'smart_final_direct',
                appliedFilters: params,
                normalization: smartData.data.debug_info?.normalization_applied ? {
                  applied: true,
                  original: smartData.data.debug_info.original_input,
                  normalized: smartData.data.debug_info.normalized_input
                } : undefined
              }
            };
          }
        } catch (smartError) {
          console.warn('⚠️ [CLIENT API] Busca inteligente falhou, usando tradicional:', smartError);
        }
      }
      
      // ✅ Fallback para busca tradicional
      const traditionalParams = buildRideParams(params);
      console.log('🔍 [CLIENT API] Usando busca tradicional...');
      
      const traditionalData = await apiGet<any>(`/api/rides/search?${traditionalParams}`);
      
      console.log('✅ [CLIENT API] Busca tradicional bem-sucedida:', {
        rides: traditionalData.rides?.length || traditionalData.data?.rides?.length || 0
      });

      const ridesData = traditionalData.rides || traditionalData.data?.rides || [];
      
      return {
        success: true,
        rides: ridesData,
        matchStats: traditionalData.matchStats || traditionalData.data?.stats,
        total: traditionalData.total || traditionalData.data?.total || ridesData.length,
        smart_search: false,
        data: traditionalData.data,
        searchParams: {
          from: params.from || '',
          to: params.to || '',
          date: params.date,
          passengers: params.passengers,
          smartSearch: false,
          appliedFilters: params
        }
      };
      
    } catch (error) {
      console.error('❌ [CLIENT API] Erro na busca de viagens:', error);
      throw error;
    }
  },

  // ✅ Busca inteligente específica
  searchSmart: async (params: {
    from: string;
    to: string;
    date?: string;
    passengers?: number;
    radiusKm?: number;
  }): Promise<RideSearchResponse> => {
    console.log('🧠 [CLIENT API] Busca SMART específica:', params);
    
    const smartParams = buildSmartSearchParams(params);
    const radiusKm = params.radiusKm || 100;
    
    console.log(`🧠 [CLIENT API] Buscando rides inteligentes: ${params.from} → ${params.to} (${radiusKm}km)`);

    const smartData = await apiGet<any>(`/api/rides/smart/search?${smartParams}`);
    
    if (smartData.success && smartData.data) {
      return {
        success: true,
        rides: smartData.data.rides || [],
        matchStats: smartData.data.stats,
        total: smartData.data.rides?.length || 0,
        smart_search: true,
        data: smartData.data,
        searchParams: {
          from: params.from,
          to: params.to,
          date: params.date,
          passengers: params.passengers,
          smartSearch: true,
          radiusKm: radiusKm,
          searchMethod: smartData.data.searchParams?.searchMethod || 'smart_final_direct',
          appliedFilters: params
        }
      };
    }

    throw new Error('Busca inteligente falhou');
  },

  // ✅ Busca universal inteligente
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

    const data = await apiGet<any>(`/api/rides/search/universal?${searchParams.toString()}`);
    
    if (data.success && data.data) {
      return {
        success: true,
        rides: data.data.rides || [],
        matchStats: data.data.stats,
        total: data.data.rides?.length || 0,
        smart_search: data.data.smart_search || true,
        data: data.data,
        searchParams: {
          from: params.from || '',
          to: params.to || '',
          smartSearch: true,
          radiusKm: radiusKm,
          appliedFilters: params
        }
      };
    }

    throw new Error('Busca universal falhou');
  },

  // ✅ Detalhes de um ride específico
  getDetails: async (rideId: string): Promise<{ success: boolean; ride: Ride }> => {
    console.log('🔍 [CLIENT API] Buscando detalhes da viagem:', rideId);
    
    try {
      const data = await apiGet<any>(`/api/rides/${rideId}`);
      
      if (data.success) {
        const rideData = data.data?.ride || data.ride || data;
        return {
          success: true,
          ride: rideData
        };
      } else {
        throw new Error(data.message || 'Erro ao buscar detalhes da viagem');
      }
    } catch (error) {
      console.error('❌ [CLIENT API] Erro ao buscar detalhes:', error);
      throw error;
    }
  },

  // ✅ Rides próximos a uma localização
  getNearby: async (location: string, radius: number = 50, passengers: number = 1): Promise<RideSearchResponse> => {
    console.log('📍 [CLIENT API] Buscando rides próximos:', { location, radius, passengers });
    
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('location', location);
      queryParams.append('radius', radius.toString());
      queryParams.append('passengers', passengers.toString());

      const data = await apiGet<any>(`/api/rides/nearby?${queryParams}`);
      
      const ridesData = data.rides || data.data?.rides || [];
      
      return {
        success: true,
        rides: ridesData,
        matchStats: data.matchStats || data.data?.stats,
        total: data.total || data.data?.total || ridesData.length,
        smart_search: data.smart_search || data.data?.smart_search || false,
        data: data.data,
        searchParams: {
          from: location,
          to: location,
          passengers,
          smartSearch: false,
          appliedFilters: { location, radius, passengers }
        }
      };
    } catch (error) {
      console.error('❌ [CLIENT API] Erro ao buscar rides próximos:', error);
      throw error;
    }
  },

  // ✅ Solicitar reserva de ride
  requestRide: async (rideId: string, passengers: number, pickupLocation?: string, notes?: string): Promise<{ 
    success: boolean; 
    message: string; 
    booking: any;
    rideDetails: any;
  }> => {
    console.log('📋 [CLIENT API] Solicitando viagem:', { rideId, passengers });
    
    try {
      const data = await apiPost<any>('/api/bookings', {
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
          rideDetails: data.data?.rideDetails || data.rideDetails
        };
      } else {
        throw new Error(data.message || 'Erro ao solicitar viagem');
      }
    } catch (error) {
      console.error('❌ [CLIENT API] Erro ao solicitar viagem:', error);
      throw error;
    }
  },

  // ✅ Rides de um motorista específico
  getByDriver: async (driverId: string): Promise<{ success: boolean; rides: Ride[] }> => {
    console.log('👤 [CLIENT API] Buscando viagens do motorista:', driverId);
    
    try {
      const data = await apiGet<any>(`/api/rides/driver/${driverId}`);
      
      const ridesData = data.rides || data.data?.rides || [];
      
      return {
        success: true,
        rides: ridesData
      };
    } catch (error) {
      console.error('❌ [CLIENT API] Erro ao buscar viagens do motorista:', error);
      throw error;
    }
  },

  // ✅ Estatísticas de matching
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
      
      const data = await apiGet<any>(`/api/rides/match-stats?${queryParams}`);
      
      return {
        success: true,
        stats: data.data?.stats || data.stats,
        recommendations: data.data?.recommendations || data.recommendations
      };
    } catch (error) {
      console.error('❌ [CLIENT API] Erro ao buscar estatísticas:', error);
      throw error;
    }
  }
};

export default clientRidesApi;