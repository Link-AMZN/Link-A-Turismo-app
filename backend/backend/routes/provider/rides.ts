import { Router, Request, Response, NextFunction } from 'express';
import { verifyFirebaseToken, requireDriverRole, ensureUserId } from '../../middleware/role-auth';
import { AuthenticatedUser } from '../../shared/types';
import { rideService } from '../../src/services/rideService';
import { insertRideSchema, updateRideSchema } from '../../shared/schema';
import { z } from 'zod';
import { db } from '../../db';
import { sql } from 'drizzle-orm';

const router = Router();

// ✅ CORREÇÃO: Logger profissional
const logger = {
  info: (message: string, data?: any) => {
    if (process.env.NODE_ENV !== 'test') {
      console.log(`ℹ️  PROVIDER-RIDES: ${message}`, data || '');
    }
  },
  error: (message: string, error?: any) => {
    console.error(`❌ PROVIDER-RIDES: ${message}`, error || '');
  },
  warn: (message: string, data?: any) => {
    console.warn(`⚠️  PROVIDER-RIDES: ${message}`, data || '');
  }
};

// ✅✅✅ CORREÇÃO CRÍTICA: Normalizador usando PostgreSQL
async function normalizeLocation(locationName: string): Promise<string> {
  if (!locationName || locationName.trim() === '') {
    return '';
  }

  try {
    console.log('🔍 [PROVIDER-NORMALIZER] Normalizando:', locationName);
    
    const result = await db.execute(sql`
      SELECT normalize_location_name(${locationName}) as normalized
    `);
    
    // Extrai o resultado de forma segura
    let normalizedValue = locationName.split(',')[0].trim().toLowerCase();
    
    if (Array.isArray(result)) {
      normalizedValue = result[0]?.normalized || normalizedValue;
    } else if (result && Array.isArray((result as any).rows)) {
      normalizedValue = (result as any).rows[0]?.normalized || normalizedValue;
    } else if (result && typeof result === 'object') {
      const values = Object.values(result);
      if (Array.isArray(values[0]) && values[0].length > 0) {
        normalizedValue = values[0][0]?.normalized || normalizedValue;
      }
    }
    
    console.log('✅ [PROVIDER-NORMALIZER] Resultado:', {
      original: locationName,
      normalized: normalizedValue
    });
    
    return normalizedValue;

  } catch (error) {
    console.error('❌ [PROVIDER-NORMALIZER] Erro, usando fallback:', error);
    return locationName.split(',')[0].trim().toLowerCase();
  }
}

// ✅ CORREÇÃO: Funções auxiliares type-safe
const safeString = (value: unknown, defaultValue: string = ''): string => {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }
  return String(value);
};

const safeNumber = (value: unknown, defaultValue: number = 0): number => {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }
  
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
};

const safeDate = (value: unknown, defaultValue: Date = new Date()): Date => {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }
  
  try {
    const date = new Date(value as string);
    return isNaN(date.getTime()) ? defaultValue : date;
  } catch {
    return defaultValue;
  }
};

const normalizeLocationField = (value: unknown): string => {
  return safeString(value).toLowerCase();
};

// ✅ CORREÇÃO: Funções específicas para query parameters
const getQueryString = (query: any, key: string, defaultValue: string = ''): string => {
  const value = query[key];
  return safeString(value, defaultValue);
};

const getQueryNumber = (query: any, key: string, defaultValue: number = 0): number => {
  const value = query[key];
  return safeNumber(value, defaultValue);
};

// ✅ CORREÇÃO: Interface para request autenticada
interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

// ✅✅✅ CORREÇÃO CRÍTICA: Helper para obter driverId com logs detalhados
const getDriverId = (req: AuthenticatedRequest): string | null => {
  console.log('🆔 [GET-DRIVER-ID] Verificando driverId...', {
    hasUser: !!req.user,
    userEmail: req.user?.email || 'NO_EMAIL',
    userId: req.user?.id || 'NO_ID',
    userUid: (req.user as any)?.uid || 'NO_UID',
    allUserKeys: req.user ? Object.keys(req.user) : 'NO_USER'
  });

  // ✅ CORREÇÃO ROBUSTA: Tentar todas as possíveis propriedades de ID
  const user = req.user;
  if (!user) {
    console.log('❌ [GET-DRIVER-ID] req.user está undefined/null');
    return null;
  }
  
  // Tentar id primeiro, depois uid, depois email como fallback
  const possibleIds = [
    user.id,
    (user as any).uid,
    (user as any).user_id,
    (user as any).sub
  ].filter(Boolean);
  
  if (possibleIds.length === 0) {
    console.log('❌ [GET-DRIVER-ID] Nenhum ID encontrado no user:', {
      userKeys: Object.keys(user),
      userEmail: user.email
    });
    return null;
  }
  
  const driverId = possibleIds[0];
  console.log('✅ [GET-DRIVER-ID] ID encontrado:', {
    driverId,
    allPossible: possibleIds,
    userKeys: Object.keys(user)
  });
  
  return driverId;
};

// ✅ CORREÇÃO: Função auxiliar para calcular receita de forma segura
const calculateRideRevenue = (ride: any): number => {
  const pricePerSeat = safeNumber(ride.pricePerSeat);
  const bookedSeats = safeNumber((ride as any).bookedSeats);
  const occupiedSeats = safeNumber((ride as any).occupiedSeats);
  const maxPassengers = safeNumber(ride.maxPassengers);
  
  // Usar bookedSeats primeiro, depois occupiedSeats, depois maxPassengers como fallback
  const actualOccupiedSeats = bookedSeats > 0 ? bookedSeats : 
                             occupiedSeats > 0 ? occupiedSeats : 
                             maxPassengers;
  
  return pricePerSeat * actualOccupiedSeats;
};

// ✅ CORREÇÃO: Função para verificar propriedade da ride
const verifyRideOwnership = async (rideId: string, driverId: string): Promise<{ride: any, isOwner: boolean}> => {
  const ride = await rideService.getRideById(rideId);
  if (!ride) {
    return { ride: null, isOwner: false };
  }
  
  // ✅ CORREÇÃO: Comparação segura de IDs
  const isOwner = safeString(ride.driverId) === driverId;
  return { ride, isOwner };
};

// ✅✅✅ CORREÇÃO: Middleware de debug para a rota POST
const debugRideCreation = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  console.log('🚗 [RIDES-DEBUG] === INICIANDO CRIAÇÃO DE RIDE ===');
  console.log('📨 Headers recebidos:', {
    authorization: req.headers.authorization ? 'PRESENT' : 'MISSING',
    contentType: req.headers['content-type'],
    userAgent: req.headers['user-agent']
  });
  
  if (req.headers.authorization) {
    const token = req.headers.authorization.replace('Bearer ', '');
    console.log('🔐 Token JWT:', {
      length: token.length,
      first20: token.substring(0, 20) + '...',
      last10: '...' + token.substring(token.length - 10),
      isJWT: token.split('.').length === 3
    });
  }
  
  console.log('📦 Body recebido:', {
    bodyKeys: Object.keys(req.body || {}),
    bodyPreview: req.body ? {
      fromCity: req.body.fromCity,
      toCity: req.body.toCity, 
      departureDate: req.body.departureDate,
      pricePerSeat: req.body.pricePerSeat,
      availableSeats: req.body.availableSeats
    } : 'NO_BODY'
  });
  
  next();
};

// ✅✅✅ CORREÇÃO: Nova rota para busca inteligente de rides do motorista
// GET /api/provider/rides/smart/search - Busca inteligente para motoristas
router.get('/smart/search', verifyFirebaseToken, requireDriverRole, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const driverId = getDriverId(req);
    
    if (!driverId) {
      return res.status(401).json({ 
        success: false,
        error: 'Usuário não autenticado' 
      });
    }

    // ✅✅✅ CORREÇÃO CRÍTICA: NORMALIZAR LOCALIZAÇÕES ANTES DA BUSCA
    const originalFrom = getQueryString(req.query, 'from');
    const originalTo = getQueryString(req.query, 'to');
    const date = getQueryString(req.query, 'date');
    const radiusKm = getQueryNumber(req.query, 'radiusKm', 100);
    const maxResults = getQueryNumber(req.query, 'maxResults', 20);

    // ✅ APLICAR NORMALIZAÇÃO DO POSTGRESQL
    const normalizedFrom = await normalizeLocation(originalFrom);
    const normalizedTo = await normalizeLocation(originalTo);

    logger.info('🧠 PROVIDER: Busca inteligente NORMALIZADA', {
      driverId,
      original: { from: originalFrom, to: originalTo },
      normalized: { from: normalizedFrom, to: normalizedTo },
      date,
      radiusKm,
      maxResults,
      normalizationApplied: originalFrom !== normalizedFrom || originalTo !== normalizedTo
    });

    let matchingRides: any[] = [];
    let searchMethod = 'smart_final';

    try {
      // ✅✅✅ CORREÇÃO CRÍTICA: Usar busca SMART FINAL com nomes NORMALIZADOS
      matchingRides = await rideService.searchRidesSmartFinal(normalizedFrom, normalizedTo, radiusKm);
      searchMethod = 'smart_final_normalized';
    } catch (smartError) {
      console.warn("❌ PROVIDER: Smart final falhou, usando universal como fallback:", smartError);
      matchingRides = await rideService.getRidesUniversal({
        fromLocation: normalizedFrom,
        toLocation: normalizedTo,
        radiusKm: radiusKm,
        maxResults: maxResults
      });
      searchMethod = 'universal_fallback';
    }

    // ✅ Filtrar por data se fornecida
    if (date) {
      const searchDate = new Date(date);
      matchingRides = matchingRides.filter(ride => {
        if (!ride.departureDate) return false;
        const rideDate = new Date(ride.departureDate);
        return rideDate.toDateString() === searchDate.toDateString();
      });
    }

    // ✅ Aplicar limite de resultados
    matchingRides = matchingRides.slice(0, maxResults);

    const matchStats = {
      smart_matches: matchingRides.filter(r => r.match_type === 'smart_final_direct' || r.match_type === 'smart_match').length,
      exact_match: matchingRides.filter(r => r.match_type === 'exact_match').length,
      same_segment: matchingRides.filter(r => r.match_type === 'same_segment').length,
      same_direction: matchingRides.filter(r => r.match_type === 'same_direction').length,
      potential: matchingRides.filter(r => r.match_type === 'potential').length,
      traditional: matchingRides.filter(r => !r.match_type || r.match_type === 'traditional').length,
      total: matchingRides.length
    };

    logger.info('✅ PROVIDER: Busca inteligente concluída', {
      driverId,
      total: matchingRides.length,
      method: searchMethod,
      stats: matchStats,
      normalization: {
        applied: originalFrom !== normalizedFrom || originalTo !== normalizedTo,
        original: { from: originalFrom, to: originalTo },
        normalized: { from: normalizedFrom, to: normalizedTo }
      }
    });

    res.json({
      success: true,
      data: {
        rides: matchingRides,
        stats: matchStats,
        searchParams: {
          from: originalFrom,
          to: originalTo,
          normalizedFrom,
          normalizedTo,
          date: date || 'qualquer',
          radiusKm,
          maxResults,
          searchMethod
        },
        normalization: {
          applied: originalFrom !== normalizedFrom || originalTo !== normalizedTo,
          original: { from: originalFrom, to: originalTo },
          normalized: { from: normalizedFrom, to: normalizedTo }
        },
        smart_search: true
      }
    });
  } catch (error) {
    logger.error('❌ PROVIDER: Erro em busca inteligente:', error);
    
    try {
      const { from, to, maxResults = '20' } = req.query;
      
      // ✅ CORREÇÃO: Aplicar normalização do PostgreSQL mesmo no fallback
      const normalizedFromFallback = await normalizeLocation(from as string);
      const normalizedToFallback = await normalizeLocation(to as string);
      
      const traditionalRides = await rideService.getRides({
        fromLocation: normalizedFromFallback,
        toLocation: normalizedToFallback,
        status: 'available'
      }).then(rides => rides.slice(0, safeNumber(maxResults, 20)));

      res.json({
        success: true,
        data: {
          rides: traditionalRides,
          stats: {
            exact_match: 0,
            same_segment: 0,
            same_direction: 0,
            potential: 0,
            traditional: traditionalRides.length,
            total: traditionalRides.length
          },
          searchParams: {
            from: from as string,
            to: to as string,
            normalizedFrom: normalizedFromFallback,
            normalizedTo: normalizedToFallback,
            maxResults: safeNumber(maxResults, 20)
          },
          normalization: {
            applied: (from as string) !== normalizedFromFallback || (to as string) !== normalizedToFallback,
            original: { from: from as string, to: to as string },
            normalized: { from: normalizedFromFallback, to: normalizedToFallback }
          },
          warning: "Sistema inteligente temporariamente indisponível, usando busca tradicional"
        }
      });
    } catch (fallbackError) {
      res.status(500).json({
        success: false,
        error: "Erro interno do servidor no sistema de busca"
      });
    }
  }
});

// ✅✅✅ CORREÇÃO: Nova rota para análise de mercado do motorista
// GET /api/provider/rides/market-analysis - Análise de mercado para motoristas
router.get('/market-analysis', verifyFirebaseToken, requireDriverRole, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const driverId = getDriverId(req);
    
    if (!driverId) {
      return res.status(401).json({ 
        success: false,
        error: 'Usuário não autenticado' 
      });
    }

    // ✅✅✅ CORREÇÃO: NORMALIZAR LOCALIZAÇÕES PARA ANÁLISE DE MERCADO
    const originalFrom = getQueryString(req.query, 'from');
    const originalTo = getQueryString(req.query, 'to');
    const radiusKm = getQueryNumber(req.query, 'radiusKm', 100);

    const normalizedFrom = await normalizeLocation(originalFrom);
    const normalizedTo = await normalizeLocation(originalTo);

    logger.info('📊 PROVIDER: Análise de mercado NORMALIZADA', {
      driverId,
      original: { from: originalFrom, to: originalTo },
      normalized: { from: normalizedFrom, to: normalizedTo },
      radiusKm,
      normalizationApplied: originalFrom !== normalizedFrom || originalTo !== normalizedTo
    });

    // ✅✅✅ CORREÇÃO: Usar busca SMART FINAL com nomes NORMALIZADOS
    let marketRides: any[] = [];
    
    try {
      marketRides = await rideService.searchRidesSmartFinal(normalizedFrom, normalizedTo, radiusKm);
    } catch (smartError) {
      console.warn("❌ PROVIDER: Smart final falhou na análise, usando universal:", smartError);
      marketRides = await rideService.getRidesUniversal({
        fromLocation: normalizedFrom,
        toLocation: normalizedTo,
        radiusKm: radiusKm,
        maxResults: 50
      });
    }

    // ✅ Análise de preços
    const prices = marketRides
      .filter(ride => safeNumber(ride.pricePerSeat) > 0)
      .map(ride => safeNumber(ride.pricePerSeat));
    
    const averagePrice = prices.length > 0 
      ? prices.reduce((sum, price) => sum + price, 0) / prices.length 
      : 0;
    
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

    // ✅ Análise de demanda
    const totalAvailableSeats = marketRides.reduce((sum, ride) => sum + safeNumber(ride.availableSeats), 0);
    const totalRides = marketRides.length;
    
    // ✅ Análise de veículos
    const vehicleTypes = marketRides.reduce((acc, ride) => {
      const type = safeString(ride.vehicleType, 'desconhecido');
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // ✅ Análise de datas
    const upcomingRides = marketRides.filter(ride => {
      const departureDate = safeDate(ride.departureDate);
      return departureDate >= new Date();
    }).length;

    const marketAnalysis = {
      route: { from: originalFrom, to: originalTo, normalizedFrom, normalizedTo },
      pricing: {
        average: Math.round(averagePrice),
        min: Math.round(minPrice),
        max: Math.round(maxPrice),
        recommendation: averagePrice > 0 
          ? `Preço sugerido: ${Math.round(averagePrice * 0.9)} - ${Math.round(averagePrice * 1.1)} MZN`
          : 'Dados insuficientes para recomendação'
      },
      demand: {
        totalRides,
        totalAvailableSeats,
        demandLevel: totalRides === 0 ? 'baixa' : 
                    totalRides < 5 ? 'média' : 'alta',
        recommendation: totalRides === 0 
          ? 'Ótima oportunidade - pouca concorrência'
          : `Mercado ${totalRides < 5 ? 'moderado' : 'competitivo'} - ${totalRides} rides ativas`
      },
      vehicles: {
        types: vehicleTypes,
        mostCommon: Object.keys(vehicleTypes).length > 0 
          ? Object.keys(vehicleTypes).reduce((a, b) => vehicleTypes[a] > vehicleTypes[b] ? a : b)
          : 'desconhecido'
      },
      timing: {
        upcomingRides,
        recommendation: upcomingRides === 0 
          ? 'Horários flexíveis - baixa competição'
          : `Considere horários alternativos - ${upcomingRides} rides futuras`
      }
    };

    logger.info('✅ PROVIDER: Análise de mercado concluída', {
      driverId,
      totalRides,
      averagePrice: marketAnalysis.pricing.average,
      normalization: {
        applied: originalFrom !== normalizedFrom || originalTo !== normalizedTo,
        original: { from: originalFrom, to: originalTo },
        normalized: { from: normalizedFrom, to: normalizedTo }
      }
    });

    res.json({
      success: true,
      data: {
        analysis: marketAnalysis,
        sampleRides: marketRides.slice(0, 5),
        searchParams: {
          from: originalFrom,
          to: originalTo,
          normalizedFrom,
          normalizedTo,
          radiusKm,
          totalRidesAnalyzed: marketRides.length
        },
        normalization: {
          applied: originalFrom !== normalizedFrom || originalTo !== normalizedTo,
          original: { from: originalFrom, to: originalTo },
          normalized: { from: normalizedFrom, to: normalizedTo }
        },
        smart_analysis: true
      }
    });
  } catch (error) {
    logger.error('❌ PROVIDER: Erro na análise de mercado:', error);
    res.status(500).json({
      success: false,
      error: "Erro interno do servidor na análise de mercado"
    });
  }
});

// Rotas específicas primeiro
router.get('/driver/stats', verifyFirebaseToken, requireDriverRole, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const driverId = getDriverId(req);
    
    if (!driverId) {
      return res.status(401).json({ 
        success: false,
        error: 'Usuário não autenticado' 
      });
    }

    logger.info('📊 Buscando estatísticas do motorista', { driverId });

    const driverRides = await rideService.getRidesByDriver(driverId);

    const totalRides = driverRides.length;
    const availableRides = driverRides.filter(ride => safeString(ride.status) === 'available').length;
    const completedRides = driverRides.filter(ride => safeString(ride.status) === 'completed').length;
    const cancelledRides = driverRides.filter(ride => safeString(ride.status) === 'cancelled').length;

    const totalRevenue = driverRides
      .filter(ride => safeString(ride.status) === 'completed')
      .reduce((sum, ride) => sum + calculateRideRevenue(ride), 0);

    const ratings = driverRides
      .filter(ride => safeNumber(ride.rating) > 0)
      .map(ride => safeNumber(ride.rating));
    
    const averageRating = ratings.length > 0 
      ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length 
      : 4.8;

    logger.info('✅ Estatísticas calculadas com sucesso', {
      driverId,
      totalRides,
      completedRides,
      totalRevenue
    });

    res.json({
      success: true,
      data: {
        stats: {
          totalRides,
          availableRides,
          completedRides,
          cancelledRides,
          totalRevenue,
          averageRating: Math.round(averageRating * 10) / 10
        }
      }
    });
  } catch (error) {
    logger.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor' 
    });
  }
});

router.get('/dashboard/summary', verifyFirebaseToken, requireDriverRole, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const driverId = getDriverId(req);
    
    if (!driverId) {
      return res.status(401).json({ 
        success: false,
        error: 'Usuário não autenticado' 
      });
    }

    logger.info('📈 Buscando resumo do dashboard', { driverId });

    const driverRides = await rideService.getRidesByDriver(driverId);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const activeToday = driverRides.filter(ride => {
      const departureDate = safeDate(ride.departureDate);
      if (!departureDate) return false;
      
      const rideDate = new Date(departureDate);
      rideDate.setHours(0, 0, 0, 0);
      
      const rideStatus = safeString(ride.status);
      return rideDate.getTime() === today.getTime() && 
             (rideStatus === 'available' || rideStatus === 'active');
    }).length;

    const upcomingRides = driverRides
      .filter(ride => {
        const departureDate = safeDate(ride.departureDate);
        if (!departureDate) return false;
        
        const rideStatus = safeString(ride.status);
        return departureDate >= new Date() && rideStatus === 'available';
      })
      .slice(0, 5);

    const totalEarnings = driverRides
      .filter(ride => safeString(ride.status) === 'completed')
      .reduce((sum, ride) => sum + calculateRideRevenue(ride), 0);

    logger.info('✅ Resumo do dashboard gerado com sucesso', {
      driverId,
      activeToday,
      upcomingRides: upcomingRides.length,
      totalEarnings
    });

    res.json({
      success: true,
      data: {
        summary: {
          activeToday,
          totalRides: driverRides.length,
          upcomingRides: upcomingRides.length,
          totalEarnings
        },
        upcomingRides
      }
    });
  } catch (error) {
    logger.error('Erro ao buscar resumo do dashboard:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor' 
    });
  }
});

// GET /api/provider/rides - Listar viagens do motorista
router.get('/', verifyFirebaseToken, requireDriverRole, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const driverId = getDriverId(req);
    
    if (!driverId) {
      return res.status(401).json({ 
        success: false,
        error: 'Usuário não autenticado' 
      });
    }
    
    const status = getQueryString(req.query, 'status');
    const page = getQueryNumber(req.query, 'page', 1);
    const limit = getQueryNumber(req.query, 'limit', 10);
    
    logger.info('📋 Listando viagens do motorista', {
      driverId,
      status,
      page,
      limit
    });

    const driverRides = await rideService.getRidesByDriver(driverId, status);
    
    const pageNum = Math.max(page, 1);
    const limitNum = Math.min(Math.max(limit, 1), 100);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedRides = driverRides.slice(startIndex, endIndex);
    
    logger.info('✅ Listagem de viagens concluída', {
      driverId,
      total: driverRides.length,
      returned: paginatedRides.length
    });

    res.json({
      success: true,
      data: {
        rides: paginatedRides,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: driverRides.length,
          totalPages: Math.ceil(driverRides.length / limitNum)
        }
      }
    });
  } catch (error) {
    logger.error('Erro ao buscar viagens:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor' 
    });
  }
});

// ✅✅✅ CORREÇÃO CRÍTICA: Rota POST com debug completo
router.post('/', 
  debugRideCreation,
  verifyFirebaseToken,
  ensureUserId,
  requireDriverRole, 
  async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('🚗 [RIDES-POST] === INICIANDO CRIAÇÃO DE RIDE ===');
    
    const driverId = getDriverId(req);
    const body = req.body;
    
    console.log('📋 Dados recebidos para criação:', {
      driverId,
      bodyKeys: Object.keys(body),
      bodyPreview: {
        fromCity: body.fromCity,
        toCity: body.toCity,
        departureDate: body.departureDate,
        pricePerSeat: body.pricePerSeat
      },
      user: req.user ? {
        id: req.user.id,
        uid: (req.user as any).uid,
        email: req.user.email,
        roles: req.user.roles
      } : 'NO_USER'
    });
    
    if (!driverId) {
      console.log('❌ [RIDES-POST] driverId não encontrado. User object:', req.user);
      return res.status(401).json({ 
        success: false,
        error: 'Usuário não autenticado' 
      });
    }

    logger.info('📝 Iniciando criação de ride', { driverId });

    const { 
      fromAddress, 
      toAddress, 
      fromProvince,
      toProvince,
      fromCity,
      toCity,
      fromLocality,
      toLocality,
      departureDate, 
      departureTime,
      availableSeats, 
      maxPassengers, 
      pricePerSeat, 
      vehicleType, 
      additionalInfo 
    } = body;
    
    const rideInput = {
      driverId,
      fromAddress: safeString(fromAddress),
      toAddress: safeString(toAddress),
      fromProvince: normalizeLocationField(fromProvince),
      toProvince: normalizeLocationField(toProvince),
      fromCity: normalizeLocationField(fromCity),
      toCity: normalizeLocationField(toCity),
      fromLocality: normalizeLocationField(fromLocality),
      toLocality: normalizeLocationField(toLocality),
      departureDate: safeDate(departureDate),
      departureTime: safeString(departureTime, '08:00'),
      availableSeats: safeNumber(availableSeats, 1),
      maxPassengers: safeNumber(maxPassengers, 4),
      pricePerSeat: safeNumber(pricePerSeat, 0),
      vehicleType: safeString(vehicleType, 'car'),
      additionalInfo: safeString(additionalInfo),
      status: 'available' as const
    };

    console.log('📝 Dados normalizados para ride:', rideInput);

    const validatedData = insertRideSchema.parse({
      ...rideInput,
      pricePerSeat: rideInput.pricePerSeat.toString()
    });

    console.log('✅ Dados validados com Zod, criando ride no banco...');

    const newRide = await rideService.createRide(validatedData as any);
    
    console.log('🎉 Ride criada com sucesso no banco:', { 
      rideId: newRide.id,
      driverId 
    });

    res.status(201).json({
      success: true,
      message: 'Viagem criada com sucesso',
      data: { ride: newRide }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.log('❌ Erro de validação Zod:', error.errors);
      logger.warn('❌ Validação Zod falhou', { errors: error.errors });
      return res.status(400).json({
        success: false,
        error: 'Dados inválidos',
        details: error.errors
      });
    }

    console.log('❌ Erro inesperado ao criar ride:', error);
    logger.error('Erro ao criar viagem:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor' 
    });
  }
});

// PUT /api/provider/rides/:id - Atualizar viagem
router.put('/:id', verifyFirebaseToken, requireDriverRole, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const driverId = getDriverId(req);
    const body = req.body;
    
    if (!driverId) {
      return res.status(401).json({ 
        success: false,
        error: 'Usuário não autenticado' 
      });
    }
    
    const rideId = safeString(id);
    if (!rideId) {
      return res.status(400).json({
        success: false,
        error: 'ID da viagem é obrigatório'
      });
    }
    
    logger.info('✏️ Iniciando atualização de ride', { driverId, rideId });

    const { ride: existingRide, isOwner } = await verifyRideOwnership(rideId, driverId);

    if (!existingRide) {
      return res.status(404).json({
        success: false,
        error: 'Viagem não encontrada'
      });
    }
    
    if (!isOwner) {
      logger.warn('🚫 Tentativa de editar ride não pertencente ao motorista', {
        driverId,
        rideOwner: existingRide.driverId,
        rideId
      });
      return res.status(403).json({
        success: false,
        error: 'Sem permissão para editar esta viagem'
      });
    }

    const updateData: any = {
      ...body,
      ...(body.maxPassengers !== undefined && { 
        maxPassengers: safeNumber(body.maxPassengers, safeNumber(existingRide.maxPassengers))
      }),
      ...(body.availableSeats !== undefined && { 
        availableSeats: safeNumber(body.availableSeats, safeNumber(existingRide.availableSeats))
      }),
      ...(body.pricePerSeat !== undefined && { 
        pricePerSeat: safeNumber(body.pricePerSeat, safeNumber(existingRide.pricePerSeat))
      }),
      ...(body.departureDate !== undefined && { 
        departureDate: safeDate(body.departureDate)
      }),
      ...(body.fromProvince !== undefined && { 
        fromProvince: normalizeLocationField(body.fromProvince)
      }),
      ...(body.toProvince !== undefined && { 
        toProvince: normalizeLocationField(body.toProvince)
      }),
      ...(body.fromCity !== undefined && { 
        fromCity: normalizeLocationField(body.fromCity)
      }),
      ...(body.toCity !== undefined && { 
        toCity: normalizeLocationField(body.toCity)
      }),
      ...(body.fromLocality !== undefined && { 
        fromLocality: normalizeLocationField(body.fromLocality)
      }),
      ...(body.toLocality !== undefined && { 
        toLocality: normalizeLocationField(body.toLocality)
      }),
    };

    const validatedUpdateData = updateRideSchema.partial().parse({
      ...updateData,
      ...(updateData.pricePerSeat !== undefined && { 
        pricePerSeat: updateData.pricePerSeat.toString() 
      })
    });

    const updatedRide = await rideService.updateRide(rideId, validatedUpdateData as any);

    if (!updatedRide) {
      return res.status(500).json({
        success: false,
        error: 'Erro ao atualizar viagem'
      });
    }
    
    logger.info(`✅ Viagem atualizada com sucesso`, { driverId, rideId });

    res.json({
      success: true,
      message: 'Viagem atualizada com sucesso',
      data: { ride: updatedRide }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('❌ Validação Zod falhou na atualização', { errors: error.errors });
      return res.status(400).json({
        success: false,
        error: 'Dados inválidos',
        details: error.errors
      });
    }

    logger.error('Erro ao atualizar viagem:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor' 
    });
  }
});

// DELETE /api/provider/rides/:id - Cancelar viagem
router.delete('/:id', verifyFirebaseToken, requireDriverRole, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const driverId = getDriverId(req);
    
    if (!driverId) {
      return res.status(401).json({ 
        success: false,
        error: 'Usuário não autenticado' 
      });
    }
    
    const rideId = safeString(id);
    if (!rideId) {
      return res.status(400).json({
        success: false,
        error: 'ID da viagem é obrigatório'
      });
    }
    
    logger.info('🗑️ Iniciando cancelamento de ride', { driverId, rideId });

    const { ride: existingRide, isOwner } = await verifyRideOwnership(rideId, driverId);

    if (!existingRide) {
      return res.status(404).json({
        success: false,
        error: 'Viagem não encontrada'
      });
    }
    
    if (!isOwner) {
      logger.warn('🚫 Tentativa de cancelar ride não pertencente ao motorista', {
        driverId,
        rideOwner: existingRide.driverId,
        rideId
      });
      return res.status(403).json({
        success: false,
        error: 'Sem permissão para cancelar esta viagem'
      });
    }
    
    const rideStatus = safeString(existingRide.status);
    const cancellableStatuses = ['available', 'active', 'pending', 'confirmed'];
    
    if (!cancellableStatuses.includes(rideStatus)) {
      return res.status(400).json({
        success: false,
        error: `Não é possível cancelar viagens com status "${rideStatus}". Status canceláveis: ${cancellableStatuses.join(', ')}`
      });
    }
    
    const cancelled = await rideService.updateRide(rideId, { 
      status: 'cancelled',
      cancelledAt: new Date().toISOString()
    } as any);
    
    if (!cancelled) {
      return res.status(500).json({
        success: false,
        error: 'Erro ao cancelar viagem'
      });
    }
    
    logger.info(`✅ Viagem cancelada com sucesso`, { driverId, rideId });

    res.json({
      success: true,
      message: 'Viagem cancelada com sucesso',
      data: {
        rideId,
        cancelledAt: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Erro ao cancelar viagem:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor' 
    });
  }
});

// GET /api/provider/rides/:id - Obter detalhes de uma viagem específica
router.get('/:id', verifyFirebaseToken, requireDriverRole, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const driverId = getDriverId(req);
    
    if (!driverId) {
      return res.status(401).json({ 
        success: false,
        error: 'Usuário não autenticado' 
      });
    }
    
    const rideId = safeString(id);
    if (!rideId) {
      return res.status(400).json({
        success: false,
        error: 'ID da viagem é obrigatório'
      });
    }
    
    logger.info('🔍 Buscando detalhes da ride', { driverId, rideId });

    const { ride, isOwner } = await verifyRideOwnership(rideId, driverId);
    
    if (!ride) {
      return res.status(404).json({
        success: false,
        error: 'Viagem não encontrada'
      });
    }
    
    if (!isOwner) {
      logger.warn('🚫 Tentativa de acessar ride não pertencente ao motorista', {
        driverId,
        rideOwner: ride.driverId,
        rideId
      });
      return res.status(403).json({
        success: false,
        error: 'Sem permissão para visualizar esta viagem'
      });
    }
    
    logger.info('✅ Detalhes da ride retornados com sucesso', { driverId, rideId });

    res.json({
      success: true,
      data: { ride }
    });
  } catch (error) {
    logger.error('Erro ao buscar detalhes da viagem:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor' 
    });
  }
});

export default router;