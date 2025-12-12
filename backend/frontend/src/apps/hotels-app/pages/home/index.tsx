// src/apps/hotels-app/pages/home/index.tsx - VERSÃO FINAL CORRIGIDA
import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { 
  Building2, Plus, Hotel, Bed, TrendingUp, DollarSign,
  Calendar, Users, ArrowRight, ChevronDown, MapPin,
  Star, Clock, Bell, Settings, HelpCircle, BarChart3,
  Filter, Search, Grid, List, Eye, Edit, MoreVertical,
  RefreshCw, AlertCircle, Layers, ChevronRight
} from 'lucide-react';
import { apiService } from '@/services/api';
import { formatPrice } from '@/apps/hotels-app/utils/hotelHelpers';
import { useToast } from '@/shared/hooks/use-toast';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Progress } from '@/shared/components/ui/progress';
import { Separator } from '@/shared/components/ui/separator';
import HotelSelector from '../../components/shared/HotelSelector';

// Usar tipo genérico para Hotel que seja compatível
type LocalHotel = {
  id: string;
  name: string;
  locality?: string;
  province?: string;
  is_active?: boolean;
  rating?: string | number; // Aceita string ou number
  hotel_id?: string;
  hotel_name?: string;
  address?: string;
};

export default function HotelsHome() {
  const { toast } = useToast();
  const [selectedHotelId, setSelectedHotelId] = useState<string>('');
  const [stats, setStats] = useState({
    totalHotels: 0,
    totalRooms: 0,
    availableRooms: 0,
    totalBookings: 0,
    monthlyRevenue: 0,
    averageOccupancy: 75,
    roomTypes: 0,
    activeHotels: 0
  });

  // Buscar todos os hotéis do usuário
  const { data: hotelsData, isLoading: hotelsLoading, error: hotelsError, refetch: refetchHotels } = useQuery({
    queryKey: ['user-hotels-home'],
    queryFn: async () => {
      try {
        const response = await apiService.getAllHotels();
        
        if (response.success) {
          const hotelsList: LocalHotel[] = Array.isArray(response.data) ? response.data : 
                           Array.isArray(response.hotels) ? response.hotels : 
                           Array.isArray(response) ? response : [];
          
          // Calcular estatísticas
          let totalRooms = 0;
          let availableRooms = 0;
          let roomTypes = 0;
          
          // Para cada hotel, buscar quartos (limitado para performance)
          const hotelsToProcess = hotelsList.slice(0, 3);
          for (const hotel of hotelsToProcess) {
            const hotelId = hotel.id || hotel.hotel_id;
            if (hotelId) {
              try {
                const roomsResponse = await apiService.getRoomTypesByHotel(hotelId);
                if (roomsResponse.success) {
                  const rooms = Array.isArray(roomsResponse.data) ? roomsResponse.data : 
                               Array.isArray(roomsResponse.roomTypes) ? roomsResponse.roomTypes : [];
                  roomTypes += rooms.length;
                  totalRooms += rooms.reduce((sum: number, room: any) => 
                    sum + (room.total_units || room.totalUnits || 0), 0
                  );
                  availableRooms += rooms.reduce((sum: number, room: any) => 
                    sum + (room.available_units || room.availableUnits || 0), 0
                  );
                }
              } catch (error) {
                console.log(`Erro ao buscar quartos do hotel ${hotelId}:`, error);
              }
            }
          }
          
          // Atualizar estatísticas
          setStats(prev => ({
            ...prev,
            totalHotels: hotelsList.length,
            activeHotels: hotelsList.filter((h: LocalHotel) => h.is_active !== false).length,
            totalRooms,
            availableRooms,
            roomTypes,
            totalBookings: Math.round(totalRooms * 6.5), // Estimativa baseada em quartos
            monthlyRevenue: Math.round(totalRooms * 8500 * 0.7 * 30) // Estimativa: 70% ocupação, 8500 MT/noite
          }));
          
          return hotelsList;
        }
        return [];
      } catch (error: any) {
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar os hotéis',
          variant: 'destructive',
        });
        return [];
      }
    },
  });

  // Atualizar selectedHotelId quando os dados carregarem
  useEffect(() => {
    if (hotelsData && hotelsData.length > 0 && !selectedHotelId) {
      const firstHotel = hotelsData[0];
      const hotelId = firstHotel.id || firstHotel.hotel_id || '';
      if (hotelId) {
        setSelectedHotelId(hotelId);
        // Salvar no localStorage para manter a seleção
        localStorage.setItem('selectedHotelId', hotelId);
      }
    }
  }, [hotelsData, selectedHotelId]);

  const hotels: LocalHotel[] = hotelsData || [];

  // Última atividade (simulação)
  const recentActivity = [
    { type: 'booking', message: 'Nova reserva no Hotel Premium Maputo', time: 'há 2 horas', icon: Calendar },
    { type: 'room', message: 'Tipo de quarto "Suite Vista Mar" atualizado', time: 'há 4 horas', icon: Layers },
    { type: 'hotel', message: 'Hotel "Beira Resort" adicionado', time: 'Ontem', icon: Building2 },
    { type: 'payment', message: 'Pagamento recebido: 25,000 MT', time: 'há 2 dias', icon: DollarSign },
  ];

  const handleRefresh = () => {
    refetchHotels();
    toast({
      title: 'Atualizando...',
      description: 'Dados estão sendo atualizados',
    });
  };

  const getHotelId = (hotel: LocalHotel) => {
    return hotel.id || hotel.hotel_id || '';
  };

  const getHotelName = (hotel: LocalHotel) => {
    return hotel.name || hotel.hotel_name || 'Hotel sem nome';
  };

  const handleHotelChange = (hotelId: string) => {
    setSelectedHotelId(hotelId);
    localStorage.setItem('selectedHotelId', hotelId);
  };

  // Helper para converter rating para número
  const getRatingNumber = (rating: string | number | undefined): number | undefined => {
    if (rating === undefined || rating === null) return undefined;
    if (typeof rating === 'number') return rating;
    if (typeof rating === 'string') {
      const parsed = parseFloat(rating);
      return isNaN(parsed) ? undefined : parsed;
    }
    return undefined;
  };

  if (hotelsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando hotéis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl p-6 md:p-8 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Bem-vindo ao Gestão Hoteleira</h1>
            <p className="text-blue-100 mb-4">
              Gerencie todos os seus hotéis, tipos de quarto e reservas em um só lugar
            </p>
            <div className="flex flex-wrap gap-4">
              <Badge className="bg-blue-500 text-white">
                <Building2 className="h-3 w-3 mr-1" />
                {stats.totalHotels} Hotel{stats.totalHotels !== 1 ? 's' : ''}
              </Badge>
              <Badge className="bg-green-500 text-white">
                <Layers className="h-3 w-3 mr-1" />
                {stats.roomTypes} Tipo{stats.roomTypes !== 1 ? 's' : ''} de Quarto
              </Badge>
              <Badge className="bg-purple-500 text-white">
                <TrendingUp className="h-3 w-3 mr-1" />
                {stats.averageOccupancy}% Ocupação
              </Badge>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              variant="outline" 
              onClick={handleRefresh} 
              disabled={hotelsLoading}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${hotelsLoading ? 'animate-spin' : ''}`} />
              {hotelsLoading ? 'Atualizando...' : 'Atualizar'}
            </Button>
            <Link href="/hotels/create">
              <Button className="bg-white text-blue-700 hover:bg-gray-100">
                <Plus className="w-4 h-4 mr-2" />
                Novo Hotel
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 🔥 SELECTOR DE HOTEL - AGORA SÓ APARECE AQUI NA HOMEPAGE */}
      {hotels.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="max-w-2xl mx-auto">
            <HotelSelector
              hotels={hotels.map(hotel => ({
                id: getHotelId(hotel),
                name: getHotelName(hotel),
                locality: hotel.locality,
                is_active: hotel.is_active,
                rating: getRatingNumber(hotel.rating)
              }))}
              selectedHotelId={selectedHotelId}
              onHotelChange={handleHotelChange}
              isLoading={hotelsLoading}
              className=""
            />
          </div>
        </div>
      )}

      {/* Cards de Ação Rápida */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/hotels/create">
          <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 border-2 border-dashed border-blue-200 hover:border-blue-400">
            <CardContent className="p-6 text-center">
              <div className="text-blue-600 mb-4">
                <Plus className="w-12 h-12 mx-auto" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Criar Hotel
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Adicione um novo hotel à sua rede
              </p>
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                Comece aqui
              </Badge>
            </CardContent>
          </Card>
        </Link>

        <Link href="/hotels/dashboard">
          <Card className="cursor-pointer hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="text-green-600 mb-4">
                <Building2 className="w-12 h-12 mx-auto" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Dashboard Global
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Visualize estatísticas de todos os hotéis
              </p>
              <Badge variant="outline" className="bg-green-50 text-green-700">
                {stats.totalHotels > 0 ? 'Ver dados' : 'Em breve'}
              </Badge>
            </CardContent>
          </Card>
        </Link>

        <Link href="/hotels/analytics">
          <Card className="cursor-pointer hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="text-purple-600 mb-4">
                <BarChart3 className="w-12 h-12 mx-auto" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Analytics
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Análises detalhadas e relatórios
              </p>
              <Badge variant="outline" className="bg-purple-50 text-purple-700">
                Insights
              </Badge>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-500 rounded-lg">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Hotéis Ativos</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.activeHotels}/{stats.totalHotels}
                </p>
                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                  <div 
                    className="bg-blue-600 h-1.5 rounded-full" 
                    style={{ 
                      width: stats.totalHotels > 0 
                        ? `${(stats.activeHotels / stats.totalHotels) * 100}%` 
                        : '0%' 
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-500 rounded-lg">
                <Layers className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Tipos de Quarto</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.roomTypes}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Total de categorias
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
                <p className="text-sm font-medium text-gray-600">Taxa de Ocupação</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.averageOccupancy}%
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Média estimada
                </p>
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
                <p className="text-sm font-medium text-gray-600">Receita Mensal</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatPrice(stats.monthlyRevenue)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Projeção baseada em ocupação
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Layout Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Coluna Esquerda - Hotéis Recentes */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Seus Hotéis</CardTitle>
                  <CardDescription>
                    Gerencie seus hotéis ou crie um novo
                  </CardDescription>
                </div>
                <Link href="/hotels/dashboard">
                  <Button variant="ghost" size="sm">
                    Ver todos
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {hotelsError ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center bg-red-100 rounded-full">
                    <AlertCircle className="h-6 w-6 text-red-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Erro ao carregar hotéis
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Não foi possível carregar a lista de hotéis.
                  </p>
                  <Button onClick={handleRefresh}>
                    Tentar Novamente
                  </Button>
                </div>
              ) : hotels && hotels.length > 0 ? (
                <div className="space-y-4">
                  {hotels.slice(0, 3).map((hotel: LocalHotel, index: number) => {
                    const hotelId = getHotelId(hotel);
                    const hotelName = getHotelName(hotel);
                    const ratingNumber = getRatingNumber(hotel.rating);
                    
                    return (
                      <div key={hotelId || index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center space-x-4">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Building2 className="h-6 w-6 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{hotelName}</h3>
                            <div className="flex items-center mt-1">
                              <MapPin className="h-4 w-4 text-gray-400 mr-1" />
                              <p className="text-sm text-gray-600">
                                {hotel.locality || hotel.address || 'Localização não especificada'}
                                {hotel.province ? `, ${hotel.province}` : ''}
                              </p>
                            </div>
                            <div className="flex items-center space-x-2 mt-2">
                              <Badge variant={hotel.is_active === false ? 'secondary' : 'default'}>
                                {hotel.is_active === false ? 'Inativo' : 'Ativo'}
                              </Badge>
                              {ratingNumber !== undefined && (
                                <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                                  <Star className="h-3 w-3 mr-1" />
                                  {ratingNumber.toFixed(1)}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          {hotelId && (
                            <>
                              <Link href={`/hotels/${hotelId}`}>
                                <Button variant="outline" size="sm">
                                  <Eye className="h-4 w-4 mr-1" />
                                  Ver
                                </Button>
                              </Link>
                              <Link href={`/hotels/${hotelId}/edit`}>
                                <Button size="sm">
                                  <Edit className="h-4 w-4 mr-1" />
                                  Gerir
                                </Button>
                              </Link>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  
                  {hotels.length > 3 && (
                    <div className="text-center pt-4 border-t">
                      <Link href="/hotels/dashboard">
                        <Button variant="ghost">
                          Ver mais {hotels.length - 3} hotel{hotels.length - 3 !== 1 ? 's' : ''}
                          <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Building2 className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Nenhum hotel cadastrado
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Comece criando seu primeiro hotel para gerenciar tipos de quarto e reservas.
                  </p>
                  <Link href="/hotels/create">
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="mr-2 h-5 w-5" />
                      Criar Meu Primeiro Hotel
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Última Atividade */}
          <Card>
            <CardHeader>
              <CardTitle>Última Atividade</CardTitle>
              <CardDescription>
                Atividades recentes no sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity, index) => {
                  const Icon = activity.icon;
                  return (
                    <div key={index} className="flex items-center space-x-4 p-3 hover:bg-gray-50 rounded-lg">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Icon className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{activity.message}</p>
                        <div className="flex items-center mt-1">
                          <Clock className="h-3 w-3 text-gray-400 mr-1" />
                          <span className="text-sm text-gray-500">{activity.time}</span>
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5 text-gray-400" />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coluna Direita - Links Rápidos e Dicas */}
        <div className="space-y-6">
          {/* Links Rápidos */}
          <Card>
            <CardHeader>
              <CardTitle>Links Rápidos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/hotels/bookings">
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="mr-2 h-4 w-4" />
                  Reservas
                </Button>
              </Link>
              
              <Link href="/hotels/dashboard">
                <Button variant="outline" className="w-full justify-start">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Dashboard Global
                </Button>
              </Link>
              
              {hotels && hotels.length > 0 && selectedHotelId && (
                <Link href={`/hotels/${selectedHotelId}/room-types/create`}>
                  <Button variant="outline" className="w-full justify-start">
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Tipo de Quarto
                  </Button>
                </Link>
              )}
              
              <Link href="/hotels/settings">
                <Button variant="outline" className="w-full justify-start">
                  <Edit className="mr-2 h-4 w-4" />
                  Configurações
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Dicas Rápidas */}
          <Card>
            <CardHeader>
              <CardTitle>Dicas Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center mb-2">
                  <Building2 className="h-4 w-4 text-blue-600 mr-2" />
                  <h4 className="font-medium text-blue-800">Complete seu perfil</h4>
                </div>
                <p className="text-sm text-blue-700">
                  Hotéis com informações completas recebem 40% mais reservas.
                </p>
              </div>
              
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="flex items-center mb-2">
                  <Layers className="h-4 w-4 text-green-600 mr-2" />
                  <h4 className="font-medium text-green-800">Diversifique tipos de quarto</h4>
                </div>
                <p className="text-sm text-green-700">
                  Hotéis com 3+ tipos de quarto têm melhor ocupação.
                </p>
              </div>
              
              <div className="p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center mb-2">
                  <Calendar className="h-4 w-4 text-purple-600 mr-2" />
                  <h4 className="font-medium text-purple-800">Mantenha disponibilidade</h4>
                </div>
                <p className="text-sm text-purple-700">
                  Atualize regularmente os preços e disponibilidade.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Suporte */}
          <Card>
            <CardHeader>
              <CardTitle>Precisa de ajuda?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => alert('Central de Ajuda em desenvolvimento')}
                >
                  <HelpCircle className="mr-2 h-4 w-4" />
                  Central de Ajuda
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => alert('Funcionalidade de reportar problema em desenvolvimento')}
                >
                  <AlertCircle className="mr-2 h-4 w-4" />
                  Reportar Problema
                </Button>
                <p className="text-sm text-gray-500 text-center pt-2">
                  Suporte disponível 24/7
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Stats Footer */}
      <div className="bg-gray-50 rounded-xl p-6 border">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Hotel className="h-5 w-5 text-blue-600" />
            <span className="text-sm text-gray-600">Gestão Hoteleira • Resumo do Sistema</span>
          </div>
          <div className="flex flex-wrap gap-4">
            <span className="text-sm text-gray-500">
              <Building2 className="inline h-4 w-4 mr-1" />
              {stats.totalHotels} hotel{stats.totalHotels !== 1 ? 's' : ''}
            </span>
            <span className="text-sm text-gray-500">
              <Layers className="inline h-4 w-4 mr-1" />
              {stats.roomTypes} tipo{stats.roomTypes !== 1 ? 's' : ''} de quarto
            </span>
            <span className="text-sm text-gray-500">
              <DollarSign className="inline h-4 w-4 mr-1" />
              {formatPrice(stats.monthlyRevenue)}/mês
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}