import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Card } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { MapPin, Star, Search } from "lucide-react";

const staySearchSchema = z.object({
  location: z.string().min(1, "Local é obrigatório"),
  checkIn: z.string().min(1, "Data de entrada é obrigatória"),
  checkOut: z.string().min(1, "Data de saída é obrigatória"),
  guests: z.number().min(1, "Número de hóspedes é obrigatório").max(16, "Máximo 16 hóspedes"),
}).refine((data) => {
  const checkIn = new Date(data.checkIn);
  const checkOut = new Date(data.checkOut);
  return checkOut > checkIn;
}, {
  message: "Data de saída deve ser posterior à data de entrada",
  path: ["checkOut"],
});

type StaySearchForm = z.infer<typeof staySearchSchema>;

// ✅ URL da API
const API_BASE_URL = 'http://localhost:8000';

// ✅ Interface para os dados do hotel
interface Hotel {
  id: string;
  name: string;
  type: string;
  address: string;
  locality?: string;
  province?: string;
  rating?: number;
  description?: string;
  pricePerNight?: number;
  isAvailable: boolean;
}

export default function StaySearch() {
  const [selectedAccommodationType, setSelectedAccommodationType] = useState("todos");
  const [searchResults, setSearchResults] = useState<Hotel[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  
  const form = useForm<StaySearchForm>({
    resolver: zodResolver(staySearchSchema),
    defaultValues: {
      location: "",
      checkIn: new Date().toISOString().split('T')[0],
      checkOut: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      guests: 2,
    },
  });

  // ✅ FUNÇÃO DE BUSCA CORRIGIDA - busca real na API
  const handleSubmit = async (data: StaySearchForm) => {
    console.log('🎯 [HOMEPAGE] Iniciando busca por:', data.location);
    
    setIsSearching(true);
    setSearchError(null);
    setSearchResults([]);
    setHasSearched(true);

    try {
      const queryParams = new URLSearchParams();
      queryParams.append('address', data.location);
      queryParams.append('isAvailable', 'true');
      
      if (data.checkIn) queryParams.append('checkIn', data.checkIn);
      if (data.checkOut) queryParams.append('checkOut', data.checkOut);
      if (data.guests) queryParams.append('guests', data.guests.toString());

      const url = `${API_BASE_URL}/api/hotels?${queryParams.toString()}`;
      console.log('📡 [HOMEPAGE] Chamando API:', url);

      const response = await fetch(url);
      console.log('📊 [HOMEPAGE] Status:', response.status);

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ [HOMEPAGE] Resposta COMPLETA:', result);

      // ✅ EXTRAÇÃO CORRETA baseada no teste manual
      const hotels: Hotel[] = result.data?.hotels || [];
      console.log(`🏨 [RESULTADO] ${hotels.length} hotéis extraídos`);

      // ✅ DEBUG: Mostrar cada hotel no console
      hotels.forEach((hotel: Hotel, index: number) => {
        console.log(`🏨 ${index + 1}. ${hotel.name} | ${hotel.id}`);
      });

      setSearchResults(hotels);

    } catch (err) {
      console.error('❌ [HOMEPAGE] Erro:', err);
      setSearchError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsSearching(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-MZ', {
      style: 'currency',
      currency: 'MZN'
    }).format(price);
  };

  const renderStars = (rating: number = 4) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  return (
    <div>
      <h2 className="text-3xl font-bold text-dark mb-8 text-center">Encontre sua próxima hospedagem</h2>
      
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <form onSubmit={form.handleSubmit(handleSubmit)} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="lg:col-span-2">
            <Label htmlFor="location" className="block text-sm font-medium text-gray-medium mb-2">
              Onde
            </Label>
            <Input
              id="location"
              placeholder="Digite Tofo, Maputo, Costa do Sol..."
              value={form.watch("location")}
              onChange={(e) => form.setValue("location", e.target.value)}
              className="w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              data-testid="input-search-location"
            />
            {form.formState.errors.location && (
              <p className="text-sm text-destructive mt-1">{form.formState.errors.location.message}</p>
            )}
          </div>
          
          <div className="md:col-span-1">
            <Label htmlFor="checkIn" className="block text-sm font-medium text-gray-medium mb-2">
              Entrada
            </Label>
            <Input
              id="checkIn"
              type="date"
              data-testid="input-checkin-date"
              value={form.watch("checkIn")}
              onChange={(e) => form.setValue("checkIn", e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            {form.formState.errors.checkIn && (
              <p className="text-sm text-destructive mt-1">{form.formState.errors.checkIn.message}</p>
            )}
          </div>
          
          <div className="md:col-span-1">
            <Label htmlFor="checkOut" className="block text-sm font-medium text-gray-medium mb-2">
              Saída
            </Label>
            <Input
              id="checkOut"
              type="date"
              data-testid="input-checkout-date"
              value={form.watch("checkOut")}
              onChange={(e) => form.setValue("checkOut", e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            {form.formState.errors.checkOut && (
              <p className="text-sm text-destructive mt-1">{form.formState.errors.checkOut.message}</p>
            )}
          </div>
          
          <div className="md:col-span-1">
            <Label htmlFor="guests" className="block text-sm font-medium text-gray-medium mb-2">
              Hóspedes
            </Label>
            <Select
              value={String(form.watch("guests"))}
              onValueChange={(value) => form.setValue("guests", parseInt(value))}
            >
              <SelectTrigger data-testid="select-guests">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6].map((num) => (
                  <SelectItem key={num} value={String(num)}>
                    {num} {num === 1 ? 'hóspede' : 'hóspedes'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.guests && (
              <p className="text-sm text-destructive mt-1">{form.formState.errors.guests.message}</p>
            )}
          </div>
          
          <div className="md:col-span-1 flex items-end">
            <Button
              type="submit"
              data-testid="button-search-stays"
              className="w-full bg-primary text-primary-foreground py-3 px-6 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
              disabled={isSearching}
            >
              <Search className="w-4 h-4 mr-2" />
              {isSearching ? 'Buscando...' : 'Pesquisar'}
            </Button>
          </div>
        </form>

        {/* ✅ FEEDBACK VISUAL DA BUSCA */}
        {isSearching && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
            <div className="flex items-center justify-center gap-3">
              <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
              <p className="text-blue-700 font-medium">
                Buscando acomodações para "{form.watch("location")}"...
              </p>
            </div>
          </div>
        )}

        {searchError && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-center">
            <p className="text-red-700 font-medium">
              ❌ Erro na busca: {searchError}
            </p>
          </div>
        )}

        {/* ✅ RESULTADOS DA BUSCA */}
        {hasSearched && !isSearching && (
          <div className="mt-8">
            {searchResults.length > 0 ? (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold text-dark">
                    {searchResults.length} Acomodações Encontradas
                  </h3>
                  <Badge variant="secondary" className="text-green-600 bg-green-100 text-lg">
                    {searchResults.length} resultado{searchResults.length !== 1 ? 's' : ''}
                  </Badge>
                </div>

                <div className="space-y-6">
                  {searchResults.map((accommodation) => (
                    <Card key={accommodation.id} className="p-6 hover:shadow-lg transition-shadow border-2 border-green-200">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2">
                          <h4 className="text-xl font-semibold text-green-700 mb-2">
                            {accommodation.name}
                          </h4>
                          <div className="flex items-center gap-2 mb-3">
                            <Badge variant="outline">{accommodation.type}</Badge>
                            <div className="flex items-center gap-1 text-gray-600">
                              <MapPin className="w-4 h-4" />
                              <span className="text-sm">
                                {accommodation.address}
                                {accommodation.locality && `, ${accommodation.locality}`}
                                {accommodation.province && `, ${accommodation.province}`}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 mb-3">
                            {renderStars(accommodation.rating)}
                            <span className="text-sm text-gray-600 ml-1">
                              ({accommodation.rating || 4.0})
                            </span>
                          </div>
                          {accommodation.description && (
                            <p className="text-gray-600 text-sm">
                              {accommodation.description}
                            </p>
                          )}
                        </div>
                        
                        <div className="text-center space-y-4">
                          <div>
                            <div className="text-sm text-gray-500 mb-1">Disponibilidade</div>
                            {accommodation.isAvailable ? (
                              <Badge className="bg-green-100 text-green-700 text-base py-1 px-3">Disponível</Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-700 text-base py-1 px-3">Indisponível</Badge>
                            )}
                          </div>
                          <div className="text-2xl font-bold text-blue-600">
                            {accommodation.pricePerNight ? formatPrice(accommodation.pricePerNight) : 'Sob consulta'}
                          </div>
                          <div className="text-sm text-gray-500">por noite</div>
                          <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                            Ver Detalhes
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              !searchError && (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">🏨</div>
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">
                    Nenhuma acomodação encontrada
                  </h3>
                  <p className="text-gray-500">
                    Tente buscar por: <strong>Tofo</strong>, <strong>Maputo</strong>, <strong>Costa do Sol</strong>
                  </p>
                </div>
              )
            )}
          </div>
        )}

        {/* Accommodation Categories */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-dark mb-4 text-center">Tipo de Hospedagem</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div 
              onClick={() => setSelectedAccommodationType("todos")}
              className={`cursor-pointer rounded-xl p-6 transition-all duration-200 ${
                selectedAccommodationType === "todos" 
                  ? "bg-primary text-white shadow-lg transform scale-105" 
                  : "bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-primary/30"
              }`}
              data-testid="accommodation-todos"
            >
              <div className="text-center">
                <div className={`text-3xl mb-3 ${
                  selectedAccommodationType === "todos" ? "text-white" : "text-primary"
                }`}>📋</div>
                <h4 className={`font-semibold text-lg ${
                  selectedAccommodationType === "todos" ? "text-white" : "text-dark"
                }`}>Todos</h4>
                <p className={`text-sm mt-2 ${
                  selectedAccommodationType === "todos" ? "text-white/80" : "text-gray-medium"
                }`}>Todas as opções</p>
              </div>
            </div>

            <div 
              onClick={() => setSelectedAccommodationType("hoteis")}
              className={`cursor-pointer rounded-xl p-6 transition-all duration-200 ${
                selectedAccommodationType === "hoteis" 
                  ? "bg-primary text-white shadow-lg transform scale-105" 
                  : "bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-primary/30"
              }`}
              data-testid="accommodation-hoteis"
            >
              <div className="text-center">
                <div className={`text-3xl mb-3 ${
                  selectedAccommodationType === "hoteis" ? "text-white" : "text-primary"
                }`}>🏨</div>
                <h4 className={`font-semibold text-lg ${
                  selectedAccommodationType === "hoteis" ? "text-white" : "text-dark"
                }`}>Hotéis</h4>
                <p className={`text-sm mt-2 ${
                  selectedAccommodationType === "hoteis" ? "text-white/80" : "text-gray-medium"
                }`}>Hotéis e resorts</p>
              </div>
            </div>

            <div 
              onClick={() => setSelectedAccommodationType("particulares")}
              className={`cursor-pointer rounded-xl p-6 transition-all duration-200 ${
                selectedAccommodationType === "particulares" 
                  ? "bg-primary text-white shadow-lg transform scale-105" 
                  : "bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-primary/30"
              }`}
              data-testid="accommodation-particulares"
            >
              <div className="text-center">
                <div className={`text-3xl mb-3 ${
                  selectedAccommodationType === "particulares" ? "text-white" : "text-primary"
                }`}>🏠</div>
                <h4 className={`font-semibold text-lg ${
                  selectedAccommodationType === "particulares" ? "text-white" : "text-dark"
                }`}>Acomodações Particulares</h4>
                <p className={`text-sm mt-2 ${
                  selectedAccommodationType === "particulares" ? "text-white/80" : "text-gray-medium"
                }`}>Casas e apartamentos</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}