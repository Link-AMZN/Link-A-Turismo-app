import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/shared/components/ui/dialog";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Badge } from "@/shared/components/ui/badge";
import { useToast } from "@/shared/hooks/use-toast";
import { ArrowLeft, Phone, Mail, CreditCard, User, Star, MapPin, Navigation, RefreshCw } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import PageHeader from "@/shared/components/PageHeader";
import MobileNavigation from "@/shared/components/MobileNavigation";
import useAuth from "@/shared/hooks/useAuth";

// ✅ IMPORTAR INTERFACE DO APISERVICE
import { type Ride } from '@/services/api';

// ✅ CORREÇÃO: Interface MatchStats atualizada
export interface MatchStats {
  total: number;
  exact?: number;
  compatible?: number;
  same_segment?: number;
  same_direction?: number;
  potential_match?: number;
  smart_matches?: number;
}

// ✅ CORREÇÃO: Interface para informações de matching
export interface RideMatchInfo {
  match_type?: 'exact_match' | 'same_segment' | 'covers_route' | 'nearby' | 'same_direction' | 'smart_match' | 'potential_match' | 'smart_final_direct';
  route_compatibility?: number;
  matchScore?: number;
  dist_from_user_km?: number;
  distance_from_city_km?: number;
  distance_to_city_km?: number;
}

// ✅ TIPO COMBINADO PARA RIDE COM MATCHING
type RideWithMatch = Ride & RideMatchInfo;

// ✅ INTERFACE EXTENDIDA PARA PARÂMETROS DE BUSCA COM COORDENADAS
interface RideSearchParamsExtended {
  from: string;
  to: string;
  date: string;
  passengers: number;
  fromLat?: number;
  fromLng?: number;
  toLat?: number;
  toLng?: number;
  radius?: number;
  transportType?: string;
  fromCity?: string;
  toCity?: string;
  fromDistrict?: string;
  toDistrict?: string;
  fromId?: string;
  toId?: string;
}

interface LocationState {
  rides: RideWithMatch[];
  searchParams: RideSearchParamsExtended;
  timestamp?: number;
}

// ✅ INTERFACE PARA BOOKING REQUEST
interface BookingRequest {
  rideId: string;
  passengers: number;
  pickupLocation: string;
  notes: string;
}

export default function RideSearchPage() {
  const [location, setLocation] = useLocation();
  const [selectedRide, setSelectedRide] = useState<RideWithMatch | null>(null);
  const [bookingModal, setBookingModal] = useState(false);
  const [bookingData, setBookingData] = useState({
    passengers: 1,
    phone: "",
    email: "",
    notes: ""
  });
  
  const { toast } = useToast();
  const { user } = useAuth();

  // ✅ USAR INTERFACE RIDE COM MATCHING - INICIALIZAR SEMPRE COMO ARRAY
  const [rides, setRides] = useState<RideWithMatch[]>([]);
  const [searchParams, setSearchParams] = useState<RideSearchParamsExtended>({
    from: "",
    to: "",
    date: "",
    passengers: 1,
    radius: 100 // ✅ CORREÇÃO: Raio padrão aumentado para 100km
  });

  // ✅ ESTADO PARA INDICAR BUSCA INTELIGENTE
  const [isSmartSearch, setIsSmartSearch] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // ✅✅✅ CORREÇÃO CRÍTICA: Nova função para ler parâmetros da URL
  const getSearchParamsFromURL = (): Partial<RideSearchParamsExtended> => {
    const urlParams = new URLSearchParams(window.location.search);
    const params: Partial<RideSearchParamsExtended> = {};
    
    // Parâmetros básicos
    if (urlParams.has('from')) params.from = urlParams.get('from') || '';
    if (urlParams.has('to')) params.to = urlParams.get('to') || '';
    if (urlParams.has('date')) params.date = urlParams.get('date') || '';
    if (urlParams.has('passengers')) params.passengers = parseInt(urlParams.get('passengers') || '1');
    if (urlParams.has('radius')) params.radius = parseInt(urlParams.get('radius') || '100');
    
    // IDs das localizações
    if (urlParams.has('fromId')) params.fromId = urlParams.get('fromId') || '';
    if (urlParams.has('toId')) params.toId = urlParams.get('toId') || '';
    
    // Coordenadas (se disponíveis)
    if (urlParams.has('fromLat')) params.fromLat = parseFloat(urlParams.get('fromLat') || '0');
    if (urlParams.has('fromLng')) params.fromLng = parseFloat(urlParams.get('fromLng') || '0');
    if (urlParams.has('toLat')) params.toLat = parseFloat(urlParams.get('toLat') || '0');
    if (urlParams.has('toLng')) params.toLng = parseFloat(urlParams.get('toLng') || '0');
    
    console.log('🔗 [DEBUG-URL-PARAMS] Parâmetros da URL:', params);
    return params;
  };

  // ✅✅✅ CORREÇÃO CRÍTICA: useEffect completamente corrigido
  useEffect(() => {
    console.log('🚗 RideSearchPage - Iniciando...');
    
    const currentState = (history.state || {}) as LocationState;
    const urlParams = getSearchParamsFromURL();
    
    console.log('🔍 [DEBUG-NAVIGATION] Dados recebidos:', {
      viaState: !!currentState?.searchParams,
      viaURL: Object.keys(urlParams).length > 0,
      stateDate: currentState?.searchParams?.date,
      urlDate: urlParams.date,
      fullURLParams: urlParams,
      fullStateParams: currentState?.searchParams
    });
    
    // ✅✅✅ CORREÇÃO CRÍTICA: Combinar parâmetros do state E da URL
    const combinedParams: RideSearchParamsExtended = {
      // Começar com state (se disponível) ou padrões
      ...(currentState?.searchParams || {
        from: "",
        to: "", 
        date: "",
        passengers: 1,
        radius: 100
      }),
      
      // URL tem PRIORIDADE MÁXIMA (sobrescreve tudo)
      ...urlParams
    };

    console.log('🎯 [DEBUG-COMBINED] Parâmetros finais:', {
      from: combinedParams.from,
      to: combinedParams.to, 
      date: combinedParams.date,
      passengers: combinedParams.passengers,
      source: urlParams.from ? 'URL' : currentState?.searchParams?.from ? 'STATE' : 'DEFAULT'
    });
    
    // ✅✅✅ CORREÇÃO CRÍTICA: Atualizar estado E executar busca de forma síncrona
    setSearchParams(combinedParams);
    
    // ✅✅✅ CORREÇÃO: Executar busca DIRETAMENTE com os parâmetros combinados
    // Não depender do estado do React que é assíncrono
    if (combinedParams.from && combinedParams.to) {
      console.log('📍 Parâmetros válidos, iniciando busca DIRETA...');
      
      // ✅ Pequeno delay para garantir que componentes estão montados
      setTimeout(() => {
        executeSearchWithParams(combinedParams);
      }, 50);
    } else {
      console.log('❌ Parâmetros insuficientes para busca');
      redirectToHome();
    }
  }, []); // ✅ Executar apenas no mount

  const redirectToHome = () => {
    toast({
      title: "Dados não encontrados",
      description: "Por favor, realize uma nova busca.",
      variant: "destructive",
      duration: 4000,
    });
    setLocation('/');
  };

  // ✅✅✅ CORREÇÃO CRÍTICA: Função fetchSmartRides com parâmetros explícitos
  const fetchSmartRides = async (params: RideSearchParamsExtended): Promise<RideWithMatch[]> => {
    try {
      console.log('🧠 [SMART-FINAL] Buscando com parâmetros:', {
        from: params.from,
        to: params.to,
        date: params.date
      });

      // ✅✅✅ CORREÇÃO CRÍTICA: Usar parâmetros PASSADOS, não searchParams do estado
      const smartParams = new URLSearchParams({
        from: params.from || '',
        to: params.to || '',
        date: params.date || '',
        passengers: params.passengers.toString(),
        radiusKm: (params.radius || 100).toString()
      });

      console.log('🔍 [DEBUG-SMART-PARAMS] URL que será enviada:', `/api/rides/smart/search?${smartParams.toString()}`);

      // ✅✅✅ CORREÇÃO CRÍTICA: Usar endpoint CORRETO - /api/rides/smart/search (NÃO provider)
      const response = await fetch(`/api/rides/smart/search?${smartParams.toString()}`);
      
      if (!response.ok) {
        console.error('❌ Erro na resposta:', response.status, response.statusText);
        throw new Error("Erro ao buscar rotas inteligentes");
      }
      
      const data = await response.json();
      
      console.log('✅ Resposta smart final:', {
        success: data.success,
        totalRides: data.data?.rides?.length || 0,
        smartSearch: data.smart_search,
        matchStats: data.data?.stats,
        // ✅ ADICIONAR: Verificar normalização
        normalization: data.data?.normalization,
        searchMetadata: data.data?.search_metadata
      });

      // ✅ CORREÇÃO: Processar resposta específica da função smart final
      if (data.success && data.data) {
        const ridesArray = Array.isArray(data.data.rides) ? data.data.rides : [];
        
        // ✅ CORREÇÃO: Mapear campos específicos do smart final
        const mappedRides: RideWithMatch[] = ridesArray.map((ride: any) => ({
          ...ride,
          // ✅ Campos específicos do smart final (snake_case do backend)
          id: ride.ride_id || ride.id,
          driverId: ride.driver_id || ride.driverId,
          match_type: ride.match_type,
          route_compatibility: ride.route_compatibility,
          matchScore: ride.route_compatibility, // ✅ Compatibilidade com frontend
          dist_from_user_km: ride.distance_from_city_km,
          distance_from_city_km: ride.distance_from_city_km,
          distance_to_city_km: ride.distance_to_city_km,
          // ✅ Campos de normalização do backend para frontend
          fromLocation: ride.from_location || ride.from_city || ride.from_address || ride.fromLocation,
          toLocation: ride.to_location || ride.to_city || ride.to_address || ride.toLocation,
          fromAddress: ride.from_address || ride.from_location || ride.from_city || ride.fromAddress,
          toAddress: ride.to_address || ride.to_location || ride.to_city || ride.toAddress,
          price: ride.price || ride.price_per_seat,
          pricePerSeat: ride.price_per_seat || ride.price,
          availableSeats: ride.available_seats || ride.availableSeats,
          vehicleType: ride.vehicle_type || ride.vehicleType,
          departureDate: ride.departure_date || ride.departureDate,
          departureTime: ride.departure_time || ride.departureTime,
          driverName: ride.driver_name || ride.driverName,
          // ✅ Informações do driver
          driver: ride.driver || {
            firstName: ride.driver_name?.split(' ')[0] || 'Motorista',
            lastName: ride.driver_name?.split(' ').slice(1).join(' ') || '',
            rating: ride.driver_rating || ride.driverRating,
            isVerified: ride.is_verified_driver || ride.isVerifiedDriver
          },
          // ✅ ADICIONAR: Metadados de normalização do backend
          search_metadata: ride.search_metadata || data.data?.search_metadata
        }));

        console.log('🎯 Rides mapeados do smart final:', mappedRides.length);
        
        // ✅ LOG DETALHADO DOS MATCHES ENCONTRADOS E NORMALIZAÇÃO
        if (mappedRides.length > 0) {
          const exactMatches = mappedRides.filter(r => r.match_type === 'exact_match').length;
          const smartMatches = mappedRides.filter(r => r.match_type && r.match_type !== 'exact_match').length;
          
          // ✅ VERIFICAR SE HOUVE NORMALIZAÇÃO
          const normalizationApplied = data.data?.normalization?.applied || false;
          const originalTerms = data.data?.normalization?.original;
          const normalizedTerms = data.data?.normalization?.normalized;
          
          console.log(`📊 Estatísticas Smart: ${exactMatches} exatos, ${smartMatches} inteligentes`);
          
          if (normalizationApplied) {
            console.log('🔄 NORMALIZAÇÃO APLICADA:', {
              original: originalTerms,
              normalized: normalizedTerms
            });
          }
        }
        
        return mappedRides;
      }
      
      return [];
      
    } catch (error) {
      console.error('❌ Erro na busca smart final:', error);
      // Fallback para busca tradicional SEGURA
      return await fetchTraditionalRidesSafely(params);
    }
  };

  // ✅✅✅ CORREÇÃO: fetchTraditionalRidesSafely também recebe parâmetros
  const fetchTraditionalRidesSafely = async (params: RideSearchParamsExtended): Promise<RideWithMatch[]> => {
    // Verificação rigorosa antes de fazer a requisição
    if (!params.from || !params.to) {
      console.warn('⚠️ [TRADITIONAL-SAFE] Parâmetros insuficientes, pulando busca tradicional');
      return [];
    }

    try {
      console.log('🔍 [TRADITIONAL-SECONDARY] Buscando tradicionalmente...');
      
      const queryParams = new URLSearchParams({
        from: params.from,
        to: params.to,
        passengers: params.passengers.toString(),
        date: params.date || '',
        radiusKm: (params.radius || 150).toString()
      });

      const response = await fetch(`/api/rides/traditional/search?${queryParams.toString()}`);
      
      if (!response.ok) {
        console.warn('⚠️ [TRADITIONAL-SECONDARY] Busca tradicional falhou:', response.status);
        return [];
      }
      
      const data = await response.json();
      console.log('✅ [TRADITIONAL-SECONDARY] Resultados:', data.length);
      return data;
      
    } catch (error) {
      console.error('❌ [TRADITIONAL-SECONDARY] Erro seguro:', error);
      return [];
    }
  };

  // ✅✅✅ CORREÇÃO: Função handleSmartSearch simplificada
  const handleSmartSearch = async () => {
    console.log('🧠 [HANDLE-SMART-SEARCH] Iniciando busca...');
    
    // ✅ Usar searchParams atual + fallback da URL se necessário
    const currentFrom = searchParams.from;
    const currentTo = searchParams.to;
    
    console.log('🔍 [HANDLE-SEARCH-STATE] Estado atual:', {
      currentFrom,
      currentTo,
      hasFrom: !!currentFrom,
      hasTo: !!currentTo
    });

    // ✅ Se estado não tem dados, buscar da URL diretamente
    if (!currentFrom || !currentTo) {
      console.log('🔄 [HANDLE-SEARCH-FALLBACK] Buscando parâmetros da URL...');
      const urlParams = getSearchParamsFromURL();
      
      if (urlParams.from && urlParams.to) {
        console.log('✅ [HANDLE-SEARCH-URL-SUCCESS] Usando URL:', {
          from: urlParams.from,
          to: urlParams.to
        });
        
        // ✅ Atualizar estado e buscar
        setSearchParams(prev => ({ ...prev, ...urlParams }));
        await executeSearchWithParams({ ...searchParams, ...urlParams } as RideSearchParamsExtended);
        return;
      }
    }

    // ✅ Se temos parâmetros, executar busca normal
    if (currentFrom && currentTo) {
      await executeSearchWithParams(searchParams);
    } else {
      console.error('❌ [HANDLE-SEARCH-CRITICAL] Nenhum parâmetro disponível');
      toast({
        title: "Erro nos parâmetros",
        description: "Não foi possível obter origem e destino para a busca.",
        variant: "destructive",
        duration: 4000,
      });
    }
  };

  // ✅✅✅ CORREÇÃO: executeSearchWithParams recebe parâmetros explicitamente
  const executeSearchWithParams = async (params: RideSearchParamsExtended) => {
    console.log('🚀 [EXECUTE-SEARCH] Executando busca com parâmetros:', {
      from: params.from,
      to: params.to,
      date: params.date,
      hasCompleteCoordinates: !!(params.fromLat && params.fromLng && params.toLat && params.toLng)
    });

    setIsLoading(true);
    
    try {
      let searchResults: RideWithMatch[] = [];

      // ✅ PRIMEIRO: Busca Inteligente (Principal)
      console.log('🧠 [PRIMARY-SMART] Buscando com smart final...');
      searchResults = await fetchSmartRides(params); // ✅ Passar params explicitamente
      console.log('🎯 [PRIMARY-SMART-RESULTS] Resultados smart:', searchResults.length);
      
      // ✅ SECUNDÁRIO: Se inteligente não encontrou nada, tenta tradicional APENAS se válido
      if (searchResults.length === 0) {
        console.log('🔍 [SECONDARY-TRADITIONAL] Nenhum resultado inteligente, tentando tradicional...');
        searchResults = await fetchTraditionalRidesSafely(params); // ✅ Passar params explicitamente
        console.log('📊 [SECONDARY-TRADITIONAL-RESULTS] Resultados tradicionais:', searchResults.length);
      }
      
      // ✅ CORREÇÃO: Exibir estatísticas de matching
      if (searchResults.length > 0) {
        const smartMatches = searchResults.filter(r => r.match_type).length;
        const exactMatches = searchResults.filter(r => r.match_type === 'exact_match').length;
        const similarMatches = searchResults.filter(r => 
          r.match_type === 'same_segment' || r.match_type === 'same_direction'
        ).length;
        
        console.log(`📊 Estatísticas: ${exactMatches} exatos, ${similarMatches} similares, ${smartMatches} smart no total`);
        
        // ✅ FEEDBACK POSITIVO PARA BUSCA INTELIGENTE
        toast({
          title: `🎯 ${searchResults.length} viagens encontradas`,
          description: `${exactMatches} matchs exatos + ${similarMatches} rotas similares`,
          variant: "default",
          duration: 4000,
        });
      }

      setRides(searchResults);
      
      // ✅ ATUALIZAR SESSION STORAGE
      const searchState: LocationState = {
        rides: searchResults,
        searchParams: params, // ✅ Usar params passados
        timestamp: Date.now()
      };
      sessionStorage.setItem('lastSearchResults', JSON.stringify(searchState));

      if (searchResults.length === 0) {
        toast({
          title: "Nenhuma viagem encontrada",
          description: "Tente aumentar o raio de busca para encontrar rotas similares",
          variant: "default",
          duration: 3000,
        });
      } else {
        console.log('✅ [SEARCH-SUCCESS] Busca concluída:', searchResults.length, 'resultados');
      }

    } catch (error) {
      console.error('❌ [SEARCH-ERROR] Erro na busca:', error);
      toast({
        title: "Erro na busca",
        description: "Não foi possível buscar viagens. Tente novamente.",
        variant: "destructive",
        duration: 4000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ NOVA FUNÇÃO: Recarregar resultados
  const handleRefreshResults = () => {
    handleSmartSearch();
  };

  // 🆕 Função para obter nome do motorista (compatibilidade) - CORRIGIDA
  const getDriverName = (ride: Ride): string => {
    if (ride.driver) {
      // ✅ CORREÇÃO: Evitar "undefined undefined"
      return `${ride.driver.firstName ?? ''} ${ride.driver.lastName ?? ''}`.trim() || 'Motorista';
    }
    return ride.driverName || 'Motorista';
  };

  // 🆕 Função para obter rating do motorista (compatibilidade) - CORRIGIDA
  const getDriverRating = (ride: Ride): string => {
    if (ride.driver?.rating !== undefined) {
      return ride.driver.rating.toString();
    }
    return ride.driverRating?.toString() || 'N/A';
  };

  // 🆕 Função para calcular assentos disponíveis - CORRIGIDA
  const getAvailableSeats = (ride: Ride): number => {
    // ✅ CORREÇÃO: Tratar 0 corretamente
    return ride.availableSeats !== undefined ? ride.availableSeats : (ride.maxPassengers || 4) - (ride.currentPassengers || 0);
  };

  // ✅ CORREÇÃO: Função tipada para obter tipo de match para exibição
  const getMatchTypeDisplay = (ride: RideWithMatch): { text: string; color: string } => {
    const matchType = ride.match_type;
    
    switch (matchType) {
      case 'exact_match':
        return { text: '🎯 Match Exato', color: 'bg-green-100 text-green-800' };
      case 'same_segment':
      case 'covers_route':
        return { text: '🛣️ Mesmo Trecho', color: 'bg-blue-100 text-blue-800' };
      case 'nearby':
        return { text: '📍 Próximo', color: 'bg-purple-100 text-purple-800' };
      case 'same_direction':
        return { text: '🧭 Mesma Direção', color: 'bg-orange-100 text-orange-800' };
      case 'smart_match':
      case 'smart_final_direct':
        return { text: '🧠 Inteligente', color: 'bg-indigo-100 text-indigo-800' };
      case 'potential_match':
        return { text: '🤝 Compatível', color: 'bg-yellow-100 text-yellow-800' };
      default:
        return { text: '🔍 Tradicional', color: 'bg-gray-100 text-gray-800' };
    }
  };

  // ✅ CORREÇÃO: Função tipada para obter score de compatibilidade
  const getCompatibilityScore = (ride: RideWithMatch): number => {
    return ride.route_compatibility || ride.matchScore || 0;
  };

  // ✅ NOVA FUNÇÃO: Obter descrição do match
  const getMatchDescription = (ride: RideWithMatch): string => {
    const matchType = ride.match_type;
    const compatibility = getCompatibilityScore(ride);
    
    const descriptions: { [key: string]: string } = {
      'exact_match': `Match perfeito (${compatibility}% de compatibilidade)`,
      'same_segment': `No mesmo trecho da rota (${compatibility}% compatível)`,
      'same_direction': `Mesma direção geográfica (${compatibility}% compatível)`,
      'smart_match': `Encontrado por busca inteligente (${compatibility}% compatível)`,
      'smart_final_direct': `Rota similar encontrada (${compatibility}% compatível)`,
      'potential_match': `Rota potencialmente compatível (${compatibility}% compatível)`,
      'nearby': `Próximo da localização desejada`
    };
    
    return descriptions[matchType || ''] || 'Rota disponível';
  };

  const handleBookRide = (ride: RideWithMatch) => {
    if (!user) {
      toast({
        title: "Login necessário",
        description: "Por favor, faça login para reservar uma viagem.",
        variant: "destructive",
        duration: 4000,
      });
      return;
    }
    
    const availableSeats = getAvailableSeats(ride);
    if (availableSeats < bookingData.passengers) {
      toast({
        title: "Lugares insuficientes",
        description: `Apenas ${availableSeats} lugar(es) disponível(is)`,
        variant: "destructive",
        duration: 4000,
      });
      return;
    }
    
    setSelectedRide(ride);
    setBookingModal(true);
  };

  // ✅ CORREÇÃO: Mutation com tipagem adequada
  const bookingMutation = useMutation<void, Error, BookingRequest>({
    mutationFn: async (data: BookingRequest) => {
      const response = await fetch('/api/client/rides/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rideId: data.rideId,
          passengers: data.passengers,
          pickupLocation: data.pickupLocation,
          notes: data.notes
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to book ride');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Reserva confirmada!",
        description: "Sua reserva foi criada com sucesso. Você receberá mais detalhes por email.",
        duration: 4000,
      });
      setBookingModal(false);
      setSelectedRide(null);
      setBookingData({
        passengers: 1,
        phone: "",
        email: "",
        notes: ""
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro na reserva",
        description: error.message || "Não foi possível processar sua reserva. Tente novamente.",
        variant: "destructive",
        duration: 4000,
      });
    }
  });

  const handleConfirmBooking = () => {
    if (!selectedRide) return;
    
    if (!user) {
      toast({
        title: "Login necessário",
        description: "Por favor, faça login para confirmar a reserva.",
        variant: "destructive",
        duration: 4000,
      });
      return;
    }
    
    const availableSeats = getAvailableSeats(selectedRide);
    if (availableSeats < bookingData.passengers) {
      toast({
        title: "Lugares insuficientes",
        description: `Apenas ${availableSeats} lugar(es) disponível(is)`,
        variant: "destructive",
        duration: 4000,
      });
      return;
    }
    
    if (!bookingData.phone || !bookingData.email) {
      toast({
        title: "Dados incompletos",
        description: "Por favor, preencha telefone e email.",
        variant: "destructive",
        duration: 4000,
      });
      return;
    }

    bookingMutation.mutate({
      rideId: selectedRide.id,
      passengers: bookingData.passengers,
      pickupLocation: `${selectedRide.fromLocation} (Ponto de encontro)`,
      notes: `Telefone: ${bookingData.phone}, Email: ${bookingData.email}. ${bookingData.notes}`
    });
  };

  // ✅ CORREÇÃO: Função formatPrice otimizada com formatação monetária consistente
  const formatPrice = (price?: number | string | null): string => {
    const num = Number(price) || 0;
    return num.toLocaleString('pt-MZ', { 
      style: 'currency', 
      currency: 'MZN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ✅ CORREÇÃO: Função para validar mudança de passageiros
  const handlePassengersChange = (value: string) => {
    const numValue = parseInt(value) || 1;
    const availableSeats = selectedRide ? getAvailableSeats(selectedRide) : 1;
    
    // ✅ CORREÇÃO: Limitar ao máximo disponível
    const finalValue = Math.min(Math.max(1, numValue), availableSeats);
    
    setBookingData({...bookingData, passengers: finalValue});
  };

  // ✅ VERIFICAR SE TEM COORDENADAS COMPLETAS
  const hasCompleteCoordinates = 
    searchParams.fromLat !== undefined && 
    searchParams.fromLng !== undefined &&
    searchParams.toLat !== undefined && 
    searchParams.toLng !== undefined;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PageHeader title="Resultados da Busca" />
      
      <div className="container mx-auto px-4 max-w-7xl py-6">
        <div className="flex justify-between items-center mb-6">
          <Button 
            variant="ghost" 
            onClick={() => setLocation('/')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Início
          </Button>

          {/* ✅ BOTÃO PARA RECARREGAR RESULTADOS */}
          <Button 
            onClick={handleRefreshResults}
            disabled={isLoading}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Buscando...' : 'Atualizar Resultados'}
          </Button>
        </div>

        {/* ✅ RESUMO DA BUSCA MELHORADO */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm flex-1">
                <div>
                  <Label>Saindo de</Label>
                  <p className="font-semibold">{searchParams.from || "Não especificado"}</p>
                  {searchParams.fromCity && (
                    <p className="text-xs text-gray-500">{searchParams.fromCity}</p>
                  )}
                  {hasCompleteCoordinates && (
                    <p className="text-xs text-green-600">
                      📍 {searchParams.fromLat?.toFixed(4)}, {searchParams.fromLng?.toFixed(4)}
                    </p>
                  )}
                </div>
                <div>
                  <Label>Indo para</Label>
                  <p className="font-semibold">{searchParams.to || "Não especificado"}</p>
                  {searchParams.toCity && (
                    <p className="text-xs text-gray-500">{searchParams.toCity}</p>
                  )}
                  {hasCompleteCoordinates && (
                    <p className="text-xs text-green-600">
                      📍 {searchParams.toLat?.toFixed(4)}, {searchParams.toLng?.toFixed(4)}
                    </p>
                  )}
                </div>
                <div>
                  <Label>Data</Label>
                  <p className="font-semibold">{searchParams.date || "Não especificada"}</p>
                </div>
                <div>
                  <Label>Passageiros</Label>
                  <p className="font-semibold">{searchParams.passengers}</p>
                </div>
              </div>
              
              {/* ✅ INDICADOR DE BUSCA INTELIGENTE */}
              {hasCompleteCoordinates && (
                <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-2 rounded-lg border border-blue-200">
                  <Navigation className="w-4 h-4" />
                  <div>
                    <p className="text-sm font-medium">Busca Inteligente</p>
                    <p className="text-xs">Raio: {searchParams.radius || 100}km</p>
                    <p className="text-xs">Usando get_rides_smart_final</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ✅ RESULTADOS - AGORA COM GARANTIA DE QUE RIDES É ARRAY */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Buscando viagens inteligentes...
                  </div>
                ) : (
                  <>
                    {rides.length} viagem(s) encontrada(s)
                    {hasCompleteCoordinates && (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        <MapPin className="w-3 h-3 mr-1" />
                        Busca Inteligente
                      </Badge>
                    )}
                  </>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
                <p className="text-gray-600">Buscando viagens mais relevantes...</p>
                <p className="text-sm text-gray-500 mt-2">
                  {hasCompleteCoordinates 
                    ? "Usando algoritmo inteligente para encontrar rotas similares" 
                    : "Buscando viagens tradicionais"}
                </p>
              </div>
            ) : rides.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-600">Nenhuma viagem encontrada</p>
                <p className="text-sm text-gray-500 mt-2">
                  {hasCompleteCoordinates 
                    ? "Tente aumentar o raio de busca para encontrar rotas similares" 
                    : "Tente alterar os critérios de busca na página principal"}
                </p>
                <Button 
                  onClick={() => setLocation('/')}
                  variant="outline"
                  className="mt-4"
                >
                  Voltar à Página Principal
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {rides.map((ride) => {
                  const availableSeats = getAvailableSeats(ride);
                  const canBook = availableSeats >= bookingData.passengers;
                  const isFullyBooked = availableSeats === 0;
                  const matchInfo = getMatchTypeDisplay(ride);
                  const compatibilityScore = getCompatibilityScore(ride);
                  const matchDescription = getMatchDescription(ride);
                  
                  return (
                    <div key={ride.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex-1">
                          {/* ✅ CABEÇALHO COM INFO DE MATCHING */}
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-lg">
                              {ride.fromLocation} → {ride.toLocation}
                            </h3>
                            {compatibilityScore > 0 && (
                              <Badge className={matchInfo.color}>
                                {matchInfo.text} {compatibilityScore}%
                              </Badge>
                            )}
                          </div>
                          
                          {/* ✅ DESCRIÇÃO DO MATCH */}
                          {ride.match_type && (
                            <p className="text-sm text-gray-600 mb-2 italic">
                              {matchDescription}
                            </p>
                          )}
                          
                          <p className="text-gray-600">{formatDate(ride.departureDate)}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <User className="w-4 h-4" />
                            {/* ✅ USAR NOVA FUNÇÃO PARA NOME */}
                            <span className="text-sm">{getDriverName(ride)}</span>
                            {/* ✅ USAR NOVA FUNÇÃO PARA RATING */}
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              <span className="text-sm">{getDriverRating(ride)}</span>
                            </div>
                          </div>
                          
                          {/* ✅ EXIBIR DISPONIBILIDADE */}
                          <div className="mt-2">
                            <span className={`text-sm font-medium ${
                              isFullyBooked ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {isFullyBooked ? 'LOTADO' : `${availableSeats} lugar(es) disponível(is)`}
                            </span>
                          </div>
                          
                          {/* ✅ VEHICLE TYPE E FEATURES */}
                          <div className="flex flex-wrap gap-2 mt-2 text-xs text-gray-500">
                            {ride.vehicleType && (
                              <span>🚗 {ride.vehicleType}</span>
                            )}
                            {ride.estimatedDuration && (
                              <span>⏱️ {ride.estimatedDuration} min</span>
                            )}
                            {/* ✅ EXIBIR DISTÂNCIA SE DISPONÍVEL - AGORA TIPADO */}
                            {(ride.dist_from_user_km || ride.distance_from_city_km) && (
                              <span>📍 {(ride.dist_from_user_km || ride.distance_from_city_km)?.toFixed(1)} km</span>
                            )}
                          </div>

                          {/* ✅ FEATURES DO VEÍCULO */}
                          {ride.vehicleFeatures && ride.vehicleFeatures.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {ride.vehicleFeatures.map((feature, index) => (
                                <span key={index} className="text-xs bg-gray-100 px-2 py-1 rounded">
                                  {feature}
                                </span>
                              ))}
                            </div>
                          )}
                          
                          {/* ✅ CORREÇÃO: Fallback para imagem do veículo */}
                          {ride.vehiclePhoto && (
                            <img 
                              src={ride.vehiclePhoto} 
                              alt="Veículo" 
                              className="w-20 h-20 object-cover rounded mt-2"
                              onError={(e) => {
                                // ✅ CORREÇÃO: Fallback para imagem quebrada
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                              }}
                            />
                          )}
                        </div>
                        
                        <div className="flex flex-col items-end gap-2">
                          {/* ✅ USAR PROPRIEDADE price EM VEZ DE pricePerSeat */}
                          <span className="text-2xl font-bold text-green-600">
                            {formatPrice(ride.price)}
                          </span>
                          {ride.pricePerSeat && ride.pricePerSeat !== ride.price && (
                            <span className="text-sm text-gray-500">
                              {formatPrice(ride.pricePerSeat)}/passageiro
                            </span>
                          )}
                          <Button 
                            onClick={() => handleBookRide(ride)}
                            // ✅ CORREÇÃO: Simplificar disabled
                            disabled={getAvailableSeats(ride) < bookingData.passengers || !user}
                            className={`${
                              getAvailableSeats(ride) >= bookingData.passengers && user
                                ? 'bg-primary hover:bg-red-600' 
                                : 'bg-gray-400 cursor-not-allowed'
                            }`}
                          >
                            {!user ? 'Faça login para reservar' : 
                             getAvailableSeats(ride) === 0 ? 'LOTADO' : 
                             getAvailableSeats(ride) >= bookingData.passengers ? 'Reservar Agora' : 
                             'Lugares insuficientes'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ✅ MODAL DE RESERVA */}
      <Dialog open={bookingModal} onOpenChange={setBookingModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Reserva</DialogTitle>
            <DialogDescription>
              Complete os dados para confirmar sua reserva
            </DialogDescription>
          </DialogHeader>
          
          {selectedRide && (
            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-4 mb-2">
                  <div className="text-sm">
                    {/* ✅ USAR NOVAS PROPRIEDADES */}
                    <span className="font-semibold">{selectedRide.fromLocation}</span>
                    <span className="mx-2">→</span>
                    <span className="font-semibold">{selectedRide.toLocation}</span>
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  {formatDate(selectedRide.departureDate)}
                </div>
                {/* ✅ USAR NOVA FUNÇÃO PARA NOME */}
                <div className="text-sm text-gray-600">
                  Motorista: {getDriverName(selectedRide)}
                </div>
                {/* ✅ USAR PROPRIEDADE price EM VEZ DE pricePerSeat */}
                <div className="text-sm font-semibold mt-2">
                  Preço: {formatPrice(selectedRide.price)}
                </div>
                
                {/* ✅ EXIBIR INFO OF MATCHING NO MODAL */}
                {selectedRide.match_type && (
                  <div className="text-sm text-blue-600 mt-2">
                    🎯 {getMatchDescription(selectedRide)}
                  </div>
                )}
                
                {/* ✅ EXIBIR DISPONIBILIDADE NO MODAL */}
                <div className={`text-sm font-medium mt-2 ${
                  getAvailableSeats(selectedRide) === 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {getAvailableSeats(selectedRide) === 0 
                    ? 'LOTADO' 
                    : `${getAvailableSeats(selectedRide)} lugar(es) disponível(is)`
                  }
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="passengers">Número de Passageiros</Label>
                  <Input
                    id="passengers"
                    type="number"
                    min="1"
                    max={getAvailableSeats(selectedRide)}
                    value={bookingData.passengers}
                    onChange={(e) => handlePassengersChange(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Máximo: {getAvailableSeats(selectedRide)} lugares disponíveis
                  </p>
                </div>

                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <Input
                      id="phone"
                      placeholder="84 123 4567"
                      value={bookingData.phone}
                      onChange={(e) => setBookingData({...bookingData, phone: e.target.value})}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={bookingData.email}
                      onChange={(e) => setBookingData({...bookingData, email: e.target.value})}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Observações (opcional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Alguma observação especial..."
                    value={bookingData.notes}
                    onChange={(e) => setBookingData({...bookingData, notes: e.target.value})}
                    rows={3}
                  />
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span>Total ({bookingData.passengers} passageiro{bookingData.passengers > 1 ? 's' : ''})</span>
                    {/* ✅ CORREÇÃO: Multiplicação segura de preço */}
                    <span className="text-xl font-bold text-blue-600">
                      {formatPrice((selectedRide.price || 0) * bookingData.passengers)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setBookingModal(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleConfirmBooking}
                  disabled={bookingMutation.isPending || getAvailableSeats(selectedRide) < bookingData.passengers || !user}
                  className="flex-1"
                >
                  {bookingMutation.isPending ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Confirmar Reserva
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <MobileNavigation />
    </div>
  );
}