// src/apps/hotels-app/components/shared/HotelSelector.tsx - VERSÃO SIMPLIFICADA
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Building2, Hotel as HotelIcon, MapPin, Check, ChevronDown } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Link, useLocation } from 'wouter';
import { useHotelData } from '../../hooks/useHotelData';
import type { Hotel } from '@/types';

type HotelListItem = Partial<Hotel> & { id?: string; hotel_id?: string; name?: string; hotel_name?: string };

interface HotelSelectorProps {
  hotels: HotelListItem[];
  isLoading?: boolean;
  className?: string;
}

export default function HotelSelector({
  hotels,
  isLoading = false,
  className = ''
}: HotelSelectorProps) {
  const [location] = useLocation();
  const { 
    selectedHotelId, 
    selectedHotel, 
    selectHotelById,
    getHotelName,
    getHotelId 
  } = useHotelData(); // 🔥 AGORA USANDO O HOOK UNIFICADO

  // 🔥 VERIFICAÇÃO: Aparece APENAS na homepage (/hotels)
  const shouldRender = () => {
    const path = location;
    const isHomePage = path === '/hotels' || path === '/hotels/';
    return isHomePage;
  };

  if (!shouldRender()) {
    return null;
  }

  const handleChange = (hotelId: string) => {
    selectHotelById(hotelId);
  };

  if (isLoading) {
    return (
      <Card className={`animate-pulse ${className}`}>
        <CardContent className="p-6">
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-10 bg-gray-200 rounded w-full"></div>
        </CardContent>
      </Card>
    );
  }

  if (hotels.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <HotelIcon className="h-6 w-6 text-gray-400" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">
            Nenhum hotel cadastrado
          </h3>
          <p className="text-gray-600 text-sm mb-4">
            Comece criando seu primeiro hotel para gerenciar tipos de quarto e reservas.
          </p>
          <Link href="/hotels/create">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Building2 className="h-4 w-4 mr-2" />
              Criar Meu Primeiro Hotel
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-6">
        {/* Header do Seletor */}
        <div className="flex items-center mb-4">
          <div className="p-2 bg-blue-100 rounded-lg mr-3">
            <Building2 className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              Hotel Selecionado para Gerenciamento
            </h3>
            <p className="text-sm text-gray-500">
              Mantido em todas as páginas do sistema
            </p>
          </div>
        </div>

        {/* Seletor */}
        <div className="space-y-4">
          <Select value={selectedHotelId || ''} onValueChange={handleChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Escolha um hotel">
                {selectedHotel ? (
                  <div className="flex items-center">
                    <Building2 className="h-4 w-4 mr-2 text-blue-500" />
                    <span className="font-medium">
                      {getHotelName(selectedHotel)}
                    </span>
                    {selectedHotel.locality && (
                      <span className="ml-2 text-xs text-gray-500">
                        • {selectedHotel.locality}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center text-gray-500">
                    <ChevronDown className="h-4 w-4 mr-2" />
                    <span>Selecione um hotel...</span>
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {hotels
                .filter((hotel) => {
                  const rawId = hotel.id ?? hotel.hotel_id;
                  const id = rawId ? String(rawId).trim() : '';
                  return id !== '';
                })
                .map((hotel) => {
                const hotelId = getHotelId(hotel);
                const hotelName = getHotelName(hotel);
                const isSelected = hotelId === selectedHotelId;
                
                return (
                  <SelectItem 
                    key={hotelId} 
                    value={hotelId}
                    className="py-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`p-2 rounded-lg mr-3 ${isSelected ? 'bg-blue-100' : 'bg-gray-100'}`}>
                          <Building2 className={`h-4 w-4 ${isSelected ? 'text-blue-600' : 'text-gray-500'}`} />
                        </div>
                        <div>
                          <div className={`font-medium ${isSelected ? 'text-blue-700' : 'text-gray-900'}`}>
                            {hotelName}
                          </div>
                          {hotel.locality && (
                            <div className="flex items-center text-xs text-gray-500">
                              <MapPin className="h-3 w-3 mr-1" />
                              {hotel.locality}
                              {hotel.province ? `, ${hotel.province}` : ''}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {isSelected && (
                        <Check className="h-4 w-4 text-green-500" />
                      )}
                      
                      {hotel.is_active !== false && !isSelected && (
                        <Badge variant="outline" className="text-xs">
                          Ativo
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          {/* 🔥 Informações e ações do hotel selecionado */}
          {selectedHotelId && selectedHotel && (
            <>
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-700">
                  <strong>Hotel atual:</strong> {getHotelName(selectedHotel)}
                  {selectedHotel.locality && (
                    <span className="block text-xs mt-1">
                      📍 {selectedHotel.locality}
                      {selectedHotel.province ? `, ${selectedHotel.province}` : ''}
                    </span>
                  )}
                </p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <Link href={`/hotels/${selectedHotelId}`}>
                  <Button className="w-full bg-blue-600 hover:bg-blue-700">
                    <HotelIcon className="h-4 w-4 mr-2" />
                    Dashboard
                  </Button>
                </Link>
                
                <Link href={`/hotels/${selectedHotelId}/edit`}>
                  <Button variant="outline" className="w-full">
                    <Building2 className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                </Link>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link href={`/hotels/${selectedHotelId}/room-types`}>
                  <Button variant="outline" className="w-full">
                    <HotelIcon className="h-4 w-4 mr-2" />
                    Quartos
                  </Button>
                </Link>
                
                <Link href={`/hotels/${selectedHotelId}/availability`}>
                  <Button variant="outline" className="w-full">
                    <Building2 className="h-4 w-4 mr-2" />
                    Disponibilidade
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}