import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/shared/hooks/useAuth';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Plus, Calendar, MapPin, Users, DollarSign } from 'lucide-react';
import { Link } from 'wouter';

export default function EventList() {
  const { user } = useAuth();

  const { data: events, isLoading } = useQuery({
    queryKey: ['user-events', user?.id],
    queryFn: async () => {
      const token = await user?.getIdToken?.();
      const response = await fetch('/api/events/organizer/events', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Falha ao carregar eventos');
      }
      
      const result = await response.json();
      return result.data || [];
    },
    enabled: !!user?.id
  });

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Meus Eventos</h1>
          <p className="text-gray-600 mt-2">
            Gerencie todos os eventos criados no seu hotel
          </p>
        </div>
        <Link href="/events/create">
          <Button className="bg-green-600 hover:bg-green-700">
            <Plus className="w-4 h-4 mr-2" />
            Criar Evento
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          <span className="ml-2">Carregando eventos...</span>
        </div>
      ) : events && events.length > 0 ? (
        <div className="grid gap-6">
          {events.map((event: any) => (
            <Card key={event.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Calendar className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{event.title}</h3>
                        <Badge variant="secondary" className="mt-1">{event.eventType}</Badge>
                        <Badge 
                          variant={event.status === 'upcoming' ? 'default' : 'secondary'}
                          className={`ml-2 ${event.status === 'upcoming' ? 'bg-green-100 text-green-800' : ''}`}
                        >
                          {event.status === 'upcoming' ? 'Próximo' : event.status}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <p className="text-sm text-gray-700">{event.description}</p>
                      
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin className="h-4 w-4" />
                        <span className="text-sm">{event.venue}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm">
                          {new Date(event.startDate).toLocaleDateString()} - {new Date(event.endDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-1 text-gray-600">
                        <DollarSign className="h-4 w-4" />
                        <span className="font-semibold">{event.ticketPrice} MT</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-600">
                        <Users className="h-4 w-4" />
                        <span>{event.ticketsSold || 0}/{event.maxTickets} vendidos</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <span>{event.currentAttendees || 0} participantes</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2 ml-4">
                    <Link href={`/events/${event.id}`}>
                      <Button size="sm" variant="outline">
                        Ver Detalhes
                      </Button>
                    </Link>
                    <Link href={`/events/edit/${event.id}`}>
                      <Button size="sm" variant="outline">
                        Editar
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium mb-2">Nenhum evento criado</h3>
            <p className="text-gray-600 mb-4">
              Comece criando seu primeiro evento para atrair mais clientes ao seu hotel.
            </p>
            <Link href="/events/create">
              <Button className="bg-green-600 hover:bg-green-700">
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Evento
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}