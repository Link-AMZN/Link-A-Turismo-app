import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/shared/hooks/useAuth';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Switch } from '@/shared/components/ui/switch';
import { 
  Hotel, 
  Plus, 
  MapPin, 
  Users, 
  TrendingUp,
  Star,
  DollarSign,
  UserCheck,
  Handshake,
  BarChart3,
  MessageCircle,
  Edit,
  Save,
  Calendar,
  Eye,
  Settings,
  PartyPopper,
  Send,
  Clock,
  Building2,
  Home,
  Trash2,
  RefreshCw,
  Loader2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import LocationAutocomplete from '@/shared/components/LocationAutocomplete';
import apiService from '@/services/api';
import { useToast } from '@/shared/hooks/use-toast';
import HotelCreationWizard from '@/components/hotel-wizard/HotelCreationWizard';
import { HotelFormData } from '@/components/hotel-wizard/types';

// ✅ CORREÇÃO: SafeNumber helper para garantir valores numéricos
const SafeNumber = {
  toNumber: (value: any, defaultValue: number = 0): number => {
    if (value === null || value === undefined || value === '') return defaultValue;
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
  },
  toInt: (value: any, defaultValue: number = 0): number => {
    return Math.floor(SafeNumber.toNumber(value, defaultValue));
  },
  toFloat: (value: any, defaultValue: number = 0): number => {
    return SafeNumber.toNumber(value, defaultValue);
  }
};

// Define the API response structure
interface ApiResponse {
  success: boolean;
  data: any[];
}

// ✅ ATUALIZADO: Interface para compatibilidade com backend
interface HotelEvent {
  id: string;
  title: string;
  description: string;
  eventType: string;
  category: string;
  venue: string;
  address: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  ticketPrice: number;
  maxTickets: number;
  ticketsSold: number;
  currentAttendees: number;
  status: string;
  organizerId: string;
  isPublic: boolean;
  requiresApproval: boolean;
  isPaid: boolean;
  images: string[];
  tags: string[];
  createdAt?: string;
  updatedAt?: string;
}

interface HotelStats {
  totalBookings: number;
  monthlyRevenue: number;
  averageRating: number;
  averageOccupancy: number;
  totalEvents: number;
  upcomingEvents: number;
  activeEvents: number;
  activePartnerships: number;
  partnershipEarnings: number;
  totalRoomTypes: number;
  totalRooms: number;
  availableRooms: number;
}

// ✅ CORREÇÃO: Interfaces para parcerias corrigidas
interface Partnership {
  id: string;
  title: string;
  description: string;
  commission: number;
  benefits: string[];
  requirements: string[];
  targetRoutes: string[];
  status: 'active' | 'inactive' | 'pending';
  createdAt: string;
  hotelId: string;
  driverCount?: number;
  totalEarnings?: number;
}

interface DriverPartnership {
  id: string;
  driverId: string;
  driverName: string;
  route: string;
  commission: number;
  clientsBrought: number;
  totalEarnings: number;
  lastMonthEarnings: number;
  rating: number;
  joinedDate: string;
  status: 'active' | 'pending' | 'ended';
  partnershipId: string;
  contactInfo?: string;
}

// ✅ CORREÇÃO: PartnershipFormData com tipos corretos
interface PartnershipFormData {
  title: string;
  description: string;
  commission: number;
  benefits: string;
  requirements: string;
  targetRoutes: string[];
  status?: 'active';
}

interface ChatMessage {
  id: number;
  sender: string;
  message: string;
  time: string;
  isHotel: boolean;
}

interface Hotel {
  id: string;
  userId: string;
  name: string;
  description: string;
  address: string;
  contactEmail: string;
  contactPhone: string;
  amenities: string[];
  images: string[];
  rating?: number;
  reviewCount?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface RoomType {
  id: string;
  hotelId: string;
  name: string;
  type: string;
  description?: string;
  pricePerNight: number;
  totalRooms: number;
  availableRooms: number;
  maxGuests: number;
  images?: string[];
  amenities?: string[];
  size?: number;
  bedType?: string;
  hasBalcony: boolean;
  hasSeaView: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ✅ ADICIONADO: Configuração de paginação
const EVENTS_PER_PAGE = 5;

// ✅ CORREÇÃO: Hook customizado para gestão de quartos - VERSÃO CORRIGIDA
const useHotelRooms = (hotelId: string | null) => {
  const [rooms, setRooms] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchRooms = useCallback(async (id: string) => {
    if (!id) return [];
    
    try {
      setLoading(true);
      console.log(`🔄 Buscando quartos para hotel: ${id}`);
      const response = await fetch(`/api/hotels/${id}/rooms`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📦 Dados recebidos da API:', data);
        
        // ✅ CORREÇÃO: Múltiplas formas de acessar os dados
        let roomsData = [];
        
        if (data.rooms && Array.isArray(data.rooms)) {
          roomsData = data.rooms;
        } else if (data.data?.rooms && Array.isArray(data.data.rooms)) {
          roomsData = data.data.rooms;
        } else if (data.data && Array.isArray(data.data)) {
          roomsData = data.data;
        } else if (Array.isArray(data)) {
          roomsData = data;
        }
        
        console.log(`✅ ${roomsData.length} quartos carregados`);
        return roomsData;
      } else {
        console.error('❌ Erro na resposta da API:', response.status);
        toast({
          title: 'Erro',
          description: `Falha ao carregar quartos (${response.status})`,
          variant: 'destructive',
        });
      }
      return [];
    } catch (error) {
      console.error('❌ Erro ao buscar quartos:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao conectar com o servidor',
        variant: 'destructive',
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (hotelId) {
      console.log(`🏨 Hotel selecionado mudou: ${hotelId}`);
      fetchRooms(hotelId).then(rooms => {
        console.log(`🎯 Quartos definidos no estado:`, rooms);
        setRooms(rooms);
      });
    } else {
      console.log('🏨 Nenhum hotel selecionado, limpando quartos');
      setRooms([]);
    }
  }, [hotelId, fetchRooms]);

  const refetch = useCallback(() => {
    if (hotelId) {
      console.log('🔄 Recarregando quartos...');
      fetchRooms(hotelId).then(setRooms);
    }
  }, [hotelId, fetchRooms]);

  return { rooms, loading, refetch };
};

// ✅ CORREÇÃO: Helper para atualização de estado
const useFormState = <T,>(initialState: T) => {
  const [form, setForm] = useState<T>(initialState);

  const updateForm = useCallback((updates: Partial<T>) => {
    setForm(prev => ({ ...prev, ...updates }));
  }, []);

  const resetForm = useCallback(() => {
    setForm(initialState);
  }, [initialState]);

  return { form, updateForm, resetForm, setForm };
};

// ✅ CORREÇÃO: Interface LocalAppUser para resolver erro do uid
interface LocalAppUser {
  uid: string;
  id?: string;
  email?: string;
  getIdToken?: () => Promise<string>;
}

export default function HotelsHome() {
  const { user } = useAuth() as { user: LocalAppUser | null };
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // ✅ CORREÇÃO: Estados unificados e simplificados
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedChat, setSelectedChat] = useState<number | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [selectedHotelId, setSelectedHotelId] = useState<string | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<RoomType | null>(null);
  const [wizardMode, setWizardMode] = useState<'create' | 'edit'>('create');
  
  // ✅ CORREÇÃO: Estados modais unificados
  const [modals, setModals] = useState({
    createRoom: false,
    createEvent: false,
    createPartnership: false,
    editHotel: false
  });

  // ✅ ADICIONADO: Estado para modal de edição rápida
  const [quickEditModal, setQuickEditModal] = useState<{
    open: boolean;
    room: RoomType | null;
  }>({
    open: false,
    room: null
  });

  // ✅ ADICIONADO: Estado para modal de eliminação
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    room: RoomType | null;
  }>({
    open: false,
    room: null
  });

  // ✅ ADICIONADO: Estados para gestão de eventos
  const [editEventModalOpen, setEditEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<HotelEvent | null>(null);
  const [deleteEventModalOpen, setDeleteEventModalOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<HotelEvent | null>(null);

  // ✅ ADICIONADO: Estados para paginação
  const [currentEventsPage, setCurrentEventsPage] = useState(1);

  // ✅ ADICIONADO: Estado para controlar visibilidade do cadastro
  const [showHotelCreation, setShowHotelCreation] = useState(false);

  // ✅ ADICIONADO: Estado para controlar edição de parceria
  const [editingPartnership, setEditingPartnership] = useState<Partnership | null>(null);

  // ✅ CORREÇÃO CRÍTICA: Estados inicializados como arrays vazios em vez de undefined
  const [hotelPartnerships, setHotelPartnerships] = useState<any[]>([]);
  const [driverPartnerships, setDriverPartnerships] = useState<any[]>([]);

  const toggleModal = useCallback((modal: keyof typeof modals, isOpen: boolean) => {
    setModals(prev => ({ ...prev, [modal]: isOpen }));
  }, []);

  // ✅ CORREÇÃO: Form states usando helper
  const roomForm = useFormState({
    name: '',
    type: 'standard',
    description: '',
    pricePerNight: 0,
    totalRooms: 1,
    maxGuests: 2,
    amenities: [] as string[],
    bedType: 'Cama de Casal',
    hasBalcony: false,
    hasSeaView: false,
    size: 25
  });

  const hotelForm = useFormState({
    name: '',
    address: '',
    description: '',
    contactEmail: '',
    contactPhone: '',
    amenities: [] as string[],
    images: [] as string[],
    isActive: true
  });

  const eventForm = useFormState({
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

  // ✅ CORREÇÃO: Partnership form com tipos corretos (string em vez de array)
  const partnershipForm = useFormState({
    title: '',
    description: '',
    commission: 10,
    benefits: '',
    requirements: '',
    targetRoutes: [] as string[]
  });

  // ✅ CORREÇÃO: Hook customizado para quartos
  const { rooms: hotelRooms, loading: roomsLoading, refetch: refetchRooms } = useHotelRooms(selectedHotelId);

  // ✅ CORREÇÃO: Query para buscar hotéis do usuário
  const { data: userHotels, isLoading: hotelsLoading } = useQuery<Hotel[], Error>({
    queryKey: ['user-hotels', user?.id],
    queryFn: async (): Promise<Hotel[]> => {
      try {
        console.log('Fetching user hotels for user:', user?.id);
        const response = await apiService.getUserAccommodations() as unknown as ApiResponse;
        console.log('API response:', response);
        
        if (!response.success || !Array.isArray(response.data)) {
          console.error('Invalid API response structure:', response);
          throw new Error('Invalid response structure from API');
        }

        const hotels = response.data
          .filter((acc: any) => acc.type === 'hotel')
          .map((acc: any) => ({
            id: acc.id,
            userId: user?.id || '',
            name: acc.name,
            description: acc.description || 'Hotel de qualidade com excelente localização',
            address: acc.address || 'Endereço não definido',
            contactEmail: acc.contactEmail || user?.email || '',
            contactPhone: acc.contactPhone || '',
            amenities: acc.amenities || [],
            images: acc.images || [],
            isActive: acc.isAvailable !== false,
            createdAt: acc.createdAt || '2024-01-01',
            updatedAt: acc.updatedAt || '2024-09-07',
          }));
        
        console.log('Processed hotels:', hotels);
        return hotels;
      } catch (error) {
        console.error('Error fetching hotels:', error);
        toast({
          title: 'Erro',
          description: 'Falha ao carregar hotéis',
          variant: 'destructive',
        });
        return [];
      }
    },
    enabled: !!user?.id,
    retry: false,
  });

  // ✅ CORREÇÃO CRÍTICA: userHotel definido ANTES de ser usado
  const userHotel = useMemo(() => {
    if (!userHotels || userHotels.length === 0) return null;
    return userHotels.find((hotel: Hotel) => hotel.id === selectedHotelId) || userHotels[0];
  }, [userHotels, selectedHotelId]);

  // ✅ CORREÇÃO: Mutations atualizadas para incluir autenticação
  const updateRoomMutation = useMutation({
    mutationFn: async ({ roomId, roomData }: { roomId: string; roomData: any }) => {
      const token = await user?.getIdToken?.();
      
      const response = await fetch(`/api/hotels/${userHotel?.id}/rooms/${roomId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(roomData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao atualizar quarto');
      }

      return await response.json();
    },
    onSuccess: () => {
      toast({ title: 'Sucesso', description: 'Quarto atualizado com sucesso!' });
      refetchRooms();
    },
    onError: (error: any) => {
      toast({ title: 'Erro', description: error.message || 'Erro ao atualizar quarto', variant: 'destructive' });
    }
  });

  const deleteRoomMutation = useMutation({
    mutationFn: async (roomId: string) => {
      const token = await user?.getIdToken?.();
      
      const response = await fetch(`/api/hotels/${userHotel?.id}/rooms/${roomId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao eliminar quarto');
      }

      return await response.json();
    },
    onSuccess: () => {
      toast({ title: 'Sucesso', description: 'Quarto eliminado com sucesso!' });
      refetchRooms();
    },
    onError: (error: any) => {
      toast({ title: 'Erro', description: error.message || 'Erro ao eliminar quarto', variant: 'destructive' });
    }
  });

  // ✅ CORREÇÃO: Query para buscar eventos do usuário atual
  const { data: userEvents, isLoading: eventsLoading, refetch: refetchEvents } = useQuery({
    queryKey: ['user-events', user?.id],
    queryFn: async () => {
      const token = await user?.getIdToken?.();
      console.log("📋 FRONTEND: Buscando eventos do organizador...");
      
      const response = await fetch('/api/events/organizer/events', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        console.error("❌ FRONTEND: Erro ao buscar eventos");
        throw new Error('Falha ao carregar eventos');
      }
      
      const result = await response.json();
      console.log(`✅ FRONTEND: Encontrados ${result.data?.length || 0} eventos`);
      return result.data || [];
    },
    enabled: !!user?.id
  });

  // ✅ CORREÇÃO CRÍTICA: Query para buscar parcerias do hotel - INICIALIZAÇÃO CORRETA
  const { isLoading: partnershipsLoading, refetch: refetchPartnerships } = useQuery({
    queryKey: ['hotel-partnerships', userHotel?.id],
    queryFn: async () => {
      if (!userHotel?.id) return [];
      
      const token = await user?.getIdToken?.();
      console.log('🔄 Buscando parcerias do hotel...');
      
      const response = await fetch(`/api/hotels/${userHotel.id}/partnerships`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        console.log('❌ API de parcerias não disponível ou erro:', response.status);
        return [];
      }

      const result = await response.json();
      console.log('✅ Parcerias carregadas:', result);
      const partnerships = result.data || result || [];
      setHotelPartnerships(partnerships); // ✅ CORREÇÃO: Atualiza estado local
      return partnerships;
    },
    enabled: !!userHotel?.id
  });

  // ✅ CORREÇÃO CRÍTICA: Query para buscar motoristas parceiros - INICIALIZAÇÃO CORRETA
  const { isLoading: driversLoading } = useQuery({
    queryKey: ['driver-partnerships', userHotel?.id],
    queryFn: async () => {
      if (!userHotel?.id) return [];
      
      const token = await user?.getIdToken?.();
      console.log('🔄 Buscando motoristas parceiros...');
      
      const response = await fetch(`/api/hotels/${userHotel.id}/driver-partnerships`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        console.log('❌ Não foi possível buscar motoristas parceiros:', response.status);
        return [];
      }

      const result = await response.json();
      console.log('✅ Motoristas parceiros carregados:', result);
      const drivers = result.data || result || [];
      setDriverPartnerships(drivers); // ✅ CORREÇÃO: Atualiza estado local
      return drivers;
    },
    enabled: !!userHotel?.id
  });

  // ✅ SOLUÇÃO 1 APLICADA: Mutation para criar parceria - ENDPOINT CORRETO
  const createPartnershipMutation = useMutation({
    mutationFn: async (partnershipData: PartnershipFormData) => {
      const token = await user?.getIdToken?.();
      
      console.log('🎯 Criando nova parceria:', partnershipData);
      
      // ✅ SOLUÇÃO 1: Usando o endpoint correto que você implementou
      const response = await fetch(`/api/hotels/${userHotel?.id}/partnerships`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: partnershipData.title,
          description: partnershipData.description,
          commission: SafeNumber.toInt(partnershipData.commission),
          benefits: partnershipData.benefits ? partnershipData.benefits.split(',').map((b: string) => b.trim()).filter(Boolean) : [],
          requirements: partnershipData.requirements ? partnershipData.requirements.split(',').map((r: string) => r.trim()).filter(Boolean) : [],
          targetRoutes: partnershipData.targetRoutes,
          status: 'active'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Falha ao criar parceria');
      }

      const result = await response.json();
      console.log('✅ Parceria criada com sucesso:', result);
      return result;
    },
    onSuccess: () => {
      toast({ title: 'Sucesso', description: 'Parceria criada com sucesso!' });
      toggleModal('createPartnership', false);
      partnershipForm.resetForm();
      refetchPartnerships(); // ✅ CORREÇÃO: Recarrega as parcerias
    },
    onError: (error: any) => {
      console.error('❌ Erro ao criar parceria:', error);
      toast({ 
        title: 'Erro', 
        description: error.message || 'Erro ao criar parceria', 
        variant: 'destructive' 
      });
    }
  });

  // ✅ ADICIONADO: Mutation para editar parceria
  const updatePartnershipMutation = useMutation({
    mutationFn: async ({ partnershipId, partnershipData }: { partnershipId: string; partnershipData: any }) => {
      const token = await user?.getIdToken?.();
      
      console.log('🎯 Atualizando parceria:', partnershipId, partnershipData);
      
      // ✅ SOLUÇÃO 1: Usando o endpoint correto que você implementou
      const response = await fetch(`/api/partnerships/proposals/${partnershipId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(partnershipData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Falha ao atualizar parceria');
      }

      return await response.json();
    },
    onSuccess: () => {
      toast({ title: 'Sucesso', description: 'Parceria atualizada com sucesso!' });
      toggleModal('createPartnership', false);
      partnershipForm.resetForm();
      refetchPartnerships(); // ✅ CORREÇÃO: Recarrega as parcerias
    },
    onError: (error: any) => {
      toast({ 
        title: 'Erro', 
        description: error.message || 'Erro ao atualizar parceria', 
        variant: 'destructive' 
      });
    }
  });

  // ✅ CORREÇÃO: Handler para editar parceria existente
  const handleEditPartnership = useCallback((partnership: Partnership) => {
    partnershipForm.setForm({
      title: partnership.title,
      description: partnership.description,
      commission: partnership.commission,
      benefits: Array.isArray(partnership.benefits) ? partnership.benefits.join(', ') : partnership.benefits || '',
      requirements: Array.isArray(partnership.requirements) ? partnership.requirements.join(', ') : partnership.requirements || '',
      targetRoutes: partnership.targetRoutes || []
    });
    
    // Armazenar o ID da parceria sendo editada
    setEditingPartnership(partnership);
    toggleModal('createPartnership', true);
  }, [partnershipForm, toggleModal]);

  // ✅ CORREÇÃO: Handler para salvar parceria (criar ou editar)
  const handleSavePartnership = useCallback(() => {
    if (!partnershipForm.form.title.trim()) {
      toast({ title: "Erro", description: "Título da parceria é obrigatório", variant: "destructive" });
      return;
    }

    if (!partnershipForm.form.commission || SafeNumber.toInt(partnershipForm.form.commission) <= 0) {
      toast({ title: "Erro", description: "Comissão deve ser maior que zero", variant: "destructive" });
      return;
    }

    const partnershipData: PartnershipFormData = {
      title: partnershipForm.form.title,
      description: partnershipForm.form.description,
      commission: SafeNumber.toInt(partnershipForm.form.commission),
      benefits: partnershipForm.form.benefits,
      requirements: partnershipForm.form.requirements,
      targetRoutes: partnershipForm.form.targetRoutes,
      status: 'active'
    };

    if (editingPartnership) {
      // Editar parceria existente
      updatePartnershipMutation.mutate({
        partnershipId: editingPartnership.id,
        partnershipData
      });
    } else {
      // Criar nova parceria
      createPartnershipMutation.mutate(partnershipData);
    }
  }, [partnershipForm.form, editingPartnership, createPartnershipMutation, updatePartnershipMutation, toast]);

  // ✅ CORREÇÃO: Reset do estado de edição quando fechar modal
  useEffect(() => {
    if (!modals.createPartnership) {
      setEditingPartnership(null);
      partnershipForm.resetForm();
    }
  }, [modals.createPartnership]);

  // ✅ CORREÇÃO: Mutation para criar eventos
  const createEventMutation = useMutation({
    mutationFn: async (data: any) => {
      const token = await user?.getIdToken?.();
      
      console.log("🎯 FRONTEND: Enviando dados para criar evento:", data);
      
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
          images: data.images || [],
          tags: data.tags || []
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("❌ FRONTEND: Erro na resposta:", errorData);
        throw new Error(errorData.message || 'Falha ao criar evento');
      }

      const result = await response.json();
      console.log("✅ FRONTEND: Evento criado com sucesso:", result);
      return result;
    },
    onSuccess: () => {
      toast({ title: 'Sucesso', description: 'Evento criado com sucesso!' });
      toggleModal('createEvent', false);
      eventForm.resetForm();
      queryClient.invalidateQueries({ queryKey: ['user-events'] });
      setCurrentEventsPage(1);
    },
    onError: (error: any) => {
      console.error("❌ FRONTEND: Erro ao criar evento:", error);
      toast({ 
        title: 'Erro', 
        description: error.message || 'Erro ao criar evento', 
        variant: 'destructive' 
      });
    }
  });

  // ✅ CORREÇÃO: Mutation para atualizar eventos
  const updateEventMutation = useMutation({
    mutationFn: async (eventData: Partial<HotelEvent>) => {
      const token = await user?.getIdToken?.();
      
      console.log("🎯 FRONTEND: Atualizando evento:", eventData);
      
      const response = await fetch(`/api/events/${eventData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: eventData.title,
          description: eventData.description,
          eventType: eventData.eventType,
          category: eventData.eventType,
          venue: eventData.venue,
          address: eventData.venue,
          startDate: eventData.startDate,
          endDate: eventData.endDate,
          startTime: eventData.startTime,
          endTime: eventData.endTime,
          ticketPrice: SafeNumber.toFloat(eventData.ticketPrice) || 0,
          maxTickets: SafeNumber.toInt(eventData.maxTickets) || 100,
          ticketsSold: SafeNumber.toInt(eventData.ticketsSold) || 0,
          status: eventData.status,
        }),
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
      queryClient.refetchQueries({ queryKey: ['user-events'] });
      setEditEventModalOpen(false);
      setEditingEvent(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao atualizar o evento',
        variant: 'destructive',
      });
    },
  });

  // ✅ ADICIONADO: Mutation para eliminar eventos
  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const token = await user?.getIdToken?.();
      
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao eliminar evento');
      }

      return await response.json();
    },
    onSuccess: () => {
      toast({ title: 'Sucesso', description: 'Evento eliminado com sucesso!' });
      queryClient.invalidateQueries({ queryKey: ['user-events'] });
      setDeleteEventModalOpen(false);
      setEventToDelete(null);
      if (paginatedEvents.length === 1 && currentEventsPage > 1) {
        setCurrentEventsPage(prev => prev - 1);
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao eliminar o evento',
        variant: 'destructive',
      });
    },
  });

  // ✅ CORREÇÃO: Mutation para criar quarto
  const createRoomMutation = useMutation({
    mutationFn: async (roomData: typeof roomForm.form) => {
      if (!userHotel?.id) {
        throw new Error('Hotel não selecionado');
      }

      const token = await user?.getIdToken?.();

      const response = await fetch(`/api/hotels/${userHotel.id}/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          accommodationId: userHotel.id,
          roomNumber: `Room-${Date.now()}`,
          roomType: roomData.type,
          description: roomData.description,
          pricePerNight: SafeNumber.toFloat(roomData.pricePerNight),
          maxOccupancy: SafeNumber.toInt(roomData.maxGuests),
          bedType: roomData.bedType,
          bedCount: 1,
          hasPrivateBathroom: true,
          hasAirConditioning: roomData.type === 'deluxe' || roomData.type === 'suite',
          hasWifi: true,
          hasTV: true,
          hasBalcony: roomData.hasBalcony,
          hasKitchen: roomData.type === 'suite',
          amenities: roomData.amenities,
          images: [],
          isAvailable: true,
          status: 'available'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao criar quarto');
      }

      return await response.json();
    },
    onSuccess: (result) => {
      if (result.success) {
        toast({ title: 'Sucesso', description: 'Quarto criado com sucesso!' });
        toggleModal('createRoom', false);
        roomForm.resetForm();
        refetchRooms();
      } else {
        toast({ title: 'Erro', description: result.error || 'Falha ao criar quarto', variant: 'destructive' });
      }
    },
    onError: (error: any) => {
      toast({ title: 'Erro', description: error.message || 'Erro ao criar quarto', variant: 'destructive' });
    }
  });

  // ✅ CORREÇÃO: Mutation para atualizar hotel
  const updateHotelMutation = useMutation({
    mutationFn: async (hotelData: Partial<Hotel>) => {
      return await apiService.updateHotel(userHotel!.id, {
        name: hotelData.name,
        address: hotelData.address,
        description: hotelData.description,
        contactEmail: hotelData.contactEmail,
        contactPhone: hotelData.contactPhone,
        amenities: hotelData.amenities,
        images: hotelData.images,
        isActive: hotelData.isActive,
      });
    },
    onSuccess: () => {
      toast({ title: 'Sucesso', description: 'Hotel atualizado com sucesso!' });
      toggleModal('editHotel', false);
      queryClient.invalidateQueries({ queryKey: ['user-hotels'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao atualizar hotel',
        variant: 'destructive',
      });
    },
  });

  // ✅ ADICIONADO: Botão para recarregar eventos
  const reloadEvents = () => {
    refetchEvents();
    setCurrentEventsPage(1);
    toast({ title: 'Eventos atualizados', description: 'Lista de eventos atualizada com sucesso!' });
  };

  // ✅ ADICIONADO: Handlers para as ações de eventos
  const handleEditEvent = (event: HotelEvent) => {
    console.log('Editing event:', event);
    setEditingEvent(event);
    setEditEventModalOpen(true);
  };

  const handleUpdateEvent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingEvent) return;

    const formData = new FormData(e.currentTarget);
    const updatedEvent = {
      id: editingEvent.id,
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      eventType: formData.get('eventType') as string,
      venue: formData.get('venue') as string,
      startDate: formData.get('startDate') as string,
      endDate: formData.get('endDate') as string,
      startTime: formData.get('startTime') as string,
      endTime: formData.get('endTime') as string,
      ticketPrice: SafeNumber.toFloat(formData.get('ticketPrice') as string),
      maxTickets: SafeNumber.toInt(formData.get('maxTickets') as string),
      ticketsSold: SafeNumber.toInt(formData.get('ticketsSold') as string),
      status: formData.get('status') as string,
    };

    updateEventMutation.mutate(updatedEvent);
  };

  const handleOpenDeleteConfirmation = (event: HotelEvent) => {
    setEventToDelete(event);
    setDeleteEventModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (eventToDelete) {
      deleteEventMutation.mutate(eventToDelete.id);
    }
  };

  // ✅ ADICIONADO: Handler para criar novo hotel
  const handleCreateNewHotel = () => {
    setShowHotelCreation(true);
    setIsWizardOpen(true);
    setWizardMode('create');
  };

  // ✅ ADICIONADO: Handler para sucesso do wizard
  const handleWizardSuccess = (hotelId: string) => {
    toast({
      title: wizardMode === 'create' ? "Hotel Criado" : "Hotel Atualizado",
      description: wizardMode === 'create' 
        ? "Hotel criado com sucesso!" 
        : "Hotel foi atualizado com sucesso"
    });
    
    setIsWizardOpen(false);
    setShowHotelCreation(false);
    setEditingRoom(null);
    setWizardMode('create');
    queryClient.invalidateQueries({ queryKey: ['user-hotels'] });
    refetchRooms();
  };

  // ✅ ADICIONADO: Handler para cancelar wizard
  const handleWizardCancel = () => {
    setIsWizardOpen(false);
    setShowHotelCreation(false);
    setEditingRoom(null);
  };

  // ✅ CORREÇÃO: useEffect corrigido para evitar loop infinito
  useEffect(() => {
    if (hotelsLoading || !userHotel) return;

    const currentHotelData = {
      name: userHotel.name,
      address: userHotel.address,
      description: userHotel.description,
      contactEmail: userHotel.contactEmail,
      contactPhone: userHotel.contactPhone,
      amenities: userHotel.amenities,
      images: userHotel.images,
      isActive: userHotel.isActive
    };

    const existingHotelData = {
      name: hotelForm.form.name,
      address: hotelForm.form.address,
      description: hotelForm.form.description,
      contactEmail: hotelForm.form.contactEmail,
      contactPhone: hotelForm.form.contactPhone,
      amenities: hotelForm.form.amenities,
      images: hotelForm.form.images,
      isActive: hotelForm.form.isActive
    };

    if (JSON.stringify(currentHotelData) !== JSON.stringify(existingHotelData)) {
      console.log('🔄 Atualizando hotel form com dados do hotel selecionado');
      hotelForm.setForm(currentHotelData);
    }

    if (!selectedHotelId && userHotel.id) {
      setSelectedHotelId(userHotel.id);
    }
  }, [userHotel, hotelsLoading, selectedHotelId]);

  // ✅ CORREÇÃO: Usar hotelRooms do hook customizado
  const displayedRooms = hotelRooms;

  // ✅ ATUALIZADO: Hotel stats com useMemo para performance
  const hotelStats = useMemo((): HotelStats => {
    const activeRooms = displayedRooms.filter(room => 
      room.isActive !== false
    );
    
    const totalRooms = activeRooms.reduce((sum, room) => 
      sum + SafeNumber.toInt(room.totalRooms), 0
    );
    const availableRooms = activeRooms.reduce((sum, room) => 
      sum + SafeNumber.toInt(room.availableRooms), 0
    );

    const userEventsList = userEvents || [];
    const upcomingEvents = userEventsList.filter((event: any) => 
      new Date(event.startDate) > new Date()
    ).length;

    const activeEvents = userEventsList.filter((event: any) => 
      event.status === 'upcoming' || event.status === 'active'
    ).length;

    const activePartnerships = hotelPartnerships?.filter((p: Partnership) => p.status === 'active').length || 0;
    const partnershipEarnings = hotelPartnerships?.reduce((sum: number, p: Partnership) => sum + (p.totalEarnings || 0), 0) || 0;

    console.log(`📊 Stats calculados: ${activeRooms.length} tipos, ${totalRooms} total, ${availableRooms} disponíveis, ${userEventsList.length} eventos totais, ${upcomingEvents} eventos futuros, ${activePartnerships} parcerias ativas`);
    
    return {
      totalBookings: 73,
      monthlyRevenue: 224500,
      averageRating: 4.8,
      averageOccupancy: 82,
      totalEvents: userEventsList.length,
      upcomingEvents: upcomingEvents,
      activeEvents: activeEvents,
      activePartnerships: activePartnerships,
      partnershipEarnings: partnershipEarnings,
      totalRoomTypes: activeRooms.length,
      totalRooms,
      availableRooms
    };
  }, [displayedRooms, userEvents, hotelPartnerships]);

  // ✅ CORREÇÃO: Handlers usando useCallback
  const handleCreateEvent = useCallback(() => {
    const eventData = {
      ...eventForm.form,
      organizerId: user?.id,
      ticketPrice: SafeNumber.toFloat(eventForm.form.ticketPrice),
      maxTickets: SafeNumber.toInt(eventForm.form.maxTickets)
    };
    createEventMutation.mutate(eventData);
  }, [eventForm.form, user?.id, createEventMutation]);

  const handleCreateRoom = useCallback(() => {
    if (!roomForm.form.name.trim()) {
      toast({ title: "Erro", description: "Nome do quarto é obrigatório", variant: "destructive" });
      return;
    }

    if (!roomForm.form.pricePerNight || SafeNumber.toFloat(roomForm.form.pricePerNight) <= 0) {
      toast({ title: "Erro", description: "Preço por noite deve ser maior que zero", variant: "destructive" });
      return;
    }

    createRoomMutation.mutate(roomForm.form);
  }, [roomForm.form, createRoomMutation, toast]);

  const handleWizardSubmit = useCallback((hotelId: string) => {
    toast({
      title: wizardMode === 'create' ? "Hotel Criado" : "Hotel Atualizado",
      description: wizardMode === 'create' 
        ? "Hotel criado com sucesso!" 
        : "Hotel foi atualizado com sucesso"
    });
    
    setIsWizardOpen(false);
    setEditingRoom(null);
    setWizardMode('create');
    queryClient.invalidateQueries({ queryKey: ['user-hotels'] });
    refetchRooms();
  }, [wizardMode, toast, queryClient, refetchRooms]);

  const handleEditRoom = useCallback((roomType: RoomType) => {
    setEditingRoom(roomType);
    setWizardMode('edit');
    setIsWizardOpen(true);
    
    toast({
      title: "Editando Quarto",
      description: `Abrindo editor para ${roomType.name}`
    });
  }, [toast]);

  const handleViewDetails = useCallback((roomType: RoomType) => {
    console.log("Visualizando detalhes do quarto:", roomType.id);
    toast({ 
      title: "Detalhes do Quarto", 
      description: `Visualizando ${roomType.name}` 
    });
  }, [toast]);

  const handleConfigureRoom = useCallback((roomType: RoomType) => {
    setEditingRoom(roomType);
    setWizardMode('edit');
    setIsWizardOpen(true);
    
    toast({ 
      title: "Configurar Quarto", 
      description: `Configurando ${roomType.name}` 
    });
  }, [toast]);

  const handleSendMessage = useCallback(() => {
    if (!newMessage.trim() || !selectedChat) return;
    console.log('Sending message:', newMessage, 'to driver:', selectedChat);
    setNewMessage('');
  }, [newMessage, selectedChat]);

  // ✅ CORREÇÃO: Adicionando as funções que estavam faltando
  const handleQuickEdit = useCallback((room: RoomType) => {
    setQuickEditModal({
      open: true,
      room: { ...room }
    });
  }, []);

  const handleQuickSave = useCallback(() => {
    if (!quickEditModal.room) return;

    updateRoomMutation.mutate({
      roomId: quickEditModal.room.id,
      roomData: {
        name: quickEditModal.room.name,
        pricePerNight: SafeNumber.toFloat(quickEditModal.room.pricePerNight),
        maxGuests: SafeNumber.toInt(quickEditModal.room.maxGuests),
        totalRooms: SafeNumber.toInt(quickEditModal.room.totalRooms),
        availableRooms: SafeNumber.toInt(quickEditModal.room.availableRooms),
        description: quickEditModal.room.description,
        isActive: quickEditModal.room.isActive
      }
    });

    setQuickEditModal({ open: false, room: null });
  }, [quickEditModal.room, updateRoomMutation]);

  const handleDeleteRoom = useCallback((room: RoomType) => {
    setDeleteModal({
      open: true,
      room
    });
  }, []);

  const confirmDelete = useCallback(() => {
    if (!deleteModal.room) return;

    deleteRoomMutation.mutate(deleteModal.room.id);
    setDeleteModal({ open: false, room: null });
  }, [deleteModal.room, deleteRoomMutation]);

  const stats = hotelStats;

  // ✅ CORREÇÃO: getWizardInitialData com useMemo
  const getWizardInitialData = useMemo((): HotelFormData | undefined => {
    if (!editingRoom && wizardMode !== 'edit') return undefined;

    const extractLocationInfo = (address: string) => {
      if (address.includes('Maputo')) return { city: 'Maputo', state: 'Maputo', country: 'Moçambique', zipCode: '1100' };
      if (address.includes('Beira')) return { city: 'Beira', state: 'Sofala', country: 'Moçambique', zipCode: '2100' };
      if (address.includes('Nampula')) return { city: 'Nampula', state: 'Nampula', country: 'Moçambique', zipCode: '3100' };
      return { city: 'Maputo', state: 'Maputo', country: 'Moçambique', zipCode: '1100' };
    };

    const locationInfo = extractLocationInfo(userHotel?.address || '');

    return {
      name: userHotel?.name || 'Meu Hotel',
      description: userHotel?.description || '',
      category: 'hotel',
      email: userHotel?.contactEmail || user?.email || '',
      phone: userHotel?.contactPhone || '',
      address: userHotel?.address || '',
      city: locationInfo.city,
      state: locationInfo.state,
      country: locationInfo.country,
      zipCode: locationInfo.zipCode,
      location: { lat: 0, lng: 0 },
      amenities: userHotel?.amenities || [],
      rooms: editingRoom ? [{
        id: editingRoom.id,
        name: editingRoom.name,
        type: editingRoom.type,
        maxOccupancy: SafeNumber.toInt(editingRoom.maxGuests),
        quantity: SafeNumber.toInt(editingRoom.totalRooms),
        pricePerNight: SafeNumber.toFloat(editingRoom.pricePerNight),
        description: editingRoom.description || '',
        amenities: editingRoom.amenities || [],
        images: editingRoom.images || [],
        size: SafeNumber.toInt(editingRoom.size),
        bedType: editingRoom.bedType,
        hasBalcony: editingRoom.hasBalcony,
        hasSeaView: editingRoom.hasSeaView
      }] : [],
      images: userHotel?.images || [],
      existingImages: userHotel?.images || [],
      checkInTime: '15:00',
      checkOutTime: '11:00',
      policies: ['Cancelamento gratuito até 24h antes'],
      isActive: true
    };
  }, [editingRoom, wizardMode, userHotel, user]);

  // ✅ ADICIONADO: Paginação para Eventos
  const EventsPagination = () => {
    if (!userEvents || userEvents.length <= EVENTS_PER_PAGE) return null;

    return (
      <div className="flex items-center justify-between mt-6">
        <div className="text-sm text-gray-600">
          Mostrando {((currentEventsPage - 1) * EVENTS_PER_PAGE) + 1} - {Math.min(currentEventsPage * EVENTS_PER_PAGE, userEvents.length)} de {userEvents.length} eventos
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={prevEventsPage}
            disabled={currentEventsPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
          <span className="text-sm font-medium">
            Página {currentEventsPage} de {totalEventsPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={nextEventsPage}
            disabled={currentEventsPage === totalEventsPages}
          >
            Próxima
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  // ✅ ADICIONADO: Funções de navegação da paginação
  const nextEventsPage = () => {
    if (currentEventsPage < totalEventsPages) {
      setCurrentEventsPage(prev => prev + 1);
    }
  };

  const prevEventsPage = () => {
    if (currentEventsPage > 1) {
      setCurrentEventsPage(prev => prev - 1);
    }
  };

  // ✅ ADICIONADO: Paginação para eventos
  const paginatedEvents = useMemo(() => {
    if (!userEvents) return [];
    const startIndex = (currentEventsPage - 1) * EVENTS_PER_PAGE;
    const endIndex = startIndex + EVENTS_PER_PAGE;
    return userEvents.slice(startIndex, endIndex);
  }, [userEvents, currentEventsPage]);

  const totalEventsPages = useMemo(() => {
    if (!userEvents) return 0;
    return Math.ceil(userEvents.length / EVENTS_PER_PAGE);
  }, [userEvents]);

  // ✅ CORREÇÃO: Debug para verificar estado atual
  console.log('🔍 DEBUG - Estado atual:');
  console.log('  selectedHotelId:', selectedHotelId);
  console.log('  userHotel:', userHotel);
  console.log('  hotelRooms:', hotelRooms);
  console.log('  displayedRooms:', displayedRooms);
  console.log('  roomsLoading:', roomsLoading);
  console.log('  userEvents:', userEvents);
  console.log('  hotelPartnerships:', hotelPartnerships);
  console.log('  driverPartnerships:', driverPartnerships);

  // ✅ MODIFICADO: Renderização condicional baseada em showHotelCreation
  if (showHotelCreation) {
    return (
      <div className="min-h-screen bg-gray-50">
        <HotelCreationWizard
          open={isWizardOpen}
          onCancel={handleWizardCancel}
          onSuccess={handleWizardSuccess}
          mode={wizardMode}
          initialData={getWizardInitialData}
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Hotel className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
            <p className="text-gray-600 mb-4">
              Esta área é exclusiva para gestores de alojamento registados.
            </p>
            <Link href="/login">
              <Button className="w-full">Fazer Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {hotelsLoading ? (
              <div className="w-[200px] h-10 flex items-center justify-center">
                <span className="text-gray-500">Carregando hotéis...</span>
              </div>
            ) : (
              <Select
                value={selectedHotelId || userHotels?.[0]?.id || ''}
                onValueChange={(value) => {
                  setSelectedHotelId(value);
                }}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Selecione um hotel" />
                </SelectTrigger>
                <SelectContent>
                  {userHotels?.length ? (
                    userHotels.map((hotel) => (
                      <SelectItem key={hotel.id} value={hotel.id}>
                        {hotel.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-hotels" disabled>
                      Nenhum hotel encontrado
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            )}
            <Badge className="bg-green-100 text-green-700 hover:bg-green-200">
              {displayedRooms?.length || 0} Tipos de Quarto
            </Badge>
          </div>

          <div className="flex items-center space-x-4">
            <Link href={`/hotels/manage-hotel/${selectedHotelId || userHotels?.[0]?.id}`}>
              <Button
                className="bg-green-600 hover:bg-green-700"
                disabled={hotelsLoading || !userHotels?.length}
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Quarto
              </Button>
            </Link>
            <Button
              onClick={() => toggleModal('editHotel', true)}
              variant="outline"
              disabled={hotelsLoading || !userHotels?.length}
            >
              <Edit className="w-4 h-4 mr-2" />
              Editar Hotel
            </Button>
            <Button
              onClick={handleCreateNewHotel}
              className="bg-green-600 hover:bg-green-700"
            >
              <Hotel className="w-4 h-4 mr-2" />
              Criar Novo Hotel
            </Button>
            <Link href="/" data-testid="link-main-app">
              <Button variant="outline">
                <Home className="w-4 h-4 mr-2" />
                App Principal
              </Button>
            </Link>
            <Badge data-testid="user-badge" variant="secondary">
              <UserCheck className="w-4 h-4 mr-2" />
              {user.email?.split('@')[0]}
            </Badge>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {hotelsLoading ? (
          <div className="text-center py-12">
            <div className="animate-pulse text-gray-500">Carregando dados do hotel...</div>
          </div>
        ) : !userHotels?.length ? (
          <Card className="text-center">
            <CardContent className="pt-6">
              <Hotel className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium mb-2">Nenhum hotel cadastrado</h3>
              <p className="text-sm text-gray-600 mb-4">
                Comece criando um novo hotel para gerenciar quartos e reservas.
              </p>
              <Button
                onClick={handleCreateNewHotel}
                className="bg-green-600 hover:bg-green-700"
              >
                <Hotel className="w-4 h-4 mr-2" />
                Criar Novo Hotel
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card 
                className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-dashed border-green-200 hover:border-green-400 bg-gradient-to-br from-green-50 to-green-100"
                onClick={() => toggleModal('createRoom', true)}
              >
                <CardContent className="pt-6 text-center">
                  <div className="text-green-600 mb-4">
                    <Plus className="w-12 h-12 mx-auto" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Adicionar Quarto
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Crie um novo tipo de quarto no seu hotel
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
                <CardContent className="pt-6 text-center">
                  <div className="text-blue-600 mb-4">
                    <Building2 className="w-12 h-12 mx-auto" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Meu Hotel
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Visualize e gerencie seu estabelecimento
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
                <CardContent className="pt-6 text-center">
                  <div className="text-purple-600 mb-4">
                    <BarChart3 className="w-12 h-12 mx-auto" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Relatórios
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Acesse relatórios e estatísticas detalhadas
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card className="bg-gradient-to-br from-green-50 to-green-100">
                <CardContent className="pt-6">
                  <div className="flex items-center">
                    <div className="p-3 bg-green-500 rounded-lg">
                      <Hotel className="h-6 w-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-green-700">Quartos Disponíveis</p>
                      <p className="text-3xl font-bold text-green-900">{stats.availableRooms}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
                <CardContent className="pt-6">
                  <div className="flex items-center">
                    <div className="p-3 bg-blue-500 rounded-lg">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-blue-700">Reservas Total</p>
                      <p className="text-3xl font-bold text-blue-900">{stats.totalBookings}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
                <CardContent className="pt-6">
                  <div className="flex items-center">
                    <div className="p-3 bg-purple-500 rounded-lg">
                      <TrendingUp className="h-6 w-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-purple-700">Taxa Ocupação</p>
                      <p className="text-3xl font-bold text-purple-900">{stats.averageOccupancy.toFixed(0)}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100">
                <CardContent className="pt-6">
                  <div className="flex items-center">
                    <div className="p-3 bg-yellow-500 rounded-lg">
                      <DollarSign className="h-6 w-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-yellow-700">Receita Mensal</p>
                      <p className="text-3xl font-bold text-yellow-900">{stats.monthlyRevenue.toLocaleString()} MT</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                <TabsTrigger value="accommodations">Quartos</TabsTrigger>
                <TabsTrigger value="partnerships">Parcerias</TabsTrigger>
                <TabsTrigger value="events">Eventos</TabsTrigger>
              </TabsList>

              <TabsContent value="dashboard">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      Dashboard do Hotel - {userHotel?.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="bg-gradient-to-r from-green-50 to-teal-50 p-6 rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Perfil do Hotel</h3>
                        <Button variant="outline" size="sm" onClick={() => toggleModal('editHotel', !modals.editHotel)}>
                          <Edit className="w-4 h-4 mr-2" />
                          {modals.editHotel ? 'Cancelar' : 'Editar'}
                        </Button>
                      </div>
                      
                      {modals.editHotel ? (
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="hotel-name">Nome do Hotel</Label>
                            <Input
                              id="hotel-name"
                              value={hotelForm.form.name}
                              onChange={(e) =>
                                hotelForm.updateForm({ name: e.target.value })
                              }
                            />
                          </div>
                          <div>
                            <Label htmlFor="hotel-location">Localização</Label>
                            <LocationAutocomplete
                              id="hotel-location"
                              placeholder="Localização do hotel..."
                              value={hotelForm.form.address}
                              onChange={(value) =>
                                hotelForm.updateForm({ address: value })
                              }
                            />
                          </div>
                          <div>
                            <Label htmlFor="hotel-description">Descrição</Label>
                            <Textarea
                              id="hotel-description"
                              value={hotelForm.form.description}
                              onChange={(e) =>
                                hotelForm.updateForm({ description: e.target.value })
                              }
                              rows={3}
                            />
                          </div>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => {
                              updateHotelMutation.mutate({
                                name: hotelForm.form.name || userHotel?.name,
                                address: hotelForm.form.address || userHotel?.address,
                                description: hotelForm.form.description || userHotel?.description,
                                contactEmail: hotelForm.form.contactEmail || userHotel?.contactEmail,
                                contactPhone: hotelForm.form.contactPhone || userHotel?.contactPhone,
                                amenities: hotelForm.form.amenities || userHotel?.amenities,
                                images: hotelForm.form.images || userHotel?.images,
                                isActive: hotelForm.form.isActive !== undefined ? hotelForm.form.isActive : userHotel?.isActive,
                              });
                            }}
                            disabled={updateHotelMutation.isPending}
                          >
                            <Save className="w-4 h-4 mr-2" />
                            {updateHotelMutation.isPending ? 'Salvando...' : 'Salvar Perfil'}
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div>
                            <p className="text-sm text-gray-600">Nome do Hotel</p>
                            <p className="font-medium">{userHotel?.name}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Localização</p>
                            <p className="font-medium">{userHotel?.address}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Descrição</p>
                            <p className="text-sm">{userHotel?.description}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Contacto</p>
                            <p className="font-medium">{userHotel?.contactEmail}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">{stats.availableRooms}</p>
                        <p className="text-sm text-gray-600">Quartos Disponíveis</p>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">{stats.totalBookings}</p>
                        <p className="text-sm text-gray-600">Reservas Total</p>
                      </div>
                      <div className="text-center p-4 bg-yellow-50 rounded-lg">
                        <p className="text-2xl font-bold text-yellow-600">{stats.monthlyRevenue.toLocaleString()}</p>
                        <p className="text-sm text-gray-600">Receita (MT)</p>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <p className="text-2xl font-bold text-purple-600">{stats.activePartnerships}</p>
                        <p className="text-sm text-gray-600">Parcerias Ativas</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-orange-50 rounded-lg">
                        <p className="text-2xl font-bold text-orange-600">{stats.averageRating.toFixed(1)}</p>
                        <p className="text-sm text-gray-600">Avaliação Média</p>
                      </div>
                      <div className="text-center p-4 bg-indigo-50 rounded-lg">
                        <p className="text-2xl font-bold text-indigo-600">{stats.upcomingEvents}</p>
                        <p className="text-sm text-gray-600">Eventos Próximos</p>
                      </div>
                      <div className="text-center p-4 bg-teal-50 rounded-lg">
                        <p className="text-2xl font-bold text-teal-600">{stats.partnershipEarnings.toLocaleString()}</p>
                        <p className="text-sm text-gray-600">Ganhos Parcerias (MT)</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="accommodations">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="w-5 h-5" />
                        Gestão de Quartos - {userHotel?.name}
                      </CardTitle>
                      <Link href={`/hotels/manage-hotel/${selectedHotelId || userHotels?.[0]?.id}`}>
                        <Button 
                          className="bg-green-600 hover:bg-green-700"
                          disabled={hotelsLoading || !userHotels?.length}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Novo Tipo de Quarto
                        </Button>
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="published">
                      <TabsList>
                        <TabsTrigger value="published">
                          Publicados ({
                            displayedRooms.filter(rt => rt.isActive !== false).length
                          })
                        </TabsTrigger>
                        <TabsTrigger value="reservations">Reservas</TabsTrigger>
                        <TabsTrigger value="conditions">Condições</TabsTrigger>
                      </TabsList>

                      <TabsContent value="published" className="space-y-4">
                        {roomsLoading ? (
                          <div className="flex items-center justify-center p-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                            <span className="ml-2">Carregando quartos...</span>
                          </div>
                        ) : displayedRooms.length === 0 ? (
                          <div className="text-center py-12 text-gray-500">
                            <Building2 className="h-16 w-16 mx-auto mb-4 opacity-50" />
                            <h3 className="text-lg font-medium mb-2">Nenhum quarto cadastrado</h3>
                            <p className="text-sm mb-4">
                              Comece adicionando os tipos de quarto disponíveis no seu hotel.
                            </p>
                            <Link href={`/hotels/manage-hotel/${selectedHotelId || userHotels?.[0]?.id}`}>
                              <Button 
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Adicionar Primeiro Quarto
                              </Button>
                            </Link>
                          </div>
                        ) : (
                          <div className="grid gap-4">
                            {displayedRooms
                              .filter(rt => rt.isActive !== false)
                              .map((roomType: RoomType) => (
                              <Card key={roomType.id} className="border-l-4 border-l-green-500 hover:shadow-md transition-shadow">
                                <CardContent className="pt-6">
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-3 mb-3">
                                        <div className="p-2 bg-green-100 rounded-lg">
                                          <Building2 className="h-5 w-5 text-green-600" />
                                        </div>
                                        <div>
                                          <h3 className="font-semibold text-lg">{roomType.name}</h3>
                                          <Badge variant="secondary" className="mt-1">{roomType.type}</Badge>
                                          <Badge 
                                            variant={roomType.isActive !== false ? "default" : "secondary"}
                                            className={`ml-2 ${roomType.isActive !== false ? 'bg-green-100 text-green-800' : ''}`}
                                          >
                                            {roomType.isActive !== false ? 'Ativo' : 'Inativo'}
                                          </Badge>
                                        </div>
                                      </div>
                                      
                                      <div className="space-y-2 mb-4">
                                        <p className="text-sm text-gray-700">{roomType.description}</p>
                                        
                                        {roomType.amenities && roomType.amenities.length > 0 && (
                                          <div className="flex flex-wrap gap-1">
                                            {roomType.amenities.map((amenity: string, index: number) => (
                                              <Badge key={index} variant="outline" className="text-xs">{amenity}</Badge>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                        <div className="flex items-center gap-1 text-gray-600">
                                          <DollarSign className="h-4 w-4" />
                                          <span className="font-semibold">{SafeNumber.toFloat(roomType.pricePerNight).toLocaleString()} MT/noite</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-gray-600">
                                          <Users className="h-4 w-4" />
                                          <span>Até {SafeNumber.toInt(roomType.maxGuests)} hóspedes</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-gray-600">
                                          <Building2 className="h-4 w-4" />
                                          <span>{SafeNumber.toInt(roomType.availableRooms)}/{SafeNumber.toInt(roomType.totalRooms)} disponíveis</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-gray-600">
                                          <TrendingUp className="h-4 w-4" />
                                          <span>{SafeNumber.toInt(roomType.size)}m²</span>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="flex flex-col gap-2 ml-4">
                                      <Button 
                                        size="sm" 
                                        variant="outline" 
                                        onClick={() => handleQuickEdit(roomType)}
                                        disabled={updateRoomMutation.isPending}
                                      >
                                        <Edit className="w-4 h-4 mr-1" />
                                        {updateRoomMutation.isPending && quickEditModal.room?.id === roomType.id ? 'Salvando...' : 'Editar'}
                                      </Button>
                                      <Button 
                                        size="sm" 
                                        variant="outline" 
                                        onClick={() => handleViewDetails(roomType)}
                                      >
                                        <Eye className="w-4 h-4 mr-1" />
                                        Ver Detalhes
                                      </Button>
                                      <Button 
                                        size="sm" 
                                        variant="outline" 
                                        onClick={() => handleConfigureRoom(roomType)}
                                      >
                                        <Settings className="w-4 h-4 mr-1" />
                                        Configurar
                                      </Button>
                                      <Button 
                                        size="sm" 
                                        variant="destructive" 
                                        onClick={() => handleDeleteRoom(roomType)}
                                        disabled={deleteRoomMutation.isPending}
                                      >
                                        <Trash2 className="w-4 h-4 mr-1" />
                                        {deleteRoomMutation.isPending && deleteModal.room?.id === roomType.id ? 'Eliminando...' : 'Eliminar'}
                                      </Button>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="reservations">
                        <div className="text-center py-8 text-gray-500">
                          <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <h3 className="text-lg font-medium mb-2">Gestão de Reservas</h3>
                          <p className="text-sm mb-4">Gerir reservas ativas, confirmadas e canceladas.</p>
                          <Button variant="outline">
                            <Plus className="w-4 h-4 mr-2" />
                            Ver Todas as Reservas
                          </Button>
                        </div>
                      </TabsContent>

                      <TabsContent value="conditions">
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold mb-4">Condições de Reserva</h3>
                          
                          <div className="grid gap-4">
                            <Card>
                              <CardContent className="pt-6">
                                <div className="space-y-4">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <h4 className="font-medium">Política de Cancelamento</h4>
                                      <p className="text-sm text-gray-600">Cancelamento gratuito até 24 horas antes</p>
                                    </div>
                                    <Switch defaultChecked />
                                  </div>
                                  
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <h4 className="font-medium">Check-in Automático</h4>
                                      <p className="text-sm text-gray-600">Permitir check-in sem presença do anfitrião</p>
                                    </div>
                                    <Switch />
                                  </div>
                                  
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <h4 className="font-medium">Reserva Instantânea</h4>
                                      <p className="text-sm text-gray-600">Aprovação automática de reservas</p>
                                    </div>
                                    <Switch defaultChecked />
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                            
                            <Card>
                              <CardContent className="pt-6">
                                <h4 className="font-medium mb-4">Horários de Check-in/Check-out</h4>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label>Check-in</Label>
                                    <Input type="time" defaultValue="15:00" />
                                  </div>
                                  <div>
                                    <Label>Check-out</Label>
                                    <Input type="time" defaultValue="11:00" />
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="partnerships">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center gap-2">
                            <Handshake className="w-5 h-5" />
                            Parcerias com Motoristas
                            {hotelPartnerships && (
                              <Badge variant="secondary">
                                {hotelPartnerships.length} ativas
                              </Badge>
                            )}
                          </CardTitle>
                          <Button 
                            onClick={() => {
                              setEditingPartnership(null);
                              partnershipForm.resetForm();
                              toggleModal('createPartnership', true);
                            }} 
                            size="sm" 
                            className="bg-green-600 hover:bg-green-700"
                            disabled={!userHotel?.id}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Nova Parceria
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {partnershipsLoading ? (
                          <div className="flex items-center justify-center p-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                            <span className="ml-2">Carregando parcerias...</span>
                          </div>
                        ) : hotelPartnerships && hotelPartnerships.length > 0 ? (
                          <div className="space-y-4">
                            {hotelPartnerships.map((partnership: Partnership) => (
                              <Card key={partnership.id} className="border-l-4 border-l-blue-500">
                                <CardContent className="pt-4">
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 bg-blue-100 rounded-lg">
                                          <Handshake className="h-4 w-4 text-blue-600" />
                                        </div>
                                        <div>
                                          <h4 className="font-semibold">{partnership.title}</h4>
                                          <p className="text-sm text-gray-600">{partnership.description}</p>
                                        </div>
                                      </div>
                                      
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                                        <div>
                                          <span className="text-gray-600">Comissão:</span>
                                          <p className="font-semibold">{partnership.commission}%</p>
                                        </div>
                                        <div>
                                          <span className="text-gray-600">Motoristas:</span>
                                          <p className="font-semibold">
                                            {driverPartnerships?.filter((d: DriverPartnership) => d.partnershipId === partnership.id).length || 0}
                                          </p>
                                        </div>
                                        <div>
                                          <span className="text-gray-600">Status:</span>
                                          <Badge 
                                            variant={partnership.status === 'active' ? 'default' : 'secondary'}
                                            className={partnership.status === 'active' 
                                              ? 'bg-green-100 text-green-800' 
                                              : partnership.status === 'pending'
                                              ? 'bg-yellow-100 text-yellow-800'
                                              : 'bg-gray-100 text-gray-800'
                                            }
                                          >
                                            {partnership.status === 'active' ? 'Ativa' : 
                                             partnership.status === 'pending' ? 'Pendente' : 'Inativa'}
                                          </Badge>
                                        </div>
                                        <div>
                                          <span className="text-gray-600">Criada em:</span>
                                          <p className="font-semibold text-xs">
                                            {new Date(partnership.createdAt).toLocaleDateString('pt-BR')}
                                          </p>
                                        </div>
                                      </div>

                                      {partnership.benefits && partnership.benefits.length > 0 && (
                                        <div className="mb-3">
                                          <span className="text-gray-600 text-sm">Benefícios:</span>
                                          <div className="flex flex-wrap gap-1 mt-1">
                                            {partnership.benefits.map((benefit: string, index: number) => (
                                              <Badge key={index} variant="outline" className="text-xs">
                                                {benefit}
                                              </Badge>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {partnership.requirements && partnership.requirements.length > 0 && (
                                        <div className="mb-3">
                                          <span className="text-gray-600 text-sm">Requisitos:</span>
                                          <div className="flex flex-wrap gap-1 mt-1">
                                            {partnership.requirements.map((requirement: string, index: number) => (
                                              <Badge key={index} variant="secondary" className="text-xs">
                                                {requirement}
                                              </Badge>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {partnership.targetRoutes && partnership.targetRoutes.length > 0 && (
                                        <div>
                                          <span className="text-gray-600 text-sm">Rotas Alvo:</span>
                                          <div className="flex flex-wrap gap-1 mt-1">
                                            {partnership.targetRoutes.map((route: string, index: number) => (
                                              <Badge key={index} variant="outline" className="text-xs bg-blue-50">
                                                {route}
                                              </Badge>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                    
                                    <div className="flex flex-col gap-2">
                                      <Button 
                                        size="sm" 
                                        variant="outline" 
                                        onClick={() => {
                                          toast({
                                            title: "Gestão de Parceria",
                                            description: `Gerindo parceria: ${partnership.title}`
                                          });
                                        }}
                                      >
                                        <MessageCircle className="w-3 h-3 mr-1" />
                                        Gerir
                                      </Button>
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => handleEditPartnership(partnership)}
                                        disabled={updatePartnershipMutation.isPending}
                                      >
                                        <Edit className="w-3 h-3 mr-1" />
                                        {updatePartnershipMutation.isPending ? 'Salvando...' : 'Editar'}
                                      </Button>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-12 text-gray-500">
                            <Handshake className="h-16 w-16 mx-auto mb-4 opacity-50" />
                            <h3 className="text-lg font-medium mb-2">Nenhuma parceria ativa</h3>
                            <p className="text-sm mb-4">
                              Crie parcerias com motoristas para aumentar suas reservas.
                            </p>
                            <Button 
                              onClick={() => {
                                setEditingPartnership(null);
                                partnershipForm.resetForm();
                                toggleModal('createPartnership', true);
                              }}
                              className="bg-green-600 hover:bg-green-700"
                              disabled={!userHotel?.id}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Criar Primeira Parceria
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                  
                  <div>
                    <Card className="h-fit">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <MessageCircle className="w-4 h-4" />
                          Chat Motoristas
                          {driverPartnerships && driverPartnerships.length > 0 && (
                            <Badge variant="secondary">{driverPartnerships.length}</Badge>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {!driverPartnerships || driverPartnerships.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Nenhum motorista parceiro ativo</p>
                            <p className="text-xs mt-1">As conversas aparecerão aqui</p>
                          </div>
                        ) : !selectedChat ? (
                          <div className="space-y-3">
                            <p className="text-sm text-gray-600 mb-3">Selecione um motorista para conversar:</p>
                            {driverPartnerships.slice(0, 3).map((driver: DriverPartnership) => (
                              <div 
                                key={driver.id}
                                className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                                onClick={() => setSelectedChat(parseInt(driver.id))}
                              >
                                <div className="p-2 bg-blue-100 rounded-lg">
                                  <Users className="h-4 w-4 text-blue-600" />
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-medium text-sm">{driver.driverName}</h4>
                                  <p className="text-xs text-gray-600">{driver.route}</p>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {driver.clientsBrought} clientes
                                </Badge>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="flex items-center gap-3 pb-3 border-b">
                              <div className="p-2 bg-blue-100 rounded-lg">
                                <Users className="h-4 w-4 text-blue-600" />
                              </div>
                              <div>
                                <h4 className="font-medium">
                                  {driverPartnerships.find((d: DriverPartnership) => parseInt(d.id) === selectedChat)?.driverName}
                                </h4>
                                <p className="text-xs text-gray-600">
                                  {driverPartnerships.find((d: DriverPartnership) => parseInt(d.id) === selectedChat)?.route}
                                </p>
                              </div>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => setSelectedChat(null)}
                                className="ml-auto"
                              >
                                Voltar
                              </Button>
                            </div>
                            
                            <div className="space-y-3 max-h-64 overflow-y-auto">
                              <div className="flex justify-start">
                                <div className="max-w-xs p-3 rounded-lg bg-gray-100 text-gray-800 text-sm">
                                  <p>Olá! Tenho interesse na sua parceria</p>
                                  <p className="text-xs mt-1 text-gray-500">10:30</p>
                                </div>
                              </div>
                              <div className="flex justify-end">
                                <div className="max-w-xs p-3 rounded-lg bg-green-600 text-white text-sm">
                                  <p>Olá! Que bom ter você como parceiro</p>
                                  <p className="text-xs mt-1 text-green-100">10:32</p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex gap-2 pt-3 border-t">
                              <Input 
                                placeholder="Escreva sua mensagem..."
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                              />
                              <Button 
                                size="sm" 
                                onClick={handleSendMessage}
                                disabled={!newMessage.trim()}
                              >
                                <Send className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="mt-4">
                      <CardHeader>
                        <CardTitle className="text-sm">Estatísticas de Parcerias</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Parcerias Ativas:</span>
                          <span className="font-semibold">{hotelPartnerships?.filter((p: Partnership) => p.status === 'active').length || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Motoristas Parceiros:</span>
                          <span className="font-semibold">{driverPartnerships?.length || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Ganhos Totais:</span>
                          <span className="font-semibold">
                            {(hotelPartnerships?.reduce((sum: number, p: Partnership) => sum + (p.totalEarnings || 0), 0) || 0).toLocaleString()} MT
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="events">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <PartyPopper className="w-5 h-5" />
                        Eventos do Hotel
                      </CardTitle>
                      <div className="flex gap-2">
                        <Button onClick={reloadEvents} variant="outline" size="sm">
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Atualizar
                        </Button>
                        <Button onClick={() => toggleModal('createEvent', true)} className="bg-green-600 hover:bg-green-700">
                          <Plus className="w-4 h-4 mr-2" />
                          Criar Evento
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="active">
                      <TabsList>
                        <TabsTrigger value="active">Ativos ({stats.upcomingEvents})</TabsTrigger>
                        <TabsTrigger value="past">Anteriores</TabsTrigger>
                        <TabsTrigger value="draft">Rascunhos</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="active" className="space-y-4">
                        {eventsLoading ? (
                          <div className="flex items-center justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin mr-2" />
                            <span>Carregando eventos...</span>
                          </div>
                        ) : paginatedEvents.length > 0 ? (
                          <>
                            <div className="grid gap-4">
                              {paginatedEvents
                                .filter((event: HotelEvent) => event.status === 'upcoming' || event.status === 'active')
                                .map((event: HotelEvent) => (
                                <Card key={event.id} className="border-l-4 border-l-purple-500">
                                  <CardContent className="pt-6">
                                    <div className="flex justify-between items-start">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-3">
                                          <div className="p-2 bg-purple-100 rounded-lg">
                                            <PartyPopper className="h-5 w-5 text-purple-600" />
                                          </div>
                                          <div>
                                            <h3 className="font-semibold text-lg">{event.title}</h3>
                                            <Badge variant="secondary" className="mt-1">{event.eventType}</Badge>
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
                                            <span className="text-sm">{event.startDate} - {event.endDate}</span>
                                          </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                          <div>
                                            <span className="text-gray-600">Preço:</span>
                                            <p className="font-semibold">{SafeNumber.toFloat(event.ticketPrice)} MT</p>
                                          </div>
                                          <div>
                                            <span className="text-gray-600">Vendidos:</span>
                                            <p className="font-semibold">{SafeNumber.toInt(event.ticketsSold)}/{SafeNumber.toInt(event.maxTickets)}</p>
                                          </div>
                                          <div>
                                            <span className="text-gray-600">Status:</span>
                                            <Badge variant="default" className="bg-green-100 text-green-800">
                                              {event.status === 'upcoming' ? 'Próximo' : event.status}
                                            </Badge>
                                          </div>
                                          <div>
                                            <span className="text-gray-600">Progresso:</span>
                                            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                              <div 
                                                className="bg-green-600 h-2 rounded-full" 
                                                style={{ 
                                                  width: `${Math.min(100, (SafeNumber.toInt(event.ticketsSold) / SafeNumber.toInt(event.maxTickets)) * 100)}%` 
                                                }}
                                              ></div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                      
                                      <div className="flex flex-col gap-2 ml-4">
                                        <Button 
                                          size="sm" 
                                          variant="outline"
                                          onClick={() => handleEditEvent(event)}
                                        >
                                          <Edit className="w-4 h-4 mr-1" />
                                          Editar
                                        </Button>
                                        <Button size="sm" variant="outline">
                                          <Eye className="w-4 h-4 mr-1" />
                                          Ver Detalhes
                                        </Button>
                                        <Button 
                                          size="sm" 
                                          variant="destructive"
                                          onClick={() => handleOpenDeleteConfirmation(event)}
                                        >
                                          <Trash2 className="w-4 h-4 mr-1" />
                                          Eliminar
                                        </Button>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                            
                            <EventsPagination />
                          </>
                        ) : (
                          <div className="text-center py-12 text-gray-500">
                            <PartyPopper className="h-16 w-16 mx-auto mb-4 opacity-50" />
                            <h3 className="text-lg font-medium mb-2">Nenhum evento ativo</h3>
                            <p className="text-sm mb-4">Crie eventos para atrair mais hóspedes ao seu hotel.</p>
                            <Button 
                              onClick={() => toggleModal('createEvent', true)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Criar Primeiro Evento
                            </Button>
                          </div>
                        )}
                      </TabsContent>
                      
                      <TabsContent value="past">
                        <div className="text-center py-8 text-gray-500">
                          <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>Eventos anteriores aparecerão aqui</p>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="draft">
                        <div className="text-center py-8 text-gray-500">
                          <Edit className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>Rascunhos de eventos aparecerão aqui</p>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* ✅ ATUALIZADO: Modal de Edição de Eventos */}
            <Dialog open={editEventModalOpen} onOpenChange={setEditEventModalOpen}>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Editar Evento</DialogTitle>
                  <DialogDescription>
                    Atualize as informações do evento e acompanhe a venda de bilhetes.
                  </DialogDescription>
                </DialogHeader>
                {editingEvent && (
                  <form onSubmit={handleUpdateEvent} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="edit-event-title">Título do Evento</Label>
                        <Input
                          id="edit-event-title"
                          name="title"
                          defaultValue={editingEvent.title}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-event-type">Tipo de Evento</Label>
                        <Select 
                          name="eventType" 
                          defaultValue={editingEvent.eventType}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar tipo" />
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
                    </div>
                    <div>
                      <Label htmlFor="edit-event-description">Descrição</Label>
                      <Textarea
                        id="edit-event-description"
                        name="description"
                        defaultValue={editingEvent.description}
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-event-venue">Local do Evento</Label>
                      <Input
                        id="edit-event-venue"
                        name="venue"
                        defaultValue={editingEvent.venue}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="edit-start-date">Data de Início</Label>
                        <Input
                          id="edit-start-date"
                          name="startDate"
                          type="date"
                          defaultValue={editingEvent.startDate}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-end-date">Data de Fim</Label>
                        <Input
                          id="edit-end-date"
                          name="endDate"
                          type="date"
                          defaultValue={editingEvent.endDate}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="edit-start-time">Hora de Início</Label>
                        <Input
                          id="edit-start-time"
                          name="startTime"
                          type="time"
                          defaultValue={editingEvent.startTime}
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-end-time">Hora de Fim</Label>
                        <Input
                          id="edit-end-time"
                          name="endTime"
                          type="time"
                          defaultValue={editingEvent.endTime}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="edit-ticket-price">Preço do Bilhete (MT)</Label>
                        <Input
                          id="edit-ticket-price"
                          name="ticketPrice"
                          type="number"
                          defaultValue={editingEvent.ticketPrice}
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-max-tickets">Máximo de Bilhetes</Label>
                        <Input
                          id="edit-max-tickets"
                          name="maxTickets"
                          type="number"
                          defaultValue={editingEvent.maxTickets}
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-tickets-sold">Bilhetes Vendidos</Label>
                        <Input
                          id="edit-tickets-sold"
                          name="ticketsSold"
                          type="number"
                          defaultValue={editingEvent.ticketsSold || 0}
                          min="0"
                          max={editingEvent.maxTickets}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="edit-status">Status</Label>
                      <Select name="status" defaultValue={editingEvent.status}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="upcoming">Próximo</SelectItem>
                          <SelectItem value="active">Ativo</SelectItem>
                          <SelectItem value="completed">Concluído</SelectItem>
                          <SelectItem value="cancelled">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {editingEvent.maxTickets > 0 && (
                      <div className="pt-2">
                        <Label>Progresso de Vendas</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                              style={{ 
                                width: `${Math.min(100, ((editingEvent.ticketsSold || 0) / editingEvent.maxTickets) * 100)}%` 
                              }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-600 whitespace-nowrap">
                            {Math.round(((editingEvent.ticketsSold || 0) / editingEvent.maxTickets) * 100)}%
                          </span>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex space-x-2 pt-4">
                      <Button 
                        type="submit" 
                        disabled={updateEventMutation.isPending}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {updateEventMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setEditEventModalOpen(false)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </form>
                )}
              </DialogContent>
            </Dialog>

            {/* ✅ ADICIONADO: Modal de Confirmação de Eliminação de Eventos */}
            <Dialog open={deleteEventModalOpen} onOpenChange={setDeleteEventModalOpen}>
              <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                  <DialogTitle className="text-destructive">Confirmar Eliminação</DialogTitle>
                  <DialogDescription>
                    Tem certeza que deseja eliminar o evento "{eventToDelete?.title}"? Esta ação não pode ser desfeita.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex space-x-2">
                  <Button
                    variant="destructive"
                    onClick={handleConfirmDelete}
                    disabled={deleteEventMutation.isPending}
                  >
                    {deleteEventMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Eliminando...
                      </>
                    ) : (
                      'Sim, Eliminar'
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setDeleteEventModalOpen(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* ✅ ADICIONADO: Modal de Edição Rápida */}
            <Dialog open={quickEditModal.open} onOpenChange={(open) => setQuickEditModal(prev => ({ ...prev, open }))}>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Editar Quarto - {quickEditModal.room?.name}</DialogTitle>
                </DialogHeader>
                <DialogDescription>
                  Edite rapidamente as informações básicas do quarto.
                </DialogDescription>
                
                {quickEditModal.room && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="edit-name">Nome do Quarto</Label>
                      <Input 
                        id="edit-name"
                        value={quickEditModal.room.name}
                        onChange={(e) => setQuickEditModal(prev => ({
                          ...prev,
                          room: prev.room ? { ...prev.room, name: e.target.value } : null
                        }))}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="edit-price">Preço por Noite (MT)</Label>
                        <Input 
                          id="edit-price"
                          type="number"
                          value={quickEditModal.room.pricePerNight}
                          onChange={(e) => setQuickEditModal(prev => ({
                            ...prev,
                            room: prev.room ? { ...prev.room, pricePerNight: SafeNumber.toFloat(e.target.value) } : null
                          }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-guests">Máx. Hóspedes</Label>
                        <Input 
                          id="edit-guests"
                          type="number"
                          value={quickEditModal.room.maxGuests}
                          onChange={(e) => setQuickEditModal(prev => ({
                            ...prev,
                            room: prev.room ? { ...prev.room, maxGuests: SafeNumber.toInt(e.target.value) } : null
                          }))}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="edit-total">Total de Quartos</Label>
                        <Input 
                          id="edit-total"
                          type="number"
                          value={quickEditModal.room.totalRooms}
                          onChange={(e) => setQuickEditModal(prev => ({
                            ...prev,
                            room: prev.room ? { ...prev.room, totalRooms: SafeNumber.toInt(e.target.value) } : null
                          }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-available">Disponíveis</Label>
                        <Input 
                          id="edit-available"
                          type="number"
                          value={quickEditModal.room.availableRooms}
                          onChange={(e) => setQuickEditModal(prev => ({
                            ...prev,
                            room: prev.room ? { ...prev.room, availableRooms: SafeNumber.toInt(e.target.value) } : null
                          }))}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="edit-description">Descrição</Label>
                      <Textarea
                        id="edit-description"
                        value={quickEditModal.room.description || ''}
                        onChange={(e) => setQuickEditModal(prev => ({
                          ...prev,
                          room: prev.room ? { ...prev.room, description: e.target.value } : null
                        }))}
                        rows={3}
                      />
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={quickEditModal.room.isActive}
                        onCheckedChange={(checked) => setQuickEditModal(prev => ({
                          ...prev,
                          room: prev.room ? { ...prev.room, isActive: checked } : null
                        }))}
                      />
                      <Label>Quarto Ativo</Label>
                    </div>
                    
                    <div className="flex gap-3 pt-4">
                      <Button 
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={handleQuickSave}
                        disabled={updateRoomMutation.isPending}
                      >
                        {updateRoomMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setQuickEditModal({ open: false, room: null })}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* ✅ ADICIONADO: Modal de Confirmação de Eliminação */}
            <Dialog open={deleteModal.open} onOpenChange={(open) => setDeleteModal(prev => ({ ...prev, open }))}>
              <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                  <DialogTitle className="text-destructive">Eliminar Quarto</DialogTitle>
                </DialogHeader>
                <DialogDescription>
                  Tem certeza que deseja eliminar o quarto <strong>"{deleteModal.room?.name}"</strong>? 
                  Esta ação não pode ser desfeita.
                </DialogDescription>
                
                <div className="flex gap-3 pt-4">
                  <Button 
                    variant="destructive"
                    onClick={confirmDelete}
                    disabled={deleteRoomMutation.isPending}
                    className="flex-1"
                  >
                    {deleteRoomMutation.isPending ? 'Eliminando...' : 'Sim, Eliminar'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setDeleteModal({ open: false, room: null })}
                  >
                    Cancelar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <HotelCreationWizard
              open={isWizardOpen}
              onCancel={() => setIsWizardOpen(false)}
              onSuccess={handleWizardSubmit}
              mode={wizardMode}
              initialData={getWizardInitialData}
            />

            <Dialog open={modals.createRoom} onOpenChange={(open) => toggleModal('createRoom', open)}>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Adicionar Novo Tipo de Quarto</DialogTitle>
                </DialogHeader>
                <DialogDescription>
                  Adicione um novo tipo de quarto ao seu hotel {userHotel?.name}
                </DialogDescription>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="room-name">Nome do Quarto</Label>
                      <Input 
                        id="room-name"
                        placeholder="ex: Quarto Standard Vista Mar"
                        value={roomForm.form.name}
                        onChange={(e) => roomForm.updateForm({ name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="room-type">Tipo de Quarto</Label>
                      <Select 
                        value={roomForm.form.type}
                        onValueChange={(value) => roomForm.updateForm({ type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="deluxe">Deluxe</SelectItem>
                          <SelectItem value="suite">Suite</SelectItem>
                          <SelectItem value="family">Família</SelectItem>
                          <SelectItem value="executive">Executivo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="room-description">Descrição</Label>
                    <Textarea
                      id="room-description"
                      placeholder="Descreva as características do quarto..."
                      value={roomForm.form.description}
                      onChange={(e) => roomForm.updateForm({ description: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="room-price">Preço por Noite (MT)</Label>
                      <Input
                        id="room-price"
                        type="number"
                        value={roomForm.form.pricePerNight}
                        onChange={(e) => roomForm.updateForm({ pricePerNight: SafeNumber.toFloat(e.target.value) })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="total-rooms">Total de Quartos</Label>
                      <Input
                        id="total-rooms"
                        type="number"
                        value={roomForm.form.totalRooms}
                        onChange={(e) => roomForm.updateForm({ totalRooms: SafeNumber.toInt(e.target.value) })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="max-guests">Máx. Hóspedes</Label>
                      <Input
                        id="max-guests"
                        type="number"
                        value={roomForm.form.maxGuests}
                        onChange={(e) => roomForm.updateForm({ maxGuests: SafeNumber.toInt(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <Button 
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={handleCreateRoom}
                      disabled={createRoomMutation.isPending}
                    >
                      {createRoomMutation.isPending ? 'Criando...' : 'Criar Quarto'}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => toggleModal('createRoom', false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={modals.createEvent} onOpenChange={(open) => toggleModal('createEvent', open)}>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Criar Novo Evento</DialogTitle>
                </DialogHeader>
                <DialogDescription>
                  Crie um novo evento para o seu hotel, especificando título, tipo, descrição, local, datas e preço dos bilhetes.
                </DialogDescription>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="event-title">Título do Evento</Label>
                      <Input 
                        id="event-title" 
                        placeholder="ex: Festival de Verão"
                        value={eventForm.form.title}
                        onChange={(e) => eventForm.updateForm({ title: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="event-type">Tipo de Evento</Label>
                      <Select value={eventForm.form.eventType} onValueChange={(value) => eventForm.updateForm({ eventType: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar tipo" />
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
                  </div>
                  
                  <div>
                    <Label htmlFor="event-description">Descrição</Label>
                    <Textarea 
                      id="event-description" 
                      placeholder="Descreva o evento..."
                      value={eventForm.form.description}
                      onChange={(e) => eventForm.updateForm({ description: e.target.value })}
                      rows={3}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="event-venue">Local do Evento</Label>
                    <LocationAutocomplete 
                      id="event-venue"
                      placeholder="Local onde será realizado..."
                      value={eventForm.form.venue}
                      onChange={(value) => eventForm.updateForm({ venue: value })}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="start-date">Data de Início</Label>
                      <Input 
                        id="start-date" 
                        type="date"
                        value={eventForm.form.startDate}
                        onChange={(e) => eventForm.updateForm({ startDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="end-date">Data de Fim</Label>
                      <Input 
                        id="end-date" 
                        type="date"
                        value={eventForm.form.endDate}
                        onChange={(e) => eventForm.updateForm({ endDate: e.target.value })}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="ticket-price">Preço do Bilhete (MT)</Label>
                      <Input 
                        id="ticket-price" 
                        type="number"
                        placeholder="150"
                        value={eventForm.form.ticketPrice}
                        onChange={(e) => eventForm.updateForm({ ticketPrice: SafeNumber.toFloat(e.target.value) })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="max-tickets">Máximo de Bilhetes</Label>
                      <Input 
                        id="max-tickets" 
                        type="number"
                        value={eventForm.form.maxTickets}
                        onChange={(e) => eventForm.updateForm({ maxTickets: SafeNumber.toInt(e.target.value) })}
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <Button 
                      onClick={handleCreateEvent}
                      className="bg-green-600 hover:bg-green-700"
                      disabled={createEventMutation.isPending}
                    >
                      {createEventMutation.isPending ? 'Criando...' : 'Criar Evento'}
                    </Button>
                    <Button variant="outline" onClick={() => toggleModal('createEvent', false)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* ✅ CORREÇÃO COMPLETA: Modal de Parcerias com tipos corrigidos */}
            <Dialog open={modals.createPartnership} onOpenChange={(open) => toggleModal('createPartnership', open)}>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>
                    {editingPartnership ? 'Editar Parceria' : 'Criar Post de Parceria'}
                  </DialogTitle>
                </DialogHeader>
                <DialogDescription>
                  {editingPartnership 
                    ? 'Atualize as informações da parceria existente.'
                    : 'Crie um post de parceria para motoristas, especificando título, descrição, comissão, benefícios e requisitos.'
                  }
                </DialogDescription>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="partnership-title">Título da Parceria *</Label>
                    <Input 
                      id="partnership-title" 
                      placeholder="ex: Parceria Exclusiva - 15% Comissão"
                      value={partnershipForm.form.title}
                      onChange={(e) => partnershipForm.updateForm({ title: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="partnership-description">Descrição da Oferta *</Label>
                    <Textarea 
                      id="partnership-description" 
                      placeholder="Descreva os benefícios e condições da parceria..."
                      value={partnershipForm.form.description}
                      onChange={(e) => partnershipForm.updateForm({ description: e.target.value })}
                      rows={3}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="commission">Comissão (%) *</Label>
                      <Input 
                        id="commission" 
                        type="number"
                        min="1"
                        max="50"
                        value={partnershipForm.form.commission}
                        onChange={(e) => partnershipForm.updateForm({ commission: SafeNumber.toInt(e.target.value) })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="benefits">Benefícios Extras</Label>
                      <Input 
                        id="benefits" 
                        placeholder="Estadia gratuita, desconto em refeições..."
                        value={partnershipForm.form.benefits}
                        onChange={(e) => partnershipForm.updateForm({ benefits: e.target.value })}
                      />
                      <p className="text-xs text-gray-500 mt-1">Separe por vírgulas</p>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="requirements">Requisitos do Motorista</Label>
                    <Textarea 
                      id="requirements" 
                      placeholder="Avaliação mínima 4.5, experiência mínima 1 ano, regularidade nas rotas..."
                      value={partnershipForm.form.requirements}
                      onChange={(e) => partnershipForm.updateForm({ requirements: e.target.value })}
                      rows={2}
                    />
                    <p className="text-xs text-gray-500 mt-1">Separe por vírgulas</p>
                  </div>

                  <div>
                    <Label htmlFor="target-routes">Rotas Alvo</Label>
                    <Select 
                      value={partnershipForm.form.targetRoutes[0] || ''}
                      onValueChange={(value) => {
                        partnershipForm.updateForm({ 
                          targetRoutes: value ? [value] : [] 
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar rota principal" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Maputo → Beira">Maputo → Beira</SelectItem>
                        <SelectItem value="Maputo → Nampula">Maputo → Nampula</SelectItem>
                        <SelectItem value="Beira → Quelimane">Beira → Quelimane</SelectItem>
                        <SelectItem value="Nampula → Pemba">Nampula → Pemba</SelectItem>
                        <SelectItem value="Maputo → Xai-Xai">Maputo → Xai-Xai</SelectItem>
                        <SelectItem value="Beira → Tete">Beira → Tete</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <Button 
                      className="bg-green-600 hover:bg-green-700"
                      onClick={handleSavePartnership}
                      disabled={createPartnershipMutation.isPending || updatePartnershipMutation.isPending || !userHotel?.id}
                    >
                      {(createPartnershipMutation.isPending || updatePartnershipMutation.isPending) ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {editingPartnership ? 'Atualizando...' : 'Criando...'}
                        </>
                      ) : (
                        editingPartnership ? 'Atualizar Parceria' : 'Publicar Parceria'
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => toggleModal('createPartnership', false)}
                      disabled={createPartnershipMutation.isPending || updatePartnershipMutation.isPending}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </div>
  );
}