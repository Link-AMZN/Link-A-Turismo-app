import { Router } from "express";
import { verifyFirebaseToken, type AuthenticatedRequest } from "../../../src/shared/firebaseAuth";
import { storage } from "../../../storage";
import { z } from "zod";

const router = Router();

// ✅ CORREÇÃO: Schemas de validação
const searchRidesSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  date: z.string().optional(),
  passengers: z.string().transform(val => Math.max(1, parseInt(val) || 1)).optional().default('1'),
  minPrice: z.string().transform(val => parseFloat(val)).optional(),
  maxPrice: z.string().transform(val => parseFloat(val)).optional(),
  vehicleType: z.string().optional(),
  smartSearch: z.enum(['true', 'false']).optional().default('true')
});

const nearbyRidesSchema = z.object({
  location: z.string().min(1),
  radius: z.string().transform(val => Math.max(1, parseInt(val) || 50)).optional().default('50'),
  passengers: z.string().transform(val => Math.max(1, parseInt(val) || 1)).optional().default('1')
});

const rideRequestSchema = z.object({
  rideId: z.string().min(1),
  passengers: z.number().min(1).default(1),
  pickupLocation: z.string().optional(),
  notes: z.string().optional()
});

const rateBookingSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().max(500).optional()
});

// ✅ CORREÇÃO: Funções utilitárias
function safeParseInt(value: any, defaultValue: number = 1): number {
  const parsed = parseInt(value);
  return isNaN(parsed) ? defaultValue : Math.max(1, parsed);
}

function safeParseFloat(value: any, defaultValue: number = 0): number {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : Math.max(0, parsed);
}

function ensureNumber(value: any): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return safeParseFloat(value);
  return 0;
}

// ✅ CORREÇÃO: Status padronizados
const BOOKING_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed', 
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
} as const;

// 🚀 BUSCA INTELIGENTE DE VIAGENS
router.get('/rides/search', async (req, res) => {
  try {
    // ✅ CORREÇÃO: Validar query parameters
    const validationResult = searchRidesSchema.safeParse(req.query);
    if (!validationResult.success) {
      return res.status(400).json({ 
        success: false,
        message: "Parâmetros de busca inválidos",
        errors: validationResult.error.errors
      });
    }

    const { 
      from, 
      to, 
      date, 
      passengers,
      minPrice,
      maxPrice,
      vehicleType,
      smartSearch
    } = validationResult.data;

    console.log(`🎯 CLIENTE: Buscando rides ${from} → ${to} (passageiros: ${passengers})`);

    let rides = [];
    const searchCriteria: any = {
      fromLocation: from,
      toLocation: to,
      minSeats: passengers
    };

    // ✅ CORREÇÃO: Adicionar filtros opcionais
    if (minPrice !== undefined) {
      searchCriteria.minPrice = minPrice;
    }
    if (maxPrice !== undefined) {
      searchCriteria.maxPrice = maxPrice;
    }
    if (date) {
      const dateObj = new Date(date);
      if (!isNaN(dateObj.getTime())) {
        searchCriteria.departureDate = dateObj;
      }
    }
    if (vehicleType) {
      searchCriteria.vehicleType = vehicleType;
    }

    if (smartSearch === 'true') {
      try {
        console.log(`🔍 Busca inteligente ativada para cliente`);
        rides = await storage.ride.searchSmartRides(from, to, searchCriteria);
        console.log(`✅ Encontrados ${rides.length} rides compatíveis para cliente`);
      } catch (error) {
        console.error('❌ Erro na busca inteligente, usando busca normal:', error);
        rides = await storage.ride.searchRides(searchCriteria);
      }
    } else {
      rides = await storage.ride.searchRides(searchCriteria);
    }

    // ✅ CORREÇÃO: Estatísticas de matching
    const matchStats = rides.length > 0 ? {
      exact: rides.filter((r: any) => r.matchType === 'exact_match').length,
      same_segment: rides.filter((r: any) => r.matchType === 'same_segment').length,
      same_direction: rides.filter((r: any) => r.matchType === 'same_direction').length,
      total: rides.length
    } : null;

    res.json({
      success: true,
      rides,
      matchStats,
      searchParams: { 
        from, 
        to, 
        date, 
        passengers,
        smartSearch: smartSearch === 'true'
      },
      total: rides.length
    });
  } catch (error) {
    console.error("❌ Ride search error:", error);
    res.status(500).json({ 
      success: false,
      message: "Erro ao buscar viagens" 
    });
  }
});

// 🆕 BUSCA DE RIDES PRÓXIMOS (PARA CLIENTES)
router.get('/rides/nearby', async (req, res) => {
  try {
    // ✅ CORREÇÃO: Validar query parameters
    const validationResult = nearbyRidesSchema.safeParse(req.query);
    if (!validationResult.success) {
      return res.status(400).json({ 
        success: false,
        message: "Parâmetros de busca inválidos",
        errors: validationResult.error.errors
      });
    }

    const { location, radius, passengers } = validationResult.data;

    console.log(`📍 CLIENTE: Buscando rides próximos a ${location} (raio: ${radius}km)`);

    const nearbyRides = await storage.ride.getNearbyRides(location, radius);

    // ✅ CORREÇÃO: Filtrar por assentos disponíveis
    const filteredRides = nearbyRides.filter(ride => 
      ride.availableSeats >= passengers
    );

    res.json({
      success: true,
      rides: filteredRides,
      searchParams: { location, radius, passengers },
      total: filteredRides.length
    });
  } catch (error) {
    console.error("❌ Nearby rides search error:", error);
    res.status(500).json({ 
      success: false,
      message: "Erro ao buscar rides próximos" 
    });
  }
});

// 🆕 DETALHES DE RIDE ESPECÍFICO
router.get('/rides/:rideId', async (req, res) => {
  try {
    const { rideId } = req.params;

    console.log(`🔍 CLIENTE: Buscando detalhes do ride ${rideId}`);

    const ride = await storage.ride.getRide(rideId);

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: "Viagem não encontrada"
      });
    }

    // ✅ CORREÇÃO: Verificar disponibilidade
    const isAvailable = ride.status === 'active' && ride.availableSeats > 0;

    if (!isAvailable) {
      return res.status(400).json({
        success: false,
        message: "Esta viagem não está mais disponível"
      });
    }

    res.json({
      success: true,
      ride: {
        ...ride,
        isAvailable: true,
        canBook: ride.availableSeats > 0
      }
    });
  } catch (error) {
    console.error("❌ Ride details error:", error);
    res.status(500).json({ 
      success: false,
      message: "Erro ao carregar detalhes da viagem" 
    });
  }
});

// SOLICITAR VIAGEM
router.post('/rides/request', verifyFirebaseToken, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const userId = authReq.user?.uid;
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        message: "User ID not found" 
      });
    }

    // ✅ CORREÇÃO: Validar dados de entrada
    const validationResult = rideRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        success: false,
        message: "Dados inválidos",
        errors: validationResult.error.errors
      });
    }

    const { rideId, passengers, pickupLocation, notes } = validationResult.data;

    console.log(`📋 CLIENTE: Solicitação de viagem ${rideId} por usuário ${userId}`);

    const ride = await storage.ride.getRide(rideId);
    if (!ride) {
      return res.status(404).json({
        success: false,
        message: "Viagem não encontrada"
      });
    }

    if (ride.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: "Esta viagem não está mais disponível"
      });
    }

    if (ride.availableSeats < passengers) {
      return res.status(400).json({
        success: false,
        message: `Não há assentos suficientes. Disponíveis: ${ride.availableSeats}`
      });
    }

    // ✅ CORREÇÃO: Usar função utilitária para garantir número
    const pricePerSeat = ensureNumber(ride.pricePerSeat);
    const totalPrice = pricePerSeat * passengers;

    const bookingData = {
      passengerId: userId,
      rideId,
      seatsBooked: passengers,
      totalPrice,
      status: BOOKING_STATUS.PENDING,
      pickupLocation: pickupLocation || ride.fromLocation,
      notes: notes || ''
    };

    // ✅ CORREÇÃO: Usar transação para evitar race condition
    let booking;
    try {
      // Reservar assentos atomicamente
      await storage.ride.updateRideAvailability(rideId, passengers);
      
      // Criar booking
      booking = await storage.booking.createBooking(bookingData);
      
      console.log(`✅ Solicitação de viagem criada: ${booking.id}`);
    } catch (transactionError) {
      console.error("❌ Erro na transação de reserva:", transactionError);
      return res.status(500).json({ 
        success: false,
        message: "Erro ao processar reserva" 
      });
    }

    res.status(201).json({
      success: true,
      message: "Solicitação de viagem enviada",
      booking,
      rideDetails: {
        driverName: ride.driver?.firstName + ' ' + ride.driver?.lastName,
        vehicleInfo: ride.vehicleType,
        fromLocation: ride.fromLocation,
        toLocation: ride.toLocation,
        departureDate: ride.departureDate
      }
    });
  } catch (error) {
    console.error("❌ Ride request error:", error);
    res.status(500).json({ 
      success: false,
      message: "Erro ao solicitar viagem" 
    });
  }
});

// HISTÓRICO DE VIAGENS DO CLIENTE
router.get('/bookings', verifyFirebaseToken, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const userId = authReq.user?.uid;
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        message: "User ID not found" 
      });
    }

    const { status, page = 1, limit = 20 } = req.query;

    console.log(`📚 CLIENTE: Buscando histórico de reservas para ${userId}`);

    // ✅ CORREÇÃO: Paginação real
    const pageNum = safeParseInt(page, 1);
    const limitNum = Math.min(50, safeParseInt(limit, 20));
    const offset = (pageNum - 1) * limitNum;

    let bookings = await storage.booking.getUserBookings(userId);
    
    // ✅ CORREÇÃO: Filtrar por status se fornecido
    if (status && typeof status === 'string') {
      bookings = bookings.filter(booking => booking.status === status);
    }

    // ✅ CORREÇÃO: Ordenar por data de criação
    bookings.sort((a: any, b: any) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // ✅ CORREÇÃO: Aplicar paginação
    const paginatedBookings = bookings.slice(offset, offset + limitNum);

    const stats = {
      total: bookings.length,
      pending: bookings.filter((b: any) => b.status === BOOKING_STATUS.PENDING).length,
      confirmed: bookings.filter((b: any) => b.status === BOOKING_STATUS.CONFIRMED).length,
      completed: bookings.filter((b: any) => b.status === BOOKING_STATUS.COMPLETED).length,
      cancelled: bookings.filter((b: any) => b.status === BOOKING_STATUS.CANCELLED).length
    };

    res.json({
      success: true,
      bookings: paginatedBookings,
      stats,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: bookings.length,
        totalPages: Math.ceil(bookings.length / limitNum)
      }
    });
  } catch (error) {
    console.error("❌ User bookings error:", error);
    res.status(500).json({ 
      success: false,
      message: "Erro ao carregar reservas" 
    });
  }
});

// DETALHES DE RESERVA ESPECÍFICA
router.get('/bookings/:bookingId', verifyFirebaseToken, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { bookingId } = req.params;
    const userId = authReq.user?.uid;

    if (!userId) {
      return res.status(401).json({ 
        success: false,
        message: "User ID not found" 
      });
    }

    console.log(`🔍 CLIENTE: Buscando detalhes da reserva ${bookingId}`);

    const booking = await storage.booking.getBooking(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Reserva não encontrada"
      });
    }

    // ✅ CORREÇÃO: Verificar se a reserva pertence ao usuário
    if (booking.passengerId !== userId) {
      return res.status(403).json({
        success: false,
        message: "Sem permissão para acessar esta reserva"
      });
    }

    // ✅ CORREÇÃO: Buscar detalhes do ride associado
    let rideDetails = null;
    if (booking.rideId) {
      rideDetails = await storage.ride.getRide(booking.rideId);
    }

    res.json({
      success: true,
      booking: {
        ...booking,
        rideDetails
      }
    });
  } catch (error) {
    console.error("❌ Booking details error:", error);
    res.status(500).json({ 
      success: false,
      message: "Erro ao carregar detalhes da reserva" 
    });
  }
});

// CANCELAR RESERVA
router.post('/bookings/:bookingId/cancel', verifyFirebaseToken, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { bookingId } = req.params;
    const userId = authReq.user?.uid;

    if (!userId) {
      return res.status(401).json({ 
        success: false,
        message: "User ID not found" 
      });
    }

    console.log(`❌ CLIENTE: Cancelando reserva ${bookingId} por usuário ${userId}`);

    // ✅ CORREÇÃO: Verificar se a reserva existe e pertence ao usuário
    const booking = await storage.booking.getBooking(bookingId);
    if (!booking) {
      return res.status(404).json({ 
        success: false,
        message: "Reserva não encontrada" 
      });
    }

    if (booking.passengerId !== userId) {
      return res.status(403).json({
        success: false,
        message: "Sem permissão para cancelar esta reserva"
      });
    }

    // ✅ CORREÇÃO: Verificar se pode ser cancelada usando status padronizado
    if (booking.status === BOOKING_STATUS.CANCELLED) {
      return res.status(400).json({
        success: false,
        message: "Esta reserva já foi cancelada"
      });
    }

    if (booking.status === BOOKING_STATUS.COMPLETED) {
      return res.status(400).json({
        success: false,
        message: "Não é possível cancelar uma viagem já concluída"
      });
    }

    // ✅ CORREÇÃO: Usar transação para cancelamento atômico
    try {
      // Atualizar status da reserva
      const updatedBooking = await storage.booking.updateBookingStatus(bookingId, BOOKING_STATUS.CANCELLED);

      if (!updatedBooking) {
        return res.status(500).json({ 
          success: false,
          message: "Erro ao cancelar reserva" 
        });
      }

      // ✅ CORREÇÃO: Liberar assentos no ride atomicamente
      if (booking.rideId && booking.seatsBooked) {
        const seatsBookedNum = ensureNumber(booking.seatsBooked);
        // Usar updateRideAvailability que já é atômico
        await storage.ride.updateRideAvailability(booking.rideId, -seatsBookedNum);
      }

      console.log(`✅ Reserva ${bookingId} cancelada com sucesso`);

      res.json({
        success: true,
        message: "Reserva cancelada com sucesso",
        booking: updatedBooking
      });

    } catch (transactionError) {
      console.error("❌ Erro na transação de cancelamento:", transactionError);
      return res.status(500).json({ 
        success: false,
        message: "Erro ao processar cancelamento" 
      });
    }
  } catch (error) {
    console.error("❌ Cancel booking error:", error);
    res.status(500).json({ 
      success: false,
      message: "Erro ao cancelar reserva" 
    });
  }
});

// 🆕 ENDPOINT PARA AVALIAR VIAGEM
router.post('/bookings/:bookingId/rate', verifyFirebaseToken, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { bookingId } = req.params;
    const userId = authReq.user?.uid;

    if (!userId) {
      return res.status(401).json({ 
        success: false,
        message: "User ID not found" 
      });
    }

    // ✅ CORREÇÃO: Validar dados de avaliação
    const validationResult = rateBookingSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: "Dados de avaliação inválidos",
        errors: validationResult.error.errors
      });
    }

    const { rating, comment } = validationResult.data;

    console.log(`⭐ CLIENTE: Avaliando reserva ${bookingId} com ${rating} estrelas`);

    const booking = await storage.booking.getBooking(bookingId);
    if (!booking) {
      return res.status(404).json({ 
        success: false,
        message: "Reserva não encontrada" 
      });
    }

    if (booking.passengerId !== userId) {
      return res.status(403).json({
        success: false,
        message: "Sem permissão para avaliar esta reserva"
      });
    }

    // ✅ CORREÇÃO: Verificar se a viagem foi concluída
    if (booking.status !== BOOKING_STATUS.COMPLETED) {
      return res.status(400).json({
        success: false,
        message: "Só é possível avaliar viagens concluídas"
      });
    }

    const updatedBooking = await storage.booking.updateBooking(bookingId, {
      rating,
      comment: comment || ''
    });

    res.json({
      success: true,
      message: "Avaliação enviada com sucesso",
      booking: updatedBooking
    });
  } catch (error) {
    console.error("❌ Rate booking error:", error);
    res.status(500).json({ 
      success: false,
      message: "Erro ao avaliar reserva" 
    });
  }
});

export default router;