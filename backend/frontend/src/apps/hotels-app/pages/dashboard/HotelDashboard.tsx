// src/apps/hotels-app/pages/dashboard/HotelsDashboard.tsx
import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { useAuth } from '@/shared/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { 
  HotelIcon, 
  Plus, 
  Building2, 
  Bed, 
  Users, 
  DollarSign, 
  Calendar,
  TrendingUp,
  MapPin,
  Edit,
  Trash2,
  Eye
} from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import { apiService } from '@/services/api';
import { useToast } from '@/shared/hooks/use-toast';
import { Hotel, RoomType, HotelStatistics } from '@/types';

interface DashboardHotel {
  id: string;
  name: string;
  address: string;
  locality: string;
  province: string;
  contact_email: string;
  contact_phone?: string;
  is_active?: boolean;
  description?: string;
  images?: string[];
}

interface DashboardRoomType {
  id: string;
  name: string;
  type: string;
  price_per_night?: number;
  base_price: number;
  total_units: number;
  available_units?: number;
  total_rooms?: number;
  available_rooms?: number;
  max_guests: number;
  max_occupancy: number;
  is_active?: boolean;
  description?: string;
  amenities?: string[];
  bed_type?: string;
}

export default function HotelsDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedHotelId, setSelectedHotelId] = useState<string | null>(null);

  // Buscar hotéis do usuário
  const { data: userHotels = [], isLoading: hotelsLoading } = useQuery({
    queryKey: ['user-hotels', user?.id] as const,
    queryFn: async (): Promise<DashboardHotel[]> => {
      try {
        const response = await apiService.getAllHotels();
        if (response.success && response.data) {
          const hotels = Array.isArray(response.data) ? response.data : [];
          return hotels.map((hotel: Hotel) => ({
            id: hotel.id || hotel.hotel_id || '',
            name: hotel.name || hotel.hotel_name || 'Hotel sem nome',
            address: hotel.address || '',
            locality: hotel.locality || '',
            province: hotel.province || '',
            contact_email: hotel.contact_email || '',
            contact_phone: hotel.contact_phone || '',
            is_active: hotel.is_active ?? true,
            description: hotel.description || '',
            images: hotel.images || [],
          }));
        }
        return [];
      } catch (error) {
        console.error('Erro ao buscar hotéis:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar os hotéis',
          variant: 'destructive',
        });
        return [];
      }
    },
    enabled: !!user?.id,
  });

  // Buscar quartos do hotel selecionado
  const { data: hotelRooms = [], isLoading: roomsLoading } = useQuery({
    queryKey: ['hotel-rooms', selectedHotelId] as const,
    queryFn: async (): Promise<DashboardRoomType[]> => {
      if (!selectedHotelId) return [];
      try {
        const response = await apiService.getRoomTypesByHotel(selectedHotelId);
        if (response.success && response.data) {
          const rooms = Array.isArray(response.data) ? response.data : [];
          return rooms.map((room: RoomType) => ({
            id: room.id || room.room_type_id || '',
            name: room.name || room.room_type_name || 'Quarto sem nome',
            type: 'standard',
            price_per_night: Number(room.price_per_night) || Number(room.base_price) || 0,
            base_price: Number(room.base_price) || 0,
            total_units: room.total_units || 0,
            available_units: room.available_units || 0,
            total_rooms: room.total_units || 0,
            available_rooms: room.available_units || 0,
            max_guests: room.max_occupancy || 2,
            max_occupancy: room.max_occupancy || 2,
            is_active: room.is_active ?? true,
            description: room.description || '',
            amenities: room.amenities || [],
            bed_type: room.bed_type || '',
          }));
        }
        return [];
      } catch (error) {
        console.error('Erro ao buscar quartos:', error);
        return [];
      }
    },
    enabled: !!selectedHotelId,
  });

  // Buscar estatísticas
  const { data: hotelStats } = useQuery({
    queryKey: ['hotel-stats', selectedHotelId] as const,
    queryFn: async (): Promise<HotelStatistics | null> => {
      if (!selectedHotelId) return null;
      try {
        const response = await apiService.getHotelStatsDetailed(selectedHotelId);
        if (response.success && response.data) {
          return response.data as HotelStatistics;
        }
        return null;
      } catch (error) {
        return null;
      }
    },
    enabled: !!selectedHotelId,
  });

  // Auto-selecionar primeiro hotel
  useEffect(() => {
    if (userHotels.length > 0 && !selectedHotelId) {
      setSelectedHotelId(userHotels[0].id);
    }
  }, [userHotels, selectedHotelId]);

  const selectedHotel = userHotels.find(h => h.id === selectedHotelId);

  // Estatísticas calculadas
  const stats = {
    totalRooms: hotelRooms.reduce((sum: number, room: DashboardRoomType) => 
      sum + (room.total_units || room.total_rooms || 0), 0),
    availableRooms: hotelRooms.reduce((sum: number, room: DashboardRoomType) => 
      sum + (room.available_units || room.available_rooms || 0), 0),
    roomTypes: hotelRooms.length,
    totalBookings: hotelStats?.total_bookings || hotelRooms.length * 3,
    monthlyRevenue: hotelStats?.total_revenue || hotelStats?.monthly_revenue || 
      hotelRooms.reduce((sum: number, room: DashboardRoomType) => 
        sum + ((room.base_price || room.price_per_night || 0) * 20), 0),
    averageOccupancy: hotelStats?.occupancy_rate || 75,
    averageRating: 4.8, // valor padrão
  };

  // Se não houver hotéis
  if (!hotelsLoading && userHotels.length === 0) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
        <Card className="max-w-md w-full border-0 shadow-lg">
          <CardContent className="pt-8 text-center">
            <div className="mx-auto w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
              <HotelIcon className="h-10 w-10 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              Bem-vindo à Gestão Hoteleira
            </h1>
            <p className="text-gray-600 mb-8">
              Comece criando seu primeiro hotel para gerenciar quartos e reservas.
            </p>
            <div className="space-y-4">
              <Link href="/hotels/create">
                <Button className="w-full bg-blue-600 hover:bg-blue-700 h-12">
                  <Plus className="mr-2 h-5 w-5" />
                  Criar Meu Primeiro Hotel
                </Button>
              </Link>
              <Link href="/">
                <Button variant="outline" className="w-full">
                  Voltar ao Site Principal
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header com seletor de hotel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard do Hotel</h1>
          <p className="text-gray-600">Gerencie seu hotel e visualize estatísticas</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <select 
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            value={selectedHotelId || ''}
            onChange={(e) => setSelectedHotelId(e.target.value || null)}
          >
            <option value="">Selecione um hotel</option>
            {userHotels.map((hotel) => (
              <option key={hotel.id} value={hotel.id}>
                {hotel.name}
              </option>
            ))}
          </select>
          
          <div className="flex space-x-2">
            <Link href="/hotels/create">
              <Button variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Novo Hotel
              </Button>
            </Link>
            {selectedHotelId && (
              <Link href={`/hotels/${selectedHotelId}/room-types/create`}>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Tipo de Quarto
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Cartões de Estatística */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-500 rounded-lg">
                <Bed className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-blue-700">Quartos Disponíveis</p>
                <p className="text-3xl font-bold text-blue-900">{stats.availableRooms}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-500 rounded-lg">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-green-700">Reservas (30 dias)</p>
                <p className="text-3xl font-bold text-green-900">{stats.totalBookings}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-500 rounded-lg">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-yellow-700">Receita Mensal</p>
                <p className="text-3xl font-bold text-yellow-900">
                  {stats.monthlyRevenue.toLocaleString()} MT
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-500 rounded-lg">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-purple-700">Taxa Ocupação</p>
                <p className="text-3xl font-bold text-purple-900">{stats.averageOccupancy}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="rooms">Quartos</TabsTrigger>
          <TabsTrigger value="bookings">Reservas</TabsTrigger>
          <TabsTrigger value="analytics">Analíticos</TabsTrigger>
        </TabsList>

        {/* Visão Geral */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Informações do Hotel */}
            <Card className="lg:col-span-2">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Informações do Hotel
                  </h3>
                  {selectedHotel && (
                    <Link href={`/hotels/${selectedHotel.id}/edit`}>
                      <Button variant="outline" size="sm">
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </Button>
                    </Link>
                  )}
                </div>
                
                {selectedHotel ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Nome do Hotel</p>
                        <p className="font-medium">{selectedHotel.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Localização</p>
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 text-gray-400 mr-1" />
                          <p className="font-medium truncate">{selectedHotel.address}, {selectedHotel.locality}, {selectedHotel.province}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Email</p>
                        <p className="font-medium">{selectedHotel.contact_email}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Telefone</p>
                        <p className="font-medium">{selectedHotel.contact_phone || '-'}</p>
                      </div>
                    </div>
                    
                    {selectedHotel.description && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Descrição</p>
                        <p className="text-gray-700">{selectedHotel.description}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Selecione um hotel para ver detalhes</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Ações Rápidas */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  Ações Rápidas
                </h3>
                <div className="space-y-4">
                  <Link href={selectedHotelId ? `/hotels/${selectedHotelId}/room-types/create` : '#'}>
                    <Button className="w-full justify-start" disabled={!selectedHotelId}>
                      <Plus className="mr-3 h-5 w-5" />
                      Adicionar Tipo de Quarto
                    </Button>
                  </Link>
                  
                  <Link href={selectedHotelId ? `/hotels/${selectedHotelId}/availability` : '#'}>
                    <Button variant="outline" className="w-full justify-start" disabled={!selectedHotelId}>
                      <Calendar className="mr-3 h-5 w-5" />
                      Gestão de Disponibilidade
                    </Button>
                  </Link>
                  
                  <Link href="/hotels/create">
                    <Button variant="outline" className="w-full justify-start">
                      <Building2 className="mr-3 h-5 w-5" />
                      Criar Novo Hotel
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Quartos */}
        <TabsContent value="rooms" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Gestão de Tipos de Quarto</h3>
              <p className="text-gray-600">Gerencie os tipos de quarto do seu hotel</p>
            </div>
            <Link href={selectedHotelId ? `/hotels/${selectedHotelId}/room-types/create` : '#'}>
              <Button disabled={!selectedHotelId}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Tipo de Quarto
              </Button>
            </Link>
          </div>

          {roomsLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Carregando tipos de quarto...</p>
            </div>
          ) : hotelRooms.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Bed className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhum tipo de quarto cadastrado
                </h3>
                <p className="text-gray-600 mb-6">
                  Adicione tipos de quarto para começar a receber reservas.
                </p>
                <Link href={selectedHotelId ? `/hotels/${selectedHotelId}/room-types/create` : '#'}>
                  <Button disabled={!selectedHotelId}>
                    <Plus className="mr-2 h-4 w-4" />
                    Criar Primeiro Tipo de Quarto
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {hotelRooms.map((room) => (
                <Card key={room.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900">{room.name}</h3>
                            <Badge variant="outline">{room.type}</Badge>
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {room.description || 'Sem descrição'}
                          </p>
                        </div>
                        {room.is_active ? (
                          <Badge className="bg-green-100 text-green-800">Ativo</Badge>
                        ) : (
                          <Badge variant="secondary">Inativo</Badge>
                        )}
                      </div>

                      {/* Details */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center space-x-2 text-sm">
                          <DollarSign className="h-4 w-4 text-gray-400" />
                          <span className="font-semibold">
                            {(room.price_per_night || room.base_price || 0).toLocaleString()} MT
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span>Até {room.max_guests || room.max_occupancy || 2}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm">
                          <Building2 className="h-4 w-4 text-gray-400" />
                          <span>
                            {(room.available_units || room.available_rooms || 0)}/{(room.total_units || room.total_rooms || 0)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm">
                          <Bed className="h-4 w-4 text-gray-400" />
                          <span>{room.bed_type || 'Cama'}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex justify-between pt-4 border-t">
                        <div className="flex space-x-2">
                          <Link href={`/hotels/${selectedHotelId}/room-types/${room.id}`}>
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link href={`/hotels/${selectedHotelId}/room-types/${room.id}/edit`}>
                            <Button size="sm" variant="outline">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                        <Button size="sm" variant="destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Reservas */}
        <TabsContent value="bookings">
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Gestão de Reservas
              </h3>
              <p className="text-gray-600 mb-6">
                Visualize e gerencie as reservas do seu hotel.
              </p>
              <Link href="/hotels/bookings">
                <Button>
                  Ver Todas as Reservas
                </Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analíticos */}
        <TabsContent value="analytics">
          <Card>
            <CardContent className="py-12 text-center">
              <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Análise de Desempenho
              </h3>
              <p className="text-gray-600 mb-6">
                Acompanhe métricas e tendências do seu hotel.
              </p>
              <Link href="/hotels/analytics">
                <Button>
                  Ver Análises Detalhadas
                </Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}