import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/shared/hooks/useAuth';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { useToast } from '@/shared/hooks/use-toast';
import { useLocation, useRoute } from 'wouter';

export default function EventEdit() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [match, params] = useRoute("/events/edit/:eventId");
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    eventType: 'festival',
    venue: '',
    startDate: '',
    endDate: '',
    startTime: '10:00',
    endTime: '18:00',
    ticketPrice: 0,
    maxTickets: 100
  });

  // Buscar dados do evento
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

  // Preencher formulário quando evento for carregado
  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title || '',
        description: event.description || '',
        eventType: event.eventType || 'festival',
        venue: event.venue || '',
        startDate: event.startDate?.split('T')[0] || '',
        endDate: event.endDate?.split('T')[0] || '',
        startTime: event.startTime || '10:00',
        endTime: event.endTime || '18:00',
        ticketPrice: event.ticketPrice || 0,
        maxTickets: event.maxTickets || 100
      });
    }
  }, [event]);

  const updateEventMutation = useMutation({
    mutationFn: async (data: any) => {
      const token = await user?.getIdToken?.();
      
      const response = await fetch(`/api/events/${params?.eventId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao atualizar evento');
      }

      return await response.json();
    },
    onSuccess: () => {
      toast({ title: 'Sucesso', description: 'Evento atualizado com sucesso!' });
      queryClient.invalidateQueries({ queryKey: ['user-events'] });
      queryClient.invalidateQueries({ queryKey: ['event', params?.eventId] });
      setLocation('/events');
    },
    onError: (error: any) => {
      toast({ 
        title: 'Erro', 
        description: error.message || 'Erro ao atualizar evento', 
        variant: 'destructive' 
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateEventMutation.mutate(formData);
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

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

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Editar Evento</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Título do Evento</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="eventType">Tipo de Evento</Label>
                  <Select
                    value={formData.eventType}
                    onValueChange={(value) => handleChange('eventType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="festival">Festival</SelectItem>
                      <SelectItem value="conference">Conferência</SelectItem>
                      <SelectItem value="workshop">Workshop</SelectItem>
                      <SelectItem value="concert">Concerto</SelectItem>
                      <SelectItem value="cultural">Cultural</SelectItem>
                      <SelectItem value="business">Negócios</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="venue">Local do Evento</Label>
                  <Input
                    id="venue"
                    value={formData.venue}
                    onChange={(e) => handleChange('venue', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    rows={4}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="startDate">Data de Início</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleChange('startDate', e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="startTime">Hora de Início</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => handleChange('startTime', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="endDate">Data de Fim</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => handleChange('endDate', e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="endTime">Hora de Fim</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => handleChange('endTime', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="ticketPrice">Preço do Bilhete (MT)</Label>
                <Input
                  id="ticketPrice"
                  type="number"
                  value={formData.ticketPrice}
                  onChange={(e) => handleChange('ticketPrice', e.target.value)}
                  min="0"
                />
              </div>

              <div>
                <Label htmlFor="maxTickets">Máximo de Bilhetes</Label>
                <Input
                  id="maxTickets"
                  type="number"
                  value={formData.maxTickets}
                  onChange={(e) => handleChange('maxTickets', e.target.value)}
                  min="1"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-6 border-t">
              <Button 
                type="submit" 
                className="bg-green-600 hover:bg-green-700"
                disabled={updateEventMutation.isPending}
              >
                {updateEventMutation.isPending ? 'Atualizando...' : 'Atualizar Evento'}
              </Button>
              <Button 
                type="button" 
                variant="outline"
                onClick={() => setLocation('/events')}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}