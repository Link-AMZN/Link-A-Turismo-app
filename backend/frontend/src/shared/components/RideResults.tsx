import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { format, isSameDay, parseISO, differenceInDays } from 'date-fns';
import Map from "./Map";

// ✅ Todos os imports necessários
import BookingModal from "./BookingModal";
import PreBookingChat from "./PreBookingChat"; 
import UserRatings from "./UserRatings";
import PaymentModal from "./PaymentModal";
import PriceNegotiationModal from "./PriceNegotiationModal";
import EnRoutePickupModal from "./EnRoutePickupModal";

import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/shared/components/ui/dialog";
import { useToast } from "@/shared/hooks/use-toast";

// ✅ Importar a função normalizeRide do serviço API
import { normalizeRide, formatPrice } from "@/services/api";
import { formatLongDate } from "../../utils/dateFormatter";

// ✅✅✅ INTERFACE RIDE COMPLETAMENTE CORRIGIDA - COMPATÍVEL COM get_rides_smart_final
interface Ride {
  // ✅ Campos obrigatórios da função get_rides_smart_final
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
  
  // ✅ Campos de matching inteligente
  match_type?: string;
  direction_score?: number;
  
  // ✅ Campos opcionais
  from_province?: string;
  to_province?: string;
  
  // ✅✅✅ ALIAS para compatibilidade com frontend existente
  id: string;
  driverId: string;
  driverName: string;
  driverRating: number;
  fromLocation: string;
  toLocation: string;
  fromAddress: string;
  toAddress: string;
  fromCity: string;
  toCity: string;
  fromProvince?: string;
  toProvince?: string;
  departureDate: string;
  departureTime: string;
  price: number;
  pricePerSeat: number;
  availableSeats: number;
  maxPassengers: number;
  currentPassengers: number;
  vehicle: string;
  vehicleType: string;
  vehicleMake: string;
  vehicleModel: string;
  vehiclePlate: string;
  vehicleColor: string;
  status: string;
  type: string;
  
  // ✅ Campos adicionais para compatibilidade
  vehicleInfo?: {
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
  vehiclePhoto?: string;
  estimatedDuration?: number;
  estimatedDistance?: number;
  allowNegotiation?: boolean;
  allowPickupEnRoute?: boolean;
  isVerifiedDriver?: boolean;
  availableIn?: number;
  route_compatibility?: number;
  match_description?: string;
  vehicleFeatures?: string[];
  driver?: {
    firstName?: string;
    lastName?: string;
    rating?: number;
    isVerified?: boolean;
  };
  distanceFromCityKm?: number;
  distanceToCityKm?: number;
}

// ✅ INTERFACE PARA RIDE COM FLAGS DE DATA
interface RideWithDateFlags extends Ride {
  _isExactDate?: boolean;
  _dateDifferenceDays?: number;
  _formattedDate?: string;
  _isBeforeSearch?: boolean;
}

// ✅ INTERFACE ATUALIZADA com a prop rides
interface RideResultsProps {
  searchParams: {
    from: string;
    to: string;
    when: string;
  };
  rides?: Ride[];
  onRideSelect?: (ride: Ride) => void;
}

// ✅✅✅ FUNÇÃO: Adicionar flags de data aos rides
const enhanceRidesWithDateInfo = (rides: Ride[], searchDate: string): RideWithDateFlags[] => {
  if (!searchDate) return rides as RideWithDateFlags[];
  
  const searchDateObj = parseISO(searchDate);
  
  return rides.map(ride => {
    const rideDate = parseISO(ride.departuredate);
    const isExactDate = isSameDay(rideDate, searchDateObj);
    const dateDifferenceDays = Math.abs(differenceInDays(rideDate, searchDateObj));
    const isBeforeSearch = rideDate < searchDateObj;
    
    return {
      ...ride,
      _isExactDate: isExactDate,
      _dateDifferenceDays: dateDifferenceDays,
      _formattedDate: format(rideDate, 'dd/MM/yyyy, HH:mm'),
      _isBeforeSearch: isBeforeSearch
    };
  });
};

// ✅ COMPONENTE: Banner de aviso para datas diferentes
const DateWarningBanner = ({ searchDate, hasExactDateRides }: { 
  searchDate: string; 
  hasExactDateRides: boolean;
}) => {
  if (hasExactDateRides) return null;
  
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
};

// ✅✅✅ COMPONENTE RIDECARD CORRIGIDO - COM DESTAQUE DE DATAS
const RideCard = ({ 
  ride, 
  onBookRide, 
  onNegotiatePrice, 
  onEnRoutePickup,
  searchDate 
}: { 
  ride: RideWithDateFlags;
  onBookRide?: (ride: any) => void;
  onNegotiatePrice?: (ride: any) => void;
  onEnRoutePickup?: (ride: any) => void;
  searchDate?: string;
}) => {
  
  // ✅ DESTAQUE DE DATA - Estilos condicionais
  const getDateStyles = () => {
    if (!ride._isExactDate && searchDate) {
      return {
        background: '#fff3e0',
        color: '#e65100',
        border: '2px solid #ff9800',
        fontWeight: '600'
      };
    }
    
    return {
      background: '#e8f5e8',
      color: '#2e7d32',
      border: '2px solid #4caf50',
      fontWeight: '500'
    };
  };

  const dateStyles = getDateStyles();

  // ✅ DEBUG: Verificar dados do veículo
  console.log('🚗 [RIDE-CARD-DEBUG] Dados do veículo:', {
    id: ride.id,
    vehiclePlate: ride.vehicle_plate || ride.vehiclePlate,
    vehicleMake: ride.vehicle_make || ride.vehicleMake,
    vehicleModel: ride.vehicle_model || ride.vehicleModel,
    vehicleColor: ride.vehicle_color || ride.vehicleColor,
    match_type: ride.match_type,
    direction_score: ride.direction_score,
    isExactDate: ride._isExactDate,
    dateDifference: ride._dateDifferenceDays
  });

  // ✅ Função para formatar preço
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-MZ', {
      style: 'currency',
      currency: 'MZN',
      minimumFractionDigits: 2
    }).format(price);
  };

  // ✅ Função para obter informações do veículo
  const getVehicleInfo = () => {
    const plate = ride.vehicle_plate || ride.vehiclePlate;
    if (plate) {
      return `🚗 ${plate}${ride.vehicle_type ? ` • ${ride.vehicle_type}` : ''}`;
    }
    return ride.vehicle || '🚗 Veículo não disponível';
  };

  // ✅ Função para obter detalhes do veículo
  const getVehicleDetails = () => {
    const details = [];
    
    const make = ride.vehicle_make || ride.vehicleMake;
    const model = ride.vehicle_model || ride.vehicleModel;
    if (make && model) {
      details.push(`${make} ${model}`);
    }
    
    const color = ride.vehicle_color || ride.vehicleColor;
    if (color) {
      details.push(color);
    }
    
    const maxPassengers = ride.max_passengers || ride.maxPassengers;
    if (maxPassengers) {
      details.push(`Até ${maxPassengers} passageiros`);
    }
    
    return details.join(' • ');
  };

  // ✅ Função para obter badge de matching
  const getMatchBadge = () => {
    if (!ride.match_type) return null;

    const matchConfig: { [key: string]: { label: string; color: string } } = {
      'exact_match': { label: '🎯 Exato', color: '#10b981' },
      'exact_province': { label: '🏛️ Mesma Província', color: '#3b82f6' },
      'from_correct_province_to': { label: '📍 Origem Correta', color: '#0d9488' },
      'to_correct_province_from': { label: '🏁 Destino Correto', color: '#6366f1' },
      'partial_from': { label: '🧭 Origem Similar', color: '#f97316' },
      'partial_to': { label: '🧭 Destino Similar', color: '#f59e0b' },
      'nearby': { label: '📍 Próximo', color: '#8b5cf6' },
      'smart_match': { label: '🧠 Inteligente', color: '#6366f1' },
      'smart_final_direct': { label: '🧠 Inteligente', color: '#6366f1' }
    };

    const config = matchConfig[ride.match_type] || { label: ride.match_type, color: '#6b7280' };

    return (
      <span style={{
        backgroundColor: `${config.color}20`,
        color: config.color,
        border: `1px solid ${config.color}40`,
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: '600',
        marginLeft: '8px'
      }}>
        {config.label} {ride.direction_score && `(${ride.direction_score}pts)`}
      </span>
    );
  };

  return (
    <div className="ride-card" style={{
      border: ride._isExactDate ? '1px solid #e0e0e0' : '1px solid #ff9800',
      padding: '16px',
      margin: '12px 0',
      borderRadius: '12px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      backgroundColor: ride._isExactDate ? 'white' : '#fffdf6',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    }}>
      
      {/* ✅ SEÇÃO DE LOCALIZAÇÃO */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#333', display: 'flex', alignItems: 'center' }}>
          🚩 {ride.from_city || ride.fromCity || ride.fromLocation || 'Origem não disponível'} 
          <span style={{ margin: '0 8px', color: '#666' }}>→</span>
          🎯 {ride.to_city || ride.toCity || ride.toLocation || 'Destino não disponível'}
          {getMatchBadge()}
        </div>
        
        {/* Províncias se disponíveis */}
        {(ride.from_province || ride.to_province || ride.fromProvince || ride.toProvince) && (
          <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
            {ride.from_province || ride.fromProvince ? `📍 ${ride.from_province || ride.fromProvince}` : ''}
            {ride.from_province && ride.to_province && ' → '}
            {ride.to_province || ride.toProvince ? `📍 ${ride.to_province || ride.toProvince}` : ''}
          </div>
        )}

        {/* Distâncias se disponíveis */}
        {(ride.distance_from_city_km || ride.distanceFromCityKm) && (
          <div style={{ fontSize: '12px', color: '#8b5cf6', marginTop: '2px' }}>
            📍 {ride.distance_from_city_km?.toFixed(1) || ride.distanceFromCityKm?.toFixed(1)}km da origem pesquisada
          </div>
        )}
      </div>

      {/* ✅✅✅ SEÇÃO DE DATA/HORA - MODIFICADA PARA DESTAQUE */}
      <div style={{ 
        marginBottom: '12px', 
        padding: '10px 12px',
        borderRadius: '8px',
        ...dateStyles,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '15px'
      }}>
        <span className="date-icon">📅</span>
        <span className="date-text">
          {ride._formattedDate || (ride.departuredate ? new Date(ride.departuredate).toLocaleDateString('pt-MZ', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }) : 'Data não disponível')}
          {!ride._isExactDate && searchDate && (
            <span style={{
              fontSize: '12px',
              fontStyle: 'italic',
              marginLeft: '8px',
              color: '#bf360c'
            }}>
              ({ride._dateDifferenceDays === 1 ? '1 dia' : `${ride._dateDifferenceDays} dias`} de diferença)
            </span>
          )}
        </span>
      </div>

      {/* ✅ SEÇÃO DO VEÍCULO COM MATRÍCULA */}
      <div style={{ 
        marginBottom: '12px', 
        padding: '10px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #e9ecef'
      }}>
        {/* Matrícula DESTACADA */}
        <div style={{ 
          fontWeight: 'bold', 
          color: '#2c5aa0', 
          fontSize: '16px',
          marginBottom: '6px'
        }}>
          {getVehicleInfo()}
        </div>
        
        {/* Detalhes do veículo */}
        <div style={{ fontSize: '13px', color: '#666' }}>
          {getVehicleDetails()}
        </div>
      </div>

      {/* ✅ SEÇÃO DE PREÇO E LUGARES */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '12px'
      }}>
        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#2c5aa0' }}>
          💰 {ride.priceperseat ? formatPrice(ride.priceperseat) : 'Preço não disponível'}
        </div>
        
        <div style={{ fontSize: '14px', color: '#666' }}>
          🪑 {ride.availableseats || ride.availableSeats || 0} {ride.availableseats === 1 ? 'lugar' : 'lugares'} disponível
        </div>
      </div>

      {/* ✅ SEÇÃO DO MOTORISTA */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '12px',
        padding: '8px',
        backgroundColor: '#f5f5f5',
        borderRadius: '6px'
      }}>
        <div style={{ color: '#333', fontSize: '14px' }}>
          👤 {ride.driver_name || ride.driverName || 'Motorista não disponível'}
        </div>
        
        <div style={{ color: '#666', fontSize: '14px' }}>
          ⭐ {(ride.driver_rating || ride.driverRating || 4.5).toFixed(1)}
        </div>
      </div>

      {/* ✅ BOTÕES DE AÇÃO */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={() => onBookRide?.(ride)}
          style={{
            flex: 1,
            backgroundColor: '#2c5aa0',
            color: 'white',
            border: 'none',
            padding: '10px 16px',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'background-color 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#1e4a8a';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#2c5aa0';
          }}
        >
          Reservar Agora
        </button>

        {onNegotiatePrice && (
          <button
            onClick={() => onNegotiatePrice(ride)}
            style={{
              backgroundColor: 'transparent',
              color: '#2c5aa0',
              border: '1px solid #2c5aa0',
              padding: '10px 16px',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f0f8ff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            Negociar
          </button>
        )}
      </div>

      {onEnRoutePickup && (
        <button
          onClick={() => onEnRoutePickup(ride)}
          style={{
            width: '100%',
            backgroundColor: 'transparent',
            color: '#666',
            border: '1px solid #ddd',
            padding: '8px 16px',
            borderRadius: '6px',
            fontSize: '13px',
            cursor: 'pointer',
            marginTop: '8px',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f9f9f9';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          🚗 Pedir recolha no caminho
        </button>
      )}
    </div>
  );
};

// ✅✅✅ FUNÇÃO: Formatar preço em MZN
const getDisplayPrice = (ride: any) => {
  const price = ride.priceperseat || ride.pricePerSeat;
  if (price === null || price === undefined) {
    return 'Preço não disponível';
  }
  return new Intl.NumberFormat('pt-MZ', {
    style: 'currency',
    currency: 'MZN',
    minimumFractionDigits: 2
  }).format(price);
};

// ✅ FUNÇÕES HELPER SIMPLIFICADAS - CORRIGIDAS
const getDisplayLocation = (ride: any, type: 'from' | 'to') => {
  const location = type === 'from' ? (ride.from_city || ride.fromCity) : (ride.to_city || ride.toCity);
  return location && location !== 'Cidade não disponível' ? location : 'Localização não disponível';
};

// 🎯 COMPONENTE DE DEBUG - MELHORADO PARA VERIFICAR OS DADOS
const DebugComponent = ({ rides }: { rides: any[] }) => {
  if (!rides || rides.length === 0) return null;
  
  return (
    <div style={{
      background: '#fff3cd',
      border: '2px solid #ffc107',
      borderRadius: '8px',
      padding: '15px',
      margin: '20px 0',
      fontSize: '12px',
      fontFamily: 'monospace'
    }}>
      <h3 style={{ color: '#856404', margin: '0 0 10px 0' }}>🔍 DEBUG - Dados Recebidos ({rides.length} rides):</h3>
      {rides.slice(0, 3).map((ride, index) => (
        <div key={ride.id} style={{
          border: '1px solid #ccc',
          padding: '8px',
          margin: '8px 0',
          background: '#f8f9fa'
        }}>
          <strong>Ride {index + 1}:</strong>
          <div>ID: {ride.id}</div>
          <div>Driver: "{ride.driver_name}" | Rating: {ride.driver_rating}</div>
          <div>Price: {ride.priceperseat} | PricePerSeat: {ride.priceperseat}</div>
          <div>From: {ride.from_city} → To: {ride.to_city}</div>
          <div>Departure: {ride.departuredate}</div>
          <div>Vehicle: {ride.vehicle_make} {ride.vehicle_model} - {ride.vehicle_color} ({ride.vehicle_plate})</div>
          <div>Seats: {ride.availableseats}</div>
          <div>Match Type: {ride.match_type} | Direction Score: {ride.direction_score}</div>
          <div>Vehicle Type: {ride.vehicle_type}</div>
          <div>Distance From City: {ride.distance_from_city_km} km | Distance To City: {ride.distance_to_city_km} km</div>
          <div>Exact Date: {ride._isExactDate ? 'SIM' : 'NÃO'} | Difference: {ride._dateDifferenceDays} days</div>
        </div>
      ))}
    </div>
  );
};

// 🎯 MAPEAMENTO PARA TIPOS DE VEÍCULO - CORRIGIDO
const VEHICLE_TYPE_DISPLAY: Record<string, { label: string; icon: string }> = {
  economy: { label: 'Económico', icon: '🚗' },
  comfort: { label: 'Conforto', icon: '🚙' },
  luxury: { label: 'Luxo', icon: '🏎️' },
  family: { label: 'Familiar', icon: '🚐' },
  cargo: { label: 'Carga', icon: '🚚' },
  motorcycle: { label: 'Moto', icon: '🏍️' }
};

// 🆕 Função para obter badge de compatibilidade - CORRIGIDA
const getMatchBadge = (ride: Ride) => {
  if (!ride.match_type) return null;

  const matchConfig: { [key: string]: { label: string; color: string } } = {
    'exact_match': { label: '🎯 Exato', color: 'bg-green-100 text-green-800 border-green-200' },
    'exact_province': { label: '🏛️ Mesma Província', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    'from_correct_province_to': { label: '📍 Origem Correta', color: 'bg-teal-100 text-teal-800 border-teal-200' },
    'to_correct_province_from': { label: '🏁 Destino Correto', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
    'partial_from': { label: '🧭 Origem Similar', color: 'bg-orange-100 text-orange-800 border-orange-200' },
    'partial_to': { label: '🧭 Destino Similar', color: 'bg-amber-100 text-amber-800 border-amber-200' },
    'nearby': { label: '📍 Próximo', color: 'bg-purple-100 text-purple-800 border-purple-200' },
    'smart_match': { label: '🧠 Inteligente', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
    'smart_final_direct': { label: '🧠 Inteligente', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' }
  };

  const config = matchConfig[ride.match_type] || { label: ride.match_type, color: 'bg-gray-100 text-gray-800 border-gray-200' };

  return (
    <Badge className={`${config.color} border text-xs font-medium`}>
      {config.label} {ride.direction_score && `(${ride.direction_score}pts)`}
    </Badge>
  );
};

// 🆕 Função para obter nome do motorista - COMPLETAMENTE CORRIGIDA
const getDriverName = (ride: Ride): string => {
  return ride.driver_name || ride.driverName || 'Motorista';
};

// 🆕 Função para obter rating do motorista - COMPLETAMENTE CORRIGIDA
const getDriverRating = (ride: Ride): number => {
  return ride.driver_rating || ride.driverRating || 4.5;
};

// 🆕 Função para obter informações do veículo - COMPLETAMENTE CORRIGIDA
const getVehicleInfo = (ride: Ride) => {
  return {
    display: `${ride.vehicle_make || ''} ${ride.vehicle_model || ''}`.trim() || 'Veículo',
    typeDisplay: VEHICLE_TYPE_DISPLAY[ride.vehicle_type]?.label || 'Económico',
    typeIcon: VEHICLE_TYPE_DISPLAY[ride.vehicle_type]?.icon || '🚗',
    plate: ride.vehicle_plate || 'Não informada',
    color: ride.vehicle_color || 'Não informada',
    maxPassengers: ride.max_passengers || 4,
    make: ride.vehicle_make || '',
    model: ride.vehicle_model || ''
  };
};

// ✅ Interface para resposta da API
interface RideApiResponse {
  success: boolean;
  rides: Ride[];
  data?: {
    rides: Ride[];
  };
}

export default function RideResults({
  searchParams,
  rides: externalRides = [],
  onRideSelect
}: RideResultsProps) {
  const { toast } = useToast();
  console.log('🔍 [DEBUG] RideResults mounted with params:', searchParams);
  
  // ✅ States para funcionalidades
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentBooking, setPaymentBooking] = useState<any>(null);
  const [showNegotiationModal, setShowNegotiationModal] = useState(false);
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [negotiationRide, setNegotiationRide] = useState<Ride | null>(null);
  const [pickupRide, setPickupRide] = useState<Ride | null>(null);

  // ✅ Query para buscar viagens (só executa se não houver rides externos) - COMPLETAMENTE CORRIGIDA
  const { data: internalRides, isLoading } = useQuery<Ride[]>({
    queryKey: ["rides-search", searchParams.from, searchParams.to, searchParams.when, externalRides.length],
    queryFn: async () => {
      console.log('🔍 [DEBUG] Fetching rides with:', searchParams);
      
      const params = new URLSearchParams();
      if (searchParams.from) params.append('from', searchParams.from);
      if (searchParams.to) params.append('to', searchParams.to);
      if (searchParams.when) params.append('date', searchParams.when);
      
      // ✅✅✅ CORREÇÃO: Usar endpoint de busca inteligente
      params.append('smartSearch', 'true');
      params.append('radiusKm', '100');
      
      const url = `/api/rides/smart/search?${params.toString()}`;
      console.log('🔍 [DEBUG] Fetch URL:', url);
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Erro ao buscar viagens');
      
      const result = await response.json() as RideApiResponse;
      console.log('🔍 [DEBUG] API response:', result);
      
      // ✅✅✅ CORREÇÃO: Usar dados consistentes da resposta
      const ridesData = Array.isArray(result.rides) ? result.rides : 
                       Array.isArray(result.data?.rides) ? result.data.rides : [];
      
      console.log('🔍 [DEBUG] Rides data to process:', ridesData);
      
      // ✅✅✅ CORREÇÃO CRÍTICA: Processar resposta com TODOS os campos do get_rides_smart_final
      const processedRides = ridesData.map((ride: any) => {
        console.log('🚗 [DEBUG] Processando ride individual:', ride);

        // ✅✅✅ CORREÇÃO: Criar ride compatível com a nova interface
        const processedRide: Ride = {
          // ✅ Campos ORIGINAIS do PostgreSQL (get_rides_smart_final)
          ride_id: ride.ride_id || ride.id || Math.random().toString(),
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
          departuredate: ride.departuredate || ride.departureDate || new Date().toISOString(),
          availableseats: Number(ride.availableseats ?? ride.availableSeats ?? 0),
          priceperseat: Number(ride.priceperseat ?? ride.pricePerSeat ?? 0),
          distance_from_city_km: Number(ride.distance_from_city_km ?? ride.distanceFromCityKm ?? 0),
          distance_to_city_km: Number(ride.distance_to_city_km ?? ride.distanceToCityKm ?? 0),
          
          // ✅ Campos de matching inteligente
          match_type: ride.match_type || 'traditional',
          direction_score: Number(ride.direction_score ?? 0),
          
          // ✅ Campos opcionais
          from_province: ride.from_province || ride.fromProvince,
          to_province: ride.to_province || ride.toProvince,
          
          // ✅✅✅ ALIAS para compatibilidade com frontend existente
          id: ride.ride_id || ride.id || Math.random().toString(),
          driverId: ride.driver_id || ride.driverId || '',
          driverName: ride.driver_name || ride.driverName || 'Motorista',
          driverRating: Number(ride.driver_rating ?? ride.driverRating ?? 4.5),
          fromLocation: ride.from_city || ride.fromCity || '',
          toLocation: ride.to_city || ride.toCity || '',
          fromAddress: ride.from_city || ride.fromCity || '',
          toAddress: ride.to_city || ride.toCity || '',
          fromCity: ride.from_city || ride.fromCity || '',
          toCity: ride.to_city || ride.toCity || '',
          fromProvince: ride.from_province || ride.fromProvince,
          toProvince: ride.to_province || ride.toProvince,
          departureDate: ride.departuredate || ride.departureDate || new Date().toISOString(),
          departureTime: ride.departureTime || '08:00',
          price: Number(ride.priceperseat ?? ride.pricePerSeat ?? 0),
          pricePerSeat: Number(ride.priceperseat ?? ride.pricePerSeat ?? 0),
          availableSeats: Number(ride.availableseats ?? ride.availableSeats ?? 0),
          maxPassengers: Number(ride.max_passengers ?? ride.maxPassengers ?? 4),
          currentPassengers: ride.currentPassengers || 0,
          vehicle: ride.vehicle_type || ride.vehicleType || 'Veículo',
          vehicleType: ride.vehicle_type || ride.vehicleType || 'economy',
          vehicleMake: ride.vehicle_make || ride.vehicleMake || '',
          vehicleModel: ride.vehicle_model || ride.vehicleModel || '',
          vehiclePlate: ride.vehicle_plate || ride.vehiclePlate || '',
          vehicleColor: ride.vehicle_color || ride.vehicleColor || '',
          status: ride.status || 'available',
          type: ride.type || ride.vehicle_type || 'economy',
          
          // ✅ Campos adicionais para compatibilidade
          vehicleInfo: {
            make: ride.vehicle_make || ride.vehicleMake || '',
            model: ride.vehicle_model || ride.vehicleModel || '',
            type: ride.vehicle_type || ride.vehicleType || 'economy',
            typeDisplay: VEHICLE_TYPE_DISPLAY[ride.vehicle_type]?.label || 'Económico',
            typeIcon: VEHICLE_TYPE_DISPLAY[ride.vehicle_type]?.icon || '🚗',
            plate: ride.vehicle_plate || ride.vehiclePlate || '',
            color: ride.vehicle_color || ride.vehicleColor || '',
            maxPassengers: Number(ride.max_passengers ?? ride.maxPassengers ?? 4)
          },
          
          route_compatibility: Number(ride.direction_score ?? ride.route_compatibility ?? 0),
          distanceFromCityKm: Number(ride.distance_from_city_km ?? ride.distanceFromCityKm ?? 0),
          distanceToCityKm: Number(ride.distance_to_city_km ?? ride.distanceToCityKm ?? 0)
        };

        console.log('🚗 [DEBUG] Ride processado:', {
          id: processedRide.id,
          driverName: processedRide.driver_name,
          driverRating: processedRide.driver_rating,
          vehicleInfo: processedRide.vehicleInfo,
          price: processedRide.priceperseat,
          availableSeats: processedRide.availableseats,
          fromLocation: processedRide.from_city,
          toLocation: processedRide.to_city,
          distanceFromCityKm: processedRide.distance_from_city_km,
          match_type: processedRide.match_type,
          direction_score: processedRide.direction_score
        });
        
        return processedRide;
      });
      
      console.log('✅ [DEBUG] Total de rides processados:', processedRides.length);
      return processedRides;
    },
    enabled: !!searchParams.from && !!searchParams.to && externalRides.length === 0,
  });

  // ✅ CORREÇÃO: Usar rides externos se disponíveis, senão usar os internos
  const ridesToShow = externalRides.length > 0 ? externalRides : internalRides ?? [];

  // ✅✅✅ ENHANCE RIDES COM INFO DE DATA
  const enhancedRides = enhanceRidesWithDateInfo(ridesToShow, searchParams.when);
  const hasExactDateRides = enhancedRides.some(ride => ride._isExactDate);

  console.log('🔍 [DEBUG] Rides data:', enhancedRides);
  console.log('🔍 [DEBUG] Loading state:', isLoading);
  console.log('🔍 [DEBUG] External rides provided:', externalRides.length > 0);
  console.log('🔍 [DEBUG] Exact date rides:', hasExactDateRides);

  // ✅ Função para lidar com sucesso de pagamento
  const handlePaymentSuccess = () => {
    console.log('💰 [DEBUG] Payment successful');
    setShowPaymentModal(false);
    setPaymentBooking(null);
    toast({
      title: "Pagamento confirmado!",
      description: "Sua reserva foi confirmada com sucesso.",
      variant: "default"
    });
  };

  // ✅ Funções para os modais
  const handleBookRide = (ride: Ride) => {
    console.log('📋 [DEBUG] Booking ride:', ride.id);
    
    if (onRideSelect) {
      onRideSelect(ride);
    } else {
      setSelectedRide(ride);
      setShowBookingModal(true);
    }
  };

  const handleNegotiatePrice = (ride: Ride) => {
    console.log('💬 [DEBUG] Negotiating price for ride:', ride.id);
    setNegotiationRide(ride);
    setShowNegotiationModal(true);
  };

  const handleEnRoutePickup = (ride: Ride) => {
    console.log('📍 [DEBUG] En route pickup for ride:', ride.id);
    setPickupRide(ride);
    setShowPickupModal(true);
  };

  const submitNegotiation = (negotiationData: any) => {
    console.log('💰 [DEBUG] Price negotiation submitted:', negotiationData);
    setShowNegotiationModal(false);
    setNegotiationRide(null);
    toast({
      title: "Negociação enviada!",
      description: "O motorista recebeu sua proposta de preço.",
    });
  };

  const submitPickupRequest = (pickupData: any) => {
    console.log('🚗 [DEBUG] Pickup request submitted:', pickupData);
    setShowPickupModal(false);
    setPickupRide(null);
    toast({
      title: "Pickup solicitado!",
      description: "O motorista foi notificado do seu ponto de encontro.",
    });
  };

  if (isLoading && externalRides.length === 0) {
    return <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto my-8" />;
  }

  return (
    <>
      {/* ✅ ADICIONAR BANNER DE AVISO PARA DATAS DIFERENTES */}
      <DateWarningBanner 
        searchDate={searchParams.when} 
        hasExactDateRides={hasExactDateRides}
      />
      
      {/* 🔍 COMPONENTE DE DEBUG - ADICIONADO PARA VERIFICAR OS DADOS */}
      <DebugComponent rides={enhancedRides} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Mapa */}
        <div className="lg:col-span-2">
          <Map
            type="ride"
            from={searchParams.from}
            to={searchParams.to}
            markers={enhancedRides.map(ride => ({
              lat: ride.from_lat || -25.9692,
              lng: ride.from_lng || 32.5732,
              popup: `${getVehicleInfo(ride).typeDisplay} - ${getDisplayPrice(ride)} - ${getDriverName(ride)}`,
            }))}
          />
        </div>

        {/* Lista de Viagens */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-gray-900">
            Viagens Disponíveis
            {!hasExactDateRides && enhancedRides.length > 0 && (
              <span style={{
                fontSize: '14px',
                color: '#e65100',
                marginLeft: '8px',
                fontStyle: 'italic'
              }}>
                (em datas próximas)
              </span>
            )}
          </h3>
          
          {/* Estatísticas de Matching - ATUALIZADA COM INFO DE DATAS */}
          {enhancedRides.some(ride => ride.match_type) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h4 className="text-sm font-medium text-blue-900 mb-2 flex items-center">
                <span className="text-blue-600 mr-2">⚡</span>
                Busca Inteligente - Resultados
                {!hasExactDateRides && enhancedRides.length > 0 && (
                  <span style={{
                    fontSize: '12px',
                    color: '#e65100',
                    marginLeft: '8px',
                    fontStyle: 'italic'
                  }}>
                    • Mostrando rides em datas próximas
                  </span>
                )}
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="text-center">
                  <div className="text-blue-700 font-bold">
                    {enhancedRides.filter(r => r._isExactDate).length}
                  </div>
                  <div className="text-blue-600">Na data</div>
                </div>
                <div className="text-center">
                  <div className="text-blue-700 font-bold">
                    {enhancedRides.filter(r => !r._isExactDate).length}
                  </div>
                  <div className="text-blue-600">Datas próximas</div>
                </div>
                <div className="text-center">
                  <div className="text-blue-700 font-bold">
                    {enhancedRides.filter(r => r.direction_score && r.direction_score >= 80).length}
                  </div>
                  <div className="text-blue-600">Alta Pont.</div>
                </div>
                <div className="text-center">
                  <div className="text-blue-700 font-bold">{enhancedRides.length}</div>
                  <div className="text-blue-600">Total</div>
                </div>
              </div>
            </div>
          )}
          
          {enhancedRides.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-gray-400 text-2xl">🚗</span>
              </div>
              <p className="text-gray-500">Nenhuma viagem encontrada</p>
            </div>
          ) : (
            // ✅ RENDERIZAR RIDES ENHANCED COM DESTAQUE DE DATAS
            enhancedRides.map((ride) => (
              <RideCard
                key={ride.id}
                ride={ride}
                onBookRide={handleBookRide}
                onNegotiatePrice={handleNegotiatePrice}
                onEnRoutePickup={handleEnRoutePickup}
                searchDate={searchParams.when} // ✅ PASSAR A DATA DE BUSCA
              />
            ))
          )}
        </div>
      </div>

      {/* MODAIS ATIVADOS */}
      {selectedRide && !onRideSelect && (
        <BookingModal
          type="ride"
          item={selectedRide}
          searchParams={searchParams}
          isOpen={showBookingModal}
          onClose={() => setShowBookingModal(false)}
        />
      )}

      {negotiationRide && (
        <PriceNegotiationModal
          ride={negotiationRide}
          isOpen={showNegotiationModal}
          onClose={() => setShowNegotiationModal(false)}
          onSubmit={submitNegotiation}
        />
      )}

      {pickupRide && (
        <EnRoutePickupModal
          ride={pickupRide}
          isOpen={showPickupModal}
          onClose={() => setShowPickupModal(false)}
          onSubmit={submitPickupRequest}
        />
      )}

      {paymentBooking && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          booking={paymentBooking}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
    </>
  );
}