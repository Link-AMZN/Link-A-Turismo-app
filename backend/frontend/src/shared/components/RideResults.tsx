import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
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
import { formatPriceStringAsMzn } from "@/shared/lib/currency";
import { useToast } from "@/shared/hooks/use-toast";

// ✅ INTERFACE RIDE COMPLETA E CORRIGIDA
interface Ride {
  id: string;
  driverId: string;
  fromLocation: string;
  toLocation: string;
  fromAddress?: string;
  toAddress?: string;
  departureDate: string;
  departureTime: string;  // 🔹 OBRIGATÓRIA
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'expired' | 'active' | 'available'; // 🔹 OBRIGATÓRIA
  price: number;
  pricePerSeat: number;
  maxPassengers: number;
  currentPassengers: number;
  type: string;
  driverName?: string;
  driverRating?: number;
  description?: string;
  vehiclePhoto?: string;
  availableSeats?: number;
  estimatedDuration?: number;
  estimatedDistance?: number;
  allowNegotiation?: boolean;
  allowPickupEnRoute?: boolean;
  isRoundTrip?: boolean;
  match_type?: string;
  route_compatibility?: number;
  match_description?: string;
  vehicleFeatures?: string[];
  isVerifiedDriver?: boolean;
  driver?: {
    firstName?: string;
    lastName?: string;
    rating?: number;
    isVerified?: boolean;
  };
  // ✅ CAMPOS ADICIONAIS PARA COMPATIBILIDADE
  fromProvince?: string;
  toProvince?: string;
  vehicleType?: string;
  vehicleInfo?: string;
  availableIn?: number;
}

// ✅ INTERFACE ATUALIZADA com a prop rides
interface RideResultsProps {
  searchParams: {
    from: string;
    to: string;
    when: string;
  };
  rides?: Ride[]; // ✅ PROP ADICIONADA
  onRideSelect?: (ride: Ride) => void; // ✅ PROP ADICIONADA
}

// 🆕 Função para obter badge de compatibilidade - CORRIGIDA
const getMatchBadge = (ride: Ride) => {
  // ✅ CORREÇÃO: Usar match_type em vez de matchType
  if (!ride.match_type) return null;

  const matchConfig: { [key: string]: { label: string; color: string } } = {
    'exact_match': { label: '🎯 Match Exato', color: 'bg-green-100 text-green-800 border-green-200' },
    'same_segment': { label: '📍 Mesmo Trecho', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    'same_origin': { label: '🚩 Mesma Origem', color: 'bg-purple-100 text-purple-800 border-purple-200' },
    'same_destination': { label: '🏁 Mesmo Destino', color: 'bg-orange-100 text-orange-800 border-orange-200' },
    'same_direction': { label: '🧭 Mesma Direção', color: 'bg-teal-100 text-teal-800 border-teal-200' },
    'embark_later': { label: '⏭️ Embarque Depois', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    'disembark_later': { label: '⏭️ Desembarque Depois', color: 'bg-amber-100 text-amber-800 border-amber-200' }
  };

  const config = matchConfig[ride.match_type];
  if (!config) return null;

  return (
    <Badge className={`${config.color} border text-xs font-medium`}>
      {config.label} {ride.route_compatibility && `(${ride.route_compatibility}%)`}
    </Badge>
  );
};

// 🆕 Função para obter nome do motorista (compatibilidade) - CORRIGIDA
const getDriverName = (ride: Ride): string => {
  // ✅ CORREÇÃO: Usar ?? em vez de || e tratar undefined corretamente
  return ride.driver
    ? `${ride.driver.firstName ?? ''} ${ride.driver.lastName ?? ''}`.trim() || 'Motorista'
    : ride.driverName ?? 'Motorista';
};

// 🆕 Função para obter rating do motorista (compatibilidade) - CORRIGIDA
const getDriverRating = (ride: Ride): number | undefined => {
  // ✅ CORREÇÃO: Retornar apenas number | undefined para compatibilidade com a interface
  return ride.driver?.rating ?? ride.driverRating;
};

// 🆕 Função para formatar preço (compatibilidade com formatPriceStringAsMzn)
const formatPrice = (price: number): string => {
  return formatPriceStringAsMzn(price.toString());
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
  
  // ✅ Todos os states para funcionalidades
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentBooking, setPaymentBooking] = useState<any>(null);
  const [showNegotiationModal, setShowNegotiationModal] = useState(false);
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [negotiationRide, setNegotiationRide] = useState<Ride | null>(null);
  const [pickupRide, setPickupRide] = useState<Ride | null>(null);

  // ✅ Query para buscar viagens (só executa se não houver rides externos) - CORRIGIDA
  const { data: internalRides, isLoading } = useQuery<Ride[]>({
    queryKey: ["rides-search", searchParams.from, searchParams.to, searchParams.when, externalRides.length],
    queryFn: async () => {
      console.log('🔍 [DEBUG] Fetching rides with:', searchParams);
      
      const params = new URLSearchParams();
      if (searchParams.from) params.append('from', searchParams.from);
      if (searchParams.to) params.append('to', searchParams.to);
      if (searchParams.when) params.append('date', searchParams.when);
      
      // 🆕 Adicionar parâmetro de busca inteligente
      params.append('smartSearch', 'true');
      
      const url = `/api/rides?${params.toString()}`;
      console.log('🔍 [DEBUG] Fetch URL:', url);
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Erro ao buscar viagens');
      
      // ✅ CORREÇÃO: Tipar a resposta da API
      const result = await response.json() as RideApiResponse;
      console.log('🔍 [DEBUG] API response:', result);
      
      // ✅ CORREÇÃO: Usar dados consistentes da resposta com fallback seguro
      const ridesData = Array.isArray(result.rides) ? result.rides : 
                       Array.isArray(result.data?.rides) ? result.data.rides : [];
      
      // ✅ CORREÇÃO: Processar resposta com estrutura completa e driverRating como number
      return ridesData.map((ride: any) => {
        // ✅ CORREÇÃO CRÍTICA: Converter driverRating para number
        const driverRatingNum = Number(ride.driver?.rating ?? ride.driverRating);
        
        return {
          id: ride.id.toString(),
          driverId: ride.driverId,
          fromLocation: ride.fromLocation,
          toLocation: ride.toLocation,
          fromAddress: ride.fromAddress ?? ride.fromLocation,
          toAddress: ride.toAddress ?? ride.toLocation,
          departureDate: ride.departureDate,
          // ✅ CORREÇÃO CRÍTICA: Adicionar departureTime e status obrigatórios com ??
          departureTime: ride.departureTime ?? '08:00',
          status: ride.status ?? 'active',
          // ✅ CORREÇÃO: Usar pricePerSeat como price para compatibilidade
          price: ride.pricePerSeat ?? ride.price ?? 0,
          pricePerSeat: ride.pricePerSeat ?? ride.price ?? 0,
          maxPassengers: ride.maxPassengers ?? 4,
          currentPassengers: ride.currentPassengers ?? 0,
          type: ride.vehicleType ?? ride.type ?? 'standard',
          driver: ride.driver ? {
            firstName: ride.driver.firstName ?? 'Motorista',
            lastName: ride.driver.lastName ?? '',
            rating: driverRatingNum, // ✅ Usar número convertido
            isVerified: ride.driver.isVerified
          } : undefined,
          // ✅ CORREÇÃO: Usar função getDriverName para consistência
          driverName: getDriverName(ride),
          driverRating: driverRatingNum, // ✅ CORREÇÃO: Garantir que seja number
          description: ride.description,
          vehiclePhoto: ride.vehiclePhoto,
          // ✅ CORREÇÃO: Usar ?? em vez de || para availableSeats
          availableSeats: ride.availableSeats ?? (ride.maxPassengers - (ride.currentPassengers ?? 0)),
          availableIn: Math.floor(Math.random() * 30) + 5,
          // ✅ CORREÇÃO: estimatedDistance como número
          estimatedDuration: ride.estimatedDuration ?? Math.floor(Math.random() * 120) + 30,
          estimatedDistance: ride.estimatedDistance ?? Math.floor(Math.random() * 200 + 50),
          allowNegotiation: ride.allowNegotiation ?? Math.random() > 0.5,
          allowPickupEnRoute: ride.allowPickupEnRoute ?? Math.random() > 0.7,
          isRoundTrip: ride.isRoundTrip ?? Math.random() > 0.8,
          
          // ✅ CORREÇÃO: Usar nomes corretos da interface
          match_type: ride.match_type,
          route_compatibility: ride.route_compatibility,
          match_description: ride.match_description,
          fromProvince: ride.fromProvince,
          toProvince: ride.toProvince,
          vehicleType: ride.vehicleType,
          vehicleInfo: ride.vehicleInfo,
          vehicleFeatures: ride.vehicleFeatures,
          isVerifiedDriver: ride.isVerifiedDriver
        };
      });
    },
    enabled: !!searchParams.from && !!searchParams.to && externalRides.length === 0,
  });

  // ✅ CORREÇÃO: Usar rides externos se disponíveis, senão usar os internos
  const ridesToShow = externalRides.length > 0 ? externalRides : internalRides ?? [];

  console.log('🔍 [DEBUG] Rides data:', ridesToShow);
  console.log('🔍 [DEBUG] Loading state:', isLoading);
  console.log('🔍 [DEBUG] External rides provided:', externalRides.length > 0);

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
    
    // ✅ Se houver callback externo, usar ele
    if (onRideSelect) {
      onRideSelect(ride);
    } else {
      // ✅ Senão, usar o modal interno
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Mapa */}
        <div className="lg:col-span-2">
          <Map
            type="ride"
            from={searchParams.from}
            to={searchParams.to}
            markers={ridesToShow.map(ride => ({
              lat: -25.9692,
              lng: 32.5732,
              popup: `${ride.type} - ${formatPrice(ride.price)}`,
            }))}
          />
        </div>

        {/* Lista de Viagens */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-gray-900">Viagens Disponíveis</h3>
          
          {/* 🆕 Estatísticas de Matching - CORRIGIDA */}
          {ridesToShow.some(ride => ride.route_compatibility) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h4 className="text-sm font-medium text-blue-900 mb-2 flex items-center">
                <span className="text-blue-600 mr-2">⚡</span>
                Compatibilidade das Viagens
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="text-center">
                  <div className="text-blue-700 font-bold">
                    {ridesToShow.filter(r => r.match_type === 'exact_match').length}
                  </div>
                  <div className="text-blue-600">Exatas</div>
                </div>
                <div className="text-center">
                  <div className="text-blue-700 font-bold">
                    {ridesToShow.filter(r => r.match_type === 'same_segment').length}
                  </div>
                  <div className="text-blue-600">Mesmo Trecho</div>
                </div>
                <div className="text-center">
                  <div className="text-blue-700 font-bold">
                    {ridesToShow.filter(r => r.match_type === 'same_direction').length}
                  </div>
                  <div className="text-blue-600">Mesma Direção</div>
                </div>
                <div className="text-center">
                  <div className="text-blue-700 font-bold">{ridesToShow.length}</div>
                  <div className="text-blue-600">Total</div>
                </div>
              </div>
            </div>
          )}
          
          {ridesToShow.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-gray-400 text-2xl">🚗</span>
              </div>
              <p className="text-gray-500">Nenhuma viagem encontrada</p>
            </div>
          ) : (
            ridesToShow.map((ride) => (
              <div
                key={ride.id}
                className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
              >
                <div className="space-y-3">
                  {/* 🆕 Badge de Compatibilidade */}
                  {getMatchBadge(ride)}
                  
                  {/* Cabeçalho */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                        <span className="text-gray-600">🚗</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 capitalize">{ride.type}</h4>
                        <p className="text-sm text-gray-500">
                          {ride.fromLocation} → {ride.toLocation}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">
                            {getDriverName(ride)}
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="text-yellow-500 text-xs">⭐</span>
                            <span className="text-xs">
                              {getDriverRating(ride) ?? 'N/A'} {/* ✅ CORREÇÃO: Usar ?? para fallback */}
                            </span>
                          </div>
                          {/* 🆕 Badge de motorista verificado */}
                          {(ride.driver?.isVerified || ride.isVerifiedDriver) && (
                            <Badge className="bg-green-100 text-green-800 text-xs border-0">
                              Verificado
                            </Badge>
                          )}
                        </div>
                        
                        {/* 🆕 Informações adicionais */}
                        <div className="flex flex-wrap gap-2 mt-2 text-xs text-gray-500">
                          {ride.estimatedDuration && (
                            <span>⏱️ {ride.estimatedDuration} min</span>
                          )}
                          {ride.availableSeats && (
                            <span>💺 {ride.availableSeats} assentos</span>
                          )}
                          {ride.vehicleType && (
                            <span>🚗 {ride.vehicleType}</span>
                          )}
                          {ride.estimatedDistance && (
                            <span>📏 {ride.estimatedDistance} km</span>
                          )}
                          {ride.departureTime && (
                            <span>🕐 {ride.departureTime}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {formatPrice(ride.price)}
                      </p>
                      <p className="text-xs text-gray-500">por pessoa</p>
                    </div>
                  </div>

                  {/* 🆕 Descrição do Matching */}
                  {ride.match_description && (
                    <div className="bg-gray-50 rounded px-3 py-2">
                      <p className="text-xs text-gray-600 italic">{ride.match_description}</p>
                    </div>
                  )}

                  {/* 🆕 Features do Veículo */}
                  {ride.vehicleFeatures && ride.vehicleFeatures.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {ride.vehicleFeatures.map((feature, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Botões de Ação */}
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => handleBookRide(ride)}
                      className="flex-1 bg-red-600 hover:bg-red-700"
                      disabled={!ride.availableSeats || ride.availableSeats <= 0}
                    >
                      <span className="mr-2">📅</span>
                      {(!ride.availableSeats || ride.availableSeats <= 0) ? 'Lotado' : 'Reservar'}
                    </Button>
                    
                    {ride.allowNegotiation && (
                      <Button 
                        variant="outline"
                        onClick={() => handleNegotiatePrice(ride)}
                        className="flex-1"
                      >
                        <span className="mr-2">🤝</span>
                        Negociar
                      </Button>
                    )}
                  </div>

                  {ride.allowPickupEnRoute && (
                    <Button 
                      variant="outline" 
                      onClick={() => handleEnRoutePickup(ride)}
                      className="w-full"
                    >
                      <span className="mr-2">📍</span>
                      Pickup em Rota
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ✅ MODAIS ATIVADOS (só aparecem se não houver callback externo) */}
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

      {/* ✅ CORRIGIDO: PaymentModal com onPaymentSuccess */}
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