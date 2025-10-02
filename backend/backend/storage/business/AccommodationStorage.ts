import { eq, and, or, gte, lte, desc, sql } from 'drizzle-orm';
import { db } from '../../db';
import { accommodations, users } from '../../shared/schema';
import { 
  Accommodation, 
  CreateAccommodationData, 
  UpdateAccommodationData, 
  AccommodationSearchCriteria,
  PartnershipProgram,
  User 
} from '../types';

// Helper function for proper type mapping
function mapToAccommodation(accommodation: any, host?: any): Accommodation {
  return {
    ...accommodation,
    createdAt: accommodation.createdAt || new Date(),
    updatedAt: accommodation.updatedAt || new Date(),
    rating: accommodation.rating ? Number(accommodation.rating) : 0,
    reviewCount: accommodation.reviewCount || 0,
    pricePerNight: accommodation.pricePerNight ? Number(accommodation.pricePerNight) : 0,
    distanceFromCenter: accommodation.distanceFromCenter ? Number(accommodation.distanceFromCenter) : 0,
    lat: accommodation.lat ? Number(accommodation.lat) : null,
    lng: accommodation.lng ? Number(accommodation.lng) : null,
    images: accommodation.images || [],
    amenities: accommodation.amenities || [],
    isAvailable: accommodation.isAvailable ?? true,
    offerDriverDiscounts: accommodation.offerDriverDiscounts ?? false,
    driverDiscountRate: accommodation.driverDiscountRate ? Number(accommodation.driverDiscountRate) : 0,
    minimumDriverLevel: accommodation.minimumDriverLevel || 'bronze',
    partnershipBadgeVisible: accommodation.partnershipBadgeVisible ?? false,
    maxGuests: accommodation.maxGuests || 2, // ✅ ADICIONADO: Valor padrão para maxGuests
    host: host ? {
      ...host,
      rating: host.rating ? Number(host.rating) : 0,
      totalReviews: host.totalReviews || 0,
      isVerified: host.isVerified ?? false
    } as User : null
  } as Accommodation;
}

function mapToUser(user: any): User {
  return {
    ...user,
    rating: user.rating ? Number(user.rating) : 0,
    totalReviews: user.totalReviews || 0,
    isVerified: user.isVerified ?? false,
    createdAt: user.createdAt || new Date(),
    updatedAt: user.updatedAt || new Date(),
    // Add other required User fields with defaults
    email: user.email || '',
    phone: user.phone || '',
    userType: user.userType || 'client',
    roles: user.roles || ['client'],
    canOfferServices: user.canOfferServices ?? false
  } as User;
}

export interface IAccommodationStorage {
  // Accommodation management
  createAccommodation(data: CreateAccommodationData): Promise<Accommodation>;
  updateAccommodation(id: string, data: UpdateAccommodationData): Promise<Accommodation>;
  deleteAccommodation(id: string): Promise<void>;
  getAccommodation(id: string): Promise<Accommodation | undefined>;
  
  // Search and discovery
  searchAccommodations(criteria: AccommodationSearchCriteria): Promise<Accommodation[]>;
  getAccommodationsByHost(hostId: string): Promise<Accommodation[]>;
  getAvailableAccommodations(checkIn?: Date, checkOut?: Date): Promise<Accommodation[]>;
  getFeaturedAccommodations(limit?: number): Promise<Accommodation[]>;
  
  // Partnership features
  updatePartnershipProgram(id: string, program: PartnershipProgram): Promise<Accommodation>;
  getPartnerAccommodations(): Promise<Accommodation[]>;
  getDriverDiscountEligible(accommodationId: string, driverLevel: string): Promise<boolean>;
  
  // Availability management
  updateAccommodationAvailability(id: string, isAvailable: boolean): Promise<Accommodation>;
  
  // Analytics
  getAccommodationStatistics(hostId?: string): Promise<{
    totalAccommodations: number;
    activeAccommodations: number;
    partnerAccommodations: number;
    averagePrice: number;
  }>;
}

export class DatabaseAccommodationStorage implements IAccommodationStorage {
  
  // ===== ACCOMMODATION MANAGEMENT =====
  
  async createAccommodation(data: CreateAccommodationData): Promise<Accommodation> {
    try {
      const [accommodation] = await db
        .insert(accommodations)
        .values({
          ...data,
          pricePerNight: data.pricePerNight.toString(),
          lat: data.lat?.toString(),
          lng: data.lng?.toString(),
          images: data.images || [],
          amenities: data.amenities || [],
          rating: '0.0',
          reviewCount: 0,
          distanceFromCenter: '0.0',
          isAvailable: true,
          offerDriverDiscounts: data.offerDriverDiscounts || false,
          driverDiscountRate: (data.driverDiscountRate || 10).toString(),
          minimumDriverLevel: 'bronze',
          partnershipBadgeVisible: false,
          // ✅ ADICIONADO: maxGuests com valor padrão de 2
          maxGuests: data.maxGuests || 2,
        })
        .returning();
      
      return mapToAccommodation(accommodation);
    } catch (error) {
      console.error('Error creating accommodation:', error);
      throw new Error('Failed to create accommodation');
    }
  }

  async updateAccommodation(id: string, data: UpdateAccommodationData): Promise<Accommodation> {
    try {
      const updateData: any = { ...data };
      
      if (data.pricePerNight !== undefined) {
        updateData.pricePerNight = data.pricePerNight.toString();
      }
      if (data.driverDiscountRate !== undefined) {
        updateData.driverDiscountRate = data.driverDiscountRate.toString();
      }
      // ✅ ADICIONADO: Atualizar maxGuests se fornecido
      if (data.maxGuests !== undefined) {
        updateData.maxGuests = data.maxGuests;
      }

      const [accommodation] = await db
        .update(accommodations)
        .set(updateData)
        .where(eq(accommodations.id, id))
        .returning();
      
      return mapToAccommodation(accommodation);
    } catch (error) {
      console.error('Error updating accommodation:', error);
      throw new Error('Failed to update accommodation');
    }
  }

  async deleteAccommodation(id: string): Promise<void> {
    try {
      await db.delete(accommodations).where(eq(accommodations.id, id));
    } catch (error) {
      console.error('Error deleting accommodation:', error);
      throw new Error('Failed to delete accommodation');
    }
  }

  async getAccommodation(id: string): Promise<Accommodation | undefined> {
    try {
      const result = await db
        .select({
          accommodation: accommodations,
          host: users
        })
        .from(accommodations)
        .leftJoin(users, eq(accommodations.hostId, users.id))
        .where(eq(accommodations.id, id));
      
      if (result.length === 0) return undefined;
      
      const { accommodation, host } = result[0];
      return mapToAccommodation(accommodation, host);
    } catch (error) {
      console.error('Error fetching accommodation:', error);
      return undefined;
    }
  }

  // ===== SEARCH AND DISCOVERY =====
  
  async searchAccommodations(criteria: AccommodationSearchCriteria): Promise<Accommodation[]> {
    try {
      let query = db
        .select({
          accommodation: accommodations,
          host: users
        })
        .from(accommodations)
        .leftJoin(users, eq(accommodations.hostId, users.id));

      // ✅ CORREÇÃO APLICADA: Filtro de disponibilidade com valor padrão true
      const conditions = [eq(accommodations.isAvailable, criteria.isAvailable ?? true)];

      if (criteria.location) {
        conditions.push(sql`${accommodations.address} ILIKE ${`%${criteria.location}%`}`);
      }

      if (criteria.type) {
        conditions.push(eq(accommodations.type, criteria.type));
      }

      if (criteria.minPrice) {
        conditions.push(sql`CAST(${accommodations.pricePerNight} AS DECIMAL) >= ${criteria.minPrice}`);
      }

      if (criteria.maxPrice) {
        conditions.push(sql`CAST(${accommodations.pricePerNight} AS DECIMAL) <= ${criteria.maxPrice}`);
      }

      // ✅ CORREÇÃO APLICADA: Filtro de número de hóspedes (agora funcionará após adicionar a coluna)
      if (criteria.guests) {
        conditions.push(gte(accommodations.maxGuests, Number(criteria.guests)));
      }

      if (criteria.amenities && criteria.amenities.length > 0) {
        conditions.push(sql`${accommodations.amenities} && ${criteria.amenities}`);
      }

      if (criteria.hostId) {
        conditions.push(eq(accommodations.hostId, criteria.hostId));
      }

      const results = await query
        .where(and(...conditions))
        .orderBy(desc(accommodations.rating))
        .limit(50);

      return results.map(({ accommodation, host }) => 
        mapToAccommodation(accommodation, host)
      );
    } catch (error) {
      console.error('Error searching accommodations:', error);
      return [];
    }
  }

  async getAccommodationsByHost(hostId: string): Promise<Accommodation[]> {
    try {
      const accommodationList = await db
        .select()
        .from(accommodations)
        .where(eq(accommodations.hostId, hostId))
        .orderBy(desc(accommodations.rating));
      
      return accommodationList.map(accommodation => mapToAccommodation(accommodation));
    } catch (error) {
      console.error('Error fetching accommodations by host:', error);
      return [];
    }
  }

  async getAvailableAccommodations(checkIn?: Date, checkOut?: Date): Promise<Accommodation[]> {
    try {
      const results = await db
        .select({
          accommodation: accommodations,
          host: users
        })
        .from(accommodations)
        .leftJoin(users, eq(accommodations.hostId, users.id))
        .where(eq(accommodations.isAvailable, true))
        .orderBy(desc(accommodations.rating))
        .limit(100);

      return results.map(({ accommodation, host }) => 
        mapToAccommodation(accommodation, host)
      );
    } catch (error) {
      console.error('Error fetching available accommodations:', error);
      return [];
    }
  }

  async getFeaturedAccommodations(limit: number = 10): Promise<Accommodation[]> {
    try {
      const results = await db
        .select({
          accommodation: accommodations,
          host: users
        })
        .from(accommodations)
        .leftJoin(users, eq(accommodations.hostId, users.id))
        .where(and(
          eq(accommodations.isAvailable, true),
          sql`CAST(${accommodations.rating} AS DECIMAL) >= 4.0`
        ))
        .orderBy(desc(accommodations.rating), desc(accommodations.reviewCount))
        .limit(limit);

      return results.map(({ accommodation, host }) => 
        mapToAccommodation(accommodation, host)
      );
    } catch (error) {
      console.error('Error fetching featured accommodations:', error);
      return [];
    }
  }

  // ===== PARTNERSHIP FEATURES =====
  
  async updatePartnershipProgram(id: string, program: PartnershipProgram): Promise<Accommodation> {
    try {
      return this.updateAccommodation(id, {
        offerDriverDiscounts: program.offerDriverDiscounts,
        driverDiscountRate: program.driverDiscountRate,
        partnershipBadgeVisible: program.partnershipBadgeVisible,
      });
    } catch (error) {
      console.error('Error updating partnership program:', error);
      throw error;
    }
  }

  async getPartnerAccommodations(): Promise<Accommodation[]> {
    try {
      const results = await db
        .select({
          accommodation: accommodations,
          host: users
        })
        .from(accommodations)
        .leftJoin(users, eq(accommodations.hostId, users.id))
        .where(and(
          eq(accommodations.isAvailable, true),
          eq(accommodations.offerDriverDiscounts, true)
        ))
        .orderBy(desc(accommodations.driverDiscountRate));

      return results.map(({ accommodation, host }) => 
        mapToAccommodation(accommodation, host)
      );
    } catch (error) {
      console.error('Error fetching partner accommodations:', error);
      return [];
    }
  }

  async getDriverDiscountEligible(accommodationId: string, driverLevel: string): Promise<boolean> {
    try {
      const accommodation = await this.getAccommodation(accommodationId);
      if (!accommodation || !accommodation.offerDriverDiscounts) return false;

      const levelOrder = ['bronze', 'silver', 'gold', 'platinum'];
      const requiredLevel = levelOrder.indexOf(accommodation.minimumDriverLevel);
      const driverLevelIndex = levelOrder.indexOf(driverLevel);

      return driverLevelIndex >= requiredLevel;
    } catch (error) {
      console.error('Error checking driver discount eligibility:', error);
      return false;
    }
  }

  // ===== AVAILABILITY MANAGEMENT =====
  
  async updateAccommodationAvailability(id: string, isAvailable: boolean): Promise<Accommodation> {
    try {
      return this.updateAccommodation(id, { isAvailable });
    } catch (error) {
      console.error('Error updating accommodation availability:', error);
      throw error;
    }
  }

  // ===== ANALYTICS =====
  
  async getAccommodationStatistics(hostId?: string): Promise<{
    totalAccommodations: number;
    activeAccommodations: number;
    partnerAccommodations: number;
    averagePrice: number;
  }> {
    try {
      const baseCondition = hostId ? eq(accommodations.hostId, hostId) : sql`1=1`;

      const [totalAccommodations] = await db
        .select({ count: sql`count(*)` })
        .from(accommodations)
        .where(baseCondition);

      const [activeAccommodations] = await db
        .select({ count: sql`count(*)` })
        .from(accommodations)
        .where(and(baseCondition, eq(accommodations.isAvailable, true)));

      const [partnerAccommodations] = await db
        .select({ count: sql`count(*)` })
        .from(accommodations)
        .where(and(baseCondition, eq(accommodations.offerDriverDiscounts, true)));

      const [averagePrice] = await db
        .select({ avg: sql`AVG(CAST(${accommodations.pricePerNight} AS DECIMAL))` })
        .from(accommodations)
        .where(baseCondition);

      return {
        totalAccommodations: Number(totalAccommodations.count),
        activeAccommodations: Number(activeAccommodations.count),
        partnerAccommodations: Number(partnerAccommodations.count),
        averagePrice: Number(averagePrice.avg) || 0,
      };
    } catch (error) {
      console.error('Error fetching accommodation statistics:', error);
      return {
        totalAccommodations: 0,
        activeAccommodations: 0,
        partnerAccommodations: 0,
        averagePrice: 0,
      };
    }
  }
}

export const accommodationStorage = new DatabaseAccommodationStorage();