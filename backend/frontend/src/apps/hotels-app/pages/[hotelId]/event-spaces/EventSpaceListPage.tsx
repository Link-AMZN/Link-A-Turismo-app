import { useState, useEffect } from 'react';
import { useLocation, useParams, Link } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '@/services/api';
import { useToast } from '@/shared/hooks/use-toast';
import { useHotelData } from '../../../hooks/useHotelData';
import { 
  Plus, Search, Edit, Trash2, Eye,
  RefreshCw, Building2,
  CheckCircle, XCircle, AlertCircle, Download,
  ArrowLeft, Users, DollarSign, Calendar,
  Maximize2, Mic, Monitor, Coffee
} from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Badge } from '@/shared/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';

import type { EventSpace, EventSpaceListResponse } from '@/types';

const SPACE_TYPE_LABELS: Record<string, string> = {
  conference: 'Conferência',
  banquet: 'Banquete',
  meeting: 'Reunião',
  outdoor: 'Ar Livre',
  ballroom: 'Salão de Festas',
  theater: 'Teatro',
  other: 'Outro'
};

export default function EventSpaceListPage() {
  const { hotelId: urlHotelId } = useParams<{ hotelId?: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [deletingEventSpaceId, setDeletingEventSpaceId] = useState<string | null>(null);

  const { 
    hotel, 
    selectedHotelId, 
    selectHotelById, 
    isLoading: hotelLoading,
    getHotelName,
    isHotelActive,
    formatPrice,
  } = useHotelData(urlHotelId);

  useEffect(() => {
    if (urlHotelId && urlHotelId !== selectedHotelId) {
      selectHotelById(urlHotelId);
    }
  }, [urlHotelId, selectedHotelId, selectHotelById]);

  if (!urlHotelId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full p-8 text-center bg-white rounded-lg shadow-lg border border-gray-200">
          <div className="mb-6">
            <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-yellow-100 rounded-full">
              <AlertCircle className="w-8 h-8 text-yellow-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Nenhum Hotel Selecionado</h2>
            <p className="text-gray-600">
              Para gerenciar espaços para eventos, você precisa selecionar um hotel.
            </p>
          </div>
          <Button onClick={() => setLocation('/hotels')} className="w-full">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Hotéis
          </Button>
        </div>
      </div>
    );
  }

  const { 
    data: eventSpacesResponse, 
    isLoading: eventSpacesLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['hotel-event-spaces', urlHotelId],
    queryFn: async () => {
      try {
        const response = await apiService.getEventSpacesByHotel(urlHotelId) as EventSpaceListResponse;
        
        if (response.success) {
          const eventSpaces = response.data || response.eventSpaces || [];
          return {
            eventSpaces: Array.isArray(eventSpaces) ? eventSpaces : [],
            total: response.count || response.total || eventSpaces.length,
            count: response.count || eventSpaces.length
          };
        }
        return { eventSpaces: [], total: 0, count: 0 };
      } catch (error: any) {
        console.error('Error fetching event spaces:', error);
        return { eventSpaces: [], total: 0, count: 0 };
      }
    },
    enabled: !!urlHotelId,
  });

  const eventSpacesList = eventSpacesResponse?.eventSpaces || [];
  const eventSpacesCount = eventSpacesResponse?.total || 0;

  const deleteEventSpaceMutation = useMutation({
    mutationFn: async (eventSpaceId: string) => {
      const response = await apiService.deleteEventSpace(eventSpaceId);
      
      if (!response.success) {
        throw new Error(response.error || 'Erro ao desativar espaço para eventos');
      }
      
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: 'Sucesso!',
        description: data.message || 'Espaço para eventos desativado com sucesso',
      });
      
      queryClient.invalidateQueries({ queryKey: ['hotel-event-spaces', urlHotelId] });
      queryClient.invalidateQueries({ queryKey: ['hotel', urlHotelId] });
      
      setDeletingEventSpaceId(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao desativar espaço para eventos',
        variant: 'destructive',
      });
      setDeletingEventSpaceId(null);
    },
  });

  const getEventSpaceName = (eventSpace: EventSpace) => {
    return eventSpace.name || 'Espaço para Eventos';
  };

  const getEventSpaceId = (eventSpace: EventSpace) => {
    return eventSpace.id || eventSpace.event_space_id || '';
  };

  const filteredEventSpaces = eventSpacesList.filter((eventSpace: EventSpace) => {
    const matchesSearch = searchTerm === '' || 
      getEventSpaceName(eventSpace).toLowerCase().includes(searchTerm.toLowerCase()) ||
      (eventSpace.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && eventSpace.is_active !== false) ||
      (statusFilter === 'inactive' && eventSpace.is_active === false);
    
    const matchesType = typeFilter === 'all' || eventSpace.space_type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const handleDeleteEventSpace = (eventSpaceId: string) => {
    if (!confirm('Tem certeza que deseja desativar este espaço para eventos?')) {
      return;
    }
    
    setDeletingEventSpaceId(eventSpaceId);
    deleteEventSpaceMutation.mutate(eventSpaceId);
  };

  const handleEditEventSpace = (eventSpaceId: string) => {
    setLocation(`/hotels/${urlHotelId}/event-spaces/${eventSpaceId}/edit`);
  };

  const handleViewEventSpace = (eventSpaceId: string) => {
    setLocation(`/hotels/${urlHotelId}/event-spaces/${eventSpaceId}`);
  };

  const handleAddEventSpace = () => {
    setLocation(`/hotels/${urlHotelId}/event-spaces/create`);
  };

  const isLoading = hotelLoading || eventSpacesLoading;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
          <div className="flex items-center space-x-4">
            <Link href={`/hotels/${urlHotelId}`}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Voltar para Hotel
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Espaços para Eventos</h1>
              <div className="flex items-center gap-2 mt-2">
                {hotel ? (
                  <>
                    <Building2 className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">{getHotelName(hotel)}</span>
                    <Badge variant={isHotelActive(hotel) ? 'default' : 'secondary'}>
                      {isHotelActive(hotel) ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </>
                ) : (
                  <span className="text-gray-600">Carregando hotel...</span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <Button 
              variant="outline" 
              onClick={() => refetch()} 
              disabled={isLoading}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Carregando...' : 'Atualizar'}
            </Button>
            <Button 
              onClick={handleAddEventSpace} 
              className="bg-purple-600 hover:bg-purple-700"
              disabled={!hotel || !isHotelActive(hotel)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo Espaço para Eventos
            </Button>
          </div>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Nome, descrição..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Ativos</SelectItem>
                    <SelectItem value="inactive">Inativos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Tipo de Espaço</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="conference">Conferência</SelectItem>
                    <SelectItem value="banquet">Banquete</SelectItem>
                    <SelectItem value="meeting">Reunião</SelectItem>
                    <SelectItem value="outdoor">Ar Livre</SelectItem>
                    <SelectItem value="ballroom">Salão de Festas</SelectItem>
                    <SelectItem value="theater">Teatro</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Estatísticas</Label>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm text-gray-600">Total:</span>
                  <span className="font-semibold">{eventSpacesCount}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando espaços para eventos...</p>
          </div>
        )}

        {error && !isLoading && (
          <Card className="mb-6">
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-red-100 rounded-full">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Erro ao carregar espaços para eventos
              </h3>
              <p className="text-gray-600 mb-6">
                {error instanceof Error ? error.message : 'Ocorreu um erro inesperado'}
              </p>
              <Button variant="outline" onClick={() => refetch()}>
                Tentar Novamente
              </Button>
            </CardContent>
          </Card>
        )}

        {!isLoading && !error && eventSpacesCount === 0 && (
          <Card className="mb-6">
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-purple-100 rounded-full">
                <Calendar className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhum espaço para eventos encontrado
              </h3>
              <p className="text-gray-600 mb-6">
                Este hotel ainda não possui espaços para eventos cadastrados. 
                Crie espaços como salas de conferência, salões de festas, ou áreas ao ar livre.
              </p>
              <Button 
                onClick={handleAddEventSpace} 
                className="bg-purple-600 hover:bg-purple-700"
                disabled={!hotel || !isHotelActive(hotel)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Primeiro Espaço
              </Button>
            </CardContent>
          </Card>
        )}

        {!isLoading && !error && filteredEventSpaces.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {filteredEventSpaces.map((eventSpace: EventSpace, index: number) => {
              const eventSpaceId = getEventSpaceId(eventSpace);
              const eventSpaceName = getEventSpaceName(eventSpace);
              const isActive = eventSpace.is_active !== false;

              return (
                <Card key={eventSpaceId || `eventspace-${index}`} className="hover:shadow-lg transition-shadow duration-200">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900 truncate">
                              {eventSpaceName}
                            </h3>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {SPACE_TYPE_LABELS[eventSpace.space_type] || eventSpace.space_type}
                          </Badge>
                          <p className="text-sm text-gray-600 line-clamp-2 mt-2">
                            {eventSpace.description || 'Sem descrição'}
                          </p>
                        </div>
                        {isActive ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Ativo
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <XCircle className="h-3 w-3 mr-1" />
                            Inativo
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center text-sm">
                            <Users className="h-4 w-4 text-gray-400 mr-1" />
                            <span>{eventSpace.capacity_min}-{eventSpace.capacity_max}</span>
                          </div>
                          <p className="text-xs text-gray-500">capacidade</p>
                        </div>
                        
                        {eventSpace.size_sqm && (
                          <div className="space-y-1">
                            <div className="flex items-center text-sm">
                              <Maximize2 className="h-4 w-4 text-gray-400 mr-1" />
                              <span>{eventSpace.size_sqm} m²</span>
                            </div>
                            <p className="text-xs text-gray-500">área</p>
                          </div>
                        )}
                        
                        {eventSpace.price_per_day && (
                          <div className="space-y-1">
                            <div className="flex items-center text-sm">
                              <DollarSign className="h-4 w-4 text-gray-400 mr-1" />
                              <span className="font-semibold">{formatPrice(eventSpace.price_per_day)}</span>
                            </div>
                            <p className="text-xs text-gray-500">por dia</p>
                          </div>
                        )}
                        
                        {eventSpace.price_per_hour && (
                          <div className="space-y-1">
                            <div className="flex items-center text-sm">
                              <DollarSign className="h-4 w-4 text-gray-400 mr-1" />
                              <span>{formatPrice(eventSpace.price_per_hour)}</span>
                            </div>
                            <p className="text-xs text-gray-500">por hora</p>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 pt-3 border-t">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => handleViewEventSpace(eventSpaceId)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => handleEditEventSpace(eventSpaceId)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Editar
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDeleteEventSpace(eventSpaceId)}
                          disabled={deletingEventSpaceId === eventSpaceId}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
