import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../../shared/hooks/useAuth';
import { Button } from '../../../../shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../../shared/components/ui/card';
import { Input } from '../../../../shared/components/ui/input';
import { Label } from '../../../../shared/components/ui/label';
import { Textarea } from '../../../../shared/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../shared/components/ui/select';
import { useToast } from '../../../../shared/hooks/use-toast';
import { useLocation } from 'wouter';

export default function EventCreate() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    eventType: 'festival',
    venue: '',
    address: '',
    startDate: '',
    endDate: '',
    startTime: '10:00',
    endTime: '18:00',
    ticketPrice: 0,
    maxTickets: 100,
    category: 'festival'
  });

  const createEventMutation = useMutation({
    mutationFn: async (data: any) => {
      const token = await user?.getIdToken?.();
      
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: data.title,
          description: data.description,
          eventType: data.eventType,
          category: data.eventType,
          venue: data.venue,
          address: data.venue,
          startDate: data.startDate,
          endDate: data.endDate,
          startTime: data.startTime || '10:00',
          endTime: data.endTime || '18:00',
          ticketPrice: Number(data.ticketPrice) || 0,
          maxTickets: Number(data.maxTickets) || 100,
          isPublic: true,
          requiresApproval: false,
          images: [],
          tags: []
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao criar evento');
      }

      return await response.json();
    },
    onSuccess: () => {
      toast({ title: 'Sucesso', description: 'Evento criado com sucesso!' });
      queryClient.invalidateQueries({ queryKey: ['user-events'] });
      setLocation('/events');
    },
    onError: (error: any) => {
      toast({ 
        title: 'Erro', 
        description: error.message || 'Erro ao criar evento', 
        variant: 'destructive' 
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createEventMutation.mutate(formData);
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Criar Novo Evento</CardTitle>
          <CardDescription>
            Preencha os detalhes do seu evento para atrair mais clientes ao seu hotel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Título do Evento *</Label>
                  <Input
                    id="title"
                    placeholder="ex: Festival de Verão na Praia"
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="eventType">Tipo de Evento *</Label>
                  <Select
                    value={formData.eventType}
                    onValueChange={(value) => handleChange('eventType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar tipo" />
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
                  <Label htmlFor="venue">Local do Evento *</Label>
                  <Input
                    id="venue"
                    placeholder="ex: Costa do Sol Beach, Maputo"
                    value={formData.venue}
                    onChange={(e) => handleChange('venue', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="description">Descrição do Evento</Label>
                  <Textarea
                    id="description"
                    placeholder="Descreva o evento, atrações principais, público-alvo..."
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
                  <Label htmlFor="startDate">Data de Início *</Label>
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
                  <Label htmlFor="endDate">Data de Fim *</Label>
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
                  placeholder="0 para evento gratuito"
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
                  placeholder="100"
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
                disabled={createEventMutation.isPending}
              >
                {createEventMutation.isPending ? 'Criando...' : 'Criar Evento'}
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