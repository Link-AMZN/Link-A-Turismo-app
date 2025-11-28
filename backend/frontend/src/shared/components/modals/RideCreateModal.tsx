import { useState, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/shared/hooks/use-toast';
import { Calendar, MapPin, Users, DollarSign, Car, AlertCircle, AlertTriangle } from 'lucide-react';
import { RideCreateParams } from '@/shared/hooks/useModalState';
import { useAuth } from '@/shared/hooks/useAuth';
import { getMyVehicles } from '../../../api/driver/vehicles';
import { apiRequest } from '@/shared/lib/queryClient';

// ✅ INTERFACE VEHICLE ADICIONADA
interface Vehicle {
  id: string;
  plateNumber: string;
  make: string;
  model: string;
  color: string;
  year?: number;
  vehicleType: string;
  maxPassengers: number;
  features: string[];
  photoUrl?: string;
  isActive: boolean;
}

interface RideCreateModalProps {
  initialParams: RideCreateParams;
  onClose: () => void;
}

export default function RideCreateModal({ initialParams, onClose }: RideCreateModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // ✅ ESTADOS NOVOS PARA VEÍCULOS
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [vehiclesError, setVehiclesError] = useState<string | null>(null);
  
  // ✅ ESTADO ATUALIZADO COM vehicleId
  const [rideData, setRideData] = useState({
    fromLocation: initialParams.from || '',
    toLocation: initialParams.to || '',
    departureDate: initialParams.date || '',
    departureTime: '08:00',
    availableSeats: initialParams.seats || 4,
    pricePerSeat: initialParams.price || 100,
    additionalInfo: '',
    vehicleType: 'sedan',
    vehicleId: '', // ✅ NOVO CAMPO OBRIGATÓRIO
  });

  // ✅ useEffect PARA CARREGAR VEÍCULOS
  useEffect(() => {
    const loadVehicles = async () => {
      if (!user?.id) return;
      
      try {
        setLoadingVehicles(true);
        setVehiclesError(null);
        const myVehicles = await getMyVehicles();
        setVehicles(myVehicles);
        
        // ✅ SELECIONAR PRIMEIRO VEÍCULO POR PADRÃO
        if (myVehicles.length > 0) {
          setRideData(prev => ({
            ...prev,
            vehicleId: myVehicles[0].id,
            vehicleType: myVehicles[0].vehicleType
          }));
        }
      } catch (error) {
        console.error('❌ Erro ao carregar veículos:', error);
        setVehiclesError('Erro ao carregar veículos. Tente novamente.');
      } finally {
        setLoadingVehicles(false);
      }
    };

    loadVehicles();
  }, [user?.id]);

  const createRideMutation = useMutation({
    mutationFn: async (data: typeof rideData) => {
      if (!user?.id) {
        throw new Error('Usuário não autenticado');
      }

      // ✅ VALIDAÇÃO OBRIGATÓRIA DO VEÍCULO
      if (!data.vehicleId) {
        throw new Error('Selecione um veículo para a viagem');
      }

      // ✅ VERIFICAR SE VEÍCULO EXISTE
      const selectedVehicle = vehicles.find(v => v.id === data.vehicleId);
      if (!selectedVehicle) {
        throw new Error('Veículo selecionado não encontrado');
      }

      // ✅ VALIDAR CAPACIDADE
      if (data.availableSeats > selectedVehicle.maxPassengers) {
        throw new Error(`Número de assentos (${data.availableSeats}) excede capacidade do veículo (máximo: ${selectedVehicle.maxPassengers})`);
      }

      // ✅ CORREÇÃO: Validar data e hora
      const departureDateTime = new Date(`${data.departureDate}T${data.departureTime}`);
      if (isNaN(departureDateTime.getTime())) {
        throw new Error('Data ou hora inválida');
      }

      // ✅ CORREÇÃO: Payload padronizado e consistente COM vehicleId
      const payload = {
        fromLocation: data.fromLocation,
        toLocation: data.toLocation,
        fromAddress: data.fromLocation,
        toAddress: data.toLocation,
        departureDate: departureDateTime.toISOString(),
        departureTime: data.departureTime,
        pricePerSeat: Number(data.pricePerSeat),
        availableSeats: Number(data.availableSeats),
        maxPassengers: Number(data.availableSeats),
        vehicleType: data.vehicleType,
        additionalInfo: data.additionalInfo || null,
        description: data.additionalInfo || null,
        driverId: user.id,
        allowNegotiation: true,
        isRecurring: false,
        vehicleId: data.vehicleId, // ✅ NOVO CAMPO OBRIGATÓRIO
      };

      console.log('📤 Criando viagem:', payload);

      // ✅ CORREÇÃO: Usar apiRequest em vez de fetch direto
      const response = await apiRequest<{ success: boolean; ride: any; message: string }>('POST', '/api/provider/rides', payload);
      
      if (!response.success) {
        throw new Error(response.message || 'Erro ao criar viagem');
      }
      
      return response;
    },
    onSuccess: (data) => {
      console.log('✅ Viagem criada com sucesso:', data);
      toast({
        title: "Viagem criada!",
        description: "Sua viagem foi publicada com sucesso e já está disponível para reservas.",
      });
      
      // ✅ CORREÇÃO: Reset do formulário após sucesso
      setRideData({
        fromLocation: '',
        toLocation: '',
        departureDate: '',
        departureTime: '08:00',
        availableSeats: 4,
        pricePerSeat: 100,
        additionalInfo: '',
        vehicleType: 'sedan',
        vehicleId: vehicles.length > 0 ? vehicles[0].id : '', // ✅ MANTER PRIMEIRO VEÍCULO
      });
      
      // Invalidar cache de buscas para mostrar a nova viagem
      queryClient.invalidateQueries({ queryKey: ['rides-search'] });
      queryClient.invalidateQueries({ queryKey: ['driver-rides'] });
      
      onClose();
    },
    onError: (error: any) => {
      console.error('❌ Erro ao criar viagem:', error);
      toast({
        title: "Erro ao criar viagem",
        description: error.message || "Não foi possível criar sua viagem. Tente novamente.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = () => {
    // ✅ VALIDAÇÃO OBRIGATÓRIA DO VEÍCULO
    if (!rideData.vehicleId) {
      toast({
        title: "Veículo obrigatório",
        description: "Por favor, selecione um veículo para a viagem.",
        variant: "destructive",
      });
      return;
    }

    if (vehicles.length === 0) {
      toast({
        title: "Cadastre um veículo",
        description: "Você precisa cadastrar um veículo antes de criar uma viagem.",
        variant: "destructive",
      });
      return;
    }

    // ✅ CORREÇÃO: Validações melhoradas
    if (!rideData.fromLocation || !rideData.toLocation) {
      toast({
        title: "Localizações obrigatórias",
        description: "Por favor, preencha origem e destino.",
        variant: "destructive",
      });
      return;
    }

    if (!rideData.departureDate || !rideData.departureTime) {
      toast({
        title: "Data e hora obrigatórias",
        description: "Por favor, preencha data e hora de partida.",
        variant: "destructive",
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
      });
      return;
    }

    if (rideData.availableSeats < 1 || rideData.availableSeats > 8) {
      toast({
        title: "Número de assentos inválido",
        description: "O número de assentos deve estar entre 1 e 8.",
        variant: "destructive",
      });
      return;
    }

    if (rideData.pricePerSeat < 10) {
      toast({
        title: "Preço muito baixo",
        description: "O preço mínimo é de 10 MT por pessoa.",
        variant: "destructive",
      });
      return;
    }

    if (!rideData.vehicleType) {
      toast({
        title: "Tipo de veículo obrigatório",
        description: "Por favor, selecione o tipo de veículo.",
        variant: "destructive",
      });
      return;
    }

    createRideMutation.mutate(rideData);
  };

  const handleInputChange = (field: string, value: string | number) => {
    setRideData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="p-6">
      <div className="space-y-6">
        {/* Informações da Viagem */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold border-b pb-2">
            Informações da Viagem
          </h3>
          
          {/* ✅ SELETOR DE VEÍCULO ADICIONADO */}
          <div className="space-y-2">
            <Label htmlFor="vehicleId" className="flex items-center gap-2">
              <Car className="w-4 h-4" />
              Veículo *
            </Label>
            
            {loadingVehicles ? (
              <div className="text-sm text-gray-500">Carregando veículos...</div>
            ) : vehiclesError ? (
              <div className="text-sm text-red-500 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {vehiclesError}
              </div>
            ) : vehicles.length === 0 ? (
              <div className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded border border-yellow-200">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4" />
                  <strong>Cadastre um veículo primeiro</strong>
                </div>
                <p>Você precisa cadastrar um veículo antes de oferecer boleia.</p>
                <Button 
                  variant="link" 
                  className="p-0 h-auto text-blue-600 font-medium"
                  onClick={() => {
                    window.location.href = '/driver/vehicles';
                  }}
                >
                  Cadastrar veículo agora
                </Button>
              </div>
            ) : (
              <>
                <Select
                  value={rideData.vehicleId}
                  onValueChange={(value) => {
                    const vehicle = vehicles.find(v => v.id === value);
                    handleInputChange('vehicleId', value);
                    if (vehicle) {
                      handleInputChange('vehicleType', vehicle.vehicleType);
                    }
                  }}
                >
                  <SelectTrigger className="w-full" data-testid="select-vehicle">
                    <SelectValue placeholder="Selecione seu veículo" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        🚗 {vehicle.make} {vehicle.model} ({vehicle.color}) - {vehicle.plateNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* DETALHES DO VEÍCULO SELECIONADO */}
                {rideData.vehicleId && (
                  <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded border border-blue-200">
                    <div className="font-medium">Veículo selecionado:</div>
                    <div>
                      {vehicles.find(v => v.id === rideData.vehicleId)?.make} {vehicles.find(v => v.id === rideData.vehicleId)?.model} 
                      ({vehicles.find(v => v.id === rideData.vehicleId)?.color}) - {vehicles.find(v => v.id === rideData.vehicleId)?.plateNumber}
                    </div>
                    <div className="text-blue-500 text-xs mt-1">
                      Capacidade: {vehicles.find(v => v.id === rideData.vehicleId)?.maxPassengers} passageiros • 
                      Tipo: {vehicles.find(v => v.id === rideData.vehicleId)?.vehicleType}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fromLocation" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Origem
              </Label>
              <Input
                id="fromLocation"
                value={rideData.fromLocation}
                onChange={(e) => handleInputChange('fromLocation', e.target.value)}
                placeholder="De onde você sai?"
                data-testid="input-create-from"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="toLocation" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Destino
              </Label>
              <Input
                id="toLocation"
                value={rideData.toLocation}
                onChange={(e) => handleInputChange('toLocation', e.target.value)}
                placeholder="Para onde você vai?"
                data-testid="input-create-to"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="departureDate" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Data
              </Label>
              <Input
                id="departureDate"
                type="date"
                value={rideData.departureDate}
                onChange={(e) => handleInputChange('departureDate', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                data-testid="input-create-date"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="departureTime" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Hora
              </Label>
              <Input
                id="departureTime"
                type="time"
                value={rideData.departureTime}
                onChange={(e) => handleInputChange('departureTime', e.target.value)}
                data-testid="input-create-time"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="availableSeats" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Assentos Disponíveis
              </Label>
              <Input
                id="availableSeats"
                type="number"
                min="1"
                max="8"
                value={rideData.availableSeats}
                onChange={(e) => handleInputChange('availableSeats', parseInt(e.target.value) || 1)}
                data-testid="input-create-seats"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pricePerSeat" className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Preço por Pessoa (MT)
              </Label>
              <Input
                id="pricePerSeat"
                type="number"
                min="10"
                step="5"
                value={rideData.pricePerSeat}
                onChange={(e) => handleInputChange('pricePerSeat', parseFloat(e.target.value) || 0)}
                data-testid="input-create-price"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vehicleType" className="flex items-center gap-2">
                <Car className="w-4 h-4" />
                Tipo de Veículo
              </Label>
              <Select
                value={rideData.vehicleType}
                onValueChange={(value) => handleInputChange('vehicleType', value)}
                disabled={!!rideData.vehicleId} // ✅ DESABILITADO QUANDO VEÍCULO SELECIONADO
              >
                <SelectTrigger data-testid="select-vehicle-type">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sedan">Sedan</SelectItem>
                  <SelectItem value="suv">SUV</SelectItem>
                  <SelectItem value="hatchback">Hatchback</SelectItem>
                  <SelectItem value="pickup">Pickup</SelectItem>
                  <SelectItem value="van">Van</SelectItem>
                  <SelectItem value="minibus">Minibus</SelectItem>
                </SelectContent>
              </Select>
              {rideData.vehicleId && (
                <p className="text-xs text-gray-500">
                  Tipo definido automaticamente pelo veículo selecionado
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Informações Adicionais */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold border-b pb-2">
            Informações Adicionais
          </h3>

          <div className="space-y-2">
            <Label htmlFor="additionalInfo">
              Descrição da Viagem (Opcional)
            </Label>
            <Textarea
              id="additionalInfo"
              value={rideData.additionalInfo}
              onChange={(e) => handleInputChange('additionalInfo', e.target.value)}
              placeholder="Informações adicionais sobre a viagem, pontos de parada, regras, etc."
              rows={3}
              data-testid="textarea-create-description"
            />
          </div>
        </div>

        {/* Resumo */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <h4 className="font-semibold mb-2">Resumo da Viagem</h4>
          <div className="space-y-1 text-sm">
            <p><strong>Rota:</strong> {rideData.fromLocation || '...'} → {rideData.toLocation || '...'}</p>
            <p><strong>Data e Hora:</strong> {rideData.departureDate ? new Date(rideData.departureDate).toLocaleDateString('pt-PT') : '...'} às {rideData.departureTime || '...'}</p>
            <p><strong>Assentos:</strong> {rideData.availableSeats} disponíveis</p>
            <p><strong>Preço:</strong> {rideData.pricePerSeat} MT por pessoa</p>
            <p><strong>Veículo:</strong> {vehicles.find(v => v.id === rideData.vehicleId) ? `${vehicles.find(v => v.id === rideData.vehicleId)?.make} ${vehicles.find(v => v.id === rideData.vehicleId)?.model}` : 'Não selecionado'}</p>
            <p><strong>Receita Total:</strong> {rideData.pricePerSeat * rideData.availableSeats} MT (lotação completa)</p>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex gap-3 pt-4">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="flex-1"
            data-testid="button-cancel-create"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={createRideMutation.isPending || 
              !rideData.fromLocation || 
              !rideData.toLocation || 
              !rideData.departureDate || 
              !rideData.departureTime ||
              !rideData.vehicleId || // ✅ AGORA VALIDA vehicleId
              vehicles.length === 0}
            className="flex-1"
            data-testid="button-submit-create"
          >
            {createRideMutation.isPending ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                Criando...
              </>
            ) : (
              <>
                <Car className="w-4 h-4 mr-2" />
                Publicar Viagem
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}