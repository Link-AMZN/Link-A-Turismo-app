import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { CalendarDays, MapPin, Users, DollarSign, Car as CarIcon, Clock } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

interface RideOfferFormProps {
  onSubmit?: (rideData: any) => void;
  onCancel?: () => void;
}

export default function RideOfferForm({ onSubmit, onCancel }: RideOfferFormProps) {
  const { user } = useAuth();
  
  // ✅ CORREÇÃO: Estado com campos consistentes e tipos corretos
  const [formData, setFormData] = useState({
    fromLocation: "",
    toLocation: "",
    departureDate: "",
    departureTime: "",
    availableSeats: 1,
    pricePerSeat: 0, // ✅ CORREÇÃO: number em vez de string
    vehicleType: "",
    additionalInfo: "",
    allowSmoking: false,
    allowPets: false,
    allowMusic: true
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // ✅ CORREÇÃO: Função para atualizar form data com validação
  const updateFormData = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  // ✅ CORREÇÃO: Validação do formulário
  const validateForm = () => {
    if (!formData.fromLocation || !formData.toLocation) {
      return "Preencha origem e destino";
    }
    
    if (!formData.departureDate || !formData.departureTime) {
      return "Preencha data e hora da viagem";
    }
    
    // ✅ CORREÇÃO: Validar data não no passado
    const departureDateTime = new Date(`${formData.departureDate}T${formData.departureTime}`);
    if (departureDateTime < new Date()) {
      return "A data e hora da viagem não podem ser no passado";
    }
    
    if (formData.pricePerSeat <= 0) {
      return "Preço deve ser maior que zero";
    }
    
    if (formData.availableSeats < 1 || formData.availableSeats > 8) {
      return "Número de lugares deve estar entre 1 e 8";
    }
    
    if (!formData.vehicleType) {
      return "Selecione o tipo de veículo";
    }
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // ✅ CORREÇÃO: Validar formulário antes de enviar
    const validationError = validateForm();
    if (validationError) {
      alert(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      // ✅ CORREÇÃO: Payload tipado e estruturado corretamente
      const payload = {
        fromLocation: formData.fromLocation,
        toLocation: formData.toLocation,
        departureDate: formData.departureDate,
        departureTime: formData.departureTime,
        availableSeats: formData.availableSeats,
        pricePerSeat: formData.pricePerSeat,
        vehicleType: formData.vehicleType,
        additionalInfo: formData.additionalInfo,
        driverId: user?.uid || '',
        driverName: user?.displayName || user?.email,
        allowSmoking: formData.allowSmoking,
        allowPets: formData.allowPets,
        allowMusic: formData.allowMusic,
        status: "available",
        createdAt: new Date().toISOString(),
        totalSeats: formData.availableSeats,
        bookedSeats: 0
      };

      console.log("📤 Nova oferta de boleia:", payload);
      
      // ✅ CORREÇÃO: Integração com API real usando rota correta
      const response = await fetch('/api/rides', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao criar oferta de boleia');
      }
      
      const result = await response.json();
      console.log("✅ Oferta criada com sucesso:", result);
      
      if (onSubmit) {
        onSubmit(result);
      }

      // ✅ CORREÇÃO: Reset form com campos consistentes
      setFormData({
        fromLocation: "",
        toLocation: "",
        departureDate: "",
        departureTime: "",
        availableSeats: 1,
        pricePerSeat: 0, // ✅ CORREÇÃO: number em vez de string
        vehicleType: "",
        additionalInfo: "",
        allowSmoking: false,
        allowPets: false,
        allowMusic: true
      });

    } catch (error) {
      console.error("❌ Erro ao criar oferta de boleia:", error);
      alert(error instanceof Error ? error.message : "Erro ao criar oferta de boleia");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <CarIcon className="w-5 h-5 mr-2 text-orange-600" />
          Oferecer Boleia
        </CardTitle>
        <p className="text-sm text-gray-600">Ganhe dinheiro compartilhando sua viagem</p>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Origem e Destino */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fromLocation" className="flex items-center">
                <MapPin className="w-4 h-4 mr-1" />
                De onde
              </Label>
              {/* ✅ CORREÇÃO: Campo fromLocation correto */}
              <Input
                id="fromLocation"
                placeholder="Cidade de origem"
                value={formData.fromLocation}
                onChange={(e) => updateFormData("fromLocation", e.target.value)}
                required
                data-testid="ride-offer-from"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="toLocation" className="flex items-center">
                <MapPin className="w-4 h-4 mr-1" />
                Para onde
              </Label>
              {/* ✅ CORREÇÃO: Campo toLocation correto */}
              <Input
                id="toLocation"
                placeholder="Cidade de destino"
                value={formData.toLocation}
                onChange={(e) => updateFormData("toLocation", e.target.value)}
                required
                data-testid="ride-offer-to"
              />
            </div>
          </div>

          {/* Data e Hora */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="departureDate" className="flex items-center">
                <CalendarDays className="w-4 h-4 mr-1" />
                Data da viagem
              </Label>
              {/* ✅ CORREÇÃO: Campo departureDate correto */}
              <Input
                id="departureDate"
                type="date"
                value={formData.departureDate}
                onChange={(e) => updateFormData("departureDate", e.target.value)}
                required
                min={new Date().toISOString().split('T')[0]}
                data-testid="ride-offer-date"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="departureTime" className="flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                Hora de partida
              </Label>
              {/* ✅ CORREÇÃO: Campo departureTime correto */}
              <Input
                id="departureTime"
                type="time"
                value={formData.departureTime}
                onChange={(e) => updateFormData("departureTime", e.target.value)}
                required
                data-testid="ride-offer-time"
              />
            </div>
          </div>

          {/* Lugares e Preço */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="availableSeats" className="flex items-center">
                <Users className="w-4 h-4 mr-1" />
                Lugares disponíveis
              </Label>
              <Select 
                value={formData.availableSeats.toString()}
                onValueChange={(value) => updateFormData("availableSeats", parseInt(value))}
              >
                <SelectTrigger data-testid="ride-offer-seats">
                  <SelectValue placeholder="Quantos lugares?" />
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
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="pricePerSeat" className="flex items-center">
                <DollarSign className="w-4 h-4 mr-1" />
                Preço por lugar (MT)
              </Label>
              {/* ✅ CORREÇÃO: Campo pricePerSeat como number */}
              <Input
                id="pricePerSeat"
                type="number"
                placeholder="ex: 500"
                value={formData.pricePerSeat}
                onChange={(e) => updateFormData("pricePerSeat", parseFloat(e.target.value) || 0)}
                required
                min="50"
                step="0.01"
                data-testid="ride-offer-price"
              />
            </div>
          </div>

          {/* Tipo de Veículo */}
          <div className="space-y-2">
            <Label htmlFor="vehicleType">Tipo de veículo</Label>
            <Select 
              value={formData.vehicleType}
              onValueChange={(value) => updateFormData("vehicleType", value)}
            >
              <SelectTrigger data-testid="ride-offer-vehicle">
                <SelectValue placeholder="Selecione o tipo do veículo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sedan">Sedan</SelectItem>
                <SelectItem value="suv">SUV</SelectItem>
                <SelectItem value="hatchback">Hatchback</SelectItem>
                <SelectItem value="pickup">Pickup</SelectItem>
                <SelectItem value="van">Van/Mini-bus</SelectItem>
                <SelectItem value="other">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="additionalInfo">Informações adicionais</Label>
            {/* ✅ CORREÇÃO: Campo additionalInfo correto */}
            <Textarea
              id="additionalInfo"
              placeholder="Pontos de parada, preferências, etc."
              value={formData.additionalInfo}
              onChange={(e) => updateFormData("additionalInfo", e.target.value)}
              rows={3}
              data-testid="ride-offer-description"
            />
          </div>

          {/* Preferências */}
          <div className="space-y-3">
            <Label>Preferências da viagem</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.allowSmoking}
                  onChange={(e) => updateFormData("allowSmoking", e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Permitir fumar</span>
              </label>
              
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.allowPets}
                  onChange={(e) => updateFormData("allowPets", e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Permitir animais</span>
              </label>
              
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.allowMusic}
                  onChange={(e) => updateFormData("allowMusic", e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Música permitida</span>
              </label>
            </div>
          </div>

          {/* Botões */}
          <div className="flex space-x-4 pt-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-orange-600 hover:bg-orange-700"
              data-testid="ride-offer-submit"
            >
              {isSubmitting ? "Publicando..." : "Publicar Oferta"}
            </Button>
            
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="flex-1"
                data-testid="ride-offer-cancel"
              >
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}