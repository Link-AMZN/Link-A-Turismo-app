import { Router, Request, Response } from "express";
import { insertAccommodationSchema } from "../../../shared/schema";
import { type AuthenticatedRequest, verifyFirebaseToken } from "../../../src/shared/firebaseAuth";
import { z } from "zod";
import { db } from "../../../db";
import { sql } from "drizzle-orm";
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
  // ✅ NOVAS FUNÇÕES DE PARTNERSHIPS IMPORTADAS
  getHotelPartnerships,
  getHotelDriverPartnerships,
  createHotelPartnership,
  // ✅ NOVA FUNÇÃO DE BUSCA INTELIGENTE
  searchHotelsIntelligent
} from "./hotelService";

const router = Router();

// ✅ CORREÇÃO: Funções de normalização com tipos explícitos
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

// ✅ CORREÇÃO: Interfaces para os dados mapeados COM PROPRIEDADES OBRIGATÓRIAS
interface MappedAccommodationData {
  name: string;
  type: string;
  address: string;
  hostId?: string;
  images?: string[] | null;
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
  locality?: string | null;
  province?: string | null;
}

interface MappedRoomData {
  accommodationId: string;
  roomNumber: string;
  roomType: string;
  description?: string | null;
  pricePerNight: number;
  maxOccupancy?: number;
  bedType?: string | null;
  bedCount?: number;
  hasPrivateBathroom?: boolean;
  hasAirConditioning?: boolean;
  hasWifi?: boolean;
  hasTV?: boolean;
  hasBalcony?: boolean;
  hasKitchen?: boolean;
  amenities?: string[] | null;
  images?: string[] | null;
  isAvailable?: boolean;
  status?: string;
}

// ✅ CORREÇÃO: Mappers com tipos explícitos e tratamento seguro - PROPRIEDADES OBRIGATÓRIAS
const mapToAccommodationInsert = (data: any, hostId: string): MappedAccommodationData => {
  // ✅ CORREÇÃO: Garantir que campos obrigatórios estão presentes
  if (!data.name || !data.type || !data.address) {
    throw new Error("Campos obrigatórios faltando: name, type, address");
  }

  const mappedData: MappedAccommodationData = {
    name: data.name as string,
    type: data.type as string,
    address: data.address as string,
    hostId,
    images: normalizeImages(data.images),
    amenities: normalizeAmenities(data.amenities),
    rating: data.rating as string | undefined,
    lat: data.lat as string | undefined,
    lng: data.lng as string | undefined,
    reviewCount: data.reviewCount as number | undefined,
    transportDiscount: data.transportDiscount as number | undefined,
    description: data.description as string | undefined,
    isAvailable: data.isAvailable as boolean | undefined ?? true,
    checkInTime: data.checkInTime as string | undefined,
    checkOutTime: data.checkOutTime as string | undefined,
    policies: data.policies as string | undefined,
    contactEmail: data.contactEmail as string | undefined,
    contactPhone: data.contactPhone as string | undefined,
    locality: data.locality as string | undefined,
    province: data.province as string | undefined,
  };
  
  // Remover campos undefined
  Object.keys(mappedData).forEach(key => {
    const typedKey = key as keyof MappedAccommodationData;
    if (mappedData[typedKey] === undefined) {
      delete mappedData[typedKey];
    }
  });
  
  return mappedData;
};

const mapToAccommodationUpdate = (data: any): Partial<MappedAccommodationData> => {
  const mappedData: Partial<MappedAccommodationData> = {
    name: data.name as string | undefined,
    type: data.type as string | undefined,
    address: data.address as string | undefined,
    images: normalizeImages(data.images),
    amenities: normalizeAmenities(data.amenities),
    rating: data.rating as string | undefined,
    lat: data.lat as string | undefined,
    lng: data.lng as string | undefined,
    reviewCount: data.reviewCount as number | undefined,
    transportDiscount: data.transportDiscount as number | undefined,
    description: data.description as string | undefined,
    isAvailable: data.isAvailable as boolean | undefined,
    checkInTime: data.checkInTime as string | undefined,
    checkOutTime: data.checkOutTime as string | undefined,
    policies: data.policies as string | undefined,
    contactEmail: data.contactEmail as string | undefined,
    contactPhone: data.contactPhone as string | undefined,
    locality: data.locality as string | undefined,
    province: data.province as string | undefined,
  };
  
  // Remover campos undefined
  Object.keys(mappedData).forEach(key => {
    const typedKey = key as keyof Partial<MappedAccommodationData>;
    if (mappedData[typedKey] === undefined) {
      delete mappedData[typedKey];
    }
  });
  
  return mappedData;
};

const mapToRoomTypeInsert = (data: any, accommodationId: string): any => {
  // ✅ CORREÇÃO: Garantir que campos obrigatórios estão presentes
  if (!data.name || !data.pricePerNight) {
    throw new Error("Campos obrigatórios faltando: name, pricePerNight");
  }

  const mappedData = {
    name: data.name as string,
    type: (data.type as string | undefined) || 'standard',
    accommodationId: accommodationId,
    pricePerNight: data.pricePerNight as number, // Será convertido para string no service
    description: data.description as string | undefined,
    images: normalizeImages(data.images),
    amenities: normalizeAmenities(data.amenities),
    isAvailable: (data.isAvailable as boolean | undefined) ?? true,
    status: (data.status as string | undefined) || 'active',
    basePrice: data.basePrice as number | undefined,
    maxOccupancy: data.maxOccupancy as number | undefined,
    bedType: data.bedType as string | undefined,
    bedCount: data.bedCount as number | undefined,
  };
  
  // Remover campos undefined
  Object.keys(mappedData).forEach(key => {
    if (mappedData[key as keyof typeof mappedData] === undefined) {
      delete mappedData[key as keyof typeof mappedData];
    }
  });
  
  return mappedData;
};

// ✅ CORREÇÃO: Mapper para hotelRooms com tipos explícitos e conversão de pricePerNight
const mapToRoomInsert = (data: any, accommodationId: string): MappedRoomData => {
  // ✅ CORREÇÃO: Garantir que campos obrigatórios estão presentes
  if (!data.roomNumber || !data.roomType || !data.pricePerNight) {
    throw new Error("Campos obrigatórios faltando: roomNumber, roomType, pricePerNight");
  }

  const mappedData: MappedRoomData = {
    accommodationId: accommodationId,
    roomNumber: data.roomNumber as string,
    roomType: data.roomType as string,
    pricePerNight: data.pricePerNight as number, // Será convertido para string no service
    description: (data.description as string | undefined) || null,
    maxOccupancy: (data.maxOccupancy as number | undefined) || 2,
    bedType: (data.bedType as string | undefined) || null,
    bedCount: (data.bedCount as number | undefined) || 1,
    hasPrivateBathroom: (data.hasPrivateBathroom as boolean | undefined) ?? true,
    hasAirConditioning: (data.hasAirConditioning as boolean | undefined) ?? false,
    hasWifi: (data.hasWifi as boolean | undefined) ?? false,
    hasTV: (data.hasTV as boolean | undefined) ?? false,
    hasBalcony: (data.hasBalcony as boolean | undefined) ?? false,
    hasKitchen: (data.hasKitchen as boolean | undefined) ?? false,
    amenities: normalizeAmenities(data.amenities),
    images: normalizeImages(data.images),
    isAvailable: (data.isAvailable as boolean | undefined) ?? true,
    status: (data.status as string | undefined) || 'available'
  };
  
  return mappedData;
};

// ✅ CORREÇÃO: Mapper para atualização de quarto com tipos explícitos
const mapToRoomUpdate = (data: any): Partial<MappedRoomData> => {
  const mappedData: Partial<MappedRoomData> = {
    roomNumber: data.roomNumber as string | undefined,
    roomType: data.roomType as string | undefined,
    description: data.description as string | undefined,
    pricePerNight: data.pricePerNight as number | undefined, // Será convertido para string no service
    maxOccupancy: data.maxOccupancy as number | undefined,
    bedType: data.bedType as string | undefined,
    bedCount: data.bedCount as number | undefined,
    hasPrivateBathroom: data.hasPrivateBathroom as boolean | undefined,
    hasAirConditioning: data.hasAirConditioning as boolean | undefined,
    hasWifi: data.hasWifi as boolean | undefined,
    hasTV: data.hasTV as boolean | undefined,
    hasBalcony: data.hasBalcony as boolean | undefined,
    hasKitchen: data.hasKitchen as boolean | undefined,
    amenities: normalizeAmenities(data.amenities),
    images: normalizeImages(data.images),
    isAvailable: data.isAvailable as boolean | undefined,
    status: data.status as string | undefined
  };
  
  // Remover campos undefined
  Object.keys(mappedData).forEach(key => {
    const typedKey = key as keyof Partial<MappedRoomData>;
    if (mappedData[typedKey] === undefined) {
      delete mappedData[typedKey];
    }
  });
  
  return mappedData;
};

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
  locality: z.string().optional().nullable(),
  province: z.string().optional().nullable(),
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
  locality: z.string().optional().nullable(),
  province: z.string().optional().nullable(),
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

// ✅ NOVO: Schema para criar parcerias
const createPartnershipSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().optional().nullable(),
  province: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  offerFuel: z.boolean().optional().default(false),
  offerMeals: z.boolean().optional().default(false),
  offerFreeAccommodation: z.boolean().optional().default(false),
  commission: z.number().min(0, "Comissão deve ser um número positivo").optional().default(0),
  minimumDriverLevel: z.string().optional().default('bronze'),
  requiredVehicleType: z.string().optional().default('any'),
});

// =============================================================================
// ✅ ROTA PRINCIPAL DE BUSCA DE HOTÉIS CORRIGIDA - BUSCA INTELIGENTE
// =============================================================================

// GET /api/hotels - ✅ CORREÇÃO COMPLETA DA BUSCA INTELIGENTE
router.get("/", async (req: Request, res: Response) => {
  try {
    const { address, checkIn, checkOut, guests, isAvailable = 'true' } = req.query;
    
    console.log('🎯 BACKEND: Buscando hotéis para:', address);
    console.log('📋 BACKEND: Parâmetros da busca:', {
      address,
      checkIn,
      checkOut,
      guests,
      isAvailable
    });

    // ✅ CORREÇÃO: Se não tem endereço, buscar todos os hotéis disponíveis
    if (!address || address.toString().trim() === '') {
      console.log('🔍 BACKEND: Buscando todos os hotéis disponíveis...');
      
      const allHotels = await getAccommodations({ 
        isAvailable: isAvailable === 'true' 
      });

      console.log(`✅ BACKEND: Encontrados ${allHotels.length} hotéis`);
      return res.json({
        success: true,
        data: {
          hotels: allHotels,
          searchType: 'all',
          message: `Encontrados ${allHotels.length} hotéis disponíveis`
        }
      });
    }

    const searchAddress = address.toString().trim();
    console.log('🔍 BACKEND: BUSCA INTELIGENTE: Buscando por:', searchAddress);

    // ✅ CORREÇÃO: Usar a função searchHotelsIntelligent diretamente
    const searchFilters = {
      address: searchAddress,
      checkIn: checkIn as string,
      checkOut: checkOut as string,
      guests: parseInt(guests as string) || 2,
      isAvailable: isAvailable === 'true'
    };

    console.log('🎯 BACKEND: Executando busca inteligente com filtros:', searchFilters);
    
    const hotels = await searchHotelsIntelligent(searchFilters);

    console.log(`✅ BACKEND: BUSCA FINAL: Encontrados ${hotels.length} hotéis no total`);
    
    res.json({
      success: true,
      data: {
        hotels,
        searchType: hotels.length > 0 ? 'success' : 'no_results',
        message: hotels.length > 0 
          ? `Encontrados ${hotels.length} hotéis para "${searchAddress}"`
          : `Nenhum hotel encontrado para "${searchAddress}"`
      }
    });

  } catch (error) {
    console.error("❌ BACKEND: Erro na busca de hotéis:", error);
    res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor na busca de hotéis',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// =============================================================================
// ✅ ROTA DE BUSCA INTELIGENTE SEPARADA - PARA AUTOCOMPLETE E BUSCA AVANÇADA
// =============================================================================

// GET /api/hotels/search/intelligent - ✅ NOVA ROTA DE BUSCA INTELIGENTE
router.get("/search/intelligent", async (req: Request, res: Response) => {
  try {
    const { q, location, province, checkIn, checkOut, guests, isAvailable = 'true' } = req.query;
    
    console.log('🎯 BACKEND: BUSCA INTELIGENTE AVANÇADA INICIADA');
    console.log('📋 BACKEND: Parâmetros da busca inteligente:', {
      q, location, province, checkIn, checkOut, guests, isAvailable
    });

    // ✅ Se não tem nenhum parâmetro de busca, retornar vazio
    if (!q && !location && !province) {
      console.log('🔍 BACKEND: Nenhum parâmetro de busca fornecido');
      return res.json({
        success: true,
        data: {
          hotels: [],
          searchType: 'no_params',
          message: 'Forneça parâmetros de busca'
        }
      });
    }

    const searchFilters = {
      query: q as string,
      location: location as string,
      province: province as string,
      checkIn: checkIn as string,
      checkOut: checkOut as string,
      guests: parseInt(guests as string) || 2,
      isAvailable: isAvailable === 'true'
    };

    console.log('🎯 BACKEND: Executando busca inteligente avançada:', searchFilters);
    
    const hotels = await searchHotelsIntelligent(searchFilters);

    console.log(`✅ BACKEND: BUSCA INTELIGENTE: Encontrados ${hotels.length} hotéis`);
    
    res.json({
      success: true,
      data: {
        hotels,
        searchType: hotels.length > 0 ? 'success' : 'no_results',
        message: hotels.length > 0 
          ? `Encontrados ${hotels.length} hotéis`
          : 'Nenhum hotel encontrado para os critérios de busca'
      }
    });

  } catch (error) {
    console.error("❌ BACKEND: Erro na busca inteligente:", error);
    res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor na busca inteligente',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// =============================================================================
// ✅ ROTAS DE PARTNERSHIPS CORRIGIDAS - USANDO FUNÇÕES REAIS
// =============================================================================

// GET /api/hotels/:hotelId/partnerships
router.get("/:hotelId/partnerships", verifyFirebaseToken, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    console.log("🎯 BACKEND: Rota GET /:hotelId/partnerships INICIADA");
    
    const { hotelId } = req.params;
    const userId = authReq.user?.uid;

    if (!userId) {
      return res.status(401).json({ 
        success: false,
        message: "Usuário não autenticado" 
      });
    }

    const hotel = await getAccommodationById(hotelId);
    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel não encontrado"
      });
    }

    const isOwner = await isUserAccommodationOwner(hotelId, userId);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: "Sem permissão para acessar parcerias deste hotel"
      });
    }

    const partnerships = await getHotelPartnerships(hotelId);

    res.json({
      success: true,
      data: partnerships
    });

  } catch (error) {
    console.error("❌ BACKEND: Erro ao buscar parcerias:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor"
    });
  }
});

// GET /api/hotels/:hotelId/driver-partnerships
router.get("/:hotelId/driver-partnerships", verifyFirebaseToken, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    console.log("🎯 BACKEND: Rota GET /:hotelId/driver-partnerships INICIADA");
    
    const { hotelId } = req.params;
    const userId = authReq.user?.uid;

    if (!userId) {
      return res.status(401).json({ 
        success: false,
        message: "Usuário não autenticado" 
      });
    }

    const hotel = await getAccommodationById(hotelId);
    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel não encontrado"
      });
    }

    const isOwner = await isUserAccommodationOwner(hotelId, userId);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: "Sem permissão para acessar parcerias de motoristas deste hotel"
      });
    }

    const driverPartnerships = await getHotelDriverPartnerships(hotelId);

    res.json({
      success: true,
      data: driverPartnerships
    });

  } catch (error) {
    console.error("❌ BACKEND: Erro ao buscar parcerias com motoristas:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor"
    });
  }
});

// POST /api/hotels/:hotelId/partnerships
router.post("/:hotelId/partnerships", verifyFirebaseToken, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    console.log("🎯 BACKEND: Rota POST /:hotelId/partnerships INICIADA");
    console.log("🔍 BACKEND: Dados recebidos:", req.body);
    
    const { hotelId } = req.params;
    const userId = authReq.user?.uid;

    if (!userId) {
      return res.status(401).json({ 
        success: false,
        message: "Usuário não autenticado" 
      });
    }

    const hotel = await getAccommodationById(hotelId);
    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel não encontrado"
      });
    }

    const isOwner = await isUserAccommodationOwner(hotelId, userId);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: "Sem permissão para criar parcerias neste hotel"
      });
    }

    const validatedData = createPartnershipSchema.parse(req.body);
    const newPartnership = await createHotelPartnership(hotelId, validatedData);

    res.status(201).json({
      success: true,
      message: "Parceria criada com sucesso",
      data: newPartnership
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

    console.error("❌ BACKEND: Erro ao criar parceria:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor"
    });
  }
});

// =============================================================================
// ROTAS EXISTENTES (MANTIDAS SEM ALTERAÇÕES)
// =============================================================================

// GET /api/hotels/my-hotels
router.get("/my-hotels", verifyFirebaseToken, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const userId = authReq.user?.uid;
    if (!userId) {
      return res.status(401).json({ message: "Usuário não autenticado" });
    }

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

    const updatedReservation = await updateBookingStatus(reservationId, 'confirmed');

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
    const updateData = mapToRoomUpdate(validatedData);

    const updatedRoom = await updateRoom(roomId, updateData);

    if (!updatedRoom) {
      return res.status(500).json({ 
        success: false,
        message: "Erro ao atualizar quarto" 
      });
    }

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