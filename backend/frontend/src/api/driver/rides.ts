import { apiRequest } from '../../shared/lib/queryClient';

// ✅ CORREÇÃO: Helper para logging condicional (MELHORADO)
const log = {
  info: (message: string, data?: any) => {
    if (import.meta.env.DEV) {
      console.log(`ℹ️ [DRIVER API] ${message}`, data || '');
    }
  },
  error: (message: string, error?: any) => {
    console.error(`❌ [DRIVER API] ${message}`, error || '');
  },
  warn: (message: string, data?: any) => {
    console.warn(`⚠️ [DRIVER API] ${message}`, data || '');
  },
  debug: (message: string, data?: any) => {
    if (import.meta.env.DEV) {
      console.debug(`🐛 [DRIVER API] ${message}`, data || '');
    }
  }
};

// ✅ CORREÇÃO: Interface base para respostas da API (EXPANDIDA)
interface ApiBaseResponse {
  success: boolean;
  message?: string;
  error?: string;
  code?: string;
}

// ✅ CORREÇÃO CRÍTICA: Helper para fazer requests tipados (MELHORADO)
async function makeApiRequest<T extends ApiBaseResponse>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE', 
  url: string, 
  data?: any
): Promise<T> {
  try {
    log.debug(`📡 Fazendo requisição ${method} para: ${url}`, data);
    
    // ✅ CORREÇÃO: Cast explícito para Response
    const response = await apiRequest(method, url, data) as Response;
    
    // ✅ NOVO: Verificar status HTTP antes de processar
    if (!response.ok) {
      const errorText = await response.text();
      log.error(`HTTP ${response.status} para ${url}`, errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    
    // ✅ CORREÇÃO: Log de erro se a API retornar success: false
    if (!result.success) {
      log.error('API retornou erro:', {
        message: result.message,
        error: result.error,
        code: result.code,
        url
      });
    }
    
    log.debug(`✅ Resposta recebida de ${url}`, result);
    return result as T;
  } catch (error) {
    log.error('Erro de rede na requisição:', {
      url,
      method,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
    throw error;
  }
}

// ✅ CORREÇÃO: Interface CreateRideRequest (COMPATÍVEL com get_rides_smart_final)
export interface CreateRideRequest {
  driverId: string;
  driverName: string;
  driverPhone: string;
  vehicleType: string;
  vehiclePlate: string;
  vehicleColor?: string;
  vehicleSeats: number;
  vehicleMake?: string; // ✅ NOVO: Para compatibilidade
  vehicleModel?: string; // ✅ NOVO: Para compatibilidade
  
  // ✅ CORREÇÃO: Campos de localização COMPATÍVEIS com função inteligente
  fromAddress: string;
  fromCity: string;
  fromDistrict?: string;
  fromProvince: string;
  fromLocality?: string;
  fromLatitude?: number;
  fromLongitude?: number;
  
  toAddress: string;
  toCity: string;
  toDistrict?: string;
  toProvince: string;
  toLocality?: string;
  toLatitude?: number;
  toLongitude?: number;
  
  departureDateTime: string;
  pricePerSeat: number;
  maxPassengers: number;
  route?: string[];
  allowPickupEnRoute?: boolean;
  allowNegotiation?: boolean;
  isRoundTrip?: boolean;
  returnDateTime?: string;
  description?: string;
}

// ✅ CORREÇÃO: Tipo específico para atualizações
export type UpdateRideRequest = Partial<Omit<CreateRideRequest, 'driverId'>>;

// ✅ CORREÇÃO: Interface DriverRide (COMPATÍVEL com get_rides_smart_final)
export interface DriverRide {
  id: string;
  driverId: string;
  fromAddress: string;
  toAddress: string;
  
  // ✅ CORREÇÃO: Campos de localização COMPATÍVEIS
  fromCity: string;
  fromDistrict?: string;
  fromProvince: string;
  fromLocality?: string;
  toCity: string;
  toDistrict?: string;
  toProvince: string;
  toLocality?: string;
  
  departureDate: string;
  departureTime: string;
  departureDateTime?: string;
  maxPassengers: number;
  availableSeats: number;
  pricePerSeat: number;
  vehicleType: string;
  vehiclePlate?: string;
  vehicleColor?: string;
  vehicleInfo?: string;
  vehicleMake?: string; // ✅ NOVO: Para compatibilidade
  vehicleModel?: string; // ✅ NOVO: Para compatibilidade
  description?: string;
  status: string;
  allowNegotiation: boolean;
  isRecurring: boolean;
  createdAt: string;
  updatedAt: string;
  
  // ✅ CAMPOS DE COORDENADAS (COMPATÍVEIS com função inteligente)
  fromLatitude?: number;
  fromLongitude?: number;
  toLatitude?: number;
  toLongitude?: number;
  
  // ✅ NOVOS CAMPOS para estatísticas e matching
  totalBookings?: number;
  driverRating?: number;
}

export interface DriverStats {
  totalRides: number;
  activeRides: number;
  completedRides: number;
  totalRevenue: number;
  averageRating: number;
  totalPassengers?: number; // ✅ NOVO
  monthlyRevenue?: number; // ✅ NOVO
}

// ✅ CORREÇÃO MELHORADA: Função para normalizar ride do backend
function normalizeDriverRide(rideData: any): DriverRide {
  log.debug('Normalizando ride:', rideData);
  
  const normalized: DriverRide = {
    id: rideData.id || rideData.ride_id || '',
    driverId: rideData.driverId || rideData.driver_id || '',
    fromAddress: rideData.fromAddress || rideData.from_address || '',
    toAddress: rideData.toAddress || rideData.to_address || '',
    
    // ✅ CORREÇÃO: NORMALIZAR TODOS OS CAMPOS DE LOCALIZAÇÃO
    fromCity: rideData.fromCity || rideData.from_city || '',
    fromDistrict: rideData.fromDistrict || rideData.from_district || undefined,
    fromProvince: rideData.fromProvince || rideData.from_province || '',
    fromLocality: rideData.fromLocality || rideData.from_locality || undefined,
    toCity: rideData.toCity || rideData.to_city || '',
    toDistrict: rideData.toDistrict || rideData.to_district || undefined,
    toProvince: rideData.toProvince || rideData.to_province || '',
    toLocality: rideData.toLocality || rideData.to_locality || undefined,
    
    departureDate: rideData.departureDate || rideData.departure_date || '',
    departureTime: rideData.departureTime || rideData.departure_time || '',
    
    // ✅ CONVERSÃO EXPLÍCITA E ROBUSTA PARA NÚMERO
    maxPassengers: Number(rideData.maxPassengers || rideData.max_passengers || 0),
    availableSeats: Number(rideData.availableSeats || rideData.available_seats || 0),
    pricePerSeat: Number(rideData.pricePerSeat || rideData.price_per_seat || 0),
    vehicleType: rideData.vehicleType || rideData.vehicle_type || '',
    status: rideData.status || 'active',
    allowNegotiation: Boolean(rideData.allowNegotiation || rideData.allow_negotiation || false),
    isRecurring: Boolean(rideData.isRecurring || rideData.is_recurring || false),
    createdAt: rideData.createdAt || rideData.created_at || new Date().toISOString(),
    updatedAt: rideData.updatedAt || rideData.updated_at || new Date().toISOString(),
  };

  // ✅ CORREÇÃO MELHORADA: NORMALIZAR CAMPOS DE COORDENADAS
  normalized.fromLatitude = rideData.fromLatitude ?? rideData.from_lat ?? rideData.fromLat ?? undefined;
  normalized.fromLongitude = rideData.fromLongitude ?? rideData.from_lng ?? rideData.fromLng ?? undefined;
  normalized.toLatitude = rideData.toLatitude ?? rideData.to_lat ?? rideData.toLat ?? undefined;
  normalized.toLongitude = rideData.toLongitude ?? rideData.to_lng ?? rideData.toLng ?? undefined;

  // ✅ CORREÇÃO: Campos opcionais com fallback robusto
  if (rideData.vehiclePlate || rideData.vehicle_plate) normalized.vehiclePlate = rideData.vehiclePlate || rideData.vehicle_plate;
  if (rideData.vehicleColor || rideData.vehicle_color) normalized.vehicleColor = rideData.vehicleColor || rideData.vehicle_color;
  if (rideData.description) normalized.description = rideData.description;
  
  // ✅ NOVOS CAMPOS para compatibilidade
  if (rideData.vehicleMake || rideData.vehicle_make) normalized.vehicleMake = rideData.vehicleMake || rideData.vehicle_make;
  if (rideData.vehicleModel || rideData.vehicle_model) normalized.vehicleModel = rideData.vehicleModel || rideData.vehicle_model;
  if (rideData.driverRating || rideData.driver_rating) normalized.driverRating = Number(rideData.driverRating || rideData.driver_rating);
  if (rideData.totalBookings || rideData.total_bookings) normalized.totalBookings = Number(rideData.totalBookings || rideData.total_bookings);

  // ✅ CORREÇÃO MELHORADA: VALIDAÇÃO ROBUSTA PARA departureDateTime
  if (rideData.departureDateTime || rideData.departure_date_time) {
    normalized.departureDateTime = rideData.departureDateTime || rideData.departure_date_time;
  } else if (rideData.departureDate && rideData.departureTime) {
    try {
      const dateTimeString = `${rideData.departureDate}T${rideData.departureTime}`;
      const date = new Date(dateTimeString);
      if (!isNaN(date.getTime())) {
        normalized.departureDateTime = date.toISOString();
      } else {
        log.warn('Data/hora de partida inválida:', { 
          departureDate: rideData.departureDate, 
          departureTime: rideData.departureTime 
        });
        normalized.departureDateTime = dateTimeString;
      }
    } catch (error) {
      log.warn('Erro ao processar data/hora de partida:', error);
      normalized.departureDateTime = `${rideData.departureDate}T${rideData.departureTime}`;
    }
  }

  // ✅ CORREÇÃO MELHORADA: Construir vehicleInfo automaticamente
  if (rideData.vehicleInfo || rideData.vehicle_info) {
    normalized.vehicleInfo = rideData.vehicleInfo || rideData.vehicle_info;
  } else {
    const vehicleParts = [
      rideData.vehicleMake || rideData.vehicle_make,
      rideData.vehicleModel || rideData.vehicle_model,
      rideData.vehicleType || rideData.vehicle_type
    ].filter(Boolean);
    
    if (rideData.vehicleColor || rideData.vehicle_color) vehicleParts.push(rideData.vehicleColor || rideData.vehicle_color);
    if (rideData.vehiclePlate || rideData.vehicle_plate) vehicleParts.push(`(${rideData.vehiclePlate || rideData.vehicle_plate})`);
    
    normalized.vehicleInfo = vehicleParts.join(' ').trim() || 'Veículo não especificado';
  }

  log.debug('Ride normalizado:', normalized);
  return normalized;
}

// ✅ CORREÇÃO: Função para normalizar lista de rides
function normalizeDriverRides(ridesData: any[]): DriverRide[] {
  return (ridesData || []).map(ride => {
    try {
      return normalizeDriverRide(ride);
    } catch (error) {
      log.error('Erro ao normalizar ride:', { ride, error });
      // ✅ RETORNO SEGURO: Ride básico em caso de erro
      return {
        id: ride.id || 'error',
        driverId: ride.driverId || '',
        fromAddress: 'Erro na normalização',
        toAddress: 'Erro na normalização',
        fromCity: '',
        fromProvince: '',
        toCity: '',
        toProvince: '',
        departureDate: new Date().toISOString(),
        departureTime: '00:00',
        maxPassengers: 0,
        availableSeats: 0,
        pricePerSeat: 0,
        vehicleType: 'Erro',
        status: 'error',
        allowNegotiation: false,
        isRecurring: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
  });
}

// ✅ CORREÇÃO: API Client para motoristas (OTIMIZADO)
export const driverRidesApi = {
  // Criar nova viagem
  create: async (rideData: CreateRideRequest): Promise<{ success: boolean; message: string; ride: DriverRide }> => {
    log.info('Criando viagem:', { 
      from: `${rideData.fromCity} → ${rideData.toCity}`,
      date: rideData.departureDateTime,
      seats: rideData.maxPassengers 
    });
    
    try {
      const result = await makeApiRequest<{ success: boolean; message: string; ride: DriverRide }>(
        'POST', 
        '/api/driver/rides/create', 
        rideData
      );
      
      if (result.success && result.ride) {
        result.ride = normalizeDriverRide(result.ride);
        log.info('✅ Viagem criada com sucesso:', result.ride.id);
      }
      
      return result;
    } catch (error) {
      log.error('Erro ao criar viagem:', error);
      throw error;
    }
  },

  // Listar minhas viagens
  getMyRides: async (driverId: string, status?: string): Promise<{ success: boolean; rides: DriverRide[] }> => {
    log.info('Buscando minhas viagens:', { driverId, status });
    
    try {
      const url = status 
        ? `/api/driver/rides/my-rides/${driverId}?status=${status}`
        : `/api/driver/rides/my-rides/${driverId}`;
        
      const result = await makeApiRequest<{ success: boolean; rides: DriverRide[] }>('GET', url);
      
      if (result.success && result.rides) {
        result.rides = normalizeDriverRides(result.rides);
        log.info(`✅ Encontradas ${result.rides.length} viagens`);
      }
      
      return result;
    } catch (error) {
      log.error('Erro ao buscar minhas viagens:', error);
      throw error;
    }
  },

  // Atualizar viagem
  update: async (rideId: string, updateData: UpdateRideRequest): Promise<{ success: boolean; message: string; ride: DriverRide }> => {
    log.info('Atualizando viagem:', { rideId, updateData });
    
    try {
      const result = await makeApiRequest<{ success: boolean; message: string; ride: DriverRide }>(
        'PATCH', 
        `/api/driver/rides/${rideId}`, 
        updateData
      );
      
      if (result.success && result.ride) {
        result.ride = normalizeDriverRide(result.ride);
        log.info('✅ Viagem atualizada com sucesso:', rideId);
      }
      
      return result;
    } catch (error) {
      log.error('Erro ao atualizar viagem:', error);
      throw error;
    }
  },

  // Cancelar viagem
  cancel: async (rideId: string): Promise<{ success: boolean; message: string; ride: DriverRide }> => {
    log.info('Cancelando viagem:', rideId);
    
    try {
      const result = await makeApiRequest<{ success: boolean; message: string; ride: DriverRide }>(
        'PATCH', 
        `/api/driver/rides/${rideId}/cancel`
      );
      
      if (result.success && result.ride) {
        result.ride = normalizeDriverRide(result.ride);
        log.info('✅ Viagem cancelada com sucesso:', rideId);
      }
      
      return result;
    } catch (error) {
      log.error('Erro ao cancelar viagem:', error);
      throw error;
    }
  },

  // Obter estatísticas
  getStats: async (driverId: string): Promise<{ success: boolean; stats: DriverStats }> => {
    log.info('Buscando estatísticas:', driverId);
    
    try {
      const result = await makeApiRequest<{ success: boolean; stats: DriverStats }>(
        'GET', 
        `/api/driver/rides/stats/${driverId}`
      );
      
      // ✅ CORREÇÃO MELHORADA: Normalizar campos numéricos nas estatísticas
      if (result.success && result.stats) {
        result.stats = {
          totalRides: Number(result.stats.totalRides) || 0,
          activeRides: Number(result.stats.activeRides) || 0,
          completedRides: Number(result.stats.completedRides) || 0,
          totalRevenue: Number(result.stats.totalRevenue) || 0,
          averageRating: Number(result.stats.averageRating) || 0,
          totalPassengers: Number(result.stats.totalPassengers) || 0,
          monthlyRevenue: Number(result.stats.monthlyRevenue) || 0,
        };
        
        log.info('✅ Estatísticas carregadas:', result.stats);
      }
      
      return result;
    } catch (error) {
      log.error('Erro ao buscar estatísticas:', error);
      throw error;
    }
  },

  // Obter detalhes de uma viagem específica
  getRideDetails: async (rideId: string): Promise<{ success: boolean; ride: DriverRide }> => {
    log.info('Buscando detalhes da viagem:', rideId);
    
    try {
      const result = await makeApiRequest<{ success: boolean; ride: DriverRide }>(
        'GET', 
        `/api/driver/rides/${rideId}`
      );
      
      if (result.success && result.ride) {
        result.ride = normalizeDriverRide(result.ride);
        log.info('✅ Detalhes da viagem carregados:', rideId);
      }
      
      return result;
    } catch (error) {
      log.error('Erro ao buscar detalhes da viagem:', error);
      throw error;
    }
  },

  // Deletar viagem (apenas se não tiver reservas)
  delete: async (rideId: string): Promise<{ success: boolean; message: string }> => {
    log.info('Deletando viagem:', rideId);
    
    try {
      const result = await makeApiRequest<{ success: boolean; message: string }>(
        'DELETE', 
        `/api/driver/rides/${rideId}`
      );
      
      if (result.success) {
        log.info('✅ Viagem deletada com sucesso:', rideId);
      }
      
      return result;
    } catch (error) {
      log.error('Erro ao deletar viagem:', error);
      throw error;
    }
  },

  // Duplicar viagem (criar nova baseada em uma existente)
  duplicate: async (rideId: string): Promise<{ success: boolean; message: string; ride: DriverRide }> => {
    log.info('Duplicando viagem:', rideId);
    
    try {
      const result = await makeApiRequest<{ success: boolean; message: string; ride: DriverRide }>(
        'POST', 
        `/api/driver/rides/${rideId}/duplicate`
      );
      
      if (result.success && result.ride) {
        result.ride = normalizeDriverRide(result.ride);
        log.info('✅ Viagem duplicada com sucesso:', result.ride.id);
      }
      
      return result;
    } catch (error) {
      log.error('Erro ao duplicar viagem:', error);
      throw error;
    }
  },

  // ✅ NOVA FUNÇÃO: Buscar rides do motorista para dashboard
  getDashboardRides: async (driverId: string, limit: number = 10): Promise<{ success: boolean; rides: DriverRide[] }> => {
    log.info('Buscando rides para dashboard:', { driverId, limit });
    
    try {
      const result = await makeApiRequest<{ success: boolean; rides: DriverRide[] }>(
        'GET', 
        `/api/driver/rides/dashboard/${driverId}?limit=${limit}`
      );
      
      if (result.success && result.rides) {
        result.rides = normalizeDriverRides(result.rides);
        log.info(`✅ ${result.rides.length} rides para dashboard`);
      }
      
      return result;
    } catch (error) {
      log.error('Erro ao buscar rides do dashboard:', error);
      throw error;
    }
  }
};

export default driverRidesApi;