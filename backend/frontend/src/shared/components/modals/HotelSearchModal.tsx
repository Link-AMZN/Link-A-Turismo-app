import { useState, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/shared/hooks/use-toast';
import { Calendar, MapPin, Users, Search, Bed, Star, Map } from 'lucide-react';
import { HotelSearchParams } from '@/shared/hooks/useModalState';

interface HotelSearchModalProps {
  initialParams: HotelSearchParams;
  onClose: () => void;
}

// ✅ Interface para os dados do hotel compatível com a nova API
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
  images?: string[];
}

// ✅ Interface para a resposta da API
interface ApiResponse {
  success: boolean;
  data: {
    hotels: Hotel[];
    searchLocation: any;
    searchType: string;
    message: string;
  };
}

// ✅ URL da API
const API_BASE_URL = 'http://localhost:8000';

export default function HotelSearchModal({ initialParams, onClose }: HotelSearchModalProps) {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useState({
    location: initialParams.location || '',
    checkIn: initialParams.checkIn || '',
    checkOut: initialParams.checkOut || '',
    guests: initialParams.guests || 2,
  });

  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // ✅ CORREÇÃO CRÍTICA: Query atualizada para usar a nova API
  const { data: hotelsResponse, refetch, isLoading } = useQuery<ApiResponse>({
    queryKey: ['/api/hotels', searchParams],
    queryFn: async () => {
      if (!searchParams.location) {
        return { 
          success: false, 
          data: { 
            hotels: [], 
            searchLocation: null, 
            searchType: 'empty', 
            message: 'No location provided' 
          } 
        };
      }

      const queryParams = new URLSearchParams();
      queryParams.append('address', searchParams.location);
      queryParams.append('isAvailable', 'true');
      
      if (searchParams.checkIn) queryParams.append('checkIn', searchParams.checkIn);
      if (searchParams.checkOut) queryParams.append('checkOut', searchParams.checkOut);
      if (searchParams.guests) queryParams.append('guests', searchParams.guests.toString());

      const url = `${API_BASE_URL}/api/hotels?${queryParams.toString()}`;
      console.log('📡 [HotelSearchModal] Buscando hotéis:', url);

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ [HotelSearchModal] Resposta da API:', data);
      
      return data;
    },
    enabled: false, // Só executa quando chamado manualmente
  });
  
  // ✅ CORREÇÃO: Extrair hotéis da estrutura correta da resposta
  const hotels = hotelsResponse?.data?.hotels || [];

  // Se tem parâmetros iniciais, fazer busca automaticamente
  useEffect(() => {
    if (initialParams.location && initialParams.checkIn && initialParams.checkOut) {
      handleSearch();
    }
  }, []);

  const handleSearch = async () => {
    if (!searchParams.location || !searchParams.checkIn || !searchParams.checkOut) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha localização, check-in e check-out.",
        variant: "destructive",
      });
      return;
    }

    // Validar datas
    const checkInDate = new Date(searchParams.checkIn);
    const checkOutDate = new Date(searchParams.checkOut);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (checkInDate < today) {
      toast({
        title: "Data inválida",
        description: "A data de check-in não pode ser anterior a hoje.",
        variant: "destructive",
      });
      return;
    }

    if (checkOutDate <= checkInDate) {
      toast({
        title: "Data inválida",
        description: "A data de check-out deve ser posterior ao check-in.",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    
    try {
      await refetch();
      
      // ✅ FEEDBACK MELHORADO baseado nos resultados
      if (hotelsResponse?.success) {
        const hotelsCount = hotels.length;
        toast({
          title: hotelsCount > 0 ? "Busca realizada!" : "Nenhum resultado",
          description: hotelsCount > 0 
            ? `Encontramos ${hotelsCount} acomodações disponíveis.`
            : "Não encontramos acomodações para os critérios selecionados.",
          variant: hotelsCount > 0 ? "default" : "destructive",
        });
      } else {
        toast({
          title: "Erro na busca",
          description: "Não foi possível buscar as acomodações. Tente novamente.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('❌ Erro na busca:', error);
      toast({
        title: "Erro na busca",
        description: "Não foi possível conectar ao servidor. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setSearchParams(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const calculateNights = () => {
    if (searchParams.checkIn && searchParams.checkOut) {
      const checkIn = new Date(searchParams.checkIn);
      const checkOut = new Date(searchParams.checkOut);
      const diffTime = checkOut.getTime() - checkIn.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? diffDays : 0;
    }
    return 0;
  };

  const formatPrice = (price: number | undefined) => {
    if (!price) return 'Sob consulta';
    return new Intl.NumberFormat('pt-MZ', {
      style: 'currency',
      currency: 'MZN'
    }).format(price);
  };

  const renderStars = (rating: number = 4) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < Math.floor(rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  return (
    <div className="p-6">
      {/* ✅ DEBUG INFO */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div><strong>🔍 Buscando:</strong> {searchParams.location}</div>
          <div><strong>🏨 Encontrados:</strong> {hotels.length} hotéis</div>
          <div><strong>📅 Noites:</strong> {calculateNights()}</div>
          <div><strong>👥 Hóspedes:</strong> {searchParams.guests}</div>
        </div>
      </div>

      {/* Formulário de Busca */}
      <div className="space-y-6 mb-8">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="location" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Localização
            </Label>
            <Input
              id="location"
              value={searchParams.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              placeholder="Digite Tofo, Maputo, Costa do Sol..."
              data-testid="input-hotel-location"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="checkIn" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Check-in
              </Label>
              <Input
                id="checkIn"
                type="date"
                value={searchParams.checkIn}
                onChange={(e) => handleInputChange('checkIn', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                data-testid="input-hotel-checkin"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="checkOut" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Check-out
              </Label>
              <Input
                id="checkOut"
                type="date"
                value={searchParams.checkOut}
                onChange={(e) => handleInputChange('checkOut', e.target.value)}
                min={searchParams.checkIn || new Date().toISOString().split('T')[0]}
                data-testid="input-hotel-checkout"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="guests" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Hóspedes
            </Label>
            <Input
              id="guests"
              type="number"
              min="1"
              max="10"
              value={searchParams.guests}
              onChange={(e) => handleInputChange('guests', parseInt(e.target.value) || 1)}
              data-testid="input-hotel-guests"
            />
          </div>

          {/* Resumo da Busca */}
          {searchParams.checkIn && searchParams.checkOut && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
              <p className="text-sm">
                <strong>{calculateNights()}</strong> noite{calculateNights() !== 1 ? 's' : ''} para{' '}
                <strong>{searchParams.guests}</strong> hóspede{searchParams.guests !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>

        <Button 
          onClick={handleSearch} 
          disabled={isSearching || isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700"
          data-testid="button-search-hotels"
        >
          <Search className="w-4 h-4 mr-2" />
          {isSearching || isLoading ? 'Buscando...' : 'Buscar Acomodações'}
        </Button>
      </div>

      {/* Resultados da Busca */}
      {hasSearched && (
        <div className="border-t pt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">
              Resultados da Busca
            </h3>
            {hotels.length > 0 && (
              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                {hotels.length} resultado{hotels.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Buscando acomodações...</p>
            </div>
          ) : hotels.length > 0 ? (
            <div className="space-y-4">
              {hotels.map((hotel) => (
                <div key={hotel.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-semibold text-lg text-gray-900">{hotel.name}</h4>
                      
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center gap-1 text-gray-600">
                          <MapPin className="w-4 h-4" />
                          <span className="text-sm">
                            {hotel.address}
                            {hotel.locality && `, ${hotel.locality}`}
                            {hotel.province && `, ${hotel.province}`}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 mb-3">
                        {renderStars(hotel.rating)}
                        <span className="text-sm text-gray-600 ml-1">
                          ({hotel.rating || 4.0})
                        </span>
                      </div>

                      {hotel.description && (
                        <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                          {hotel.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Bed className="w-4 h-4 text-blue-600" />
                          <span>{hotel.type || 'Quarto Standard'}</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Users className="w-4 h-4 text-green-600" />
                          <span>Até {searchParams.guests} pessoas</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right ml-4 min-w-[140px]">
                      <div className="text-2xl font-bold text-green-600">
                        {formatPrice(hotel.pricePerNight)}
                      </div>
                      <div className="text-sm text-gray-500 mb-2">por noite</div>
                      
                      {calculateNights() > 0 && hotel.pricePerNight && (
                        <div className="text-xs text-gray-400 mb-3 p-2 bg-gray-50 rounded">
                          Total: {formatPrice(hotel.pricePerNight * calculateNights())}
                        </div>
                      )}
                      
                      <div className="mb-3">
                        {hotel.isAvailable ? (
                          <span className="inline-block bg-green-100 text-green-700 text-xs px-2 py-1 rounded">
                            ✅ Disponível
                          </span>
                        ) : (
                          <span className="inline-block bg-red-100 text-red-700 text-xs px-2 py-1 rounded">
                            ❌ Indisponível
                          </span>
                        )}
                      </div>
                      
                      <Button 
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        data-testid={`button-book-hotel-${hotel.id}`}
                        disabled={!hotel.isAvailable}
                      >
                        {hotel.isAvailable ? 'Reservar' : 'Indisponível'}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Map className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                Nenhuma acomodação encontrada
              </h3>
              <p className="text-gray-600 mb-4">
                Não encontramos acomodações para "{searchParams.location}" nas datas selecionadas.
              </p>
              <p className="text-sm text-gray-500">
                Tente buscar por: <strong>Tofo</strong>, <strong>Maputo</strong>, <strong>Costa do Sol</strong>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}