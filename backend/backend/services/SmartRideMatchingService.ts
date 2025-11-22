import { db } from "../db";
import { sql } from "drizzle-orm";

// 🎯 INTERFACE PARA O RESULTADO DO SMART MATCHING (CORRIGIDA)
export interface RideWithMatching {
  ride: any;
  compatibilityScore: number;
  matchType: string;
  matchDescription: string;
  isExactMatch: boolean;
  routeCompatibility: number;
  detectedFromProvince?: string;
  detectedToProvince?: string;
  passengerFromProvince?: string;
  passengerToProvince?: string;
  
  id?: string;
  fromAddress?: string;
  toAddress?: string;
  fromProvince?: string;
  toProvince?: string;
  pricePerSeat?: number;
  availableSeats?: number;
  departureDate?: Date;
  vehicleType?: string;
  status?: string;
}

// 🎯 INTERFACE COMPATÍVEL PARA RIDES
export interface RideWithDetails {
  id: string;
  driverId: string;
  driverName?: string;
  fromLocation: string;
  toLocation: string;
  fromAddress?: string;
  toAddress?: string;
  fromProvince?: string;
  toProvince?: string;
  price: number;
  pricePerSeat?: number;
  availableSeats: number;
  maxPassengers: number;
  departureDate: Date;
  estimatedDuration?: number;
  estimatedDistance?: number;
  vehicleType?: string;
  vehicleInfo?: string;
  vehicleFeatures?: string[];
  driverRating?: number;
  allowNegotiation?: boolean;
  isVerifiedDriver?: boolean;
  status: string;
  matchScore?: number;
  matchType?: string;
  matchDescription?: string;
  route_compatibility?: number;
}

export class SmartRideMatchingService {
  private static readonly PROVINCE_ORDER: { [key: string]: number } = {
    'maputo': 1,
    'cidade de maputo': 1,
    'gaza': 2,
    'inhambane': 3,
    'sofala': 4,
    'manica': 5,
    'tete': 6,
    'zambezia': 7,
    'nampula': 8,
    'cabo delgado': 9,
    'niassa': 10
  };

  private static normalizeText(text: string): string {
    if (!text) return '';
    
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .trim();
  }

  // ✅ CORREÇÃO: Função auxiliar para extrair resultados do Drizzle de forma segura
  private static extractRows(result: any): any[] {
    if (Array.isArray(result)) {
      return result;
    } else if (result && Array.isArray((result as any).rows)) {
      return (result as any).rows;
    } else if (result && typeof result === 'object') {
      // Extrai todas as propriedades que são arrays
      const arrayProperties = Object.values(result).filter(val => Array.isArray(val));
      return arrayProperties.length > 0 ? arrayProperties[0] as any[] : [];
    }
    return [];
  }

  static async detectProvinceFromDatabase(address: string = ''): Promise<string> {
    if (!address) return 'desconhecido';

    try {
      const normalizedAddress = this.normalizeText(address);
      
      const result = await db.execute(sql`
        SELECT province 
        FROM province_ordering 
        WHERE province ILIKE ${`%${normalizedAddress}%`}
        LIMIT 1
      `);
      
      const rows = this.extractRows(result);
      const province = rows[0]?.province;
      return province ? this.normalizeText(province) : 'desconhecido';
    } catch (error) {
      console.warn('❌ [PROVINCE-DB] Erro ao buscar província no banco, usando detecção local:', error);
      return this.detectProvince(address);
    }
  }

  static detectProvince(address: string = ''): string {
    if (!address) return 'desconhecido';

    const normalized = this.normalizeText(address);

    const locationMap: Record<string, string> = {
      'matola': 'maputo', 'boane': 'maputo', 'moamba': 'maputo', 'marracuene': 'maputo',
      'cidade da matola': 'maputo', 'cidade de maputo': 'maputo',
      
      'xai xai': 'gaza', 'bilene': 'gaza', 'chibuto': 'gaza', 'chokwe': 'gaza',
      'manjacaze': 'gaza', 'massingir': 'gaza', 'massangena': 'gaza',
      
      'inharrime': 'inhambane', 'vilanculos': 'inhambane', 'maxixe': 'inhambane',
      'panda': 'inhambane', 'funhalouro': 'inhambane', 'homoine': 'inhambane',
      
      'beira': 'sofala', 'dondo': 'sofala', 'buzi': 'sofala', 'caia': 'sofala',
      'chemba': 'sofala', 'cheringoma': 'sofala', 'gorongosa': 'sofala', 'marromeu': 'sofala',
      'maringue': 'sofala', 'muanza': 'sofala', 'nhamatanda': 'sofala',
      
      'chimoio': 'manica', 'gondola': 'manica', 'barue': 'manica', 'guro': 'manica',
      'macate': 'manica', 'machaze': 'manica', 'macossa': 'manica', 'manica': 'manica',
      'mossurize': 'manica', 'sussundenga': 'manica', 'tambara': 'manica',
      
      'tete': 'tete', 'ulongue': 'tete', 'angonia': 'tete', 'cahora bassa': 'tete',
      'changara': 'tete', 'chifunde': 'tete', 'chiuta': 'tete', 'doa': 'tete',
      'macanga': 'tete', 'mague': 'tete', 'maravia': 'tete', 'moatize': 'tete',
      'mutarara': 'tete', 'tsangano': 'tete', 'zumbo': 'tete',
      
      'quelimane': 'zambezia', 'gurue': 'zambezia', 'alto molocue': 'zambezia',
      'chinde': 'zambezia', 'derre': 'zambezia', 'gile': 'zambezia', 'ile': 'zambezia',
      'inhassunge': 'zambezia', 'lugela': 'zambezia', 'maganja da costa': 'zambezia',
      'milange': 'zambezia', 'mocuba': 'zambezia', 'mopeia': 'zambezia', 'morrumbala': 'zambezia',
      'mulevala': 'zambezia', 'namacurra': 'zambezia', 'namarroi': 'zambezia', 'nicoadala': 'zambezia',
      'pebane': 'zambezia',
      
      'nampula': 'nampula', 'angoche': 'nampula', 'mogincual': 'nampula',
      'mogovolas': 'nampula', 'moma': 'nampula', 'monapo': 'nampula', 'mossuril': 'nampula',
      'muecate': 'nampula', 'murrupula': 'nampula', 'nacala': 'nampula', 'nacala a velha': 'nampula',
      'rapale': 'nampula', 'ribaue': 'nampula',
      
      'pemba': 'cabo delgado', 'montepuez': 'cabo delgado', 'mocimboa da praia': 'cabo delgado',
      'macomia': 'cabo delgado', 'mueda': 'cabo delgado', 'muidumbe': 'cabo delgado',
      'namuno': 'cabo delgado', 'nangade': 'cabo delgado', 'palma': 'cabo delgado',
      'quissanga': 'cabo delgado', 'balama': 'cabo delgado', 'chiure': 'cabo delgado',
      'metuge': 'cabo delgado', 'meluco': 'cabo delgado', 'ancuabe': 'cabo delgado',
      'ibo': 'cabo delgado',
      
      'lichinga': 'niassa', 'cuamba': 'niassa', 'lago': 'niassa', 'chimbunila': 'niassa',
      'majune': 'niassa', 'mandimba': 'niassa', 'marrupa': 'niassa', 'maua': 'niassa',
      'mavago': 'niassa', 'mecanhelas': 'niassa', 'mecula': 'niassa', 'metarica': 'niassa',
      'muembe': 'niassa', 'nguma': 'niassa', 'nipepe': 'niassa', 'sanga': 'niassa'
    };

    for (const [location, province] of Object.entries(locationMap)) {
      if (normalized.includes(location)) {
        return province;
      }
    }

    for (const province in this.PROVINCE_ORDER) {
      if (normalized.includes(province)) {
        return province;
      }
    }

    return 'desconhecido';
  }

  private static provinceCache = new Map<string, string>();
  
  static async detectProvinceSmart(address: string = ''): Promise<string> {
    if (!address) return 'desconhecido';
    
    const normalizedAddress = this.normalizeText(address);
    
    if (this.provinceCache.has(normalizedAddress)) {
      return this.provinceCache.get(normalizedAddress)!;
    }
    
    const dbProvince = await this.detectProvinceFromDatabase(address);
    if (dbProvince !== 'desconhecido') {
      this.provinceCache.set(normalizedAddress, dbProvince);
      return dbProvince;
    }
    
    const localProvince = this.detectProvince(address);
    this.provinceCache.set(normalizedAddress, localProvince);
    return localProvince;
  }

  // 🚀 MÉTODO PRINCIPAL OTIMIZADO COM POSTGRES
  static async findRidesWithGeographicLogic(
    passengerFrom: string,
    passengerTo: string,
    limit: number = 20
  ): Promise<RideWithMatching[]> {
    try {
      const [fromProvince, toProvince] = await Promise.all([
        this.detectProvinceSmart(passengerFrom),
        this.detectProvinceSmart(passengerTo)
      ]);

      console.log('🔍 [SMART-MATCHING] Detecção de províncias:', {
        passengerFrom,
        passengerTo,
        fromProvince,
        toProvince
      });

      // ✅ CORREÇÃO: Query mais simples e compatível
      const query = sql`
        SELECT 
          r.*,
          CASE 
            WHEN LOWER(r."fromProvince") = LOWER(${fromProvince}) 
             AND LOWER(r."toProvince") = LOWER(${toProvince}) THEN 'exact_match'
            WHEN LOWER(r."fromProvince") = LOWER(${fromProvince}) THEN 'same_origin'
            WHEN LOWER(r."toProvince") = LOWER(${toProvince}) THEN 'same_destination'
            ELSE 'potential_match'
          END as match_type,
          CASE 
            WHEN LOWER(r."fromProvince") = LOWER(${fromProvince}) 
             AND LOWER(r."toProvince") = LOWER(${toProvince}) THEN 100
            WHEN LOWER(r."fromProvince") = LOWER(${fromProvince}) THEN 80
            WHEN LOWER(r."toProvince") = LOWER(${toProvince}) THEN 75
            ELSE 50
          END as route_compatibility,
          CASE 
            WHEN LOWER(r."fromProvince") = LOWER(${fromProvince}) 
             AND LOWER(r."toProvince") = LOWER(${toProvince}) 
             THEN 'Rota exata: ' || r."fromAddress" || ' → ' || r."toAddress"
            WHEN LOWER(r."fromProvince") = LOWER(${fromProvince}) 
             THEN 'Mesma origem: ' || r."fromAddress" || ' → ' || r."toAddress"
            WHEN LOWER(r."toProvince") = LOWER(${toProvince}) 
             THEN 'Mesmo destino: ' || r."fromAddress" || ' → ' || r."toAddress"
            ELSE 'Rota potencial: ' || r."fromAddress" || ' → ' || r."toAddress"
          END as match_description
        FROM rides r
        WHERE r.status = 'available'
          AND r."availableSeats" >= 1
          AND (
            LOWER(r."fromProvince") = LOWER(${fromProvince})
            OR LOWER(r."toProvince") = LOWER(${toProvince})
            OR LOWER(r."fromProvince") = LOWER(${toProvince})
            OR LOWER(r."toProvince") = LOWER(${fromProvince})
          )
        ORDER BY route_compatibility DESC, "departureDate" ASC
        LIMIT ${limit}
      `;

      const result = await db.execute(query);
      const rides = this.extractRows(result);
      
      console.log('✅ [SMART-MATCHING] Resultados encontrados:', rides.length);

      if (rides.length === 0) {
        return await this.findRidesWithTypeScriptFallback(passengerFrom, passengerTo, limit);
      }

      const finalResults = rides.map((ride: any) => ({
        ride: ride,
        compatibilityScore: ride.route_compatibility || 0,
        matchType: ride.match_type || 'potential_match',
        matchDescription: ride.match_description || `Rota: ${ride.fromAddress} → ${ride.toAddress}`,
        isExactMatch: (ride.match_type || '') === 'exact_match',
        routeCompatibility: (ride.route_compatibility || 0) / 100,
        detectedFromProvince: fromProvince,
        detectedToProvince: toProvince,
        passengerFromProvince: fromProvince,
        passengerToProvince: toProvince,
        id: ride.id,
        fromAddress: ride.fromAddress,
        toAddress: ride.toAddress,
        fromProvince: ride.fromProvince,
        toProvince: ride.toProvince,
        pricePerSeat: ride.pricePerSeat,
        availableSeats: ride.availableSeats,
        departureDate: ride.departureDate,
        vehicleType: ride.vehicleType,
        status: ride.status
      }));

      return finalResults;

    } catch (error) {
      console.error('❌ [SMART-MATCHING] Erro na busca geográfica:', error);
      return await this.findRidesWithTypeScriptFallback(passengerFrom, passengerTo, limit);
    }
  }

  // 🆕 MÉTODO OTIMIZADO: Usa função PostgreSQL get_rides_smart_final
  static async findRidesWithPostgresFunction(
    passengerFrom: string,
    passengerTo: string,
    maxDistance: number = 50,
    limit: number = 20
  ): Promise<RideWithMatching[]> {
    try {
      const [fromProvince, toProvince] = await Promise.all([
        this.detectProvinceSmart(passengerFrom),
        this.detectProvinceSmart(passengerTo)
      ]);

      console.log('🎯 [POSTGRES-FUNCTION] Buscando com função PostgreSQL:', {
        passengerFrom,
        passengerTo,
        fromProvince,
        toProvince,
        maxDistance,
        limit
      });

      // ✅ CORREÇÃO: Usar função get_rides_smart_final que já existe
      const query = sql`
        SELECT * FROM get_rides_smart_final(
          ${passengerFrom},
          ${passengerTo},
          ${maxDistance}
        ) LIMIT ${limit}
      `;

      const result = await db.execute(query);
      const rides = this.extractRows(result);

      console.log('✅ [POSTGRES-FUNCTION] Resultados da função:', rides.length);

      return rides.map((ride: any) => ({
        ride: ride,
        compatibilityScore: ride.distance_from_city_km ? 
          Math.max(0, 100 - (ride.distance_from_city_km * 2)) : 50,
        matchType: ride.match_type || 'proximity_match',
        matchDescription: ride.match_type ? 
          `Match ${ride.match_type}: ${ride.from_city} → ${ride.to_city}` :
          `Rota próxima: ${ride.from_city} → ${ride.to_city}`,
        isExactMatch: (ride.match_type || '') === 'exact_match',
        routeCompatibility: ride.distance_from_city_km ? 
          Math.max(0, 1 - (ride.distance_from_city_km * 0.02)) : 0.5,
        detectedFromProvince: fromProvince,
        detectedToProvince: toProvince,
        passengerFromProvince: fromProvince,
        passengerToProvince: toProvince,
        id: ride.ride_id,
        fromAddress: ride.from_city,
        toAddress: ride.to_city,
        fromProvince: fromProvince,
        toProvince: toProvince,
        pricePerSeat: ride.priceperseat,
        availableSeats: ride.availableseats,
        departureDate: ride.departuredate,
        vehicleType: 'carro', // default
        status: 'available'
      }));

    } catch (error) {
      console.error('❌ [POSTGRES-FUNCTION] Erro na função PostgreSQL:', error);
      return await this.findRidesWithGeographicLogic(passengerFrom, passengerTo, limit);
    }
  }

  // 🛡️ MÉTODO FALLBACK
  private static async findRidesWithTypeScriptFallback(
    passengerFrom: string,
    passengerTo: string,
    limit: number = 20
  ): Promise<RideWithMatching[]> {
    try {
      console.log('🛡️ [FALLBACK] Usando fallback TypeScript');
      
      const allRides = await this.fetchRidesFromDB();
      const fromProvince = await this.detectProvinceSmart(passengerFrom);
      const toProvince = await this.detectProvinceSmart(passengerTo);
      
      const matches: RideWithMatching[] = [];

      for (const ride of allRides) {
        const rideFrom = this.normalizeText(ride.fromProvince || ride.fromAddress || '');
        const rideTo = this.normalizeText(ride.toProvince || ride.toAddress || '');

        if (rideFrom === fromProvince && rideTo === toProvince) {
          matches.push(this.createMatchObject(ride, 100, 'exact_match',
            `Rota exata: ${ride.fromAddress} → ${ride.toAddress}`));
        }
        else if (rideFrom === fromProvince) {
          matches.push(this.createMatchObject(ride, 80, 'same_origin',
            `Mesma origem: ${ride.fromAddress} → ${ride.toAddress}`));
        }
        else if (rideTo === toProvince) {
          matches.push(this.createMatchObject(ride, 75, 'same_destination',
            `Mesmo destino: ${ride.fromAddress} → ${ride.toAddress}`));
        }
        else if (fromProvince === 'gaza' && toProvince === 'inhambane') {
          if ((rideFrom === 'maputo' || rideFrom === 'cidade de maputo') && rideTo === 'inhambane') {
            matches.push(this.createMatchObject(ride, 95, 'covers_route',
              `Rota completa: ${ride.fromAddress} → ${ride.toAddress} (passa por Gaza)`));
          }
        }
      }

      console.log('✅ [FALLBACK] Resultados do fallback:', matches.length);
      return matches.slice(0, limit);
    } catch (error) {
      console.error('❌ [FALLBACK] Erro no fallback:', error);
      return [];
    }
  }

  private static createMatchObject(
    ride: any,
    score: number,
    type: string,
    description: string
  ): RideWithMatching {
    return {
      ride: ride,
      compatibilityScore: score,
      matchType: type,
      matchDescription: description,
      isExactMatch: type === 'exact_match',
      routeCompatibility: score / 100,
      id: ride.id,
      fromAddress: ride.fromAddress,
      toAddress: ride.toAddress,
      fromProvince: ride.fromProvince,
      toProvince: ride.toProvince,
      pricePerSeat: ride.pricePerSeat,
      availableSeats: ride.availableSeats,
      departureDate: ride.departureDate,
      vehicleType: ride.vehicleType,
      status: ride.status
    };
  }

  static calculateRouteCompatibility(
    driverFrom: string,
    driverTo: string,
    passengerFrom: string,
    passengerTo: string
  ): { score: number; type: string; description: string; isExactMatch: boolean; routeCompatibility: number } {
    const driverFromOrder = this.PROVINCE_ORDER[driverFrom] || 99;
    const driverToOrder = this.PROVINCE_ORDER[driverTo] || 99;
    const passengerFromOrder = this.PROVINCE_ORDER[passengerFrom] || 99;
    const passengerToOrder = this.PROVINCE_ORDER[passengerTo] || 99;

    if (driverFrom === 'desconhecido' || driverTo === 'desconhecido' || 
        passengerFrom === 'desconhecido' || passengerTo === 'desconhecido') {
      return { 
        score: 10, 
        type: 'unknown_province', 
        description: 'Província não identificada',
        isExactMatch: false,
        routeCompatibility: 0.1
      };
    }

    if (driverFrom === passengerFrom && driverTo === passengerTo) {
      return { 
        score: 100, 
        type: 'exact_match', 
        description: 'Origem e destino exatos',
        isExactMatch: true,
        routeCompatibility: 1.0
      };
    }

    if (driverFrom === passengerFrom) {
      return { 
        score: 80, 
        type: 'same_origin', 
        description: 'Mesma origem',
        isExactMatch: false,
        routeCompatibility: 0.8
      };
    }

    if (driverTo === passengerTo) {
      return { 
        score: 75, 
        type: 'same_destination', 
        description: 'Mesmo destino',
        isExactMatch: false,
        routeCompatibility: 0.75
      };
    }

    const isNorthbound = driverToOrder > driverFromOrder;
    
    if (isNorthbound) {
      if (passengerFromOrder >= driverFromOrder && passengerToOrder <= driverToOrder) {
        return { 
          score: 90, 
          type: 'same_segment', 
          description: 'Dentro do trajeto do motorista (Norte)',
          isExactMatch: false,
          routeCompatibility: 0.9
        };
      }
    } else {
      if (passengerFromOrder <= driverFromOrder && passengerToOrder >= driverToOrder) {
        return { 
          score: 90, 
          type: 'same_segment', 
          description: 'Dentro do trajeto do motorista (Sul)',
          isExactMatch: false,
          routeCompatibility: 0.9
        };
      }
    }

    return { 
      score: 0, 
      type: 'not_compatible', 
      description: 'Não compatível',
      isExactMatch: false,
      routeCompatibility: 0
    };
  }

  private static getRegion(province: string): string {
    const regions: { [key: string]: string } = {
      'maputo': 'sul', 'cidade de maputo': 'sul', 'gaza': 'sul', 'inhambane': 'sul',
      'sofala': 'centro', 'manica': 'centro', 'tete': 'centro',
      'zambezia': 'norte', 'nampula': 'norte', 'cabo delgado': 'norte', 'niassa': 'norte'
    };
    return regions[province] || 'desconhecida';
  }

  static async sortRidesByCompatibility(
    rides: any[], 
    passengerFrom: string, 
    passengerTo: string
  ): Promise<RideWithMatching[]> {
    if (!rides.length) return [];

    const [passengerFromProvince, passengerToProvince] = await Promise.all([
      this.detectProvinceSmart(passengerFrom),
      this.detectProvinceSmart(passengerTo)
    ]);

    console.log('🔍 [SORT-COMPATIBILITY] Ordenando rides por compatibilidade:', {
      passengerFrom,
      passengerTo,
      passengerFromProvince,
      passengerToProvince,
      totalRides: rides.length
    });

    const ridesWithCompatibility: RideWithMatching[] = [];

    for (const ride of rides) {
      const [driverFromProvince, driverToProvince] = await Promise.all([
        this.detectProvinceSmart(ride.fromProvince || ride.fromAddress || ride.fromLocation || ''),
        this.detectProvinceSmart(ride.toProvince || ride.toAddress || ride.toLocation || '')
      ]);
      
      const compatibility = this.calculateRouteCompatibility(
        driverFromProvince,
        driverToProvince,
        passengerFromProvince,
        passengerToProvince
      );

      ridesWithCompatibility.push({
        ride: ride,
        compatibilityScore: compatibility.score,
        matchType: compatibility.type,
        matchDescription: compatibility.description,
        isExactMatch: compatibility.isExactMatch,
        routeCompatibility: compatibility.routeCompatibility,
        detectedFromProvince: driverFromProvince,
        detectedToProvince: driverToProvince,
        passengerFromProvince,
        passengerToProvince,
        id: ride.id,
        fromAddress: ride.fromAddress,
        toAddress: ride.toAddress,
        fromProvince: ride.fromProvince,
        toProvince: ride.toProvince,
        pricePerSeat: ride.pricePerSeat,
        availableSeats: ride.availableSeats,
        departureDate: ride.departureDate,
        vehicleType: ride.vehicleType,
        status: ride.status
      });
    }

    const filteredRides = ridesWithCompatibility
      .filter(ride => ride.compatibilityScore > 0)
      .sort((a, b) => {
        if (b.compatibilityScore !== a.compatibilityScore) {
          return b.compatibilityScore - a.compatibilityScore;
        }
        return (a.ride.pricePerSeat || 0) - (b.ride.pricePerSeat || 0);
      });

    console.log('✅ [SORT-COMPATIBILITY] Rides ordenados:', filteredRides.length);
    return filteredRides;
  }

  private static async fetchRidesFromDB(): Promise<any[]> {
    try {
      const query = sql`
        SELECT * FROM rides 
        WHERE status = 'available' 
        AND "departureDate" > NOW()
        ORDER BY "departureDate" ASC
        LIMIT 50
      `;
      const result = await db.execute(query);
      return this.extractRows(result);
    } catch (error) {
      console.error('❌ [FETCH-RIDES] Erro ao buscar rides:', error);
      return [];
    }
  }

  static clearCache(): void {
    this.provinceCache.clear();
    console.log('🧹 [CACHE] Cache de províncias limpo');
  }

  static convertToRideWithDetails(matchingRides: RideWithMatching[]): any[] {
    return matchingRides.map(matchingRide => {
      const rideDetails = {
        ...matchingRide.ride,
        matchScore: matchingRide.compatibilityScore,
        matchType: matchingRide.matchType,
        matchDescription: matchingRide.matchDescription,
        route_compatibility: matchingRide.routeCompatibility,
        id: matchingRide.ride?.id || matchingRide.id,
        fromAddress: matchingRide.ride?.fromAddress || matchingRide.fromAddress,
        toAddress: matchingRide.ride?.toAddress || matchingRide.toAddress,
        fromProvince: matchingRide.ride?.fromProvince || matchingRide.fromProvince,
        toProvince: matchingRide.ride?.toProvince || matchingRide.toProvince,
        pricePerSeat: matchingRide.ride?.pricePerSeat || matchingRide.pricePerSeat,
        availableSeats: matchingRide.ride?.availableSeats || matchingRide.availableSeats,
        departureDate: matchingRide.ride?.departureDate || matchingRide.departureDate,
        vehicleType: matchingRide.ride?.vehicleType || matchingRide.vehicleType,
        status: matchingRide.ride?.status || matchingRide.status || 'available'
      };

      return rideDetails;
    });
  }

  // 🆕 MÉTODO PRINCIPAL PARA PRODUÇÃO
  static async findMatchingRides(
    passengerFrom: string,
    passengerTo: string,
    options: {
      usePostgresFunction?: boolean;
      maxDistance?: number;
      limit?: number;
    } = {}
  ): Promise<RideWithMatching[]> {
    const {
      usePostgresFunction = true,
      maxDistance = 50,
      limit = 20
    } = options;

    console.log('🚀 [FIND-MATCHING-RIDES] Iniciando busca:', {
      passengerFrom,
      passengerTo,
      usePostgresFunction,
      maxDistance,
      limit
    });

    if (usePostgresFunction) {
      return await this.findRidesWithPostgresFunction(
        passengerFrom,
        passengerTo,
        maxDistance,
        limit
      );
    } else {
      return await this.findRidesWithGeographicLogic(
        passengerFrom,
        passengerTo,
        limit
      );
    }
  }
}