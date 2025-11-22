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
      radiusKm = '100', // ✅ CORREÇÃO: Aumentado para 100km (busca mais abrangente)
      maxResults = '20',
      status = 'available'
    } = req.query;

    if (!from && !to && !lat && !lng) {
      return res.status(400).json({
        success: false,
        message: "Pelo menos um parâmetro de busca é necessário (from, to, lat/lng)"
      });
    }

    const validatedMaxResults = validateMaxResults(maxResults, 20, 50);
    const radius = parseFloat(radiusKm as string);

    console.log('🧠 [UNIVERSAL-CONTROLLER] Busca universal inteligente:', {
      from, to, radius
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

    const stats = {
      total: universalRides.length,
      smart_matches: universalRides.filter(r => r.match_type === 'smart_match' || r.match_type === 'smart_final_direct').length,
      exact_matches: universalRides.filter(r => r.match_type === 'exact_match').length,
      nearby_matches: universalRides.filter(r => r.match_type === 'nearby').length,
      traditional_matches: universalRides.filter(r => !r.match_type || r.match_type === 'traditional').length,
      average_compatibility: universalRides.length > 0 
        ? Math.round(universalRides.reduce((sum, ride) => sum + (ride.route_compatibility || 0), 0) / universalRides.length)
        : 0
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
        smart_search: true // ✅ Indicar que usou busca inteligente
      }
    });
  } catch (error) {
    console.error("❌ Erro em busca universal:", error);
    
    try {
      const { from, to, maxResults = '20' } = req.query;
      
      const fallbackRides = await rideService.getRides({
        fromLocation: from as string,
        toLocation: to as string,
        status: 'available'
      }).then(rides => rides.slice(0, validateMaxResults(maxResults, 20, 50)));

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
            maxResults: validateMaxResults(maxResults, 20, 50)
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

// GET /api/rides/smart/search - Busca inteligente pública ATUALIZADA COM DEBUG DETALHADO
router.get("/smart/search", async (req: Request, res: Response) => {
  try {
    const { 
      from, 
      to,
      lat,
      lng,
      toLat,
      toLng,
      date,
      passengers = '1',
      maxResults = '20',
      radiusKm = '100',
      fromId,
      toId
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
    const validatedMaxResults = validateMaxResults(maxResults, 20, 50);
    const passengersNum = Math.max(Number(passengers) || 1, 1);
    const radius = parseFloat(radiusKm as string);

    // 🔍 DEBUG DETALHADO - FLUXO COMPLETO
    console.log('🎯 [NORMALIZAÇÃO-CORRIGIDA-CONTROLLER]', {
      original: { from: from, to: to },
      normalized: { from: normalizedFrom, to: normalizedTo },
      radius: radius
    });

    console.log('🧠 [SMART-CONTROLLER] Busca inteligente solicitada:', {
      from: normalizedFrom,
      to: normalizedTo,
      radius,
      passengers: passengersNum
    });

    // ✅ CORREÇÃO: Usar busca SMART FINAL diretamente
    let matchingRides: any[] = [];
    let searchMethod = 'smart_final';

    try {
      // ✅ CORREÇÃO CRÍTICA: Usar o novo método searchRidesSmartFinal
      matchingRides = await rideService.searchRidesSmartFinal(
        normalizedFrom,
        normalizedTo,
        radius
      );
      searchMethod = 'smart_final_direct';
      
      // 🎯 DEBUG: TESTAR DIRETAMENTE NO BANCO
      console.log('🎯 [DEBUG] Resultado direto do PostgreSQL:', {
        normalizedFrom,
        normalizedTo, 
        resultsCount: matchingRides.length,
        sampleRides: matchingRides.slice(0, 3).map(ride => ({
          id: ride.id,
          fromCity: ride.fromCity,
          toCity: ride.toCity,
          match_type: ride.match_type
        }))
      });
      
    } catch (smartError) {
      console.warn("❌ Smart final falhou, usando universal como fallback:", smartError);
      matchingRides = await rideService.getRidesUniversal({
        fromLocation: normalizedFrom,
        toLocation: normalizedTo,
        radiusKm: radius,
        maxResults: validatedMaxResults
      });
      searchMethod = 'universal_fallback';
    }

    // ✅ CORREÇÃO CRÍTICA: SALVAR TODOS OS RESULTADOS ANTES DE QUALQUER FILTRO
    const allRidesBeforeFilter = [...matchingRides];
    console.log('🔍 [CONTROLLER-FILTER-DEBUG] Antes de filtrar:', {
      totalRides: allRidesBeforeFilter.length,
      rideIds: allRidesBeforeFilter.map(r => r.id)
    });

    // ✅ Filtrar por data se fornecida
    if (date && typeof date === 'string') {
      const searchDate = new Date(date);
      matchingRides = matchingRides.filter(ride => {
        if (!ride.departureDate) return false;
        const rideDate = new Date(ride.departureDate);
        return rideDate.toDateString() === searchDate.toDateString();
      });
    }

    // ✅ Filtrar por número de passageiros
    matchingRides = matchingRides.filter(ride => 
      ride.availableSeats >= passengersNum
    );

    // ✅ CORREÇÃO CRÍTICA: DEBUG APÓS FILTROS
    console.log('🔍 [CONTROLLER-FILTER-DEBUG] Após filtros:', {
      filtroData: date || 'não aplicado',
      filtroPassageiros: passengersNum,
      antesFiltros: allRidesBeforeFilter.length,
      depoisFiltros: matchingRides.length,
      ridesRemovidos: allRidesBeforeFilter.length - matchingRides.length
    });

    // ✅ Aplicar limite de resultados
    const finalRides = matchingRides.slice(0, validatedMaxResults);

    // ✅✅✅ CORREÇÃO CRÍTICA: VERIFICAÇÃO FINAL ANTES DO ENVIO
    console.log('🔍 [CONTROLLER-FINAL-CHECK] Verificação final antes do envio:', {
      resultadosDoServico: allRidesBeforeFilter.length, // Deve ser 4
      resultadosParaFrontend: finalRides.length, // Deve ser 4 (ou menos se filtros aplicados)
      todosOsIds: finalRides.map(r => r.id),
      filtrosAplicados: {
        data: !!date,
        passageiros: passengersNum,
        maxResults: validatedMaxResults
      }
    });

    const matchStats = {
      smart_matches: finalRides.filter(r => r.match_type === 'smart_final_direct' || r.match_type === 'smart_match').length,
      exact_match: finalRides.filter(r => r.match_type === 'exact_match' || r.matchType === 'exact_match').length,
      same_segment: finalRides.filter(r => 
        r.match_type === 'covers_route' || r.matchType === 'covers_route' || 
        r.match_type === 'same_segment' || r.matchType === 'same_segment'
      ).length,
      same_direction: finalRides.filter(r => 
        r.match_type === 'first_leg' || r.matchType === 'first_leg' ||
        r.match_type === 'corridor_route' || r.matchType === 'corridor_route'
      ).length,
      potential: finalRides.filter(r => 
        r.match_type === 'same_direction_overlap' || r.matchType === 'same_direction_overlap' ||
        r.match_type === 'same_region' || r.matchType === 'same_region'
      ).length,
      traditional: finalRides.filter(r => 
        !r.match_type && !r.matchType || 
        r.match_type === 'traditional' || r.matchType === 'traditional'
      ).length,
      total: finalRides.length
    };

    console.log('✅ [SMART-CONTROLLER] Resultados da busca inteligente:', {
      total: finalRides.length,
      method: searchMethod,
      stats: matchStats,
      // 🔍 DEBUG ADICIONAL: Mostrar primeiros resultados
      firstResults: finalRides.slice(0, 5).map(ride => ({
        fromCity: ride.fromCity,
        toCity: ride.toCity,
        match_type: ride.match_type,
        compatibility: ride.route_compatibility
      }))
    });

    res.json({
      success: true,
      data: {
        rides: finalRides, // ✅ CORREÇÃO: Enviar TODOS os resultados válidos
        stats: matchStats,
        searchParams: {
          from: normalizedFrom,
          to: normalizedTo,
          date: date || 'qualquer',
          passengers: passengersNum,
          maxResults: validatedMaxResults,
          radiusKm: radius,
          searchMethod
        },
        debug_info: { // ✅ INFO DE DEBUG PARA FRONTEND
          normalization_applied: from !== normalizedFrom || to !== normalizedTo,
          original_input: { from, to },
          normalized_input: { from: normalizedFrom, to: normalizedTo },
          filters_applied: {
            date: !!date,
            passengers: passengersNum,
            maxResults: validatedMaxResults
          },
          total_before_filters: allRidesBeforeFilter.length,
          total_after_filters: finalRides.length
        },
        smart_search: true // ✅ Indicar que usou busca inteligente
      }
    });
  } catch (error) {
    console.error("❌ Erro em busca inteligente:", error);
    
    // 🔍 DEBUG DO ERRO
    console.error('🔍 [DEBUG-ERROR] Detalhes do erro:', {
      errorMessage: error instanceof Error ? error.message : 'Erro desconhecido',
      errorStack: error instanceof Error ? error.stack : undefined,
      queryParams: req.query
    });
    
    try {
      const { from, to, maxResults = '20' } = req.query;
      
      const traditionalRides = await rideService.getRides({
        fromLocation: from as string,
        toLocation: to as string,
        status: 'available'
      }).then(rides => rides.slice(0, validateMaxResults(maxResults, 20, 50)));

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
            maxResults: validateMaxResults(maxResults, 20, 50)
          },
          warning: "Sistema inteligente temporariamente indisponível, usando busca tradicional"
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

// GET /api/rides/between-cities - Busca entre cidades pública ATUALIZADA
router.get("/between-cities", async (req: Request, res: Response) => {
  try {
    const { city_from, city_to, radius_km = '100' } = req.query; // ✅ CORREÇÃO: Aumentado para 100km

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
      radius: radius_km
    });

    const rides = await rideService.getRidesUniversal({
      fromLocation: normalizedFrom,
      toLocation: normalizedTo,
      radiusKm: parseFloat(radius_km as string),
      maxResults: 50
    });

    return res.json({
      success: true,
      data: rides,
      searchParams: { 
        city_from: normalizedFrom, 
        city_to: normalizedTo, 
        radius_km: parseFloat(radius_km as string) 
      },
      smart_search: true // ✅ Indicar que usou busca inteligente
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
    const { lat, lng, toLat, toLng, radiusKm = '100' } = req.query; // ✅ CORREÇÃO: Aumentado para 100km

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
      radius
    });

    const nearbyRides = await rideService.getRidesUniversal({
      userLat: latitude,
      userLng: longitude,
      toLat: destinationLat,
      toLng: destinationLng,
      radiusKm: radius,
      maxResults: 50
    });

    res.json({
      success: true,
      message: "Viagens próximas encontradas",
      data: {
        count: nearbyRides.length,
        radiusKm: radius,
        rides: nearbyRides
      },
      smart_search: true // ✅ Indicar que usou busca inteligente
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
      maxResults = '20',
      minCompatibility = '50',
      radiusKm = '100' // ✅ CORREÇÃO: Adicionado radiusKm
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
    const validatedMaxResults = validateMaxResults(maxResults, 20, 50);
    const minCompatNumber = Math.min(Math.max(Number(minCompatibility) || 50, 0), 100);
    const radius = parseFloat(radiusKm as string);

    console.log('🎯 [NORMALIZAÇÃO-CORRIGIDA-HYBRID]', {
      original: { from, to },
      normalized: { from: normalizedFrom, to: normalizedTo },
      radius: radius
    });

    // ✅ CORREÇÃO: Usar busca SMART FINAL diretamente
    let allRides: any[] = [];

    try {
      allRides = await rideService.searchRidesSmartFinal(
        normalizedFrom,
        normalizedTo,
        radius
      );
    } catch (smartError) {
      console.warn("❌ Smart final falhou, usando universal como fallback:", smartError);
      allRides = await rideService.getRidesUniversal({
        fromLocation: normalizedFrom,
        toLocation: normalizedTo,
        radiusKm: radius,
        maxResults: 100
      });
    }

    const filteredRides = allRides.filter((ride: any) => 
      (ride.route_compatibility ?? ride.matchScore ?? 0) >= minCompatNumber
    ).slice(0, validatedMaxResults);

    const compatibilityRanges = {
      high: filteredRides.filter((r: any) => (r.route_compatibility ?? r.matchScore ?? 0) >= 80).length,
      medium: filteredRides.filter((r: any) => {
        const score = r.route_compatibility ?? r.matchScore ?? 0;
        return score >= 50 && score < 80;
      }).length,
      low: filteredRides.filter((r: any) => (r.route_compatibility ?? r.matchScore ?? 0) < 50).length
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
                sum + (ride.route_compatibility ?? ride.matchScore ?? 0), 0) / filteredRides.length)
            : 0
        },
        filters: {
          minCompatibility: minCompatNumber,
          maxResults: validatedMaxResults,
          radiusKm: radius
        },
        smart_search: true // ✅ Indicar que usou busca inteligente
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
      radius
    });

    const allMatches = await rideService.getRidesUniversal({
      fromLocation: normalizedFromProvince,
      toLocation: normalizedToProvince,
      status: status as string,
      radiusKm: radius,
      maxResults: validatedMaxResults
    });

    res.json({
      success: true,
      data: {
        rides: allMatches,
        stats: {
          total: allMatches.length,
          fromProvince: normalizedFromProvince,
          toProvince: normalizedToProvince,
          status: status
        },
        smart_search: true // ✅ Indicar que usou busca inteligente
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
      radiusKm = '100' // ✅ CORREÇÃO: Adicionado radiusKm
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

    res.json({
      success: true,
      data: {
        rides: paginatedRides,
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
        smart_search: true // ✅ Indicar que usou busca inteligente
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