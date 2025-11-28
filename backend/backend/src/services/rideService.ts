import { db } from "../../db";
import { rides, vehicles } from "../../shared/database-schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { formatDateOnly, formatTimeOnly, formatLongDate, formatWeekday } from '../utils/dateFormatter';
import { v4 as uuidv4 } from 'uuid';
import { insertRideSchema } from "../../shared/database-schema";
import { z } from "zod";

// ✅ MAPEAMENTO PARA TIPOS DE VEÍCULO
const VEHICLE_TYPE_DISPLAY: Record<string, { label: string; icon: string }> = {
  economy: { label: 'Económico', icon: '🚗' },
  comfort: { label: 'Conforto', icon: '🚙' },
  luxury: { label: 'Luxo', icon: '🏎️' },
  family: { label: 'Familiar', icon: '🚐' },
  cargo: { label: 'Carga', icon: '🚚' },
  motorcycle: { label: 'Moto', icon: '🏍️' }
};

// ✅ FUNÇÃO AUXILIAR PARA FORMATAR DATA/HORA
function formatDateTime(date: Date | string): string {
  if (!date) return '';
  const d = new Date(date);
  return `${formatDateOnly(d)} ${formatTimeOnly(d)}`;
}

// ✅✅✅ FUNÇÃO DE NORMALIZAÇÃO CORRIGIDA - PREÇOS SEMPRE COMO NUMBER E SEM CAMPOS INEXISTENTES
function normalizeDbRideToDto(raw: any) {
  // ✅ Função para formatar matrícula moçambicana
  const formatVehiclePlate = (plate: string) => {
    if (!plate) return null;
    // Formatar: "MAT-123-AB" → "MAT 123 AB"
    return plate.replace(/-/g, ' ').toUpperCase();
  };

  // ✅ CORREÇÃO CRÍTICA: Garantir que preços sejam sempre números
  const pricePerSeatValue = Number(raw.priceperseat) || 0;
  const availableSeatsValue = Number(raw.availableseats) || 0;
  const maxPassengersValue = Number(raw.max_passengers) || 4;
  const driverRatingValue = raw.driver_rating ? Number(raw.driver_rating) : 
                           raw.driverRating ? Number(raw.driverRating) : null;

  // ✅ DADOS DO VEÍCULO - CORREÇÃO: Buscar informações completas do veículo
  const vehicleInfo = raw.vehicle_id ? {
    id: raw.vehicle_id,
    make: raw.vehicle_make || raw.vehicleMake || null,
    model: raw.vehicle_model || raw.vehicleModel || null,
    color: raw.vehicle_color || raw.vehicleColor || null,
    plateNumber: formatVehiclePlate(raw.vehicle_plate || raw.vehiclePlate),
    plateNumberRaw: raw.vehicle_plate || raw.vehiclePlate,
    type: raw.vehicle_type || raw.vehicleType || null,
    typeDisplay: VEHICLE_TYPE_DISPLAY[raw.vehicle_type || raw.vehicleType]?.label || 'Veículo',
    maxPassengers: raw.vehicle_max_passengers || maxPassengersValue
  } : null;

  return {
    // Identificação
    id: raw.ride_id || raw.id,
    driverId: raw.driver_id || raw.driverId,
    
    // Informações do motorista
    driverName: raw.driver_name || raw.driverName || null,
    driverRating: driverRatingValue,
    
    // Localização - origem
    fromAddress: raw.from_address || raw.fromAddress || null,
    fromCity: raw.from_city || raw.fromCity || null,
    fromDistrict: raw.from_district || raw.fromDistrict || null,
    fromProvince: raw.from_province || raw.fromProvince || null,
    fromLocality: raw.from_locality || raw.fromLocality || null,
    from_geom: raw.from_geom || null,
    
    // Localização - destino
    toAddress: raw.to_address || raw.toAddress || null,
    toCity: raw.to_city || raw.toCity || null,
    toDistrict: raw.to_district || raw.toDistrict || null,
    toProvince: raw.to_province || raw.toProvince || null,
    toLocality: raw.to_locality || raw.toLocality || null,
    to_geom: raw.to_geom || null,
    
    // ✅ DATAS FORMATADAS CORRETAMENTE (DD/MM/AAAA + 24h)
    departureDate: raw.departuredate ? new Date(raw.departuredate).toISOString() : null,
    departureDateFormatted: formatDateOnly(raw.departuredate), // "20/12/2025"
    departureTimeFormatted: formatTimeOnly(raw.departuredate), // "14:30" (24h)
    departureDateTimeFormatted: formatDateTime(raw.departuredate), // "20/12/2025 14:30"
    departureLongDate: formatLongDate(raw.departuredate), // "Sexta-feira, 20 de Dezembro de 2025"
    departureWeekday: formatWeekday(raw.departuredate), // "Sexta-feira"
    departureTime: raw.departuretime || raw.departureTime || null,
    
    // ✅ INFORMAÇÕES COMPLETAS DO VEÍCULO COM MATRÍCULA
    vehicleId: raw.vehicle_id || raw.vehicleId || null,
    vehicleInfo: vehicleInfo,
    vehicle: `${raw.vehicle_make || ''} ${raw.vehicle_model || ''}`.trim() || null,
    vehicleType: raw.vehicle_type || raw.vehicleType || null,
    vehiclePlate: formatVehiclePlate(raw.vehicle_plate || raw.vehiclePlate), // "MAT 123 AB"
    vehiclePlateRaw: raw.vehicle_plate || raw.vehiclePlate, // Original: "MAT-123-AB"
    vehicleColor: raw.vehicle_color || raw.vehicleColor || null,
    vehicleMake: raw.vehicle_make || raw.vehicleMake || null,
    vehicleModel: raw.vehicle_model || raw.vehicleModel || null,
    maxPassengers: maxPassengersValue,
    
    // ✅✅✅ CORREÇÃO: Disponibilidade e preço SEMPRE como number
    availableSeats: availableSeatsValue,
    pricePerSeat: pricePerSeatValue, // ← AGORA SEMPRE number (nunca null)
    
    // Campos adicionais do schema
    additionalInfo: raw.additionalinfo || raw.additionalInfo || null,
    distance_real_km: raw.distance_real_km ? Number(raw.distance_real_km) : null,
    polyline: raw.polyline || null,
    type: raw.type || 'regular',
    
    // Metadados
    distanceFromUserKm: raw.distance_from_city_km ? Number(raw.distance_from_city_km) : null,
    matchType: raw.match_type || raw.matchType || null,
    status: raw.status || 'available',
    searchMetadata: raw.search_metadata || raw.searchMetadata || null,
    
    // Timestamps
    createdAt: raw.createdat ? new Date(raw.createdat).toISOString() : null,
    updatedAt: raw.updatedat ? new Date(raw.updatedat).toISOString() : null,

    // ✅ NOVOS CAMPOS DA FUNÇÃO get_rides_smart_final
    ride_id: raw.ride_id,
    driver_id: raw.driver_id,
    driver_name: raw.driver_name,
    driver_rating: raw.driver_rating,
    vehicle_make: raw.vehicle_make,
    vehicle_model: raw.vehicle_model,
    vehicle_type: raw.vehicle_type,
    vehicle_plate: raw.vehicle_plate,
    vehicle_color: raw.vehicle_color,
    max_passengers: raw.max_passengers,
    from_city: raw.from_city,
    to_city: raw.to_city,
    from_lat: raw.from_lat,
    from_lng: raw.from_lng,
    to_lat: raw.to_lat,
    to_lng: raw.to_lng,
    departuredate: raw.departuredate,
    availableseats: raw.availableseats,
    priceperseat: raw.priceperseat,
    distance_from_city_km: raw.distance_from_city_km,
    distance_to_city_km: raw.distance_to_city_km,
    direction_score: raw.direction_score
  };
}

// ✅ NORMALIZADOR CORRIGIDO - APENAS DRIZZLE SQL
class LocationNormalizerCorrigido {
  static async normalizeLocation(locationName: string): Promise<string> {
    if (!locationName || locationName.trim() === '') {
      return locationName;
    }

    try {
      console.log('🔍 [NORMALIZADOR] Normalizando:', locationName);
      
      // ✅ CORREÇÃO: Usar sql do Drizzle - NUNCA db.query() ou db.execute()
      const result = await db.execute(
        sql`SELECT normalize_location_name(${locationName}) as normalized`
      );

      // ✅ Extração segura do resultado do Drizzle
      let normalizedValue: string = locationName.split(',')[0].trim().toLowerCase();
      
      if (result && Array.isArray(result) && result.length > 0) {
        normalizedValue = (result[0] as any)?.normalized || normalizedValue;
      } else if (result && typeof result === 'object' && 'rows' in result) {
        const rows = (result as any).rows;
        normalizedValue = rows[0]?.normalized || normalizedValue;
      }

      console.log('✅ [NORMALIZADOR] Resultado:', {
        original: locationName,
        normalized: normalizedValue
      });

      return normalizedValue;

    } catch (error) {
      console.error('❌ [NORMALIZADOR] Erro, usando fallback:', error);
      return locationName.split(',')[0].trim().toLowerCase();
    }
  }

  static normalizeForSearch(locationName: string): string {
    console.warn('⚠️ [NORMALIZADOR] Usando normalizeForSearch síncrono');
    return locationName.split(',')[0].trim().toLowerCase();
  }
}

// ✅ INTERFACE SIMPLIFICADA - USANDO APENAS OS CAMPOS ESSENCIAIS
interface CreateRideBaseData {
  driverId: string;
  fromAddress: string;
  toAddress: string;
  departureDate: Date;
  departureTime: string;
  availableSeats: number;
  pricePerSeat: number;
  driverName?: string;
  fromCity?: string;
  toCity?: string;
  fromProvince?: string;
  toProvince?: string;
  vehicleId?: string;
  vehicleType?: string;
  additionalInfo?: string;
}

export class RideService {
  
  // 🎯 MÉTODO UNIVERSAL CENTRALIZADO - CORRIGIDO PARA USAR get_rides_smart_final
  async getRidesUniversal(params: {
    fromLocation?: string;
    toLocation?: string;
    userLat?: number;
    userLng?: number;
    toLat?: number;
    toLng?: number;
    radiusKm?: number;
    maxResults?: number;
    status?: string;
  }): Promise<any[]> {
    try {
      const {
        fromLocation,
        toLocation,
        userLat,
        userLng,
        toLat,
        toLng,
        radiusKm = 100,
        maxResults = 50, // ✅ Aumentado para 50
      } = params;

      // ✅ CORREÇÃO: Usar normalizador assíncrono
      const normalizedFrom = fromLocation ? await LocationNormalizerCorrigido.normalizeLocation(fromLocation) : '';
      const normalizedTo = toLocation ? await LocationNormalizerCorrigido.normalizeLocation(toLocation) : '';

      console.log('🎯 [NORMALIZAÇÃO-CORRIGIDA]', {
        original: { from: fromLocation, to: toLocation },
        normalized: { from: normalizedFrom, to: normalizedTo },
        radius: radiusKm,
        maxResults
      });

      // ✅✅✅ CORREÇÃO: Usar get_rides_smart_final com todos os parâmetros
      const result = await db.execute(
        sql`SELECT * FROM get_rides_smart_final(
          ${normalizedFrom || ''}, 
          ${normalizedTo || ''}, 
          ${radiusKm},
          ${maxResults}
        )`
      );

      // ✅ Extração segura dos resultados
      let rows: any[] = [];
      
      if (Array.isArray(result)) {
        rows = result;
      } else if (result && typeof result === 'object' && 'rows' in result) {
        rows = (result as any).rows;
      } else if (result && typeof result === 'object') {
        const arrayProperties = Object.values(result).filter(val => Array.isArray(val));
        if (arrayProperties.length > 0) {
          rows = arrayProperties[0] as any[];
        }
      }
      
      console.log('✅ [SMART-SERVICE] Resultados processados:', {
        totalEncontrado: rows.length,
        primeiroResultado: rows[0] ? {
          id: rows[0].ride_id,
          from: rows[0].from_city,
          to: rows[0].to_city,
          match_type: rows[0].match_type,
          direction_score: rows[0].direction_score
        } : 'Nenhum'
      });

      // ✅ APLICAÇÃO DA NORMALIZAÇÃO PARA FRONTEND
      const normalizedRides = rows.map(normalizeDbRideToDto);

      console.log('🎯 [NORMALIZAÇÃO-FRONTEND] Rides normalizados:', normalizedRides.length);
      normalizedRides.forEach((ride: any, index: number) => {
        console.log(`🎯 Ride ${index + 1}:`, {
          id: ride.id,
          fromCity: ride.fromCity,
          toCity: ride.toCity,
          departureDate: ride.departureDate,
          pricePerSeat: ride.pricePerSeat,
          availableSeats: ride.availableSeats,
          matchType: ride.matchType,
          directionScore: ride.direction_score,
          vehicleInfo: ride.vehicleInfo ? `${ride.vehicleInfo.make} ${ride.vehicleInfo.model}` : 'Sem veículo'
        });
      });
      
      return normalizedRides;

    } catch (error) {
      console.error("❌ Erro em getRidesUniversal:", error);
      return [];
    }
  }

  // 🔍 BUSCA TRADICIONAL POR TEXTO - CORRIGIDA
  async findRidesExact(fromLocation: string, toLocation: string): Promise<any[]> {
    try {
      const normalizedFrom = await LocationNormalizerCorrigido.normalizeLocation(fromLocation);
      const normalizedTo = await LocationNormalizerCorrigido.normalizeLocation(toLocation);

      console.log('🔍 [FIND-EXACT] Busca exata normalizada:', {
        original: { from: fromLocation, to: toLocation },
        normalized: { from: normalizedFrom, to: normalizedTo }
      });

      return await this.getRidesUniversal({
        fromLocation: normalizedFrom,
        toLocation: normalizedTo,
        maxResults: 20
      });
    } catch (error) {
      console.error("❌ Erro em findRidesExact:", error);
      return [];
    }
  }

  // 🎯 BUSCA INTELIGENTE USANDO POSTGRES - CORRIGIDA
  async findSmartRides(
    passengerFrom: string, 
    passengerTo: string, 
    passengerFromProvince?: string, 
    passengerToProvince?: string
  ): Promise<any[]> {
    try {
      console.log('🧠 [FIND-SMART] Busca inteligente:', {
        from: passengerFrom,
        to: passengerTo,
        fromProvince: passengerFromProvince,
        toProvince: passengerToProvince
      });

      const normalizedFrom = await LocationNormalizerCorrigido.normalizeLocation(passengerFrom);
      const normalizedTo = await LocationNormalizerCorrigido.normalizeLocation(passengerTo);

      return await this.getRidesUniversal({
        fromLocation: normalizedFrom,
        toLocation: normalizedTo,
        maxResults: 50,
        radiusKm: 100
      });
    } catch (error) {
      console.error("❌ Erro em findSmartRides:", error);
      
      const normalizedFrom = await LocationNormalizerCorrigido.normalizeLocation(passengerFrom);
      const normalizedTo = await LocationNormalizerCorrigido.normalizeLocation(passengerTo);
      
      return await this.getRidesUniversal({
        fromLocation: normalizedFrom,
        toLocation: normalizedTo,
        maxResults: 50
      });
    }
  }

  // 🆕 MÉTODO PARA BUSCA HÍBRIDA - CORRIGIDA
  async searchRidesHybrid(
    fromLocation: string, 
    toLocation: string, 
    options?: { 
      passengerFromProvince?: string; 
      passengerToProvince?: string;
      maxResults?: number;
      useNearby?: boolean;
      userLat?: number;
      userLng?: number;
      toLat?: number;
      toLng?: number;
      radiusKm?: number;
    }
  ): Promise<any[]> {
    try {
      const normalizedFrom = await LocationNormalizerCorrigido.normalizeLocation(fromLocation);
      const normalizedTo = await LocationNormalizerCorrigido.normalizeLocation(toLocation);

      console.log('🎯 [NORMALIZAÇÃO-CORRIGIDA-HYBRID]', {
        original: { from: fromLocation, to: toLocation },
        normalized: { from: normalizedFrom, to: normalizedTo },
        radius: options?.radiusKm
      });

      return await this.getRidesUniversal({
        fromLocation: normalizedFrom,
        toLocation: normalizedTo,
        userLat: options?.userLat,
        userLng: options?.userLng,
        toLat: options?.toLat,
        toLng: options?.toLng,
        radiusKm: options?.radiusKm || 100,
        maxResults: options?.maxResults || 50
      });
    } catch (error) {
      console.error("❌ Erro em searchRidesHybrid:", error);
      
      const normalizedFrom = await LocationNormalizerCorrigido.normalizeLocation(fromLocation);
      const normalizedTo = await LocationNormalizerCorrigido.normalizeLocation(toLocation);
      
      return await this.getRidesUniversal({
        fromLocation: normalizedFrom,
        toLocation: normalizedTo,
        maxResults: options?.maxResults || 50
      });
    }
  }

  // 🎯 BUSCA BÁSICA - CORRIGIDA
  async getRides(filters: { 
    fromLocation?: string; 
    toLocation?: string;
    status?: string;
  } = {}): Promise<any[]> {
    try {
      const { fromLocation, toLocation, status } = filters;
      
      const normalizedFrom = fromLocation ? await LocationNormalizerCorrigido.normalizeLocation(fromLocation) : undefined;
      const normalizedTo = toLocation ? await LocationNormalizerCorrigido.normalizeLocation(toLocation) : undefined;

      console.log('🎯 [NORMALIZAÇÃO-CORRIGIDA-BASIC]', { 
        original: { fromLocation, toLocation },
        normalized: { normalizedFrom, normalizedTo }
      });

      return await this.getRidesUniversal({
        fromLocation: normalizedFrom,
        toLocation: normalizedTo,
        status,
        maxResults: 50,
        radiusKm: 100
      });

    } catch (error) {
      console.error("❌ Erro em getRides:", error);
      throw error;
    }
  }

  // 🌍 BUSCA RIDES ENTRE DUAS CIDADES - CORRIGIDA
  async getRidesBetweenCities(fromCity: string, toCity: string, radiusKm: number = 100): Promise<any[]> {
    try {
      const normalizedFrom = await LocationNormalizerCorrigido.normalizeLocation(fromCity);
      const normalizedTo = await LocationNormalizerCorrigido.normalizeLocation(toCity);

      console.log('🎯 [NORMALIZAÇÃO-CORRIGIDA-CITIES]', {
        original: { from: fromCity, to: toCity },
        normalized: { from: normalizedFrom, to: normalizedTo },
        radius: radiusKm
      });

      return await this.getRidesUniversal({
        fromLocation: normalizedFrom,
        toLocation: normalizedTo,
        radiusKm,
        maxResults: 50
      });
    } catch (error) {
      console.error('❌ Erro em getRidesBetweenCities:', error);
      return [];
    }
  }

  // 🌍 BUSCA VIAGENS PRÓXIMAS AO USUÁRIO
  async findNearbyRides(
    lat: number, 
    lng: number, 
    radiusKm: number = 100,
    toLat?: number,
    toLng?: number
  ): Promise<any[]> {
    try {
      console.log('🧠 [NEARBY-RIDES] Busca por proximidade:', {
        lat, lng, radiusKm
      });

      return await this.getRidesUniversal({
        userLat: lat,
        userLng: lng,
        toLat,
        toLng,
        radiusKm,
        maxResults: 50
      });
    } catch (error) {
      console.error("❌ Erro em findNearbyRides:", error);
      throw error;
    }
  }

  // ✅✅✅ MÉTODO ESPECÍFICO PARA BUSCA SMART FINAL - CORRIGIDO COM FILTRO DE DIREÇÃO
  async searchRidesSmartFinal(params: {
    fromCity?: string;
    toCity?: string;
    fromLat?: number;
    fromLng?: number;
    toLat?: number;
    toLng?: number;
    date?: string;
    passengers?: number;
    radiusKm?: number;
    maxResults?: number;
  }): Promise<any[]> {
    try {
      const { 
        fromCity, 
        toCity, 
        fromLat, 
        fromLng, 
        toLat, 
        toLng, 
        date, 
        passengers = 1, 
        radiusKm = 100,
        maxResults = 50
      } = params;

      // ✅ VALIDAÇÃO CRÍTICA: Origem e destino obrigatórios
      if (!fromCity || !toCity) {
        console.error('❌ [DIRECTION-VALIDATION] Origem e destino são obrigatórios');
        return [];
      }

      console.log('🎯 [DIRECTION-SEARCH] Iniciando busca com direção:', {
        passageiro: `${fromCity} → ${toCity}`,
        date: date || 'Qualquer data',
        radiusKm,
        maxResults
      });

      // ✅ CORREÇÃO: Filtro de data UTC+2 para Moçambique
      let dateParams: any[] = [];
      
      if (date) {
        const searchDate = new Date(date);
        
        // Moçambique (UTC+2): dia começa às 22:00 UTC do dia anterior
        const startUTC = new Date(searchDate);
        startUTC.setUTCHours(22, 0, 0, 0);
        startUTC.setUTCDate(startUTC.getUTCDate() - 1);
        
        const endUTC = new Date(searchDate);
        endUTC.setUTCHours(21, 59, 59, 999);
        
        dateParams = [startUTC.toISOString(), endUTC.toISOString()];
        
        console.log('🔍 [DATE-FILTER] Filtro UTC+2 aplicado:', {
          dataBuscada: date,
          inicioUTC: startUTC.toISOString(),
          fimUTC: endUTC.toISOString()
        });
      }

      // ✅ NORMALIZAÇÃO MELHORADA
      const normalizedFrom = await LocationNormalizerCorrigido.normalizeLocation(fromCity);
      const normalizedTo = await LocationNormalizerCorrigido.normalizeLocation(toCity);

      console.log('📍 [NORMALIZATION] Localizações normalizadas:', {
        original: { from: fromCity, to: toCity },
        normalized: { from: normalizedFrom, to: normalizedTo }
      });

      // ✅✅✅ USAR A FUNÇÃO get_rides_smart_final DIRETAMENTE
      let result: any;
      
      try {
        if (date) {
          result = await db.execute(
            sql`SELECT * FROM get_rides_smart_final(
              ${normalizedFrom}, 
              ${normalizedTo}, 
              ${radiusKm},
              ${maxResults}
            ) WHERE departuredate >= ${dateParams[0]} AND departuredate <= ${dateParams[1]}`
          );
        } else {
          result = await db.execute(
            sql`SELECT * FROM get_rides_smart_final(
              ${normalizedFrom}, 
              ${normalizedTo}, 
              ${radiusKm},
              ${maxResults}
            )`
          );
        }
      } catch (error) {
        console.log('⚠️ [FUNCTION-FALLBACK] Função original falhou, usando busca direta');
        // Fallback para busca direta se a função não existir
        return await this.searchRidesDirectFallback(normalizedFrom, normalizedTo, radiusKm, maxResults);
      }

      // ✅ Extração segura dos resultados
      let rows: any[] = [];
      
      if (Array.isArray(result)) {
        rows = result;
      } else if (result && typeof result === 'object' && 'rows' in result) {
        rows = (result as any).rows;
      }

      console.log('🔍 [INITIAL-RESULTS] Resultados iniciais:', {
        busca: `${normalizedFrom} → ${normalizedTo}`,
        total: rows.length,
        resultados: rows.map(row => ({
          id: row.ride_id,
          ride: `${row.from_city} → ${row.to_city}`,
          match_type: row.match_type,
          direction_score: row.direction_score
        }))
      });

      // ✅✅✅ FILTRAGEM MANUAL POR DIREÇÃO (enquanto não temos a função corrigida)
      const filteredRows = rows.filter(row => {
        const rideFrom = (row.from_city || '').toLowerCase();
        const rideTo = (row.to_city || '').toLowerCase();
        const rideFromProvince = (row.from_province || '').toLowerCase();
        const rideToProvince = (row.to_province || '').toLowerCase();
        
        const searchFrom = normalizedFrom.toLowerCase();
        const searchTo = normalizedTo.toLowerCase();

        // ❌ REJEITAR SENTIDO OPOSTO
        const isOppositeDirection = 
          (rideFrom.includes(searchTo) || rideFromProvince.includes(searchTo)) &&
          (rideTo.includes(searchFrom) || rideToProvince.includes(searchFrom));
        
        if (isOppositeDirection) {
          console.log('❌ [DIRECTION-FILTER] Removendo ride sentido oposto:', {
            ride: `${rideFrom} → ${rideTo}`,
            search: `${searchFrom} → ${searchTo}`
          });
          return false;
        }

        // ✅ ACEITAR: mesma direção ou correspondência parcial
        const hasFromMatch = rideFrom.includes(searchFrom) || rideFromProvince.includes(searchFrom);
        const hasToMatch = rideTo.includes(searchTo) || rideToProvince.includes(searchTo);
        
        return hasFromMatch || hasToMatch;
      });

      console.log('🎯 [DIRECTION-FILTERED] Resultados após filtro de direção:', {
        original: rows.length,
        filtered: filteredRows.length,
        removed: rows.length - filteredRows.length
      });

      const normalizedRides = filteredRows.map(normalizeDbRideToDto);
      
      console.log(`✅ [SEARCH-SUCCESS] Busca concluída: ${normalizedRides.length} rides`, {
        parametros: { from: normalizedFrom, to: normalizedTo, date },
        resultados: normalizedRides.map(ride => ({
          id: ride.id,
          ride: `${ride.fromCity} → ${ride.toCity}`,
          price: ride.pricePerSeat,
          seats: ride.availableSeats,
          matchType: ride.matchType || 'manual_filter',
          directionScore: ride.direction_score
        }))
      });
      
      return normalizedRides;

    } catch (error) {
      console.error("❌ [SEARCH-ERROR] Erro na busca smart final:", error);
      
      // ✅ FALLBACK ROBUSTO
      try {
        const normalizedFrom = params.fromCity ? await LocationNormalizerCorrigido.normalizeLocation(params.fromCity) : '';
        const normalizedTo = params.toCity ? await LocationNormalizerCorrigido.normalizeLocation(params.toCity) : '';
        
        console.log('🔄 [FALLBACK] Usando busca direta como fallback');
        return await this.searchRidesDirectFallback(normalizedFrom, normalizedTo, params.radiusKm || 100, params.maxResults || 50);
      } catch (fallbackError) {
        console.error("❌ [FALLBACK-ERROR] Fallback também falhou:", fallbackError);
        return [];
      }
    }
  }

  // 🆕 MÉTODO DE FALLBACK DIRETO - USANDO DRIZZLE ORM
  async searchRidesDirectFallback(
    fromCity: string,
    toCity: string, 
    radiusKm: number = 100,
    maxResults: number = 50
  ): Promise<any[]> {
    try {
      console.log('🔧 [FALLBACK] Usando busca direta como fallback:', {
        fromCity,
        toCity,
        radiusKm,
        maxResults
      });

      // ✅ CORREÇÃO: Usar Drizzle ORM para queries SQL complexas
      const result = await db.execute(sql`
        SELECT 
          r.id as ride_id,
          r."driverId" as driver_id,
          u."firstName" || ' ' || u."lastName" as driver_name,
          r."fromAddress",
          r."toAddress", 
          r."fromCity",
          r."toCity",
          r."fromProvince",
          r."toProvince",
          r."fromLocality",
          r."toLocality",
          r."departureDate",
          r."departureTime",
          r."availableSeats",
          r."pricePerSeat",
          r."vehicleType",
          r."vehicleId",
          v."make" as vehicle_make,
          v."model" as vehicle_model,
          v."color" as vehicle_color,
          v."plate_number" as vehicle_plate,
          v."max_passengers" as vehicle_max_passengers,
          r.status
        FROM rides r
        LEFT JOIN users u ON r."driverId" = u.id
        LEFT JOIN vehicles v ON r."vehicleId" = v.id
        WHERE r.status = 'available'
        AND r."departureDate" >= NOW()
        AND (
          r."fromCity" ILIKE '%' || ${fromCity} || '%'
          OR r."toCity" ILIKE '%' || ${toCity} || '%'
          OR r."fromProvince" ILIKE '%' || ${fromCity} || '%'
          OR r."toProvince" ILIKE '%' || ${toCity} || '%'
        )
        ORDER BY 
          CASE 
            WHEN r."fromCity" ILIKE ${fromCity} AND r."toCity" ILIKE ${toCity} THEN 1
            WHEN r."fromCity" ILIKE ${fromCity} THEN 2
            WHEN r."toCity" ILIKE ${toCity} THEN 3
            ELSE 4
          END,
          r."departureDate"
        LIMIT ${maxResults}
      `);

      // ✅ Extração segura dos resultados
      let rows: any[] = [];
      
      if (Array.isArray(result)) {
        rows = result;
      } else if (result && typeof result === 'object' && 'rows' in result) {
        rows = (result as any).rows;
      }
      
      console.log('✅ [FALLBACK] Resultados da busca direta:', {
        fromCity,
        toCity,
        resultsCount: rows.length
      });

      return rows.map(normalizeDbRideToDto);

    } catch (error) {
      console.error("❌ Erro em searchRidesDirectFallback:", error);
      return [];
    }
  }

  // 🆕 MÉTODO SIMPLIFICADO PARA USAR A FUNÇÃO INTELIGENTE
  async searchRidesSmart(
    from: string = '',
    to: string = '',
    radiusKm: number = 100,
    maxResults: number = 50
  ): Promise<any[]> {
    try {
      console.log('🧠 [SMART-SEARCH] Busca inteligente simplificada:', {
        from,
        to,
        radiusKm,
        maxResults
      });

      return await this.searchRidesSmartFinal({
        fromCity: from,
        toCity: to,
        radiusKm,
        maxResults
      });
    } catch (error) {
      console.error("❌ Erro em searchRidesSmart:", error);
      return await this.searchRidesDirectFallback(from, to, radiusKm, maxResults);
    }
  }

  // ✅✅✅ MÉTODO getRideById CORRIGIDO
  async getRideById(id: string): Promise<any | null> {
    try {
      console.log('🔍 [RIDE-SERVICE] Buscando ride com ID:', id);
      
      const result = await db.execute(sql`
        SELECT 
          r.id as ride_id,
          r."driverId" as driver_id,
          r."driverName",
          r."fromAddress",
          r."toAddress", 
          r."fromCity",
          r."toCity",
          r."fromProvince",
          r."toProvince",
          r."fromLocality",
          r."toLocality",
          r."from_geom",
          r."to_geom",
          r."departureDate",
          r."departureTime",
          r."availableSeats",
          r."maxPassengers",
          r."pricePerSeat",
          r."vehicleType",
          r."vehicleId",
          r."additionalInfo",
          r."distance_real_km",
          r."polyline",
          r.status,
          r.type,
          r."createdAt",
          r."updatedAt",
          v."make" as vehicle_make,
          v."model" as vehicle_model,
          v."color" as vehicle_color,
          v."plate_number" as vehicle_plate,
          v."max_passengers" as vehicle_max_passengers
        FROM rides r
        LEFT JOIN vehicles v ON r."vehicleId" = v.id
        WHERE r.id = ${id}
      `);

      // ✅ Extração segura dos resultados
      let rows: any[] = [];
      
      if (Array.isArray(result)) {
        rows = result;
      } else if (result && typeof result === 'object' && 'rows' in result) {
        rows = (result as any).rows;
      }
      
      console.log('🔍 [RIDE-SERVICE] Resultado da query:', {
        idBuscado: id,
        rowsEncontradas: rows.length,
        primeiraRow: rows[0] ? { id: rows[0].ride_id, fromCity: rows[0].fromCity, toCity: rows[0].toCity } : 'Nenhuma'
      });
      
      if (rows.length === 0) {
        console.log('❌ [RIDE-SERVICE] Nenhuma ride encontrada com ID:', id);
        return null;
      }

      const normalizedRide = normalizeDbRideToDto(rows[0]);
      console.log('✅ [RIDE-SERVICE] Ride normalizada:', {
        id: normalizedRide.id,
        driverId: normalizedRide.driverId,
        fromTo: `${normalizedRide.fromCity} → ${normalizedRide.toCity}`
      });

      return normalizedRide;

    } catch (error) {
      console.error("❌ [RIDE-SERVICE] Erro em getRideById:", error);
      throw error;
    }
  }

  // 🆕 MÉTODO PARA BUSCAR RIDES POR MOTORISTA - CORRIGIDO (SEM COMENTÁRIOS SQL)
  async getRidesByDriver(driverId: string, status?: string): Promise<any[]> {
    try {
      // ✅ CORREÇÃO: Usar SQL direto para JOIN complexo - SEM COMENTÁRIOS
      let query = sql`
        SELECT 
          r.id as ride_id,
          r."driverId" as driver_id,
          r."driverName",
          r."fromAddress",
          r."toAddress", 
          r."fromCity",
          r."toCity",
          r."fromProvince",
          r."toProvince",
          r."fromLocality",
          r."toLocality",
          r."from_geom",
          r."to_geom",
          r."departureDate",
          r."departureTime",
          r."availableSeats",
          r."maxPassengers",
          r."pricePerSeat",
          r."vehicleType",
          r."vehicleId",
          r."additionalInfo",
          r."distance_real_km",
          r."polyline",
          r.status,
          r.type,
          r."createdAt",
          r."updatedAt",
          v."make" as vehicle_make,
          v."model" as vehicle_model,
          v."color" as vehicle_color,
          v."plate_number" as vehicle_plate,
          v."max_passengers" as vehicle_max_passengers
        FROM rides r
        LEFT JOIN vehicles v ON r."vehicleId" = v.id
        WHERE r."driverId" = ${driverId}
      `;

      if (status) {
        query = sql`${query} AND r.status = ${status}`;
      }

      query = sql`${query} ORDER BY r."departureDate" DESC`;

      const result = await db.execute(query);
      
      // ✅ Extração segura dos resultados
      let rows: any[] = [];
      
      if (Array.isArray(result)) {
        rows = result;
      } else if (result && typeof result === 'object' && 'rows' in result) {
        rows = (result as any).rows;
      }
      
      return rows.map(ride => normalizeDbRideToDto(ride));

    } catch (error) {
      console.error("❌ Erro em getRidesByDriver:", error);
      throw error;
    }
  }

  // 🆕 MÉTODO SIMPLES PARA TODOS OS RIDES DISPONÍVEIS
  async getAllAvailableRides(): Promise<any[]> {
    try {
      return await this.getRidesUniversal({
        maxResults: 100,
        radiusKm: 200
      });
    } catch (error) {
      console.error("❌ Erro em getAllAvailableRides:", error);
      throw error;
    }
  }

  // ✅✅✅ MÉTODO createRide CORRIGIDO
  async createRide(rideData: any): Promise<any> {
    try {
      console.log('🚗 [RIDE-SERVICE] Criando ride com dados:', {
        id: rideData.id, // ✅ VERIFICAR SE O ID ESTÁ SENDO RECEBIDO
        from: `${rideData.fromCity} → ${rideData.toCity}`,
        driverId: rideData.driverId
      });

      // ✅ CORREÇÃO CRÍTICA: Usar o ID fornecido ou gerar um novo
      const rideId = rideData.id || uuidv4();
      
      console.log('🎯 [RIDE-SERVICE] ID que será usado:', rideId);

      const finalData = {
        id: rideId, // ✅ GARANTIR que usa o ID correto
        driverId: rideData.driverId,
        driverName: rideData.driverName || 'Motorista',
        fromAddress: rideData.fromAddress,
        toAddress: rideData.toAddress,
        fromProvince: rideData.fromProvince,
        toProvince: rideData.toProvince,
        fromCity: rideData.fromCity,
        toCity: rideData.toCity,
        fromDistrict: rideData.fromDistrict || '',
        toDistrict: rideData.toDistrict || '',
        fromLocality: rideData.fromLocality || '',
        toLocality: rideData.toLocality || '',
        from_geom: rideData.from_geom || null,
        to_geom: rideData.to_geom || null,
        departureDate: rideData.departureDate,
        departureTime: rideData.departureTime,
        availableSeats: rideData.availableSeats,
        maxPassengers: rideData.maxPassengers || rideData.availableSeats,
        pricePerSeat: rideData.pricePerSeat.toString(),
        vehicleType: rideData.vehicleType,
        additionalInfo: rideData.additionalInfo || null,
        status: rideData.status || 'available',
        type: rideData.type || 'regular',
        vehicleId: rideData.vehicleId,
        distance_real_km: rideData.distance_real_km || null,
        polyline: rideData.polyline || null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      console.log('📦 [RIDE-SERVICE] Dados finais para inserção:', {
        id: finalData.id,
        fromTo: `${finalData.fromCity} → ${finalData.toCity}`,
        driverName: finalData.driverName
      });

      // ✅ CORREÇÃO: Inserir com o ID explícito
      const result = await db.insert(rides).values(finalData).returning();
      
      console.log('✅ [RIDE-SERVICE] Ride criada com sucesso:', {
        idInserido: result[0].id,
        idEsperado: rideId,
        idsIguais: result[0].id === rideId
      });

      // ✅ VERIFICAÇÃO DIRETA NO BANCO
      const directCheck = await db.select().from(rides).where(eq(rides.id, rideId));
      console.log('🔍 [RIDE-SERVICE] Verificação direta no banco:', {
        idBuscado: rideId,
        encontrada: directCheck.length > 0,
        idEncontrado: directCheck[0]?.id || 'NÃO ENCONTRADA'
      });

      if (directCheck.length === 0) {
        console.error('❌ [RIDE-SERVICE] Ride criada mas não encontrada no banco!');
        throw new Error(`Ride criada mas não encontrada: ${rideId}`);
      }

      // ✅ Buscar a ride completa
      const fullRide = await this.getRideById(rideId);
      
      if (!fullRide) {
        console.log('⚠️ [RIDE-SERVICE] getRideById retornou null, retornando dados básicos');
        // ✅ FALLBACK: Retornar dados básicos
        return {
          id: rideId,
          driverId: rideData.driverId,
          driverName: rideData.driverName || 'Motorista',
          fromAddress: rideData.fromAddress,
          toAddress: rideData.toAddress,
          fromCity: rideData.fromCity,
          toCity: rideData.toCity,
          fromProvince: rideData.fromProvince,
          toProvince: rideData.toProvince,
          departureDate: rideData.departureDate,
          departureTime: rideData.departureTime,
          availableSeats: rideData.availableSeats,
          pricePerSeat: rideData.pricePerSeat,
          vehicleType: rideData.vehicleType,
          status: 'available',
          vehicleId: rideData.vehicleId,
          maxPassengers: rideData.maxPassengers || rideData.availableSeats
        };
      }

      return fullRide;

    } catch (error) {
      console.error('❌ [RIDE-SERVICE] Erro ao criar ride:', error);
      throw error;
    }
  }

  // 🆕 MÉTODO PARA ATUALIZAR RIDE - CORRIGIDO
  async updateRide(id: string, rideData: Partial<CreateRideBaseData> & {
    distance_real_km?: number;
    polyline?: string;
    [key: string]: any;
  }): Promise<any | null> {
    try {
      const updateData: any = { 
        ...rideData, 
        updatedAt: new Date() 
      };
      
      // ✅ CORREÇÃO: Remover campos undefined
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      // ✅✅✅ CORREÇÃO CRÍTICA: Converter campos decimal para string
      if (updateData.pricePerSeat !== undefined) {
        updateData.pricePerSeat = updateData.pricePerSeat.toString();
      }
      
      if (updateData.distance_real_km !== undefined) {
        updateData.distance_real_km = updateData.distance_real_km.toString();
      }
      
      // ✅ CORREÇÃO: Normalizar campos de localização
      const locationFields = [
        'fromProvince', 'toProvince', 'fromCity', 'toCity', 
        'fromDistrict', 'toDistrict', 'fromLocality', 'toLocality'
      ] as const;
      
      locationFields.forEach(field => {
        if (updateData[field] !== undefined && updateData[field] !== null) {
          updateData[field] = this.normalizeString(updateData[field]);
        }
      });

      const [updatedRide] = await db.update(rides)
        .set(updateData)
        .where(eq(rides.id, id))
        .returning();

      if (!updatedRide) return null;

      console.log('✅ Ride atualizado com sucesso:', { id, updatedFields: Object.keys(updateData) });

      // ✅ CORREÇÃO: Buscar dados completos com informações do veículo
      return await this.getRideById(id);

    } catch (error) {
      console.error("❌ Erro em updateRide:", error);
      throw error;
    }
  }

  // 🆕 MÉTODO PARA DELETAR RIDE
  async deleteRide(id: string): Promise<boolean> {
    try {
      const [deleted] = await db.delete(rides)
        .where(eq(rides.id, id))
        .returning();
      
      return !!deleted;

    } catch (error) {
      console.error("❌ Erro em deleteRide:", error);
      throw error;
    }
  }

  // 🔄 MÉTODOS AUXILIARES PRIVADOS
  private async getRidesByIds(ids: string[]): Promise<any[]> {
    if (ids.length === 0) return [];
    
    try {
      // ✅ CORREÇÃO: Usar SQL direto para JOIN complexo - SEM COMENTÁRIOS
      const result = await db.execute(sql`
        SELECT 
          r.id as ride_id,
          r."driverId" as driver_id,
          r."driverName",
          r."fromAddress",
          r."toAddress", 
          r."fromCity",
          r."toCity",
          r."fromProvince",
          r."toProvince",
          r."fromLocality",
          r."toLocality",
          r."from_geom",
          r."to_geom",
          r."departureDate",
          r."departureTime",
          r."availableSeats",
          r."maxPassengers",
          r."pricePerSeat",
          r."vehicleType",
          r."vehicleId",
          r."additionalInfo",
          r."distance_real_km",
          r."polyline",
          r.status,
          r.type,
          r."createdAt",
          r."updatedAt",
          v."make" as vehicle_make,
          v."model" as vehicle_model,
          v."color" as vehicle_color,
          v."plate_number" as vehicle_plate,
          v."max_passengers" as vehicle_max_passengers
        FROM rides r
        LEFT JOIN vehicles v ON r."vehicleId" = v.id
        WHERE r.id IN (${sql.raw(ids.map(id => `'${id}'`).join(', '))})
      `);
      
      // ✅ Extração segura dos resultados
      let rows: any[] = [];
      
      if (Array.isArray(result)) {
        rows = result;
      } else if (result && typeof result === 'object' && 'rows' in result) {
        rows = (result as any).rows;
      }
      
      return rows.map(ride => normalizeDbRideToDto(ride));
    } catch (error) {
      console.error("❌ Erro em getRidesByIds:", error);
      return [];
    }
  }

  private normalizeString(str: string): string {
    if (!str) return '';
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }
}

export const rideService = new RideService();