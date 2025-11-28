import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { format, isSameDay, parseISO, differenceInDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/shared/components/ui/dialog";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Badge } from "@/shared/components/ui/badge";
import { useToast } from "@/shared/hooks/use-toast";
import { ArrowLeft, Phone, Mail, CreditCard, User, Star, MapPin, Navigation, RefreshCw, XCircle, Car, Users, Clock, MapPinned } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import PageHeader from "@/shared/components/PageHeader";
import MobileNavigation from "@/shared/components/MobileNavigation";
import useAuth from "@/shared/hooks/useAuth";

// ✅✅✅ CORREÇÃO: IMPORTAR DA API CLIENT EM VEZ DO TYPES
import { clientRidesApi, type Ride } from "@/api/client/rides";
import { formatPrice } from "@/services/api";

// ✅✅✅ CORREÇÃO CRÍTICA: Interface local COMPATÍVEL com a Ride original
interface RideWithMatch {
  // ✅ Campos obrigatórios da interface Ride
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
  
  // ✅ Campos opcionais da interface Ride
  from_province?: string;
  to_province?: string;
  match_type?: string;
  direction_score?: number;
  
  // ✅ Campos adicionais para compatibilidade com frontend
  id: string; // ✅ ALIAS para ride_id
  driverId: string; // ✅ ALIAS para driver_id
  driverName: string; // ✅ ALIAS para driver_name
  driverRating: number; // ✅ ALIAS para driver_rating
  fromLocation: string; // ✅ ALIAS para from_city
  toLocation: string; // ✅ ALIAS para to_city
  fromAddress: string; // ✅ ALIAS para from_city
  toAddress: string; // ✅ ALIAS para to_city
  fromCity: string; // ✅ ALIAS para from_city
  toCity: string; // ✅ ALIAS para to_city
  departureDate: string; // ✅ ALIAS para departuredate
  departureTime: string;
  price: number; // ✅ ALIAS para priceperseat
  pricePerSeat: number; // ✅ ALIAS para priceperseat
  availableSeats: number; // ✅ ALIAS para availableseats
  maxPassengers: number; // ✅ ALIAS para max_passengers
  vehicle: string; // ✅ ALIAS para vehicle_type
  vehicleType: string; // ✅ ALIAS para vehicle_type
  vehicleMake: string; // ✅ ALIAS para vehicle_make
  vehicleModel: string; // ✅ ALIAS para vehicle_model
  vehiclePlate: string; // ✅ ALIAS para vehicle_plate
  vehicleColor: string; // ✅ ALIAS para vehicle_color
  status: string;
  type: string;
  
  // ✅ Campos de matching
  route_compatibility?: number;
  matchScore?: number;
  dist_from_user_km?: number;
  
  // ✅ Campos adicionais
  currentPassengers?: number;
  vehicleInfo?: string;
  description?: string;
  vehiclePhoto?: string;
  estimatedDuration?: string;
  estimatedDistance?: string;
  allowNegotiation?: boolean;
  allowPickupEnRoute?: boolean;
  isVerifiedDriver?: boolean;
  driver?: any;
  fromLatitude?: number;
  fromLongitude?: number;
  toLatitude?: number;
  toLongitude?: number;
  vehicleFeatures?: string[];
  
  // ✅ Campos formatados
  departureDateFormatted?: string;
  departureTimeFormatted?: string;
  departureDateTimeFormatted?: string;
  departureLongDate?: string;
  departureWeekday?: string;
}

// ✅ CORREÇÃO: Interface MatchStats atualizada
export interface MatchStats {
  total: number;
  exact?: number;
  compatible?: number;
  same_segment?: number;
  same_direction?: number;
  potential_match?: number;
  smart_matches?: number;
  match_types?: Record<string, number>;
}

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

// ✅✅✅ FUNÇÕES DE DATA - NOVAS
const formatDateForDisplay = (dateString: string) => {
  try {
    if (!dateString) return 'Data não disponível';
    
    const date = parseISO(dateString);
    if (isNaN(date.getTime())) return 'Data inválida';
    
    return format(date, 'dd/MM/yyyy, HH:mm');
  } catch (error) {
    console.error('❌ Erro ao formatar data:', error);
    return 'Erro na data';
  }
};

const isRideDateExact = (rideDate: string, searchDate: string) => {
  if (!rideDate || !searchDate) return false;
  
  try {
    const rideDateObj = parseISO(rideDate);
    const searchDateObj = parseISO(searchDate);
    return isSameDay(rideDateObj, searchDateObj);
  } catch (error) {
    console.error('❌ Erro ao comparar datas:', error);
    return false;
  }
};

const getDateDifference = (rideDate: string, searchDate: string) => {
  if (!rideDate || !searchDate) return 0;
  
  try {
    const rideDateObj = parseISO(rideDate);
    const searchDateObj = parseISO(searchDate);
    return Math.abs(differenceInDays(rideDateObj, searchDateObj));
  } catch (error) {
    console.error('❌ Erro ao calcular diferença de datas:', error);
    return 0;
  }
};

// ✅ COMPONENTE: Banner de aviso para datas diferentes
const DateWarningBanner = ({ searchDate, hasExactDateRides }: { 
  searchDate: string; 
  hasExactDateRides: boolean;
}) => {
  if (hasExactDateRides) return null;
  
  try {
    const searchDateObj = parseISO(searchDate);
    const formattedSearchDate = format(searchDateObj, 'dd/MM/yyyy');
    
    return (
      <div className="date-warning-banner" style={{
        background: 'linear-gradient(135deg, #fff3cd, #ffeaa7)',
        border: '2px solid #ffd54f',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div style={{ fontSize: '20px' }}>⚠️</div>
        <div>
          <strong style={{ color: '#856404', display: 'block', marginBottom: '4px' }}>
            Rides em datas diferentes
          </strong>
          <p style={{ color: '#856404', margin: 0, fontSize: '14px' }}>
            Não encontramos rides na data {formattedSearchDate}, 
            mas temos essas opções em outras datas próximas:
          </p>
        </div>
      </div>
    );
  } catch (error) {
    console.error('❌ Erro no DateWarningBanner:', error);
    return null;
  }
};

// ✅✅✅ CORREÇÃO: FUNÇÃO DE MAPEAMENTO COMPLETAMENTE CORRIGIDA
const mapRidesToFrontend = (rides: any[]): RideWithMatch[] => {
  console.log('🔄 [MAPEAMENTO-LOCAL] Mapeando rides para frontend:', rides?.length || 0);
  
  if (!rides || !Array.isArray(rides)) {
    console.warn('⚠️ [MAPEAMENTO-LOCAL] Dados inválidos para mapeamento');
    return [];
  }

  return rides.map((ride, index) => {
    console.log(`🚗 [MAPEAMENTO-${index}] Processando ride:`, {
      id: ride.ride_id || ride.id,
      driverName: ride.driver_name || ride.driverName,
      match_type: ride.match_type,
      direction_score: ride.direction_score
    });

    // ✅✅✅ CORREÇÃO: Mapeamento COMPATÍVEL com ambas as interfaces
    const mappedRide: RideWithMatch = {
      // ✅ Campos ORIGINAIS da interface Ride (obrigatórios)
      ride_id: ride.ride_id || ride.id || '',
      driver_id: ride.driver_id || ride.driverId || '',
      driver_name: ride.driver_name || ride.driverName || 'Motorista',
      driver_rating: Number(ride.driver_rating ?? ride.driverRating ?? 4.5),
      vehicle_make: ride.vehicle_make || ride.vehicleMake || '',
      vehicle_model: ride.vehicle_model || ride.vehicleModel || '',
      vehicle_type: ride.vehicle_type || ride.vehicleType || 'economy',
      vehicle_plate: ride.vehicle_plate || ride.vehiclePlate || '',
      vehicle_color: ride.vehicle_color || ride.vehicleColor || '',
      max_passengers: Number(ride.max_passengers ?? ride.maxPassengers ?? 4),
      from_city: ride.from_city || ride.fromCity || '',
      to_city: ride.to_city || ride.toCity || '',
      from_lat: Number(ride.from_lat ?? ride.fromLat ?? 0),
      from_lng: Number(ride.from_lng ?? ride.fromLng ?? 0),
      to_lat: Number(ride.to_lat ?? ride.toLat ?? 0),
      to_lng: Number(ride.to_lng ?? ride.toLng ?? 0),
      departuredate: ride.departuredate || ride.departureDate || '',
      availableseats: Number(ride.availableseats ?? ride.availableSeats ?? 0),
      priceperseat: Number(ride.priceperseat ?? ride.pricePerSeat ?? 0),
      distance_from_city_km: Number(ride.distance_from_city_km ?? ride.distanceFromCityKm ?? 0),
      distance_to_city_km: Number(ride.distance_to_city_km ?? ride.distanceToCityKm ?? 0),
      
      // ✅ Campos opcionais da interface Ride
      from_province: ride.from_province || ride.fromProvince,
      to_province: ride.to_province || ride.toProvince,
      match_type: ride.match_type || 'traditional',
      direction_score: Number(ride.direction_score ?? ride.route_compatibility ?? ride.matchScore ?? 0),
      
      // ✅✅✅ CORREÇÃO CRÍTICA: ALIAS para compatibilidade com frontend
      id: ride.ride_id || ride.id || '',
      driverId: ride.driver_id || ride.driverId || '',
      driverName: ride.driver_name || ride.driverName || 'Motorista',
      driverRating: Number(ride.driver_rating ?? ride.driverRating ?? 4.5),
      fromLocation: ride.from_city || ride.fromCity || '',
      toLocation: ride.to_city || ride.toCity || '',
      fromAddress: ride.from_city || ride.fromCity || '',
      toAddress: ride.to_city || ride.toCity || '',
      fromCity: ride.from_city || ride.fromCity || '',
      toCity: ride.to_city || ride.toCity || '',
      departureDate: ride.departuredate || ride.departureDate || '',
      departureTime: ride.departureTime || '',
      price: Number(ride.priceperseat ?? ride.pricePerSeat ?? 0),
      pricePerSeat: Number(ride.priceperseat ?? ride.pricePerSeat ?? 0),
      availableSeats: Number(ride.availableseats ?? ride.availableSeats ?? 0),
      maxPassengers: Number(ride.max_passengers ?? ride.maxPassengers ?? 4),
      vehicle: ride.vehicle_type || ride.vehicleType || 'Veículo',
      vehicleType: ride.vehicle_type || ride.vehicleType || 'economy',
      vehicleMake: ride.vehicle_make || ride.vehicleMake || '',
      vehicleModel: ride.vehicle_model || ride.vehicleModel || '',
      vehiclePlate: ride.vehicle_plate || ride.vehiclePlate || '',
      vehicleColor: ride.vehicle_color || ride.vehicleColor || '',
      status: ride.status || 'available',
      type: ride.type || 'one-way',
      
      // ✅ Campos de compatibilidade
      route_compatibility: Number(ride.direction_score ?? ride.route_compatibility ?? ride.matchScore ?? 0),
      matchScore: Number(ride.direction_score ?? ride.route_compatibility ?? ride.matchScore ?? 0),
      dist_from_user_km: Number(ride.distance_from_city_km ?? ride.distanceFromCityKm ?? 0),
      
      // ✅ Campos de coordenadas (alias)
      fromLatitude: Number(ride.from_lat ?? ride.fromLat ?? 0),
      fromLongitude: Number(ride.from_lng ?? ride.fromLng ?? 0),
      toLatitude: Number(ride.to_lat ?? ride.toLat ?? 0),
      toLongitude: Number(ride.to_lng ?? ride.toLng ?? 0),
      
      // ✅ Campos formatados
      departureDateFormatted: '',
      departureTimeFormatted: '',
      departureDateTimeFormatted: '',
      departureLongDate: '',
      departureWeekday: '',
      
      // ✅ Campos opcionais
      currentPassengers: ride.currentPassengers || 0,
      vehicleInfo: ride.vehicleInfo || `${ride.vehicle_make || ''} ${ride.vehicle_model || ''}`.trim(),
      description: ride.description,
      vehiclePhoto: ride.vehiclePhoto,
      estimatedDuration: ride.estimatedDuration,
      estimatedDistance: ride.estimatedDistance,
      allowNegotiation: ride.allowNegotiation || false,
      allowPickupEnRoute: ride.allowPickupEnRoute || false,
      isVerifiedDriver: ride.isVerifiedDriver || false,
      driver: ride.driver,
      vehicleFeatures: ride.vehicleFeatures || [],
    };

    console.log(`✅ [MAPEAMENTO-${index}] Ride mapeado:`, {
      id: mappedRide.id,
      driverName: mappedRide.driverName,
      match_type: mappedRide.match_type,
      direction_score: mappedRide.direction_score,
      distance: mappedRide.distance_from_city_km
    });

    return mappedRide;
  });
};

// ✅✅✅ CORREÇÃO: BUSCA USANDO A NOVA API CLIENT
const executeSearch = async (searchParams: RideSearchParamsExtended) => {
  try {
    console.log('🎯 Iniciando busca com API CLIENT...', searchParams);
    
    // ✅✅✅ CORREÇÃO: Usar a nova API client em vez de fetch direto
    const searchResults = await clientRidesApi.search({
      from: searchParams.from,
      to: searchParams.to,
      date: searchParams.date,
      passengers: searchParams.passengers,
      radiusKm: searchParams.radius || 100,
      smartSearch: true // ✅ Sempre usar busca inteligente
    });

    console.log('✅ Resultados da API:', {
      success: searchResults.success,
      ridesCount: searchResults.rides?.length || 0,
      smartSearch: searchResults.smart_search,
      matchStats: searchResults.matchStats
    });

    if (searchResults.success && searchResults.rides) {
      const mappedRides = mapRidesToFrontend(searchResults.rides);
      
      return {
        success: true,
        rides: mappedRides,
        searchType: 'smart',
        total: mappedRides.length,
        matchStats: searchResults.matchStats
      };
    }

    // ✅ SE NÃO ENCONTRAR, RETORNAR VAZIO
    console.log('ℹ️ Nenhum resultado encontrado na busca');
    return {
      success: true,
      rides: [],
      searchType: 'smart',
      total: 0,
      message: 'Nenhuma viagem encontrada para os critérios especificados'
    };

  } catch (error) {
    console.error('❌ Erro na busca:', error);
    
    // ✅ EM CASO DE ERRO, RETORNAR VAZIO COM MENSAGEM
    return {
      success: false,
      rides: [],
      searchType: 'error',
      total: 0,
      message: 'Erro temporário na busca. Tente novamente.'
    };
  }
};

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

  // ✅✅✅ CORREÇÃO: executeSearchWithParams recebe parâmetros explicitamente
  const executeSearchWithParams = async (params: RideSearchParamsExtended) => {
    console.log('🚀 [EXECUTE-SEARCH] Executando busca com parâmetros:', {
      from: params.from,
      to: params.to,
      date: params.date
    });

    setIsLoading(true);
    
    try {
      // ✅✅✅ USAR NOVA API CLIENT
      const searchResults = await executeSearch(params);
      
      console.log('🎯 [SMART-SEARCH-RESULTS] Resultados:', searchResults.rides.length);
      
      // ✅✅✅ CORREÇÃO: Exibir estatísticas de matching
      if (searchResults.rides.length > 0) {
        const matchTypes = searchResults.rides.reduce((acc, ride) => {
          acc[ride.match_type || 'traditional'] = (acc[ride.match_type || 'traditional'] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        const exactMatches = matchTypes['exact_match'] || 0;
        const smartMatches = Object.keys(matchTypes).filter(key => 
          key !== 'traditional'
        ).reduce((sum, key) => sum + (matchTypes[key] || 0), 0);
        
        console.log(`📊 Estatísticas:`, matchTypes);
        
        // ✅ FEEDBACK POSITIVO PARA BUSCA INTELIGENTE
        toast({
          title: `🎯 ${searchResults.rides.length} viagens encontradas`,
          description: `${exactMatches} matchs exatos + ${smartMatches} rotas inteligentes`,
          variant: "default",
          duration: 4000,
        });
      }

      // ✅✅✅ CORREÇÃO: Usar os rides mapeados
      setRides(searchResults.rides);
      
      // ✅ ATUALIZAR SESSION STORAGE
      const searchState: LocationState = {
        rides: searchResults.rides,
        searchParams: params, // ✅ Usar params passados
        timestamp: Date.now()
      };
      sessionStorage.setItem('lastSearchResults', JSON.stringify(searchState));

      if (searchResults.rides.length === 0) {
        toast({
          title: "Nenhuma viagem encontrada",
          description: "Tente aumentar o raio de busca para encontrar rotas similares",
          variant: "default",
          duration: 3000,
        });
      } else {
        console.log('✅ [SEARCH-SUCCESS] Busca concluída:', searchResults.rides.length, 'resultados');
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
    executeSearchWithParams(searchParams);
  };

  // 🆕 Função para obter nome do motorista (compatibilidade) - CORRIGIDA
  const getDriverName = (ride: RideWithMatch): string => {
    return ride.driver_name || ride.driverName || 'Motorista';
  };

  // 🆕 Função para obter rating do motorista (compatibilidade) - CORRIGIDA
  const getDriverRating = (ride: RideWithMatch): string => {
    return (ride.driver_rating || ride.driverRating || 4.5).toFixed(1);
  };

  // ✅✅✅ CORREÇÃO COMPLETA: Função getAvailableSeats robusta
  const getAvailableSeats = (ride: RideWithMatch): number => {
    if (!ride) {
      console.warn('⚠️ [SEATS] Ride undefined');
      return 0;
    }
    
    console.log('🔍 [SEATS] Analisando assentos do ride:', {
      id: ride.id,
      availableSeats: ride.availableSeats,
      maxPassengers: ride.maxPassengers
    });

    // ✅ CORREÇÃO: Usar availableSeats diretamente
    let availableSeats = Number(ride.availableseats || ride.availableSeats || 0);
    
    // ✅ CORREÇÃO: Se availableSeats for 0, tentar calcular a partir de maxPassengers
    if (availableSeats === 0) {
      const maxPassengers = Number(ride.max_passengers || ride.maxPassengers || 0);
      const currentPassengers = Number(ride.currentPassengers || 0);
      
      if (maxPassengers > 0) {
        const calculatedSeats = maxPassengers - currentPassengers;
        if (calculatedSeats > 0) {
          console.log('✅ [SEATS] Usando cálculo alternativo:', { 
            maxPassengers, 
            currentPassengers, 
            calculatedSeats 
          });
          availableSeats = calculatedSeats;
        }
      }
    }
    
    // ✅ CORREÇÃO: Garantir que não seja negativo
    const finalSeats = Math.max(0, availableSeats);
    
    console.log('✅ [SEATS] Assentos finais calculados:', finalSeats);
    return finalSeats;
  };

  // ✅ CORREÇÃO: Função tipada para obter tipo de match para exibição
  const getMatchTypeDisplay = (ride: RideWithMatch): { text: string; color: string } => {
    const matchType = ride.match_type;
    const directionScore = ride.direction_score || 0;
    
    switch (matchType) {
      case 'exact_match':
        return { text: `🎯 Exato (${directionScore}pts)`, color: 'bg-green-100 text-green-800 border-green-200' };
      case 'exact_province':
        return { text: `🏛️ Mesma Província (${directionScore}pts)`, color: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 'from_correct_province_to':
        return { text: `📍 Origem Correta (${directionScore}pts)`, color: 'bg-teal-100 text-teal-800 border-teal-200' };
      case 'to_correct_province_from':
        return { text: `🏁 Destino Correto (${directionScore}pts)`, color: 'bg-indigo-100 text-indigo-800 border-indigo-200' };
      case 'partial_from':
        return { text: `🧭 Origem Similar (${directionScore}pts)`, color: 'bg-orange-100 text-orange-800 border-orange-200' };
      case 'partial_to':
        return { text: `🧭 Destino Similar (${directionScore}pts)`, color: 'bg-amber-100 text-amber-800 border-amber-200' };
      case 'nearby':
        return { text: `📍 Próximo (${directionScore}pts)`, color: 'bg-purple-100 text-purple-800 border-purple-200' };
      case 'smart_match':
      case 'smart_final_direct':
        return { text: `🧠 Inteligente (${directionScore}pts)`, color: 'bg-indigo-100 text-indigo-800 border-indigo-200' };
      case 'potential_match':
        return { text: `🤝 Compatível (${directionScore}pts)`, color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
      default:
        return { text: `🔍 Tradicional (${directionScore}pts)`, color: 'bg-gray-100 text-gray-800 border-gray-200' };
    }
  };

  // ✅ CORREÇÃO: Função tipada para obter score de compatibilidade
  const getCompatibilityScore = (ride: RideWithMatch): number => {
    return ride.direction_score || ride.route_compatibility || ride.matchScore || 0;
  };

  // ✅ NOVA FUNÇÃO: Obter descrição do match
  const getMatchDescription = (ride: RideWithMatch): string => {
    const matchType = ride.match_type;
    const compatibility = getCompatibilityScore(ride);
    const distance = ride.distance_from_city_km;
    
    const descriptions: { [key: string]: string } = {
      'exact_match': `Match perfeito! ${compatibility} pontos de compatibilidade`,
      'exact_province': `Na mesma província. ${compatibility} pontos`,
      'from_correct_province_to': `Origem correta + destino na província. ${compatibility} pontos`,
      'to_correct_province_from': `Destino correto + origem na província. ${compatibility} pontos`,
      'partial_from': `Origem similar. ${compatibility} pontos${distance ? `, ${distance.toFixed(1)}km` : ''}`,
      'partial_to': `Destino similar. ${compatibility} pontos${distance ? `, ${distance.toFixed(1)}km` : ''}`,
      'nearby': `Próximo da localização${distance ? ` (${distance.toFixed(1)}km)` : ''}. ${compatibility} pontos`,
      'smart_match': `Encontrado por busca inteligente. ${compatibility} pontos`,
      'smart_final_direct': `Rota similar encontrada. ${compatibility} pontos`,
      'potential_match': `Rota potencialmente compatível. ${compatibility} pontos`
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

  // ✅✅✅ CORREÇÃO CRÍTICA: Mutation com tipagem CORRIGIDA
  const bookingMutation = useMutation({
    mutationFn: async (data: BookingRequest) => {
      // ✅✅✅ CORREÇÃO: Usar API client em vez de fetch direto
      const response = await clientRidesApi.requestRide(
        data.rideId, 
        data.passengers, 
        data.pickupLocation, 
        data.notes
      );
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to book ride');
      }
      
      return response;
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

  // ✅✅✅ CORREÇÃO: Usar formatPrice do serviço API
  const displayPrice = (price?: number | string | null): string => {
    return formatPrice(price);
  };

  // ✅✅✅ CORREÇÃO CRÍTICA: Função para obter localização formatada
  const getLocationDisplay = (ride: RideWithMatch, type: 'from' | 'to'): string => {
    const location = type === 'from' ? ride.from_city : ride.to_city;
    const city = type === 'from' ? ride.fromCity : ride.toCity;
    
    // ✅ Se temos localização específica, usar ela
    if (location && location !== city) {
      return location;
    }
    
    // ✅ Se não, usar cidade com fallback
    return city || 'Localização não disponível';
  };

  // ✅ CORREÇÃO: Função para validar mudança de passageiros
  const handlePassengersChange = (value: string) => {
    const numValue = parseInt(value) || 1;
    const availableSeats = selectedRide ? getAvailableSeats(selectedRide) : 1;
    
    // ✅ CORREÇÃO: Limitar ao máximo disponível
    const finalValue = Math.min(Math.max(1, numValue), availableSeats);
    
    setBookingData({...bookingData, passengers: finalValue});
  };

  // ✅ CALCULAR SE HÁ RIDES NA DATA EXATA
  const hasExactDateRides = rides.some(ride => 
    isRideDateExact(ride.departureDate, searchParams.date)
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PageHeader title="Resultados da Busca" />
      
      <div className="container mx-auto px-4 max-w-4xl py-4">
        <div className="flex justify-between items-center mb-4">
          <Button 
            variant="ghost" 
            onClick={() => setLocation('/')}
            size="sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Início
          </Button>

          <Button 
            onClick={handleRefreshResults}
            disabled={isLoading}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Buscando...' : 'Atualizar'}
          </Button>
        </div>

        <Card className="mb-4">
          <CardContent className="pt-4">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm flex-1">
                <div>
                  <Label className="text-xs">Saindo de</Label>
                  <p className="font-semibold text-sm">{searchParams.from || "Não especificado"}</p>
                </div>
                <div>
                  <Label className="text-xs">Indo para</Label>
                  <p className="font-semibold text-sm">{searchParams.to || "Não especificado"}</p>
                </div>
                <div>
                  <Label className="text-xs">Data</Label>
                  <p className="font-semibold text-sm">{searchParams.date || "Não especificada"}</p>
                </div>
                <div>
                  <Label className="text-xs">Passageiros</Label>
                  <p className="font-semibold text-sm">{searchParams.passengers}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-lg border border-blue-200 text-xs">
                <Navigation className="w-3 h-3" />
                <div>
                  <p className="font-medium">Busca Inteligente</p>
                  <p>Raio: {searchParams.radius || 100}km</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-lg">
              <div className="flex items-center gap-2">
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Buscando viagens...
                  </div>
                ) : (
                  <>
                    {rides.length} viagem(s) encontrada(s)
                    {!hasExactDateRides && rides.length > 0 && (
                      <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200 text-xs">
                        <span className="mr-1">📅</span>
                        Datas próximas
                      </Badge>
                    )}
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                      <MapPin className="w-3 h-3 mr-1" />
                      Inteligente
                    </Badge>
                  </>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
                </div>
                <p className="text-gray-600 text-sm">Buscando viagens mais relevantes...</p>
              </div>
            ) : rides.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                  <User className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-gray-600 text-sm">Nenhuma viagem encontrada</p>
                <Button 
                  onClick={() => setLocation('/')}
                  variant="outline"
                  size="sm"
                  className="mt-3"
                >
                  Voltar à Página Principal
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* ✅ ADICIONAR BANNER DE AVISO PARA DATAS DIFERENTES */}
                <DateWarningBanner 
                  searchDate={searchParams.date} 
                  hasExactDateRides={hasExactDateRides}
                />
                
                {/* ✅✅✅ ESTATÍSTICAS ATUALIZADAS COM INFO DE DATAS */}
                {rides.some(ride => ride.match_type) && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <h4 className="text-sm font-medium text-blue-900 mb-2 flex items-center">
                      <span className="text-blue-600 mr-2">⚡</span>
                      Busca Inteligente - Resultados
                      {!hasExactDateRides && rides.length > 0 && (
                        <span className="text-orange-600 text-xs ml-2 italic">
                          • Mostrando rides em datas próximas
                        </span>
                      )}
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div className="text-center">
                        <div className="text-blue-700 font-bold">
                          {rides.filter(r => isRideDateExact(r.departureDate, searchParams.date)).length}
                        </div>
                        <div className="text-blue-600">Na data</div>
                      </div>
                      <div className="text-center">
                        <div className="text-blue-700 font-bold">
                          {rides.filter(r => !isRideDateExact(r.departureDate, searchParams.date)).length}
                        </div>
                        <div className="text-blue-600">Datas próximas</div>
                      </div>
                      <div className="text-center">
                        <div className="text-blue-700 font-bold">
                          {rides.filter(r => r.direction_score && r.direction_score >= 80).length}
                        </div>
                        <div className="text-blue-600">Alta Pont.</div>
                      </div>
                      <div className="text-center">
                        <div className="text-blue-700 font-bold">{rides.length}</div>
                        <div className="text-blue-600">Total</div>
                      </div>
                    </div>
                  </div>
                )}
                
                {rides.map((ride) => {
                  const availableSeats = getAvailableSeats(ride);
                  const canBook = availableSeats >= bookingData.passengers;
                  const isFullyBooked = availableSeats === 0;
                  const matchInfo = getMatchTypeDisplay(ride);
                  const compatibilityScore = getCompatibilityScore(ride);
                  const isExactDate = isRideDateExact(ride.departureDate, searchParams.date);
                  const dateDifference = getDateDifference(ride.departureDate, searchParams.date);
                  
                  return (
                    <div key={ride.id} className={`border rounded-lg p-3 hover:shadow-md transition-shadow ${
                      isExactDate 
                        ? 'border-l-4 border-l-green-500' 
                        : 'border-l-4 border-l-orange-500 bg-orange-50'
                    }`}>
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h3 className="font-semibold text-base leading-tight">
                                {getLocationDisplay(ride, 'from')} → {getLocationDisplay(ride, 'to')}
                              </h3>
                              
                              {/* ✅✅✅ SEÇÃO DE DATA COM DESTAQUE - MODIFICADA */}
                              <div className={`mt-1 p-2 rounded-md ${
                                isExactDate 
                                  ? 'bg-green-100 text-green-800 border border-green-200' 
                                  : 'bg-orange-100 text-orange-800 border border-orange-200 font-semibold'
                              }`}>
                                <div className="flex items-center gap-2">
                                  <span>📅</span>
                                  <span>
                                    {formatDateForDisplay(ride.departureDate)}
                                    {!isExactDate && (
                                      <span className="text-xs italic ml-2">
                                        ({dateDifference === 1 ? '1 dia' : `${dateDifference} dias`} de diferença)
                                      </span>
                                    )}
                                  </span>
                                </div>
                              </div>
                            </div>
                            {compatibilityScore > 0 && (
                              <Badge className={`${matchInfo.color} text-xs border`}>
                                {matchInfo.text}
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              <span className="text-sm">{getDriverName(ride)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              <span className="text-sm">{getDriverRating(ride)}</span>
                            </div>
                            <div className={`flex items-center gap-1 ${isFullyBooked ? 'text-red-600' : 'text-green-600'}`}>
                              <Users className="w-3 h-3" />
                              <span className="text-sm font-medium">
                                {isFullyBooked ? 'LOTADO' : `${availableSeats} lugar(es)`}
                              </span>
                            </div>
                          </div>

                          <div className="bg-gray-50 rounded-lg p-2 mb-2">
                            <div className="flex items-center gap-2 mb-1">
                              <Car className="w-3 h-3 text-gray-500" />
                              <h4 className="text-xs font-semibold text-gray-700">Detalhes do Veículo</h4>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-1 text-xs text-gray-600">
                              {ride.vehicle_make && ride.vehicle_model && (
                                <div className="flex items-center gap-1">
                                  <span className="font-medium">Veículo:</span>
                                  <span>{ride.vehicle_make} {ride.vehicle_model}</span>
                                </div>
                              )}
                              {ride.vehicle_plate && (
                                <div className="flex items-center gap-1">
                                  <span className="font-medium">Matrícula:</span>
                                  <span className="font-mono">{ride.vehicle_plate}</span>
                                </div>
                              )}
                              {ride.vehicle_color && (
                                <div className="flex items-center gap-1">
                                  <span className="font-medium">Cor:</span>
                                  <span>{ride.vehicle_color}</span>
                                </div>
                              )}
                              {ride.max_passengers && (
                                <div className="flex items-center gap-1">
                                  <span className="font-medium">Capacidade:</span>
                                  <span>{ride.max_passengers}p</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                            {ride.vehicle_type && (
                              <div className="flex items-center gap-1">
                                <Car className="w-3 h-3" />
                                <span className="capitalize">{ride.vehicle_type}</span>
                              </div>
                            )}
                            {ride.estimatedDuration && (
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{ride.estimatedDuration} min</span>
                              </div>
                            )}
                            {(ride.distance_from_city_km) && (
                              <div className="flex items-center gap-1">
                                <MapPinned className="w-3 h-3" />
                                <span>{ride.distance_from_city_km.toFixed(1)} km</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-2 min-w-[120px]">
                          <div className="text-right">
                            <span className="text-xl font-bold text-green-600 block">
                              {displayPrice(ride.price)}
                            </span>
                            {ride.pricePerSeat && ride.pricePerSeat !== ride.price && (
                              <span className="text-xs text-gray-500 block">
                                {displayPrice(ride.pricePerSeat)}/passageiro
                              </span>
                            )}
                          </div>
                          <Button 
                            onClick={() => handleBookRide(ride)}
                            disabled={isFullyBooked || !user}
                            size="sm"
                            className={`w-full ${
                              !isFullyBooked && user
                                ? 'bg-primary hover:bg-red-600' 
                                : 'bg-gray-400 cursor-not-allowed'
                            }`}
                          >
                            {!user ? 'Login' : 
                             isFullyBooked ? 'LOTADO' : 
                             'Reservar'}
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
                    <span className="font-semibold">{getLocationDisplay(selectedRide, 'from')}</span>
                    <span className="mx-2">→</span>
                    <span className="font-semibold">{getLocationDisplay(selectedRide, 'to')}</span>
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  {formatDateForDisplay(selectedRide.departureDate)}
                </div>
                <div className="text-sm text-gray-600">
                  Motorista: {getDriverName(selectedRide)}
                </div>
                <div className="text-sm font-semibold mt-2">
                  Preço: {displayPrice(selectedRide.price)}
                </div>
                
                {selectedRide.match_type && (
                  <div className="text-sm text-blue-600 mt-2">
                    🎯 {getMatchDescription(selectedRide)}
                  </div>
                )}
                
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
                    <span className="text-xl font-bold text-blue-600">
                      {displayPrice((selectedRide.price || 0) * bookingData.passengers)}
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