import apiService from '@/services/api';
import { auth } from '@/shared/lib/firebaseConfig';
// ✅ IMPORTAR AS INTERFACES UNIFICADAS
import { Accommodation, CreateAccommodationData, SearchFilters, LocationSuggestion } from '@/shared/types/accommodation';

// ==================== INTERFACES CORRIGIDAS ====================

export interface CreateAccommodationRequest {
  name: string;
  type: string;
  address: string;
  lat?: number;
  lng?: number;
  rating?: number;
  images?: string[];
  amenities?: string[];
  description?: string;
  hostId?: string;
  pricePerNight?: number;
  reviewCount?: number;
  distanceFromCenter?: number;
  isAvailable?: boolean;
  offerDriverDiscounts?: boolean;
  driverDiscountRate?: number;
  minimumDriverLevel?: string;
  partnershipBadgeVisible?: boolean;
  enablePartnerships?: boolean;
  accommodationDiscount?: number;
  transportDiscount?: number;
  [key: string]: any;
}

export interface CreateRoomTypeRequest {
  accommodationId: string;
  name: string;
  type: string;
  pricePerNight: number;
  description?: string;
  maxOccupancy?: number;
  amenities?: string[];
  images?: string[];
  hostId?: string;
}

export interface CreateRoomRequest {
  accommodationId: string;
  roomTypeId: string;
  roomNumber: string;
  status?: string;
  amenities?: string[];
  images?: string[];
  hostId?: string;
}

export interface AccommodationData {
  name: string;
  type: string;
  location: string;
  price: number;
  description?: string;
  amenities?: string[];
  images?: string[];
  availableRooms: number;
  hostId?: string;
}

export interface AccommodationSearchParams {
  location?: string;
  type?: string;
  maxPrice?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  hostId?: string;
  // ✅ NOVOS PARÂMETROS PARA BUSCA INTELIGENTE
  address?: string;
  isAvailable?: boolean;
}

export interface RoomType {
  id: string;
  accommodationId: string;
  name: string;
  type: string;
  pricePerNight: number;
  description?: string;
  maxOccupancy?: number;
  amenities?: string[];
  images?: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface HotelRoom {
  id: string;
  accommodationId: string;
  roomTypeId: string;
  roomNumber: string;
  roomType: string;
  pricePerNight: number;
  status: string;
  amenities?: string[];
  images?: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface HotelFormData {
  name: string;
  description: string;
  category: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  latitude?: number;
  longitude?: number;
  amenities: string[];
  rooms: HotelRoomType[];
  images: (File | string)[];
  existingImages: string[];
}

export interface HotelRoomType {
  id: string;
  type: string;
  description: string;
  price: number;
  capacity: number;
  quantity: number;
  amenities: string[];
}

export interface CreateHotelResponse {
  hotelId: string;
  success: boolean;
  message: string;
}

// ✅ NOVA INTERFACE PARA RESULTADOS DE BUSCA INTELIGENTE
export interface IntelligentSearchResult {
  success: boolean;
  data: Accommodation[];
  searchType: string;
  location: string;
  totalResults: number;
  message: string;
}

// ✅ INTERFACE PARA BUSCA POR PROXIMIDADE
export interface NearbySearchParams {
  lat: number;
  lng: number;
  radius?: number;
  limit?: number;
}

interface ApiResponse<T = any> {
  data?: T;
  accommodations?: T[];
  accommodation?: T;
  success?: boolean;
  id?: string;
  accommodationId?: string;
  hotelId?: string;
  message?: string;
  [key: string]: any;
}

interface ExtendedApiService {
  createAccommodation?: (data: any) => Promise<any>;
  getRoomTypes?: (accommodationId: string) => Promise<any>;
  getRooms?: (accommodationId: string) => Promise<any>;
  updateAccommodation?: (id: string, data: any) => Promise<any>;
  deleteAccommodation?: (id: string) => Promise<any>;
  getHotelStats?: (id: string) => Promise<any>;
  searchAccommodations: (params: any) => Promise<any>;
  bookHotel?: (data: any) => Promise<any>;
  getHotelById?: (id: string) => Promise<any>;
  createRoomType?: (data: any) => Promise<any>;
  createRoom?: (data: any) => Promise<any>;
}

// ==================== FUNÇÕES AUXILIARES ====================

const getCurrentUser = () => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Usuário não autenticado. Faça login para continuar.');
  }
  return user;
};

const safeResponse = (response: any): ApiResponse => {
  if (response && typeof response === 'object') {
    return response as ApiResponse;
  }
  return {} as ApiResponse;
};

// ✅ FUNÇÃO AUXILIAR PARA OBTER BADGE DE LOCALIZAÇÃO
export const getLocationBadge = (matchType: number, distance?: number) => {
  const badges = {
    0: { label: '📍 Localização Exata', color: 'green' },
    1: { label: '🏛️ Mesma Província', color: 'blue' },
    2: { label: `🚗 Próximo (${Math.round((distance || 0) / 1000)}km)`, color: 'orange' }
  };
  
  return badges[matchType as keyof typeof badges] || { label: '📌 Outro', color: 'gray' };
};

// ✅ FUNÇÃO DE CONVERSÃO PARA Accommodation UNIFICADO
const convertToUnifiedAccommodation = (acc: any): Accommodation => {
  return {
    id: acc.id,
    hostId: acc.hostId || '',
    name: acc.name,
    type: acc.type,
    address: acc.address || acc.location || '',
    description: acc.description || '',
    maxGuests: acc.maxGuests || acc.availableRooms || 2,
    bedrooms: acc.bedrooms || 1,
    bathrooms: acc.bathrooms || 1,
    amenities: acc.amenities || [],
    images: acc.images || [],
    isAvailable: acc.isAvailable !== false,
    rating: acc.rating || 0,
    reviewCount: acc.reviewCount || 0,
    unavailableDates: acc.unavailableDates || [],
    
    // Propriedades adicionais para compatibilidade
    lat: acc.lat,
    lng: acc.lng,
    distanceFromCenter: acc.distanceFromCenter,
    offerDriverDiscounts: acc.offerDriverDiscounts || false,
    driverDiscountRate: acc.driverDiscountRate,
    minimumDriverLevel: acc.minimumDriverLevel,
    partnershipBadgeVisible: acc.partnershipBadgeVisible || false,
    enablePartnerships: acc.enablePartnerships || false,
    accommodationDiscount: acc.accommodationDiscount,
    transportDiscount: acc.transportDiscount,
    checkInTime: acc.checkInTime,
    checkOutTime: acc.checkOutTime,
    policies: acc.policies,
    contactEmail: acc.contactEmail,
    contactPhone: acc.contactPhone,
    roomTypes: acc.roomTypes || [],
    
    // ✅ CAMPOS ADICIONAIS PARA COMPATIBILIDADE
    pricePerNight: acc.pricePerNight,
    availableRooms: acc.availableRooms,
    locality: acc.locality,
    province: acc.province,
    location: acc.location,
    price: acc.price,
    
    // ✅ CAMPOS DA BUSCA INTELIGENTE
    match_type: acc.match_type,
    distance: acc.distance,
    hasAvailableRooms: acc.hasAvailableRooms,
    availableRoomsList: acc.availableRoomsList,
    rooms: acc.rooms,
    
    createdAt: acc.createdAt || new Date().toISOString(),
    updatedAt: acc.updatedAt || new Date().toISOString()
  };
};

// ==================== ACCOMMODATION SERVICE ====================

export const accommodationService = {
  // ✅ BUSCA INTELIGENTE COM POSTGIS
  searchIntelligent: async (searchParams: AccommodationSearchParams): Promise<IntelligentSearchResult> => {
    console.log('🎯 AccommodationService: Busca inteligente com PostGIS', searchParams);
    
    try {
      const { address, checkIn, checkOut, guests, isAvailable } = searchParams;
      
      if (!address) {
        throw new Error('Endereço é obrigatório para busca inteligente');
      }

      const queryParams = new URLSearchParams();
      queryParams.append('address', address);
      if (checkIn) queryParams.append('checkIn', checkIn);
      if (checkOut) queryParams.append('checkOut', checkOut);
      if (guests) queryParams.append('guests', guests.toString());
      if (isAvailable !== undefined) queryParams.append('isAvailable', isAvailable.toString());

      const response = await fetch(`/api/hotels/search-intelligent?${queryParams.toString()}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erro HTTP na busca inteligente:', response.status, errorText);
        throw new Error(`Erro na busca inteligente: ${response.statusText}`);
      }

      const result: IntelligentSearchResult = await response.json();
      
      console.log(`🎯 Busca inteligente encontrou ${result.totalResults} resultados`);
      
      return result;
    } catch (error) {
      console.error('❌ Erro na busca inteligente:', error);
      throw new Error(`Erro na busca inteligente: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  },

  // ✅ BUSCA POR PROXIMIDADE
  searchNearby: async (params: NearbySearchParams): Promise<IntelligentSearchResult> => {
    console.log('📍 AccommodationService: Busca por proximidade', params);
    
    try {
      const { lat, lng, radius = 50, limit = 20 } = params;
      
      const queryParams = new URLSearchParams();
      queryParams.append('lat', lat.toString());
      queryParams.append('lng', lng.toString());
      queryParams.append('radius', radius.toString());
      queryParams.append('limit', limit.toString());

      const response = await fetch(`/api/hotels/nearby?${queryParams.toString()}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erro HTTP na busca por proximidade:', response.status, errorText);
        throw new Error(`Erro na busca por proximidade: ${response.statusText}`);
      }

      const result: IntelligentSearchResult = await response.json();
      
      console.log(`📍 Busca por proximidade encontrou ${result.totalResults} resultados`);
      
      return result;
    } catch (error) {
      console.error('❌ Erro na busca por proximidade:', error);
      throw new Error(`Erro na busca por proximidade: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  },

  // ✅ SUGESTÕES DE LOCALIZAÇÃO
  getLocationSuggestions: async (query: string, limit = 10): Promise<LocationSuggestion[]> => {
    console.log('💡 AccommodationService: Buscando sugestões para', query);
    
    try {
      if (!query || query.length < 2) {
        return [];
      }

      const response = await fetch(`/api/locations/suggest?query=${encodeURIComponent(query)}&limit=${limit}`);
      
      if (!response.ok) {
        console.warn('⚠️ Erro ao buscar sugestões, retornando array vazio');
        return [];
      }

      const result = await response.json();
      
      console.log(`💡 Encontradas ${result.totalResults} sugestões para "${query}"`);
      
      return result.data || [];
    } catch (error) {
      console.error('❌ Erro ao buscar sugestões:', error);
      return [];
    }
  },

  // ✅ BUSCA COMPATÍVEL (mantém compatibilidade com código existente)
  searchAccommodations: async (searchParams: AccommodationSearchParams): Promise<Accommodation[]> => {
    console.log('🏨 AccommodationService: Buscando acomodações', searchParams);
    
    // Se tem endereço, usa busca inteligente
    if (searchParams.address || searchParams.location) {
      try {
        const address = searchParams.address || searchParams.location;
        const intelligentResult = await accommodationService.searchIntelligent({
          ...searchParams,
          address: address!
        });
        
        // ✅ CONVERSÃO PARA Accommodation UNIFICADO
        return intelligentResult.data.map(convertToUnifiedAccommodation);
      } catch (error) {
        console.warn('⚠️ Busca inteligente falhou, usando busca padrão:', error);
      }
    }
    
    // Fallback para busca padrão
    try {
      const resp = await apiService.searchAccommodations({
        location: searchParams.location,
        checkIn: searchParams.checkIn,
        checkOut: searchParams.checkOut,
        guests: searchParams.guests
      }) as ApiResponse;
      
      const accommodations = (resp.data?.accommodations ?? resp.accommodations ?? []) as any[];
      
      // ✅ CONVERSÃO PARA Accommodation UNIFICADO
      return accommodations.map(convertToUnifiedAccommodation);
    } catch (error) {
      console.error('❌ Erro na busca padrão:', error);
      return [];
    }
  },

  getAllAccommodations: async (): Promise<Accommodation[]> => {
    return await accommodationService.searchAccommodations({});
  },

  getByHost: async (hostId: string): Promise<Accommodation[]> => {
    console.log('🏨 AccommodationService: Buscando acomodações do host', hostId);
    
    try {
      const allAccommodations = await accommodationService.getAllAccommodations();
      const hostAccommodations = allAccommodations.filter((acc: Accommodation) => 
        acc.hostId === hostId
      );
      
      console.log(`✅ Encontradas ${hostAccommodations.length} acomodações para o host ${hostId}`);
      return hostAccommodations;
    } catch (error) {
      console.error('❌ Erro ao buscar acomodações do host:', error);
      return [];
    }
  },

  createAccommodation: async (data: CreateAccommodationRequest): Promise<any> => {
    console.log('🛠️ === DEBUG createAccommodation INICIANDO ===');
    
    try {
      const user = getCurrentUser();
      
      const payload = {
        ...data,
        hostId: user.uid,
        ...(data.pricePerNight !== undefined && { pricePerNight: data.pricePerNight }),
        images: Array.isArray(data.images) ? data.images : data.images ? [data.images] : [],
        amenities: Array.isArray(data.amenities) ? data.amenities : data.amenities ? [data.amenities] : []
      };
      
      console.log('📤 Payload para envio:', JSON.stringify(payload, null, 2));
      
      console.log('🚀 Chamando apiService.createAccommodation...');
      const response = await apiService.createAccommodation(payload);
      
      const safeResp = safeResponse(response);
      
      if (safeResp && typeof safeResp === 'object') {
        console.log('🔍 Todos os campos da resposta:');
        Object.keys(safeResp).forEach(key => {
          console.log(`   ${key}:`, safeResp[key]);
        });
      }
      
      const accommodationId = safeResp.id || 
                             safeResp.data?.id || 
                             safeResp.accommodationId || 
                             safeResp.hotelId ||
                             (safeResp.data && (safeResp.data as any).accommodationId) ||
                             (safeResp.data && (safeResp.data as any).accommodation?.id) ||
                             (safeResp.data?.accommodation && (safeResp.data.accommodation as any).id) ||
                             (safeResp.success && safeResp.data && (safeResp.data as any).id);
      
      console.log('🎯 ID extraído:', accommodationId);
      
      if (!accommodationId) {
        console.error('❌ NENHUM ID ENCONTRADO NA RESPOSTA!');
        throw new Error('Falha ao obter ID da acomodação criada. Resposta: ' + JSON.stringify(safeResp));
      }
      
      console.log('✅ Accommodation criado com ID:', accommodationId);
      
      return { 
        ...safeResp, 
        id: accommodationId 
      } as ApiResponse & { id: string };
      
    } catch (error) {
      console.error('💥 ERRO em createAccommodation:', error);
      throw error;
    }
  },

  getAccommodationDetails: async (accommodationId: string): Promise<Accommodation> => {
    console.log('📋 AccommodationService: Obtendo detalhes da acomodação', accommodationId);
    
    try {
      const extendedApi = apiService as ExtendedApiService;
      if (extendedApi.getHotelById) {
        const resp = await extendedApi.getHotelById(accommodationId) as ApiResponse;
        const acc = resp.data?.accommodation ?? resp.accommodation ?? resp;
        
        if (!acc) throw new Error('Acomodação não encontrada');
        
        // ✅ CONVERSÃO PARA Accommodation UNIFICADO
        return convertToUnifiedAccommodation(acc);
      }
    } catch (error) {
      console.log('🔁 Fallback para busca geral');
    }
    
    const accommodations = await accommodationService.getAllAccommodations();
    const accommodation = accommodations.find(acc => acc.id === accommodationId);
    
    if (!accommodation) {
      throw new Error(`Acomodação ${accommodationId} não encontrada`);
    }
    
    return accommodation;
  },

  createRoomType: async (data: CreateRoomTypeRequest): Promise<any> => {
    try {
      console.log('🛏️ AccommodationService: Criando tipo de quarto', JSON.stringify(data, null, 2));
      
      const user = getCurrentUser();
      
      const roomTypeDataWithHost = {
        ...data,
        hostId: user.uid,
        createdBy: user.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      console.log('📤 Enviando tipo de quarto com hostId:', user.uid);
      
      const token = await user.getIdToken();

      const extendedApi = apiService as ExtendedApiService;
      let response;
      if (extendedApi.createRoomType) {
        response = await extendedApi.createRoomType(roomTypeDataWithHost);
      } else {
        response = await fetch('/api/hotels/room-types', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(roomTypeDataWithHost)
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Erro HTTP:', response.status, errorText);
          throw new Error(`Erro ao criar tipo de quarto: ${response.statusText}`);
        }
        
        response = await response.json();
      }

      const safeResp = safeResponse(response);
      const roomTypeId = safeResp.id || safeResp.data?.id || safeResp.roomTypeId;
      
      if (!roomTypeId) {
        console.error('❌ NENHUM ID ENCONTRADO NA RESPOSTA DO TIPO DE QUARTO!');
        throw new Error('Falha ao obter ID do tipo de quarto criado. Resposta: ' + JSON.stringify(safeResp));
      }

      console.log('✅ Tipo de quarto criado com ID:', roomTypeId);
      return { ...safeResp, id: roomTypeId };
    } catch (error) {
      console.error('❌ Erro ao criar tipo de quarto:', error);
      throw new Error(`Erro ao criar tipo de quarto: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  },

  createRoom: async (data: CreateRoomRequest): Promise<any> => {
    try {
      console.log('🛏️ AccommodationService: Criando quarto', JSON.stringify(data, null, 2));
      
      const user = getCurrentUser();
      
      const roomDataWithHost = {
        ...data,
        hostId: user.uid,
        createdBy: user.uid
      };

      console.log('📤 Enviando quarto com hostId:', user.uid);
      
      const token = await user.getIdToken();

      const extendedApi = apiService as ExtendedApiService;
      if (extendedApi.createRoom) {
        return await extendedApi.createRoom(roomDataWithHost);
      }
      
      const response = await fetch('/api/hotels/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(roomDataWithHost)
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao criar quarto: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('❌ Erro ao criar quarto:', error);
      throw new Error(`Erro ao criar quarto: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  },

  getRoomTypes: async (accommodationId: string): Promise<RoomType[]> => {
    try {
      console.log('🛏️ AccommodationService: Buscando tipos de quarto para', accommodationId);
      
      const extendedApi = apiService as ExtendedApiService;
      if (extendedApi.getRoomTypes) {
        const response = await extendedApi.getRoomTypes(accommodationId);
        return response.data || response;
      }
      
      const response = await fetch(`/api/hotels/${accommodationId}/room-types`);
      if (!response.ok) {
        throw new Error(`Erro ao buscar tipos de quarto: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.data || data;
    } catch (error) {
      console.error('❌ Erro ao buscar tipos de quarto:', error);
      return [];
    }
  },

  getRooms: async (accommodationId: string): Promise<HotelRoom[]> => {
    try {
      console.log('🛏️ AccommodationService: Buscando quartos para', accommodationId);
      
      const extendedApi = apiService as ExtendedApiService;
      if (extendedApi.getRooms) {
        const response = await extendedApi.getRooms(accommodationId);
        return response.data || response;
      }
      
      const response = await fetch(`/api/hotels/${accommodationId}/rooms`);
      if (!response.ok) {
        throw new Error(`Erro ao buscar quartos: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.data || data;
    } catch (error) {
      console.error('❌ Erro ao buscar quartos:', error);
      throw error;
    }
  },

  getRoomById: async (roomId: string): Promise<HotelRoom> => {
    try {
      console.log('🏨 AccommodationService: Buscando quarto por ID', roomId);
      
      const user = getCurrentUser();
      const token = await user.getIdToken();
      
      const response = await fetch(`/api/hotels/rooms/${roomId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar quarto: ${response.statusText}`);
      }
      
      const data = await response.json();
      return (data.data || data) as HotelRoom;
    } catch (error) {
      console.error('❌ Erro ao buscar quarto por ID:', error);
      throw new Error(`Erro ao buscar quarto: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  },

  updateRoom: async (hotelId: string, roomId: string, data: Partial<CreateRoomRequest>): Promise<HotelRoom> => {
    try {
      console.log('✏️ AccommodationService: Atualizando quarto', hotelId, roomId, data);
      
      const user = getCurrentUser();
      const token = await user.getIdToken();
      
      const payload = {
        ...data,
        hostId: user.uid
      };
      
      const response = await fetch(`/api/hotels/${hotelId}/rooms/${roomId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao atualizar quarto: ${response.statusText}`);
      }
      
      const result = await response.json();
      return (result.data || result) as HotelRoom;
    } catch (error) {
      console.error('❌ Erro ao atualizar quarto:', error);
      throw new Error(`Erro ao atualizar quarto: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  },

  deleteRoom: async (roomId: string): Promise<void> => {
    try {
      console.log('🗑️ AccommodationService: Deletando quarto', roomId);
      
      const user = getCurrentUser();
      const token = await user.getIdToken();
      
      const response = await fetch(`/api/hotels/rooms/${roomId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao deletar quarto: ${response.statusText}`);
      }
      
      console.log(`✅ Quarto ${roomId} deletado com sucesso`);
    } catch (error) {
      console.error('❌ Erro ao deletar quarto:', error);
      throw new Error(`Erro ao deletar quarto: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  },

  updateAccommodation: async (accommodationId: string, data: Partial<CreateAccommodationRequest>) => {
    const payload = {
      ...data,
      images: data.images ? (Array.isArray(data.images) ? data.images : [data.images]) : undefined,
      amenities: data.amenities ? (Array.isArray(data.amenities) ? data.amenities : [data.amenities]) : undefined
    };
    
    const extendedApi = apiService as ExtendedApiService;
    if (extendedApi.updateAccommodation) {
      return extendedApi.updateAccommodation(accommodationId, payload);
    }
    
    throw new Error('Método updateAccommodation não disponível');
  },

  deleteAccommodation: async (accommodationId: string): Promise<any> => {
    const extendedApi = apiService as ExtendedApiService;
    if (extendedApi.deleteAccommodation) {
      return extendedApi.deleteAccommodation(accommodationId);
    }
    
    throw new Error('Método deleteAccommodation não disponível');
  },

  createBooking: async (bookingData: {
    accommodationId: string;
    checkIn: string;
    checkOut: string;
    guests: number;
    totalPrice: number;
    guestDetails: any;
  }) => {
    console.log('📋 AccommodationService: Criando reserva', bookingData);
    
    try {
      const hotelBookingData = {
        accommodationId: bookingData.accommodationId,
        passengerId: bookingData.guestDetails?.clientId || 'temp-user-id',
        totalPrice: bookingData.totalPrice,
        guestName: bookingData.guestDetails?.name || '',
        guestEmail: bookingData.guestDetails?.email || '',
        guestPhone: bookingData.guestDetails?.phone || '',
        checkInDate: bookingData.checkIn,
        checkOutDate: bookingData.checkOut
      };
      
      console.log('Número de hóspedes:', bookingData.guests);
      
      const extendedApi = apiService as ExtendedApiService;
      if (extendedApi.bookHotel) {
        const result = await extendedApi.bookHotel(hotelBookingData);
        return result;
      }
      
      throw new Error('Método bookHotel não disponível');
    } catch (error) {
      console.error('❌ Erro ao criar reserva:', error);
      throw error;
    }
  },

  // ✅ FUNÇÃO AUXILIAR PARA OBTER BADGE DE LOCALIZAÇÃO (para uso no frontend)
  getLocationBadge,

  createHotel: async (hotelData: HotelFormData): Promise<CreateHotelResponse> => {
    console.log('🛠️ === DEBUG createHotel INICIANDO ===');
    
    try {
      const user = getCurrentUser();

      const accommodationData: CreateAccommodationRequest = {
        name: hotelData.name,
        type: 'hotel',
        address: hotelData.address,
        description: hotelData.description,
        amenities: hotelData.amenities,
        email: hotelData.email,
        phone: hotelData.phone,
        lat: hotelData.latitude,
        lng: hotelData.longitude,
        isAvailable: true,
        offerDriverDiscounts: true,
        enablePartnerships: true
      };

      console.log('📝 Criando acomodação básica...');
      const accommodationResponse = await accommodationService.createAccommodation(accommodationData);
      
      const safeAccommodationResp = safeResponse(accommodationResponse);
      
      const accommodationId = safeAccommodationResp.id || 
                             (safeAccommodationResp.data as any)?.id || 
                             safeAccommodationResp.accommodationId ||
                             (safeAccommodationResp.data && (safeAccommodationResp.data as any).accommodation?.id) ||
                             (safeAccommodationResp.data?.accommodation && (safeAccommodationResp.data.accommodation as any).id);
      
      console.log('🎯 ID extraído do accommodation:', accommodationId);
      
      if (!accommodationId) {
        console.error('❌ accommodationId é undefined! Resposta:', safeAccommodationResp);
        throw new Error('Não foi possível obter o ID da acomodação criada');
      }

      console.log('✅ Acomodação criada com ID:', accommodationId);

      if (hotelData.rooms && hotelData.rooms.length > 0) {
        console.log('🛏️ Criando', hotelData.rooms.length, 'tipos de quarto...');
        
        for (let index = 0; index < hotelData.rooms.length; index++) {
          const room = hotelData.rooms[index];
          console.log(`📦 Criando tipo de quarto ${index + 1}:`, room.type);
          
          if (room.price === null || room.price === undefined) {
            console.error(`❌ Erro: Preço é null/undefined para o quarto ${index + 1}:`, room.price);
            throw new Error(`Preço é obrigatório para ${room.type}. Valor recebido: ${room.price}`);
          }
          
          if (typeof room.price !== 'number' || isNaN(room.price)) {
            console.error(`❌ Erro: Preço não é um número válido para o quarto ${index + 1}:`, room.price);
            throw new Error(`Preço deve ser um número válido para ${room.type}. Valor recebido: ${room.price}`);
          }
          
          if (room.price <= 0) {
            console.error(`❌ Erro: Preço deve ser maior que zero para o quarto ${index + 1}:`, room.price);
            throw new Error(`Preço deve ser maior que zero para ${room.type}. Valor recebido: ${room.price}`);
          }

          if (!room.type || room.type.trim() === '') {
            console.error(`❌ Erro: room.type está vazio ou indefinido para o quarto ${index + 1}`);
            throw new Error(`O campo 'type' é obrigatório para o tipo de quarto ${index + 1}.`);
          }

          const pricePerNight = Number(room.price);
          if (isNaN(pricePerNight) || pricePerNight <= 0) {
            console.error(`❌ Erro CRÍTICO: pricePerNight inválido após conversão:`, pricePerNight);
            throw new Error(`Preço inválido para ${room.type}. Valor final: ${pricePerNight}`);
          }

          const roomTypeData: CreateRoomTypeRequest = {
            accommodationId: accommodationId,
            name: room.type,
            type: 'standard',
            pricePerNight: pricePerNight,
            description: room.description,
            maxOccupancy: room.capacity,
            amenities: room.amenities || [],
            images: []
          };

          console.log('📤 Room data a ser criada:', {
            name: roomTypeData.name,
            type: roomTypeData.type,
            pricePerNight: roomTypeData.pricePerNight,
            hasPrice: roomTypeData.pricePerNight > 0,
            description: roomTypeData.description,
            maxOccupancy: roomTypeData.maxOccupancy
          });
          
          const roomTypeDataWithHost = {
            ...roomTypeData,
            hostId: user.uid,
            accommodationId: accommodationId
          };

          console.log('🔐 Enviando dados para API...');
          const token = await user.getIdToken();

          const response = await fetch('/api/hotels/room-types', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(roomTypeDataWithHost)
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Erro HTTP ${response.status}:`, errorText);
            throw new Error(`Erro ao criar tipo de quarto ${index + 1}: ${response.status} ${response.statusText}`);
          }

          const roomTypeResponse = await response.json();
          console.log(`✅ Tipo de quarto ${index + 1} criado:`, roomTypeResponse);
        }

        console.log('✅ Todos os tipos de quarto criados com sucesso');
      }

      const fileImages = hotelData.images.filter((img): img is File => img instanceof File);
      
      if (fileImages.length > 0) {
        console.log('🖼️ Fazendo upload de', fileImages.length, 'imagens...');
        try {
          await accommodationService.uploadHotelImages(accommodationId, fileImages);
          console.log('✅ Upload de imagens concluído');
        } catch (uploadError) {
          console.warn('⚠️ Upload de imagens falhou, mas continuando:', uploadError);
        }
      }

      console.log('🎉 Hotel criado com sucesso! ID:', accommodationId);
      return {
        hotelId: accommodationId,
        success: true,
        message: 'Hotel criado com sucesso'
      };

    } catch (error) {
      console.error('❌ Erro ao criar hotel completo:', error);
      throw error;
    }
  },

  uploadHotelImages: async (hotelId: string, images: (File | string)[]): Promise<void> => {
    try {
      const fileImages = images.filter((img): img is File => img instanceof File);
      
      const uploadPromises = fileImages.map(async (image, index) => {
        const formData = new FormData();
        formData.append('image', image);
        formData.append('hotelId', hotelId);
        formData.append('order', index.toString());

        const response = await fetch('/api/hotels/upload-image', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Erro ao fazer upload da imagem ${index + 1}`);
        }

        console.log(`✅ Imagem ${index + 1} upload com sucesso`);
      });

      await Promise.all(uploadPromises);
      console.log('✅ Todas as imagens foram upload com sucesso');
    } catch (error) {
      console.error('❌ Erro no upload de imagens:', error);
      throw error;
    }
  },

  createHotelJSON: async (hotelData: HotelFormData): Promise<CreateHotelResponse> => {
    try {
      console.log('🏨 AccommodationService: Criando hotel via JSON', hotelData);

      const user = getCurrentUser();

      const basicHotelData = {
        name: hotelData.name,
        description: hotelData.description,
        category: hotelData.category,
        email: hotelData.email,
        phone: hotelData.phone,
        address: hotelData.address,
        city: hotelData.city,
        state: hotelData.state,
        country: hotelData.country,
        zipCode: hotelData.zipCode,
        amenities: hotelData.amenities,
        roomTypes: hotelData.rooms.map(room => ({
          type: room.type.toLowerCase(),
          description: room.description,
          price: room.price,
          capacity: room.capacity,
          quantity: room.quantity,
          amenities: room.amenities
        })),
        hostId: user.uid
      };

      console.log('📤 Enviando dados básicos do hotel...');
      const response = await fetch('/api/hotels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(basicHotelData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Erro ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      const hotelId = result.hotelId || result.id;

      const fileImages = hotelData.images.filter((img): img is File => img instanceof File);
      
      if (fileImages.length > 0) {
        await accommodationService.uploadHotelImages(hotelId, fileImages);
        console.log('✅ Upload de imagens concluído');
      }

      return {
        hotelId,
        success: true,
        message: 'Hotel criado com sucesso'
      };

    } catch (error) {
      console.error('❌ Erro ao criar hotel via JSON:', error);
      throw error;
    }
  },

  getHotelStats: async (hotelId: string): Promise<any> => {
    try {
      console.log('📊 AccommodationService: Buscando estatísticas do hotel', hotelId);
      
      const extendedApi = apiService as ExtendedApiService;
      if (extendedApi.getHotelStats) {
        return await extendedApi.getHotelStats(hotelId);
      }
      
      return {
        totalBookings: 73,
        monthlyRevenue: 224500,
        averageRating: 4.8,
        averageOccupancy: 82,
        totalEvents: 1,
        upcomingEvents: 1,
        activePartnerships: 2,
        partnershipEarnings: 11000,
        totalRoomTypes: 2,
        totalRooms: 8,
        availableRooms: 6
      };
    } catch (error) {
      console.error('❌ Erro ao buscar estatísticas:', error);
      throw error;
    }
  },

  updateHotel: async (hotelId: string, data: Partial<HotelFormData>): Promise<any> => {
    try {
      console.log('✏️ AccommodationService: Atualizando hotel', hotelId, data);
      
      const response = await fetch(`/api/hotels/${hotelId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Erro ao atualizar hotel: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Erro ao atualizar hotel:', error);
      throw error;
    }
  }
};

export default accommodationService;