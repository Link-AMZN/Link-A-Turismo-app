// src/services/apiService.ts - VERSÃO CORRIGIDA (CORS FIX)
import { auth } from '@/shared/lib/firebaseConfig';
import { Booking, RideBookingRequest } from '@/shared/types/booking';
import { formatDateOnly, formatTimeOnly, formatLongDate, formatWeekday, formatDateTime } from '../utils/dateFormatter';

// ====================== IMPORTAÇÕES DOS TIPOS UNIFICADOS ======================
import {
  Hotel,
  RoomType,
  HotelCreateRequest,
  HotelUpdateRequest,
  RoomTypeCreateRequest,
  RoomTypeUpdateRequest,
  BulkAvailabilityUpdate,
  HotelOperationResponse,
  HotelListResponse,
  RoomTypeListResponse,
  HotelStatistics,
  HotelPerformance,
  SearchParams,
  SearchResponse,
  HotelSearchResponse,
  AvailabilityCheck,
  NightlyPrice,
  AvailabilityResponse,
  HotelBookingRequest,
  HotelBookingResponse,
  HotelBookingData,
  MyHotelBookingsResponse,
  BookingStatus,
  PaymentStatus,
  ChatMessage,
  ChatThread,
  SendMessageRequest,
  SendMessageResponse,
  Notification,
  NotificationsResponse,
  UploadResponse,
  ApiResponse,
  HotelByIdResponse,
  RoomTypesResponse,
  EventSpace,
  EventSpaceCreateRequest,
  EventSpaceUpdateRequest,
  EventSpaceListResponse,
} from '../types/index';

// ====================== TIPOS RIDE ======================
export type { Ride as LocalRide } from '../types/index';
export type { RideSearchParams as LocalRideSearchParams } from '../types/index';
export type { MatchStats as LocalMatchStats } from '../types/index';
export type { RideSearchResponse as LocalRideSearchResponse } from '../types/index';

// ====================== FUNÇÕES UTILITÁRIAS RIDES ======================
export function normalizeRide(apiRide: any): any {
  const normalized = {
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
    
    match_type: apiRide.match_type || 'traditional',
    direction_score: Number(apiRide.direction_score ?? 0),
    
    from_province: apiRide.from_province || apiRide.fromProvince,
    to_province: apiRide.to_province || apiRide.toProvince,
    
    // Aliases para compatibilidade
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
    
    vehicleInfo: {
      make: apiRide.vehicle_make || apiRide.vehicleMake || '',
      model: apiRide.vehicle_model || apiRide.vehicleModel || '',
      type: apiRide.vehicle_type || apiRide.vehicleType || 'economy',
      typeDisplay: 'Económico',
      typeIcon: '🚗',
      plate: apiRide.vehicle_plate || apiRide.vehiclePlate || '',
      color: apiRide.vehicle_color || apiRide.vehicleColor || '',
      maxPassengers: Number(apiRide.max_passengers ?? apiRide.maxPassengers ?? 4)
    },
    
    route_compatibility: Number(apiRide.direction_score ?? apiRide.route_compatibility ?? 0),
    distanceFromCityKm: Number(apiRide.distance_from_city_km ?? apiRide.distanceFromCityKm ?? 0),
    distanceToCityKm: Number(apiRide.distance_to_city_km ?? apiRide.distanceToCityKm ?? 0),
    
    departureDateFormatted: formatDateOnly(apiRide.departuredate || apiRide.departureDate),
    departureTimeFormatted: formatTimeOnly(apiRide.departuredate || apiRide.departureDate),
    departureDateTimeFormatted: formatDateTime(apiRide.departuredate || apiRide.departureDate),
    departureLongDate: formatLongDate(apiRide.departuredate || apiRide.departureDate),
    departureWeekday: formatWeekday(apiRide.departuredate || apiRide.departureDate)
  };
  
  return normalized;
}

export function normalizeRides(backendRides: any[]): any[] {
  return (backendRides || []).map(normalizeRide);
}

export function createDefaultMatchStats(): any {
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

// ====================== API SERVICE PRINCIPAL ======================

class ApiService {
  private baseURL: string;

  constructor() {
    // ✅ CORREÇÃO: Usar variável de ambiente ou fallback
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    console.log('🚀 ApiService inicializado com baseURL:', this.baseURL);
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = { 
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    try {
      // ✅ CORREÇÃO: Tentar obter token Firebase primeiro
      let token: string | null = null;
      
      // Prioridade 1: Token do Firebase Auth
      if (auth.currentUser) {
        try {
          token = await auth.currentUser.getIdToken();
          console.log('🔐 Token obtido do Firebase Auth');
        } catch (firebaseError) {
          console.debug('Erro ao obter token do Firebase:', firebaseError);
        }
      }
      
      // Prioridade 2: Token do localStorage (fallback)
      if (!token) {
        token = localStorage.getItem('firebaseToken');
        if (token) {
          console.log('🔐 Token obtido do localStorage');
        }
      }
      
      // ✅ CORREÇÃO CRÍTICA: Usar APENAS Authorization header (padrão CORS)
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        
        // ❌ REMOVER ou comentar headers customizados que causam CORS
        // headers['X-Firebase-Token'] = token; // Causa erro CORS se não configurado no backend
        
        // Para debugging, pode manter mas será removido se causar problemas
        if (process.env.NODE_ENV === 'development') {
          // headers['X-Firebase-Token'] = token; // Descomente apenas se backend permitir
        }
      }
      
      // ✅ Adicionar informações do usuário para debugging (opcional)
      const userEmail = localStorage.getItem('userEmail');
      const userUid = localStorage.getItem('userUid');
      
      if (userEmail && process.env.NODE_ENV === 'development') {
        // headers['X-User-Email'] = userEmail; // Descomente apenas se backend permitir
      }
      
      if (userUid && process.env.NODE_ENV === 'development') {
        // headers['X-User-UID'] = userUid; // Descomente apenas se backend permitir
      }
      
    } catch (error) {
      console.debug('Error fetching auth token:', error);
    }
    
    console.log('📤 Headers sendo enviados:', Object.keys(headers));
    return headers;
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: unknown,
    customHeaders?: Record<string, string>
  ): Promise<T> {
    // ✅ CORREÇÃO: Obter headers base
    const baseHeaders = await this.getAuthHeaders();
    const headers = { ...baseHeaders, ...customHeaders };
    const url = `${this.baseURL}${endpoint}`;
    
    // ✅ CORREÇÃO CRÍTICA: Configuração CORS correta
    const config: RequestInit = { 
      method, 
      headers,
      mode: 'cors', // ✅ Especificar modo CORS
      credentials: 'include', // ✅ Incluir cookies se necessário
    };
    
    if (data && method !== 'GET') {
      config.body = JSON.stringify(data);
    }
    
    console.log(`🔐 API Request: ${method} ${url}`, { 
      headers: { 
        ...headers, 
        Authorization: headers.Authorization ? 'Bearer ***' : undefined 
      },
      hasData: !!data 
    });
    
    try {
      const response = await fetch(url, config);
      
      // ✅ CORREÇÃO: Tratar erros de CORS/network
      if (!response.ok) {
        let errorText = 'Erro desconhecido';
        try {
          errorText = await response.text();
        } catch (e) {
          console.debug('Não foi possível ler texto da resposta');
        }
        
        console.error(`❌ API Error ${response.status}:`, errorText);
        
        // Tratamento específico para erros CORS
        if (response.status === 0) {
          throw new Error('Erro de CORS/Network: Não foi possível conectar ao servidor. Verifique: \n1. Servidor está rodando\n2. Configurações CORS no backend\n3. Headers permitidos');
        }
        
        // Tratamento para 403 (Forbidden)
        if (response.status === 403) {
          throw new Error(`403 Forbidden: Você não tem permissão para acessar este recurso. Token: ${headers.Authorization ? 'Presente' : 'Ausente'}`);
        }
        
        // Tratamento para 401 (Unauthorized)
        if (response.status === 401) {
          throw new Error('401 Unauthorized: Sua sessão expirou. Faça login novamente.');
        }
        
        throw new Error(`${response.status}: ${errorText || 'Erro na requisição'}`);
      }
      
      const responseText = await response.text();
      
      // ✅ CORREÇÃO: Tentar parsear JSON
      try {
        const result = JSON.parse(responseText) as T;
        console.log(`✅ API Response ${method} ${endpoint}:`, 
          result && typeof result === 'object' && 'success' in result 
            ? { success: (result as any).success } 
            : 'OK'
        );
        return result;
      } catch (jsonError) {
        // Se não for JSON válido, retornar como texto
        console.log(`✅ API Response (text): ${responseText.substring(0, 100)}...`);
        return { success: true, data: responseText } as T;
      }
      
    } catch (error) {
      console.error('❌ API Request failed:', error);
      
      // ✅ CORREÇÃO: Verificar se é erro de CORS específico
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.error('🔴 ERRO CORS DETECTADO!');
        console.error('Soluções possíveis:');
        console.error('1. Verificar se o backend está rodando em', this.baseURL);
        console.error('2. Verificar configurações CORS no backend');
        console.error('3. Remover headers customizados (X-Firebase-Token, etc.)');
        console.error('4. Usar proxy no Vite/Webpack');
        
        throw new Error(`Erro de CORS: Não foi possível conectar a ${this.baseURL}. Verifique as configurações do servidor.`);
      }
      
      throw error;
    }
  }

  // Métodos HTTP básicos (mantêm os mesmos)
  async get<T>(url: string, params?: any, customHeaders?: Record<string, string>): Promise<T> {
    if (params) {
      const queryParams = new URLSearchParams(params).toString();
      url = `${url}${url.includes('?') ? '&' : '?'}${queryParams}`;
    }
    return this.request<T>('GET', url, undefined, customHeaders);
  }

  async post<T>(url: string, body?: any, customHeaders?: Record<string, string>): Promise<T> {
    return this.request<T>('POST', url, body, customHeaders);
  }

  async put<T>(url: string, body?: any, customHeaders?: Record<string, string>): Promise<T> {
    return this.request<T>('PUT', url, body, customHeaders);
  }

  async delete<T>(url: string, customHeaders?: Record<string, string>): Promise<T> {
    return this.request<T>('DELETE', url, undefined, customHeaders);
  }

  // ====================== MÉTODO DE TESTE CORS ======================
  
  async testCorsConnection(): Promise<{ success: boolean; message: string; corsWorking: boolean }> {
    try {
      // Teste simples sem headers de auth
      const testUrl = `${this.baseURL}/api/health`;
      console.log('🧪 Testando conexão CORS para:', testUrl);
      
      const response = await fetch(testUrl, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          message: `✅ Conexão CORS funcionando! Servidor: ${this.baseURL}`,
          corsWorking: true
        };
      } else {
        return {
          success: false,
          message: `❌ Servidor respondeu com ${response.status}`,
          corsWorking: false
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: `❌ Erro CORS: ${error.message}`,
        corsWorking: false
      };
    }
  }

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
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      credentials: 'include',
      mode: 'cors'
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`${response.status}: ${errorText || 'RPC request failed'}`);
    }
    
    return await response.json() as T;
  }

  // ====================== RIDES API ======================
  
  async searchRides(params: any): Promise<any> {
    try {
      const rpcParams = {
        search_from: params.from || '',
        search_to: params.to || '',
        radius_km: params.radiusKm || params.maxDistance || 100,
        max_results: 50
      };
      
      const rpcResponse = await this.rpcRequest<any[]>('get_rides_smart_final', rpcParams);
      const ridesData = Array.isArray(rpcResponse) ? rpcResponse : [];
      
      const matchStats = {
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
      
      return {
        success: true,
        rides: normalizeRides(ridesData),
        matchStats: matchStats,
        searchParams: {
          from: params.from || '',
          to: params.to || '',
          date: params.date,
          passengers: params.passengers,
          smartSearch: true,
          radiusKm: rpcParams.radius_km,
          searchMethod: 'get_rides_smart_final',
          functionUsed: 'get_rides_smart_final',
          appliedFilters: params
        },
        total: ridesData.length,
        smart_search: true
      };
      
    } catch (error) {
      try {
        const searchParams = new URLSearchParams();
        if (params.from) searchParams.append('from', params.from);
        if (params.to) searchParams.append('to', params.to);
        if (params.date) searchParams.append('date', params.date);
        if (params.passengers) searchParams.append('passengers', params.passengers.toString());

        const response = await this.request<any>('GET', `/api/rides/search?${searchParams.toString()}`);
        const rides = response.results || response.data?.rides || response.rides || [];
        
        return {
          success: true,
          rides: normalizeRides(rides),
          matchStats: response.matchStats || response.data?.stats || createDefaultMatchStats(),
          searchParams: {
            from: params.from || '',
            to: params.to || '',
            date: params.date,
            passengers: params.passengers,
            smartSearch: false,
            appliedFilters: params
          },
          total: response.total || rides.length || 0,
          smart_search: response.smart_search || false
        };
      } catch (fallbackError) {
        throw error;
      }
    }
  }

  async searchSmartRides(params: {
    from: string;
    to: string;
    date?: string;
    passengers?: number;
    radiusKm?: number;
  }): Promise<any> {
    return this.searchRides({
      from: params.from,
      to: params.to,
      date: params.date,
      passengers: params.passengers,
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

  async getRideDetails(rideId: string): Promise<{ success: boolean; data: { ride: any } }> {
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

  // ====================== HOTELS API ======================
  
  async searchHotels(params: SearchParams): Promise<HotelSearchResponse> {
    try {
      return await this.get<HotelSearchResponse>('/api/v2/hotels/search', params);
    } catch (error) {
      return {
        success: false,
        data: [],
        hotels: [],
        count: 0
      };
    }
  }

  // ====================== HOTELS API ======================
  
  async getAllHotels(params?: { 
    limit?: number; 
    offset?: number;
    active?: boolean;
  }): Promise<HotelListResponse> {
    try {
      // ✅ CORREÇÃO: Testar CORS primeiro
      const corsTest = await this.testCorsConnection();
      if (!corsTest.corsWorking) {
        console.error('❌ CORS não está funcionando:', corsTest.message);
        throw new Error(`Problema de CORS: ${corsTest.message}`);
      }
      
      console.log('📡 Buscando todos os hotéis...');
      return await this.get<HotelListResponse>('/api/v2/hotels', params);
    } catch (error) {
      console.error('❌ Erro ao buscar hotéis:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao listar hotéis',
        data: [],
        hotels: [],
        count: 0
      };
    }
  }

  async getHotelById(hotelId: string): Promise<HotelByIdResponse> {
    try {
      return await this.get<HotelByIdResponse>(`/api/v2/hotels/${hotelId}`);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao buscar hotel'
      };
    }
  }

  async checkAvailability(params: {
    hotelId: string;
    roomTypeId: string;
    checkIn: string;
    checkOut: string;
    units?: number;
    promoCode?: string;
  }): Promise<AvailabilityResponse> {
    try {
      return await this.get<AvailabilityResponse>('/api/v2/hotels/availability', params);
    } catch (error) {
      return {
        success: false,
        error: 'Erro na verificação de disponibilidade'
      };
    }
  }

  async createHotelBooking(bookingData: HotelBookingRequest): Promise<HotelBookingResponse> {
    try {
      return await this.post<HotelBookingResponse>('/api/v2/hotels/bookings', bookingData);
    } catch (error) {
      return {
        success: false,
        error: 'Erro ao criar reserva'
      };
    }
  }

  // ====================== GESTÃO DE HOTÉIS ======================

  async createHotel(data: HotelCreateRequest): Promise<HotelOperationResponse> {
    try {
      return await this.post<HotelOperationResponse>('/api/v2/hotels', data);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao criar hotel'
      };
    }
  }

  async updateHotel(hotelId: string, data: HotelUpdateRequest): Promise<HotelOperationResponse> {
    try {
      return await this.put<HotelOperationResponse>(`/api/v2/hotels/${hotelId}`, data);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao atualizar hotel'
      };
    }
  }

  async deleteHotel(hotelId: string): Promise<ApiResponse<{ message: string }>> {
    try {
      return await this.delete<ApiResponse<{ message: string }>>(`/api/v2/hotels/${hotelId}`);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao desativar hotel'
      };
    }
  }

  async getHotelStatsDetailed(hotelId: string): Promise<ApiResponse<HotelStatistics>> {
    try {
      return await this.get<ApiResponse<HotelStatistics>>(`/api/v2/hotels/${hotelId}/stats`);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao obter estatísticas'
      };
    }
  }

  async checkQuickAvailability(params: {
    roomTypeId: string;
    checkIn: string;
    checkOut: string;
    units?: number;
  }): Promise<{ 
    success: boolean; 
    available?: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const response = await this.get<AvailabilityResponse>('/api/v2/hotels/availability/quick', params);
      return {
        success: response.success || false,
        available: response.data?.available,
        data: response.data,
        error: response.error
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro na verificação de disponibilidade'
      };
    }
  }

  async getBookingsByEmail(email: string, status?: BookingStatus): Promise<MyHotelBookingsResponse> {
    try {
      return await this.get<MyHotelBookingsResponse>('/api/v2/hotels/my-bookings', { email, status });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao obter reservas'
      };
    }
  }

  async getBookingDetails(bookingId: string): Promise<ApiResponse<HotelBookingData>> {
    try {
      return await this.get<ApiResponse<HotelBookingData>>(`/api/v2/hotels/bookings/${bookingId}`);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao obter detalhes da reserva'
      };
    }
  }

  async cancelBooking(bookingId: string): Promise<ApiResponse<{ message: string }>> {
    try {
      return await this.post<ApiResponse<{ message: string }>>(`/api/v2/hotels/bookings/${bookingId}/cancel`);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao cancelar reserva'
      };
    }
  }

  // ====================== GESTÃO DE ROOM TYPES ======================

  async createRoomType(hotelId: string, data: RoomTypeCreateRequest): Promise<HotelOperationResponse> {
    try {
      return await this.post<HotelOperationResponse>(`/api/v2/hotels/${hotelId}/room-types`, data);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao criar tipo de quarto'
      };
    }
  }

  async updateRoomType(roomTypeId: string, data: RoomTypeUpdateRequest): Promise<HotelOperationResponse> {
    try {
      return await this.put<HotelOperationResponse>(`/api/v2/hotels/room-types/${roomTypeId}`, data);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao atualizar tipo de quarto'
      };
    }
  }

  async getRoomTypeById(roomTypeId: string): Promise<ApiResponse<RoomType>> {
    try {
      return await this.get<ApiResponse<RoomType>>(`/api/v2/hotels/room-types/${roomTypeId}`);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao obter detalhes do tipo de quarto'
      };
    }
  }

  // ====================== FUNÇÃO deleteRoomType CORRIGIDA ======================

  async deleteRoomType(roomTypeId: string): Promise<ApiResponse<{ message: string }>> {
    console.log('🔍 API: deleteRoomType chamado com ID:', roomTypeId);
    
    // ✅ VALIDAÇÃO ROBUSTA DO ID
    if (!roomTypeId || roomTypeId === 'undefined' || roomTypeId === 'null' || roomTypeId.trim() === '') {
      console.error('❌ API deleteRoomType: ID inválido recebido:', roomTypeId);
      return {
        success: false,
        error: 'ID do tipo de quarto inválido. Não pode ser undefined, null ou vazio.'
      };
    }

    // ✅ VALIDAÇÃO DE FORMATO UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(roomTypeId)) {
      console.error('❌ API deleteRoomType: Formato UUID inválido:', roomTypeId);
      return {
        success: false,
        error: 'Formato do ID do tipo de quarto inválido. Deve ser um UUID válido.'
      };
    }

    try {
      console.log(`🗑️ API: Deletando room type com ID válido: ${roomTypeId}`);
      
      // ✅ CORREÇÃO: Usar apenas headers padrão CORS
      const headers = await this.getAuthHeaders();
      
      console.log('🔐 Headers sendo enviados para delete:', Object.keys(headers));
      
      return await this.delete<ApiResponse<{ message: string }>>(
        `/api/v2/hotels/room-types/${roomTypeId}`,
        headers
      );
    } catch (error) {
      console.error('❌ API deleteRoomType error:', error);
      
      // ✅ TRATAMENTO MELHORADO DE ERROS ESPECÍFICOS
      if (error instanceof Error) {
        if (error.message.includes('403')) {
          return {
            success: false,
            error: 'Você não tem permissão para deletar este tipo de quarto. Verifique se você é o proprietário do hotel.'
          };
        } else if (error.message.includes('401')) {
          return {
            success: false,
            error: 'Autenticação expirada. Faça login novamente.'
          };
        } else if (error.message.includes('404')) {
          return {
            success: false,
            error: 'Tipo de quarto não encontrado. Pode já ter sido deletado.'
          };
        } else if (error.message.includes('CORS')) {
          return {
            success: false,
            error: 'Erro de CORS. Verifique as configurações do servidor.'
          };
        }
        return {
          success: false,
          error: error.message
        };
      }
      
      return {
        success: false,
        error: 'Erro ao desativar tipo de quarto. Verifique sua conexão.'
      };
    }
  }

  async getRoomTypesByHotel(hotelId: string, params?: {
    available?: boolean;
    checkIn?: string;
    checkOut?: string;
  }): Promise<RoomTypeListResponse> {
    try {
      return await this.get<RoomTypeListResponse>(`/api/v2/hotels/${hotelId}/room-types`, params);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao listar tipos de quarto'
      };
    }
  }

  // ✅ CORREÇÃO ADICIONAL: Esta função estava faltando
  async getRoomTypeDetails(hotelId: string, roomTypeId: string): Promise<ApiResponse<RoomType>> {
    try {
      // Primeiro tentar buscar pelo endpoint específico
      return await this.get<ApiResponse<RoomType>>(`/api/v2/hotels/${hotelId}/room-types/${roomTypeId}`);
    } catch (error) {
      try {
        // Fallback: buscar todos e filtrar
        const response = await this.getRoomTypesByHotel(hotelId);
        if (response.success && Array.isArray(response.data)) {
          const roomType = response.data.find((rt: any) => rt.id === roomTypeId || rt.roomTypeId === roomTypeId);
          if (roomType) {
            return {
              success: true,
              data: roomType
            };
          }
        }
        throw new Error('Tipo de quarto não encontrado');
      } catch (fallbackError) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Erro ao obter detalhes do tipo de quarto'
        };
      }
    }
  }

  // ====================== GESTÃO DE EVENT SPACES ======================

  async getEventSpacesByHotel(hotelId: string): Promise<EventSpaceListResponse> {
    try {
      return await this.get<EventSpaceListResponse>(`/api/v2/hotels/${hotelId}/event-spaces`);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao listar espaços para eventos',
        data: [],
        count: 0
      };
    }
  }

  async getEventSpaceById(eventSpaceId: string): Promise<ApiResponse<EventSpace>> {
    try {
      return await this.get<ApiResponse<EventSpace>>(`/api/v2/hotels/event-spaces/${eventSpaceId}`);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao buscar espaço para eventos'
      };
    }
  }

  async createEventSpace(hotelId: string, data: EventSpaceCreateRequest): Promise<ApiResponse<EventSpace>> {
    try {
      return await this.post<ApiResponse<EventSpace>>(`/api/v2/hotels/${hotelId}/event-spaces`, data);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao criar espaço para eventos'
      };
    }
  }

  async updateEventSpace(eventSpaceId: string, data: EventSpaceUpdateRequest): Promise<ApiResponse<EventSpace>> {
    try {
      return await this.put<ApiResponse<EventSpace>>(`/api/v2/hotels/event-spaces/${eventSpaceId}`, data);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao atualizar espaço para eventos'
      };
    }
  }

  async deleteEventSpace(eventSpaceId: string): Promise<ApiResponse<{ message: string }>> {
    console.log('🔍 API: deleteEventSpace chamado com ID:', eventSpaceId);
    
    if (!eventSpaceId || eventSpaceId === 'undefined' || eventSpaceId === 'null' || eventSpaceId.trim() === '') {
      console.error('❌ API deleteEventSpace: ID inválido recebido:', eventSpaceId);
      return {
        success: false,
        error: 'ID do espaço para eventos inválido. Não pode ser undefined, null ou vazio.'
      };
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(eventSpaceId)) {
      console.error('❌ API deleteEventSpace: Formato UUID inválido:', eventSpaceId);
      return {
        success: false,
        error: 'Formato do ID do espaço para eventos inválido. Deve ser um UUID válido.'
      };
    }

    try {
      console.log(`🗑️ API: Deletando event space com ID válido: ${eventSpaceId}`);
      
      const headers = await this.getAuthHeaders();
      console.log('🔐 Headers sendo enviados para delete:', Object.keys(headers));
      
      return await this.delete<ApiResponse<{ message: string }>>(
        `/api/v2/hotels/event-spaces/${eventSpaceId}`,
        headers
      );
    } catch (error) {
      console.error('❌ API deleteEventSpace error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('403')) {
          return {
            success: false,
            error: 'Você não tem permissão para deletar este espaço para eventos. Verifique se você é o proprietário do hotel.'
          };
        } else if (error.message.includes('401')) {
          return {
            success: false,
            error: 'Autenticação expirada. Faça login novamente.'
          };
        } else if (error.message.includes('404')) {
          return {
            success: false,
            error: 'Espaço para eventos não encontrado. Pode já ter sido deletado.'
          };
        }
        return {
          success: false,
          error: error.message
        };
      }
      
      return {
        success: false,
        error: 'Erro ao desativar espaço para eventos. Verifique sua conexão.'
      };
    }
  }

  async getEventSpaceDetails(hotelId: string, eventSpaceId: string): Promise<ApiResponse<EventSpace>> {
    try {
      return await this.get<ApiResponse<EventSpace>>(`/api/v2/hotels/${hotelId}/event-spaces/${eventSpaceId}`);
    } catch (error) {
      try {
        const response = await this.getEventSpacesByHotel(hotelId);
        if (response.success && Array.isArray(response.data)) {
          const eventSpace = response.data.find((es: any) => es.id === eventSpaceId || es.eventSpaceId === eventSpaceId);
          if (eventSpace) {
            return {
              success: true,
              data: eventSpace
            };
          }
        }
        throw new Error('Espaço para eventos não encontrado');
      } catch (fallbackError) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Erro ao obter detalhes do espaço para eventos'
        };
      }
    }
  }

  async bulkUpdateAvailability(hotelId: string, data: BulkAvailabilityUpdate): Promise<ApiResponse<{ updated: number; message: string }>> {
    try {
      return await this.post<ApiResponse<{ updated: number; message: string }>>(`/api/v2/hotels/${hotelId}/availability/bulk`, data);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao atualizar disponibilidade'
      };
    }
  }

  async getHotelPerformance(hotelId: string, params?: {
    startDate?: string;
    endDate?: string;
    period?: 'day' | 'week' | 'month' | 'year';
  }): Promise<ApiResponse<HotelPerformance>> {
    try {
      return await this.get<ApiResponse<HotelPerformance>>(`/api/v2/hotels/${hotelId}/performance`, params);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao obter performance'
      };
    }
  }

  // ====================== OUTROS MÉTODOS ======================
  
  getRideById(rideId: string): Promise<{ success: boolean; data: { ride: any } }> {
    return this.getRideDetails(rideId);
  }

  async createRideBooking(data: any) {
    return this.post('/api/rides/book', data);
  }

  async getDriverRides(params?: any) {
    return this.get('/api/rides/driver', params);
  }

  async login(data: { email: string; password: string }) {
    return this.post('/api/auth/login', data);
  }

  async register(data: any) {
    return this.post('/api/auth/register', data);
  }

  async logout() {
    return this.post('/api/auth/logout');
  }

  async refreshToken() {
    return this.post('/api/auth/refresh-token');
  }

  async getProfile() {
    return this.get('/api/auth/me');
  }

  async updateProfile(data: any) {
    return this.post('/api/auth/update', data);
  }

  async uploadImage(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append("file", file);

    return fetch(`${this.baseURL}/api/upload`, {
      method: "POST",
      credentials: "include",
      mode: 'cors',
      body: formData
    }).then(r => r.json());
  }

  async getNotifications(): Promise<NotificationsResponse> {
    return this.get<NotificationsResponse>('/api/notifications');
  }

  async markNotificationAsRead(notificationId: string) {
    return this.post(`/api/notifications/${notificationId}/read`);
  }

  async getChatThread(threadId: string): Promise<ApiResponse<ChatThread>> {
    return this.get<ApiResponse<ChatThread>>(`/api/chat/${threadId}`);
  }

  async sendChatMessage(threadId: string, message: string): Promise<SendMessageResponse> {
    return this.post<SendMessageResponse>(`/api/chat/${threadId}/send`, { message });
  }

  async getHotelStats(hotelId: string) {
    return this.get(`/api/v2/hotels/${hotelId}/stats`);
  }

  async getHotelEvents(hotelId: string, params?: { status?: BookingStatus; upcoming?: boolean }) {
    return this.get(`/api/v2/hotels/${hotelId}/events`, params);
  }

  async getChat(hotelId: string, params?: { threadId?: string; limit?: number }) {
    return this.get(`/api/v2/hotels/${hotelId}/chat`, params);
  }

  async cancelHotelBooking(bookingId: string) {
    return this.cancelBooking(bookingId);
  }

  async checkInHotelBooking(bookingId: string) {
    return this.post(`/api/v2/hotels/bookings/${bookingId}/check-in`);
  }

  async checkOutHotelBooking(bookingId: string) {
    return this.post(`/api/v2/hotels/bookings/${bookingId}/check-out`);
  }

  async getMyHotelBookings(email: string, status?: BookingStatus): Promise<MyHotelBookingsResponse> {
    return this.getBookingsByEmail(email, status);
  }

  async getHotels() {
    return this.getAllHotels();
  }

  async testHotelsV2(): Promise<ApiResponse<{ message: string; count?: number }>> {
    try {
      const response = await fetch(`${this.baseURL}/api/v2/hotels/search?location=Maputo&limit=1`, {
        mode: 'cors'
      });
      const v2Working = response.ok;
      const v2Data = v2Working ? await response.json() : null;
      
      return {
        success: v2Working,
        data: {
          message: v2Working 
            ? `✅ API funcionando (${v2Data?.count || 0} hotéis)` 
            : '❌ API não está respondendo',
          count: v2Data?.count
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Erro: ${error instanceof Error ? error.message : 'Desconhecido'}`
      };
    }
  }

  async getNightlyPrices(params: {
    roomTypeId: string;
    checkIn: string;
    checkOut: string;
    units?: number;
  }): Promise<ApiResponse<NightlyPrice[]>> {
    try {
      return await this.get<ApiResponse<NightlyPrice[]>>('/api/v2/hotels/availability/nightly-prices', params);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao obter preços'
      };
    }
  }

  async getBookingStatus(bookingId: string): Promise<ApiResponse<{ status: BookingStatus; paymentStatus: PaymentStatus }>> {
    try {
      return await this.get<ApiResponse<{ status: BookingStatus; paymentStatus: PaymentStatus }>>(`/api/v2/hotels/bookings/${bookingId}/status`);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao obter status da reserva'
      };
    }
  }

  async sendChatMessageFull(threadId: string, messageData: SendMessageRequest): Promise<SendMessageResponse> {
    try {
      return await this.post<SendMessageResponse>(`/api/chat/${threadId}/send`, messageData);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao enviar mensagem'
      };
    }
  }

  async getNotificationsByType(type: string): Promise<ApiResponse<Notification[]>> {
    try {
      return await this.get<ApiResponse<Notification[]>>(`/api/notifications/type/${type}`);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao obter notificações'
      };
    }
  }

  async bookRide(bookingData: RideBookingRequest): Promise<{ success: boolean; data: { booking: Booking } }> {
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

      if (type === 'ride') {
        const payload = {
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
        const payload: HotelBookingRequest = {
          hotelId: bookingData.hotelId,
          roomTypeId: bookingData.roomTypeId,
          checkIn: bookingData.checkIn,
          checkOut: bookingData.checkOut,
          guestName: bookingData.guestName,
          guestEmail: bookingData.guestEmail,
          guestPhone: bookingData.guestPhone,
          adults: bookingData.adults || 1,
          children: bookingData.children || 0,
          units: bookingData.units || 1,
          specialRequests: bookingData.specialRequests,
          promoCode: bookingData.promoCode
        };
        
        const result = await this.createHotelBooking(payload);
        
        return { 
          success: result.success, 
          data: result.booking ? { 
            booking: {
              ...result.booking,
              passengerId: result.booking.guestEmail,
              type: 'hotel'
            } as any as Booking
          } : undefined,
          error: result.error
        };
        
      } else {
        return { 
          success: false, 
          error: 'Tipo de booking inválido' 
        };
      }
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message || 'Erro ao criar reserva' 
      };
    }
  }

  async getUserBookings(): Promise<{ success: boolean; data: { bookings: Booking[] } }> {
    return this.request('GET', '/api/bookings/user');
  }

  async getUserProfile(): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>('GET', '/api/auth/profile');
  }

  async updateUserProfile(userData: any): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>('PUT', '/api/auth/profile', userData);
  }

  async checkHealth(): Promise<{ success: boolean; services: Record<string, string> }> {
    try {
      const response = await fetch(`${this.baseURL}/api/health`, {
        mode: 'cors'
      });
      if (response.ok) {
        const data = await response.json();
        return { success: true, services: data.services || {} };
      }
      return { success: false, services: {} };
    } catch (error) {
      return { success: false, services: {} };
    }
  }
}

export const apiService = new ApiService();
export default apiService;