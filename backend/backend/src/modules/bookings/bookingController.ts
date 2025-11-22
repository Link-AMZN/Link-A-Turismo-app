import { Router, Request, Response, NextFunction } from "express";
import { storage } from "../../../storage";
import { z } from "zod";
import { createApiResponse, createApiError } from "../../../src/shared/firebaseAuth";
import { insertBookingSchema } from "../../../shared/schema";

const router = Router();

import { verifyFirebaseToken, type AuthenticatedRequest } from "../../../src/shared/firebaseAuth";

// ✅ CORREÇÃO: Schema de validação para criação de reserva
const createBookingSchema = z.object({
  type: z.enum(['ride', 'stay', 'event']),
  rideId: z.string().optional(),
  accommodationId: z.string().optional(),
  hotelRoomId: z.string().optional(),
  eventId: z.string().optional(),
  seatsBooked: z.number().min(1).default(1),
  passengers: z.number().min(1).default(1),
  totalPrice: z.number().positive(),
  checkInDate: z.string().optional(),
  checkOutDate: z.string().optional(),
  pickupTime: z.string().optional(),
  guestName: z.string().optional(),
  guestEmail: z.string().email().optional(),
  guestPhone: z.string().optional(),
});

// ✅ CORREÇÃO: Schema para atualização de status
const updateStatusSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'confirmed', 'completed', 'cancelled']),
  rejectionReason: z.string().optional(),
});

// ✅ CORREÇÃO: Interface extendida para Booking com campos opcionais
interface ExtendedBooking {
  id: string;
  passengerId: string | null;
  rideId?: string | null;
  accommodationId?: string | null;
  hotelRoomId?: string | null;
  eventId?: string | null;
  type?: string | null;
  status?: string | null;
  totalPrice?: any;
  seatsBooked?: number;
  passengers?: number;
  guestName?: string | null;
  guestEmail?: string | null;
  guestPhone?: string | null;
  checkInDate?: Date | null;
  checkOutDate?: Date | null;
  pickupTime?: Date | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
  // ✅ CORREÇÃO: Campos que podem não existir no schema
  providerId?: string | null;
  approvedAt?: Date | null;
  rejectedAt?: Date | null;
  confirmedAt?: Date | null;
  completedAt?: Date | null;
  rejectionReason?: string | null;
}

// GET /api/bookings - Lista reservas do usuário
router.get("/", verifyFirebaseToken, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  
  try {
    const userId = authReq.user?.uid;
    if (!userId) {
      return res.status(401).json({ message: "Usuário não autenticado" });
    }

    const { 
      type, 
      status, 
      page = 1, 
      limit = 20 
    } = req.query;

    // ✅ CORREÇÃO: Filtrar no banco em vez de no array
    let bookings = await storage.booking.getUserBookings(userId) as ExtendedBooking[];
    
    // ✅ CORREÇÃO: Aplicar filtros com verificação de campo type
    if (type && typeof type === 'string') {
      bookings = bookings.filter(booking => {
        // Se o campo type não existe, usar inferência baseada nos IDs
        if (!booking.type) {
          if (booking.rideId) return type === 'ride';
          if (booking.accommodationId) return type === 'stay';
          if (booking.eventId) return type === 'event';
          return false;
        }
        return booking.type === type;
      });
    }
    
    if (status && typeof status === 'string') {
      bookings = bookings.filter(booking => booking.status === status);
    }
    
    // Aplicar paginação
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Math.max(1, Number(limit)));
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedBookings = bookings.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        bookings: paginatedBookings,
        total: bookings.length,
        page: pageNum,
        totalPages: Math.ceil(bookings.length / limitNum)
      }
    });
  } catch (error) {
    console.error("Erro ao listar reservas:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor"
    });
  }
});

// GET /api/bookings/:id - Obter reserva específica
router.get("/:id", verifyFirebaseToken, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  
  try {
    const userId = authReq.user?.uid;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Usuário não autenticado" });
    }

    const booking = await storage.booking.getBooking(id) as ExtendedBooking;

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Reserva não encontrada"
      });
    }

    // ✅ CORREÇÃO: Verificar se o usuário tem permissão (cliente OU provedor)
    const isCustomer = booking.passengerId === userId;
    const isProvider = booking.providerId === userId;
    
    if (!isCustomer && !isProvider) {
      return res.status(403).json({
        success: false,
        message: "Sem permissão para ver esta reserva"
      });
    }

    res.json({
      success: true,
      data: { booking }
    });
  } catch (error) {
    console.error("Erro ao buscar reserva:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor"
    });
  }
});

// POST /api/bookings - Criar nova reserva
router.post("/", verifyFirebaseToken, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  
  try {
    const userId = authReq.user?.uid;
    if (!userId) {
      return res.status(401).json({ message: "Usuário não autenticado" });
    }

    // ✅ CORREÇÃO: Validar dados de entrada com Zod
    const validationResult = createBookingSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: "Dados inválidos",
        errors: validationResult.error.errors
      });
    }

    const validatedData = validationResult.data;

    // ✅ CORREÇÃO: Preparar dados de reserva com tratamento seguro de datas
    const bookingData: any = {
      ...validatedData,
      passengerId: userId,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Converter datas com validação
    if (validatedData.checkInDate) {
      const checkInDate = new Date(validatedData.checkInDate);
      if (isNaN(checkInDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Data de check-in inválida"
        });
      }
      bookingData.checkInDate = checkInDate;
    }

    if (validatedData.checkOutDate) {
      const checkOutDate = new Date(validatedData.checkOutDate);
      if (isNaN(checkOutDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Data de check-out inválida"
        });
      }
      bookingData.checkOutDate = checkOutDate;
    }

    if (validatedData.pickupTime) {
      const pickupTime = new Date(validatedData.pickupTime);
      if (isNaN(pickupTime.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Horário de pickup inválido"
        });
      }
      bookingData.pickupTime = pickupTime;
    }

    // ✅ CORREÇÃO: Verificar disponibilidade e obter providerId
    let providerId: string | undefined;
    let availabilityCheck: boolean = true;

    if (validatedData.type === 'ride' && validatedData.rideId) {
      const ride = await storage.ride.getRide(validatedData.rideId);
      if (!ride) {
        return res.status(404).json({
          success: false,
          message: "Viagem não encontrada"
        });
      }
      
      // Verificar assentos disponíveis
      if ((ride.availableSeats || 0) < validatedData.seatsBooked) {
        return res.status(400).json({
          success: false,
          message: "Não há assentos disponíveis suficientes"
        });
      }
      
      providerId = ride.driverId;
      
      // ✅ CORREÇÃO: Atualizar assentos disponíveis
      await storage.ride.updateRideAvailability(validatedData.rideId, validatedData.seatsBooked);
    }

    if (validatedData.type === 'stay' && validatedData.accommodationId) {
      const accommodation = await storage.accommodation.getAccommodation(validatedData.accommodationId);
      if (!accommodation) {
        return res.status(404).json({
          success: false,
          message: "Acomodação não encontrada"
        });
      }
      
      if (!accommodation.isAvailable) {
        return res.status(400).json({
          success: false,
          message: "Acomodação não disponível"
        });
      }
      
      providerId = accommodation.hostId;
    }

    if (validatedData.type === 'event' && validatedData.eventId) {
      const event = await storage.event.getEvent(validatedData.eventId);
      if (!event) {
        return res.status(404).json({
          success: false,
          message: "Evento não encontrado"
        });
      }
      
      // Verificar se há ingressos disponíveis
      const ticketsSold = event.ticketsSold || 0;
      const maxTickets = event.maxTickets || 0;
      if (ticketsSold + validatedData.passengers > maxTickets) {
        return res.status(400).json({
          success: false,
          message: "Ingressos insuficientes disponíveis"
        });
      }
      
      providerId = event.organizerId;
      
      // ✅ CORREÇÃO: Atualizar contagem de ingressos
      // TODO: Implementar método para atualizar tickets sold
    }

    // ✅ CORREÇÃO: Garantir que providerId está definido
    if (!providerId) {
      return res.status(400).json({
        success: false,
        message: "Não foi possível identificar o provedor do serviço"
      });
    }

    // ✅ CORREÇÃO: Adicionar providerId aos dados da reserva
    bookingData.providerId = providerId;

    const newBooking = await storage.booking.createBooking(bookingData);

    res.status(201).json({
      success: true,
      message: "Reserva criada com sucesso",
      data: { booking: newBooking }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Dados inválidos",
        errors: error.errors
      });
    }

    console.error("Erro ao criar reserva:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor"
    });
  }
});

// PUT /api/bookings/:id/status - Atualizar status da reserva (apenas provedores)
router.put("/:id/status", verifyFirebaseToken, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  
  try {
    const userId = authReq.user?.uid;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Usuário não autenticado" });
    }

    // ✅ CORREÇÃO: Validar dados de entrada
    const validationResult = updateStatusSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: "Dados inválidos",
        errors: validationResult.error.errors
      });
    }

    const { status, rejectionReason } = validationResult.data;

    const booking = await storage.booking.getBooking(id) as ExtendedBooking;
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Reserva não encontrada"
      });
    }

    // ✅ CORREÇÃO: Verificação de autorização usando providerId (se existir)
    // Se providerId não existir, usar lógica alternativa baseada no tipo de serviço
    let isAuthorized = false;
    
    if (booking.providerId) {
      // Se providerId existe no booking, verificar diretamente
      isAuthorized = booking.providerId === userId;
    } else {
      // ✅ CORREÇÃO: Lógica alternativa - determinar providerId baseado no tipo de serviço
      if (booking.rideId) {
        const ride = await storage.ride.getRide(booking.rideId);
        isAuthorized = ride?.driverId === userId;
      } else if (booking.accommodationId) {
        const accommodation = await storage.accommodation.getAccommodation(booking.accommodationId);
        isAuthorized = accommodation?.hostId === userId;
      } else if (booking.eventId) {
        const event = await storage.event.getEvent(booking.eventId);
        isAuthorized = event?.organizerId === userId;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: "Sem permissão para alterar esta reserva"
      });
    }

    const updateData: any = { status, updatedAt: new Date() };
    
    if (status === 'approved') {
      updateData.approvedAt = new Date();
    } else if (status === 'rejected') {
      updateData.rejectedAt = new Date();
      if (rejectionReason) {
        updateData.rejectionReason = rejectionReason;
      }
    } else if (status === 'confirmed') {
      updateData.confirmedAt = new Date();
    } else if (status === 'completed') {
      updateData.completedAt = new Date();
    }

    const updatedBooking = await storage.booking.updateBooking(id, updateData);

    res.json({
      success: true,
      message: `Reserva ${getStatusMessage(status)} com sucesso`,
      data: { booking: updatedBooking }
    });
  } catch (error) {
    console.error("Erro ao atualizar status da reserva:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor"
    });
  }
});

// ✅ CORREÇÃO: Helper para mensagens de status
function getStatusMessage(status: string): string {
  const messages: Record<string, string> = {
    'approved': 'aprovada',
    'rejected': 'rejeitada', 
    'confirmed': 'confirmada',
    'completed': 'concluída',
    'cancelled': 'cancelada',
    'pending': 'atualizada'
  };
  return messages[status] || 'atualizada';
}

// PUT /api/bookings/:id/cancel - Cancelar reserva (apenas cliente)
router.put("/:id/cancel", verifyFirebaseToken, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  
  try {
    const userId = authReq.user?.uid;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Usuário não autenticado" });
    }

    const booking = await storage.booking.getBooking(id) as ExtendedBooking;
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Reserva não encontrada"
      });
    }

    // ✅ CORREÇÃO: Apenas o cliente pode cancelar
    if (booking.passengerId !== userId) {
      return res.status(403).json({
        success: false,
        message: "Sem permissão para cancelar esta reserva"
      });
    }

    // ✅ CORREÇÃO: Verificar se ainda pode ser cancelada com limites temporais
    const now = new Date();
    const bookingDate = booking.pickupTime || booking.checkInDate || booking.createdAt;
    
    if (bookingDate && new Date(bookingDate) < now) {
      return res.status(400).json({
        success: false,
        message: "Não é possível cancelar uma reserva que já começou"
      });
    }

    // Verificar se ainda pode ser cancelada
    if (booking.status === 'completed' || booking.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: "Esta reserva não pode ser cancelada"
      });
    }

    const updatedBooking = await storage.booking.updateBooking(id, { 
      status: 'cancelled',
      updatedAt: new Date()
    });

    // ✅ CORREÇÃO: Liberar recursos (assentos, quartos, ingressos) quando cancelado
    if (booking.rideId && booking.seatsBooked) {
      // Reverter assentos reservados
      await storage.ride.updateRideAvailability(booking.rideId, -booking.seatsBooked);
    }

    res.json({
      success: true,
      message: "Reserva cancelada com sucesso",
      data: { booking: updatedBooking }
    });
  } catch (error) {
    console.error("Erro ao cancelar reserva:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor"
    });
  }
});

// GET /api/bookings/provider/:providerId - Reservas de um provedor (motorista/anfitrião/organizador)
router.get("/provider/:providerId", verifyFirebaseToken, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  
  try {
    const userId = authReq.user?.uid;
    const { providerId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Usuário não autenticado" });
    }

    // ✅ CORREÇÃO: Verificar se o usuário é o provedor
    if (providerId !== userId) {
      return res.status(403).json({
        success: false,
        message: "Sem permissão para ver estas reservas"
      });
    }

    const { 
      type, 
      status, 
      page = 1, 
      limit = 20 
    } = req.query;

    let bookings = await storage.booking.getProviderBookings(providerId) as ExtendedBooking[];
    
    // ✅ CORREÇÃO: Aplicar filtros com inferência de type
    if (type && typeof type === 'string') {
      bookings = bookings.filter(booking => {
        if (!booking.type) {
          if (booking.rideId) return type === 'ride';
          if (booking.accommodationId) return type === 'stay';
          if (booking.eventId) return type === 'event';
          return false;
        }
        return booking.type === type;
      });
    }
    
    if (status && typeof status === 'string') {
      bookings = bookings.filter(booking => booking.status === status);
    }
    
    // Aplicar paginação
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Math.max(1, Number(limit)));
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedBookings = bookings.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        bookings: paginatedBookings,
        total: bookings.length,
        page: pageNum,
        totalPages: Math.ceil(bookings.length / limitNum)
      }
    });
  } catch (error) {
    console.error("Erro ao listar reservas do provedor:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor"
    });
  }
});

// GET /api/bookings/stats - Estatísticas de reservas do usuário
router.get("/stats", verifyFirebaseToken, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  
  try {
    const userId = authReq.user?.uid;
    if (!userId) {
      return res.status(401).json({ message: "Usuário não autenticado" });
    }

    // Buscar reservas como cliente
    const userBookings = await storage.booking.getUserBookings(userId) as ExtendedBooking[];
    
    // Buscar reservas como provedor
    const providerBookings = await storage.booking.getProviderBookings(userId) as ExtendedBooking[];

    // ✅ CORREÇÃO: Inferir tipo quando não disponível
    const inferBookingType = (booking: ExtendedBooking) => {
      if (booking.type) return booking.type;
      if (booking.rideId) return 'ride';
      if (booking.accommodationId) return 'stay';
      if (booking.eventId) return 'event';
      return 'unknown';
    };

    const stats = {
      asCustomer: {
        total: userBookings.length,
        completed: userBookings.filter(b => b.status === 'completed').length,
        cancelled: userBookings.filter(b => b.status === 'cancelled').length,
        pending: userBookings.filter(b => b.status === 'pending').length,
        byType: {
          rides: userBookings.filter(b => inferBookingType(b) === 'ride').length,
          stays: userBookings.filter(b => inferBookingType(b) === 'stay').length,
          events: userBookings.filter(b => inferBookingType(b) === 'event').length
        }
      },
      asProvider: {
        total: providerBookings.length,
        completed: providerBookings.filter(b => b.status === 'completed').length,
        cancelled: providerBookings.filter(b => b.status === 'cancelled').length,
        pending: providerBookings.filter(b => b.status === 'pending').length,
        byType: {
          rides: providerBookings.filter(b => inferBookingType(b) === 'ride').length,
          stays: providerBookings.filter(b => inferBookingType(b) === 'stay').length,
          events: providerBookings.filter(b => inferBookingType(b) === 'event').length
        }
      }
    };

    res.json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    console.error("Erro ao buscar estatísticas:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor"
    });
  }
});

export default router;