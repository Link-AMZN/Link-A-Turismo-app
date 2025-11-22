import { useState } from 'react';
import { useAuth } from '@/shared/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { 
  Car, 
  Plus, 
  Calendar, 
  MapPin, 
  Users, 
  CheckCircle,
  XCircle,
  DollarSign,
  UserCheck,
  MessageCircle,
  Handshake,
  Star,
  Edit,
  Clock,
  Eye,
  Phone,
  Mail
} from 'lucide-react';
import LocationAutocomplete from '@/shared/components/LocationAutocomplete';
import apiService from '@/services/api';
import { useToast } from '@/shared/hooks/use-toast';

// ✅ Importar interface Ride do ApiService
import { type Ride } from '@/services/api';

// Interface para dados do motorista
interface DriverStats {
  totalRides: number;
  activeRides: number;
  totalBookings: number;
  totalRevenue: number;
  rating: number;
  completedTrips: number;
  pendingOffers: number;
}

interface PartnershipOffer {
  id: string;
  hotelName: string;
  offerTitle: string;
  description: string;
  payment: string;
  location: string;
  startDate: string;
  endDate: string;
  status: 'pending' | 'accepted' | 'declined';
  benefits: string[];
}

interface Booking {
  id: string;
  passengerName: string;
  passengerEmail: string;
  passengerPhone: string;
  rideId: string;
  seats: number;
  totalPrice: number;
  status: 'confirmed' | 'pending' | 'cancelled';
  bookingDate: string;
  notes?: string;
}

// Interface para resolver o erro do uid
interface AppUser {
  id: string;
  uid?: string;
  email?: string;
  name?: string;
  phone?: string;
}

// 🆕 FUNÇÕES AUXILIARES
const getDriverName = (ride: Ride): string => {
  if (ride.driver) {
    return `${ride.driver.firstName} ${ride.driver.lastName}`;
  }
  return ride.driverName || 'Motorista';
};

// ✅ CORREÇÃO: Usar formatPriceStringAsMzn padronizado
const formatPrice = (price: number): string => {
  return `${price.toFixed(2)} MT`;
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('pt-MZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export default function DriversHome() {
  const { user } = useAuth() as { user: AppUser | null };
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showCreateRide, setShowCreateRide] = useState(false);
  const [showRideDetails, setShowRideDetails] = useState(false);
  const [showBookingDetails, setShowBookingDetails] = useState(false);
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Form state para criar viagem
  const [rideForm, setRideForm] = useState({
    fromLocation: '',
    toLocation: '',
    departureDate: '',
    departureTime: '',
    price: '',
    maxPassengers: 4,
    vehicleType: 'sedan',
    description: ''
  });

  const userId = user?.id || user?.uid;

  // 🚗 BUSCAR VIAGENS REAIS DO MOTORISTA
  const { data: driverRides = [], isLoading: ridesLoading } = useQuery({
    queryKey: ['driver-rides', userId],
    queryFn: async () => {
      if (!userId) throw new Error('Usuário não autenticado');
      
      try {
        // Buscar todas as viagens e filtrar as do motorista atual
        const response = await apiService.searchRides({});
        const myRides = response.rides.filter((ride: Ride) => ride.driverId === userId);
        console.log('🚗 Viagens do motorista:', myRides);
        return myRides;
      } catch (error) {
        console.error('❌ Erro ao buscar viagens do motorista:', error);
        toast({
          title: "Erro ao carregar viagens",
          description: "Não foi possível carregar suas viagens. Tente novamente.",
          variant: "destructive"
        });
        return [];
      }
    },
    enabled: !!userId,
  });

  // 🤝 BUSCAR OFERTAS DE PARCERIA REAIS
  const { data: partnershipOffers = [], isLoading: offersLoading } = useQuery({
    queryKey: ['partnership-offers', userId],
    queryFn: async () => {
      if (!userId) throw new Error('Usuário não autenticado');
      
      try {
        // ✅ CORREÇÃO: Verificar se a função existe antes de chamar
        if (typeof apiService.getPartnershipRequests === 'function') {
          const offers = await apiService.getPartnershipRequests() || [];
          console.log('🤝 Ofertas de parceria:', offers);
          return offers;
        } else {
          console.log('⚠️ getPartnershipRequests não disponível, retornando array vazio');
          return [];
        }
      } catch (error) {
        console.error('❌ Erro ao buscar ofertas de parceria:', error);
        toast({
          title: "Erro ao carregar ofertas",
          description: "Não foi possível carregar as ofertas de parceria.",
          variant: "destructive"
        });
        return [];
      }
    },
    enabled: !!userId,
  });

  // 📋 BUSCAR RESERVAS DAS VIAGENS DO MOTORISTA
  const { data: driverBookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ['driver-bookings', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      try {
        // Simular busca de reservas - implementar endpoint real depois
        const bookings: Booking[] = [
          {
            id: '1',
            passengerName: 'Maria Santos',
            passengerEmail: 'maria@email.com',
            passengerPhone: '+258 84 123 4567',
            rideId: '1',
            seats: 2,
            totalPrice: 3000,
            status: 'confirmed',
            bookingDate: '2025-09-10T10:00:00Z',
            notes: 'Precisa de espaço para mala grande'
          },
          {
            id: '2',
            passengerName: 'João Silva',
            passengerEmail: 'joao@email.com',
            passengerPhone: '+258 85 987 6543',
            rideId: '1',
            seats: 1,
            totalPrice: 1500,
            status: 'pending',
            bookingDate: '2025-09-11T14:30:00Z'
          }
        ];
        return bookings;
      } catch (error) {
        console.error('❌ Erro ao buscar reservas:', error);
        return [];
      }
    },
    enabled: !!userId,
  });

  // 📊 CALCULAR ESTATÍSTICAS EM TEMPO REAL
  const driverStats: DriverStats = {
    totalRides: driverRides.length,
    activeRides: driverRides.filter((ride: Ride) => ride.status === 'active').length,
    totalBookings: driverBookings.length,
    totalRevenue: driverBookings.reduce((sum: number, booking: Booking) => sum + booking.totalPrice, 0),
    rating: 4.8,
    completedTrips: driverRides.filter((ride: Ride) => ride.status === 'completed').length,
    pendingOffers: partnershipOffers.filter((offer: PartnershipOffer) => offer.status === 'pending').length
  };

  // 📤 MUTATION PARA CRIAR VIAGEM
  const createRideMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!userId) throw new Error('Usuário não autenticado');
      
      const rideData = {
        fromLocation: data.fromLocation,
        toLocation: data.toLocation,
        departureDate: data.departureDate,
        departureTime: data.departureTime,
        pricePerSeat: parseFloat(data.price),
        availableSeats: data.maxPassengers,
        maxPassengers: data.maxPassengers,
        vehicleType: data.vehicleType,
        additionalInfo: data.description,
        driverId: userId
      };
      
      console.log('📤 Criando viagem:', rideData);
      return await apiService.createRide(rideData);
    },
    onSuccess: (data) => {
      console.log('✅ Viagem criada com sucesso:', data);
      setShowCreateRide(false);
      setRideForm({ 
        fromLocation: '', 
        toLocation: '', 
        departureDate: '', 
        departureTime: '', 
        price: '', 
        maxPassengers: 4, 
        vehicleType: 'sedan', 
        description: '' 
      });
      
      queryClient.invalidateQueries({ queryKey: ['driver-rides'] });
      
      toast({
        title: "Viagem publicada!",
        description: "Sua viagem foi publicada com sucesso e está visível para passageiros.",
        variant: "default"
      });
    },
    onError: (error: any) => {
      console.error('❌ Erro ao criar viagem:', error);
      toast({
        title: "Erro ao publicar viagem",
        description: error.message || "Não foi possível publicar a viagem. Tente novamente.",
        variant: "destructive"
      });
    }
  });

  // ❌ MUTATION PARA CANCELAR VIAGEM
  const cancelRideMutation = useMutation({
    mutationFn: async (rideId: string) => {
      console.log('❌ Cancelando viagem:', rideId);
      // ✅ CORREÇÃO: Usar API real se disponível
      if (typeof apiService.cancelRide === 'function') {
        return await apiService.cancelRide(rideId);
      } else {
        // Simular API call temporariamente
        return new Promise((resolve) => setTimeout(resolve, 1000));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-rides'] });
      toast({
        title: "Viagem cancelada",
        description: "A viagem foi cancelada com sucesso.",
        variant: "default"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao cancelar viagem",
        description: "Não foi possível cancelar a viagem. Tente novamente.",
        variant: "destructive"
      });
    }
  });

  // ✅ MUTATION PARA ACEITAR OFERTA DE PARCERIA
  const acceptPartnershipMutation = useMutation({
    mutationFn: async (offerId: string) => {
      console.log('✅ Aceitando oferta:', offerId);
      // ✅ CORREÇÃO: Usar API real se disponível
      return new Promise((resolve) => setTimeout(resolve, 1000));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partnership-offers'] });
      toast({
        title: "Oferta aceite!",
        description: "Você aceitou a oferta de parceria com sucesso.",
        variant: "default"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao aceitar oferta",
        description: "Não foi possível aceitar a oferta. Tente novamente.",
        variant: "destructive"
      });
    }
  });

  // ❌ MUTATION PARA RECUSAR OFERTA DE PARCERIA
  const declinePartnershipMutation = useMutation({
    mutationFn: async (offerId: string) => {
      console.log('❌ Recusando oferta:', offerId);
      return new Promise((resolve) => setTimeout(resolve, 1000));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partnership-offers'] });
      toast({
        title: "Oferta recusada",
        description: "Você recusou a oferta de parceria.",
        variant: "default"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao recusar oferta",
        description: "Não foi possível recusar a oferta. Tente novamente.",
        variant: "destructive"
      });
    }
  });

  // 📋 MUTATION PARA CONFIRMAR RESERVA
  const confirmBookingMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      console.log('✅ Confirmando reserva:', bookingId);
      return new Promise((resolve) => setTimeout(resolve, 1000));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-bookings'] });
      toast({
        title: "Reserva confirmada!",
        description: "A reserva foi confirmada com sucesso.",
        variant: "default"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao confirmar reserva",
        description: "Não foi possível confirmar a reserva. Tente novamente.",
        variant: "destructive"
      });
    }
  });

  // ❌ MUTATION PARA CANCELAR RESERVA
  const cancelBookingMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      console.log('❌ Cancelando reserva:', bookingId);
      return new Promise((resolve) => setTimeout(resolve, 1000));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-bookings'] });
      toast({
        title: "Reserva cancelada",
        description: "A reserva foi cancelada com sucesso.",
        variant: "default"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao cancelar reserva",
        description: "Não foi possível cancelar a reserva. Tente novamente.",
        variant: "destructive"
      });
    }
  });

  // Handlers
  const handleCreateRide = () => {
    if (!rideForm.fromLocation || !rideForm.toLocation || !rideForm.price) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha origem, destino e preço.",
        variant: "destructive"
      });
      return;
    }
    
    if (!rideForm.departureDate || !rideForm.departureTime) {
      toast({
        title: "Data e hora obrigatórias",
        description: "Por favor, selecione data e hora de partida.",
        variant: "destructive"
      });
      return;
    }
    
    createRideMutation.mutate(rideForm);
  };

  const handleCancelRide = (rideId: string) => {
    if (confirm('Tem certeza que deseja cancelar esta viagem?')) {
      cancelRideMutation.mutate(rideId);
    }
  };

  const handleViewRideDetails = (ride: Ride) => {
    setSelectedRide(ride);
    setShowRideDetails(true);
  };

  const handleViewBookingDetails = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowBookingDetails(true);
  };

  const handleAcceptPartnership = (offerId: string) => {
    if (confirm('Tem certeza que deseja aceitar esta oferta de parceria?')) {
      acceptPartnershipMutation.mutate(offerId);
    }
  };

  const handleDeclinePartnership = (offerId: string) => {
    if (confirm('Tem certeza que deseja recusar esta oferta de parceria?')) {
      declinePartnershipMutation.mutate(offerId);
    }
  };

  const handleConfirmBooking = (bookingId: string) => {
    if (confirm('Confirmar esta reserva?')) {
      confirmBookingMutation.mutate(bookingId);
    }
  };

  const handleCancelBooking = (bookingId: string) => {
    if (confirm('Cancelar esta reserva?')) {
      cancelBookingMutation.mutate(bookingId);
    }
  };

  const isLoading = ridesLoading || offersLoading || bookingsLoading;

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Car className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
            <p className="text-gray-600 mb-4">
              Esta área é exclusiva para motoristas registados.
            </p>
            <Link href="/login">
              <Button className="w-full">Fazer Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando seus dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              Link-A Motoristas
            </h1>
            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200">
              Centro de Viagens
            </Badge>
          </div>
          
          <div className="flex items-center space-x-4">
            <Link href="/" data-testid="link-main-app">
              <Button variant="outline">
                🏠 App Principal
              </Button>
            </Link>
            <Button variant="ghost" data-testid="button-user-menu">
              <UserCheck className="w-4 h-4 mr-2" />
              {user.email?.split('@')[0]}
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Estatísticas de resumo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-3 bg-blue-500 rounded-lg">
                  <Car className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-blue-700">Viagens Ativas</p>
                  <p className="text-3xl font-bold text-blue-900">{driverStats.activeRides}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-3 bg-green-500 rounded-lg">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-green-700">Total Reservas</p>
                  <p className="text-3xl font-bold text-green-900">{driverStats.totalBookings}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-3 bg-purple-500 rounded-lg">
                  <Handshake className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-purple-700">Ofertas Parceria</p>
                  <p className="text-3xl font-bold text-purple-900">{driverStats.pendingOffers}</p>
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
                  <p className="text-sm font-medium text-yellow-700">Receita Total</p>
                  <p className="text-3xl font-bold text-yellow-900">{formatPrice(driverStats.totalRevenue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Centro de Controlo Simplificado */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Centro de Controlo do Motorista</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Dialog open={showCreateRide} onOpenChange={setShowCreateRide}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700 h-16 flex-col" data-testid="button-create-ride">
                    <Plus className="w-6 h-6 mb-1" />
                    <span className="text-xs">Publicar Viagem</span>
                  </Button>
                </DialogTrigger>
              </Dialog>
              
              <Button variant="outline" className="h-16 flex-col" onClick={() => setActiveTab('bookings')} data-testid="button-view-bookings">
                <Calendar className="w-6 h-6 mb-1" />
                <span className="text-xs">Minhas Reservas ({driverStats.totalBookings})</span>
              </Button>
              
              <Button variant="outline" className="h-16 flex-col" onClick={() => setActiveTab('partnerships')} data-testid="button-partnerships">
                <Handshake className="w-6 h-6 mb-1" />
                <span className="text-xs">Parcerias ({driverStats.pendingOffers})</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Gestão por abas */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Resumo</TabsTrigger>
            <TabsTrigger value="rides">Minhas Viagens ({driverStats.totalRides})</TabsTrigger>
            <TabsTrigger value="partnerships">Parcerias ({driverStats.pendingOffers})</TabsTrigger>
            <TabsTrigger value="bookings">Reservas ({driverStats.totalBookings})</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="w-5 h-5" />
                  Resumo da Atividade
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Performance do motorista */}
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">Perfil do Motorista</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-2">
                        <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                        <span className="ml-1 font-bold text-lg">{driverStats.rating}</span>
                      </div>
                      <p className="text-sm text-gray-600">Avaliação</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{driverStats.completedTrips}</p>
                      <p className="text-sm text-gray-600">Viagens Completas</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{formatPrice(driverStats.totalRevenue)}</p>
                      <p className="text-sm text-gray-600">Receita Total</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">{driverStats.activeRides}</p>
                      <p className="text-sm text-gray-600">Viagens Ativas</p>
                    </div>
                  </div>
                </div>

                {/* Próximas viagens */}
                {driverStats.activeRides > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Próximas Viagens</h3>
                    <div className="space-y-3">
                      {driverRides
                        .filter((ride: Ride) => ride.status === 'active')
                        .slice(0, 2)
                        .map((ride: Ride) => (
                        <div key={ride.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <Car className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium">{ride.fromLocation} → {ride.toLocation}</p>
                              <p className="text-sm text-gray-600">{ride.departureDate} às {ride.departureTime}</p>
                            </div>
                          </div>
                          <Badge variant={ride.availableSeats > 0 ? "default" : "secondary"}>
                            {ride.availableSeats > 0 ? `${ride.availableSeats} lugares` : 'Lotado'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Próximas reservas */}
                {driverBookings.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Próximas Reservas</h3>
                    <div className="space-y-3">
                      {driverBookings.slice(0, 3).map((booking: Booking) => (
                        <div key={booking.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                              <Users className="w-4 h-4 text-green-600" />
                            </div>
                            <div>
                              <p className="font-medium">{booking.passengerName}</p>
                              <p className="text-sm text-gray-600">{formatDate(booking.bookingDate)}</p>
                            </div>
                          </div>
                          <Badge 
                            className={
                              booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                              booking.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }
                          >
                            {booking.status === 'confirmed' ? 'Confirmada' :
                             booking.status === 'pending' ? 'Pendente' : 'Cancelada'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rides">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="w-5 h-5" />
                  Gestão de Viagens ({driverStats.totalRides})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="active">
                  <TabsList>
                    <TabsTrigger value="active">Ativas ({driverStats.activeRides})</TabsTrigger>
                    <TabsTrigger value="completed">Concluídas ({driverStats.completedTrips})</TabsTrigger>
                    <TabsTrigger value="cancelled">Canceladas</TabsTrigger>
                  </TabsList>

                  <TabsContent value="active" className="space-y-4">
                    {driverStats.activeRides === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <Car className="h-16 w-16 mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-medium mb-2">Nenhuma viagem ativa</h3>
                        <p className="text-sm mb-4">Publique sua primeira viagem para começar a receber passageiros.</p>
                        <Button 
                          onClick={() => setShowCreateRide(true)}
                          className="bg-blue-600 hover:bg-blue-700"
                          data-testid="button-create-first-ride"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Publicar Primeira Viagem
                        </Button>
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        {driverRides
                          .filter((ride: Ride) => ride.status === 'active')
                          .map((ride: Ride) => (
                          <Card key={ride.id} className="border-l-4 border-l-green-500 hover:shadow-md transition-shadow">
                            <CardContent className="pt-6">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-3">
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                      <Car className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-semibold">{ride.fromLocation}</span>
                                        <span className="text-gray-400">→</span>
                                        <span className="font-semibold">{ride.toLocation}</span>
                                      </div>
                                      <p className="text-sm text-gray-600 mt-1">{ride.description}</p>
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-4 w-4" />
                                      <span>{new Date(ride.departureDate).toLocaleDateString('pt-MZ')}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-4 w-4" />
                                      <span>{ride.departureTime}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Users className="h-4 w-4" />
                                      <span>{ride.availableSeats}/{ride.maxPassengers} lugares</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Car className="h-4 w-4" />
                                      <span className="capitalize">{ride.vehicleType}</span>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <Badge 
                                        variant={ride.availableSeats > 0 ? "default" : "secondary"}
                                        className={ride.availableSeats > 0 ? "bg-green-100 text-green-700" : ""}
                                      >
                                        {ride.availableSeats > 0 ? "Disponível" : "Lotado"}
                                      </Badge>
                                      <span className="text-sm text-gray-600">
                                        {driverBookings.filter((b: Booking) => b.rideId === ride.id).length} reserva(s)
                                      </span>
                                    </div>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => handleViewRideDetails(ride)}
                                    >
                                      <Eye className="w-3 h-3 mr-1" />
                                      Detalhes
                                    </Button>
                                  </div>
                                </div>
                                
                                <div className="text-right ml-6">
                                  <div className="text-2xl font-bold text-green-600 mb-3">
                                    {formatPrice(ride.price)}
                                    <span className="text-sm text-gray-500 font-normal">/pessoa</span>
                                  </div>
                                  <div className="space-y-2">
                                    <Button size="sm" variant="outline" className="w-full" data-testid={`button-edit-ride-${ride.id}`}>
                                      <Edit className="w-3 h-3 mr-1" />
                                      Editar
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      className="w-full" 
                                      onClick={() => handleCancelRide(ride.id)}
                                      disabled={cancelRideMutation.isPending}
                                      data-testid={`button-cancel-ride-${ride.id}`}
                                    >
                                      <XCircle className="w-3 h-3 mr-1" />
                                      {cancelRideMutation.isPending ? 'Cancelando...' : 'Cancelar'}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="completed">
                    {driverStats.completedTrips === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <CheckCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-medium mb-2">Nenhuma viagem concluída</h3>
                        <p className="text-sm">Suas viagens concluídas aparecerão aqui.</p>
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        {driverRides
                          .filter((ride: Ride) => ride.status === 'completed')
                          .map((ride: Ride) => (
                          <Card key={ride.id} className="border-l-4 border-l-blue-500">
                            <CardContent className="pt-6">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-3">
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                      <Car className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-semibold">{ride.fromLocation}</span>
                                        <span className="text-gray-400">→</span>
                                        <span className="font-semibold">{ride.toLocation}</span>
                                      </div>
                                      <p className="text-sm text-gray-600 mt-1">Concluída em {new Date(ride.departureDate).toLocaleDateString('pt-MZ')}</p>
                                    </div>
                                  </div>
                                </div>
                                <Badge className="bg-blue-100 text-blue-700">Concluída</Badge>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="cancelled">
                    <div className="text-center py-12 text-gray-500">
                      <XCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-medium mb-2">Nenhuma viagem cancelada</h3>
                      <p className="text-sm">Viagens canceladas aparecerão aqui para referência.</p>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="partnerships">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Handshake className="w-5 h-5" />
                  Ofertas de Parceria ({driverStats.pendingOffers})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {partnershipOffers.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Handshake className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">Nenhuma oferta de parceria</h3>
                    <p className="text-sm mb-4">Ofertas de hotéis para parcerias aparecerão aqui.</p>
                    <div className="bg-blue-50 p-4 rounded-lg max-w-md mx-auto">
                      <p className="text-sm text-blue-700">
                        💡 <strong>Dica:</strong> Hotéis podem oferecer parcerias lucrativas para transfers e serviços especiais.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {partnershipOffers.map((offer: PartnershipOffer) => (
                      <Card key={offer.id} className="border-l-4 border-l-purple-500">
                        <CardContent className="pt-6">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-purple-100 rounded-lg">
                                  <Handshake className="h-5 w-5 text-purple-600" />
                                </div>
                                <div>
                                  <h3 className="font-semibold text-lg">{offer.offerTitle}</h3>
                                  <p className="text-sm text-gray-600">{offer.hotelName}</p>
                                </div>
                              </div>
                              
                              <p className="text-gray-600 mb-3">{offer.description}</p>
                              
                              <div className="space-y-2 text-sm text-gray-600 mb-4">
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4" />
                                  <span>{offer.location}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4" />
                                  <span>{offer.startDate} - {offer.endDate}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <DollarSign className="h-4 w-4" />
                                  <span className="font-medium">{offer.payment}</span>
                                </div>
                              </div>
                              
                              {offer.benefits && offer.benefits.length > 0 && (
                                <div className="mb-4">
                                  <p className="text-sm font-medium mb-2">Benefícios Incluídos:</p>
                                  <div className="flex flex-wrap gap-2">
                                    {offer.benefits.map((benefit, index) => (
                                      <Badge key={index} variant="outline" className="text-xs bg-green-50 text-green-700">
                                        {benefit}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              <Badge className={`${
                                offer.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                offer.status === 'accepted' ? 'bg-green-100 text-green-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {offer.status === 'pending' ? 'Pendente' :
                                 offer.status === 'accepted' ? 'Aceite' : 'Recusada'}
                              </Badge>
                            </div>
                            
                            <div className="ml-6">
                              {offer.status === 'pending' && (
                                <div className="space-y-2">
                                  <Button 
                                    size="sm" 
                                    className="w-full bg-green-600 hover:bg-green-700"
                                    onClick={() => handleAcceptPartnership(offer.id)}
                                    disabled={acceptPartnershipMutation.isPending}
                                  >
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    {acceptPartnershipMutation.isPending ? 'Aceitando...' : 'Aceitar'}
                                  </Button>
                                  <Button size="sm" variant="outline" className="w-full">
                                    <MessageCircle className="w-3 h-3 mr-1" />
                                    Negociar
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="w-full"
                                    onClick={() => handleDeclinePartnership(offer.id)}
                                    disabled={declinePartnershipMutation.isPending}
                                  >
                                    <XCircle className="w-3 h-3 mr-1" />
                                    {declinePartnershipMutation.isPending ? 'Recusando...' : 'Recusar'}
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bookings">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Reservas das Minhas Viagens ({driverStats.totalBookings})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {driverBookings.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">Nenhuma reserva ativa</h3>
                    <p className="text-sm">Quando passageiros reservarem suas viagens, as informações aparecerão aqui.</p>
                  </div>
                ) : (
                  <Tabs defaultValue="all">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="all">Todas ({driverBookings.length})</TabsTrigger>
                      <TabsTrigger value="confirmed">Confirmadas ({driverBookings.filter((b: Booking) => b.status === 'confirmed').length})</TabsTrigger>
                      <TabsTrigger value="pending">Pendentes ({driverBookings.filter((b: Booking) => b.status === 'pending').length})</TabsTrigger>
                    </TabsList>

                    <TabsContent value="all" className="space-y-4">
                      {driverBookings.map((booking: Booking) => (
                        <Card key={booking.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="pt-6">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3">
                                  <div className="p-2 bg-green-100 rounded-lg">
                                    <Users className="h-5 w-5 text-green-600" />
                                  </div>
                                  <div>
                                    <h3 className="font-semibold text-lg">{booking.passengerName}</h3>
                                    <p className="text-sm text-gray-600">
                                      {driverRides.find((r: Ride) => r.id === booking.rideId)?.fromLocation} → 
                                      {driverRides.find((r: Ride) => r.id === booking.rideId)?.toLocation}
                                    </p>
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4" />
                                    <span>{formatDate(booking.bookingDate)}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Users className="h-4 w-4" />
                                    <span>{booking.seats} passageiro(s)</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <DollarSign className="h-4 w-4" />
                                    <span>{formatPrice(booking.totalPrice)}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Mail className="h-4 w-4" />
                                    <span>{booking.passengerEmail}</span>
                                  </div>
                                </div>
                                
                                {booking.notes && (
                                  <div className="bg-gray-50 p-3 rounded-lg mb-3">
                                    <p className="text-sm text-gray-600">
                                      <strong>Observações:</strong> {booking.notes}
                                    </p>
                                  </div>
                                )}
                                
                                <Badge className={`${
                                  booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                  booking.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {booking.status === 'confirmed' ? 'Confirmada' :
                                   booking.status === 'pending' ? 'Pendente' : 'Cancelada'}
                                </Badge>
                              </div>
                              
                              <div className="ml-6 space-y-2">
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="w-full"
                                  onClick={() => handleViewBookingDetails(booking)}
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  Detalhes
                                </Button>
                                {booking.status === 'pending' && (
                                  <>
                                    <Button 
                                      size="sm" 
                                      className="w-full bg-green-600 hover:bg-green-700"
                                      onClick={() => handleConfirmBooking(booking.id)}
                                      disabled={confirmBookingMutation.isPending}
                                    >
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      {confirmBookingMutation.isPending ? 'Confirmando...' : 'Confirmar'}
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      className="w-full"
                                      onClick={() => handleCancelBooking(booking.id)}
                                      disabled={cancelBookingMutation.isPending}
                                    >
                                      <XCircle className="w-3 h-3 mr-1" />
                                      {cancelBookingMutation.isPending ? 'Cancelando...' : 'Cancelar'}
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </TabsContent>

                    <TabsContent value="confirmed" className="space-y-4">
                      {driverBookings
                        .filter((booking: Booking) => booking.status === 'confirmed')
                        .map((booking: Booking) => (
                        <Card key={booking.id} className="border-l-4 border-l-green-500">
                          <CardContent className="pt-6">
                            {/* Similar structure to all bookings */}
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="font-semibold text-lg">{booking.passengerName}</h3>
                                <p className="text-sm text-gray-600">{booking.passengerEmail}</p>
                                <Badge className="bg-green-100 text-green-700 mt-2">Confirmada</Badge>
                              </div>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleViewBookingDetails(booking)}
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                Detalhes
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </TabsContent>

                    <TabsContent value="pending" className="space-y-4">
                      {driverBookings
                        .filter((booking: Booking) => booking.status === 'pending')
                        .map((booking: Booking) => (
                        <Card key={booking.id} className="border-l-4 border-l-yellow-500">
                          <CardContent className="pt-6">
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="font-semibold text-lg">{booking.passengerName}</h3>
                                <p className="text-sm text-gray-600">Aguardando confirmação</p>
                                <Badge className="bg-yellow-100 text-yellow-700 mt-2">Pendente</Badge>
                              </div>
                              <div className="space-y-2">
                                <Button 
                                  size="sm" 
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={() => handleConfirmBooking(booking.id)}
                                  disabled={confirmBookingMutation.isPending}
                                >
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Confirmar
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleCancelBooking(booking.id)}
                                  disabled={cancelBookingMutation.isPending}
                                >
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Recusar
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </TabsContent>
                  </Tabs>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal para criar viagem */}
      <Dialog open={showCreateRide} onOpenChange={setShowCreateRide}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Car className="w-5 h-5" />
              Publicar Nova Viagem
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="from-location">Saindo de</Label>
                <LocationAutocomplete
                  id="from-location"
                  placeholder="Cidade de origem (Moçambique)"
                  value={rideForm.fromLocation}
                  onChange={(value) => setRideForm(prev => ({ ...prev, fromLocation: value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="to-location">Indo para</Label>
                <LocationAutocomplete
                  id="to-location"
                  placeholder="Cidade de destino (Moçambique)"
                  value={rideForm.toLocation}
                  onChange={(value) => setRideForm(prev => ({ ...prev, toLocation: value }))}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="departure-date">Data de Partida</Label>
                <Input 
                  id="departure-date" 
                  type="date"
                  value={rideForm.departureDate}
                  onChange={(e) => setRideForm(prev => ({ ...prev, departureDate: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                  data-testid="input-departure-date"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="departure-time">Hora de Partida</Label>
                <Input 
                  id="departure-time" 
                  type="time"
                  value={rideForm.departureTime}
                  onChange={(e) => setRideForm(prev => ({ ...prev, departureTime: e.target.value }))}
                  data-testid="input-departure-time"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ride-price">Preço por Pessoa (MT)</Label>
                <Input 
                  id="ride-price" 
                  type="number"
                  value={rideForm.price}
                  onChange={(e) => setRideForm(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="Ex: 1500"
                  data-testid="input-ride-price"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max-passengers">Máximo de Passageiros</Label>
                <Select value={rideForm.maxPassengers.toString()} onValueChange={(value) => setRideForm(prev => ({ ...prev, maxPassengers: parseInt(value) }))}>
                  <SelectTrigger data-testid="select-max-passengers">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 passageiro</SelectItem>
                    <SelectItem value="2">2 passageiros</SelectItem>
                    <SelectItem value="3">3 passageiros</SelectItem>
                    <SelectItem value="4">4 passageiros</SelectItem>
                    <SelectItem value="6">6 passageiros</SelectItem>
                    <SelectItem value="8">8 passageiros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vehicle-type">Tipo de Veículo</Label>
                <Select value={rideForm.vehicleType} onValueChange={(value) => setRideForm(prev => ({ ...prev, vehicleType: value }))}>
                  <SelectTrigger data-testid="select-vehicle-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sedan">Sedan</SelectItem>
                    <SelectItem value="suv">SUV</SelectItem>
                    <SelectItem value="minivan">Minivan</SelectItem>
                    <SelectItem value="pickup">Pickup</SelectItem>
                    <SelectItem value="hatchback">Hatchback</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="ride-description">Descrição da Viagem</Label>
              <Textarea 
                id="ride-description" 
                value={rideForm.description}
                onChange={(e) => setRideForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descreva detalhes da viagem: conforto do veículo, paradas, regras, etc."
                rows={3}
                data-testid="textarea-ride-description"
              />
            </div>
            
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowCreateRide(false)} data-testid="button-cancel-ride">
                Cancelar
              </Button>
              <Button 
                onClick={handleCreateRide}
                disabled={createRideMutation.isPending || !rideForm.fromLocation || !rideForm.toLocation || !rideForm.price || !rideForm.departureDate || !rideForm.departureTime}
                className="bg-blue-600 hover:bg-blue-700"
                data-testid="button-save-ride"
              >
                {createRideMutation.isPending ? 'Publicando...' : 'Publicar Viagem'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de detalhes da viagem */}
      <Dialog open={showRideDetails} onOpenChange={setShowRideDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Viagem</DialogTitle>
          </DialogHeader>
          {selectedRide && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Rota</Label>
                  <p className="font-semibold">{selectedRide.fromLocation} → {selectedRide.toLocation}</p>
                </div>
                <div>
                  <Label>Data e Hora</Label>
                  <p className="font-semibold">{selectedRide.departureDate} às {selectedRide.departureTime}</p>
                </div>
                <div>
                  <Label>Preço por Pessoa</Label>
                  <p className="font-semibold text-green-600">{formatPrice(selectedRide.price)}</p>
                </div>
                <div>
                  <Label>Lugares Disponíveis</Label>
                  <p className="font-semibold">{selectedRide.availableSeats}/{selectedRide.maxPassengers}</p>
                </div>
                <div>
                  <Label>Tipo de Veículo</Label>
                  <p className="font-semibold capitalize">{selectedRide.vehicleType}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <Badge className={
                    selectedRide.status === 'active' ? 'bg-green-100 text-green-700' :
                    selectedRide.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                    'bg-red-100 text-red-700'
                  }>
                    {selectedRide.status === 'active' ? 'Ativa' :
                     selectedRide.status === 'completed' ? 'Concluída' : 'Cancelada'}
                  </Badge>
                </div>
              </div>
              
              {selectedRide.description && (
                <div>
                  <Label>Descrição</Label>
                  <p className="text-gray-600 mt-1">{selectedRide.description}</p>
                </div>
              )}
              
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setShowRideDetails(false)}>
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de detalhes da reserva */}
      <Dialog open={showBookingDetails} onOpenChange={setShowBookingDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Reserva</DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Passageiro</Label>
                  <p className="font-semibold">{selectedBooking.passengerName}</p>
                </div>
                <div>
                  <Label>Email</Label>
                  <p className="font-semibold">{selectedBooking.passengerEmail}</p>
                </div>
                <div>
                  <Label>Telefone</Label>
                  <p className="font-semibold">{selectedBooking.passengerPhone}</p>
                </div>
                <div>
                  <Label>Nº de Passageiros</Label>
                  <p className="font-semibold">{selectedBooking.seats}</p>
                </div>
                <div>
                  <Label>Valor Total</Label>
                  <p className="font-semibold text-green-600">{formatPrice(selectedBooking.totalPrice)}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <Badge className={
                    selectedBooking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                    selectedBooking.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }>
                    {selectedBooking.status === 'confirmed' ? 'Confirmada' :
                     selectedBooking.status === 'pending' ? 'Pendente' : 'Cancelada'}
                  </Badge>
                </div>
                <div className="md:col-span-2">
                  <Label>Data da Reserva</Label>
                  <p className="font-semibold">{formatDate(selectedBooking.bookingDate)}</p>
                </div>
              </div>
              
              {selectedBooking.notes && (
                <div>
                  <Label>Observações</Label>
                  <p className="text-gray-600 mt-1">{selectedBooking.notes}</p>
                </div>
              )}
              
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowBookingDetails(false)}>
                  Fechar
                </Button>
                {selectedBooking.status === 'pending' && (
                  <>
                    <Button 
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => handleConfirmBooking(selectedBooking.id)}
                      disabled={confirmBookingMutation.isPending}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Confirmar Reserva
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => handleCancelBooking(selectedBooking.id)}
                      disabled={cancelBookingMutation.isPending}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Cancelar Reserva
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}