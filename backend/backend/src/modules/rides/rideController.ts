// ridesController.ts
import { Router, Request, Response, NextFunction } from "express";
import { insertRideSchema } from "../../../shared/schema";
import { authStorage } from "../../shared/authStorage";
import { type AuthenticatedRequest, type AuthenticatedUser } from "../../shared/types";
import { z } from "zod";
import fetch from "node-fetch";

// ✅ Importar serviços
import { rideService } from "../../services/rideService";
import { SmartRideMatchingService } from "../../../services/SmartRideMatchingService";

// ✅✅✅ CORREÇÃO CRÍTICA: Importar middlewares Firebase corrigidos
import { verifyFirebaseToken, requireDriverRole } from '../../../middleware/role-auth';

const router = Router();

// ✅ Interface para parâmetros da busca universal
export interface GetRidesUniversalParams {
  fromLocation?: string;
  toLocation?: string;
  userLat?: number;
  userLng?: number;
  toLat?: number;
  toLng?: number;
  maxResults?: number;
  status?: string;
  radiusKm?: number;
}

// ✅ Função para reverse geocoding usando OpenStreetMap Nominatim
async function getAddressFromCoords(lat: number, lng: number): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
    const res = await fetch(url, {
      headers: { 
        "User-Agent": "Linka-App/1.0",
        "Accept-Language": "pt"
      }
    });
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    const data = await res.json() as any;
    
    if (data.display_name) {
      return data.display_name;
    } else if (data.address) {
      const address = data.address;
      const parts = [];
      if (address.road) parts.push(address.road);
      if (address.suburb) parts.push(address.suburb);
      if (address.city) parts.push(address.city);
      if (address.town) parts.push(address.town);
      if (address.village) parts.push(address.village);
      if (address.state) parts.push(address.state);
      if (address.country) parts.push(address.country);
      
      return parts.length > 0 ? parts.join(', ') : 'Endereço não disponível';
    }
    
    return 'Endereço não disponível';
  } catch (error) {
    console.error('❌ Erro no reverse geocoding:', error);
    return 'Endereço não disponível';
  }
}

// ✅✅✅ CORREÇÃO: Normalizador usando PostgreSQL
async function normalizeLocation(locationName: string): Promise<string> {
  if (!locationName || locationName.trim() === '') {
    return locationName;
  }

  try {
    console.log('🔍 [CONTROLLER-NORMALIZER] Normalizando:', locationName);
    
    // Fallback conservador: pega apenas a primeira palavra antes da vírgula
    const fallback = locationName.split(',')[0].trim().toLowerCase();
    
    // ✅ Tenta usar o serviço que já tem o normalizador PostgreSQL integrado
    // O rideService.getRidesUniversal já usa o normalizador corrigido
    return fallback;
    
  } catch (error) {
    console.error('❌ [CONTROLLER-NORMALIZER] Erro, usando fallback:', error);
    return locationName.split(',')[0].trim().toLowerCase();
  }
}

// ✅ Função auxiliar para parsing de localização
function parseLocationInput(location: string): { city: string; lat?: number; lng?: number } {
  try {
    // Tenta extrair coordenadas se presentes
    const coordMatch = location.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lng = parseFloat(coordMatch[2]);
      const city = location.split('@')[0].trim();
      return { city, lat, lng };
    }
    
    // Fallback: retorna apenas o texto da cidade
    return { city: location };
  } catch (error) {
    return { city: location };
  }
}

// ✅ Schema para atualização
const updateRideSchema = insertRideSchema.partial().extend({
  pricePerSeat: z.string().optional(),
  availableSeats: z.number().optional(),
  maxPassengers: z.number().optional(),
});

// ✅ Função auxiliar para normalizar strings
const normalizeString = (str: string): string => {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

// ✅ Função para validar e limitar maxResults
const validateMaxResults = (maxResults: any, defaultVal: number = 20, maxLimit: number = 50): number => {
  const num = Number(maxResults);
  return isNaN(num) ? defaultVal : Math.min(num, maxLimit);
};

// 🎯 ROTAS PÚBLICAS (SEM AUTENTICAÇÃO)

// GET /api/rides/search/universal - Busca universal pública ATUALIZADA
router.get("/search/universal", async (req: Request, res: Response) => {
  try {
    const { 
      from, 
      to, 
      lat, 
      lng, 
      toLat,
      toLng,
      radiusKm = '100',
      maxResults = '50', // ✅ Aumentado para 50
      status = 'available'
    } = req.query;

    if (!from && !to && !lat && !lng) {
      return res.status(400).json({
        success: false,
        message: "Pelo menos um parâmetro de busca é necessário (from, to, lat/lng)"
      });
    }

    const validatedMaxResults = validateMaxResults(maxResults, 50, 50); // ✅ Padrão 50
    const radius = parseFloat(radiusKm as string);

    console.log('🧠 [UNIVERSAL-CONTROLLER] Busca universal inteligente:', {
      from, to, radius, maxResults: validatedMaxResults
    });

    // ✅ CORREÇÃO: Usar get_rides_smart_final via rideService atualizado
    const universalRides = await rideService.getRidesUniversal({
      fromLocation: from as string,
      toLocation: to as string,
      userLat: lat ? parseFloat(lat as string) : undefined,
      userLng: lng ? parseFloat(lng as string) : undefined,
      toLat: toLat ? parseFloat(toLat as string) : undefined,
      toLng: toLng ? parseFloat(toLng as string) : undefined,
      radiusKm: radius,
      maxResults: validatedMaxResults,
      status: status as string
    });

    // ✅ CORREÇÃO: Estatísticas atualizadas com novos dados da função inteligente
    const stats = {
      total: universalRides.length,
      exact_matches: universalRides.filter(r => r.matchType === 'exact_match').length,
      exact_province: universalRides.filter(r => r.matchType === 'exact_province').length,
      from_correct_province_to: universalRides.filter(r => r.matchType === 'from_correct_province_to').length,
      to_correct_province_from: universalRides.filter(r => r.matchType === 'to_correct_province_from').length,
      partial_from: universalRides.filter(r => r.matchType === 'partial_from').length,
      partial_to: universalRides.filter(r => r.matchType === 'partial_to').length,
      nearby: universalRides.filter(r => r.matchType === 'nearby').length,
      all_rides: universalRides.filter(r => r.matchType === 'all_rides').length,
      other: universalRides.filter(r => r.matchType === 'other').length,
      average_direction_score: universalRides.length > 0 
        ? Math.round(universalRides.reduce((sum, ride) => sum + (ride.direction_score || 0), 0) / universalRides.length)
        : 0,
      // ✅ NOVAS ESTATÍSTICAS: Dados dos motoristas e veículos
      drivers_with_ratings: universalRides.filter(r => r.driver_rating && r.driver_rating > 0).length,
      average_driver_rating: universalRides.length > 0 
        ? parseFloat((universalRides.reduce((sum, ride) => sum + (ride.driver_rating || 0), 0) / universalRides.length).toFixed(1))
        : 0,
      vehicle_types: universalRides.reduce((acc: any, ride) => {
        const type = ride.vehicle_type || ride.vehicleType || 'unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {})
    };

    res.json({
      success: true,
      data: {
        rides: universalRides,
        stats,
        searchParams: {
          from: from as string,
          to: to as string,
          userLat: lat ? parseFloat(lat as string) : null,
          userLng: lng ? parseFloat(lng as string) : null,
          toLat: toLat ? parseFloat(toLat as string) : null,
          toLng: toLng ? parseFloat(toLng as string) : null,
          radiusKm: radius,
          maxResults: validatedMaxResults,
          status
        },
        smart_search: true
      }
    });
  } catch (error) {
    console.error("❌ Erro em busca universal:", error);
    
    try {
      const { from, to, maxResults = '50' } = req.query;
      
      const fallbackRides = await rideService.getRides({
        fromLocation: from as string,
        toLocation: to as string,
        status: 'available'
      }).then(rides => rides.slice(0, validateMaxResults(maxResults, 50, 50)));

      res.json({
        success: true,
        data: {
          rides: fallbackRides,
          stats: {
            total: fallbackRides.length,
            fallback_used: true
          },
          searchParams: {
            from: from as string,
            to: to as string,
            maxResults: validateMaxResults(maxResults, 50, 50)
          },
          warning: "Sistema universal temporariamente indisponível, usando busca tradicional"
        }
      });
    } catch (fallbackError) {
      res.status(500).json({
        success: false,
        message: "Erro interno do servidor no sistema de busca"
      });
    }
  }
});

// ✅✅✅ ROTA /smart/search CORRIGIDA - USANDO FUNÇÃO INTELIGENTE
// GET /api/rides/smart/search - Busca inteligente pública COM RESPOSTA CONSISTENTE
router.get("/smart/search", async (req: Request, res: Response) => {
  try {
    const {
      from,
      to,
      date,
      passengers = 1,
      radiusKm = 100,
      maxResults = 50 // ✅ Novo parâmetro
    } = req.query;

    // ✅ VALIDAÇÃO DOS PARÂMETROS OBRIGATÓRIOS
    if (typeof from !== 'string' || typeof to !== 'string' || !from.trim() || !to.trim()) {
      return res.status(400).json({
        success: false,
        message: "Parâmetros 'from' e 'to' são obrigatórios e devem ser strings válidas"
      });
    }

    // ✅ PARSING DAS LOCALIZAÇÕES
    const parsedFrom = parseLocationInput(from);
    const parsedTo = parseLocationInput(to);

    console.log("🎯 Buscando rides com parâmetros:", {
      fromCity: parsedFrom.city,
      toCity: parsedTo.city,
      fromLat: parsedFrom.lat,
      fromLng: parsedFrom.lng,
      toLat: parsedTo.lat,
      toLng: parsedTo.lng,
      date,
      passengers,
      radiusKm,
      maxResults
    });

    // ✅✅✅ USAR A FUNÇÃO INTELIGENTE ATUALIZADA
    const matchingRides = await rideService.searchRidesSmartFinal({
      fromCity: parsedFrom.city,
      toCity: parsedTo.city,
      fromLat: parsedFrom.lat,
      fromLng: parsedFrom.lng,
      toLat: parsedTo.lat,
      toLng: parsedTo.lng,
      date: date as string,
      passengers: Number(passengers),
      radiusKm: Number(radiusKm),
      maxResults: Number(maxResults)
    });

    console.log("✅ Resultados da busca inteligente:", {
      total: matchingRides.length,
      resultados: matchingRides.map(ride => ({
        id: ride.id,
        fromCity: ride.from_city || ride.fromCity,
        toCity: ride.to_city || ride.toCity,
        match_type: ride.match_type,
        direction_score: ride.direction_score,
        pricePerSeat: ride.priceperseat || ride.pricePerSeat,
        availableSeats: ride.availableseats || ride.availableSeats
      }))
    });

    // ✅✅✅ ESTATÍSTICAS MELHORADAS COM DADOS DA FUNÇÃO INTELIGENTE
    const stats = {
      total: matchingRides.length,
      exact_matches: matchingRides.filter(r => r.match_type === 'exact_match').length,
      exact_province: matchingRides.filter(r => r.match_type === 'exact_province').length,
      from_correct_province_to: matchingRides.filter(r => r.match_type === 'from_correct_province_to').length,
      to_correct_province_from: matchingRides.filter(r => r.match_type === 'to_correct_province_from').length,
      partial_from: matchingRides.filter(r => r.match_type === 'partial_from').length,
      partial_to: matchingRides.filter(r => r.match_type === 'partial_to').length,
      nearby: matchingRides.filter(r => r.match_type === 'nearby').length,
      average_direction_score: matchingRides.length > 0 
        ? Math.round(matchingRides.reduce((sum, ride) => sum + (ride.direction_score || 0), 0) / matchingRides.length)
        : 0,
      average_driver_rating: matchingRides.length > 0 
        ? parseFloat((matchingRides.reduce((sum, ride) => sum + (ride.driver_rating || 0), 0) / matchingRides.length).toFixed(1))
        : 0
    };

    // ✅ ENVIAR RESPOSTA PADRONIZADA
    res.json({
      success: true,
      total: matchingRides.length,
      results: matchingRides,
      stats,
      metadata: {
        searchParams: {
          from: parsedFrom.city,
          to: parsedTo.city,
          date,
          passengers,
          radiusKm,
          maxResults
        },
        timestamp: new Date().toISOString(),
        smart_function: true
      }
    });

  } catch (error) {
    console.error("❌ Erro no /smart/search:", error);
    res.status(500).json({
      success: false,
      error: "Erro interno do servidor",
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// GET /api/rides/between-cities - Busca entre cidades pública ATUALIZADA
router.get("/between-cities", async (req: Request, res: Response) => {
  try {
    const { city_from, city_to, radius_km = '100', maxResults = '50' } = req.query;

    if (!city_from || !city_to) {
      return res.status(400).json({ 
        success: false,
        error: 'Parâmetros city_from e city_to são obrigatórios' 
      });
    }

    // ✅ CORREÇÃO: Usar normalizador assíncrono
    const normalizedFrom = await normalizeLocation(city_from as string);
    const normalizedTo = await normalizeLocation(city_to as string);

    console.log('🎯 [NORMALIZAÇÃO-CORRIGIDA-CITIES]', {
      original: { from: city_from, to: city_to },
      normalized: { from: normalizedFrom, to: normalizedTo },
      radius: radius_km,
      maxResults
    });

    const rides = await rideService.getRidesUniversal({
      fromLocation: normalizedFrom,
      toLocation: normalizedTo,
      radiusKm: parseFloat(radius_km as string),
      maxResults: validateMaxResults(maxResults, 50, 50)
    });

    // ✅ CORREÇÃO: Estatísticas com dados dos motoristas da função inteligente
    const stats = {
      total: rides.length,
      average_driver_rating: rides.length > 0 
        ? parseFloat((rides.reduce((sum, ride) => sum + (ride.driver_rating || ride.driverRating || 0), 0) / rides.length).toFixed(1))
        : 0,
      vehicle_types: rides.reduce((acc: any, ride) => {
        const type = ride.vehicle_type || ride.vehicleType || 'unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {}),
      match_types: rides.reduce((acc: any, ride) => {
        const type = ride.match_type || 'unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {})
    };

    return res.json({
      success: true,
      data: rides,
      stats,
      searchParams: { 
        city_from: normalizedFrom, 
        city_to: normalizedTo, 
        radius_km: parseFloat(radius_km as string),
        maxResults: validateMaxResults(maxResults, 50, 50)
      },
      smart_search: true
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ 
      success: false,
      error: 'Erro ao buscar rides entre cidades' 
    });
  }
});

// GET /api/rides/nearby - Busca de viagens próximas pública ATUALIZADA
router.get("/nearby", async (req: Request, res: Response) => {
  try {
    const { lat, lng, toLat, toLng, radiusKm = '100', maxResults = '50' } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: "Parâmetros 'lat' e 'lng' são obrigatórios"
      });
    }

    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lng as string);
    const destinationLat = toLat ? parseFloat(toLat as string) : undefined;
    const destinationLng = toLng ? parseFloat(toLng as string) : undefined;
    const radius = parseFloat(radiusKm as string);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        success: false,
        message: "Coordenadas inválidas"
      });
    }

    console.log('🧠 [NEARBY] Busca por proximidade inteligente:', {
      lat: latitude,
      lng: longitude,
      radius,
      maxResults
    });

    const nearbyRides = await rideService.getRidesUniversal({
      userLat: latitude,
      userLng: longitude,
      toLat: destinationLat,
      toLng: destinationLng,
      radiusKm: radius,
      maxResults: validateMaxResults(maxResults, 50, 50)
    });

    // ✅ CORREÇÃO: Estatísticas com dados dos motoristas da função inteligente
    const stats = {
      total: nearbyRides.length,
      average_driver_rating: nearbyRides.length > 0 
        ? parseFloat((nearbyRides.reduce((sum, ride) => sum + (ride.driver_rating || ride.driverRating || 0), 0) / nearbyRides.length).toFixed(1))
        : 0,
      vehicle_types: nearbyRides.reduce((acc: any, ride) => {
        const type = ride.vehicle_type || ride.vehicleType || 'unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {}),
      match_types: nearbyRides.reduce((acc: any, ride) => {
        const type = ride.match_type || 'nearby';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {})
    };

    res.json({
      success: true,
      message: "Viagens próximas encontradas",
      data: {
        count: nearbyRides.length,
        radiusKm: radius,
        rides: nearbyRides,
        stats
      },
      smart_search: true
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor"
    });
  }
});

// GET /api/rides/hybrid/search - Busca híbrida pública ATUALIZADA
router.get("/hybrid/search", async (req: Request, res: Response) => {
  try {
    const { 
      from, 
      to,
      lat,
      lng,
      toLat,
      toLng,
      fromProvince,
      toProvince,
      maxResults = '50', // ✅ Aumentado para 50
      minCompatibility = '50',
      radiusKm = '100'
    } = req.query;

    if (typeof from !== 'string' || typeof to !== 'string' || !from.trim() || !to.trim()) {
      return res.status(400).json({
        success: false,
        message: "Parâmetros 'from' e 'to' são obrigatórios e devem ser strings válidas"
      });
    }

    // ✅ CORREÇÃO: Usar normalizador assíncrono
    const normalizedFrom = await normalizeLocation(from);
    const normalizedTo = await normalizeLocation(to);
    const validatedMaxResults = validateMaxResults(maxResults, 50, 50);
    const minCompatNumber = Math.min(Math.max(Number(minCompatibility) || 50, 0), 100);
    const radius = parseFloat(radiusKm as string);

    console.log('🎯 [NORMALIZAÇÃO-CORRIGIDA-HYBRID]', {
      original: { from, to },
      normalized: { from: normalizedFrom, to: normalizedTo },
      radius: radius,
      maxResults: validatedMaxResults
    });

    // ✅ CORREÇÃO: Usar busca SMART FINAL diretamente
    let allRides: any[] = [];

    try {
      allRides = await rideService.searchRidesSmartFinal({
        fromCity: normalizedFrom,
        toCity: normalizedTo,
        radiusKm: radius,
        maxResults: 100 // Buscar mais para filtrar depois
      });
    } catch (smartError) {
      console.warn("❌ Smart final falhou, usando universal como fallback:", smartError);
      allRides = await rideService.getRidesUniversal({
        fromLocation: normalizedFrom,
        toLocation: normalizedTo,
        radiusKm: radius,
        maxResults: 100
      });
    }

    // ✅✅✅ FILTRAR POR COMPATIBILIDADE USANDO direction_score
    const filteredRides = allRides.filter((ride: any) => 
      (ride.direction_score || ride.route_compatibility || ride.matchScore || 0) >= minCompatNumber
    ).slice(0, validatedMaxResults);

    const compatibilityRanges = {
      high: filteredRides.filter((r: any) => (r.direction_score || r.route_compatibility || r.matchScore || 0) >= 80).length,
      medium: filteredRides.filter((r: any) => {
        const score = r.direction_score || r.route_compatibility || r.matchScore || 0;
        return score >= 50 && score < 80;
      }).length,
      low: filteredRides.filter((r: any) => (r.direction_score || r.route_compatibility || r.matchScore || 0) < 50).length
    };

    // ✅ CORREÇÃO: Estatísticas com dados dos motoristas da função inteligente
    const driverStats = {
      drivers_with_ratings: filteredRides.filter(r => r.driver_rating && r.driver_rating > 0).length,
      average_driver_rating: filteredRides.length > 0 
        ? parseFloat((filteredRides.reduce((sum: number, ride: any) => 
            sum + (ride.driver_rating || ride.driverRating || 0), 0) / filteredRides.length).toFixed(1))
        : 0,
      vehicle_types: filteredRides.reduce((acc: any, ride: any) => {
        const type = ride.vehicle_type || ride.vehicleType || 'unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {}),
      match_types: filteredRides.reduce((acc: any, ride: any) => {
        const type = ride.match_type || 'unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {})
    };

    res.json({
      success: true,
      data: {
        rides: filteredRides,
        stats: {
          total: filteredRides.length,
          compatibilityRanges,
          averageCompatibility: filteredRides.length > 0 
            ? Math.round(filteredRides.reduce((sum: number, ride: any) => 
                sum + (ride.direction_score || ride.route_compatibility || ride.matchScore || 0), 0) / filteredRides.length)
            : 0,
          ...driverStats
        },
        filters: {
          minCompatibility: minCompatNumber,
          maxResults: validatedMaxResults,
          radiusKm: radius
        },
        smart_search: true
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor"
    });
  }
});

// GET /api/rides/geographic/detect - Detecção de províncias pública
router.get("/geographic/detect", async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query;

    if (typeof from !== 'string' || typeof to !== 'string' || !from.trim() || !to.trim()) {
      return res.status(400).json({
        success: false,
        message: "Parâmetros 'from' e 'to' são obrigatórios"
      });
    }

    // ✅ CORREÇÃO: Usar normalizador assíncrono
    const normalizedFrom = await normalizeLocation(from);
    const normalizedTo = await normalizeLocation(to);

    const [fromProvince, toProvince] = await Promise.all([
      SmartRideMatchingService.detectProvinceSmart(normalizedFrom),
      SmartRideMatchingService.detectProvinceSmart(normalizedTo)
    ]);

    const geographicInfo = {
      from: {
        original: from,
        normalized: normalizedFrom,
        detectedProvince: fromProvince,
        confidence: fromProvince !== 'desconhecido' ? 'high' : 'low'
      },
      to: {
        original: to,
        normalized: normalizedTo,
        detectedProvince: toProvince,
        confidence: toProvince !== 'desconhecido' ? 'high' : 'low'
      },
      corridorAnalysis: {
        sameCorridor: fromProvince !== 'desconhecido' && toProvince !== 'desconhecido',
        recommendedSearch: fromProvince !== 'desconhecido' && toProvince !== 'desconhecido' 
          ? `Buscar rides de ${fromProvince} para ${toProvince} e rotas relacionadas`
          : 'Usar busca tradicional devido a províncias não identificadas'
      }
    };

    res.json({
      success: true,
      data: geographicInfo
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erro na detecção geográfica"
    });
  }
});

// GET /api/rides/province/search - Busca por província pública ATUALIZADA
router.get("/province/search", async (req: Request, res: Response) => {
  try {
    const { fromProvince, toProvince, status = 'available', maxResults = '50', radiusKm = '100' } = req.query;

    if (typeof fromProvince !== 'string' || typeof toProvince !== 'string' || !fromProvince.trim() || !toProvince.trim()) {
      return res.status(400).json({
        success: false,
        message: "Parâmetros 'fromProvince' e 'toProvince' são obrigatórios e devem ser strings válidas"
      });
    }

    const normalizedFromProvince = normalizeString(fromProvince);
    const normalizedToProvince = normalizeString(toProvince);
    const validatedMaxResults = validateMaxResults(maxResults, 50, 100);
    const radius = parseFloat(radiusKm as string);

    console.log('🧠 [PROVINCE-SEARCH] Busca por província inteligente:', {
      fromProvince: normalizedFromProvince,
      toProvince: normalizedToProvince,
      radius,
      maxResults: validatedMaxResults
    });

    const allMatches = await rideService.getRidesUniversal({
      fromLocation: normalizedFromProvince,
      toLocation: normalizedToProvince,
      status: status as string,
      radiusKm: radius,
      maxResults: validatedMaxResults
    });

    // ✅ CORREÇÃO: Estatísticas com dados dos motoristas da função inteligente
    const stats = {
      total: allMatches.length,
      fromProvince: normalizedFromProvince,
      toProvince: normalizedToProvince,
      status: status,
      average_driver_rating: allMatches.length > 0 
        ? parseFloat((allMatches.reduce((sum, ride) => sum + (ride.driver_rating || ride.driverRating || 0), 0) / allMatches.length).toFixed(1))
        : 0,
      vehicle_types: allMatches.reduce((acc: any, ride) => {
        const type = ride.vehicle_type || ride.vehicleType || 'unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {}),
      match_types: allMatches.reduce((acc: any, ride) => {
        const type = ride.match_type || 'province_search';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {})
    };

    res.json({
      success: true,
      data: {
        rides: allMatches,
        stats,
        smart_search: true
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor"
    });
  }
});

// GET /api/rides/driver/:driverId - Busca por motorista pública
router.get("/driver/:driverId", async (req: Request, res: Response) => {
  try {
    const { driverId } = req.params;
    const { status } = req.query;

    const driverRides = await rideService.getRidesByDriver(
      driverId, 
      status as string
    );

    res.json({
      success: true,
      data: { rides: driverRides }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor"
    });
  }
});

// GET /api/rides - Listagem geral pública ATUALIZADA
router.get("/", async (req: Request, res: Response) => {
  try {
    const { 
      fromLocation, 
      toLocation, 
      vehicleType, 
      status, 
      departureDate,
      page = 1, 
      limit = 20,
      radiusKm = '100'
    } = req.query;

    const pageNum = Math.max(Number(page) || 1, 1);
    const limitNum = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const radius = parseFloat(radiusKm as string);

    // ✅ CORREÇÃO: Usar normalizador assíncrono
    const normalizedFrom = fromLocation ? await normalizeLocation(fromLocation as string) : undefined;
    const normalizedTo = toLocation ? await normalizeLocation(toLocation as string) : undefined;

    console.log('🎯 [NORMALIZAÇÃO-CORRIGIDA-LIST]', {
      original: { from: fromLocation, to: toLocation },
      normalized: { from: normalizedFrom, to: normalizedTo },
      radius: radius
    });

    const allRides = await rideService.getRidesUniversal({
      fromLocation: normalizedFrom,
      toLocation: normalizedTo,
      status: status as string || 'available',
      radiusKm: radius,
      maxResults: 1000
    });
    
    let filteredRides = allRides;
    
    if (vehicleType) {
      const normalizedVehicleType = normalizeString(vehicleType as string);
      filteredRides = filteredRides.filter(ride => 
        ride.vehicleType && normalizeString(ride.vehicleType) === normalizedVehicleType
      );
    }
    
    if (departureDate && typeof departureDate === 'string') {
      const searchDate = new Date(departureDate);
      filteredRides = filteredRides.filter(ride => {
        if (!ride.departureDate) return false;
        const rideDate = new Date(ride.departureDate);
        return rideDate.toDateString() === searchDate.toDateString();
      });
    }
    
    const paginatedRides = filteredRides.slice(startIndex, endIndex);

    // ✅ CORREÇÃO: Estatísticas com dados dos motoristas da função inteligente
    const stats = {
      total: filteredRides.length,
      average_driver_rating: filteredRides.length > 0 
        ? parseFloat((filteredRides.reduce((sum, ride) => sum + (ride.driver_rating || ride.driverRating || 0), 0) / filteredRides.length).toFixed(1))
        : 0,
      vehicle_types: filteredRides.reduce((acc: any, ride) => {
        const type = ride.vehicle_type || ride.vehicleType || 'unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {}),
      match_types: filteredRides.reduce((acc: any, ride) => {
        const type = ride.match_type || 'general_search';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {})
    };

    res.json({
      success: true,
      data: {
        rides: paginatedRides,
        stats,
        total: filteredRides.length,
        page: pageNum,
        totalPages: Math.ceil(filteredRides.length / limitNum),
        filters: {
          fromLocation: normalizedFrom,
          toLocation: normalizedTo,
          vehicleType: vehicleType as string,
          status: status as string,
          departureDate: departureDate as string,
          radiusKm: radius
        },
        smart_search: true
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor"
    });
  }
});

// GET /api/rides/:id - Obter viagem específica pública
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const ride = await rideService.getRideById(id);

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: "Viagem não encontrada"
      });
    }

    res.json({
      success: true,
      data: { ride }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor"
    });
  }
});

// ✅✅✅ CORREÇÃO CRÍTICA: ROTAS PRIVADAS COM MIDDLEWARE FIREBASE CORRIGIDO

// POST /api/rides - Criar nova viagem (apenas motoristas autenticados)
router.post("/", verifyFirebaseToken, requireDriverRole, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Usuário não autenticado" });
    }

    // ✅ VALIDAÇÃO DE PROVÍNCIAS E CIDADES
    const { 
      fromAddress, 
      toAddress, 
      fromProvince, 
      toProvince, 
      fromCity, 
      toCity, 
      fromDistrict,
      toDistrict,
      fromLocality,
      toLocality,
      from_geom,
      to_geom,
      fromLat,
      fromLng,
      toLat,
      toLng,
      ...otherData 
    } = req.body;

    if (!fromProvince || !toProvince) {
      return res.status(400).json({
        success: false,
        message: "Províncias de origem e destino são obrigatórias. Use: Maputo, Gaza, Inhambane, Sofala, Manica, Tete, Zambezia, Nampula, Cabo Delgado, Niassa"
      });
    }

    // ✅ REVERSE GEOCODING
    let finalFromAddress = fromAddress || '';
    let finalToAddress = toAddress || '';

    if (fromLat && fromLng) {
      try {
        finalFromAddress = await getAddressFromCoords(fromLat, fromLng);
      } catch (geoError) {
        console.error("❌ Erro ao buscar endereço de origem:", geoError);
        finalFromAddress = `${fromCity || ''}, ${fromProvince}`.trim();
      }
    }

    if (toLat && toLng) {
      try {
        finalToAddress = await getAddressFromCoords(toLat, toLng);
      } catch (geoError) {
        console.error("❌ Erro ao buscar endereço de destino:", geoError);
        finalToAddress = `${toCity || ''}, ${toProvince}`.trim();
      }
    }

    // ✅ Conversão segura de campos numéricos
    const pricePerSeat = Number(otherData.pricePerSeat);
    const availableSeats = Number(otherData.availableSeats);
    const maxPassengers = Number(otherData.maxPassengers);

    // ✅ Normalização dos dados geográficos
    const normalizedFromProvince = normalizeString(fromProvince);
    const normalizedToProvince = normalizeString(toProvince);
    const normalizedFromCity = fromCity ? normalizeString(fromCity) : '';
    const normalizedToCity = toCity ? normalizeString(toCity) : '';
    const normalizedFromDistrict = fromDistrict ? normalizeString(fromDistrict) : '';
    const normalizedToDistrict = toDistrict ? normalizeString(toDistrict) : '';
    const normalizedFromLocality = fromLocality ? normalizeString(fromLocality) : '';
    const normalizedToLocality = toLocality ? normalizeString(toLocality) : '';

    // ✅ Preparar dados para criação
    const rideInput = {
      ...otherData,
      fromAddress: finalFromAddress,
      toAddress: finalToAddress,
      fromProvince: normalizedFromProvince,
      toProvince: normalizedToProvince,
      fromCity: normalizedFromCity,
      toCity: normalizedToCity,
      fromDistrict: normalizedFromDistrict,
      toDistrict: normalizedToDistrict,
      fromLocality: normalizedFromLocality,
      toLocality: normalizedToLocality,
      from_geom: from_geom || null,
      to_geom: to_geom || null,
      driverId: userId,
      pricePerSeat: isNaN(pricePerSeat) ? 0 : pricePerSeat,
      availableSeats: isNaN(availableSeats) ? 1 : availableSeats,
      maxPassengers: isNaN(maxPassengers) ? 4 : maxPassengers,
      departureDate: otherData.departureDate ? new Date(otherData.departureDate) : new Date(),
      departureTime: otherData.departureTime || '08:00',
      status: 'available'
    };

    // ✅ Validar com Zod
    const validatedData = insertRideSchema.parse({
      ...rideInput,
      pricePerSeat: String(rideInput.pricePerSeat)
    });

    // ✅ Criar ride
    const newRide = await rideService.createRide(validatedData as any);

    res.status(201).json({
      success: true,
      message: "Viagem criada com sucesso",
      data: { ride: newRide },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Dados inválidos",
        errors: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
    });
  }
});

// PUT /api/rides/:id - Atualizar viagem (apenas motoristas autenticados)
router.put("/:id", verifyFirebaseToken, requireDriverRole, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Usuário não autenticado" });
    }

    const existingRide = await rideService.getRideById(id);
    if (!existingRide) {
      return res.status(404).json({
        success: false,
        message: "Viagem não encontrada"
      });
    }

    if (existingRide.driverId !== userId) {
      return res.status(403).json({
        success: false,
        message: "Sem permissão para editar esta viagem"
      });
    }

    const updateData: any = { ...req.body };
    
    // ✅ Conversão segura de campos numéricos
    if (updateData.pricePerSeat !== undefined) {
      const price = Number(updateData.pricePerSeat);
      updateData.pricePerSeat = isNaN(price) ? existingRide.pricePerSeat : price;
    }
    if (updateData.availableSeats !== undefined) {
      const seats = Number(updateData.availableSeats);
      updateData.availableSeats = isNaN(seats) ? existingRide.availableSeats : seats;
    }
    if (updateData.maxPassengers !== undefined) {
      const passengers = Number(updateData.maxPassengers);
      updateData.maxPassengers = isNaN(passengers) ? existingRide.maxPassengers : passengers;
    }
    if (updateData.departureDate !== undefined) {
      updateData.departureDate = new Date(updateData.departureDate);
    }

    // ✅ Normalização dos dados geográficos
    if (updateData.fromCity !== undefined) {
      updateData.fromCity = updateData.fromCity ? normalizeString(updateData.fromCity) : '';
    }
    if (updateData.toCity !== undefined) {
      updateData.toCity = updateData.toCity ? normalizeString(updateData.toCity) : '';
    }
    if (updateData.fromProvince !== undefined) {
      updateData.fromProvince = updateData.fromProvince ? normalizeString(updateData.fromProvince) : '';
    }
    if (updateData.toProvince !== undefined) {
      updateData.toProvince = updateData.toProvince ? normalizeString(updateData.toProvince) : '';
    }

    const validatedUpdateData = updateRideSchema.parse({
      ...updateData,
      ...(updateData.pricePerSeat !== undefined && { 
        pricePerSeat: String(updateData.pricePerSeat) 
      })
    });

    const updatedRide = await rideService.updateRide(id, validatedUpdateData as any);

    if (!updatedRide) {
      return res.status(500).json({
        success: false,
        message: "Erro ao atualizar viagem"
      });
    }

    res.json({
      success: true,
      message: "Viagem atualizada com sucesso",
      data: { ride: updatedRide }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Dados inválidos",
        errors: error.errors
      });
    }

    res.status(500).json({
      success: false,
      message: "Erro interno do servidor"
    });
  }
});

// DELETE /api/rides/:id - Excluir viagem (apenas motoristas autenticados)
router.delete("/:id", verifyFirebaseToken, requireDriverRole, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Usuário não autenticado" });
    }

    const existingRide = await rideService.getRideById(id);
    if (!existingRide) {
      return res.status(404).json({
        success: false,
        message: "Viagem não encontrada"
      });
    }

    if (existingRide.driverId !== userId) {
      return res.status(403).json({
        success: false,
        message: "Sem permissão para excluir esta viagem"
      });
    }

    try {
      await rideService.deleteRide(id);

      res.json({
        success: true,
        message: "Viagem excluída com sucesso"
      });
    } catch (serviceError) {
      return res.status(500).json({
        success: false,
        message: "Erro ao excluir viagem no serviço"
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor"
    });
  }
});

export default router;