import { useState } from "react";
import { useAuth } from "@/shared/hooks/useAuth";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import LocationAutocomplete, { LocationOption } from "@/shared/components/LocationAutocomplete";
import { useToast } from "@/shared/hooks/use-toast";
import {
  MapPin,
  Calendar,
  Clock,
  Users,
  DollarSign,
  Car,
  Plus,
} from "lucide-react";

// ✅ CORREÇÃO: Importar auth para obter token REAL
import { auth } from "../../../shared/lib/firebaseConfig";

// ✅ CORREÇÃO: Definir tipo completo do estado do formulário
type FormState = {
  fromLocation: string | LocationOption;
  toLocation: string | LocationOption;
  date: string;
  time: string;
  departureDate: string;
  pricePerSeat: number;
  availableSeats: number;
  vehicleType: string;
  description: string;
  pickupPoint: string;
  dropoffPoint: string;
  vehiclePhoto: File | null;
};

// ✅ CORREÇÃO 4: Helper para limpar payload de campos undefined
const cleanPayload = (payload: any): any => {
  return Object.fromEntries(
    Object.entries(payload).filter(([_, v]) => v !== undefined && v !== null && v !== "")
  );
};

// ✅ CORREÇÃO 2: Helper para garantir URL da API correta
const getApiBaseUrl = (): string => {
  const baseUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || 'http://localhost:8000';
  return baseUrl;
};

export default function RoutePublisher() {
  // ✅ CORREÇÃO: Obter tanto user quanto token do useAuth
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // ✅ CORREÇÃO: Estado tipado com FormState - usando strings vazias em vez de null
  const [formData, setFormData] = useState<FormState>({
    fromLocation: "",
    toLocation: "",
    date: "",
    time: "",
    departureDate: "",
    pricePerSeat: 0,
    availableSeats: 4,
    vehicleType: "sedan",
    description: "",
    pickupPoint: "",
    dropoffPoint: "",
    vehiclePhoto: null,
  });
  
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // ✅ CORREÇÃO: Handle input change completamente tipado
  const handleInputChange = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({
        ...prev,
        vehiclePhoto: file,
      }));
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // ✅ CORREÇÃO: Função auxiliar para obter o label de uma localização
  const getLocationLabel = (location: string | LocationOption): string => {
    return typeof location === "string" ? location : location.label;
  };

  // ✅ CORREÇÃO: Função auxiliar para verificar se é um LocationOption
  const isLocationOption = (location: string | LocationOption): location is LocationOption => {
    return typeof location !== "string" && location !== null && location.label !== undefined;
  };

  // ✅✅✅ CORREÇÃO CRÍTICA: Função para obter token REAL do Firebase
  const getRealToken = async (): Promise<string> => {
    try {
      console.log("🔄 Obtendo token REAL do Firebase...");
      
      // ✅ CORREÇÃO: Obter usuário atual do auth
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("Nenhum usuário autenticado no Firebase");
      }

      console.log("👤 Usuário Firebase encontrado:", {
        uid: currentUser.uid,
        email: currentUser.email
      });

      // ✅ CORREÇÃO: Obter token fresco (forceRefresh: true para garantir token válido)
      const token = await currentUser.getIdToken(/* forceRefresh */ true);
      
      console.log("✅ Token REAL obtido:", {
        length: token.length,
        preview: token.substring(0, 20) + '...',
        isJWT: token.length > 100, // JWT válido tem > 100 caracteres
        hasThreeParts: token.split('.').length === 3 // JWT tem 3 partes
      });

      // ✅ CORREÇÃO: Validar se é um JWT real
      if (token.length < 100) {
        throw new Error("Token muito curto - não parece ser um JWT válido");
      }

      if (token.includes('SEU_TOKEN') || token.includes('YOUR_TOKEN') || token.includes(' ')) {
        throw new Error("Token contém placeholder ou espaços - token inválido");
      }

      return token;

    } catch (tokenError) {
      console.error("❌ Erro ao obter token REAL:", tokenError);
      throw new Error(`Falha ao obter token de autenticação: ${tokenError instanceof Error ? tokenError.message : 'Erro desconhecido'}`);
    }
  };

  const handlePublish = async () => {
    if (!user) {
      setError("Deve estar autenticado para publicar uma rota.");
      return;
    }

    // ✅ CORREÇÃO: Validação atualizada para strings/objetos
    if (!formData.fromLocation || !formData.toLocation) {
      setError("Por favor preencha origem e destino.");
      return;
    }

    // ✅ CORREÇÃO: Validar presença de coordenadas se for LocationOption
    if (isLocationOption(formData.fromLocation) && (!formData.fromLocation.lat || !formData.fromLocation.lng)) {
      setError("Origem inválida: coordenadas não definidas");
      return;
    }
    if (isLocationOption(formData.toLocation) && (!formData.toLocation.lat || !formData.toLocation.lng)) {
      setError("Destino inválido: coordenadas não definidas");
      return;
    }

    if (!formData.date || !formData.time) {
      setError("Por favor preencha data e hora da viagem.");
      return;
    }

    if (formData.pricePerSeat <= 0) {
      setError("Por favor defina um preço válido.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // ✅ CORREÇÃO: Extrair cidade, província e coordenadas corretamente
      const fromLabel = getLocationLabel(formData.fromLocation);
      const toLabel = getLocationLabel(formData.toLocation);

      // ✅ CORREÇÃO: Construir payload correto para o backend
      const rideData: any = {
        driverId: user.id,
        departureDate: formData.date,
        departureTime: formData.time,
        availableSeats: Number(formData.availableSeats),
        pricePerSeat: Number(formData.pricePerSeat),
        vehicleType: formData.vehicleType || "sedan",
        description: formData.description || "",
        status: "active",
      };

      // ✅ CORREÇÃO: Processar origem com todos os campos necessários
      if (isLocationOption(formData.fromLocation)) {
        rideData.fromCity = formData.fromLocation.city || fromLabel;
        rideData.fromProvince = formData.fromLocation.province || "";
        rideData.fromDistrict = formData.fromLocation.district || "";
        rideData.fromLocality = formData.fromLocation.locality || "";
        
        // ✅ CORREÇÃO: Enviar geometria como GeoJSON, não WKT
        if (formData.fromLocation.lat && formData.fromLocation.lng) {
          rideData.from_geom = {
            type: "Point",
            coordinates: [formData.fromLocation.lng, formData.fromLocation.lat] // ✅ CORREÇÃO: [lng, lat]
          };
          rideData.fromLat = formData.fromLocation.lat;
          rideData.fromLng = formData.fromLocation.lng;
        }
      } else {
        // Se for string, usar valores padrão
        rideData.fromCity = fromLabel;
        rideData.fromProvince = "";
        rideData.fromDistrict = "";
        rideData.fromLocality = fromLabel;
      }

      // ✅ CORREÇÃO: Processar destino com todos os campos necessários
      if (isLocationOption(formData.toLocation)) {
        rideData.toCity = formData.toLocation.city || toLabel;
        rideData.toProvince = formData.toLocation.province || "";
        rideData.toDistrict = formData.toLocation.district || "";
        rideData.toLocality = formData.toLocation.locality || "";
        
        // ✅ CORREÇÃO: Enviar geometria como GeoJSON, não WKT
        if (formData.toLocation.lat && formData.toLocation.lng) {
          rideData.to_geom = {
            type: "Point",
            coordinates: [formData.toLocation.lng, formData.toLocation.lat] // ✅ CORREÇÃO: [lng, lat]
          };
          rideData.toLat = formData.toLocation.lat;
          rideData.toLng = formData.toLocation.lng;
        }
      } else {
        // Se for string, usar valores padrão
        rideData.toCity = toLabel;
        rideData.toProvince = "";
        rideData.toDistrict = "";
        rideData.toLocality = toLabel;
      }

      // ✅ CORREÇÃO: Adicionar pontos de encontro se preenchidos
      if (formData.pickupPoint) {
        rideData.pickupPoint = formData.pickupPoint;
      }
      if (formData.dropoffPoint) {
        rideData.dropoffPoint = formData.dropoffPoint;
      }

      console.log("📝 Publicando viagem:", rideData);
      console.log("* Tentando criar viagem...");

      // ✅ CORREÇÃO 4: Limpar payload antes de enviar
      const cleanRideData = cleanPayload(rideData);
      console.log("🧹 Payload limpo:", cleanRideData);

      // ✅ CORREÇÃO 2: Garantir URL da API correta
      const API_BASE_URL = getApiBaseUrl();
      const apiUrl = `${API_BASE_URL}/api/rides`;
      console.log("@ URL da API:", apiUrl);

      // ✅✅✅ CORREÇÃO CRÍTICA: Obter token REAL do Firebase
      const freshToken = await getRealToken();

      // ✅ CORREÇÃO: Usar Headers moderno com token atual
      const headers = new Headers({
        "Content-Type": "application/json",
        "Authorization": `Bearer ${freshToken}`
      });

      console.log("🔧 Headers finais:", Object.fromEntries(headers.entries()));

      // ✅ CORREÇÃO: Testar autenticação primeiro (opcional - para debug)
      if (process.env.NODE_ENV === 'development') {
        try {
          const testResponse = await fetch(`${API_BASE_URL}/api/debug/firebase-auth`, {
            method: 'GET',
            headers: {
              "Authorization": `Bearer ${freshToken}`,
              "Content-Type": "application/json"
            }
          });
          
          const testResult = await testResponse.json();
          console.log("🧪 Teste de autenticação:", testResult);
          
          if (!testResult.success) {
            throw new Error(`Teste de autenticação falhou: ${testResult.error}`);
          }
        } catch (testError) {
          console.warn("⚠️ Teste de autenticação falhou, continuando...", testError);
        }
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(cleanRideData)
      });
      
      console.log("📡 Resposta da API:", {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        let errorText = `Erro ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          console.error("❌ Dados do erro:", errorData);
          if (errorData.error) {
            errorText = errorData.error;
          } else if (errorData.message) {
            errorText = errorData.message;
          }
        } catch (parseError) {
          console.error("❌ Não foi possível parsear resposta de erro:", parseError);
        }
        console.error("❌ Erro da API:", errorText);
        throw new Error(errorText);
      }
      
      const result = await response.json();
      console.log("✅ Viagem publicada com sucesso!", result);

      setSuccess(true);
      
      toast({
        title: "🎉 Viagem Publicada!",
        description: `Rota ${fromLabel} → ${toLabel} está disponível!`,
      });

      // ✅ CORREÇÃO: Reset form com strings vazias em vez de null
      setFormData({
        fromLocation: "",
        toLocation: "",
        date: "",
        time: "",
        departureDate: "",
        pricePerSeat: 0,
        availableSeats: 4,
        vehicleType: "sedan",
        description: "",
        pickupPoint: "",
        dropoffPoint: "",
        vehiclePhoto: null,
      });
      setPhotoPreview(null);
      
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Erro ao publicar a rota. Tente novamente.";
      console.error("❌ Erro ao publicar rota:", error);
      setError(errorMessage);
      
      toast({
        title: "❌ Erro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Publicar Nova Rota
          </h1>
          <p className="text-gray-600">
            Ofereça lugares na sua viagem e ganhe dinheiro
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-4">
            ❌ {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg mb-4">
            ✅ Viagem publicada com sucesso! Já está disponível para reservas.
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Detalhes da Viagem
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Origem e Destino com AutoComplete */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="from" className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-orange-600" />
                  Saindo de
                </Label>
                <LocationAutocomplete
                  id="from-location"
                  placeholder="Saindo de... (qualquer local em Moçambique)"
                  value={formData.fromLocation}
                  onChange={(location) => handleInputChange("fromLocation", location)}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="to" className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  Indo para
                </Label>
                <LocationAutocomplete
                  id="to-location"
                  placeholder="Indo para... (qualquer local em Moçambique)"
                  value={formData.toLocation}
                  onChange={(location) => handleInputChange("toLocation", location)}
                  className="w-full"
                />
              </div>
            </div>

            {/* Data e Hora */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-green-600" />
                  Data da Viagem
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange("date", e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  data-testid="input-date"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="time" className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-600" />
                  Hora de Partida
                </Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.time}
                  onChange={(e) => handleInputChange("time", e.target.value)}
                  data-testid="input-time"
                />
              </div>
            </div>

            {/* Lugares e Preço */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="seats" className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-600" />
                  Lugares Disponíveis
                </Label>
                <Select
                  value={formData.availableSeats.toString()}
                  onValueChange={(value) =>
                    handleInputChange("availableSeats", parseInt(value))
                  }
                >
                  <SelectTrigger data-testid="select-seats">
                    <SelectValue placeholder="Quantos lugares" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 lugar</SelectItem>
                    <SelectItem value="2">2 lugares</SelectItem>
                    <SelectItem value="3">3 lugares</SelectItem>
                    <SelectItem value="4">4 lugares</SelectItem>
                    <SelectItem value="5">5 lugares</SelectItem>
                    <SelectItem value="6">6+ lugares</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pricePerSeat" className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  Preço por Pessoa (MZN)
                </Label>
                <Input
                  id="pricePerSeat"
                  type="number"
                  placeholder="ex: 1500"
                  value={formData.pricePerSeat}
                  onChange={(e) => handleInputChange("pricePerSeat", Number(e.target.value))}
                  data-testid="input-price"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vehicle" className="flex items-center gap-2">
                  <Car className="w-4 h-4 text-red-600" />
                  Tipo de Veículo
                </Label>
                <Select
                  value={formData.vehicleType}
                  onValueChange={(value) =>
                    handleInputChange("vehicleType", value)
                  }
                >
                  <SelectTrigger data-testid="select-vehicle">
                    <SelectValue placeholder="Seu veículo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sedan">Sedan</SelectItem>
                    <SelectItem value="suv">SUV</SelectItem>
                    <SelectItem value="hatchback">Hatchback</SelectItem>
                    <SelectItem value="pickup">Pick-up</SelectItem>
                    <SelectItem value="van">Van/Minibus</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Pontos de Encontro */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pickup" className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-orange-600" />
                  Ponto de Encontro (Origem)
                </Label>
                <Input
                  id="pickup"
                  placeholder="Ex: Shopping Maputo Sul, entrada principal"
                  value={formData.pickupPoint}
                  onChange={(e) =>
                    handleInputChange("pickupPoint", e.target.value)
                  }
                  data-testid="input-pickup"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dropoff" className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  Ponto de Chegada (Destino)
                </Label>
                <Input
                  id="dropoff"
                  placeholder="Ex: Terminal Rodoviário de Beira"
                  value={formData.dropoffPoint}
                  onChange={(e) =>
                    handleInputChange("dropoffPoint", e.target.value)
                  }
                  data-testid="input-dropoff"
                />
              </div>
            </div>

            {/* Foto do Veículo */}
            <div className="space-y-4">
              <Label className="flex items-center gap-2">
                <Car className="w-4 h-4 text-blue-600" />
                Foto do Veículo
              </Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                {photoPreview ? (
                  <div className="space-y-4">
                    <div className="relative">
                      <img 
                        src={photoPreview} 
                        alt="Preview do veículo" 
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => {
                          setPhotoPreview(null);
                          setFormData(prev => ({ ...prev, vehiclePhoto: null }));
                        }}
                        data-testid="button-remove-photo"
                      >
                        Remover
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <Car className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="mt-4">
                      <Label htmlFor="vehicle-photo" className="cursor-pointer">
                        <span className="mt-2 block text-sm font-medium text-gray-900">
                          Clique para adicionar uma foto do seu veículo
                        </span>
                        <span className="mt-1 block text-xs text-gray-500">
                          PNG, JPG até 5MB
                        </span>
                      </Label>
                      <Input
                        id="vehicle-photo"
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        className="hidden"
                        data-testid="input-vehicle-photo"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Observações */}
            <div className="space-y-2">
              <Label htmlFor="description">
                Observações Adicionais (Opcional)
              </Label>
              <Textarea
                id="description"
                placeholder="Ex: Aceito bagagem extra por 100 MZN, não fumadores, etc."
                value={formData.description}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                rows={3}
                data-testid="textarea-description"
              />
            </div>

            {/* Botões */}
            <div className="flex gap-4 pt-4">
              <Button
                onClick={handlePublish}
                className="flex-1"
                size="lg"
                disabled={
                  !formData.fromLocation || 
                  !formData.toLocation ||   
                  !formData.date ||
                  !formData.time ||
                  !formData.pricePerSeat ||
                  isLoading
                }
                data-testid="button-publish"
              >
                {isLoading ? "A Publicar..." : "Publicar Rota"}
                {!isLoading && <Plus className="w-4 h-4 ml-2" />}
              </Button>

              <Button
                variant="outline"
                size="lg"
                onClick={() => window.history.back()}
                data-testid="button-cancel"
              >
                Cancelar
              </Button>
            </div>

            {/* Resumo da Viagem */}
            {formData.fromLocation && formData.toLocation && formData.date && formData.time && formData.pricePerSeat > 0 && (
              <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border border-green-200">
                <h3 className="font-semibold text-green-800 mb-3">📋 Resumo da sua Viagem</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p><strong className="text-green-700">Rota:</strong> {getLocationLabel(formData.fromLocation)} → {getLocationLabel(formData.toLocation)}</p>
                    <p><strong className="text-green-700">Data:</strong> {new Date(`${formData.date}T${formData.time}`).toLocaleDateString('pt-PT', { 
                      weekday: 'long', 
                      day: '2-digit', 
                      month: 'long', 
                      hour: '2-digit', 
                      minute: '2-digit'
                    })}</p>
                  </div>
                  <div>
                    <p><strong className="text-green-700">Lugares:</strong> {formData.availableSeats} disponíveis</p>
                    <p><strong className="text-green-700">Preço:</strong> {formData.pricePerSeat} MT por pessoa</p>
                    <p><strong className="text-blue-700">Receita máxima:</strong> {formData.pricePerSeat * formData.availableSeats} MT</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* ✅ CORREÇÃO: Dicas com lista HTML correta */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">
                💡 Dicas para uma boa oferta:
              </h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>
                  • Use locais específicos (ex: &quot;Shopping Maputo Sul&quot; em vez de &quot;Maputo&quot;)
                </li>
                <li>• Defina pontos de encontro conhecidos e de fácil acesso</li>
                <li>• Seja claro sobre regras (bagagem, fumar, etc.)</li>
                <li>• Defina preços justos e competitivos</li>
                <li>• Mantenha seu perfil e avaliações atualizadas</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}