import { Router, Request, Response } from "express";
import { insertAccommodationSchema } from "../../../shared/schema";
import { type AuthenticatedRequest, verifyFirebaseToken } from "../../../src/shared/firebaseAuth";
import { z } from "zod";
import {
  createAccommodation,
  getAccommodations,
  getAccommodationById,
  updateAccommodation,
  isUserAccommodationOwner,
  getHotelDashboardData,
  getHotelRooms,
  Accommodation,
  deleteAccommodation,
  getProviderBookings,
  updateBookingStatus,
  getBookingById,
  getRoomTypesByHotelId,
  createRoomType,
  getRoomsByHotelId,
  createRoom,
  updateRoom,
  deleteRoom,
  getRoomById,
} from "./hotelService";

const router = Router();

// Funções de normalização
const normalizeImages = (images: unknown): string[] | null => {
  if (images == null) return null;
  if (Array.isArray(images)) {
    return images.filter((img): img is string => typeof img === "string");
  }
  if (typeof images === "string") {
    return images.trim() ? [images] : null;
  }
  return null;
};

const normalizeAmenities = (amenities: unknown): string[] | null => {
  if (amenities == null) return null;
  if (Array.isArray(amenities)) {
    return amenities.filter((a): a is string => typeof a === "string");
  }
  if (typeof amenities === "string") {
    return amenities.trim() ? [amenities] : null;
  }
  return null;
};

// Mappers
const mapToAccommodationInsert = (data: any, hostId: string) => ({
  ...data,
  hostId,
  images: normalizeImages(data.images),
  amenities: normalizeAmenities(data.amenities),
});

const mapToAccommodationUpdate = (data: any) => ({
  ...data,
  images: normalizeImages(data.images),
  amenities: normalizeAmenities(data.amenities),
});

const mapToRoomTypeInsert = (data: any, accommodationId: string) => ({
  ...data,
  accommodationId,
  images: normalizeImages(data.images),
  amenities: normalizeAmenities(data.amenities),
});

const mapToRoomInsert = (data: any, accommodationId: string) => ({
  ...data,
  pricePerNight: String(data.pricePerNight),
  accommodationId,
  images: normalizeImages(data.images),
  amenities: normalizeAmenities(data.amenities),
});

// Interface para os dados normalizados
interface NormalizedAccommodationData {
  name: string;
  type: string;
  address: string;
  hostId: string;
  images: string[] | null;
  rating?: string | null;
  lat?: string | null;
  lng?: string | null;
  reviewCount?: number | null;
  transportDiscount?: number | null;
  amenities?: string[] | null;
  description?: string | null;
  isAvailable?: boolean;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  policies?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
}

// Schemas
const createAccommodationSchema = insertAccommodationSchema.omit({
  id: true
}).extend({
  images: z.unknown().optional().nullable(),
  rating: z.coerce.string().optional().nullable(),
  lat: z.coerce.string().optional().nullable(),
  lng: z.coerce.string().optional().nullable(),
  reviewCount: z.coerce.number().optional().nullable(),
  transportDiscount: z.coerce.number().optional().nullable(),
  isAvailable: z.boolean().optional().default(true),
  checkInTime: z.string().optional().nullable(),
  checkOutTime: z.string().optional().nullable(),
  policies: z.string().optional().nullable(),
  contactEmail: z.string().optional().nullable(),
  contactPhone: z.string().optional().nullable(),
});

const updateAccommodationSchema = insertAccommodationSchema.partial().extend({
  images: z.unknown().optional().nullable(),
  rating: z.coerce.string().optional().nullable(),
  lat: z.coerce.string().optional().nullable(),
  lng: z.coerce.string().optional().nullable(),
  reviewCount: z.coerce.number().optional().nullable(),
  transportDiscount: z.coerce.number().optional().nullable(),
  isAvailable: z.boolean().optional(),
  checkInTime: z.string().optional().nullable(),
  checkOutTime: z.string().optional().nullable(),
  policies: z.string().optional().nullable(),
  contactEmail: z.string().optional().nullable(),
  contactPhone: z.string().optional().nullable(),
});

const createRoomTypeSchema = z.object({
  name: z.string(),
  description: z.string().optional().nullable(),
  pricePerNight: z.coerce.number(),
  capacity: z.number().optional().default(2),
  amenities: z.unknown().optional().nullable(),
  images: z.unknown().optional().nullable(),
  accommodationId: z.string().uuid(),
});

// ✅ CORREÇÃO: Usar number em vez de string para pricePerNight
const createRoomSchema = z.object({
  accommodationId: z.string().uuid(),
  roomNumber: z.string().min(1),
  roomTypeId: z.string().uuid(),
  roomType: z.string().min(1),
  pricePerNight: z.coerce.number().positive(), // ✅ Alterado para number
  maxOccupancy: z.number().int().min(1).default(2),
  status: z.string().default('available'),
  amenities: z.array(z.string()).optional().nullable(),
  images: z.array(z.string()).optional().nullable(),
});

// ✅ CORREÇÃO: Usar number em vez de string para pricePerNight
const updateRoomSchema = createRoomSchema.partial().extend({
  accommodationId: z.string().uuid().optional(),
  roomNumber: z.string().min(1).optional(),
  roomTypeId: z.string().uuid().optional(),
  roomType: z.string().min(1).optional(),
  pricePerNight: z.coerce.number().positive().optional(), // ✅ Alterado para number
  maxOccupancy: z.number().int().min(1).optional(),
  status: z.string().optional(),
  amenities: z.unknown().optional().nullable(),
  images: z.unknown().optional().nullable(),
});

const querySchema = z.object({
  type: z.string().optional(),
  address: z.string().optional(),
  isAvailable: z.string().optional(),
  sortBy: z.string().optional().default('rating'),
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('20'),
});

// GET /api/hotels
router.get("/", async (req: Request, res: Response) => {
  try {
    const parsedQuery = querySchema.parse(req.query);
    let parsedIsAvailable: boolean | undefined;
    if (typeof parsedQuery.isAvailable === 'string') {
      const val = parsedQuery.isAvailable.toLowerCase();
      if (val === 'true') parsedIsAvailable = true;
      else if (val === 'false') parsedIsAvailable = false;
    }

    const filters: any = {
      type: parsedQuery.type ?? undefined,
      address: parsedQuery.address ?? undefined,
      isAvailable: parsedIsAvailable,
      sortBy: parsedQuery.sortBy,
      page: parsedQuery.page,
      limit: parsedQuery.limit
    };

    Object.keys(filters).forEach(key => {
      if (filters[key] === undefined) {
        delete filters[key];
      }
    });

    let accommodationsList = await getAccommodations(filters);

    const sortBy = parsedQuery.sortBy;
    if (sortBy === 'rating') {
      accommodationsList = accommodationsList.sort((a: Accommodation, b: Accommodation) => Number(b.rating || 0) - Number(a.rating || 0));
    }

    const startIndex = (Number(parsedQuery.page) - 1) * Number(parsedQuery.limit);
    const endIndex = startIndex + Number(parsedQuery.limit);
    const paginatedAccommodations = accommodationsList.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        accommodations: paginatedAccommodations,
        total: accommodationsList.length,
        page: Number(parsedQuery.page),
        totalPages: Math.ceil(accommodationsList.length / Number(parsedQuery.limit))
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Parâmetros de consulta inválidos",
        errors: error.errors
      });
    }
    console.error("Erro ao listar acomodações:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
      error: "Failed to fetch accommodations"
    });
  }
});

// GET /api/hotels/:id
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const accommodation = await getAccommodationById(id);

    if (!accommodation) {
      return res.status(404).json({
        success: false,
        message: "Acomodação não encontrada"
      });
    }

    res.json({
      success: true,
      data: { accommodation }
    });
  } catch (error) {
    console.error("Erro ao buscar acomodação:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor"
    });
  }
});

// POST /api/hotels
router.post("/", verifyFirebaseToken, async (req, res) => {
  const authReq = req as AuthenticatedRequest;

  try {
    const userId = authReq.user?.uid;
    if (!userId) {
      return res.status(401).json({ message: "Usuário não autenticado" });
    }

    const validatedData = createAccommodationSchema.parse({
      ...req.body,
      hostId: userId
    });

    const accommodationData = mapToAccommodationInsert(validatedData, userId);
    const newAccommodation = await createAccommodation(accommodationData);

    res.status(201).json({
      success: true,
      message: "Acomodação criada com sucesso",
      data: { accommodation: newAccommodation }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Dados inválidos",
        errors: error.errors
      });
    }

    console.error("Erro ao criar acomodação:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor"
    });
  }
});

// PUT /api/hotels/:id
router.put("/:id", verifyFirebaseToken, async (req, res) => {
  const authReq = req as AuthenticatedRequest;

  try {
    const userId = authReq.user?.uid;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Usuário não autenticado" });
    }

    const existingAccommodation = await getAccommodationById(id);
    if (!existingAccommodation) {
      return res.status(404).json({
        success: false,
        message: "Acomodação não encontrada"
      });
    }

    const isOwner = await isUserAccommodationOwner(id, userId);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: "Sem permissão para editar esta acomodação"
      });
    }

    const validatedData = updateAccommodationSchema.parse(req.body);
    const updateData = mapToAccommodationUpdate(validatedData);

    Object.keys(updateData).forEach(key => {
      if (updateData[key as keyof typeof updateData] === undefined) {
        delete updateData[key as keyof typeof updateData];
      }
    });

    const updatedAccommodation = await updateAccommodation(id, updateData);

    res.json({
      success: true,
      message: "Acomodação atualizada com sucesso",
      data: { accommodation: updatedAccommodation }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Dados inválidos",
        errors: error.errors
      });
    }

    console.error("Erro ao atualizar acomodação:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor"
    });
  }
});

// DELETE /api/hotels/:id
router.delete("/:id", verifyFirebaseToken, async (req, res) => {
  const authReq = req as AuthenticatedRequest;

  try {
    const userId = authReq.user?.uid;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Usuário não autenticado" });
    }

    const existingAccommodation = await getAccommodationById(id);
    if (!existingAccommodation) {
      return res.status(404).json({
        success: false,
        message: "Acomodação não encontrada"
      });
    }

    const isOwner = await isUserAccommodationOwner(id, userId);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: "Sem permissão para deletar esta acomodação"
      });
    }

    await deleteAccommodation(id);

    res.json({
      success: true,
      message: "Acomodação removida com sucesso"
    });
  } catch (error) {
    console.error("Erro ao deletar acomodação:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor"
    });
  }
});

// POST /api/hotels/room-types
router.post("/room-types", verifyFirebaseToken, async (req, res) => {
  const authReq = req as AuthenticatedRequest;

  try {
    const userId = authReq.user?.uid;
    if (!userId) {
      return res.status(401).json({ message: "Usuário não autenticado" });
    }

    const validatedData = createRoomTypeSchema.parse(req.body);

    const existingAccommodation = await getAccommodationById(validatedData.accommodationId);
    if (!existingAccommodation) {
      return res.status(404).json({
        success: false,
        message: "Acomodação não encontrada"
      });
    }

    const isOwner = await isUserAccommodationOwner(validatedData.accommodationId, userId);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: "Sem permissão para criar tipo de quarto nesta acomodação"
      });
    }

    const roomTypeData = mapToRoomTypeInsert(validatedData, validatedData.accommodationId);
    const newRoomType = await createRoomType(roomTypeData);

    res.status(201).json({
      success: true,
      message: "Tipo de quarto criado com sucesso",
      data: { roomType: newRoomType }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Dados inválidos",
        errors: error.errors
      });
    }

    console.error("Erro ao criar tipo de quarto:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor"
    });
  }
});

// POST /api/hotels/rooms
router.post("/rooms", verifyFirebaseToken, async (req, res) => {
  const authReq = req as AuthenticatedRequest;

  try {
    const userId = authReq.user?.uid;
    if (!userId) {
      return res.status(401).json({ message: "Usuário não autenticado" });
    }

    const validatedData = createRoomSchema.parse(req.body);

    const existingAccommodation = await getAccommodationById(validatedData.accommodationId);
    if (!existingAccommodation) {
      return res.status(404).json({
        success: false,
        message: "Acomodação não encontrada"
      });
    }

    const isOwner = await isUserAccommodationOwner(validatedData.accommodationId, userId);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: "Sem permissão para criar quarto nesta acomodação"
      });
    }

    const roomData = mapToRoomInsert(validatedData, validatedData.accommodationId);
    const newRoom = await createRoom(roomData);

    res.status(201).json({
      success: true,
      message: "Quarto criado com sucesso",
      data: { room: newRoom }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Dados inválidos",
        errors: error.errors
      });
    }

    console.error("Erro ao criar quarto:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor"
    });
  }
});

// PUT /api/hotels/rooms/:roomId
router.put("/rooms/:roomId", verifyFirebaseToken, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const { roomId } = req.params;
  const userId = authReq.user?.uid;

  try {
    if (!userId) {
      return res.status(401).json({ message: "Usuário não autenticado" });
    }

    const room = await getRoomById(roomId);
    if (!room) {
      return res.status(404).json({ message: "Quarto não encontrado" });
    }

    const isOwner = await isUserAccommodationOwner(room.accommodationId, userId);
    if (!isOwner) {
      return res.status(403).json({ message: "Sem permissão para atualizar este quarto" });
    }

    const validatedData = updateRoomSchema.parse(req.body);

    const updateData = {
      ...validatedData,
      pricePerNight: validatedData.pricePerNight !== undefined 
        ? String(validatedData.pricePerNight) // ✅ Conversão para string no mapper
        : undefined,
      images: normalizeImages(validatedData.images),
      amenities: normalizeAmenities(validatedData.amenities),
    };

    Object.keys(updateData).forEach(key => {
      if (updateData[key as keyof typeof updateData] === undefined) {
        delete updateData[key as keyof typeof updateData];
      }
    });

    const updatedRoom = await updateRoom(roomId, updateData);

    res.json({
      success: true,
      message: "Quarto atualizado com sucesso",
      data: { room: updatedRoom }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Dados inválidos",
        errors: error.errors
      });
    }
    console.error("Erro ao atualizar quarto:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

// DELETE /api/hotels/rooms/:roomId
router.delete("/rooms/:roomId", verifyFirebaseToken, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const { roomId } = req.params;
  const userId = authReq.user?.uid;

  try {
    if (!userId) {
      return res.status(401).json({ message: "Usuário não autenticado" });
    }

    const room = await getRoomById(roomId);
    if (!room) {
      return res.status(404).json({ message: "Quarto não encontrado" });
    }

    const isOwner = await isUserAccommodationOwner(room.accommodationId, userId);
    if (!isOwner) {
      return res.status(403).json({ message: "Sem permissão para deletar este quarto" });
    }

    await deleteRoom(roomId);

    res.json({
      success: true,
      message: "Quarto deletado com sucesso"
    });
  } catch (error) {
    console.error("Erro ao deletar quarto:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

// GET /api/hotels/:id/room-types
router.get("/:id/room-types", async (req, res) => {
  try {
    const { id } = req.params;
    const accommodation = await getAccommodationById(id);

    if (!accommodation) {
      return res.status(404).json({
        success: false,
        message: "Acomodação não encontrada"
      });
    }

    const roomTypes = await getRoomTypesByHotelId(id);

    res.json({
      success: true,
      data: { roomTypes }
    });
  } catch (error) {
    console.error("Erro ao listar tipos de quarto:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor"
    });
  }
});

// GET /api/hotels/:id/rooms
router.get("/:id/rooms", async (req, res) => {
  try {
    const { id } = req.params;
    const accommodation = await getAccommodationById(id);

    if (!accommodation) {
      return res.status(404).json({
        success: false,
        message: "Acomodação não encontrada"
      });
    }

    const rooms = await getRoomsByHotelId(id);

    res.json({
      success: true,
      data: { rooms }
    });
  } catch (error) {
    console.error("Erro ao listar quartos:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor"
    });
  }
});

// GET /api/hotels/dashboard
router.get('/dashboard', verifyFirebaseToken, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const userId = authReq.user?.uid;
    if (!userId) {
      return res.status(401).json({ message: "User ID not found" });
    }

    const stats = await getHotelDashboardData(userId);

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error("Hotel dashboard error:", error);
    res.status(500).json({ message: "Erro ao carregar dashboard" });
  }
});

// GET /api/hotels/reservations
router.get('/reservations', verifyFirebaseToken, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const userId = authReq.user?.uid;
    if (!userId) {
      return res.status(401).json({ message: "User ID not found" });
    }

    const reservations = await getProviderBookings(userId);

    res.json({
      success: true,
      reservations
    });
  } catch (error) {
    console.error("Hotel reservations error:", error);
    res.status(500).json({ message: "Erro ao carregar reservas" });
  }
});

// GET /api/hotels/reservations/:id
router.get('/reservations/:id', verifyFirebaseToken, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { id } = req.params;
    const userId = authReq.user?.uid;

    if (!userId) {
      return res.status(401).json({ message: "User ID not found" });
    }

    const reservation = await getBookingById(id);

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: "Reserva não encontrada"
      });
    }

    const isOwner = await isUserAccommodationOwner(reservation.accommodationId, userId);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: "Sem permissão para acessar esta reserva"
      });
    }

    res.json({
      success: true,
      reservation
    });
  } catch (error) {
    console.error("Hotel reservation details error:", error);
    res.status(500).json({ message: "Erro ao carregar detalhes da reserva" });
  }
});

// POST /api/hotels/checkin/:reservationId
router.post('/checkin/:reservationId', verifyFirebaseToken, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { reservationId } = req.params;
    const userId = authReq.user?.uid;

    if (!userId) {
      return res.status(401).json({ message: "User ID not found" });
    }

    const reservation = await getBookingById(reservationId);
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: "Reserva não encontrada"
      });
    }

    const isOwner = await isUserAccommodationOwner(reservation.accommodationId, userId);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: "Sem permissão para realizar check-in nesta reserva"
      });
    }

    const updatedReservation = await updateBookingStatus(reservationId, 'in_progress');

    res.json({
      success: true,
      message: "Check-in realizado com sucesso",
      reservation: updatedReservation
    });
  } catch (error) {
    console.error("Hotel checkin error:", error);
    res.status(500).json({ message: "Erro ao realizar check-in" });
  }
});

// POST /api/hotels/checkout/:reservationId
router.post('/checkout/:reservationId', verifyFirebaseToken, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { reservationId } = req.params;
    const userId = authReq.user?.uid;

    if (!userId) {
      return res.status(401).json({ message: "User ID not found" });
    }

    const reservation = await getBookingById(reservationId);
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: "Reserva não encontrada"
      });
    }

    const isOwner = await isUserAccommodationOwner(reservation.accommodationId, userId);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: "Sem permissão para realizar checkout nesta reserva"
      });
    }

    const updatedReservation = await updateBookingStatus(reservationId, 'completed');

    res.json({
      success: true,
      message: "Check-out realizado com sucesso",
      reservation: updatedReservation
    });
  } catch (error) {
    console.error("Hotel checkout error:", error);
    res.status(500).json({ message: "Erro ao realizar check-out" });
  }
});

// POST /api/hotels/cancel/:reservationId
router.post('/cancel/:reservationId', verifyFirebaseToken, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { reservationId } = req.params;
    const userId = authReq.user?.uid;

    if (!userId) {
      return res.status(401).json({ message: "User ID not found" });
    }

    const reservation = await getBookingById(reservationId);
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: "Reserva não encontrada"
      });
    }

    const isOwner = await isUserAccommodationOwner(reservation.accommodationId, userId);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: "Sem permissão para cancelar esta reserva"
      });
    }

    const updatedReservation = await updateBookingStatus(reservationId, 'cancelled');

    res.json({
      success: true,
      message: "Reserva cancelada com sucesso",
      reservation: updatedReservation
    });
  } catch (error) {
    console.error("Hotel cancel reservation error:", error);
    res.status(500).json({ message: "Erro ao cancelar reserva" });
  }
});

// GET /api/hotels/rooms
router.get('/rooms', verifyFirebaseToken, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const userId = authReq.user?.uid;
    if (!userId) {
      return res.status(401).json({ message: "User ID not found" });
    }

    const rooms = await getHotelRooms(userId);

    res.json({
      success: true,
      rooms
    });
  } catch (error) {
    console.error("Hotel rooms error:", error);
    res.status(500).json({ message: "Erro ao carregar quartos" });
  }
});

export default router;