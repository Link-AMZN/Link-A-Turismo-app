import { useEffect } from 'react';
import { Link, useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { 
  ArrowLeft, 
  Building2, 
  Edit, 
  Users, 
  DollarSign,
  Maximize2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  Clock,
  Wifi,
  Mic,
  Monitor,
  Coffee
} from 'lucide-react';
import { apiService } from '@/services/api';
import { useToast } from '@/shared/hooks/use-toast';
import { useHotelData } from '../../../../hooks/useHotelData';
import type { EventSpace } from '@/types';

const SPACE_TYPE_LABELS: Record<string, string> = {
  conference: 'Sala de Conferência',
  banquet: 'Salão de Banquete',
  meeting: 'Sala de Reunião',
  outdoor: 'Espaço ao Ar Livre',
  ballroom: 'Salão de Festas',
  theater: 'Auditório/Teatro',
  other: 'Outro'
};

const AMENITY_LABELS: Record<string, string> = {
  wifi: 'Wi-Fi',
  projector: 'Projetor',
  screen: 'Tela de Projeção',
  'sound-system': 'Sistema de Som',
  microphone: 'Microfones',
  'video-conference': 'Videoconferência',
  'tv-screens': 'TVs/Monitores',
  'air-conditioning': 'Ar Condicionado',
  catering: 'Serviço de Catering',
  stage: 'Palco',
  'dance-floor': 'Pista de Dança',
  lighting: 'Iluminação Profissional',
};

export default function EventSpaceDetailsPage() {
  const { hotelId: urlHotelId, eventSpaceId } = useParams<{ hotelId?: string; eventSpaceId?: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { 
    hotel, 
    selectedHotelId, 
    selectHotelById, 
    isLoading: hotelLoading,
    getHotelName,
    formatPrice,
  } = useHotelData(urlHotelId);

  useEffect(() => {
    if (urlHotelId && urlHotelId !== selectedHotelId) {
      selectHotelById(urlHotelId);
    }
  }, [urlHotelId, selectedHotelId, selectHotelById]);

  const { 
    data: eventSpace, 
    isLoading: eventSpaceLoading, 
    error 
  } = useQuery({
    queryKey: ['event-space', eventSpaceId],
    queryFn: async () => {
      if (!eventSpaceId) throw new Error('Event Space ID not found');
      
      const response = await apiService.getEventSpaceById(eventSpaceId);
      
      if (response.success && response.data) {
        return response.data as EventSpace;
      }
      
      throw new Error(response.error || 'Erro ao buscar espaço para eventos');
    },
    enabled: !!eventSpaceId,
  });

  if (!urlHotelId || !eventSpaceId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full p-8 text-center bg-white rounded-lg shadow-lg border border-gray-200">
          <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-yellow-100 rounded-full">
            <AlertCircle className="w-8 h-8 text-yellow-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Parâmetros Inválidos</h2>
          <p className="text-gray-600 mb-6">
            Hotel ou espaço para eventos não especificado.
          </p>
          <Button onClick={() => setLocation('/hotels')} className="w-full">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Hotéis
          </Button>
        </div>
      </div>
    );
  }

  const isLoading = hotelLoading || eventSpaceLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando detalhes do espaço...</p>
        </div>
      </div>
    );
  }

  if (error || !eventSpace) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full p-8 text-center bg-white rounded-lg shadow-lg border border-gray-200">
          <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-red-100 rounded-full">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Espaço Não Encontrado</h2>
          <p className="text-gray-600 mb-6">
            O espaço para eventos solicitado não existe ou você não tem acesso.
          </p>
          <Button onClick={() => setLocation(`/hotels/${urlHotelId}/event-spaces`)} className="w-full">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Espaços
          </Button>
        </div>
      </div>
    );
  }

  const isActive = eventSpace.is_active !== false;
  const amenities = eventSpace.amenities || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div className="flex items-center space-x-4">
            <Link href={`/hotels/${urlHotelId}/event-spaces`}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar para Espaços
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{eventSpace.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Building2 className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">Hotel: {hotel ? getHotelName(hotel) : 'Carregando...'}</span>
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
            </div>
          </div>
          
          <Link href={`/hotels/${urlHotelId}/event-spaces/${eventSpaceId}/edit`}>
            <Button className="bg-purple-600 hover:bg-purple-700">
              <Edit className="mr-2 h-4 w-4" />
              Editar Espaço
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informações Gerais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Tipo de Espaço</p>
                    <p className="font-medium">{SPACE_TYPE_LABELS[eventSpace.space_type] || eventSpace.space_type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Capacidade</p>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-gray-400" />
                      <p className="font-medium">{eventSpace.capacity_min} - {eventSpace.capacity_max} pessoas</p>
                    </div>
                  </div>
                  {eventSpace.size_sqm && (
                    <div>
                      <p className="text-sm text-gray-500">Área</p>
                      <div className="flex items-center gap-1">
                        <Maximize2 className="h-4 w-4 text-gray-400" />
                        <p className="font-medium">{eventSpace.size_sqm} m²</p>
                      </div>
                    </div>
                  )}
                </div>
                
                {eventSpace.description && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-gray-500 mb-2">Descrição</p>
                    <p className="text-gray-700">{eventSpace.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {amenities.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Equipamentos e Comodidades</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {amenities.map((amenity: string, index: number) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-purple-50 rounded-lg">
                        <CheckCircle className="h-4 w-4 text-purple-600" />
                        <span className="text-sm font-medium">{AMENITY_LABELS[amenity] || amenity}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="mr-2 h-5 w-5" />
                  Preços
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {eventSpace.price_per_hour && (
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">Por Hora</span>
                    </div>
                    <span className="font-bold text-lg">{formatPrice(eventSpace.price_per_hour)}</span>
                  </div>
                )}
                
                {eventSpace.price_per_half_day && (
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">Meio Dia (4h)</span>
                    </div>
                    <span className="font-bold text-lg">{formatPrice(eventSpace.price_per_half_day)}</span>
                  </div>
                )}
                
                {eventSpace.price_per_day && (
                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg border-2 border-purple-200">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium text-purple-700">Dia Inteiro (8h)</span>
                    </div>
                    <span className="font-bold text-xl text-purple-700">{formatPrice(eventSpace.price_per_day)}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Informações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Criado em</span>
                  <span>{eventSpace.created_at ? new Date(eventSpace.created_at).toLocaleDateString('pt-BR') : '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Atualizado em</span>
                  <span>{eventSpace.updated_at ? new Date(eventSpace.updated_at).toLocaleDateString('pt-BR') : '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">ID</span>
                  <span className="font-mono text-xs">{eventSpace.id}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
