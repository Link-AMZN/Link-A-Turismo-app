import { apiRequest } from '../../shared/lib/queryClient';

// ✅ CORREÇÃO: Helper para logging condicional
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
  }
};

// ✅ CORREÇÃO: Interface base para respostas da API
interface ApiBaseResponse {
  success: boolean;
  message?: string;
}

// ✅ CORREÇÃO CRÍTICA: Helper para fazer requests tipados com cast explícito para Response
async function makeApiRequest<T extends ApiBaseResponse>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE', 
  url: string, 
  data?: any
): Promise<T> {
  try {
    // ✅ CORREÇÃO: Cast explícito para Response para resolver erro 'response' is of type 'unknown'
    const response = await apiRequest(method, url, data) as Response;
    const result = await response.json();
    
    // ✅ CORREÇÃO: Log de erro se a API retornar success: false
    if (!result.success) {
      log.error('API retornou erro:', result.message);
    }
    
    return result as T;
  } catch (error) {
    log.error('Erro de rede na requisição:', error);
    throw error;
  }
}

export interface CreateRideRequest {
  driverId: string;
  driverName: string;
  driverPhone: string;
  vehicleType: string;
  vehiclePlate: string;
  vehicleColor?: string;
  vehicleSeats: number;
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

// ✅ CORREÇÃO: Tipo específico para atualizações (sem campos imutáveis)
export type UpdateRideRequest = Partial<Omit<CreateRideRequest, 'driverId'>>;

export interface DriverRide {
  id: string;
  driverId: string;
  fromAddress: string;
  toAddress: string;
  
  // ✅ CORREÇÃO CRÍTICA: ADICIONADOS TODOS OS CAMPOS DE LOCALIZAÇÃO
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
  description?: string;
  status: string;
  allowNegotiation: boolean;
  isRecurring: boolean;
  createdAt: string;
  updatedAt: string;
  
  // ✅ CAMPOS DE COORDENADAS
  fromLatitude?: number;
  fromLongitude?: number;
  toLatitude?: number;
  toLongitude?: number;
}

export interface DriverStats {
  totalRides: number;
  activeRides: number;
  completedRides: number;
  totalRevenue: number;
  averageRating: number;
}

// ✅ CORREÇÃO: Função para normalizar ride do backend com TODOS os campos de localização
function normalizeDriverRide(rideData: any): DriverRide {
  const normalized: DriverRide = {
    id: rideData.id || '',
    driverId: rideData.driverId || '',
    fromAddress: rideData.fromAddress || '',
    toAddress: rideData.toAddress || '',
    
    // ✅ CORREÇÃO CRÍTICA: NORMALIZAR TODOS OS CAMPOS DE LOCALIZAÇÃO
    fromCity: rideData.fromCity || '',
    fromDistrict: rideData.fromDistrict || undefined,
    fromProvince: rideData.fromProvince || '',
    fromLocality: rideData.fromLocality || undefined,
    toCity: rideData.toCity || '',
    toDistrict: rideData.toDistrict || undefined,
    toProvince: rideData.toProvince || '',
    toLocality: rideData.toLocality || undefined,
    
    departureDate: rideData.departureDate || '',
    departureTime: rideData.departureTime || '',
    
    // ✅ CONVERSÃO EXPLÍCITA PARA NÚMERO
    maxPassengers: Number(rideData.maxPassengers) || 0,
    availableSeats: Number(rideData.availableSeats) || 0,
    pricePerSeat: Number(rideData.pricePerSeat) || 0,
    vehicleType: rideData.vehicleType || '',
    status: rideData.status || 'active',
    allowNegotiation: rideData.allowNegotiation || false,
    isRecurring: rideData.isRecurring || false,
    createdAt: rideData.createdAt || new Date().toISOString(),
    updatedAt: rideData.updatedAt || new Date().toISOString(),
  };

  // ✅ NORMALIZAR CAMPOS DE COORDENADAS
  normalized.fromLatitude = rideData.fromLatitude ?? rideData.fromLat ?? undefined;
  normalized.fromLongitude = rideData.fromLongitude ?? rideData.fromLng ?? undefined;
  normalized.toLatitude = rideData.toLatitude ?? rideData.toLat ?? undefined;
  normalized.toLongitude = rideData.toLongitude ?? rideData.toLng ?? undefined;

  // ✅ CORREÇÃO: Campos opcionais
  if (rideData.vehiclePlate) normalized.vehiclePlate = rideData.vehiclePlate;
  if (rideData.vehicleColor) normalized.vehicleColor = rideData.vehicleColor;
  if (rideData.description) normalized.description = rideData.description;
  
  // ✅ VALIDAÇÃO ROBUSTA PARA departureDateTime
  if (rideData.departureDateTime) {
    normalized.departureDateTime = rideData.departureDateTime;
  } else if (rideData.departureDate && rideData.departureTime) {
    try {
      const dateTimeString = `${rideData.departureDate}T${rideData.departureTime}`;
      const date = new Date(dateTimeString);
      if (!isNaN(date.getTime())) {
        normalized.departureDateTime = date.toISOString();
      } else {
        log.warn('Data/hora de partida inválida:', { departureDate: rideData.departureDate, departureTime: rideData.departureTime });
        normalized.departureDateTime = dateTimeString;
      }
    } catch (error) {
      log.warn('Erro ao processar data/hora de partida:', error);
      normalized.departureDateTime = `${rideData.departureDate}T${rideData.departureTime}`;
    }
  }

  // ✅ CORREÇÃO: Construir vehicleInfo automaticamente se não existir
  if (rideData.vehicleInfo) {
    normalized.vehicleInfo = rideData.vehicleInfo;
  } else {
    const vehicleParts = [rideData.vehicleType];
    if (rideData.vehicleColor) vehicleParts.push(rideData.vehicleColor);
    if (rideData.vehiclePlate) vehicleParts.push(`(${rideData.vehiclePlate})`);
    normalized.vehicleInfo = vehicleParts.join(' ');
  }

  return normalized;
}

// ✅ CORREÇÃO: Função para normalizar lista de rides
function normalizeDriverRides(ridesData: any[]): DriverRide[] {
  return (ridesData || []).map(normalizeDriverRide);
}

// API Client para motoristas gerirem viagens
export const driverRidesApi = {
  // Criar nova viagem
  create: async (rideData: CreateRideRequest): Promise<{ success: boolean; message: string; ride: DriverRide }> => {
    log.info('Criando viagem:', rideData);
    
    try {
      const result = await makeApiRequest<{ success: boolean; message: string; ride: DriverRide }>(
        'POST', 
        '/api/driver/rides/create', 
        rideData
      );
      
      if (result.success && result.ride) {
        result.ride = normalizeDriverRide(result.ride);
      }
      
      return result;
    } catch (error) {
      log.error('Erro ao criar viagem:', error);
      throw error;
    }
  },

  // Listar minhas viagens
  getMyRides: async (driverId: string): Promise<{ success: boolean; rides: DriverRide[] }> => {
    log.info('Buscando minhas viagens:', driverId);
    
    try {
      const result = await makeApiRequest<{ success: boolean; rides: DriverRide[] }>(
        'GET', 
        `/api/driver/rides/my-rides/${driverId}`
      );
      
      if (result.success && result.rides) {
        result.rides = normalizeDriverRides(result.rides);
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
      
      // ✅ CORREÇÃO: Normalizar campos numéricos nas estatísticas
      if (result.success && result.stats) {
        result.stats = {
          totalRides: Number(result.stats.totalRides) || 0,
          activeRides: Number(result.stats.activeRides) || 0,
          completedRides: Number(result.stats.completedRides) || 0,
          totalRevenue: Number(result.stats.totalRevenue) || 0,
          averageRating: Number(result.stats.averageRating) || 0,
        };
      }
      
      return result;
    } catch (error) {
      log.error('Erro ao buscar estatísticas:', error);
      throw error;
    }
  },

  // ✅ Obter detalhes de uma viagem específica
  getRideDetails: async (rideId: string): Promise<{ success: boolean; ride: DriverRide }> => {
    log.info('Buscando detalhes da viagem:', rideId);
    
    try {
      const result = await makeApiRequest<{ success: boolean; ride: DriverRide }>(
        'GET', 
        `/api/driver/rides/${rideId}`
      );
      
      if (result.success && result.ride) {
        result.ride = normalizeDriverRide(result.ride);
      }
      
      return result;
    } catch (error) {
      log.error('Erro ao buscar detalhes da viagem:', error);
      throw error;
    }
  },

  // ✅ Deletar viagem (apenas se não tiver reservas)
  delete: async (rideId: string): Promise<{ success: boolean; message: string }> => {
    log.info('Deletando viagem:', rideId);
    
    try {
      return await makeApiRequest<{ success: boolean; message: string }>(
        'DELETE', 
        `/api/driver/rides/${rideId}`
      );
    } catch (error) {
      log.error('Erro ao deletar viagem:', error);
      throw error;
    }
  },

  // ✅ Duplicar viagem (criar nova baseada em uma existente)
  duplicate: async (rideId: string): Promise<{ success: boolean; message: string; ride: DriverRide }> => {
    log.info('Duplicando viagem:', rideId);
    
    try {
      const result = await makeApiRequest<{ success: boolean; message: string; ride: DriverRide }>(
        'POST', 
        `/api/driver/rides/${rideId}/duplicate`
      );
      
      if (result.success && result.ride) {
        result.ride = normalizeDriverRide(result.ride);
      }
      
      return result;
    } catch (error) {
      log.error('Erro ao duplicar viagem:', error);
      throw error;
    }
  }
};

export default driverRidesApi;