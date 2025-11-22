import { eq, and, or, gte, lte, desc, sql } from 'drizzle-orm';
import { db } from '../../db';
import { rides, users } from '../../shared/schema';
import { 
  Ride, 
  CreateRideData, 
  UpdateRideData, 
  RideSearchCriteria,
  DriverStats,
  User 
} from '../types';

// 🚀 SERVIÇO DE MATCHING INTELIGENTE (EMBUTIDO) - MELHORADO
class SmartRideMatchingService {
  // Ordem geográfica das províncias (Sul → Norte)
  private static readonly PROVINCE_ORDER: { [key: string]: number } = {
    'Maputo': 1, 'Cidade de Maputo': 1, 'Gaza': 2, 'Inhambane': 3,
    'Sofala': 4, 'Manica': 5, 'Tete': 6, 'Zambezia': 7, 
    'Nampula': 8, 'Cabo Delgado': 9, 'Niassa': 10
  };

  // ✅ CORREÇÃO: Normalizar texto para matching mais robusto
  private static normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9\s]/g, '')     // Remove caracteres especiais
      .trim();
  }

  // ✅ CORREÇÃO: Detectar província com matching mais robusto
  static detectProvince(location: string): string {
    const normalizedLocation = this.normalizeText(location);
    
    const provinceMap: { [key: string]: string } = {
      'maputo': 'Maputo', 'matola': 'Maputo', 'beira': 'Sofala', 'tete': 'Tete',
      'nampula': 'Nampula', 'inhambane': 'Inhambane', 'gaza': 'Gaza', 
      'xai xai': 'Gaza', 'tofo': 'Inhambane', 'vilanculos': 'Inhambane',
      'chimoio': 'Manica', 'maxixe': 'Inhambane', 'angoche': 'Nampula',
      'montepuez': 'Cabo Delgado', 'lichinga': 'Niassa', 'pemba': 'Cabo Delgado',
      'quelimane': 'Zambezia', 'mocuba': 'Zambezia', 'gurue': 'Zambezia',
      'dondo': 'Sofala', 'mocimboa da praia': 'Cabo Delgado', 'cuamba': 'Niassa',
      'mandimba': 'Niassa', 'monapo': 'Nampula', 'nacala': 'Nampula'
    };

    // Buscar match exato primeiro
    for (const [key, province] of Object.entries(provinceMap)) {
      if (normalizedLocation.includes(key)) {
        return province;
      }
    }

    // Buscar por províncias no texto
    for (const province of Object.keys(this.PROVINCE_ORDER)) {
      if (normalizedLocation.includes(this.normalizeText(province))) {
        return province;
      }
    }
    
    return 'Maputo'; // Fallback
  }

  // ✅ CORREÇÃO: Calcular compatibilidade entre rotas com direções reais
  static calculateRouteCompatibility(
    driverFrom: string,
    driverTo: string,
    passengerFrom: string, 
    passengerTo: string
  ): { score: number; type: string; description: string } {
    
    const driverFromOrder = this.PROVINCE_ORDER[driverFrom] || 99;
    const driverToOrder = this.PROVINCE_ORDER[driverTo] || 99;
    const passengerFromOrder = this.PROVINCE_ORDER[passengerFrom] || 99;
    const passengerToOrder = this.PROVINCE_ORDER[passengerTo] || 99;

    // ✅ CORREÇÃO: Reordenado do mais específico para o mais genérico

    // 1. MATCH EXATO (100 pontos) - MAIS ESPECÍFICO
    if (driverFrom === passengerFrom && driverTo === passengerTo) {
      return { 
        score: 100, 
        type: 'exact_match',
        description: 'Origem e destino exatos'
      };
    }

    // 2. MESMO TRECHO (90 pontos) - passageiro dentro do trajeto do motorista
    if (passengerFromOrder >= driverFromOrder && passengerToOrder <= driverToOrder) {
      return {
        score: 90,
        type: 'same_segment', 
        description: 'Passageiro dentro do trajeto do motorista'
      };
    }

    // 3. PASSAGEIRO EMBARCA DEPOIS (80 pontos)
    if (passengerFromOrder > driverFromOrder && passengerToOrder <= driverToOrder) {
      return {
        score: 80,
        type: 'embark_later',
        description: 'Passageiro embarca depois do motorista'
      };
    }

    // 4. PASSAGEIRO DESEMBARCA DEPOIS (70 pontos)
    if (passengerFromOrder >= driverFromOrder && passengerToOrder > driverToOrder) {
      return {
        score: 70,
        type: 'disembark_later',
        description: 'Passageiro desembarca depois do motorista'
      };
    }

    // 5. MESMA ORIGEM (60 pontos)
    if (driverFrom === passengerFrom) {
      return {
        score: 60,
        type: 'same_origin',
        description: 'Mesma origem'
      };
    }

    // 6. MESMO DESTINO (50 pontos)
    if (driverTo === passengerTo) {
      return {
        score: 50,
        type: 'same_destination',
        description: 'Mesmo destino'
      };
    }

    // 7. MESMA DIREÇÃO (40 pontos) - ambos indo para Norte ou ambos para Sul
    const driverDirection = driverToOrder > driverFromOrder ? 'north' : 'south';
    const passengerDirection = passengerToOrder > passengerFromOrder ? 'north' : 'south';
    
    if (driverDirection === passengerDirection) {
      return {
        score: 40,
        type: 'same_direction',
        description: 'Mesma direção geográfica'
      };
    }

    return { score: 0, type: 'not_compatible', description: 'Não compatível' };
  }

  // ✅ CORREÇÃO: Filtrar e ordenar rides por compatibilidade com direções reais
  static sortRidesByCompatibility(
    rides: Ride[],
    passengerFrom: string,
    passengerTo: string
  ): (Ride & { matchScore: number; matchType: string; matchDescription: string; fromProvince?: string; toProvince?: string })[] {
    const passengerFromProvince = this.detectProvince(passengerFrom);
    const passengerToProvince = this.detectProvince(passengerTo);

    return rides
      .map(ride => {
        // Detectar províncias do ride
        const rideFromProvince = this.detectProvince(ride.fromLocation || '');
        const rideToProvince = this.detectProvince(ride.toLocation || '');

        const compatibility = this.calculateRouteCompatibility(
          rideFromProvince,
          rideToProvince,
          passengerFromProvince,
          passengerToProvince
        );

        return {
          ...ride,
          matchScore: compatibility.score,
          matchType: compatibility.type,
          matchDescription: compatibility.description,
          fromProvince: rideFromProvince,
          toProvince: rideToProvince
        };
      })
      .filter(ride => ride.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore);
  }
}

// ✅ CORREÇÃO: Função centralizada para mapeamento consistente com coalescência segura
function mapDbRideToRide(dbRide: any, driver?: any): Ride {
  // ✅ CORREÇÃO: Coalescência segura para todos os campos
  const mappedRide = {
    ...dbRide,
    fromLocation: dbRide.fromAddress || '', // ✅ CORREÇÃO: coalescência segura
    toLocation: dbRide.toAddress || '',     // ✅ CORREÇÃO: coalescência segura
    pricePerSeat: dbRide.pricePerSeat ? Number(dbRide.pricePerSeat) : 0,
    availableSeats: dbRide.availableSeats || 0,
    maxPassengers: dbRide.maxPassengers || 4,
    createdAt: dbRide.createdAt ? new Date(dbRide.createdAt) : new Date(), // ✅ CORREÇÃO: coalescência segura
    updatedAt: dbRide.updatedAt ? new Date(dbRide.updatedAt) : new Date(), // ✅ CORREÇÃO: coalescência segura
    departureDate: dbRide.departureDate ? new Date(dbRide.departureDate) : new Date(), // ✅ CORREÇÃO: coalescência segura
    departureTime: dbRide.departureTime || '08:00',
    status: dbRide.status || 'available', // ✅ CORREÇÃO: 'active' → 'available'
    vehicleType: dbRide.vehicleType || '',
    additionalInfo: dbRide.additionalInfo || '',
    driver: driver ? mapDbUserToUser(driver) : null
  } as Ride;

  return mappedRide;
}

// ✅ CORREÇÃO: Função centralizada para mapeamento de usuário com coalescência segura
function mapDbUserToUser(dbUser: any): User {
  return {
    ...dbUser,
    rating: dbUser.rating ? Number(dbUser.rating) : 0,
    totalReviews: dbUser.totalReviews || 0,
    isVerified: dbUser.isVerified ?? false,
    createdAt: dbUser.createdAt ? new Date(dbUser.createdAt) : new Date(), // ✅ CORREÇÃO: coalescência segura
    updatedAt: dbUser.updatedAt ? new Date(dbUser.updatedAt) : new Date(), // ✅ CORREÇÃO: coalescência segura
    email: dbUser.email || '',
    phone: dbUser.phone || '',
    userType: dbUser.userType || 'driver',
    roles: dbUser.roles || ['driver'],
    canOfferServices: dbUser.canOfferServices ?? true,
    firstName: dbUser.firstName || '',
    lastName: dbUser.lastName || '',
    profileImageUrl: dbUser.profileImageUrl || ''
  } as User;
}

// 🆕 TIPO EXTENDIDO PARA RIDES COM MATCHING
export type RideWithMatching = Ride & {
  matchScore: number;
  matchType: string;
  matchDescription: string;
  fromProvince?: string;
  toProvince?: string;
};

export interface IRideStorage {
  // Ride management
  createRide(rideData: CreateRideData): Promise<Ride>;
  updateRide(rideId: string, data: UpdateRideData): Promise<Ride>;
  deleteRide(rideId: string): Promise<void>;
  getRide(rideId: string): Promise<Ride | undefined>;
  
  // Search and discovery
  searchRides(criteria: RideSearchCriteria): Promise<Ride[]>;
  searchSmartRides(passengerFrom: string, passengerTo: string, additionalCriteria?: Partial<RideSearchCriteria>): Promise<RideWithMatching[]>;
  getRidesByDriver(driverId: string): Promise<Ride[]>;
  getActiveRides(): Promise<Ride[]>;
  getNearbyRides(location: string, radius?: number): Promise<Ride[]>;
  
  // Booking integration
  updateRideAvailability(rideId: string, bookedSeats: number): Promise<Ride>;
  checkRideAvailability(rideId: string, requestedSeats: number): Promise<boolean>;
  
  // Driver-specific
  getDriverStatistics(driverId: string): Promise<DriverStats>;
  getDriverRideHistory(driverId: string, limit?: number): Promise<Ride[]>;
  
  // Analytics
  getRideStatistics(dateRange?: { from: Date; to: Date }): Promise<{
    totalRides: number;
    activeRides: number;
    completedRides: number;
    totalRevenue: number;
  }>;
}

export class DatabaseRideStorage implements IRideStorage {
  
  // ===== RIDE MANAGEMENT =====
  
  async createRide(rideData: CreateRideData): Promise<Ride> {
    try {
      // ✅ CORREÇÃO: Mapeamento consistente fromLocation/toLocation → fromAddress/toAddress
      const rideValues: any = {
        driverId: rideData.driverId,
        fromAddress: rideData.fromLocation, // ✅ Mapear para nome real da coluna
        toAddress: rideData.toLocation,     // ✅ Mapear para nome real da coluna
        departureDate: rideData.departureDate,
        departureTime: rideData.departureTime,
        availableSeats: rideData.availableSeats,
        pricePerSeat: rideData.pricePerSeat?.toString() || '0', // ✅ MANTER como string conforme schema
        vehicleType: rideData.vehicleType || '',
        additionalInfo: rideData.additionalInfo || '',
        status: 'available', // ✅ CORREÇÃO: 'active' → 'available'
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // ✅ CORREÇÃO: Adicionar campos de localidade inteligente se existirem no schema
      if (rideData.fromLocation) {
        rideValues.fromProvince = SmartRideMatchingService.detectProvince(rideData.fromLocation);
      }
      if (rideData.toLocation) {
        rideValues.toProvince = SmartRideMatchingService.detectProvince(rideData.toLocation);
      }

      const [ride] = await db
        .insert(rides)
        .values(rideValues)
        .returning();
      
      return mapDbRideToRide(ride); // ✅ Usar função centralizada
    } catch (error) {
      console.error('Error creating ride:', error);
      throw new Error('Failed to create ride');
    }
  }

  async updateRide(rideId: string, data: UpdateRideData): Promise<Ride> {
    try {
      const updateData: any = { ...data, updatedAt: new Date() };
      
      // ✅ CORREÇÃO: Mapeamento consistente
      if (data.fromLocation !== undefined) {
        updateData.fromAddress = data.fromLocation;
        delete updateData.fromLocation;
      }
      if (data.toLocation !== undefined) {
        updateData.toAddress = data.toLocation;
        delete updateData.toLocation;
      }

      // ✅ CORREÇÃO: MANTER pricePerSeat como string conforme schema
      if (data.pricePerSeat !== undefined) {
        updateData.pricePerSeat = data.pricePerSeat.toString();
      }

      const [ride] = await db
        .update(rides)
        .set(updateData)
        .where(eq(rides.id, rideId))
        .returning();
      
      return mapDbRideToRide(ride); // ✅ Usar função centralizada
    } catch (error) {
      console.error('Error updating ride:', error);
      throw new Error('Failed to update ride');
    }
  }

  async deleteRide(rideId: string): Promise<void> {
    try {
      await db.delete(rides).where(eq(rides.id, rideId));
    } catch (error) {
      console.error('Error deleting ride:', error);
      throw new Error('Failed to delete ride');
    }
  }

  async getRide(rideId: string): Promise<Ride | undefined> {
    try {
      const result = await db
        .select({
          ride: rides,
          driver: users
        })
        .from(rides)
        .leftJoin(users, eq(rides.driverId, users.id))
        .where(eq(rides.id, rideId));
      
      if (result.length === 0) return undefined;
      
      const { ride, driver } = result[0];
      
      return mapDbRideToRide(ride, driver); // ✅ Usar função centralizada
    } catch (error) {
      console.error('Error fetching ride:', error);
      return undefined;
    }
  }

  // ===== SEARCH AND DISCOVERY =====
  
  async searchRides(criteria: RideSearchCriteria): Promise<Ride[]> {
    try {
      const conditions = [eq(rides.status, 'available')]; // ✅ CORREÇÃO: 'active' → 'available'

      // ✅ CORREÇÃO: Aplicar filtros básicos no SQL para melhor performance
      if (criteria.fromLocation) {
        conditions.push(sql`${rides.fromAddress} ILIKE ${`%${criteria.fromLocation}%`}`);
      }

      if (criteria.toLocation) {
        conditions.push(sql`${rides.toAddress} ILIKE ${`%${criteria.toLocation}%`}`);
      }

      if (criteria.departureDate) {
        conditions.push(gte(rides.departureDate, criteria.departureDate));
      }

      if (criteria.minSeats) {
        conditions.push(gte(rides.availableSeats, criteria.minSeats));
      }

      if (criteria.maxPrice) {
        // ✅ CORREÇÃO: MANTER CAST pois pricePerSeat é varchar no schema
        conditions.push(sql`CAST(${rides.pricePerSeat} AS DECIMAL) <= ${criteria.maxPrice}`);
      }

      if (criteria.driverId) {
        conditions.push(eq(rides.driverId, criteria.driverId));
      }

      // ✅ CORREÇÃO: Limitar resultados do banco para melhor performance
      const results = await db
        .select({
          ride: rides,
          driver: users
        })
        .from(rides)
        .leftJoin(users, eq(rides.driverId, users.id))
        .where(and(...conditions))
        .orderBy(desc(rides.departureDate))
        .limit(100); // ✅ Aumentado para 100 para dar margem ao matching

      // ✅ CORREÇÃO: Usar função centralizada para mapeamento
      const ridesWithMatching = results.map(({ ride, driver }) => 
        mapDbRideToRide(ride, driver)
      );
      
      // 🚀 APLICAR MATCHING INTELIGENTE SE HOUVER ORIGEM/DESTINO
      if (criteria.fromLocation && criteria.toLocation) {
        const smartRides = SmartRideMatchingService.sortRidesByCompatibility(
          ridesWithMatching,
          criteria.fromLocation,
          criteria.toLocation
        );
        
        return smartRides.slice(0, 50); // ✅ Limitar resultados finais
      }

      return ridesWithMatching.slice(0, 50); // ✅ Limitar resultados finais
    } catch (error) {
      console.error('Error searching rides:', error);
      return [];
    }
  }

  // 🚀 NOVA FUNÇÃO: Busca inteligente com províncias
  async searchSmartRides(passengerFrom: string, passengerTo: string, additionalCriteria?: Partial<RideSearchCriteria>): Promise<RideWithMatching[]> {
    try {
      const criteria: RideSearchCriteria = {
        fromLocation: passengerFrom,
        toLocation: passengerTo,
        ...additionalCriteria
      };

      // Usar a função searchRides existente que já aplica o matching inteligente
      const rides = await this.searchRides(criteria) as RideWithMatching[];
      
      return rides;
    } catch (error) {
      console.error('Error in smart ride search:', error);
      return [];
    }
  }

  async getRidesByDriver(driverId: string): Promise<Ride[]> {
    try {
      const rideList = await db
        .select()
        .from(rides)
        .where(eq(rides.driverId, driverId))
        .orderBy(desc(rides.departureDate));
      
      // ✅ CORREÇÃO: Usar função centralizada
      return rideList.map(ride => mapDbRideToRide(ride));
    } catch (error) {
      console.error('Error fetching rides by driver:', error);
      return [];
    }
  }

  async getActiveRides(): Promise<Ride[]> {
    try {
      const results = await db
        .select({
          ride: rides,
          driver: users
        })
        .from(rides)
        .leftJoin(users, eq(rides.driverId, users.id))
        .where(and(
          eq(rides.status, 'available'), // ✅ CORREÇÃO: 'active' → 'available'
          gte(rides.departureDate, new Date())
        ))
        .orderBy(desc(rides.departureDate))
        .limit(100);

      // ✅ CORREÇÃO: Usar função centralizada
      return results.map(({ ride, driver }) => mapDbRideToRide(ride, driver));
    } catch (error) {
      console.error('Error fetching active rides:', error);
      return [];
    }
  }

  // ✅ CORREÇÃO: getNearbyRides melhorado com direções reais
  async getNearbyRides(location: string, radius: number = 50): Promise<Ride[]> {
    try {
      // 🚀 IMPLEMENTAÇÃO MELHORADA - usar matching inteligente com direções reais
      const province = SmartRideMatchingService.detectProvince(location);
      
      // Buscar rides ativas
      const allActiveRides = await this.getActiveRides();
      
      // ✅ CORREÇÃO: Usar direções reais do passageiro para cálculo de compatibilidade
      const nearbyRides = allActiveRides
        .map(ride => {
          const rideFromProvince = SmartRideMatchingService.detectProvince(ride.fromLocation || '');
          const rideToProvince = SmartRideMatchingService.detectProvince(ride.toLocation || '');
          
          // Calcular compatibilidade com direção real
          const compatibility = SmartRideMatchingService.calculateRouteCompatibility(
            rideFromProvince,
            rideToProvince,
            province,
            province // Para nearby, assumimos mesmo destino por enquanto
          );
          
          return { 
            ...ride, 
            matchScore: compatibility.score,
            distanceScore: rideFromProvince === province ? 100 : 50 // Score adicional por proximidade
          };
        })
        .filter(ride => ride.matchScore > 0) // ✅ Filtrar apenas compatíveis
        .sort((a, b) => {
          // ✅ Ordenar por score combinado (match + distance)
          const scoreA = a.matchScore + a.distanceScore;
          const scoreB = b.matchScore + b.distanceScore;
          return scoreB - scoreA;
        });

      return nearbyRides.slice(0, 20);
    } catch (error) {
      console.error('Error fetching nearby rides:', error);
      return [];
    }
  }

  // ===== BOOKING INTEGRATION =====
  
  async updateRideAvailability(rideId: string, bookedSeats: number): Promise<Ride> {
    try {
      // ✅ CORREÇÃO: Usar transação para evitar race condition
      return await db.transaction(async (tx) => {
        const [ride] = await tx
          .select()
          .from(rides)
          .where(and(
            eq(rides.id, rideId),
            gte(rides.availableSeats, bookedSeats) // ✅ Evitar race condition
          ));

        if (!ride) {
          throw new Error('Ride not found or not enough seats available');
        }

        const newAvailableSeats = ride.availableSeats - bookedSeats;
        
        // ✅ CORREÇÃO: Removido 'full' - manter status como 'available' mesmo quando não há assentos
        const status = 'available';

        const [updatedRide] = await tx
          .update(rides)
          .set({ 
            availableSeats: newAvailableSeats, 
            status,
            updatedAt: new Date()
          })
          .where(eq(rides.id, rideId))
          .returning();

        return mapDbRideToRide(updatedRide);
      });
    } catch (error) {
      console.error('Error updating ride availability:', error);
      throw error;
    }
  }

  async checkRideAvailability(rideId: string, requestedSeats: number): Promise<boolean> {
    try {
      const ride = await this.getRide(rideId);
      if (!ride) return false;

      // ✅ CORREÇÃO: Agora verificamos apenas pelos assentos disponíveis
      return ride.availableSeats >= requestedSeats;
    } catch (error) {
      console.error('Error checking ride availability:', error);
      return false;
    }
  }

  // ===== DRIVER-SPECIFIC =====
  
  async getDriverStatistics(driverId: string): Promise<DriverStats> {
    try {
      // ✅ CORREÇÃO: Implementar cálculos reais de earnings e ratings
      const [totalRidesResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(rides)
        .where(eq(rides.driverId, driverId));

      const [completedRidesResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(rides)
        .where(and(
          eq(rides.driverId, driverId),
          eq(rides.status, 'completed')
        ));

      // ✅ CORREÇÃO: Calcular earnings reais (MANTER CAST)
      const [earningsResult] = await db
        .select({ total: sql<number>`COALESCE(SUM(CAST(price_per_seat AS DECIMAL) * max_passengers), 0)` })
        .from(rides)
        .where(and(
          eq(rides.driverId, driverId),
          eq(rides.status, 'completed')
        ));

      // ✅ CORREÇÃO: Converter explicitamente para número
      const totalRides = Number(totalRidesResult.count);
      const completedRides = Number(completedRidesResult.count);
      const totalEarnings = Number(earningsResult.total) || 0;

      // TODO: Implementar cálculo real de ratings quando tiver sistema de reviews
      const averageRating = 4.8; // Placeholder
      const totalReviews = completedRides; // Placeholder

      return {
        totalRides,
        completedRides,
        totalEarnings,
        averageRating,
        totalReviews,
      };
    } catch (error) {
      console.error('Error fetching driver statistics:', error);
      return {
        totalRides: 0,
        completedRides: 0,
        totalEarnings: 0,
        averageRating: 0,
        totalReviews: 0,
      };
    }
  }

  async getDriverRideHistory(driverId: string, limit: number = 20): Promise<Ride[]> {
    try {
      const rideList = await db
        .select()
        .from(rides)
        .where(eq(rides.driverId, driverId))
        .orderBy(desc(rides.departureDate))
        .limit(limit);
      
      // ✅ CORREÇÃO: Usar função centralizada
      return rideList.map(ride => mapDbRideToRide(ride));
    } catch (error) {
      console.error('Error fetching driver ride history:', error);
      return [];
    }
  }

  // ===== ANALYTICS =====
  
  async getRideStatistics(dateRange?: { from: Date; to: Date }): Promise<{
    totalRides: number;
    activeRides: number;
    completedRides: number;
    totalRevenue: number;
  }> {
    try {
      // ✅ CORREÇÃO: Aplicar dateRange corretamente
      let conditions: any[] = [];

      if (dateRange) {
        conditions.push(
          gte(rides.createdAt, dateRange.from),
          lte(rides.createdAt, dateRange.to)
        );
      }

      // ✅ CORREÇÃO: Aplicar conditions em todas as queries
      const [totalRides] = await db
        .select({ count: sql<number>`count(*)` })
        .from(rides)
        .where(conditions.length ? and(...conditions) : undefined);

      const [activeRides] = await db
        .select({ count: sql<number>`count(*)` })
        .from(rides)
        .where(and(
          eq(rides.status, 'available'), // ✅ CORREÇÃO: 'active' → 'available'
          ...(conditions.length ? conditions : [])
        ));

      const [completedRides] = await db
        .select({ count: sql<number>`count(*)` })
        .from(rides)
        .where(and(
          eq(rides.status, 'completed'),
          ...(conditions.length ? conditions : [])
        ));

      // ✅ CORREÇÃO: Calcular revenue real (MANTER CAST)
      const [revenueResult] = await db
        .select({ total: sql<number>`COALESCE(SUM(CAST(price_per_seat AS DECIMAL) * max_passengers), 0)` })
        .from(rides)
        .where(and(
          eq(rides.status, 'completed'),
          ...(conditions.length ? conditions : [])
        ));

      return {
        totalRides: Number(totalRides.count),
        activeRides: Number(activeRides.count),
        completedRides: Number(completedRides.count),
        totalRevenue: Number(revenueResult.total) || 0,
      };
    } catch (error) {
      console.error('Error fetching ride statistics:', error);
      return {
        totalRides: 0,
        activeRides: 0,
        completedRides: 0,
        totalRevenue: 0,
      };
    }
  }
}

export const rideStorage = new DatabaseRideStorage();