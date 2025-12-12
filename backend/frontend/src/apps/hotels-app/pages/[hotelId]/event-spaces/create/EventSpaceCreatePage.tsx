import { useState, useEffect } from 'react';
import { Link, useParams, useLocation } from 'wouter';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Switch } from '@/shared/components/ui/switch';
import { 
  ArrowLeft, 
  Users, 
  DollarSign, 
  Building2,
  Check,
  Save,
  AlertCircle,
  Loader2,
  Wifi,
  Tv,
  Wind,
  Mic,
  Monitor,
  Video,
  Coffee,
  Maximize2,
  Projector
} from 'lucide-react';
import { apiService } from '@/services/api';
import { useToast } from '@/shared/hooks/use-toast';
import { useHotelData } from '../../../../hooks/useHotelData';
import type { EventSpaceCreateRequest } from '@/types';

const SPACE_TYPES = [
  { value: 'conference', label: 'Sala de Conferência' },
  { value: 'banquet', label: 'Salão de Banquete' },
  { value: 'meeting', label: 'Sala de Reunião' },
  { value: 'outdoor', label: 'Espaço ao Ar Livre' },
  { value: 'ballroom', label: 'Salão de Festas' },
  { value: 'theater', label: 'Auditório/Teatro' },
  { value: 'other', label: 'Outro' },
];

const EVENT_AMENITIES = [
  { id: 'wifi', label: 'Wi-Fi', icon: <Wifi className="h-4 w-4" /> },
  { id: 'projector', label: 'Projetor', icon: <Projector className="h-4 w-4" /> },
  { id: 'screen', label: 'Tela de Projeção', icon: <Monitor className="h-4 w-4" /> },
  { id: 'sound-system', label: 'Sistema de Som', icon: <Mic className="h-4 w-4" /> },
  { id: 'microphone', label: 'Microfones', icon: <Mic className="h-4 w-4" /> },
  { id: 'video-conference', label: 'Videoconferência', icon: <Video className="h-4 w-4" /> },
  { id: 'tv-screens', label: 'TVs/Monitores', icon: <Tv className="h-4 w-4" /> },
  { id: 'air-conditioning', label: 'Ar Condicionado', icon: <Wind className="h-4 w-4" /> },
  { id: 'catering', label: 'Serviço de Catering', icon: <Coffee className="h-4 w-4" /> },
  { id: 'stage', label: 'Palco', icon: <Maximize2 className="h-4 w-4" /> },
  { id: 'dance-floor', label: 'Pista de Dança', icon: <Maximize2 className="h-4 w-4" /> },
  { id: 'lighting', label: 'Iluminação Profissional', icon: <Monitor className="h-4 w-4" /> },
];

export default function EventSpaceCreatePage() {
  const { hotelId: urlHotelId } = useParams<{ hotelId?: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  const { 
    hotel, 
    selectedHotelId, 
    selectHotelById, 
    isLoading: hotelLoading,
    getHotelName,
    isHotelActive,
  } = useHotelData(urlHotelId);

  useEffect(() => {
    if (urlHotelId && urlHotelId !== selectedHotelId) {
      selectHotelById(urlHotelId);
    }
  }, [urlHotelId, selectedHotelId, selectHotelById]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    spaceType: 'conference' as const,
    capacityMin: '10',
    capacityMax: '50',
    sizeSqm: '',
    pricePerHour: '',
    pricePerHalfDay: '',
    pricePerDay: '',
    isActive: true
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNumberInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = value === '' ? '' : Math.max(0, Number(value));
    setFormData(prev => ({ ...prev, [name]: String(numValue) }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const toggleAmenity = (amenityId: string) => {
    setSelectedAmenities(prev =>
      prev.includes(amenityId)
        ? prev.filter(id => id !== amenityId)
        : [...prev, amenityId]
    );
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast({ 
        title: 'Erro', 
        description: 'Nome do espaço é obrigatório', 
        variant: 'destructive' 
      });
      return false;
    }
    
    const capacityMin = Number(formData.capacityMin);
    const capacityMax = Number(formData.capacityMax);
    
    if (isNaN(capacityMin) || capacityMin <= 0) {
      toast({ 
        title: 'Erro', 
        description: 'Capacidade mínima deve ser maior que zero', 
        variant: 'destructive' 
      });
      return false;
    }
    
    if (isNaN(capacityMax) || capacityMax < capacityMin) {
      toast({ 
        title: 'Erro', 
        description: 'Capacidade máxima deve ser maior ou igual à mínima', 
        variant: 'destructive' 
      });
      return false;
    }
    
    if (!formData.pricePerHour && !formData.pricePerHalfDay && !formData.pricePerDay) {
      toast({ 
        title: 'Erro', 
        description: 'Defina pelo menos um preço (por hora, meio dia ou dia)', 
        variant: 'destructive' 
      });
      return false;
    }
    
    return true;
  };

  const createEventSpaceMutation = useMutation({
    mutationFn: async (eventSpaceData: EventSpaceCreateRequest) => {
      if (!urlHotelId) throw new Error('Hotel ID não encontrado');
      console.log('Creating event space:', { hotelId: urlHotelId, ...eventSpaceData });
      
      const response = await apiService.createEventSpace(urlHotelId, eventSpaceData);
      console.log('API response:', response);
      
      return response;
    },
    onSuccess: (response) => {
      console.log('Mutation success:', response);
      
      if (response.success) {
        toast({
          title: 'Sucesso!',
          description: 'Espaço para eventos criado com sucesso.',
        });

        queryClient.invalidateQueries({ queryKey: ['hotel-event-spaces', urlHotelId] });
        queryClient.invalidateQueries({ queryKey: ['hotel', urlHotelId] });

        setTimeout(() => {
          setLocation(`/hotels/${urlHotelId}/event-spaces`);
        }, 1500);
      } else {
        throw new Error(response.error || 'Erro ao criar espaço para eventos');
      }
    },
    onError: (error: Error) => {
      console.error('Mutation error:', error);
      toast({
        title: 'Erro ao criar espaço para eventos',
        description: error.message || 'Ocorreu um erro. Por favor, tente novamente.',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setLoading(false);
    }
  });

  const handleSubmit = async () => {
    console.log('Starting submit...');
    
    if (!validateForm() || !urlHotelId) {
      console.log('Validation failed or hotelId missing');
      return;
    }

    setLoading(true);

    try {
      const eventSpaceData: EventSpaceCreateRequest = {
        name: formData.name.trim(),
        description: formData.description?.trim() || undefined,
        spaceType: formData.spaceType,
        capacityMin: Number(formData.capacityMin),
        capacityMax: Number(formData.capacityMax),
        sizeSqm: formData.sizeSqm ? Number(formData.sizeSqm) : undefined,
        pricePerHour: formData.pricePerHour ? Number(formData.pricePerHour) : undefined,
        pricePerHalfDay: formData.pricePerHalfDay ? Number(formData.pricePerHalfDay) : undefined,
        pricePerDay: formData.pricePerDay ? Number(formData.pricePerDay) : undefined,
        amenities: selectedAmenities.length > 0 ? selectedAmenities : undefined,
        isActive: Boolean(formData.isActive),
      };

      console.log('Data for API:', eventSpaceData);
      
      await createEventSpaceMutation.mutateAsync(eventSpaceData);
      
    } catch (error: any) {
      console.error('Submit error:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao criar espaço para eventos',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

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
              Para criar espaços para eventos, você precisa selecionar um hotel.
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

  if (hotelLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando informações do hotel...</p>
        </div>
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full p-8 text-center bg-white rounded-lg shadow-lg border border-gray-200">
          <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-red-100 rounded-full">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Hotel Não Encontrado</h2>
          <p className="text-gray-600 mb-6">
            O hotel solicitado não existe ou você não tem acesso.
          </p>
          <Button onClick={() => setLocation('/hotels')} className="w-full">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Hotéis
          </Button>
        </div>
      </div>
    );
  }

  const hotelName = getHotelName(hotel);
  const isHotelActiveValue = isHotelActive(hotel);

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
              <h1 className="text-2xl font-bold text-gray-900">Criar Espaço para Eventos</h1>
              <div className="flex items-center gap-2 mt-1">
                <Building2 className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">Hotel: {hotelName}</span>
              </div>
            </div>
          </div>
          
          {!isHotelActiveValue && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800 flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" />
                <span>
                  <strong>Atenção:</strong> Este hotel está inativo.
                </span>
              </p>
            </div>
          )}
        </div>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building2 className="mr-2 h-5 w-5" />
                Informações do Espaço
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center">
                    Nome do Espaço *
                    {formData.name && (
                      <Check className="ml-2 h-4 w-4 text-green-500" />
                    )}
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Ex: Sala de Conferências A"
                    className="h-12"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="spaceType">Tipo de Espaço *</Label>
                  <Select
                    value={formData.spaceType}
                    onValueChange={(value) => handleSelectChange('spaceType', value)}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {SPACE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Descreva o espaço, suas características e diferenciais..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="capacityMin">Capacidade Mínima *</Label>
                  <Input
                    id="capacityMin"
                    name="capacityMin"
                    type="number"
                    min="1"
                    value={formData.capacityMin}
                    onChange={handleNumberInputChange}
                    placeholder="10"
                    className="h-12"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="capacityMax">Capacidade Máxima *</Label>
                  <Input
                    id="capacityMax"
                    name="capacityMax"
                    type="number"
                    min="1"
                    value={formData.capacityMax}
                    onChange={handleNumberInputChange}
                    placeholder="100"
                    className="h-12"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sizeSqm">Tamanho (m²)</Label>
                  <Input
                    id="sizeSqm"
                    name="sizeSqm"
                    type="number"
                    min="1"
                    value={formData.sizeSqm}
                    onChange={handleNumberInputChange}
                    placeholder="150"
                    className="h-12"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="mr-2 h-5 w-5" />
                Preços
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-sm text-gray-600">
                Defina pelo menos um tipo de preço para o espaço.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="pricePerHour">Preço por Hora (MT)</Label>
                  <Input
                    id="pricePerHour"
                    name="pricePerHour"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.pricePerHour}
                    onChange={handleNumberInputChange}
                    placeholder="500.00"
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pricePerHalfDay">Preço Meio Dia (MT)</Label>
                  <Input
                    id="pricePerHalfDay"
                    name="pricePerHalfDay"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.pricePerHalfDay}
                    onChange={handleNumberInputChange}
                    placeholder="2000.00"
                    className="h-12"
                  />
                  <p className="text-xs text-gray-500">4 horas</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pricePerDay">Preço por Dia (MT)</Label>
                  <Input
                    id="pricePerDay"
                    name="pricePerDay"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.pricePerDay}
                    onChange={handleNumberInputChange}
                    placeholder="5000.00"
                    className="h-12"
                  />
                  <p className="text-xs text-gray-500">8 horas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Mic className="mr-2 h-5 w-5" />
                Equipamentos e Comodidades
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {EVENT_AMENITIES.map((amenity) => {
                  const isSelected = selectedAmenities.includes(amenity.id);
                  return (
                    <button
                      key={amenity.id}
                      type="button"
                      onClick={() => toggleAmenity(amenity.id)}
                      className={`p-3 rounded-lg border-2 transition-all text-left flex flex-col items-center justify-center ${
                        isSelected
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="mb-2">{amenity.icon}</div>
                      <span className="font-medium text-xs text-center">{amenity.label}</span>
                      {isSelected && (
                        <Check className="h-4 w-4 mt-1 text-purple-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Configurações</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="isActive" className="text-base font-medium">
                    Espaço Ativo
                  </Label>
                  <p className="text-sm text-gray-500">
                    Espaços inativos não aparecem para reservas
                  </p>
                </div>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => handleSwitchChange('isActive', checked)}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4 justify-end">
            <Link href={`/hotels/${urlHotelId}/event-spaces`}>
              <Button variant="outline" size="lg">
                Cancelar
              </Button>
            </Link>
            <Button 
              onClick={handleSubmit}
              disabled={loading || createEventSpaceMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
              size="lg"
            >
              {loading || createEventSpaceMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Criar Espaço
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
