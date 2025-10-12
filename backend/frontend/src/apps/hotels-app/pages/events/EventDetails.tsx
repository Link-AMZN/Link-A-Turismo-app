import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/shared/hooks/useAuth';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Calendar, MapPin, Users, DollarSign, Edit } from 'lucide-react';
import { Link, useRoute } from 'wouter';

export default function EventDetails() {
  const { user } = useAuth();
  const [match, params] = useRoute("/events/:eventId");

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', params?.eventId],
    queryFn: async () => {
      const token = await user?.getIdToken?.();
      const response = await fetch(`/api/events/${params?.eventId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Falha ao carregar evento');
      }
      
      const result = await response.json();
      return result.data || result.event;
    },
    enabled: !!params?.eventId && !!user?.id
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          <span className="ml-2">Carregando evento...</span>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="text-center py-12">
            <h3 className="text-lg font-medium mb-2">Evento não encontrado</h3>
            <p className="text-gray-600 mb-4">
              O evento que você está procurando não existe ou não está disponível.
            </p>
            <Link href="/events">
              <Button variant="outline">
                Voltar para Lista de Eventos
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold">{event.title}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary">{event.eventType}</Badge>
            <Badge 
              variant={event.status === 'upcoming' ? 'default' : 'secondary'}
              className={event.status === 'upcoming' ? 'bg-green-100 text-green-800' : ''}
            >
              {event.status === 'upcoming' ? 'Próximo' : event.status}
            </Badge>
          </div>
        </div>
        <Link href={`/events/edit/${event.id}`}>
          <Button variant="outline">
            <Edit className="w-4 h-4 mr-2" />
            Editar
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Descrição do Evento</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">{event.description}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Detalhes do Evento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="font-medium">Localização</p>
                    <p className="text-gray-600">{event.venue}</p>
                    {event.address && (
                      <p className="text-sm text-gray-500">{event.address}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="font-medium">Data e Hora</p>
                    <p className="text-gray-600">
                      {new Date(event.startDate).toLocaleDateString()} - {new Date(event.endDate).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-500">
                      {event.startTime} - {event.endTime}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações de Ingressos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Preço:</span>
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    <span className="font-semibold text-lg">{event.ticketPrice} MT</span>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Bilhetes Vendidos:</span>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span className="font-semibold">{event.ticketsSold || 0}/{event.maxTickets}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Participantes:</span>
                  <span className="font-semibold">{event.currentAttendees || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ações</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button className="w-full bg-green-600 hover:bg-green-700">
                  Ver Participantes
                </Button>
                <Button variant="outline" className="w-full">
                  Relatório de Vendas
                </Button>
                <Link href="/events">
                  <Button variant="outline" className="w-full">
                    Voltar para Lista
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}