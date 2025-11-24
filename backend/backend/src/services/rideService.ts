import { db } from "../../db";
import { rides, type Ride } from "../../shared/schema";
import { eq, and, sql, inArray } from "drizzle-orm";

// ✅ MAPEAMENTO PARA TIPOS DE VEÍCULO
const VEHICLE_TYPE_DISPLAY: Record<string, { label: string; icon: string }> = {
  economy: { label: 'Económico', icon: '🚗' },
  comfort: { label: 'Conforto', icon: '🚙' },
  luxury: { label: 'Luxo', icon: '🏎️' },
  family: { label: 'Familiar', icon: '🚐' },
  cargo: { label: 'Carga', icon: '🚚' },
  motorcycle: { label: 'Moto', icon: '🏍️' }
};

// ✅ INTERFACE CORRIGIDA COM NOVOS CAMPOS
interface RideWithCompatibility {
  id: string;
  driverId: string;
  driverName?: string;
  driverRating?: number;
  vehicleInfo?: {
    make: string;
    model: string;
    type: string;
    typeDisplay: string;
    typeIcon: string;
    plate: string;
    color: string;
    maxPassengers: number;
  };
  fromAddress: string;
  toAddress: string;
  fromProvince?: string;
  toProvince?: string;
  fromCity?: string;
  toCity?: string;
  fromDistrict?: string;
  toDistrict?: string;
  fromLocality?: string;
  toLocality?: string;
  departureDate: Date;
  departureTime: string;
  departureDateFormatted?: string;
  availableSeats: number;
  pricePerSeat: number | string;
  vehicleType?: string;
  status?: string;
  
  match_type?: string;
  route_compatibility?: number;
  dist_from_user_km?: number;
  
  search_metadata?: {
    original_search: { from: string; to: string };
    normalized_search: { from: string; to: string };
    normalization_applied?: boolean;
    fallback_used?: boolean;
    function_used?: string;
  };
  
  createdAt?: Date;
  updatedAt?: Date;
  maxPassengers?: number;
  additionalInfo?: string;
  type?: string;
  from_geom?: any;
  to_geom?: any;
  distance_real_km?: number | string | null;
  polyline?: any;
}

// ✅✅✅ FUNÇÃO DE CONVERSÃO COMPLETAMENTE CORRIGIDA COM NOVOS DADOS
export function toRideWithCompatibility(ride: any): RideWithCompatibility {
  console.log('🔧 [CONVERSION-DEBUG] Convertendo ride:', {
    rideId: ride.ride_id || ride.id,
    hasDriverName: !!ride.driver_name,
    hasDriverRating: !!ride.driver_rating,
    hasVehicleMake: !!ride.vehicle_make,
    hasVehicleModel: !!ride.vehicle_model,
    hasVehicleType: !!ride.vehicle_type,
    hasVehiclePlate: !!ride.vehicle_plate,
    hasVehicleColor: !!ride.vehicle_color,
    hasMaxPassengers: !!ride.max_passengers,
    rawRide: ride
  });

  // ✅ CORREÇÃO CRÍTICA: Mapeamento correto dos campos do PostgreSQL
  const pricePerSeat = ride.priceperseat || ride.pricePerSeat || '0';
  const availableSeats = ride.availableseats || ride.availableSeats || 0;
  const departureDate = ride.departuredate || ride.departureDate;
  const fromCity = ride.from_city || ride.fromCity || '';
  const toCity = ride.to_city || ride.toCity || '';
  const fromAddress = ride.from_address || ride.fromAddress || fromCity;
  const toAddress = ride.to_address || ride.toAddress || toCity;
  const distanceRealKm = ride.distance_real_km;

  // ✅ NOVOS CAMPOS: Dados do motorista e veículo
  const driverName = ride.driver_name || ride.driverName || 'Motorista';
  const driverRating = ride.driver_rating || ride.driverRating || 4.5;
  const vehicleMake = ride.vehicle_make || '';
  const vehicleModel = ride.vehicle_model || 'Veículo';
  const vehicleType = ride.vehicle_type || ride.vehicleType || 'economy';
  const vehiclePlate = ride.vehicle_plate || 'Não informada';
  const vehicleColor = ride.vehicle_color || 'Não informada';
  const maxPassengers = ride.max_passengers || ride.maxPassengers || 4;

  // ✅ MAPEAMENTO PARA EXIBIÇÃO AMIGÁVEL
  const typeInfo = VEHICLE_TYPE_DISPLAY[vehicleType] || VEHICLE_TYPE_DISPLAY.economy;
  
  const departureDateObj = departureDate ? new Date(departureDate) : new Date();
  
  const convertedRide = {
    id: ride.ride_id || ride.id,
    driverId: ride.driver_id || ride.driverId,
    
    // ✅ NOVOS CAMPOS: Dados do motorista
    driverName: driverName,
    driverRating: typeof driverRating === 'string' ? parseFloat(driverRating) : driverRating,
    
    // ✅ NOVOS CAMPOS: Dados completos do veículo
    vehicleInfo: {
      make: vehicleMake,
      model: vehicleModel,
      type: vehicleType,
      typeDisplay: typeInfo.label,
      typeIcon: typeInfo.icon,
      plate: vehiclePlate,
      color: vehicleColor,
      maxPassengers: typeof maxPassengers === 'string' ? parseInt(maxPassengers) : maxPassengers
    },
    
    // Campos de localização
    fromAddress: fromAddress,
    toAddress: toAddress,
    fromCity: fromCity,
    toCity: toCity,
    fromProvince: ride.from_province || ride.fromProvince || '',
    toProvince: ride.to_province || ride.toProvince || '',
    fromDistrict: ride.from_district || ride.fromDistrict || '',
    toDistrict: ride.to_district || ride.toDistrict || '',
    fromLocality: ride.from_locality || ride.fromLocality || '',
    toLocality: ride.to_locality || ride.toLocality || '',
    
    // ✅ CORREÇÃO CRÍTICA: Data e hora corretas
    departureDate: departureDateObj,
    departureTime: ride.departure_time || ride.departureTime || '08:00',
    departureDateFormatted: departureDateObj.toLocaleDateString('pt-MZ'),
    
    // ✅ CORREÇÃO CRÍTICA: Campos numéricos corretos
    availableSeats: typeof availableSeats === 'string' ? parseInt(availableSeats) : availableSeats,
    pricePerSeat: typeof pricePerSeat === 'string' ? parseFloat(pricePerSeat) : pricePerSeat,
    vehicleType: vehicleType,
    status: ride.status || 'available',
    
    // Campos de matching
    match_type: ride.match_type || 'smart_match',
    route_compatibility: ride.route_compatibility || 85,
    dist_from_user_km: ride.dist_from_user_km || ride.distance_from_city_km || 0,
    distance_real_km: distanceRealKm ? 
      (typeof distanceRealKm === 'string' ? parseFloat(distanceRealKm) : distanceRealKm) : 
      null,
    
    // Campos opcionais
    createdAt: ride.createdAt,
    updatedAt: ride.updatedAt,
    maxPassengers: typeof maxPassengers === 'string' ? parseInt(maxPassengers) : maxPassengers,
    additionalInfo: ride.additional_info || ride.additionalInfo,
    type: ride.type,
    from_geom: ride.from_geom,
    to_geom: ride.to_geom,
    polyline: ride.polyline,
    
    // Metadata de busca
    search_metadata: ride.search_metadata || {
      original_search: { from: '', to: '' },
      normalized_search: { from: '', to: '' }
    }
  };

  console.log('✅ [CONVERSION-DEBUG] Ride convertido com dados completos:', {
    rideId: convertedRide.id,
    driverName: convertedRide.driverName,
    driverRating: convertedRide.driverRating,
    vehicle: `${convertedRide.vehicleInfo.make} ${convertedRide.vehicleInfo.model}`,
    vehicleType: convertedRide.vehicleInfo.typeDisplay,
    price: convertedRide.pricePerSeat,
    availableSeats: convertedRide.availableSeats
  });

  return convertedRide;
}

// ✅ INTERFACE PARA RESULTADO DA NORMALIZAÇÃO
interface NormalizationResult {
  normalized: string;
}

// ✅ NORMALIZADOR CORRIGIDO COM TIPAGEM SEGURA
class LocationNormalizerCorrigido {
  static async normalizeLocation(locationName: string): Promise<string> {
    if (!locationName || locationName.trim() === '') {
      return locationName;
    }

    try {
      console.log('🔍 [NORMALIZADOR] Normalizando:', locationName);
      
      const result = await db.execute<NormalizationResult>(sql`
        SELECT normalize_location_name(${locationName}) as normalized
      `);

      // ✅ CORREÇÃO: Extrair resultado de forma tipada e segura
      let normalizedValue: string;
      
      if (Array.isArray(result) && result.length > 0) {
        // Caso 1: Resultado é array direto
        normalizedValue = (result[0] as NormalizationResult)?.normalized;
      } else if (result && typeof result === 'object' && 'rows' in result) {
        // Caso 2: Resultado tem propriedade rows (Drizzle)
        const rows = (result as any).rows as NormalizationResult[];
        normalizedValue = rows[0]?.normalized;
      } else if (result && typeof result === 'object') {
        // Caso 3: Resultado é objeto genérico
        const values = Object.values(result);
        normalizedValue = (values[0] as NormalizationResult)?.normalized;
      } else {
        // Fallback seguro
        normalizedValue = locationName.split(',')[0].trim().toLowerCase();
      }

      // Fallback final se ainda estiver undefined
      if (!normalizedValue) {
        normalizedValue = locationName.split(',')[0].trim().toLowerCase();
      }

      console.log('✅ [NORMALIZADOR] Resultado:', {
        original: locationName,
        normalized: normalizedValue
      });

      return normalizedValue;

    } catch (error) {
      console.error('❌ [NORMALIZADOR] Erro, usando fallback:', error);
      // Fallback conservador: pega apenas a primeira palavra antes da vírgula
      return locationName.split(',')[0].trim().toLowerCase();
    }
  }

  // Método de compatibilidade para não quebrar código existente
  static normalizeForSearch(locationName: string): string {
    console.warn('⚠️ [NORMALIZADOR] Usando normalizeForSearch síncrono - considere usar normalizeLocation assíncrono');
    return locationName.split(',')[0].trim().toLowerCase();
  }
}

export class RideService {
  
  // 🎯 MÉTODO UNIVERSAL CENTRALIZADO - CORRIGIDO
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
  }): Promise<RideWithCompatibility[]> {
    try {
      const {
        fromLocation,
        toLocation,
        userLat,
        userLng,
        toLat,
        toLng,
        radiusKm = 100,
        maxResults = 20,
      } = params;

      // ✅ CORREÇÃO CRÍTICA: Usar normalizador assíncrono do PostgreSQL
      const normalizedFrom = fromLocation ? await LocationNormalizerCorrigido.normalizeLocation(fromLocation) : '';
      const normalizedTo = toLocation ? await LocationNormalizerCorrigido.normalizeLocation(toLocation) : '';

      console.log('🎯 [NORMALIZAÇÃO-CORRIGIDA]', {
        original: { from: fromLocation, to: toLocation },
        normalized: { from: normalizedFrom, to: normalizedTo },
        radius: radiusKm
      });

      const result = await db.execute(sql`
        SELECT * FROM get_rides_smart_final(
          ${normalizedFrom || ''},
          ${normalizedTo || ''},  
          ${radiusKm}
        );
      `);

      // ✅✅✅ CORREÇÃO CRÍTICA: INTERPRETAR CORRETAMENTE O RESULTADO
      console.log('🔍 [SMART-SERVICE] Resultado bruto completo:', result);
      
      let rows: any[] = [];
      
      if (Array.isArray(result)) {
        rows = result;
      } else if (result && Array.isArray((result as any).rows)) {
        rows = (result as any).rows;
      } else if (result && typeof result === 'object') {
        // Extrai todas as propriedades que são arrays
        const arrayProperties = Object.values(result).filter(val => Array.isArray(val));
        if (arrayProperties.length > 0) {
          rows = arrayProperties[0] as any[];
        }
      }
      
      console.log('✅ [SMART-SERVICE] Resultados processados:', {
        totalEncontrado: rows.length,
        primeiroResultado: rows[0] || 'Nenhum'
      });

      const transformedRides = rows.slice(0, maxResults).map((ride: any) => 
        toRideWithCompatibility({
          ...ride,
          search_metadata: {
            original_search: { from: fromLocation || '', to: toLocation || '' },
            normalized_search: { from: normalizedFrom, to: normalizedTo },
            normalization_applied: fromLocation !== normalizedFrom || toLocation !== normalizedTo
          }
        })
      );

      // ✅ TESTE DE VERIFICAÇÃO DA CONVERSÃO
      console.log('🎯 [CONVERSION-VERIFICATION] Verificação final:', {
        inputRides: rows.length,
        outputRides: transformedRides.length,
        sampleInput: rows[0],
        sampleOutput: transformedRides[0],
        conversionIssues: transformedRides.filter(ride => 
          !ride.departureDate || 
          ride.availableSeats === 0 || 
          ride.pricePerSeat === 0
        ).length
      });
      
      return transformedRides;

    } catch (error) {
      console.error("❌ Erro em getRidesUniversal:", error);
      return [];
    }
  }

  // 🔍 BUSCA TRADICIONAL POR TEXTO - CORRIGIDA
  async findRidesExact(fromLocation: string, toLocation: string): Promise<RideWithCompatibility[]> {
    try {
      // ✅ CORREÇÃO: Usar normalizador assíncrono
      const normalizedFrom = await LocationNormalizerCorrigido.normalizeLocation(fromLocation);
      const normalizedTo = await LocationNormalizerCorrigido.normalizeLocation(toLocation);

      console.log('🔍 [FIND-EXACT] Busca exata normalizada:', {
        original: { from: fromLocation, to: toLocation },
        normalized: { from: normalizedFrom, to: normalizedTo }
      });

      return await this.getRidesUniversal({
        fromLocation: normalizedFrom,
        toLocation: normalizedTo,
        maxResults: 10
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
  ): Promise<RideWithCompatibility[]> {
    try {
      console.log('🧠 [FIND-SMART] Busca inteligente:', {
        from: passengerFrom,
        to: passengerTo,
        fromProvince: passengerFromProvince,
        toProvince: passengerToProvince
      });

      // ✅ CORREÇÃO: Usar normalizador assíncrono
      const normalizedFrom = await LocationNormalizerCorrigido.normalizeLocation(passengerFrom);
      const normalizedTo = await LocationNormalizerCorrigido.normalizeLocation(passengerTo);

      return await this.getRidesUniversal({
        fromLocation: normalizedFrom,
        toLocation: normalizedTo,
        maxResults: 20,
        radiusKm: 100
      });
    } catch (error) {
      console.error("❌ Erro em findSmartRides:", error);
      
      // ✅ CORREÇÃO: Usar normalizador assíncrono no fallback também
      const normalizedFrom = await LocationNormalizerCorrigido.normalizeLocation(passengerFrom);
      const normalizedTo = await LocationNormalizerCorrigido.normalizeLocation(passengerTo);
      
      return await this.getRidesUniversal({
        fromLocation: normalizedFrom,
        toLocation: normalizedTo,
        maxResults: 20
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
  ): Promise<RideWithCompatibility[]> {
    try {
      // ✅ CORREÇÃO: Usar normalizador assíncrono
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
        maxResults: options?.maxResults || 20
      });
    } catch (error) {
      console.error("❌ Erro em searchRidesHybrid:", error);
      
      // ✅ CORREÇÃO: Usar normalizador assíncrono no fallback
      const normalizedFrom = await LocationNormalizerCorrigido.normalizeLocation(fromLocation);
      const normalizedTo = await LocationNormalizerCorrigido.normalizeLocation(toLocation);
      
      return await this.getRidesUniversal({
        fromLocation: normalizedFrom,
        toLocation: normalizedTo,
        maxResults: options?.maxResults || 20
      });
    }
  }

  // 🎯 BUSCA BÁSICA - CORRIGIDA
  async getRides(filters: { 
    fromLocation?: string; 
    toLocation?: string;
    status?: string;
  } = {}): Promise<RideWithCompatibility[]> {
    try {
      const { fromLocation, toLocation, status } = filters;
      
      // ✅ CORREÇÃO: Usar normalizador assíncrono
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
  async getRidesBetweenCities(fromCity: string, toCity: string, radiusKm: number = 100): Promise<RideWithCompatibility[]> {
    try {
      // ✅ CORREÇÃO: Usar normalizador assíncrono
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
  ): Promise<RideWithCompatibility[]> {
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

  // 🆕 MÉTODO ESPECÍFICO PARA BUSCA SMART FINAL - CORRIGIDO
  async searchRidesSmartFinal(
    fromCity: string,
    toCity: string, 
    radiusKm: number = 100
  ): Promise<RideWithCompatibility[]> {
    try {
      // ✅ CORREÇÃO CRÍTICA: Usar normalizador assíncrono
      const normalizedFrom = await LocationNormalizerCorrigido.normalizeLocation(fromCity);
      const normalizedTo = await LocationNormalizerCorrigido.normalizeLocation(toCity);

      console.log('🎯 [NORMALIZAÇÃO-CORRIGIDA-SMART-FINAL]', {
        original: { from: fromCity, to: toCity },
        normalized: { from: normalizedFrom, to: normalizedTo }
      });

      const result = await db.execute(sql`
        SELECT * FROM get_rides_smart_final(
          ${normalizedFrom},
          ${normalizedTo}, 
          ${radiusKm}
        );
      `);

      // ✅✅✅ CORREÇÃO CRÍTICA: INTERPRETAR CORRETAMENTE O RESULTADO
      console.log('🔍 [SERVICE-DEBUG-CRITICAL] Resultado bruto completo:', result);
      
      let rows: any[] = [];
      
      if (Array.isArray(result)) {
        rows = result;
      } else if (result && Array.isArray((result as any).rows)) {
        rows = (result as any).rows;
      } else if (result && typeof result === 'object') {
        // Extrai todas as propriedades que são arrays
        const arrayProperties = Object.values(result).filter(val => Array.isArray(val));
        if (arrayProperties.length > 0) {
          rows = arrayProperties[0] as any[];
        }
      }
      
      console.log('✅ [SERVICE-DEBUG-CRITICAL] Resultados processados:', {
        totalEncontrado: rows.length,
        primeiroResultado: rows[0] || 'Nenhum'
      });

      const transformedRides = rows.map((ride: any) => {
        return toRideWithCompatibility({
          ...ride,
          search_metadata: {
            original_search: { from: fromCity, to: toCity },
            normalized_search: { from: normalizedFrom, to: normalizedTo },
            function_used: 'get_rides_smart_final'
          }
        });
      });

      // ✅ VERIFICAÇÃO CRÍTICA DA CONVERSÃO
      console.log('🎉 [SERVICE-DEBUG-CRITICAL] Busca BEM-SUCEDIDA:', {
        normalizedFrom,
        normalizedTo, 
        resultados: transformedRides.length,
        amostra: transformedRides[0] || 'Nenhum',
        conversionIssues: transformedRides.filter(ride => 
          !ride.departureDate || 
          ride.availableSeats === 0 || 
          ride.pricePerSeat === 0
        ).length
      });

      return transformedRides;

    } catch (error) {
      console.error("❌ [SERVICE-DEBUG-CRITICAL] ERRO:", error);
      return [];
    }
  }

  // 🆕 MÉTODO DE FALLBACK DIRETO
  async searchRidesDirectFallback(
    fromCity: string,
    toCity: string, 
    radiusKm: number = 100
  ): Promise<RideWithCompatibility[]> {
    try {
      console.log('🔧 [FALLBACK] Usando busca direta como fallback:', {
        fromCity,
        toCity,
        radiusKm
      });

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
          r."departureDate",
          r."departureTime",
          r."availableSeats",
          r."pricePerSeat",
          r."vehicleType",
          r.status
        FROM rides r
        LEFT JOIN users u ON r."driverId" = u.id
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
        LIMIT 20
      `);

      const rows = (result as any).rows || [];
      console.log('✅ [FALLBACK] Resultados da busca direta:', {
        fromCity,
        toCity,
        resultsCount: rows.length
      });

      return rows.map((ride: any) => 
        toRideWithCompatibility({
          ...ride,
          search_metadata: {
            original_search: { from: fromCity, to: toCity },
            fallback_used: true,
            function_used: 'direct_fallback'
          }
        })
      );

    } catch (error) {
      console.error("❌ Erro em searchRidesDirectFallback:", error);
      return [];
    }
  }

  // 🆕 MÉTODO PARA OBTER RIDE POR ID
  async getRideById(id: string): Promise<RideWithCompatibility | null> {
    try {
      const [ride] = await db.select()
        .from(rides)
        .where(eq(rides.id, id));
      
      if (!ride) return null;

      return toRideWithCompatibility(ride);

    } catch (error) {
      console.error("❌ Erro em getRideById:", error);
      throw error;
    }
  }

  // 🆕 MÉTODO PARA BUSCAR RIDES POR MOTORISTA
  async getRidesByDriver(driverId: string, status?: string): Promise<RideWithCompatibility[]> {
    try {
      let query = db.select().from(rides);
      const conditions = [eq(rides.driverId, driverId)];
      
      if (status) {
        conditions.push(eq(rides.status, status as any));
      }
      
      const result = await query.where(and(...conditions));
      
      return result.map(ride => toRideWithCompatibility(ride));

    } catch (error) {
      console.error("❌ Erro em getRidesByDriver:", error);
      throw error;
    }
  }

  // 🆕 MÉTODO SIMPLES PARA TODOS OS RIDES DISPONÍVEIS
  async getAllAvailableRides(): Promise<RideWithCompatibility[]> {
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

  // 🆕 MÉTODO PARA CRIAR RIDE
  async createRide(rideData: Omit<Ride, 'id' | 'createdAt' | 'updatedAt'>): Promise<RideWithCompatibility> {
    try {
      const normalizedRideData = {
        ...rideData,
        pricePerSeat: rideData.pricePerSeat.toString(),
        fromProvince: this.normalizeString(rideData.fromProvince || ''),
        toProvince: this.normalizeString(rideData.toProvince || ''),
        fromCity: this.normalizeString(rideData.fromCity || ''),
        toCity: this.normalizeString(rideData.toCity || ''),
        fromLocality: this.normalizeString(rideData.fromLocality || ''),
        toLocality: this.normalizeString(rideData.toLocality || ''),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const [newRide] = await db.insert(rides)
        .values(normalizedRideData)
        .returning();

      return toRideWithCompatibility(newRide);

    } catch (error) {
      console.error("❌ Erro em createRide:", error);
      throw error;
    }
  }

  // 🆕 MÉTODO PARA ATUALIZAR RIDE
  async updateRide(id: string, rideData: Partial<Omit<Ride, 'id' | 'createdAt' | 'updatedAt'>>): Promise<RideWithCompatibility | null> {
    try {
      const updateData: any = { 
        ...rideData, 
        updatedAt: new Date() 
      };
      
      if (updateData.pricePerSeat !== undefined) {
        updateData.pricePerSeat = updateData.pricePerSeat.toString();
      }
      
      const locationFields = [
        'fromProvince', 'toProvince', 'fromCity', 'toCity', 
        'fromLocality', 'toLocality'
      ] as const;
      
      locationFields.forEach(field => {
        if (updateData[field] !== undefined && updateData[field] !== null) {
          updateData[field] = this.normalizeString(updateData[field]);
        }
      });
      
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      const [updatedRide] = await db.update(rides)
        .set(updateData)
        .where(eq(rides.id, id))
        .returning();

      if (!updatedRide) return null;

      return toRideWithCompatibility(updatedRide);

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
  private async getRidesByIds(ids: string[]): Promise<RideWithCompatibility[]> {
    if (ids.length === 0) return [];
    
    try {
      const result = await db.select()
        .from(rides)
        .where(inArray(rides.id, ids));
      
      return result.map(ride => toRideWithCompatibility(ride));
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