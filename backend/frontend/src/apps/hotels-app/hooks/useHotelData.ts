// src/apps/hotels-app/hooks/useHotelData.ts - VERSÃO CORRIGIDA DEFINITIVA
import { useQuery } from '@tanstack/react-query';
import { apiService } from '@/services/api';
import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import type { Hotel, RoomType, ApiResponse } from '@/types';

export function useHotelData(hotelId?: string | null) {
  const [location] = useLocation();
  const [selectedHotelId, setSelectedHotelId] = useState<string | null>(null);
  const [selectedHotel, setSelectedHotel] = useState<Hotel | undefined>(undefined);
  
  // 🔥 1. GERENCIAMENTO DO HOTEL SELECIONADO
  
  // Inicializar do localStorage
  useEffect(() => {
    const savedHotelId = localStorage.getItem('selectedHotelId');
    if (savedHotelId && savedHotelId !== 'undefined' && savedHotelId !== 'null') {
      setSelectedHotelId(savedHotelId);
    }
  }, []);
  
  // Salvar no localStorage quando mudar
  useEffect(() => {
    if (selectedHotelId && selectedHotelId !== 'undefined' && selectedHotelId !== 'null') {
      localStorage.setItem('selectedHotelId', selectedHotelId);
    }
  }, [selectedHotelId]);
  
  // Extrair hotelId da URL quando em rotas de hotel
  useEffect(() => {
    const path = location;
    
    if (path.startsWith('/hotels/')) {
      const pathParts = path.split('/');
      const possibleHotelId = pathParts[2]; // /hotels/[hotelId]/...
      
      // Rotas fixas que NÃO são hotelId
      const fixedRoutes = [
        'dashboard', 'create', 'bookings', 'analytics', 
        'settings', 'debug', ''
      ];
      
      if (possibleHotelId && !fixedRoutes.includes(possibleHotelId)) {
        // É um hotelId válido
        setSelectedHotelId(possibleHotelId);
      }
    }
  }, [location]);
  
  // Usar o hotelId passado como prop ou o selecionado
  const effectiveHotelId = hotelId || selectedHotelId;
  
  // 🔥 2. QUERIES PARA DADOS DO HOTEL - VERSÃO CORRIGIDA
  
  // Buscar detalhes do hotel - ✅ SEMPRE retornar ApiResponse
  const hotelQuery = useQuery({
    queryKey: ['hotel', effectiveHotelId],
    queryFn: async (): Promise<ApiResponse<Hotel>> => {
      if (!effectiveHotelId || effectiveHotelId === 'undefined' || effectiveHotelId === 'null') {
        return {
          success: false,
          error: 'ID do hotel inválido',
          data: undefined
        };
      }
      
      try {
        const response = await apiService.getHotelById(effectiveHotelId);
        
        if (!response || typeof response !== 'object') {
          return {
            success: false,
            error: 'Resposta inválida do servidor',
            data: undefined
          };
        }
        
        if (response.success && response.data) {
          setSelectedHotel(response.data);
        }
        
        return response;
        
      } catch (error) {
        console.error('Erro ao buscar hotel:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido ao buscar hotel',
          data: undefined
        };
      }
    },
    enabled: !!effectiveHotelId && effectiveHotelId !== 'undefined' && effectiveHotelId !== 'null',
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });
  
  // Buscar quartos do hotel - ✅ SEMPRE retornar ApiResponse
  const roomsQuery = useQuery({
    queryKey: ['hotel-rooms', effectiveHotelId],
    queryFn: async (): Promise<ApiResponse<RoomType[]>> => {
      if (!effectiveHotelId || effectiveHotelId === 'undefined' || effectiveHotelId === 'null') {
        return {
          success: false,
          data: [],
          error: 'ID do hotel não fornecido'
        };
      }
      
      try {
        const response = await apiService.getRoomTypesByHotel(effectiveHotelId);
        
        // ✅ Garantir que data seja sempre um array
        const normalizedResponse = {
          ...response,
          data: Array.isArray(response.data) ? response.data : []
        };
        
        return normalizedResponse;
        
      } catch (error) {
        console.error('Erro ao buscar quartos:', error);
        return {
          success: false,
          data: [],
          error: error instanceof Error ? error.message : 'Erro desconhecido ao buscar quartos'
        };
      }
    },
    enabled: !!effectiveHotelId && effectiveHotelId !== 'undefined' && effectiveHotelId !== 'null',
    staleTime: 2 * 60 * 1000,
  });
  
  // Buscar estatísticas - ✅ SEMPRE retornar ApiResponse
  const statsQuery = useQuery({
    queryKey: ['hotel-stats', effectiveHotelId],
    queryFn: async (): Promise<ApiResponse<any>> => {
      if (!effectiveHotelId || effectiveHotelId === 'undefined' || effectiveHotelId === 'null') {
        return {
          success: false,
          data: null,
          error: 'ID do hotel não fornecido'
        };
      }
      
      try {
        const response = await apiService.getHotelStatsDetailed(effectiveHotelId);
        
        if (!response || typeof response !== 'object') {
          return {
            success: false,
            data: null,
            error: 'Resposta inválida do servidor'
          };
        }
        
        return response;
        
      } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        return {
          success: false,
          data: null,
          error: error instanceof Error ? error.message : 'Erro desconhecido ao buscar estatísticas'
        };
      }
    },
    enabled: !!effectiveHotelId && effectiveHotelId !== 'undefined' && effectiveHotelId !== 'null',
  });
  
  // 🔥 3. FUNÇÕES PARA MANIPULAR HOTEL SELECIONADO
  
  const selectHotel = useCallback((hotel: Hotel) => {
    const rawId = hotel.id ?? hotel.hotel_id;
    const hotelId = rawId ? String(rawId) : '';
    if (hotelId) {
      setSelectedHotelId(hotelId);
      setSelectedHotel(hotel);
    }
  }, []);
  
  const selectHotelById = useCallback((hotelId: string) => {
    if (hotelId && hotelId !== 'undefined' && hotelId !== 'null') {
      setSelectedHotelId(hotelId);
      setSelectedHotel(undefined);
    }
  }, []);
  
  const clearSelectedHotel = useCallback(() => {
    setSelectedHotelId(null);
    setSelectedHotel(undefined);
    localStorage.removeItem('selectedHotelId');
  }, []);
  
  // 🔥 4. FUNÇÕES ÚTEIS PARA HOTEL
  
  const getHotelName = useCallback((hotel?: Partial<Hotel> | null): string => {
    return hotel?.name || hotel?.hotel_name || 'Hotel sem nome';
  }, []);
  
  const getHotelId = useCallback((hotel?: Partial<Hotel> | null): string => {
    const rawId = hotel?.id ?? hotel?.hotel_id;
    return rawId ? String(rawId) : '';
  }, []);
  
  const formatPrice = useCallback((price?: string | number): string => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price || 0;
    if (numPrice <= 0) return 'Sob consulta';
    return new Intl.NumberFormat('pt-MZ', {
      style: 'currency',
      currency: 'MZN',
      minimumFractionDigits: 2
    }).format(numPrice);
  }, []);
  
  // 🔥 5. VALIDAÇÕES
  
  const isHotelActive = useCallback((hotel?: Hotel): boolean => {
    return hotel?.is_active !== false;
  }, []);
  
  const isValidHotel = useCallback((hotel?: Hotel): boolean => {
    return !!hotel && (!!hotel.id || !!hotel.hotel_id);
  }, []);
  
  // 🔥 6. FUNÇÕES ADICIONAIS PARA TRATAMENTO DE DADOS
  
  const getHotelCoordinates = useCallback((hotel?: Hotel): { lat: number; lng: number } | undefined => {
    if (!hotel) return undefined;
    
    // Primeiro tenta da string location
    if (typeof hotel.location === 'string' && hotel.location) {
      const [latStr, lngStr] = hotel.location.split(',');
      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);
      if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng };
      }
    }
    
    // Tenta dos campos lat/lng individuais (são strings)
    if (typeof hotel.lat === 'string' && typeof hotel.lng === 'string') {
      const lat = parseFloat(hotel.lat);
      const lng = parseFloat(hotel.lng);
      if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng };
      }
    }
    
    return undefined;
  }, []);
  
  const formatHotelLocation = useCallback((hotel?: Hotel): string => {
    if (!hotel) return 'Localização não disponível';
    
    if (typeof hotel.location === 'string' && hotel.location) {
      const coords = getHotelCoordinates(hotel);
      if (coords) {
        return `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
      }
      return hotel.location;
    }
    
    if (hotel.lat && hotel.lng) {
      const latStr = typeof hotel.lat === 'string' ? hotel.lat : String(hotel.lat);
      const lngStr = typeof hotel.lng === 'string' ? hotel.lng : String(hotel.lng);
      return `${latStr}, ${lngStr}`;
    }
    
    return 'Localização não disponível';
  }, [getHotelCoordinates]);
  
  // 🔥 7. FUNÇÕES UTILITÁRIAS
  
  const getHotelAddress = useCallback((hotel?: Hotel): string => {
    if (!hotel) return '';
    return [hotel.address, hotel.locality, hotel.province]
      .filter(Boolean)
      .join(', ');
  }, []);
  
  const getHotelContactInfo = useCallback((hotel?: Hotel): { email?: string; phone?: string } => {
    if (!hotel) return {};
    return {
      email: hotel.contact_email,
      phone: hotel.contact_phone
    };
  }, []);
  
  const getHotelAmenities = useCallback((hotel?: Hotel): string[] => {
    if (!hotel || !hotel.amenities) return [];
    
    if (Array.isArray(hotel.amenities)) {
      return hotel.amenities;
    }
    
    if (typeof hotel.amenities === 'string') {
      try {
        const parsed = JSON.parse(hotel.amenities);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch {
        return [];
      }
    }
    
    return [];
  }, []);
  
  const getHotelForEdit = useCallback((hotel?: Hotel) => {
    if (!hotel) return undefined;
    
    return {
      name: hotel.name || '',
      description: hotel.description || '',
      address: hotel.address || '',
      locality: hotel.locality || '',
      province: hotel.province || 'Maputo',
      contact_email: hotel.contact_email || '',
      contact_phone: hotel.contact_phone || '',
      policies: hotel.policies || '',
      check_in_time: hotel.check_in_time || '14:00',
      check_out_time: hotel.check_out_time || '12:00',
      amenities: getHotelAmenities(hotel),
      images: hotel.images || [],
      is_active: hotel.is_active !== false,
      country: hotel.country || 'Mozambique'
    };
  }, [getHotelAmenities]);
  
  // 🔥 8. FUNÇÕES DE HELPER ESPECÍFICAS
  
  const findRoomType = useCallback((roomTypeId: string): RoomType | undefined => {
    // Primeiro tenta do roomsQuery.data.data
    const roomsData = roomsQuery.data?.data;
    if (Array.isArray(roomsData)) {
      return roomsData.find(rt => rt.id === roomTypeId);
    }
    
    // Fallback para o array rooms de retorno (para compatibilidade)
    return undefined;
  }, [roomsQuery.data?.data]);
  
  const getRoomTypesForSelect = useCallback(() => {
    const roomsData = roomsQuery.data?.data || [];
    return roomsData.map(room => ({
      value: room.id,
      label: room.name,
      price: Number(room.base_price) || 0,
      units: Number(room.total_units) || 0
    }));
  }, [roomsQuery.data?.data]);
  
  const validateRoomType = useCallback((roomTypeId: string) => {
    const room = findRoomType(roomTypeId);
    if (!room) return { valid: false, error: 'Tipo de quarto não encontrado' };
    if (Number(room.total_units) <= 0) return { valid: false, error: 'Quarto sem unidades disponíveis' };
    return { valid: true, room };
  }, [findRoomType]);
  
  // 🔥 9. RETORNO COMPLETO - VERSÃO CORRIGIDA
  
  return {
    // Dados do hotel (extrair data das respostas)
    hotel: hotelQuery.data?.data,
    rooms: roomsQuery.data?.data || [],
    stats: statsQuery.data?.data,
    
    // Respostas completas (para debugging)
    hotelResponse: hotelQuery.data,
    roomsResponse: roomsQuery.data,
    statsResponse: statsQuery.data,
    
    // Estado do hotel selecionado
    selectedHotelId,
    selectedHotel: hotelQuery.data?.data || selectedHotel,
    isHotelSelected: !!effectiveHotelId && effectiveHotelId !== 'undefined' && effectiveHotelId !== 'null',
    
    // Status das queries
    isLoading: hotelQuery.isLoading || roomsQuery.isLoading || statsQuery.isLoading,
    isError: hotelQuery.isError || roomsQuery.isError || statsQuery.isError,
    hotelLoading: hotelQuery.isLoading,
    roomsLoading: roomsQuery.isLoading,
    statsLoading: statsQuery.isLoading,
    isFetching: hotelQuery.isFetching || roomsQuery.isFetching || statsQuery.isFetching,
    
    // Erros (extrair das respostas primeiro)
    hotelError: hotelQuery.data?.error || hotelQuery.error?.message,
    roomsError: roomsQuery.data?.error || roomsQuery.error?.message,
    statsError: statsQuery.data?.error || statsQuery.error?.message,
    
    // Sucesso das operações
    hotelSuccess: hotelQuery.data?.success,
    roomsSuccess: roomsQuery.data?.success,
    statsSuccess: statsQuery.data?.success,
    
    // Funções para manipular
    selectHotel,
    selectHotelById,
    clearSelectedHotel,
    
    // Funções úteis
    getHotelName,
    getHotelId,
    formatPrice,
    isHotelActive,
    isValidHotel,
    getHotelCoordinates,
    formatHotelLocation,
    
    // Funções utilitárias
    getHotelAddress,
    getHotelContactInfo,
    getHotelAmenities,
    getHotelForEdit,
    
    // Refetch
    refetch: () => {
      hotelQuery.refetch();
      roomsQuery.refetch();
      statsQuery.refetch();
    },
    refetchHotel: hotelQuery.refetch,
    refetchRooms: roomsQuery.refetch,
    refetchStats: statsQuery.refetch,
    
    // Helper para array seguro de rooms
    safeRooms: Array.isArray(roomsQuery.data?.data) ? roomsQuery.data.data : [],
    
    // 🔥 NOVO: Helper para encontrar room type (IMPORTANTE!)
    findRoomType,
    getRoomTypesForSelect,
    validateRoomType,
    
    // Status combinado
    isReady: !hotelQuery.isLoading && !roomsQuery.isLoading && !statsQuery.isLoading,
    hasData: !!hotelQuery.data?.data && Array.isArray(roomsQuery.data?.data) && roomsQuery.data.data.length > 0,
    
    // Métodos de validação
    hasRooms: (roomsQuery.data?.data?.length || 0) > 0,
    totalRooms: (Array.isArray(roomsQuery.data?.data) ? roomsQuery.data.data : []).reduce((sum, room) => 
      sum + (Number(room.total_units) || 0), 0
    ),
    totalAvailableRooms: (Array.isArray(roomsQuery.data?.data) ? roomsQuery.data.data : []).reduce((sum, room) => 
      sum + (Number(room.available_units) || 0), 0
    ),
    
    // Helper para verificar se está em dashboard específico
    isSpecificHotelDashboard: useCallback(() => {
      const path = location;
      return path.startsWith('/hotels/') && 
        path.split('/').length > 2 && 
        !['dashboard', 'create', 'bookings', 'analytics', 'settings', 'debug'].includes(path.split('/')[2]);
    }, [location]),
    
    // Helper para obter informações de pagamento
    getPaymentInfo: useCallback((hotel?: Hotel) => {
      if (!hotel) return undefined;
      return {
        minPrice: (hotel as any).min_price_per_night,
        maxPrice: (hotel as any).max_price_per_night,
        priceRange: (hotel as any).price_range,
        rating: hotel.rating,
        totalReviews: hotel.total_reviews
      };
    }, []),
    
    // Helper para obter informações de disponibilidade
    getAvailabilityInfo: useCallback((hotel?: Hotel) => {
      if (!hotel) return undefined;
      return {
        totalAvailableRooms: (hotel as any).total_available_rooms,
        availableRoomTypes: (hotel as any).available_room_types,
        matchScore: (hotel as any).match_score
      };
    }, []),
    
    // Flags para renderização condicional (apenas booleanos, não JSX)
    showLoading: hotelQuery.isLoading || roomsQuery.isLoading || statsQuery.isLoading,
    showError: hotelQuery.isError || roomsQuery.isError || statsQuery.isError,
    showEmpty: !hotelQuery.isLoading && !roomsQuery.isLoading && 
                (!hotelQuery.data?.data || (roomsQuery.data?.data?.length || 0) === 0)
  };
}