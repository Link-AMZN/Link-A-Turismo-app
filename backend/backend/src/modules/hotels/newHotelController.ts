// src/modules/hotels/newHotelController.ts - VERSÃO COMPLETA CORRIGIDA E OTIMIZADA
import { Request, Response, NextFunction } from "express";
import { hotelService } from "./newHotelService";
import { z } from "zod";

// ====================== DEBUG GLOBAL ======================
console.log('🚀 newHotelController.ts CARREGADO - VERSÃO COMPLETA CORRIGIDA E OTIMIZADA');

// ====================== MIDDLEWARES ======================

// Middleware de validação de UUID - VERSÃO CORRIGIDA
export const validateUUID = (paramName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    console.log('====================================');
    console.log(`🔍 MIDDLEWARE validateUUID CHAMADO para: ${paramName}`);
    console.log(`📋 Rota atual: ${req.originalUrl}`);
    console.log(`📋 Método: ${req.method}`);
    console.log(`📋 req.params[${paramName}]:`, req.params[paramName]);
    console.log(`📋 Todos os params:`, req.params);
    console.log('====================================');
    
    const uuid = req.params[paramName];
    
    if (!uuid) {
      console.log(`✅ ${paramName} não encontrado nos params, passando adiante...`);
      return next();
    }
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (!uuidRegex.test(uuid)) {
      console.log(`❌ UUID inválido recebido: "${uuid}"`);
      return res.status(400).json({
        success: false,
        error: `Parâmetro ${paramName} deve ser um UUID válido`,
        received: uuid,
        example: "123e4567-e89b-12d3-a456-426614174000"
      });
    }
    
    console.log(`✅ UUID válido: ${uuid}`);
    next();
  };
};

// Middleware de validação de dados
export const validate = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: error.errors
        });
      }
      next(error);
    }
  };
};

// ====================== SCHEMAS DE VALIDAÇÃO ======================

export const createHotelSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  address: z.string().min(1),
  locality: z.string().min(1),
  province: z.string().min(1),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  images: z.array(z.string()).optional(),
  amenities: z.array(z.string()).optional(),
  contactEmail: z.string().email(),
  contactPhone: z.string().optional(),
  hostId: z.string().optional(),
  policies: z.string().optional(),
  checkInTime: z.string().optional(),
  checkOutTime: z.string().optional(),
  country: z.string().optional(),
});

export const updateHotelSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  address: z.string().min(1).optional(),
  locality: z.string().min(1).optional(),
  province: z.string().min(1).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  images: z.array(z.string()).optional(),
  amenities: z.array(z.string()).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  policies: z.string().optional(),
  checkInTime: z.string().optional(),
  checkOutTime: z.string().optional(),
  isActive: z.boolean().optional(),
  country: z.string().optional(),
});

export const createRoomTypeSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  basePrice: z.number().positive(),
  totalUnits: z.number().int().positive().default(1),
  baseOccupancy: z.number().int().positive().default(2),
  maxOccupancy: z.number().int().positive().default(2),
  minNightsDefault: z.number().int().positive().default(1),
  extraAdultPrice: z.number().nonnegative().optional(),
  extraChildPrice: z.number().nonnegative().optional(),
  amenities: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(),
  isActive: z.boolean().default(true),
  size: z.string().optional(),
  bedType: z.string().optional(),
  bedTypes: z.array(z.string()).optional(),
  bathroomType: z.string().optional(),
  availableUnits: z.number().int().nonnegative().optional(),
  childrenPolicy: z.string().optional(),
});

export const updateRoomTypeSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  basePrice: z.number().positive().optional(),
  totalUnits: z.number().int().positive().optional(),
  baseOccupancy: z.number().int().positive().optional(),
  maxOccupancy: z.number().int().positive().optional(),
  minNightsDefault: z.number().int().positive().optional(),
  extraAdultPrice: z.number().nonnegative().optional(),
  extraChildPrice: z.number().nonnegative().optional(),
  amenities: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  size: z.string().optional(),
  bedType: z.string().optional(),
  bedTypes: z.array(z.string()).optional(),
  bathroomType: z.string().optional(),
  availableUnits: z.number().int().nonnegative().optional(),
  childrenPolicy: z.string().optional(),
});

export const bulkAvailabilitySchema = z.object({
  hotelId: z.string().uuid().optional(), // ✅ CORRIGIDO: hotelId pode vir do params ou body
  roomTypeId: z.string().uuid(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  price: z.number().positive().optional(),
  availableUnits: z.number().int().nonnegative().optional(),
  stopSell: z.boolean().default(false),
  minNights: z.number().int().positive().optional().default(1), // ✅ ADICIONADO
  minStay: z.number().int().positive().optional().default(1),   // ✅ ADICIONADO
});

export const createBookingSchema = z.object({
  hotelId: z.string().uuid(),
  roomTypeId: z.string().uuid(),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guestName: z.string().min(1),
  guestEmail: z.string().email(),
  guestPhone: z.string().optional(),
  adults: z.number().int().positive().default(2),
  children: z.number().int().nonnegative().default(0),
  units: z.number().int().positive().default(1),
  specialRequests: z.string().optional(),
  promoCode: z.string().optional(),
});

export const searchHotelsSchema = z.object({
  location: z.string().optional(),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  guests: z.number().int().positive().default(2),
  roomType: z.string().optional(),
  maxPrice: z.number().positive().optional(),
  amenities: z.union([z.string(), z.array(z.string())]).optional().transform(val => {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') return val.split(',').map(a => a.trim()).filter(a => a.length > 0);
    return [];
  }), // ✅ MELHORADO: Aceita string ou array
  radius: z.number().positive().optional(),
  limit: z.number().int().positive().default(20),
  page: z.number().int().positive().default(1),
  sort_by: z.string().optional(),
  sort_order: z.enum(['asc', 'desc']).default('asc'),
}).refine(data => {
  // Se tiver checkIn, deve ter checkOut e vice-versa
  if (data.checkIn && !data.checkOut) return false;
  if (data.checkOut && !data.checkIn) return false;
  return true;
}, {
  message: "checkIn e checkOut devem ser fornecidos juntos",
  path: ["checkIn", "checkOut"]
});

// ====================== HANDLERS DE HOTÉIS ======================

/**
 * Handler: Obter todos os hotéis (admin)
 * GET /api/v2/hotels
 */
export const getAllHotels = async (req: Request, res: Response) => {
  try {
    console.log(`📋 GET /api/v2/hotels`);
    
    const { limit = '50', offset = '0' } = req.query;

    const result = await hotelService.getAllHotels(
      parseInt(limit as string) || 50,
      parseInt(offset as string) || 0
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('❌ Erro em GET /api/v2/hotels:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      data: [],
      pagination: {
        total: 0,
        limit: 0,
        offset: 0,
        hasMore: false
      }
    });
  }
};

/**
 * Handler: Obter hotel por ID
 * GET /api/v2/hotels/:hotelId
 */
export const getHotelById = async (req: Request, res: Response) => {
  try {
    const { hotelId } = req.params;
    console.log(`📋 GET /api/v2/hotels/${hotelId}`);

    const result = await hotelService.getHotelById(hotelId);
    
    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('❌ Erro em GET /api/v2/hotels/:hotelId:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      data: null
    });
  }
};

/**
 * Handler: Criar hotel
 * POST /api/v2/hotels
 */
export const createHotel = async (req: Request, res: Response) => {
  try {
    const hotelData = req.body;
    const userId = (req as any).user?.uid || (req as any).user?.id;
    
    console.log(`📋 POST /api/v2/hotels`, { ...hotelData, userId });

    const result = await hotelService.createHotel(hotelData, userId);
    
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(201).json({
      success: true,
      hotel: result.hotel,
      hotelId: result.hotelId,
      message: 'Hotel criado com sucesso'
    });
  } catch (error) {
    console.error('❌ Erro em POST /api/v2/hotels:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
};

/**
 * Handler: Atualizar hotel
 * PUT /api/v2/hotels/:hotelId
 */
export const updateHotel = async (req: Request, res: Response) => {
  try {
    const { hotelId } = req.params;
    const updateData = req.body;

    console.log(`📋 PUT /api/v2/hotels/${hotelId}`, updateData);

    const result = await hotelService.updateHotel(hotelId, updateData);
    
    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json({
      success: true,
      hotel: result.hotel,
      message: result.message
    });
  } catch (error) {
    console.error('❌ Erro em PUT /api/v2/hotels/:hotelId:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
};

/**
 * Handler: Desativar hotel
 * DELETE /api/v2/hotels/:hotelId
 */
export const deactivateHotel = async (req: Request, res: Response) => {
  try {
    const { hotelId } = req.params;
    console.log(`📋 DELETE /api/v2/hotels/${hotelId}`);

    const result = await hotelService.deactivateHotel(hotelId);
    
    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('❌ Erro em DELETE /api/v2/hotels/:hotelId:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
};

// ====================== HANDLERS DE ROOM TYPES ======================

/**
 * Handler: Obter room types de um hotel
 * GET /api/v2/hotels/:hotelId/room-types
 */
export const getHotelRoomTypes = async (req: Request, res: Response) => {
  try {
    const { hotelId } = req.params;
    const { 
      available, 
      limit = '100', 
      offset = '0' 
    } = req.query;

    console.log(`📋 GET /api/v2/hotels/${hotelId}/room-types`);

    const result = await hotelService.getHotelRoomTypes(hotelId, {
      available: available === 'true',
      limit: parseInt(limit as string) || 100,
      offset: parseInt(offset as string) || 0
    });

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json({
      success: true,
      hotel: result.hotel,
      data: result.data,
      count: result.count
    });
  } catch (error) {
    console.error('❌ Erro em GET /api/v2/hotels/:hotelId/room-types:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
};

/**
 * Handler: Criar room type
 * POST /api/v2/hotels/:hotelId/room-types
 */
export const createRoomType = async (req: Request, res: Response) => {
  try {
    const { hotelId } = req.params;
    const roomTypeData = req.body;

    console.log(`📋 POST /api/v2/hotels/${hotelId}/room-types`, roomTypeData);

    // Converter campos camelCase para snake_case se necessário
    const formattedData = {
      name: roomTypeData.name,
      description: roomTypeData.description,
      base_price: roomTypeData.basePrice,
      total_units: roomTypeData.totalUnits || 1,
      base_occupancy: roomTypeData.baseOccupancy || 2,
      max_occupancy: roomTypeData.maxOccupancy || 2,
      min_nights_default: roomTypeData.minNightsDefault || 1,
      extra_adult_price: roomTypeData.extraAdultPrice || '0.00',
      extra_child_price: roomTypeData.extraChildPrice || '0.00',
      amenities: roomTypeData.amenities || [],
      images: roomTypeData.images || [],
      is_active: roomTypeData.isActive ?? true
    };

    const result = await hotelService.createRoomType(hotelId, formattedData);
    
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(201).json({
      success: true,
      roomType: result.roomType,
      message: result.message
    });
  } catch (error) {
    console.error('❌ Erro em POST /api/v2/hotels/:hotelId/room-types:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
};

// ====================== HANDLERS DE ROOM TYPE INDIVIDUAIS ======================

/**
 * Handler: Obter um room type específico por ID
 * GET /api/v2/hotels/room-types/:roomTypeId
 */
export const getRoomTypeById = async (req: Request, res: Response) => {
  try {
    const { roomTypeId } = req.params;
    console.log(`📋 GET /api/v2/hotels/room-types/${roomTypeId}`);

    const result = await hotelService.getRoomTypeById(roomTypeId);
    
    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('❌ Erro em GET /api/v2/hotels/room-types/:roomTypeId:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
};

/**
 * Handler: Atualizar um room type
 * PUT /api/v2/hotels/room-types/:roomTypeId
 */
export const updateRoomType = async (req: Request, res: Response) => {
  try {
    const { roomTypeId } = req.params;
    const updateData = req.body;
    console.log(`📋 PUT /api/v2/hotels/room-types/${roomTypeId}`, updateData);

    // Converter campos camelCase para snake_case
    const formattedData: any = {};
    if (updateData.name !== undefined) formattedData.name = updateData.name;
    if (updateData.description !== undefined) formattedData.description = updateData.description;
    if (updateData.basePrice !== undefined) formattedData.base_price = updateData.basePrice;
    if (updateData.totalUnits !== undefined) formattedData.total_units = updateData.totalUnits;
    if (updateData.availableUnits !== undefined) formattedData.available_units = updateData.availableUnits;
    if (updateData.baseOccupancy !== undefined) formattedData.base_occupancy = updateData.baseOccupancy;
    if (updateData.maxOccupancy !== undefined) formattedData.max_occupancy = updateData.maxOccupancy;
    if (updateData.minNightsDefault !== undefined) formattedData.min_nights_default = updateData.minNightsDefault;
    if (updateData.extraAdultPrice !== undefined) formattedData.extra_adult_price = updateData.extraAdultPrice;
    if (updateData.extraChildPrice !== undefined) formattedData.extra_child_price = updateData.extraChildPrice;
    if (updateData.size !== undefined) formattedData.size = updateData.size;
    if (updateData.bedType !== undefined) formattedData.bed_type = updateData.bedType;
    if (updateData.bedTypes !== undefined) formattedData.bed_types = updateData.bedTypes;
    if (updateData.bathroomType !== undefined) formattedData.bathroom_type = updateData.bathroomType;
    if (updateData.childrenPolicy !== undefined) formattedData.children_policy = updateData.childrenPolicy;
    if (updateData.amenities !== undefined) formattedData.amenities = updateData.amenities;
    if (updateData.images !== undefined) formattedData.images = updateData.images;
    if (updateData.isActive !== undefined) formattedData.is_active = updateData.isActive;

    const result = await hotelService.updateRoomType(roomTypeId, formattedData);
    
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      data: result.data,
      message: result.message || 'Tipo de quarto atualizado com sucesso'
    });
  } catch (error) {
    console.error('❌ Erro em PUT /api/v2/hotels/room-types/:roomTypeId:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
};

/**
 * Handler: Deletar/Desativar um room type
 * DELETE /api/v2/hotels/room-types/:roomTypeId
 */
export const deleteRoomType = async (req: Request, res: Response) => {
  try {
    const { roomTypeId } = req.params;
    console.log(`📋 DELETE /api/v2/hotels/room-types/${roomTypeId}`);

    const result = await hotelService.deleteRoomType(roomTypeId);
    
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      message: result.message || 'Tipo de quarto removido com sucesso'
    });
  } catch (error) {
    console.error('❌ Erro em DELETE /api/v2/hotels/room-types/:roomTypeId:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
};

// ====================== HANDLERS DE DISPONIBILIDADE ======================

/**
 * Handler: Verificar disponibilidade
 * GET /api/v2/hotels/availability
 */
export const getAvailability = async (req: Request, res: Response) => {
  try {
    console.log('====================================');
    console.log('🚀 HANDLER getAvailability CHAMADO!');
    console.log('📋 URL completa:', req.originalUrl);
    console.log('📋 Método:', req.method);
    console.log('📋 Parâmetros query:', req.query);
    console.log('====================================');

    const { 
      hotelId, 
      roomTypeId, 
      checkIn, 
      checkOut, 
      units = 1,
      promoCode 
    } = req.query;

    if (!hotelId || !roomTypeId || !checkIn || !checkOut) {
      return res.status(400).json({
        success: false,
        error: "Parâmetros obrigatórios faltando: hotelId, roomTypeId, checkIn, checkOut",
        received: { hotelId, roomTypeId, checkIn, checkOut }
      });
    }

    // Validar UUIDs
    const hotelIdStr = String(hotelId);
    const roomTypeIdStr = String(roomTypeId);
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (!uuidRegex.test(hotelIdStr) || !uuidRegex.test(roomTypeIdStr)) {
      return res.status(400).json({
        success: false,
        error: "IDs inválidos. Use UUIDs válidos",
        received: { hotelId: hotelIdStr, roomTypeId: roomTypeIdStr }
      });
    }

    // ✅ ADICIONADO: Validação de datas
    const start = new Date(checkIn as string);
    const end = new Date(checkOut as string);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        error: "Datas inválidas. Use formato YYYY-MM-DD",
        received: { checkIn, checkOut }
      });
    }

    if (start >= end) {
      return res.status(400).json({
        success: false,
        error: "Data de check-in deve ser anterior à data de check-out",
        received: { checkIn, checkOut }
      });
    }

    const result = await hotelService.checkAvailabilityDetailed({
      hotelId: hotelIdStr,
      roomTypeId: roomTypeIdStr,
      checkIn: String(checkIn),
      checkOut: String(checkOut),
      units: parseInt(String(units)) || 1,
      promoCode: promoCode ? String(promoCode) : undefined
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);

  } catch (error) {
    console.error('❌ Erro em GET /api/v2/hotels/availability:', error);
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno no servidor',
      data: null
    });
  }
};

/**
 * Handler: Atualizar disponibilidade em massa - VERSÃO CORRIGIDA E OTIMIZADA
 * POST /api/v2/hotels/:hotelId/availability/bulk
 */
export const bulkUpdateAvailability = async (req: Request, res: Response) => {
  try {
    console.log('====================================');
    console.log('🚀 HANDLER bulkUpdateAvailability CHAMADO!');
    console.log('📋 URL completa:', req.originalUrl);
    console.log('📋 Método:', req.method);
    console.log('📋 Parâmetros params:', req.params);
    console.log('📋 Body recebido:', req.body);
    console.log('====================================');

    const { hotelId: paramHotelId } = req.params;
    const {
      roomTypeId,
      startDate,
      endDate,
      price,
      availableUnits,
      stopSell = false,
      minNights = 1,
      minStay = 1,
      hotelId: bodyHotelId // hotelId pode vir do body também
    } = req.body;

    // ✅ DECISÃO: Usar hotelId do params OU do body (prioridade: params)
    const finalHotelId = paramHotelId || bodyHotelId;

    console.log('📋 Parâmetros extraídos:');
    console.log('  hotelId (final):', finalHotelId);
    console.log('  roomTypeId:', roomTypeId);
    console.log('  startDate:', startDate);
    console.log('  endDate:', endDate);
    console.log('  price:', price);
    console.log('  availableUnits:', availableUnits);
    console.log('  stopSell:', stopSell);
    console.log('  minNights:', minNights);
    console.log('  minStay:', minStay);

    // ✅ VALIDAÇÃO ÚNICA com Zod (substitui todas as validações manuais)
    try {
      const validatedData = bulkAvailabilitySchema.parse({
        hotelId: finalHotelId,
        roomTypeId,
        startDate,
        endDate,
        price,
        availableUnits,
        stopSell,
        minNights,
        minStay
      });

      console.log('✅ Dados validados com sucesso:', validatedData);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        console.log('❌ Erro de validação:', validationError.errors);
        return res.status(400).json({
          success: false,
          error: 'Erro de validação dos dados',
          details: validationError.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
      throw validationError;
    }

    // Validação adicional de datas
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Datas inválidas',
        received: { startDate, endDate }
      });
    }

    if (start > end) {
      return res.status(400).json({
        success: false,
        error: 'Data inicial deve ser anterior à data final',
        received: { startDate, endDate }
      });
    }

    // Limitar a 365 dias
    const maxDays = 365;
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > maxDays) {
      return res.status(400).json({
        success: false,
        error: `Período não pode exceder ${maxDays} dias`,
        receivedDays: daysDiff
      });
    }

    console.log('✅ Todas as validações passadas! Chamando hotelService...');

    const result = await hotelService.bulkUpdateAvailability({
      hotelId: finalHotelId,
      roomTypeId,
      startDate,
      endDate,
      price,
      availableUnits,
      stopSell,
      minNights,
      minStay
    });
      
    console.log('📋 Resultado do serviço:', result);

    if (!result.success) {
      return res.status(400).json({
        ...result,
        debug: {
          handler: 'bulkUpdateAvailability',
          paramsUsed: { 
            hotelId: finalHotelId, 
            roomTypeId, 
            startDate, 
            endDate 
          }
        }
      });
    }

    res.json({
      success: true,
      message: result.message,
      data: {
        hotelId: finalHotelId,
        roomTypeId,
        startDate,
        endDate,
        totalDates: result.updated_dates,
        price,
        availableUnits,
        stopSell,
        minNights,
        minStay,
        timestamp: new Date().toISOString(),
        performance: result.performance // ✅ Inclui dados de performance do service
      }
    });

  } catch (error) {
    console.error('❌ Erro em POST /api/v2/hotels/:hotelId/availability/bulk:', error);
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno no servidor',
      debug: {
        handler: 'bulkUpdateAvailability',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Handler: Verificar disponibilidade rápida
 * GET /api/v2/hotels/availability/quick
 */
export const getQuickAvailability = async (req: Request, res: Response) => {
  try {
    console.log('🚀 HANDLER getQuickAvailability CHAMADO');
    console.log('📋 Query params:', req.query);

    const { 
      roomTypeId, 
      checkIn, 
      checkOut, 
      units = 1 
    } = req.query;

    if (!roomTypeId || !checkIn || !checkOut) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameters: roomTypeId, checkIn, checkOut"
      });
    }

    // ✅ VALIDAÇÃO SIMPLES
    const roomTypeIdStr = String(roomTypeId);
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (!uuidRegex.test(roomTypeIdStr)) {
      return res.status(400).json({
        success: false,
        error: "roomTypeId deve ser um UUID válido",
        received: roomTypeIdStr
      });
    }

    const result = await hotelService.checkRealTimeAvailability({
      roomTypeId: roomTypeIdStr,
      checkIn: String(checkIn),
      checkOut: String(checkOut),
      units: parseInt(String(units)) || 1
    });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('❌ Erro em GET /api/v2/hotels/availability/quick:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
};

// ====================== HANDLERS DE RESERVAS ======================

/**
 * Handler: Criar reserva
 * POST /api/v2/hotels/bookings
 */
export const createBooking = async (req: Request, res: Response) => {
  try {
    const bookingData = req.body;
    
    console.log(`📋 POST /api/v2/hotels/bookings`, bookingData);

    const result = await hotelService.createBooking(bookingData);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(201).json({
      success: true,
      booking: result.booking,
      bookingId: result.bookingId,
      totalPrice: result.totalPrice,
      message: 'Reserva criada com sucesso'
    });
  } catch (error) {
    console.error('❌ Erro em POST /api/v2/hotels/bookings:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      booking: null
    });
  }
};

/**
 * Handler: Obter detalhes da reserva
 * GET /api/v2/hotels/bookings/:bookingId
 */
export const getBookingDetails = async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;
    console.log(`📋 GET /api/v2/hotels/bookings/${bookingId}`);

    const result = await hotelService.getBookingDetails(bookingId);
    
    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json({
      success: true,
      booking: result.booking
    });
  } catch (error) {
    console.error('❌ Erro em GET /api/v2/hotels/bookings/:bookingId:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      booking: null
    });
  }
};

/**
 * Handler: Cancelar reserva
 * POST /api/v2/hotels/bookings/:bookingId/cancel
 */
export const cancelBooking = async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;
    const { cancellationReason } = req.body;

    console.log(`📋 POST /api/v2/hotels/bookings/${bookingId}/cancel`);

    const result = await hotelService.cancelBooking(bookingId, cancellationReason);
    
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      booking: result.booking,
      message: result.message
    });
  } catch (error) {
    console.error('❌ Erro em POST /api/v2/hotels/bookings/:bookingId/cancel:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
};

/**
 * Handler: Obter minhas reservas
 * GET /api/v2/hotels/my-bookings
 */
export const getMyBookings = async (req: Request, res: Response) => {
  try {
    const { email, status } = req.query;

    console.log(`📋 GET /api/v2/hotels/my-bookings for ${email}`);

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Email parameter is required"
      });
    }

    const result = await hotelService.getBookingsByEmail(email as string, status as string);
    
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      bookings: result.bookings,
      count: result.count
    });
  } catch (error) {
    console.error('❌ Erro em GET /api/v2/hotels/my-bookings:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      bookings: [],
      count: 0
    });
  }
};

// ====================== HANDLERS DE BUSCA E PERFORMANCE ======================

/**
 * Handler: Buscar hotéis inteligente - VERSÃO MELHORADA
 * GET /api/v2/hotels/search
 */
export const searchHotels = async (req: Request, res: Response) => {
  try {
    console.log('🚀 HANDLER searchHotels CHAMADO');
    
    const { 
      location, 
      checkIn, 
      checkOut, 
      guests = 2, 
      roomType, 
      maxPrice, 
      amenities,
      limit = 20 
    } = req.query;

    console.log(`📋 GET /api/v2/hotels/search`, { location, checkIn, checkOut, guests });

    // ✅ CORREÇÃO: Parse de amenities de forma mais robusta
    let amenitiesArray: string[] = [];
    if (amenities) {
      if (Array.isArray(amenities)) {
        amenitiesArray = amenities as string[];
      } else if (typeof amenities === 'string') {
        amenitiesArray = amenities.split(',').map(a => a.trim()).filter(a => a.length > 0);
      }
    }

    const result = await hotelService.searchHotelsSmart({
      location: location as string,
      checkIn: checkIn as string,
      checkOut: checkOut as string,
      guests: parseInt(guests as string) || 2,
      roomType: roomType as string,
      maxPrice: maxPrice ? parseInt(maxPrice as string) : undefined,
      amenities: amenitiesArray,
      limit: parseInt(limit as string) || 20
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      data: result.data,
      count: result.count
    });
  } catch (error) {
    console.error('❌ Erro em GET /api/v2/hotels/search:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      data: [],
      count: 0
    });
  }
};

/**
 * Handler: Obter estatísticas do hotel
 * GET /api/v2/hotels/:hotelId/stats
 */
export const getHotelStats = async (req: Request, res: Response) => {
  try {
    const { hotelId } = req.params;
    console.log(`📋 GET /api/v2/hotels/${hotelId}/stats`);

    const result = await hotelService.getHotelStats(hotelId);
    
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      stats: result.stats
    });
  } catch (error) {
    console.error('❌ Erro em GET /api/v2/hotels/:hotelId/stats:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      stats: null
    });
  }
};

/**
 * Handler: Obter performance do hotel
 * GET /api/v2/hotels/:hotelId/performance
 */
export const getHotelPerformance = async (req: Request, res: Response) => {
  try {
    const { hotelId } = req.params;
    const { startDate, endDate } = req.query;

    console.log(`📋 GET /api/v2/hotels/${hotelId}/performance`);

    const result = await hotelService.getHotelPerformance(
      hotelId,
      startDate as string,
      endDate as string
    );
    
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('❌ Erro em GET /api/v2/hotels/:hotelId/performance:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      data: null
    });
  }
};

// ====================== HANDLERS DE UTILIDADE ======================

/**
 * Handler: Health check da API
 * GET /api/v2/hotels/health
 */
export const healthCheck = async (req: Request, res: Response) => {
  try {
    console.log('🚀 HEALTH CHECK CHAMADO');
    
    const result = await hotelService.healthCheck();
    
    if (!result.success) {
      return res.status(500).json(result);
    }

    res.status(200).json({
      success: true,
      message: "Hotel API V2 está funcionando",
      timestamp: new Date().toISOString(),
      database: result.database,
      tables: result.tables,
      debug: {
        controllerLoaded: true,
        serviceAvailable: true
      }
    });
  } catch (error) {
    console.error("❌ Error in hotel health check:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
      message: "Hotel API V2 com problemas de conexão com o banco de dados"
    });
  }
};

/**
 * Handler: Rota de teste temporária
 * GET /api/v2/hotels/test
 */
export const testRoute = async (req: Request, res: Response) => {
  try {
    console.log('🧪 ROTA DE TESTE CHAMADA');
    
    res.json({
      success: true,
      message: "Rota de teste funcionando!",
      timestamp: new Date().toISOString(),
      debug: {
        url: req.originalUrl,
        method: req.method
      }
    });
  } catch (error) {
    console.error('❌ Erro em rota de teste:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
};

// ====================== EXPORTAÇÃO ======================

export default {
  // Middlewares
  validateUUID,
  validate,
  
  // Schemas
  createHotelSchema,
  updateHotelSchema,
  createRoomTypeSchema,
  updateRoomTypeSchema,
  bulkAvailabilitySchema,
  createBookingSchema,
  searchHotelsSchema,
  
  // Hotel handlers
  getAllHotels,
  getHotelById,
  createHotel,
  updateHotel,
  deactivateHotel,
  
  // Room type handlers
  getHotelRoomTypes,
  createRoomType,
  getRoomTypeById,
  updateRoomType,
  deleteRoomType,
  
  // Availability handlers
  getAvailability,
  bulkUpdateAvailability,
  getQuickAvailability,
  
  // Booking handlers
  createBooking,
  getBookingDetails,
  cancelBooking,
  getMyBookings,
  
  // Search and performance
  searchHotels,
  getHotelStats,
  getHotelPerformance,
  
  // Utility handlers
  healthCheck,
  testRoute
};