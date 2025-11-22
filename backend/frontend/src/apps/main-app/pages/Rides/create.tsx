import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { useToast } from "@/shared/hooks/use-toast";
import { ArrowLeft, Car, MapPin, Calendar, Users, DollarSign, Clock } from "lucide-react";
import LocationAutocomplete, { LocationOption } from "@/shared/components/LocationAutocomplete";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/shared/components/PageHeader";
import { useAuth } from "@/shared/hooks/useAuth";

// ✅ CORREÇÃO: Remover a interface LocationOption duplicada
// A interface já está sendo importada do componente LocationAutocomplete

// ✅ CORREÇÃO: Interface específica para payload
interface CreateRidePayload {
  fromLocation: string;
  toLocation: string;
  departureDate: string;
  departureTime: string;
  pricePerSeat: number;
  availableSeats: number;
  vehicleType: string;
  additionalInfo?: string;
  fromAddress?: string;
  toAddress?: string;
  maxPassengers?: number;
  description?: string;
  driverId: string;
  allowNegotiation?: boolean;
  isRecurring?: boolean;
  fromLat?: number;
  fromLng?: number;
  toLat?: number;
  toLng?: number;
}

export default function CreateRidePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  // ✅ CORREÇÃO: pricePerSeat como number
  const [rideData, setRideData] = useState({
    fromLocation: "",
    toLocation: "",
    departureDate: "",
    departureTime: "",
    availableSeats: 4,
    pricePerSeat: 0, // ✅ CORREÇÃO: number em vez de string
    vehicleType: "",
    additionalInfo: ""
  });
  const [fromCoordinates, setFromCoordinates] = useState<{lat: number, lng: number} | null>(null);
  const [toCoordinates, setToCoordinates] = useState<{lat: number, lng: number} | null>(null);
  const [estimatedDistance, setEstimatedDistance] = useState<number | null>(null);
  const [estimatedDuration, setEstimatedDuration] = useState<number | null>(null);

  // ✅ CORREÇÃO: Função calculateRouteDistance melhorada com parâmetro
  const calculateRouteDistance = async (data: typeof rideData) => {
    if (data.fromLocation && data.toLocation) {
      try {
        const response = await fetch(
          `/api/geo/distance?from=${encodeURIComponent(data.fromLocation)}&to=${encodeURIComponent(data.toLocation)}`
        );
        const result = await response.json();
        if (result.distance) {
          setEstimatedDistance(result.distance);
          // ✅ CORREÇÃO: Calcular duração baseada em velocidade média (80 km/h)
          const durationHours = result.distance / 80;
          setEstimatedDuration(Math.round(durationHours * 60)); // Converter para minutos
        }
      } catch (error) {
        console.error('Failed to calculate distance:', error);
      }
    }
  };

  // ✅ CORREÇÃO: Handlers atualizados para aceitar LocationOption
  const handleFromLocationChange = (location: LocationOption) => {
    const newRideData = { 
      ...rideData, 
      fromLocation: location.label // ✅ CORREÇÃO: Usar label em vez de string direta
    };
    setRideData(newRideData);
    
    // ✅ CORREÇÃO: Armazenar coordenadas
    if (location.lat && location.lng) {
      setFromCoordinates({ lat: location.lat, lng: location.lng });
    }

    // ✅ CORREÇÃO: Calcular distância com os dados atualizados
    if (newRideData.fromLocation && newRideData.toLocation) {
      calculateRouteDistance(newRideData);
    }
  };

  const handleToLocationChange = (location: LocationOption) => {
    const newRideData = { 
      ...rideData, 
      toLocation: location.label // ✅ CORREÇÃO: Usar label em vez de string direta
    };
    setRideData(newRideData);
    
    // ✅ CORREÇÃO: Armazenar coordenadas
    if (location.lat && location.lng) {
      setToCoordinates({ lat: location.lat, lng: location.lng });
    }

    // ✅ CORREÇÃO: Calcular distância com os dados atualizados
    if (newRideData.fromLocation && newRideData.toLocation) {
      calculateRouteDistance(newRideData);
    }
  };

  // ✅ CORREÇÃO: Mutation com interface específica
  const createRideMutation = useMutation({
    mutationFn: async (newRide: CreateRidePayload) => {
      if (!user?.id) {
        throw new Error('Usuário não autenticado');
      }

      // ✅ CORREÇÃO: Criar ISO string para data/hora
      const departureDateTime = new Date(`${newRide.departureDate}T${newRide.departureTime}`);
      if (isNaN(departureDateTime.getTime())) {
        throw new Error('Data ou hora inválida');
      }

      const payload = {
        fromLocation: newRide.fromLocation,
        toLocation: newRide.toLocation,
        fromAddress: newRide.fromLocation,
        toAddress: newRide.toLocation,
        departureDate: departureDateTime.toISOString(), // ✅ CORREÇÃO: Enviar como ISO string
        departureTime: newRide.departureTime,
        pricePerSeat: newRide.pricePerSeat, // ✅ CORREÇÃO: Já é number
        availableSeats: newRide.availableSeats,
        maxPassengers: newRide.availableSeats,
        vehicleType: newRide.vehicleType,
        additionalInfo: newRide.additionalInfo,
        description: newRide.additionalInfo,
        driverId: user.id,
        allowNegotiation: true,
        isRecurring: false,
        // ✅ CORREÇÃO: Adicionar coordenadas se disponíveis
        ...(fromCoordinates && {
          fromLat: fromCoordinates.lat,
          fromLng: fromCoordinates.lng
        }),
        ...(toCoordinates && {
          toLat: toCoordinates.lat,
          toLng: toCoordinates.lng
        })
      };

      console.log('📤 Criando viagem:', payload);

      // ✅ CORREÇÃO: Atualizar rota da API de /api/rides-simple/create para /api/rides
      const response = await fetch('/api/rides', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao criar viagem');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      console.log('✅ Viagem criada com sucesso:', data);
      toast({
        title: "Viagem criada com sucesso!",
        description: "Sua viagem está agora disponível para reservas.",
        duration: 4000, // ✅ CORREÇÃO: Adicionar timeout
      });
      
      // Reset form
      setRideData({
        fromLocation: "",
        toLocation: "",
        departureDate: "",
        departureTime: "",
        availableSeats: 4,
        pricePerSeat: 0, // ✅ CORREÇÃO: Reset para 0
        vehicleType: "",
        additionalInfo: ""
      });
      setFromCoordinates(null);
      setToCoordinates(null);
      setEstimatedDistance(null);
      setEstimatedDuration(null);
      
      // ✅ CORREÇÃO: Invalidar queries corretas
      queryClient.invalidateQueries({ queryKey: ['rides-search'] });
      queryClient.invalidateQueries({ queryKey: ['driver-rides'] });
      
      // Redirect to driver dashboard or rides list
      setLocation('/drivers');
    },
    onError: (error: any) => {
      console.error('❌ Erro ao criar viagem:', error);
      toast({
        title: "Erro ao criar viagem",
        description: error.message || "Não foi possível criar sua viagem. Verifique os dados e tente novamente.",
        variant: "destructive",
        duration: 4000, // ✅ CORREÇÃO: Adicionar timeout
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // ✅ CORREÇÃO: Validações melhoradas
    if (!rideData.fromLocation || !rideData.toLocation) {
      toast({
        title: "Localizações obrigatórias",
        description: "Selecione de onde está saindo e para onde está indo.",
        variant: "destructive",
        duration: 4000,
      });
      return;
    }
    
    if (!rideData.departureDate || !rideData.departureTime) {
      toast({
        title: "Data e hora obrigatórias",
        description: "Defina a data e hora de partida.",
        variant: "destructive",
        duration: 4000,
      });
      return;
    }
    
    // ✅ CORREÇÃO: Validar data não no passado
    const departureDateTime = new Date(`${rideData.departureDate}T${rideData.departureTime}`);
    if (departureDateTime < new Date()) {
      toast({
        title: "Data inválida",
        description: "A data e hora de partida não podem ser no passado.",
        variant: "destructive",
        duration: 4000,
      });
      return;
    }
    
    // ✅ CORREÇÃO: Validação de preço melhorada
    if (!rideData.pricePerSeat || rideData.pricePerSeat <= 0) {
      toast({
        title: "Preço inválido",
        description: "Digite um preço válido por lugar.",
        variant: "destructive",
        duration: 4000,
      });
      return;
    }

    // ✅ CORREÇÃO: Validação de lugares
    if (rideData.availableSeats < 1 || rideData.availableSeats > 8) {
      toast({
        title: "Lugares inválidos",
        description: "O número de lugares deve estar entre 1 e 8.",
        variant: "destructive",
        duration: 4000,
      });
      return;
    }

    // ✅ CORREÇÃO: Validação de tipo de veículo
    if (!rideData.vehicleType) {
      toast({
        title: "Tipo de veículo obrigatório",
        description: "Selecione o tipo de veículo.",
        variant: "destructive",
        duration: 4000,
      });
      return;
    }

    // ✅ CORREÇÃO: Converter para payload tipado
    const payload: CreateRidePayload = {
      fromLocation: rideData.fromLocation,
      toLocation: rideData.toLocation,
      departureDate: rideData.departureDate,
      departureTime: rideData.departureTime,
      pricePerSeat: rideData.pricePerSeat,
      availableSeats: rideData.availableSeats,
      vehicleType: rideData.vehicleType,
      additionalInfo: rideData.additionalInfo,
      driverId: user?.id || '',
      ...(fromCoordinates && {
        fromLat: fromCoordinates.lat,
        fromLng: fromCoordinates.lng
      }),
      ...(toCoordinates && {
        toLat: toCoordinates.lat,
        toLng: toCoordinates.lng
      })
    };

    createRideMutation.mutate(payload);
  };

  // ✅ CORREÇÃO: Função para formatar duração
  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins > 0 ? `${mins}m` : ''}`.trim();
    }
    return `${mins}m`;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PageHeader title="Criar Viagem" />
      
      <div className="container mx-auto px-4 max-w-2xl py-6">
        {/* Header */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => setLocation('/')}
            className="mb-4"
            data-testid="button-back-home"
            aria-label="Voltar para a página inicial"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Criar Nova Viagem
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Partilhe a sua viagem e ganhe dinheiro
            </p>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="w-5 h-5" />
              Detalhes da Viagem
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Route Section */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Rota da Viagem
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="from-location">Saindo de</Label>
                    {/* ✅ CORREÇÃO APLICADA: value={rideData.fromLocation || ""} */}
                    <LocationAutocomplete
                      id="from-location"
                      placeholder="Saindo de... (Moçambique)"
                      value={rideData.fromLocation || ""}
                      onChange={handleFromLocationChange}
                      aria-describedby="from-location-help"
                    />
                    <p id="from-location-help" className="text-xs text-gray-500 mt-1">
                      Selecione a localização de partida
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="to-location">Indo para</Label>
                    {/* ✅ CORREÇÃO APLICADA: value={rideData.toLocation || ""} */}
                    <LocationAutocomplete
                      id="to-location"
                      placeholder="Indo para... (Moçambique)"
                      value={rideData.toLocation || ""}
                      onChange={handleToLocationChange}
                      aria-describedby="to-location-help"
                    />
                    <p id="to-location-help" className="text-xs text-gray-500 mt-1">
                      Selecione o destino
                    </p>
                  </div>
                </div>
                
                {estimatedDistance && estimatedDuration && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                    <p className="text-blue-700 dark:text-blue-300 text-sm">
                      <strong>Distância estimada:</strong> {estimatedDistance} km
                      <br />
                      <strong>Tempo estimado:</strong> {formatDuration(estimatedDuration)}
                    </p>
                  </div>
                )}
              </div>

              {/* DateTime Section */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Data e Hora
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="date">Data de Partida</Label>
                    <Input
                      id="date"
                      type="date"
                      value={rideData.departureDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setRideData(prev => ({ ...prev, departureDate: e.target.value }))}
                      data-testid="input-departure-date"
                      aria-describedby="date-help"
                    />
                    <p id="date-help" className="text-xs text-gray-500 mt-1">
                      Data da partida
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="time">Hora de Partida</Label>
                    <Input
                      id="time"
                      type="time"
                      value={rideData.departureTime}
                      onChange={(e) => setRideData(prev => ({ ...prev, departureTime: e.target.value }))}
                      data-testid="input-departure-time"
                      aria-describedby="time-help"
                    />
                    <p id="time-help" className="text-xs text-gray-500 mt-1">
                      Hora da partida
                    </p>
                  </div>
                </div>
              </div>

              {/* Vehicle and Capacity */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Car className="w-4 h-4" />
                  Veículo e Capacidade
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="seats">Lugares Disponíveis</Label>
                    <Select
                      value={rideData.availableSeats.toString()}
                      onValueChange={(value) => setRideData(prev => ({ ...prev, availableSeats: parseInt(value) }))}
                    >
                      <SelectTrigger 
                        data-testid="select-available-seats"
                        aria-describedby="seats-help"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 lugar</SelectItem>
                        <SelectItem value="2">2 lugares</SelectItem>
                        <SelectItem value="3">3 lugares</SelectItem>
                        <SelectItem value="4">4 lugares</SelectItem>
                        <SelectItem value="5">5 lugares</SelectItem>
                        <SelectItem value="6">6 lugares</SelectItem>
                        <SelectItem value="7">7 lugares</SelectItem>
                        <SelectItem value="8">8 lugares</SelectItem>
                      </SelectContent>
                    </Select>
                    <p id="seats-help" className="text-xs text-gray-500 mt-1">
                      Número de lugares disponíveis
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="vehicle">Tipo de Veículo</Label>
                    <Select
                      value={rideData.vehicleType}
                      onValueChange={(value) => setRideData(prev => ({ ...prev, vehicleType: value }))}
                    >
                      <SelectTrigger 
                        data-testid="select-vehicle-type"
                        aria-describedby="vehicle-help"
                      >
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sedan">Sedan</SelectItem>
                        <SelectItem value="hatchback">Hatchback</SelectItem>
                        <SelectItem value="suv">SUV</SelectItem>
                        <SelectItem value="pickup">Pickup</SelectItem>
                        <SelectItem value="van">Van/Minibus</SelectItem>
                        <SelectItem value="microbus">Microbus</SelectItem>
                      </SelectContent>
                    </Select>
                    <p id="vehicle-help" className="text-xs text-gray-500 mt-1">
                      Tipo do seu veículo
                    </p>
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Preço
                </h3>
                
                <div>
                  <Label htmlFor="price">Preço por Lugar (MZN)</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={rideData.pricePerSeat}
                    onChange={(e) => setRideData(prev => ({ 
                      ...prev, 
                      pricePerSeat: parseFloat(e.target.value) || 0 
                    }))}
                    placeholder="Ex: 500.00"
                    data-testid="input-price-per-seat"
                    aria-describedby="price-help"
                  />
                  <p id="price-help" className="text-xs text-gray-500 mt-1">
                    Preço por passageiro
                  </p>
                  {estimatedDistance && rideData.pricePerSeat > 0 && (
                    <p className="text-sm text-gray-500 mt-1">
                      Preço por km: {(rideData.pricePerSeat / estimatedDistance).toFixed(2)} MZN/km
                    </p>
                  )}
                </div>
              </div>

              {/* Additional Information */}
              <div className="space-y-4">
                <h3 className="font-semibold">Informações Adicionais</h3>
                
                <div>
                  <Label htmlFor="notes">Observações (opcional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Ex: Ar condicionado, música, paradas permitidas, regras da viagem..."
                    value={rideData.additionalInfo}
                    onChange={(e) => setRideData(prev => ({ 
                      ...prev, 
                      additionalInfo: e.target.value.slice(0, 500)
                    }))}
                    rows={3}
                    data-testid="textarea-additional-info"
                    aria-describedby="notes-help"
                  />
                  <p id="notes-help" className="text-xs text-gray-500 mt-1">
                    {rideData.additionalInfo.length}/500 caracteres
                  </p>
                </div>
              </div>

              {/* Summary */}
              {rideData.fromLocation && rideData.toLocation && (
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <h4 className="font-semibold text-green-700 dark:text-green-300 mb-2">
                    Resumo da Viagem
                  </h4>
                  <div className="space-y-1 text-sm text-green-600 dark:text-green-400">
                    <p><strong>Rota:</strong> {rideData.fromLocation} → {rideData.toLocation}</p>
                    {estimatedDistance && estimatedDuration && (
                      <>
                        <p><strong>Distância:</strong> {estimatedDistance} km</p>
                        <p><strong>Tempo estimado:</strong> {formatDuration(estimatedDuration)}</p>
                      </>
                    )}
                    <p><strong>Receita potencial:</strong> {(rideData.pricePerSeat * rideData.availableSeats).toFixed(2)} MZN</p>
                    {rideData.departureDate && rideData.departureTime && (
                      <p><strong>Partida:</strong> {new Date(rideData.departureDate).toLocaleDateString('pt-PT')} às {rideData.departureTime}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-4">
                <Button
                  type="submit"
                  className="w-full h-12 text-lg"
                  disabled={createRideMutation.isPending || 
                    !rideData.fromLocation || 
                    !rideData.toLocation || 
                    !rideData.departureDate || 
                    !rideData.departureTime || 
                    !rideData.pricePerSeat ||
                    rideData.pricePerSeat <= 0 ||
                    !rideData.vehicleType}
                  data-testid="button-create-ride"
                  aria-describedby="submit-help"
                >
                  {createRideMutation.isPending ? (
                    <>
                      <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2" />
                      Criando viagem...
                    </>
                  ) : (
                    <>
                      <Car className="w-5 h-5 mr-2" />
                      Criar Viagem
                    </>
                  )}
                </Button>
                <p id="submit-help" className="text-xs text-gray-500 mt-2 text-center">
                  Preencha todos os campos obrigatórios para criar a viagem
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}