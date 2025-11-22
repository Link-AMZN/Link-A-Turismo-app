import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../../db';
import { accommodations, users, driverStats } from '../../shared/schema';
import { 
  PartnershipProgram,
  User,
  Accommodation 
} from '../types';

// Partnership interfaces
export interface Partnership {
  id: string;
  type: 'driver_accommodation' | 'business_partnership' | 'referral_program';
  providerId: string;
  partnerId?: string;
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  terms: {
    discountRate?: number;
    commissionRate?: number;
    minimumRequirements?: any;
    description?: string; // ✅ ADICIONADO: Campo para descrição
  };
  metrics: {
    totalTransactions: number;
    totalSavings: number;
    totalCommissions: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePartnershipData {
  type: Partnership['type'];
  providerId: string;
  partnerId?: string;
  terms: Partnership['terms'];
  status?: Partnership['status']; // ✅ ADICIONADO: Status opcional
  metrics?: { // ✅ ADICIONADO: Metrics opcional
    totalTransactions?: number;
    totalSavings?: number;
    totalCommissions?: number;
  };
}

export interface PartnershipMetrics {
  totalPartnerships: number;
  activePartnerships: number;
  totalSavings: number;
  totalCommissions: number;
  partnershipsByType: { [type: string]: number };
}

// In-memory storage for partnerships until proper tables are added
class InMemoryPartnershipStorage {
  private partnerships: Map<string, Partnership> = new Map();

  private generateId(): string {
    return `partnership_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async createPartnership(data: CreatePartnershipData): Promise<Partnership> {
    const partnership: Partnership = {
      id: this.generateId(),
      type: data.type,
      providerId: data.providerId,
      partnerId: data.partnerId,
      status: data.status || 'active', // ✅ Usar status fornecido ou padrão
      terms: data.terms,
      metrics: {
        totalTransactions: data.metrics?.totalTransactions || 0,
        totalSavings: data.metrics?.totalSavings || 0,
        totalCommissions: data.metrics?.totalCommissions || 0,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.partnerships.set(partnership.id, partnership);
    return partnership;
  }

  async getPartnership(id: string): Promise<Partnership | undefined> {
    return this.partnerships.get(id);
  }

  async getPartnershipsByProvider(providerId: string): Promise<Partnership[]> {
    return Array.from(this.partnerships.values()).filter(
      p => p.providerId === providerId || p.partnerId === providerId
    );
  }

  async getPartnershipsByType(type: Partnership['type']): Promise<Partnership[]> {
    return Array.from(this.partnerships.values()).filter(p => p.type === type);
  }

  async updatePartnership(id: string, updates: Partial<Partnership>): Promise<Partnership> {
    const partnership = this.partnerships.get(id);
    if (!partnership) throw new Error('Partnership not found');

    const updated = { ...partnership, ...updates, updatedAt: new Date() };
    this.partnerships.set(id, updated);
    return updated;
  }

  async deletePartnership(id: string): Promise<void> {
    this.partnerships.delete(id);
  }

  async getAllPartnerships(): Promise<Partnership[]> {
    return Array.from(this.partnerships.values());
  }
}

export interface IPartnershipStorage {
  // Partnership management
  createPartnership(data: CreatePartnershipData): Promise<Partnership>;
  getPartnership(id: string): Promise<Partnership | undefined>;
  updatePartnership(id: string, updates: Partial<Partnership>): Promise<Partnership>;
  deletePartnership(id: string): Promise<void>;
  
  // Partner discovery
  getPartnershipsByProvider(providerId: string): Promise<Partnership[]>;
  getPartnershipsByType(type: Partnership['type']): Promise<Partnership[]>;
  getActivePartnerships(): Promise<Partnership[]>;
  
  // Driver-accommodation partnerships
  getPartnerAccommodations(driverLevel: string): Promise<Accommodation[]>;
  updateDriverLevel(driverId: string): Promise<string>;
  calculateDriverDiscount(driverId: string, accommodationId: string): Promise<number>;
  
  // Partnership metrics
  getPartnershipMetrics(): Promise<PartnershipMetrics>;
  getPartnerPerformance(partnerId: string): Promise<{
    totalBookings: number;
    totalRevenue: number;
    averageRating: number;
  }>;
  
  // Referral programs
  createReferralCode(userId: string): Promise<string>;
  trackReferral(referralCode: string, newUserId: string): Promise<void>;
  getReferralStats(userId: string): Promise<{
    totalReferrals: number;
    totalEarnings: number;
    referralCode: string;
  }>;
}

export class DatabasePartnershipStorage implements IPartnershipStorage {
  private memoryStorage = new InMemoryPartnershipStorage();

  // ===== PARTNERSHIP MANAGEMENT =====
  
  async createPartnership(data: CreatePartnershipData): Promise<Partnership> {
    try {
      // TODO: Replace with actual database operations when partnerships table is added
      return this.memoryStorage.createPartnership(data);
    } catch (error) {
      console.error('Error creating partnership:', error);
      throw new Error('Failed to create partnership');
    }
  }

  async getPartnership(id: string): Promise<Partnership | undefined> {
    try {
      return this.memoryStorage.getPartnership(id);
    } catch (error) {
      console.error('Error fetching partnership:', error);
      return undefined;
    }
  }

  async updatePartnership(id: string, updates: Partial<Partnership>): Promise<Partnership> {
    try {
      return this.memoryStorage.updatePartnership(id, updates);
    } catch (error) {
      console.error('Error updating partnership:', error);
      throw error;
    }
  }

  async deletePartnership(id: string): Promise<void> {
    try {
      await this.memoryStorage.deletePartnership(id);
    } catch (error) {
      console.error('Error deleting partnership:', error);
      throw new Error('Failed to delete partnership');
    }
  }

  // ===== PARTNER DISCOVERY =====
  
  async getPartnershipsByProvider(providerId: string): Promise<Partnership[]> {
    try {
      return this.memoryStorage.getPartnershipsByProvider(providerId);
    } catch (error) {
      console.error('Error fetching partnerships by provider:', error);
      return [];
    }
  }

  async getPartnershipsByType(type: Partnership['type']): Promise<Partnership[]> {
    try {
      return this.memoryStorage.getPartnershipsByType(type);
    } catch (error) {
      console.error('Error fetching partnerships by type:', error);
      return [];
    }
  }

  async getActivePartnerships(): Promise<Partnership[]> {
    try {
      const allPartnerships = await this.memoryStorage.getAllPartnerships();
      return allPartnerships.filter(p => p.status === 'active');
    } catch (error) {
      console.error('Error fetching active partnerships:', error);
      return [];
    }
  }

  // ===== DRIVER-ACCOMMODATION PARTNERSHIPS =====
  
  async getPartnerAccommodations(driverLevel: string): Promise<Accommodation[]> {
    try {
      // Get accommodations that offer driver discounts and meet driver level requirements
      const accommodationList = await db
        .select({
          id: accommodations.id,
          name: accommodations.name,
          type: accommodations.type,
          hostId: accommodations.hostId,
          address: accommodations.address,
          lat: accommodations.lat,
          lng: accommodations.lng,
          pricePerNight: accommodations.pricePerNight,
          rating: accommodations.rating,
          reviewCount: accommodations.reviewCount,
          images: accommodations.images,
          amenities: accommodations.amenities,
          description: accommodations.description,
          distanceFromCenter: accommodations.distanceFromCenter,
          isAvailable: accommodations.isAvailable,
          offerDriverDiscounts: accommodations.offerDriverDiscounts,
          driverDiscountRate: accommodations.driverDiscountRate,
          minimumDriverLevel: accommodations.minimumDriverLevel,
          partnershipBadgeVisible: accommodations.partnershipBadgeVisible,
          createdAt: accommodations.createdAt, // ✅ CORRIGIDO: usar campo real
          updatedAt: accommodations.updatedAt, // ✅ CORRIGIDO: usar campo real
        })
        .from(accommodations)
        .where(and(
          eq(accommodations.isAvailable, true),
          eq(accommodations.offerDriverDiscounts, true)
        ));

      // Filter by driver level eligibility
      const levelOrder = ['bronze', 'silver', 'gold', 'platinum'];
      const driverLevelIndex = levelOrder.indexOf(driverLevel);

      return accommodationList.filter(accommodation => {
        const requiredLevelIndex = levelOrder.indexOf(accommodation.minimumDriverLevel || 'bronze');
        return driverLevelIndex >= requiredLevelIndex;
      }) as Accommodation[];
    } catch (error) {
      console.error('Error fetching partner accommodations:', error);
      return [];
    }
  }

  async updateDriverLevel(driverId: string): Promise<string> {
    try {
      // Get driver stats
      const [driverStatData] = await db
        .select({
          totalRides: driverStats.totalRides,
          averageRating: driverStats.averageRating,
          totalEarnings: driverStats.totalEarnings,
        })
        .from(driverStats)
        .where(eq(driverStats.driverId, driverId));

      if (!driverStatData) {
        // Create initial driver stats
        await db.insert(driverStats).values({
          driverId,
          totalRides: 0,
          averageRating: '0.00',
          totalEarnings: '0.00',
          partnershipLevel: 'bronze',
        });
        return 'bronze';
      }

      // Calculate level based on stats
      const totalRides = driverStatData.totalRides || 0;
      const avgRating = Number(driverStatData.averageRating) || 0;
      const totalEarnings = Number(driverStatData.totalEarnings) || 0;

      let newLevel = 'bronze';

      if (totalRides >= 100 && avgRating >= 4.8 && totalEarnings >= 50000) {
        newLevel = 'platinum';
      } else if (totalRides >= 50 && avgRating >= 4.5 && totalEarnings >= 25000) {
        newLevel = 'gold';
      } else if (totalRides >= 20 && avgRating >= 4.0 && totalEarnings >= 10000) {
        newLevel = 'silver';
      }

      // Update user's verification badge
      await db
        .update(users)
        .set({
          verificationBadge: newLevel,
          badgeEarnedDate: new Date(),
        })
        .where(eq(users.id, driverId));

      // ✅ CORRIGIDO: Atualizar partnershipLevel no driverStats
      await db
        .update(driverStats)
        .set({
          partnershipLevel: newLevel,
          updatedAt: new Date()
        })
        .where(eq(driverStats.driverId, driverId));

      return newLevel;
    } catch (error) {
      console.error('Error updating driver level:', error);
      return 'bronze';
    }
  }

  async calculateDriverDiscount(driverId: string, accommodationId: string): Promise<number> {
    try {
      // Get driver level
      const [user] = await db
        .select({ verificationBadge: users.verificationBadge })
        .from(users)
        .where(eq(users.id, driverId));

      if (!user) return 0;

      // Get accommodation discount info
      const [accommodation] = await db
        .select({
          offerDriverDiscounts: accommodations.offerDriverDiscounts,
          driverDiscountRate: accommodations.driverDiscountRate,
          minimumDriverLevel: accommodations.minimumDriverLevel,
        })
        .from(accommodations)
        .where(eq(accommodations.id, accommodationId));

      if (!accommodation || !accommodation.offerDriverDiscounts) return 0;

      // Check if driver meets minimum level requirement
      const levelOrder = ['bronze', 'silver', 'gold', 'platinum'];
      const driverLevel = user.verificationBadge || 'bronze';
      const requiredLevelIndex = levelOrder.indexOf(accommodation.minimumDriverLevel || 'bronze');
      const driverLevelIndex = levelOrder.indexOf(driverLevel);

      if (driverLevelIndex < requiredLevelIndex) return 0;

      return Number(accommodation.driverDiscountRate) || 0;
    } catch (error) {
      console.error('Error calculating driver discount:', error);
      return 0;
    }
  }

  // ===== PARTNERSHIP METRICS =====
  
  async getPartnershipMetrics(): Promise<PartnershipMetrics> {
    try {
      const allPartnerships = await this.memoryStorage.getAllPartnerships();
      
      const totalPartnerships = allPartnerships.length;
      const activePartnerships = allPartnerships.filter(p => p.status === 'active').length;
      
      const totalSavings = allPartnerships.reduce((sum, p) => sum + p.metrics.totalSavings, 0);
      const totalCommissions = allPartnerships.reduce((sum, p) => sum + p.metrics.totalCommissions, 0);
      
      const partnershipsByType: { [type: string]: number } = {};
      allPartnerships.forEach(p => {
        partnershipsByType[p.type] = (partnershipsByType[p.type] || 0) + 1;
      });

      return {
        totalPartnerships,
        activePartnerships,
        totalSavings,
        totalCommissions,
        partnershipsByType,
      };
    } catch (error) {
      console.error('Error fetching partnership metrics:', error);
      return {
        totalPartnerships: 0,
        activePartnerships: 0,
        totalSavings: 0,
        totalCommissions: 0,
        partnershipsByType: {},
      };
    }
  }

  async getPartnerPerformance(partnerId: string): Promise<{
    totalBookings: number;
    totalRevenue: number;
    averageRating: number;
  }> {
    try {
      // TODO: Implement when booking-partnership tracking is added
      return {
        totalBookings: 0,
        totalRevenue: 0,
        averageRating: 0,
      };
    } catch (error) {
      console.error('Error fetching partner performance:', error);
      return {
        totalBookings: 0,
        totalRevenue: 0,
        averageRating: 0,
      };
    }
  }

  // ===== REFERRAL PROGRAMS =====
  
  async createReferralCode(userId: string): Promise<string> {
    try {
      // Generate unique referral code
      const [user] = await db
        .select({ firstName: users.firstName, lastName: users.lastName })
        .from(users)
        .where(eq(users.id, userId));

      if (!user) throw new Error('User not found');

      const name = `${user.firstName}${user.lastName}`.replace(/[^a-zA-Z]/g, '').toUpperCase();
      const random = Math.random().toString(36).substr(2, 4).toUpperCase();
      const referralCode = `${name.substr(0, 4)}${random}`;

      // TODO: Store referral code in database when referrals table is added
      console.log(`Referral code created for user ${userId}: ${referralCode}`);
      
      return referralCode;
    } catch (error) {
      console.error('Error creating referral code:', error);
      throw new Error('Failed to create referral code');
    }
  }

  async trackReferral(referralCode: string, newUserId: string): Promise<void> {
    try {
      // TODO: Implement when referrals table is added
      console.log(`Tracking referral: ${referralCode} -> ${newUserId}`);
    } catch (error) {
      console.error('Error tracking referral:', error);
      throw new Error('Failed to track referral');
    }
  }

  async getReferralStats(userId: string): Promise<{
    totalReferrals: number;
    totalEarnings: number;
    referralCode: string;
  }> {
    try {
      // TODO: Implement when referrals table is added
      const referralCode = await this.createReferralCode(userId);
      
      return {
        totalReferrals: 0,
        totalEarnings: 0,
        referralCode,
      };
    } catch (error) {
      console.error('Error fetching referral stats:', error);
      return {
        totalReferrals: 0,
        totalEarnings: 0,
        referralCode: '',
      };
    }
  }

  // ===== UTILITY METHODS =====
  
  async getTopPartners(limit: number = 10): Promise<Array<{ partnerId: string; metrics: Partnership['metrics'] }>> {
    try {
      const allPartnerships = await this.memoryStorage.getAllPartnerships();
      
      return allPartnerships
        .filter(p => p.status === 'active')
        .sort((a, b) => b.metrics.totalTransactions - a.metrics.totalTransactions)
        .slice(0, limit)
        .map(p => ({
          partnerId: p.providerId,
          metrics: p.metrics,
        }));
    } catch (error) {
      console.error('Error fetching top partners:', error);
      return [];
    }
  }

  async getPartnershipOpportunities(userId: string): Promise<Partnership[]> {
    try {
      // Find potential partnerships based on user activity and preferences
      // TODO: Implement sophisticated matching algorithm
      return [];
    } catch (error) {
      console.error('Error finding partnership opportunities:', error);
      return [];
    }
  }
}

export const partnershipStorage = new DatabasePartnershipStorage();