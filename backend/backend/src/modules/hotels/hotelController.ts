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

// ✅ CORREÇÃO: Mapper corrigido para usar a tabela hotelRooms
const mapToRoomInsert = (data: any, accommodationId: string) => ({
  ...data,
  accommodationId, // ✅ Usar accommodationId (nome correto da coluna)
  pricePerNight: data.pricePerNight, // ✅ Manter como number (não converter para string)
  images: normalizeImages(data.images),
  roomAmenities: normalizeAmenities(data.amenities), // ✅ Usar roomAmenities (nome correto da coluna)
});

// ✅ CORREÇÃO: Mapper para atualização de quarto
const mapToRoomUpdate = (data: any) => ({
  ...data,
  pricePerNight: data.pricePerNight, // ✅ Manter como number
  images: normalizeImages(data.images),
  roomAmenities: normalizeAmenities(data.amenities), // ✅ Usar roomAmenities
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

// ✅ CORREÇÃO: Schema corrigido para criar quartos na tabela hotelRooms
const createRoomSchema = z.object({
  accommodationId: z.string().uuid(),
  roomNumber: z.string().min(1),
  roomType: z.string().min(1),
  description: z.string().optional().nullable(),
  pricePerNight: z.coerce.number().positive(),
  maxOccupancy: z.number().int().min(1).default(2),
  bedType: z.string().optional().nullable(),
  bedCount: z.number().int().min(1).default(1),
  hasPrivateBathroom: z.boolean().default(true),
  hasAirConditioning: z.boolean().default(false),
  hasWifi: z.boolean().default(false),
  hasTV: z.boolean().default(false),
  hasBalcony: z.boolean().default(false),
  hasKitchen: z.boolean().default(false),
  amenities: z.unknown().optional().nullable(),
  images: z.unknown().optional().nullable(),
  isAvailable: z.boolean().default(true),
  status: z.string().default('available'),
});

// ✅ CORREÇÃO: Schema corrigido para atualizar quartos
const updateRoomSchema = createRoomSchema.partial().extend({
  accommodationId: z.string().uuid().optional(),
});

const querySchema = z.object({
  type: z.string().optional(),
  address: z.string().optional(),
  isAvailable: z.string().optional(),
  sortBy: z.string().optional().default('rating'),
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('20'),
});

// ✅ NOVA ROTA: Gerenciamento de hotel (resolve o erro 404) - COM DEBUG
router.get("/manage-hotel/:hotelId", verifyFirebaseToken, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    console.log("🎯 BACKEND: Rota /manage-hotel/:hotelId INICIADA");
    console.log("🔍 BACKEND: Parâmetros:", req.params);
    console.log("🔍 BACKEND: Headers authorization:", req.headers.authorization ? "PRESENTE" : "AUSENTE");
    
    const { hotelId } = req.params;
    const userId = authReq.user?.uid;

    console.log("🔍 BACKEND: hotelId:", hotelId);
    console.log("🔍 BACKEND: userId:", userId);

    if (!userId) {
      console.log("❌ BACKEND: Usuário não autenticado - SEM UID");
      return res.status(401).json({ 
        success: false,
        message: "Usuário não autenticado" 
      });
    }

    console.log("🔍 BACKEND: Verificando se hotel existe...");
    // Verificar se o hotel existe e pertence ao usuário
    const hotel = await getAccommodationById(hotelId);
    console.log("🔍 BACKEND: Hotel encontrado:", hotel ? `SIM (${hotel.name})` : "NÃO");
    
    if (!hotel) {
      console.log("❌ BACKEND: Hotel não encontrado no banco");
      return res.status(404).json({
        success: false,
        message: "Hotel não encontrado"
      });
    }

    console.log("🔍 BACKEND: Verificando se usuário é owner...");
    const isOwner = await isUserAccommodationOwner(hotelId, userId);
    console.log("🔍 BACKEND: É owner?", isOwner);
    
    if (!isOwner) {
      console.log("❌ BACKEND: Usuário NÃO é owner do hotel");
      return res.status(403).json({
        success: false,
        message: "Sem permissão para gerenciar este hotel"
      });
    }

    console.log("🔍 BACKEND: Buscando quartos do hotel...");
    // Buscar quartos do hotel
    const rooms = await getRoomsByHotelId(hotelId);
    console.log("🔍 BACKEND: Quartos encontrados:", rooms.length);

    console.log("✅ BACKEND: Retornando dados com sucesso - Hotel:", hotel.name, "Quartos:", rooms.length);
    res.json({
      success: true,
      data: {
        hotel,
        rooms
      }
    });
  } catch (error) {
    console.error("❌ BACKEND: Erro CAPTURADO na rota /manage-hotel:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor"
    });
  }
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

// GET /api/hotels/my-hotels
router.get("/my-hotels", verifyFirebaseToken, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const userId = authReq.user?.uid;
    if (!userId) {
      return res.status(401).json({ message: "Usuário não autenticado" });
    }

    // Buscar acomodações do host
    const accommodationsList = await getAccommodations({ hostId: userId });

    res.json({
      success: true,
      data: accommodationsList,
    });
  } catch (error) {
    console.error("Erro ao buscar acomodações do usuário:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
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

// ✅ CORREÇÃO: Rota para criar quartos - USANDO TABELA hotelRooms
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

    // ✅ CORREÇÃO: Usar mapper correto para hotelRooms
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

// ✅ CORREÇÃO: Rota para atualizar quartos - USANDO TABELA hotelRooms
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

    // ✅ CORREÇÃO: Usar mapper correto para hotelRooms
    const updateData = mapToRoomUpdate(validatedData);

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

// ✅ NOVA ROTA: POST para criar quarto em hotel específico - RESOLVE O ERRO 404
router.post("/:hotelId/rooms", verifyFirebaseToken, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    console.log("🎯 BACKEND: Rota POST /:hotelId/rooms INICIADA");
    console.log("🔍 BACKEND: Parâmetros:", req.params);
    console.log("🔍 BACKEND: Dados recebidos:", req.body);

    const { hotelId } = req.params;
    const userId = authReq.user?.uid;

    if (!userId) {
      console.log("❌ BACKEND: Usuário não autenticado");
      return res.status(401).json({ 
        success: false,
        message: "Usuário não autenticado" 
      });
    }

    console.log("🔍 BACKEND: hotelId:", hotelId);
    console.log("🔍 BACKEND: userId:", userId);

    // Verificar se o hotel existe
    const hotel = await getAccommodationById(hotelId);
    console.log("🔍 BACKEND: Hotel encontrado:", hotel ? `SIM (${hotel.name})` : "NÃO");

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel não encontrado"
      });
    }

    // Verificar se o usuário é owner do hotel
    const isOwner = await isUserAccommodationOwner(hotelId, userId);
    console.log("🔍 BACKEND: É owner?", isOwner);

    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: "Sem permissão para adicionar quartos a este hotel"
      });
    }

    // Validar dados do quarto
    const validatedData = createRoomSchema.parse({
      ...req.body,
      accommodationId: hotelId // Garantir que usa o hotelId da URL
    });

    console.log("✅ BACKEND: Dados validados:", validatedData);

    // Mapear e criar o quarto
    const roomData = mapToRoomInsert(validatedData, hotelId);
    console.log("💾 BACKEND: Dados para inserção:", roomData);

    const newRoom = await createRoom(roomData);
    console.log("✅ BACKEND: Quarto criado com sucesso:", newRoom.id);

    res.status(201).json({
      success: true,
      message: "Quarto criado com sucesso",
      data: { room: newRoom }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("❌ BACKEND: Erro de validação:", error.errors);
      return res.status(400).json({
        success: false,
        message: "Dados inválidos",
        errors: error.errors
      });
    }

    console.error("❌ BACKEND: Erro ao criar quarto:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor ao criar quarto"
    });
  }
});

// ✅ ADICIONADO: Rota para atualizar quarto específico de hotel - RESOLVE ERRO 404
router.put("/:hotelId/rooms/:roomId", verifyFirebaseToken, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    console.log("🎯 BACKEND: Rota PUT /:hotelId/rooms/:roomId INICIADA");
    console.log("🔍 BACKEND: Parâmetros:", req.params);
    console.log("🔍 BACKEND: Dados recebidos:", req.body);

    const { hotelId, roomId } = req.params;
    const userId = authReq.user?.uid;

    if (!userId) {
      console.log("❌ BACKEND: Usuário não autenticado");
      return res.status(401).json({ 
        success: false,
        message: "Usuário não autenticado" 
      });
    }

    console.log("🔍 BACKEND: hotelId:", hotelId);
    console.log("🔍 BACKEND: roomId:", roomId);
    console.log("🔍 BACKEND: userId:", userId);

    // Verificar se o hotel existe
    const hotel = await getAccommodationById(hotelId);
    console.log("🔍 BACKEND: Hotel encontrado:", hotel ? `SIM (${hotel.name})` : "NÃO");

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel não encontrado"
      });
    }

    // Verificar se o usuário é owner do hotel
    const isOwner = await isUserAccommodationOwner(hotelId, userId);
    console.log("🔍 BACKEND: É owner?", isOwner);

    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: "Sem permissão para atualizar quartos deste hotel"
      });
    }

    // Verificar se o quarto existe
    const room = await getRoomById(roomId);
    console.log("🔍 BACKEND: Quarto encontrado:", room ? `SIM (${room.roomNumber})` : "NÃO");

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Quarto não encontrado"
      });
    }

    // Verificar se o quarto pertence ao hotel
    if (room.accommodationId !== hotelId) {
      return res.status(400).json({
        success: false,
        message: "Quarto não pertence a este hotel"
      });
    }

    // Validar dados do quarto
    const validatedData = updateRoomSchema.parse(req.body);
    console.log("✅ BACKEND: Dados validados:", validatedData);

    // Mapear e atualizar o quarto
    const updateData = mapToRoomUpdate(validatedData);
    console.log("💾 BACKEND: Dados para atualização:", updateData);

    const updatedRoom = await updateRoom(roomId, updateData);
    console.log("✅ BACKEND: Quarto atualizado com sucesso:", updatedRoom.id);

    res.json({
      success: true,
      message: "Quarto atualizado com sucesso",
      data: { room: updatedRoom }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("❌ BACKEND: Erro de validação:", error.errors);
      return res.status(400).json({
        success: false,
        message: "Dados inválidos",
        errors: error.errors
      });
    }

    console.error("❌ BACKEND: Erro ao atualizar quarto:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor ao atualizar quarto"
    });
  }
});

// ✅ ADICIONADO: Rota para eliminar quarto específico de hotel - RESOLVE ERRO 404
router.delete("/:hotelId/rooms/:roomId", verifyFirebaseToken, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    console.log("🎯 BACKEND: Rota DELETE /:hotelId/rooms/:roomId INICIADA");
    console.log("🔍 BACKEND: Parâmetros:", req.params);

    const { hotelId, roomId } = req.params;
    const userId = authReq.user?.uid;

    if (!userId) {
      console.log("❌ BACKEND: Usuário não autenticado");
      return res.status(401).json({ 
        success: false,
        message: "Usuário não autenticado" 
      });
    }

    console.log("🔍 BACKEND: hotelId:", hotelId);
    console.log("🔍 BACKEND: roomId:", roomId);
    console.log("🔍 BACKEND: userId:", userId);

    // Verificar se o hotel existe
    const hotel = await getAccommodationById(hotelId);
    console.log("🔍 BACKEND: Hotel encontrado:", hotel ? `SIM (${hotel.name})` : "NÃO");

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel não encontrado"
      });
    }

    // Verificar se o usuário é owner do hotel
    const isOwner = await isUserAccommodationOwner(hotelId, userId);
    console.log("🔍 BACKEND: É owner?", isOwner);

    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: "Sem permissão para eliminar quartos deste hotel"
      });
    }

    // Verificar se o quarto existe
    const room = await getRoomById(roomId);
    console.log("🔍 BACKEND: Quarto encontrado:", room ? `SIM (${room.roomNumber})` : "NÃO");

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Quarto não encontrado"
      });
    }

    // Verificar se o quarto pertence ao hotel
    if (room.accommodationId !== hotelId) {
      return res.status(400).json({
        success: false,
        message: "Quarto não pertence a este hotel"
      });
    }

    // Eliminar o quarto
    await deleteRoom(roomId);
    console.log("✅ BACKEND: Quarto eliminado com sucesso:", roomId);

    res.json({
      success: true,
      message: "Quarto eliminado com sucesso"
    });

  } catch (error) {
    console.error("❌ BACKEND: Erro ao eliminar quarto:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor ao eliminar quarto"
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

export default router;