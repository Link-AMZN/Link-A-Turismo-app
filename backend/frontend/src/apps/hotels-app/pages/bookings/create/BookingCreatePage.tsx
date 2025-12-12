// src/apps/hotels-app/pages/bookings/create/BookingCreatePage.tsx - VERSÃO CORRIGIDA
import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Calendar } from '@/shared/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover';
import { Badge } from '@/shared/components/ui/badge';
import { format } from 'date-fns';
import { 
  ArrowLeft, Calendar as CalendarIcon, User,
  Users, Bed, DollarSign, CheckCircle, Building2,
  Clock, AlertCircle, Plus, CreditCard, Save
} from 'lucide-react';
import { apiService } from '@/services/api';
import { useToast } from '@/shared/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function BookingCreatePage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedHotelId, setSelectedHotelId] = useState<string>('');
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<string>('');
  const [hotels, setHotels] = useState<any[]>([]);
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);

  // Form data
  const [formData, setFormData] = useState({
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    checkIn: '',
    checkOut: '',
    adults: 2,
    children: 0,
    units: 1,
    specialRequests: '',
    paymentMethod: 'cash',
    promoCode: '',
  });

  // ✅✅✅ CORREÇÃO: Adicionar logs de debug ✅✅✅
  useEffect(() => {
    console.log('🔍 BookingCreatePage - Estado atual:');
    console.log('  selectedHotelId:', selectedHotelId);
    console.log('  selectedRoomTypeId:', selectedRoomTypeId);
    console.log('  roomTypes count:', roomTypes.length);
    console.log('  selectedRoom:', selectedRoom);
  }, [selectedHotelId, selectedRoomTypeId, roomTypes, selectedRoom]);

  // Buscar hotéis
  useEffect(() => {
    const fetchHotels = async () => {
      try {
        console.log('🔍 BookingCreatePage: Buscando hotéis...');
        const response = await apiService.getAllHotels();
        console.log('📋 BookingCreatePage: Resposta de hotéis:', response);
        
        if (response.success && response.data) {
          const hotelsData = Array.isArray(response.data) ? response.data : [];
          console.log('✅ BookingCreatePage: Hotéis carregados:', hotelsData.length);
          setHotels(hotelsData);
        } else {
          console.error('❌ BookingCreatePage: Erro ao buscar hotéis:', response.error);
          toast({
            title: 'Erro',
            description: 'Não foi possível carregar a lista de hotéis',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('❌ BookingCreatePage: Erro ao buscar hotéis:', error);
      }
    };
    fetchHotels();
  }, []);

  // Buscar tipos de quarto quando hotel for selecionado
  useEffect(() => {
    const fetchRoomTypes = async () => {
      if (!selectedHotelId || selectedHotelId === 'undefined') {
        console.log('⚠️ BookingCreatePage: hotelId inválido, não buscando room types');
        setRoomTypes([]);
        return;
      }
      
      console.log('🔍 BookingCreatePage: Buscando room types para hotel:', selectedHotelId);
      
      try {
        const response = await apiService.getRoomTypesByHotel(selectedHotelId);
        console.log('📋 BookingCreatePage: Resposta de room types:', response);
        
        if (response.success && response.data) {
          const rooms = Array.isArray(response.data) ? response.data : [];
          const activeRooms = rooms.filter((room: any) => room.is_active !== false);
          console.log('✅ BookingCreatePage: Room types carregados:', activeRooms.length);
          setRoomTypes(activeRooms);
          
          // Resetar room type selecionado se não estiver mais disponível
          if (selectedRoomTypeId && !activeRooms.some((r: any) => 
            r.id === selectedRoomTypeId || r.room_type_id === selectedRoomTypeId
          )) {
            console.log('🔄 BookingCreatePage: Resetando room type selecionado');
            setSelectedRoomTypeId('');
            setSelectedRoom(null);
          }
        } else {
          console.error('❌ BookingCreatePage: Erro ao buscar room types:', response.error);
          setRoomTypes([]);
        }
      } catch (error) {
        console.error('❌ BookingCreatePage: Erro ao buscar tipos de quarto:', error);
        setRoomTypes([]);
      }
    };
    
    fetchRoomTypes();
  }, [selectedHotelId]);

  // ✅✅✅ CORREÇÃO: Atualizar quarto selecionado com validação melhorada ✅✅✅
  useEffect(() => {
    console.log('🔄 BookingCreatePage: Atualizando room selecionado');
    console.log('  selectedRoomTypeId:', selectedRoomTypeId);
    console.log('  roomTypes count:', roomTypes.length);
    
    if (selectedRoomTypeId && selectedRoomTypeId !== 'undefined' && roomTypes.length > 0) {
      const room = roomTypes.find((r: any) => {
        const roomId = r.id || r.room_type_id;
        console.log('  Comparando:', roomId, 'com', selectedRoomTypeId);
        return roomId === selectedRoomTypeId;
      });
      
      console.log('  Room encontrado:', room);
      setSelectedRoom(room || null);
    } else {
      console.log('  Nenhum room encontrado, resetando...');
      setSelectedRoom(null);
    }
  }, [selectedRoomTypeId, roomTypes]);

  // ✅✅✅ CORREÇÃO: Função de cálculo de total melhorada ✅✅✅
  const calculateTotal = () => {
    if (!selectedRoom || !formData.checkIn || !formData.checkOut) {
      console.log('⚠️ BookingCreatePage: Dados insuficientes para cálculo');
      return 0;
    }
    
    try {
      const checkIn = new Date(formData.checkIn);
      const checkOut = new Date(formData.checkOut);
      
      // Validar datas
      if (checkIn >= checkOut) {
        console.error('❌ BookingCreatePage: Check-in deve ser antes do check-out');
        return 0;
      }
      
      const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
      
      // Obter preços com fallbacks
      const basePrice = parseFloat(selectedRoom.base_price || selectedRoom.basePrice || '0');
      const extraAdultPrice = parseFloat(selectedRoom.extra_adult_price || selectedRoom.extraAdultPrice || '0');
      const extraChildPrice = parseFloat(selectedRoom.extra_child_price || selectedRoom.extraChildPrice || '0');
      const baseOccupancy = parseInt(selectedRoom.base_occupancy || selectedRoom.baseOccupancy || '2');
      
      console.log('📊 BookingCreatePage: Cálculo detalhado:');
      console.log('  Preço base:', basePrice);
      console.log('  Noites:', nights);
      console.log('  Unidades:', formData.units);
      console.log('  Adultos:', formData.adults, '(base:', baseOccupancy, ')');
      console.log('  Crianças:', formData.children);
      console.log('  Preço adulto extra:', extraAdultPrice);
      console.log('  Preço criança extra:', extraChildPrice);
      
      // Calcular total base
      let total = basePrice * nights * formData.units;
      
      // Adicionar extras para adultos adicionais
      if (formData.adults > baseOccupancy) {
        const extraAdults = formData.adults - baseOccupancy;
        total += extraAdultPrice * extraAdults * nights * formData.units;
        console.log('  Extra adultos:', extraAdultPrice * extraAdults * nights * formData.units);
      }
      
      // Adicionar extras para crianças
      if (formData.children > 0) {
        total += extraChildPrice * formData.children * nights * formData.units;
        console.log('  Extra crianças:', extraChildPrice * formData.children * nights * formData.units);
      }
      
      console.log('💰 BookingCreatePage: Total calculado:', total);
      return total;
    } catch (error) {
      console.error('❌ BookingCreatePage: Erro ao calcular total:', error);
      return 0;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNumberChange = (name: string, value: string) => {
    const numValue = parseInt(value) || 0;
    
    // Validações específicas
    if (name === 'adults' && numValue < 1) {
      toast({
        title: 'Aviso',
        description: 'Número de adultos deve ser pelo menos 1',
        variant: 'destructive',
      });
      return;
    }
    
    if (name === 'units' && numValue < 1) {
      toast({
        title: 'Aviso',
        description: 'Número de unidades deve ser pelo menos 1',
        variant: 'destructive',
      });
      return;
    }
    
    if (name === 'units' && selectedRoom) {
      const availableUnits = selectedRoom.available_units || selectedRoom.availableUnits || 0;
      if (numValue > availableUnits) {
        toast({
          title: 'Aviso',
          description: `Apenas ${availableUnits} unidade(s) disponível(is)`,
          variant: 'destructive',
        });
        return;
      }
    }
    
    setFormData(prev => ({ ...prev, [name]: numValue }));
  };

  const handleDateChange = (name: string, date: Date | undefined) => {
    if (date) {
      const dateString = date.toISOString().split('T')[0];
      console.log(`📅 BookingCreatePage: ${name} alterado para:`, dateString);
      setFormData(prev => ({ ...prev, [name]: dateString }));
    }
  };

  const validateStep1 = () => {
    console.log('🔍 BookingCreatePage: Validando step 1...');
    
    if (!formData.guestName.trim()) {
      toast({ 
        title: 'Erro', 
        description: 'Nome do hóspede é obrigatório', 
        variant: 'destructive' 
      });
      return false;
    }
    
    if (!formData.guestEmail.trim()) {
      toast({ 
        title: 'Erro', 
        description: 'Email do hóspede é obrigatório', 
        variant: 'destructive' 
      });
      return false;
    }
    
    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.guestEmail)) {
      toast({ 
        title: 'Erro', 
        description: 'Email inválido', 
        variant: 'destructive' 
      });
      return false;
    }
    
    if (!formData.checkIn || !formData.checkOut) {
      toast({ 
        title: 'Erro', 
        description: 'Datas de check-in e check-out são obrigatórias', 
        variant: 'destructive' 
      });
      return false;
    }
    
    // Validar que check-in é anterior ao check-out
    const checkInDate = new Date(formData.checkIn);
    const checkOutDate = new Date(formData.checkOut);
    
    if (checkInDate >= checkOutDate) {
      toast({ 
        title: 'Erro', 
        description: 'Data de check-in deve ser anterior ao check-out', 
        variant: 'destructive' 
      });
      return false;
    }
    
    // Validar que check-in não é no passado (para demonstração, permitimos)
    // if (checkInDate < new Date()) {
    //   toast({ 
    //     title: 'Aviso', 
    //     description: 'Data de check-in não pode ser no passado', 
    //     variant: 'destructive' 
    //   });
    //   return false;
    // }
    
    if (formData.adults < 1) {
      toast({ 
        title: 'Erro', 
        description: 'Número de adultos deve ser pelo menos 1', 
        variant: 'destructive' 
      });
      return false;
    }
    
    if (formData.units < 1) {
      toast({ 
        title: 'Erro', 
        description: 'Número de unidades deve ser pelo menos 1', 
        variant: 'destructive' 
      });
      return false;
    }
    
    console.log('✅ BookingCreatePage: Step 1 validado com sucesso');
    return true;
  };

  const validateStep2 = () => {
    console.log('🔍 BookingCreatePage: Validando step 2...');
    
    if (!selectedHotelId || selectedHotelId === 'undefined') {
      toast({ 
        title: 'Erro', 
        description: 'Selecione um hotel', 
        variant: 'destructive' 
      });
      return false;
    }
    
    if (!selectedRoomTypeId || selectedRoomTypeId === 'undefined') {
      toast({ 
        title: 'Erro', 
        description: 'Selecione um tipo de quarto', 
        variant: 'destructive' 
      });
      return false;
    }
    
    // Validar disponibilidade
    if (selectedRoom) {
      const availableUnits = selectedRoom.available_units || selectedRoom.availableUnits || 0;
      if (formData.units > availableUnits) {
        toast({ 
          title: 'Erro', 
          description: `Apenas ${availableUnits} unidade(s) disponível(is) para este tipo de quarto`, 
          variant: 'destructive' 
        });
        return false;
      }
    }
    
    console.log('✅ BookingCreatePage: Step 2 validado com sucesso');
    return true;
  };

  const handleNextStep = () => {
    console.log(`➡️ BookingCreatePage: Indo para step ${step + 1}`);
    
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const handlePreviousStep = () => {
    console.log(`⬅️ BookingCreatePage: Voltando para step ${step - 1}`);
    if (step > 1) {
      setStep(step - 1);
    }
  };

  // ✅✅✅ CORREÇÃO: Mutation para criar booking com validação completa ✅✅✅
  const createBookingMutation = useMutation({
    mutationFn: async () => {
      console.log('📤 BookingCreatePage: Criando booking...');
      console.log('  Hotel ID:', selectedHotelId);
      console.log('  Room Type ID:', selectedRoomTypeId);
      
      // Validação rigorosa dos IDs
      if (!selectedHotelId || selectedHotelId === 'undefined') {
        throw new Error('ID do hotel é inválido ou não foi selecionado');
      }
      
      if (!selectedRoomTypeId || selectedRoomTypeId === 'undefined') {
        throw new Error('ID do tipo de quarto é inválido ou não foi selecionado');
      }
      
      // Verificar se o quarto ainda está disponível
      if (selectedRoom) {
        const availableUnits = selectedRoom.available_units || selectedRoom.availableUnits || 0;
        if (formData.units > availableUnits) {
          throw new Error(`Apenas ${availableUnits} unidade(s) disponível(is). Reduza o número de unidades.`);
        }
      }
      
      const bookingData = {
        hotelId: selectedHotelId,
        roomTypeId: selectedRoomTypeId,
        guestName: formData.guestName,
        guestEmail: formData.guestEmail,
        guestPhone: formData.guestPhone || '',
        checkIn: formData.checkIn,
        checkOut: formData.checkOut,
        adults: formData.adults,
        children: formData.children,
        units: formData.units,
        specialRequests: formData.specialRequests || '',
        paymentMethod: formData.paymentMethod,
        totalPrice: calculateTotal(),
      };
      
      console.log('📦 BookingCreatePage: Dados do booking:', bookingData);

      // Chamar API real para criar reserva
      const response = await apiService.createHotelBooking({
        hotelId: bookingData.hotelId,
        roomTypeId: bookingData.roomTypeId,
        guestName: bookingData.guestName,
        guestEmail: bookingData.guestEmail,
        guestPhone: bookingData.guestPhone,
        checkIn: bookingData.checkIn,
        checkOut: bookingData.checkOut,
        adults: bookingData.adults,
        children: bookingData.children,
        units: bookingData.units,
        specialRequests: bookingData.specialRequests,
        promoCode: formData.promoCode || undefined
      });

      console.log('📋 BookingCreatePage: Resposta da API:', response);

      if (!response.success) {
        throw new Error(response.error || 'Erro ao criar reserva');
      }

      // Extract bookingId from various response formats
      const extractedBookingId = 
        response.bookingId || 
        response.booking_id || 
        response.booking?.booking_id || 
        response.booking?.bookingId ||
        (response.booking as any)?.id;

      if (!extractedBookingId) {
        console.warn('⚠️ BookingCreatePage: bookingId não encontrado na resposta, usando confirmationCode');
      }

      return {
        success: true,
        bookingId: extractedBookingId || response.confirmationCode || response.confirmation_code,
        message: response.message || 'Reserva criada com sucesso!'
      };
    },
    onSuccess: (response: any) => {
      console.log('🎉 BookingCreatePage: Booking criado com sucesso:', response);
      
      toast({
        title: 'Sucesso!',
        description: response.message,
      });
      
      // Redirecionar para lista ou detalhes da reserva
      setTimeout(() => {
        if (response.bookingId) {
          console.log('📍 BookingCreatePage: Redirecionando para detalhes do booking:', response.bookingId);
          window.location.href = `/hotels/bookings/${response.bookingId}`;
        } else {
          console.log('📍 BookingCreatePage: Redirecionando para lista de reservas');
          window.location.href = `/hotels/bookings`;
        }
      }, 2000);
    },
    onError: (error: any) => {
      console.error('❌ BookingCreatePage: Erro ao criar booking:', error);
      
      toast({
        title: 'Erro ao criar reserva',
        description: error.message || 'Não foi possível criar a reserva. Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = () => {
    console.log('🚀 BookingCreatePage: Submetendo formulário...');
    
    // Validação final
    if (!validateStep1() || !validateStep2()) {
      return;
    }
    
    setLoading(true);
    console.log('⏳ BookingCreatePage: Iniciando criação do booking...');
    createBookingMutation.mutate();
    setLoading(false);
  };

  const totalNights = formData.checkIn && formData.checkOut 
    ? Math.ceil((new Date(formData.checkOut).getTime() - new Date(formData.checkIn).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const totalPrice = calculateTotal();

  // ✅✅✅ CORREÇÃO: Obter ID do hotel selecionado com fallback ✅✅✅
  const getSelectedHotel = () => {
    return hotels.find(h => (h.id || h.hotel_id) === selectedHotelId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <Link href="/hotels/bookings">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Voltar
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Nova Reserva</h1>
              <p className="text-gray-600">Crie uma nova reserva manualmente</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex space-x-2">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                    s === step
                      ? "bg-blue-600 text-white"
                      : s < step
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-400"
                  )}
                >
                  {s}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className={cn(
              "text-sm font-medium",
              step >= 1 ? "text-blue-600" : "text-gray-400"
            )}>
              1. Dados do Hóspede
            </span>
            <span className={cn(
              "text-sm font-medium",
              step >= 2 ? "text-blue-600" : "text-gray-400"
            )}>
              2. Hotel e Quarto
            </span>
            <span className={cn(
              "text-sm font-medium",
              step >= 3 ? "text-blue-600" : "text-gray-400"
            )}>
              3. Confirmação
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${((step - 1) / 2) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 1: Dados do Hóspede */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5" />
                Dados do Hóspede
              </CardTitle>
              <CardDescription>
                Informações básicas do hóspede e datas da estadia
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="guestName">Nome Completo *</Label>
                  <Input
                    id="guestName"
                    name="guestName"
                    value={formData.guestName}
                    onChange={handleInputChange}
                    placeholder="Nome do hóspede"
                    className="h-12"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="guestEmail">Email *</Label>
                  <Input
                    id="guestEmail"
                    name="guestEmail"
                    type="email"
                    value={formData.guestEmail}
                    onChange={handleInputChange}
                    placeholder="exemplo@email.com"
                    className="h-12"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="guestPhone">Telefone</Label>
                  <Input
                    id="guestPhone"
                    name="guestPhone"
                    value={formData.guestPhone}
                    onChange={handleInputChange}
                    placeholder="+258 84 000 0000"
                    className="h-12"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Check-in *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full h-12 justify-start text-left font-normal",
                          !formData.checkIn && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.checkIn ? format(new Date(formData.checkIn), 'PPP') : "Selecione a data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.checkIn ? new Date(formData.checkIn) : undefined}
                        onSelect={(date) => handleDateChange('checkIn', date)}
                        initialFocus
                        disabled={(date) => date < new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="space-y-2">
                  <Label>Check-out *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full h-12 justify-start text-left font-normal",
                          !formData.checkOut && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.checkOut ? format(new Date(formData.checkOut), 'PPP') : "Selecione a data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.checkOut ? new Date(formData.checkOut) : undefined}
                        onSelect={(date) => handleDateChange('checkOut', date)}
                        initialFocus
                        disabled={(date) => 
                          date <= new Date(formData.checkIn || new Date()) ||
                          date < new Date()
                        }
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="adults">Adultos *</Label>
                  <Input
                    id="adults"
                    type="number"
                    min="1"
                    max={selectedRoom?.max_occupancy || 10}
                    value={formData.adults}
                    onChange={(e) => handleNumberChange('adults', e.target.value)}
                    className="h-12"
                  />
                  {selectedRoom && formData.adults > (selectedRoom.max_occupancy || selectedRoom.maxOccupancy || 2) && (
                    <p className="text-xs text-red-600 mt-1">
                      Capacidade máxima: {selectedRoom.max_occupancy || selectedRoom.maxOccupancy || 2} pessoas
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="children">Crianças</Label>
                  <Input
                    id="children"
                    type="number"
                    min="0"
                    value={formData.children}
                    onChange={(e) => handleNumberChange('children', e.target.value)}
                    className="h-12"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="units">Unidades *</Label>
                  <Input
                    id="units"
                    type="number"
                    min="1"
                    max={selectedRoom?.available_units || selectedRoom?.availableUnits || 10}
                    value={formData.units}
                    onChange={(e) => handleNumberChange('units', e.target.value)}
                    className="h-12"
                  />
                  {selectedRoom && (
                    <p className="text-xs text-gray-500 mt-1">
                      {selectedRoom.available_units || selectedRoom.availableUnits || 0} disponível(is)
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="specialRequests">Pedidos Especiais</Label>
                <Textarea
                  id="specialRequests"
                  name="specialRequests"
                  value={formData.specialRequests}
                  onChange={handleInputChange}
                  placeholder="Pedidos especiais ou informações adicionais..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Hotel e Quarto */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building2 className="mr-2 h-5 w-5" />
                Hotel e Quarto
              </CardTitle>
              <CardDescription>
                Selecione o hotel e tipo de quarto
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label>Selecione um Hotel *</Label>
                {hotels.length === 0 ? (
                  <div className="text-center py-8">
                    <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Nenhum hotel disponível</p>
                    <p className="text-sm text-gray-500 mb-4">Crie um hotel primeiro</p>
                    <Link href="/hotels/create">
                      <Button>Criar Hotel</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {hotels.map((hotel) => {
                      const hotelId = hotel.id || hotel.hotel_id;
                      const isSelected = selectedHotelId === hotelId;
                      
                      return (
                        <div
                          key={hotelId}
                          className={cn(
                            "border rounded-lg p-4 cursor-pointer transition-all",
                            isSelected
                              ? "border-blue-500 bg-blue-50"
                              : "border-gray-200 hover:border-gray-300"
                          )}
                          onClick={() => {
                            console.log('🏨 BookingCreatePage: Hotel selecionado:', hotelId);
                            setSelectedHotelId(hotelId);
                            // Resetar room type ao mudar de hotel
                            if (selectedHotelId !== hotelId) {
                              setSelectedRoomTypeId('');
                              setSelectedRoom(null);
                            }
                          }}
                        >
                          <div className="flex items-start space-x-3">
                            <Building2 className="h-5 w-5 text-gray-400 mt-0.5" />
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900">{hotel.name || hotel.hotel_name}</h3>
                              <p className="text-sm text-gray-600">{hotel.address}</p>
                              <p className="text-xs text-gray-500">{hotel.locality}, {hotel.province}</p>
                              {hotel.contact_phone && (
                                <p className="text-xs text-gray-500 mt-1">📞 {hotel.contact_phone}</p>
                              )}
                            </div>
                            {isSelected && (
                              <CheckCircle className="h-5 w-5 text-blue-500 ml-auto flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {selectedHotelId && selectedHotelId !== 'undefined' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Selecione um Tipo de Quarto *</Label>
                    <span className="text-sm text-gray-500">
                      {roomTypes.length} tipo(s) disponível(is)
                    </span>
                  </div>
                  
                  {roomTypes.length === 0 ? (
                    <div className="text-center py-8">
                      <Bed className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">Nenhum tipo de quarto disponível neste hotel</p>
                      <p className="text-sm text-gray-500 mb-4">Adicione tipos de quarto primeiro</p>
                      <Link href={`/hotels/${selectedHotelId}/room-types/create`}>
                        <Button>
                          <Plus className="mr-2 h-4 w-4" />
                          Adicionar Tipo de Quarto
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {roomTypes.map((room) => {
                        const roomId = room.id || room.room_type_id;
                        const isSelected = selectedRoomTypeId === roomId;
                        const available = room.available_units || room.availableUnits || 0;
                        const price = parseFloat(room.base_price || room.basePrice || '0');
                        const maxOccupancy = room.max_occupancy || room.maxOccupancy || 2;
                        
                        return (
                          <div
                            key={roomId}
                            className={cn(
                              "border rounded-lg p-4 cursor-pointer transition-all",
                              isSelected
                                ? "border-blue-500 bg-blue-50"
                                : available === 0
                                ? "border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed"
                                : "border-gray-200 hover:border-gray-300"
                            )}
                            onClick={() => {
                              if (available > 0) {
                                console.log('🛏️ BookingCreatePage: Room type selecionado:', roomId);
                                setSelectedRoomTypeId(roomId);
                              }
                            }}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  <h3 className="font-semibold text-gray-900">{room.name || room.room_type_name}</h3>
                                  {isSelected && (
                                    <CheckCircle className="h-5 w-5 text-blue-500" />
                                  )}
                                  {room.is_active === false && (
                                    <Badge variant="destructive" className="ml-2">Inativo</Badge>
                                  )}
                                </div>
                                
                                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                                  {room.description || 'Sem descrição'}
                                </p>
                                
                                <div className="flex flex-wrap gap-2 mb-3">
                                  <div className="flex items-center text-sm">
                                    <Bed className="h-4 w-4 text-gray-400 mr-1" />
                                    <span>{room.bed_type || 'Standard'}</span>
                                  </div>
                                  <div className="flex items-center text-sm">
                                    <Users className="h-4 w-4 text-gray-400 mr-1" />
                                    <span>{room.base_occupancy || 1}-{maxOccupancy} pessoas</span>
                                  </div>
                                  {room.size && (
                                    <div className="flex items-center text-sm">
                                      <Clock className="h-4 w-4 text-gray-400 mr-1" />
                                      <span>{room.size} m²</span>
                                    </div>
                                  )}
                                </div>
                                
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="flex items-center">
                                      <DollarSign className="h-4 w-4 text-gray-400 mr-1" />
                                      <span className="font-bold text-lg">{price.toLocaleString('pt-MZ')} MT</span>
                                      <span className="text-sm text-gray-500 ml-1">/noite</span>
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                      {room.extra_adult_price ? `+${room.extra_adult_price} MT/adulto extra` : ''}
                                      {room.extra_child_price ? `, +${room.extra_child_price} MT/criança` : ''}
                                    </div>
                                  </div>
                                  
                                  <div className="text-right">
                                    <div className="text-sm">
                                      <span className={cn(
                                        "font-medium",
                                        available === 0 ? "text-red-600" : "text-green-600"
                                      )}>
                                        {available === 0 ? 'ESGOTADO' : `${available} disponível(is)`}
                                      </span>
                                      <p className="text-xs text-gray-500">
                                        Total: {room.total_units || room.totalUnits || 0} unidades
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 3: Confirmação */}
        {step === 3 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle className="mr-2 h-5 w-5" />
                  Resumo e Confirmação
                </CardTitle>
                <CardDescription>
                  Revise os detalhes da reserva antes de confirmar
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Resumo do Hóspede */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <User className="h-5 w-5 text-gray-400 mr-2" />
                    Dados do Hóspede
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Nome</p>
                      <p className="font-medium">{formData.guestName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-medium">{formData.guestEmail}</p>
                    </div>
                    {formData.guestPhone && (
                      <div>
                        <p className="text-sm text-gray-600">Telefone</p>
                        <p className="font-medium">{formData.guestPhone}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-gray-600">Ocupação</p>
                      <p className="font-medium">
                        {formData.adults} adulto{formData.adults !== 1 ? 's' : ''}
                        {formData.children > 0 && `, ${formData.children} criança${formData.children !== 1 ? 's' : ''}`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Resumo da Estadia */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <CalendarIcon className="h-5 w-5 text-gray-400 mr-2" />
                    Datas da Estadia
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Check-in</p>
                      <p className="font-medium">
                        {formData.checkIn ? format(new Date(formData.checkIn), 'PPP') : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Check-out</p>
                      <p className="font-medium">
                        {formData.checkOut ? format(new Date(formData.checkOut), 'PPP') : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Duração</p>
                      <p className="font-medium">{totalNights} noite{totalNights !== 1 ? 's' : ''}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Unidades</p>
                      <p className="font-medium">{formData.units} unidade{formData.units !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                </div>

                {/* Resumo do Hotel e Quarto */}
                {selectedRoom && getSelectedHotel() && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <Building2 className="h-5 w-5 text-gray-400 mr-2" />
                      Hotel e Quarto
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-600">Hotel</p>
                        <p className="font-medium">
                          {getSelectedHotel()?.name || getSelectedHotel()?.hotel_name || 'Hotel'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Tipo de Quarto</p>
                        <p className="font-medium">{selectedRoom.name || selectedRoom.room_type_name}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Preço por noite</p>
                          <p className="font-medium">
                            {parseFloat(selectedRoom.base_price || selectedRoom.basePrice || '0').toLocaleString('pt-MZ')} MT
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Capacidade</p>
                          <p className="font-medium">
                            {(selectedRoom.base_occupancy || 1)}-{(selectedRoom.max_occupancy || selectedRoom.maxOccupancy || 2)} pessoas
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Detalhes do Pagamento */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <CreditCard className="h-5 w-5 text-gray-400 mr-2" />
                    Resumo Financeiro
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Preço base ({totalNights} noites × {formData.units} unidades)</span>
                      <span>
                        {((parseFloat(selectedRoom?.base_price || '0') || 0) * totalNights * formData.units).toLocaleString('pt-MZ')} MT
                      </span>
                    </div>
                    
                    {selectedRoom && formData.adults > (selectedRoom.base_occupancy || 2) && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">
                          Adultos extras ({formData.adults - (selectedRoom.base_occupancy || 2)} × {totalNights} noites)
                        </span>
                        <span>
                          {((parseFloat(selectedRoom.extra_adult_price || '0') || 0) * 
                            (formData.adults - (selectedRoom.base_occupancy || 2)) * 
                            totalNights * 
                            formData.units).toLocaleString('pt-MZ')} MT
                        </span>
                      </div>
                    )}
                    
                    {selectedRoom && formData.children > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">
                          Crianças ({formData.children} × {totalNights} noites)
                        </span>
                        <span>
                          {((parseFloat(selectedRoom.extra_child_price || '0') || 0) * 
                            formData.children * 
                            totalNights * 
                            formData.units).toLocaleString('pt-MZ')} MT
                        </span>
                      </div>
                    )}
                    
                    <div className="border-t pt-2">
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total</span>
                        <span>{totalPrice.toLocaleString('pt-MZ')} MT</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Método de Pagamento */}
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Método de Pagamento</Label>
                  <Select
                    value={formData.paymentMethod}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, paymentMethod: value }))}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Selecione o método de pagamento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Dinheiro</SelectItem>
                      <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                      <SelectItem value="bank_transfer">Transferência Bancária</SelectItem>
                      <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Código Promocional */}
                <div className="space-y-2">
                  <Label htmlFor="promoCode">Código Promocional (opcional)</Label>
                  <Input
                    id="promoCode"
                    name="promoCode"
                    value={formData.promoCode}
                    onChange={handleInputChange}
                    placeholder="Digite o código promocional"
                    className="h-12"
                  />
                </div>

              </CardContent>
            </Card>

            {/* Alertas */}
            {createBookingMutation.isError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                  <p className="text-red-600">Erro ao criar reserva. Verifique os dados e tente novamente.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navegação */}
        <div className="flex justify-between pt-6">
          <div>
            {step > 1 && (
              <Button variant="outline" onClick={handlePreviousStep}>
                Voltar
              </Button>
            )}
          </div>
          
          <div className="flex space-x-3">
            {step < 3 ? (
              <Button onClick={handleNextStep}>
                Continuar
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit} 
                disabled={loading || createBookingMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {loading || createBookingMutation.isPending ? (
                  <>
                    <div className="animate-spin mr-2 h-4 w-4 border-b-2 border-white rounded-full" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Confirmar Reserva
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}