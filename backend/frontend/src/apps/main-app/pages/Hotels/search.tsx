import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { ArrowLeft, Search, Star, MapPin } from "lucide-react";
import PageHeader from "@/shared/components/PageHeader";
import MobileNavigation from "@/shared/components/MobileNavigation";

// ✅ URL absoluta da API
const API_BASE_URL = 'http://localhost:8000';

export default function HotelSearchPage() {
  const [, setLocation] = useLocation();
  const [searchParams, setSearchParams] = useState({
    location: "",
    checkIn: "",
    checkOut: "",
    guests: 2,
  });
  const [hasSearched, setHasSearched] = useState(false);
  const [accommodations, setAccommodations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ FUNÇÃO SIMPLIFICADA - sem React Query
  const handleSearch = async () => {
    if (!searchParams.location.trim()) {
      alert('Por favor, informe uma localização para buscar');
      return;
    }

    console.log('🎯 [FRONTEND] Iniciando busca por:', searchParams.location);
    
    setIsLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const queryParams = new URLSearchParams();
      queryParams.append('address', searchParams.location);
      queryParams.append('isAvailable', 'true');
      
      if (searchParams.checkIn) queryParams.append('checkIn', searchParams.checkIn);
      if (searchParams.checkOut) queryParams.append('checkOut', searchParams.checkOut);
      if (searchParams.guests) queryParams.append('guests', searchParams.guests.toString());

      const url = `${API_BASE_URL}/api/hotels?${queryParams.toString()}`;
      console.log('📡 [FRONTEND] Chamando API:', url);

      const response = await fetch(url);
      console.log('📊 [FRONTEND] Status:', response.status);

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ [FRONTEND] Resposta da API:', data);

      // ✅ Extrair hotéis da resposta
      const hotels = data.data?.hotels || data.hotels || [];
      setAccommodations(hotels);
      
      console.log(`🏨 [FRONTEND] ${hotels.length} hotéis encontrados`);

    } catch (err) {
      console.error('❌ [FRONTEND] Erro:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBookAccommodation = (accommodation: any) => {
    console.log('Reservar acomodação:', accommodation);
    setLocation(`/hotels/${accommodation.id}/book`);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-MZ', {
      style: 'currency',
      currency: 'MZN'
    }).format(price);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  // ✅ Teste manual SUPER SIMPLES
  const testManualSearch = async () => {
    console.log('🧪 [FRONTEND] Teste manual...');
    try {
      const response = await fetch(`${API_BASE_URL}/api/hotels?address=Tofo&isAvailable=true`);
      const data = await response.json();
      const hotelCount = data.data?.hotels?.length || data.hotels?.length || 0;
      console.log('🎯 Teste manual - Hotéis encontrados:', hotelCount);
      alert(`✅ Teste manual: ${hotelCount} hotéis encontrados!`);
    } catch (err) {
      console.error('❌ Teste manual - Erro:', err);
      alert('❌ Erro no teste manual');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PageHeader title="Buscar Acomodações" />
      
      <div className="container mx-auto px-4 max-w-7xl py-6">
        {/* Botão voltar */}
        <Button 
          variant="ghost" 
          onClick={() => setLocation('/')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar ao Início
        </Button>

        {/* Botões de teste */}
        <div className="mb-4 flex gap-2">
          <Button 
            variant="outline" 
            onClick={testManualSearch}
            size="sm"
          >
            🧪 Testar API
          </Button>
          <div className="text-xs text-gray-500 flex items-center">
            API: {API_BASE_URL}
          </div>
        </div>

        {/* Formulário de busca */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Buscar Acomodações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Localização</label>
                <Input
                  placeholder="Digite Tofo, Maputo, Costa do Sol..."
                  value={searchParams.location}
                  onChange={(e) => setSearchParams({...searchParams, location: e.target.value})}
                />
                <p className="text-xs text-gray-500 mt-1">
                  💡 Exemplos: Tofo, Maputo, Costa do Sol
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Check-in</label>
                <Input
                  type="date"
                  value={searchParams.checkIn}
                  onChange={(e) => setSearchParams({...searchParams, checkIn: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Check-out</label>
                <Input
                  type="date"
                  value={searchParams.checkOut}
                  onChange={(e) => setSearchParams({...searchParams, checkOut: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Hóspedes</label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={searchParams.guests}
                  onChange={(e) => setSearchParams({...searchParams, guests: parseInt(e.target.value) || 1})}
                />
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={handleSearch} 
                  className="w-full" 
                  disabled={!searchParams.location.trim() || isLoading}
                >
                  <Search className="w-4 h-4 mr-2" />
                  {isLoading ? 'Buscando...' : 'Buscar'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Debug info */}
        {hasSearched && (
          <Card className="mb-6 border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div><strong>🔍 Buscando:</strong> {searchParams.location}</div>
                <div>
                  <strong>Status:</strong> 
                  <span className={isLoading ? 'text-orange-600' : 'text-green-600'}>
                    {isLoading ? ' 🔄 Buscando...' : ' ✅ Completo'}
                  </span>
                </div>
                <div>
                  <strong>Hotéis:</strong> 
                  <span className={accommodations.length > 0 ? 'text-green-600 font-bold' : 'text-gray-600'}>
                    {accommodations.length}
                  </span>
                </div>
                <div>
                  <strong>Erro:</strong> 
                  <span className={error ? 'text-red-600' : 'text-green-600'}>
                    {error ? ' ❌ Sim' : ' ✅ Não'}
                  </span>
                </div>
              </div>
              
              {error && (
                <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded">
                  <strong className="text-red-700">❌ Erro:</strong>
                  <div className="text-red-600 mt-1">{error}</div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Resultados */}
        {hasSearched && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">
                {isLoading ? 'Buscando...' : `Acomodações Disponíveis (${accommodations.length})`}
              </h2>
              {accommodations.length > 0 && (
                <Badge variant="secondary">
                  {accommodations.length} encontrada{accommodations.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>

            {isLoading && (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
                <span className="ml-3 text-gray-600">Buscando para "{searchParams.location}"...</span>
              </div>
            )}

            {error && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="pt-6">
                  <p className="text-red-600 font-semibold">❌ Erro na busca</p>
                  <p className="text-red-600 text-sm mt-1">{error}</p>
                  <Button 
                    onClick={handleSearch} 
                    variant="outline" 
                    size="sm" 
                    className="mt-3"
                  >
                    Tentar Novamente
                  </Button>
                </CardContent>
              </Card>
            )}

            {!isLoading && !error && accommodations.length === 0 && (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardContent className="pt-6 text-center">
                  <p className="text-yellow-800 font-semibold">🏨 Nenhuma acomodação encontrada</p>
                  <p className="text-yellow-600 text-sm mt-2">
                    Para "{searchParams.location}"
                  </p>
                </CardContent>
              </Card>
            )}

            {!isLoading && accommodations.length > 0 && (
              <div className="space-y-4">
                {accommodations.map((accommodation: any) => (
                  <Card key={accommodation.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
                        {/* Informações */}
                        <div className="md:col-span-2">
                          <div className="mb-3">
                            <h3 className="text-xl font-semibold mb-1">{accommodation.name}</h3>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline">{accommodation.type}</Badge>
                              <div className="flex items-center gap-1">
                                <MapPin className="w-4 h-4 text-gray-500" />
                                <span className="text-sm text-gray-600">
                                  {accommodation.address} 
                                  {accommodation.locality && `, ${accommodation.locality}`}
                                  {accommodation.province && `, ${accommodation.province}`}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 mb-3">
                              {renderStars(accommodation.rating || 4)}
                              <span className="text-sm text-gray-600 ml-1">({accommodation.rating || 4.0})</span>
                            </div>
                          </div>
                          
                          {accommodation.description && (
                            <p className="text-gray-600 text-sm mb-3 line-clamp-2">{accommodation.description}</p>
                          )}
                        </div>

                        {/* Disponibilidade e Preço */}
                        <div className="text-center">
                          <div className="mb-2">
                            <div className="text-sm text-gray-500">Disponibilidade</div>
                            <div className="text-lg font-bold mb-2">
                              {accommodation.isAvailable ? (
                                <Badge className="bg-green-100 text-green-700">Disponível</Badge>
                              ) : (
                                <Badge className="bg-red-100 text-red-700">Indisponível</Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-2xl font-bold text-blue-600">
                            {accommodation.pricePerNight ? formatPrice(accommodation.pricePerNight) : 'Sob consulta'}
                          </div>
                          <div className="text-sm text-gray-500">por noite</div>
                        </div>

                        {/* Ação */}
                        <div className="text-center">
                          <Button 
                            onClick={() => handleBookAccommodation(accommodation)}
                            className="w-full bg-blue-600 hover:bg-blue-700"
                            disabled={!accommodation.isAvailable}
                          >
                            {accommodation.isAvailable ? 'Reservar' : 'Indisponível'}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {!hasSearched && (
          <Card className="text-center py-12">
            <CardContent>
              <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Encontre a acomodação perfeita</h3>
              <p className="text-gray-500">Digite uma localização e clique em Buscar para começar</p>
            </CardContent>
          </Card>
        )}
      </div>

      <MobileNavigation />
    </div>
  );
}