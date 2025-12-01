// src/modules/hotels/hotelBookingController.ts - VERSÃO CORRIGIDA
import { Router, Request, Response } from "express";
import { verifyFirebaseToken } from "../../shared/firebaseAuth";
import { z } from "zod";
import { hotelBookingService } from "./hotelBookingService";

const router = Router();

// Schemas de validação
const createHotelBookingSchema = z.object({
  hotelId: z.string().uuid(),
  roomTypeId: z.string().uuid(),
  checkIn: z.string().transform(str => new Date(str)),
  checkOut: z.string().transform(str => new Date(str)),
  units: z.number().min(1).max(10).default(1),
  adults: z.number().min(1).max(20).default(2),
  children: z.number().min(0).max(10).default(0),
  guestName: z.string().min(2),
  guestEmail: z.string().email(),
  guestPhone: z.string().optional(),
  specialRequests: z.string().optional()
});

// 📝 CRIAR RESERVA DE HOTEL (ROTA PRINCIPAL)
router.post("/bookings", async (req: Request, res: Response) => {
  try {
    const validatedData = createHotelBookingSchema.parse(req.body);

    console.log('🎯 Recebendo pedido de reserva:', validatedData);

    // ✅ CORREÇÃO: Usar createBooking em vez de createHotelBooking
    const result = await hotelBookingService.createBooking(validatedData);
    
    res.status(201).json({
      success: true,
      data: result,
      message: 'Reserva de hotel criada com sucesso'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Dados inválidos',
        details: error.errors
      });
    }
    
    console.error("❌ Erro ao criar reserva de hotel:", error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno'
    });
  }
});

// ❌ CANCELAR RESERVA DE HOTEL
router.post("/bookings/:bookingId/cancel", async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;
    const { reason } = req.body;
    
    // ✅ CORREÇÃO: Usar cancelBooking em vez de cancelHotelBooking
    const result = await hotelBookingService.cancelBooking(bookingId, reason);
    
    res.json({
      success: true,
      data: result,
      message: 'Reserva de hotel cancelada com sucesso'
    });
  } catch (error) {
    console.error("Erro ao cancelar reserva de hotel:", error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno'
    });
  }
});

// 📊 CHECK-IN
router.post("/bookings/:bookingId/checkin", verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;
    
    // ✅ CORREÇÃO: Usar checkIn em vez de checkInHotelBooking
    const result = await hotelBookingService.checkIn(bookingId);
    
    res.json({
      success: true,
      data: result,
      message: 'Check-in realizado com sucesso'
    });
  } catch (error) {
    console.error("Erro no check-in:", error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno'
    });
  }
});

// 📊 CHECK-OUT
router.post("/bookings/:bookingId/checkout", verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;
    
    // ✅ CORREÇÃO: Usar checkOut em vez de checkOutHotelBooking
    const result = await hotelBookingService.checkOut(bookingId);
    
    res.json({
      success: true,
      data: result,
      message: 'Check-out realizado com sucesso'
    });
  } catch (error) {
    console.error("Erro no check-out:", error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno'
    });
  }
});

// 📈 DASHBOARD STATS (Para donos de hotel)
router.get("/:hotelId/dashboard/stats", verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const { hotelId } = req.params;
    
    // ✅ CORREÇÃO: Usar getDashboardStats em vez de getHotelDashboardStats
    const stats = await hotelBookingService.getDashboardStats(hotelId);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error("Erro no dashboard:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno'
    });
  }
});

// 🔍 BUSCAR RESERVAS POR EMAIL (Para hóspedes)
router.get("/bookings/email/:email", async (req: Request, res: Response) => {
  try {
    const { email } = req.params;
    
    // ✅ CORREÇÃO: Usar getBookingsByEmail em vez de getHotelBookingsByEmail
    const result = await hotelBookingService.getBookingsByEmail(email);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("Erro ao buscar reservas por email:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno'
    });
  }
});

// 📋 LISTAR RESERVAS DO HOTEL (Para administração)
router.get("/:hotelId/bookings", verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const { hotelId } = req.params;
    const { status, fromDate, toDate, limit } = req.query;
    
    const filters = {
      status: status as string,
      fromDate: fromDate ? new Date(fromDate as string) : undefined,
      toDate: toDate ? new Date(toDate as string) : undefined,
      limit: limit ? parseInt(limit as string) : 50
    };
    
    // ✅ CORREÇÃO: Usar getHotelBookings (este está correto)
    const bookings = await hotelBookingService.getHotelBookings(hotelId, filters);
    
    res.json({
      success: true,
      data: bookings,
      count: bookings.length
    });
  } catch (error) {
    console.error("Erro ao buscar reservas do hotel:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno'
    });
  }
});

// 🔍 DETALHES DE UMA RESERVA
router.get("/bookings/:bookingId", async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;
    
    // ✅ CORREÇÃO: Usar getBookingDetails em vez de getHotelBookingDetails
    const booking = await hotelBookingService.getBookingDetails(bookingId);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Reserva não encontrada'
      });
    }
    
    res.json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error("Erro ao buscar detalhes da reserva:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno'
    });
  }
});

// 📊 VERIFICAR DISPONIBILIDADE EM TEMPO REAL (Nova rota)
router.get("/availability/real-time", async (req: Request, res: Response) => {
  try {
    const { roomTypeId, checkIn, checkOut, units } = req.query;
    
    if (!roomTypeId || !checkIn || !checkOut) {
      return res.status(400).json({
        success: false,
        error: 'roomTypeId, checkIn e checkOut são obrigatórios'
      });
    }

    const availability = await hotelBookingService.checkAvailability({
      roomTypeId: roomTypeId as string,
      checkIn: new Date(checkIn as string),
      checkOut: new Date(checkOut as string),
      units: units ? parseInt(units as string) : 1
    });

    res.json({
      success: true,
      data: availability
    });
  } catch (error) {
    console.error("Erro ao verificar disponibilidade:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno'
    });
  }
});

export default router;