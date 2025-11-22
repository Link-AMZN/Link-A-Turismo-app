import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/shared/hooks/use-toast';
import { Calendar, MapPin, Users, DollarSign, Car } from 'lucide-react';
import { RideCreateParams } from '@/shared/hooks/useModalState';
import { useAuth } from '@/shared/hooks/useAuth';

interface RideCreateModalProps {
  initialParams: RideCreateParams;
  onClose: () => void;
}

export default function RideCreateModal({ initialParams, onClose }: RideCreateModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // ✅ CORREÇÃO: Estado com nomes padronizados
  const [rideData, setRideData] = useState({
    fromLocation: initialParams.from || '',
    toLocation: initialParams.to || '',
    departureDate: initialParams.date || '', // ✅ CORREÇÃO: date → departureDate
    departureTime: '08:00', // ✅ CORREÇÃO: time → departureTime
    availableSeats: initialParams.seats || 4, // ✅ CORREÇÃO: seats → availableSeats
    pricePerSeat: initialParams.price || 100, // ✅ CORREÇÃO: price → pricePerSeat
    additionalInfo: '', // ✅ CORREÇÃO: description → additionalInfo
    vehicleType: 'sedan',
  });

  const createRideMutation = useMutation({
    mutationFn: async (data: typeof rideData) => {
      if (!user?.id) {
        throw new Error('Usuário não autenticado');
      }

      // ✅ CORREÇÃO: Validar data e hora
      const departureDateTime = new Date(`${data.departureDate}T${data.departureTime}`);
      if (isNaN(departureDateTime.getTime())) {
        throw new Error('Data ou hora inválida');
      }

      // ✅ CORREÇÃO: Payload padronizado e consistente
      const payload = {
        fromLocation: data.fromLocation,
        toLocation: data.toLocation,
        fromAddress: data.fromLocation,
        toAddress: data.toLocation,
        departureDate: departureDateTime.toISOString(), // ✅ CORREÇÃO: Enviar como ISO string
        departureTime: data.departureTime,
        pricePerSeat: Number(data.pricePerSeat), // ✅ CORREÇÃO: Já é number
        availableSeats: Number(data.availableSeats), // ✅ CORREÇÃO: Já é number
        maxPassengers: Number(data.availableSeats),
        vehicleType: data.vehicleType,
        additionalInfo: data.additionalInfo || null,
        description: data.additionalInfo || null, // ✅ CORREÇÃO: Usar additionalInfo
        driverId: user.id,
        allowNegotiation: true,
        isRecurring: false,
      };

      console.log('📤 Criando viagem:', payload);

      // ✅ CORREÇÃO: Atualizar rota da API
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
              {/* ✅ CORREÇÃO: Usar componente Select customizado */}
              <Select
                value={rideData.vehicleType}
                onValueChange={(value) => handleInputChange('vehicleType', value)}
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
              !rideData.vehicleType}
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