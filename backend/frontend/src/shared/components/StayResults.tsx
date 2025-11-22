import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Map from "./Map";
import BookingModal from "./BookingModal";
import PreBookingChat from "./PreBookingChat";
import UserRatings from "./UserRatings";
import { Slider } from "@/shared/components/ui/slider";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/shared/components/ui/dialog";
import { formatPriceStringAsMzn } from "@/shared/lib/currency";
import type { Accommodation } from "@shared/schema";

interface StayResultsProps {
  searchParams: {
    location: string;
    checkIn: string;
    checkOut: string;
    guests: number;
  };
}

// ✅ Interface para a resposta da API
interface ApiResponse {
  success: boolean;
  data: {
    hotels: Accommodation[];
    searchLocation: any;
    searchType: string;
    message: string;
  };
}

// ✅ URL da API
const API_BASE_URL = 'http://localhost:8000';

export default function StayResults({ searchParams }: StayResultsProps) {
  const [selectedAccommodation, setSelectedAccommodation] = useState<Accommodation | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [priceRange, setPriceRange] = useState([50]);
  const [propertyTypes, setPropertyTypes] = useState<string[]>([]);

  // ✅ CORREÇÃO CRÍTICA: Busca na rota correta /api/hotels
  const { data: accommodationsResponse, isLoading, error } = useQuery<ApiResponse>({
    queryKey: ["/api/hotels", searchParams.location, searchParams.checkIn, searchParams.checkOut, searchParams.guests],
    queryFn: async () => {
      if (!searchParams.location) {
        return { success: false, data: { hotels: [], searchLocation: null, searchType: 'empty', message: 'No location provided' } };
      }

      const queryParams = new URLSearchParams();
      queryParams.append('address', searchParams.location);
      queryParams.append('isAvailable', 'true');
      
      if (searchParams.checkIn) queryParams.append('checkIn', searchParams.checkIn);
      if (searchParams.checkOut) queryParams.append('checkOut', searchParams.checkOut);
      if (searchParams.guests) queryParams.append('guests', searchParams.guests.toString());

      const url = `${API_BASE_URL}/api/hotels?${queryParams.toString()}`;
      console.log('📡 [StayResults] Buscando hotéis:', url);

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ [StayResults] Resposta da API:', data);
      
      return data;
    },
    enabled: !!searchParams.location?.trim(),
    retry: 1,
  });

  // ✅ EXTRAIR ACOMODAÇÕES DA RESPOSTA CORRETA
  const accommodations = accommodationsResponse?.data?.hotels || [];

  const filteredAccommodations = accommodations.filter((acc) => {
    const price = parseFloat(acc.pricePerNight || "0");
    const matchesPrice = price >= priceRange[0];
    const matchesType = propertyTypes.length === 0 || propertyTypes.includes(acc.type);
    return matchesPrice && matchesType;
  });

  const handleBookStay = (accommodation: Accommodation) => {
    setSelectedAccommodation(accommodation);
    setShowBookingModal(true);
  };

  const handlePropertyTypeChange = (type: string, checked: boolean) => {
    setPropertyTypes(prev => 
      checked ? [...prev, type] : prev.filter(t => t !== type)
    );
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-gray-200 rounded-xl h-64 animate-pulse"></div>
            ))}
          </div>
        </div>
        <div className="space-y-6">
          <div className="h-64 bg-gray-200 rounded-xl animate-pulse"></div>
          <div className="h-32 bg-gray-200 rounded-xl animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <i className="fas fa-exclamation-triangle text-red-600 text-2xl"></i>
        </div>
        <h3 className="text-lg font-semibold text-dark mb-2">Erro ao carregar acomodações</h3>
        <p className="text-gray-medium">Tente novamente em alguns instantes</p>
        <Button 
          onClick={() => window.location.reload()} 
          className="mt-4"
          variant="outline"
        >
          Recarregar
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* ✅ DEBUG INFO */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-sm">
          <div><strong>🔍 Buscando:</strong> {searchParams.location}</div>
          <div><strong>🏨 Encontrados:</strong> {accommodations.length} hotéis</div>
          <div><strong>📊 Filtrados:</strong> {filteredAccommodations.length} resultados</div>
          <div><strong>🎯 Status:</strong> {isLoading ? '🔄 Carregando...' : '✅ Pronto'}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Hotels Grid */}
        <div className="lg:col-span-2">
          {filteredAccommodations.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-bed text-gray-400 text-2xl"></i>
              </div>
              <h3 className="text-lg font-semibold text-dark mb-2">
                {accommodations.length === 0 ? 'Nenhuma acomodação encontrada' : 'Nenhum resultado para os filtros'}
              </h3>
              <p className="text-gray-medium">
                {accommodations.length === 0 
                  ? 'Tente buscar por uma localização diferente' 
                  : 'Tente ajustar seus filtros'
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredAccommodations.map((accommodation) => (
                <div
                  key={accommodation.id}
                  data-testid={`accommodation-card-${accommodation.id}`}
                  className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer border-2 border-green-200"
                  onClick={() => handleBookStay(accommodation)}
                >
                  <img
                    src={accommodation.images?.[0] || "https://images.unsplash.com/photo-1566073771259-6a8506099945"}
                    alt={accommodation.name}
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-dark text-lg">{accommodation.name}</h4>
                        <p className="text-sm text-gray-medium mt-1">{accommodation.address}</p>
                        <div className="flex items-center mt-2">
                          <div className="flex text-yellow-400">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <i
                                key={star}
                                className={`text-xs ${
                                  star <= Math.floor(parseFloat(accommodation.rating || "0"))
                                    ? "fas fa-star"
                                    : "far fa-star"
                                }`}
                              ></i>
                            ))}
                          </div>
                          <span className="text-xs text-gray-medium ml-1">
                            ({accommodation.rating || 'Sem avaliações'})
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-dark">
                          {formatPriceStringAsMzn(accommodation.pricePerNight)}
                        </p>
                        <p className="text-xs text-gray-medium">por noite</p>
                      </div>
                    </div>
                    
                    {/* Partnership Badge - only show if accommodation has active program */}
                    {accommodation.hasPartnershipProgram && accommodation.partnershipBadgeVisible && (
                      <div className="flex items-center space-x-2 pb-2 border-b">
                        <Badge className="bg-blue-600 text-white text-xs">
                          <i className="fas fa-handshake mr-1"></i>
                          Motoristas VIP
                        </Badge>
                        <span className="text-xs text-gray-500">Descontos para motoristas</span>
                      </div>
                    )}
                    
                    <div className="flex gap-2 pt-2 border-t">
                      <PreBookingChat
                        recipientId={accommodation.id}
                        recipientName="Anfitrião"
                        recipientType="host"
                        recipientAvatar="https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop&crop=face"
                        recipientRating={4.5}
                        isOnline={true}
                        responseTime="~30 min"
                        serviceDetails={{
                          type: 'stay',
                          location: accommodation.address,
                          date: searchParams.checkIn,
                          price: formatPriceStringAsMzn(accommodation.pricePerNight)
                        }}
                      />
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <i className="fas fa-star mr-2"></i>
                            Avaliações
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Avaliações do Anfitrião</DialogTitle>
                          </DialogHeader>
                          <UserRatings 
                            userId={accommodation.id}
                            userType="host"
                          />
                        </DialogContent>
                      </Dialog>
                      
                      <Button 
                        size="sm" 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          handleBookStay(accommodation); 
                        }}
                        className="ml-auto bg-blue-600 hover:bg-blue-700 text-white"
                        data-testid={`book-stay-${accommodation.id}`}
                      >
                        <i className="fas fa-calendar-check mr-2"></i>
                        Reservar
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Map Sidebar */}
        <div className="space-y-6">
          <Map
            type="accommodation"
            location={searchParams.location}
            markers={filteredAccommodations.map(acc => ({
              lat: parseFloat(acc.lat || "40.7589"),
              lng: parseFloat(acc.lng || "-73.9851"),
              popup: `${acc.name} - $${acc.pricePerNight}/night`,
            }))}
          />

          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <h4 className="font-semibold text-dark mb-3">Filtros</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-medium mb-2">Faixa de preço</label>
                <Slider
                  data-testid="price-range-slider"
                  value={priceRange}
                  onValueChange={setPriceRange}
                  max={500}
                  min={50}
                  step={25}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-medium mt-1">
                  <span>${priceRange[0]}</span>
                  <span>$500+</span>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-medium mb-2">Tipo de propriedade</label>
                <div className="space-y-2">
                  {["Hotel", "Apartment", "House"].map((type) => (
                    <div key={type} className="flex items-center space-x-2">
                      <Checkbox
                        data-testid={`filter-${type.toLowerCase()}`}
                        id={type}
                        checked={propertyTypes.includes(type)}
                        onCheckedChange={(checked) => 
                          handlePropertyTypeChange(type, checked as boolean)
                        }
                      />
                      <label
                        htmlFor={type}
                        className="text-sm cursor-pointer"
                      >
                        {type === "Hotel" ? "Hotéis" : type === "Apartment" ? "Apartamentos" : "Casas"}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedAccommodation && (
        <BookingModal
          type="stay"
          item={selectedAccommodation}
          searchParams={searchParams}
          isOpen={showBookingModal}
          onClose={() => {
            setShowBookingModal(false);
            setSelectedAccommodation(null);
          }}
        />
      )}
    </>
  );
}