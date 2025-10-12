import { eq, and, or, gte, lte, desc, sql, ne, like } from 'drizzle-orm';
import { db } from '../../db';
import { events, users } from '../../shared/schema';
import { 
  User,
  GeoLocation 
} from '../types';

// ✅ Adicionado: Tipo inferido para insert (ajuda o TS)
type EventInsert = typeof events.$inferInsert;

// Event status constants
export const EVENT_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed'
} as const;

// Event interfaces (extending base types)
export interface Event {
  id: string;
  title: string;
  description?: string;
  organizerId: string;
  startDate: Date;
  endDate: Date;
  startTime: string;
  endTime?: string;
  venue: string;
  address: string;
  lat?: number;
  lng?: number;
  ticketPrice: number;
  maxAttendees?: number;
  maxTickets?: number;
  currentAttendees: number;
  ticketsSold?: number;
  category: string;
  tags: string[];
  images: string[];
  isPublic: boolean;
  requiresApproval: boolean;
  status: string;
  createdAt: Date;
  updatedAt?: Date;
  organizer?: User;
}

export interface CreateEventData {
  title: string;
  description?: string;
  organizerId: string;
  startDate: Date;
  endDate: Date;
  startTime: string;
  endTime?: string;
  venue: string;
  address: string;
  lat?: number;
  lng?: number;
  ticketPrice: number;
  maxAttendees?: number;
  maxTickets?: number;
  category: string;
  tags?: string[];
  images?: string[];
  isPublic?: boolean;
  requiresApproval?: boolean;
  eventType: string;
  isPaid?: boolean;
}

export interface UpdateEventData {
  title?: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  startTime?: string;
  endTime?: string;
  venue?: string;
  address?: string;
  lat?: number;
  lng?: number;
  ticketPrice?: number;
  maxAttendees?: number;
  maxTickets?: number;
  currentAttendees?: number;
  ticketsSold?: number; // ✅ CORREÇÃO: Adicionado ticketsSold
  category?: string;
  tags?: string[];
  images?: string[];
  isPublic?: boolean;
  requiresApproval?: boolean;
  status?: string;
  eventType?: string;
  isPaid?: boolean;
}

export interface EventSearchCriteria {
  location?: string;
  category?: string;
  dateRange?: { from: Date; to: Date };
  maxPrice?: number;
  tags?: string[];
  organizerId?: string;
  isPublic?: boolean;
}

export interface IEventStorage {
  createEvent(data: CreateEventData): Promise<Event>;
  updateEvent(id: string, data: UpdateEventData): Promise<Event>;
  deleteEvent(id: string): Promise<void>;
  getEvent(id: string): Promise<Event | undefined>;
  searchEvents(criteria: EventSearchCriteria): Promise<Event[]>;
  getEventsByOrganizer(organizerId: string): Promise<Event[]>;
  getUpcomingEvents(limit?: number): Promise<Event[]>;
  getFeaturedEvents(limit?: number): Promise<Event[]>;
  getEventsByCategory(category: string): Promise<Event[]>;
  updateEventAttendance(eventId: string, change: number): Promise<Event>;
  checkEventAvailability(eventId: string): Promise<boolean>;
  publishEvent(eventId: string): Promise<Event>;
  cancelEvent(eventId: string, reason: string): Promise<Event>;
  getEventStatistics(organizerId?: string): Promise<{
    totalEvents: number;
    upcomingEvents: number;
    completedEvents: number;
    totalAttendees: number;
  }>;
  getEventsByFilter(filters: any): Promise<Event[]>;
}

export class DatabaseEventStorage implements IEventStorage {
  
  private normalizeEventTitle(title: string): string {
    return title.trim().replace(/\s+/g, ' ');
  }

  async createEvent(data: CreateEventData): Promise<Event> {
    try {
      // Validação dos dados
      if (!data.title || data.title.trim().length === 0) {
        throw new Error('Event title is required');
      }
      
      if (data.ticketPrice < 0) {
        throw new Error('Price cannot be negative');
      }
      
      if (!data.organizerId) {
        throw new Error('Organizer ID is required');
      }
      
      if (!data.startDate || data.startDate < new Date()) {
        throw new Error('Valid start date is required');
      }

      const [newEvent] = await db
        .insert(events)
        .values({
          title: this.normalizeEventTitle(data.title),
          description: data.description || "",
          category: data.category,
          venue: data.venue,
          address: data.address,
          lat: data.lat != null ? data.lat.toString() : null,
          lng: data.lng != null ? data.lng.toString() : null,
          images: data.images || [],
          status: EVENT_STATUS.PENDING,
          tags: data.tags || [],
          organizerId: data.organizerId,
          eventType: data.eventType || "general",
          startDate: data.startDate,
          endDate: data.endDate,
          startTime: data.startTime,
          endTime: data.endTime || null,
          isPaid: data.isPaid ?? data.ticketPrice > 0,
          ticketPrice: data.ticketPrice.toString(),
          maxTickets: data.maxTickets || data.maxAttendees || 100,
          ticketsSold: 0,
          maxAttendees: data.maxAttendees || 100,
          currentAttendees: 0,
          isPublic: data.isPublic ?? true,
          requiresApproval: data.requiresApproval ?? false,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return this.mapDbEventToEvent(newEvent);
    } catch (error) {
      console.error('Error creating event:', error);
      
      if (error instanceof Error) {
        throw new Error(`Failed to create event: ${error.message}`);
      }
      
      throw new Error('Failed to create event');
    }
  }

  async updateEvent(id: string, data: UpdateEventData): Promise<Event> {
    try {
      console.log("🔄 EVENT STORAGE: Atualizando evento", id, "com dados:", data);
      
      const updateData: Partial<EventInsert> = {};
      
      if (data.title !== undefined) updateData.title = this.normalizeEventTitle(data.title);
      if (data.description !== undefined) updateData.description = data.description;
      if (data.startDate !== undefined) updateData.startDate = data.startDate;
      if (data.endDate !== undefined) updateData.endDate = data.endDate;
      if (data.startTime !== undefined) updateData.startTime = data.startTime;
      if (data.endTime !== undefined) updateData.endTime = data.endTime;
      if (data.venue !== undefined) updateData.venue = data.venue;
      if (data.address !== undefined) updateData.address = data.address;
      if (data.lat !== undefined) updateData.lat = data.lat != null ? data.lat.toString() : null;
      if (data.lng !== undefined) updateData.lng = data.lng != null ? data.lng.toString() : null;
      if (data.ticketPrice !== undefined) {
        updateData.ticketPrice = data.ticketPrice.toString();
        updateData.isPaid = data.ticketPrice > 0;
      }
      if (data.maxAttendees !== undefined) updateData.maxAttendees = data.maxAttendees;
      if (data.maxTickets !== undefined) updateData.maxTickets = data.maxTickets;
      if (data.currentAttendees !== undefined) updateData.currentAttendees = data.currentAttendees;
      
      // ✅ CORREÇÃO CRÍTICA: Incluir ticketsSold na atualização
      if (data.ticketsSold !== undefined) {
        console.log("🎫 EVENT STORAGE: Atualizando ticketsSold para:", data.ticketsSold);
        updateData.ticketsSold = data.ticketsSold;
      }
      
      if (data.category !== undefined) updateData.category = data.category;
      if (data.tags !== undefined) updateData.tags = data.tags;
      if (data.images !== undefined) updateData.images = data.images;
      if (data.isPublic !== undefined) updateData.isPublic = data.isPublic;
      if (data.requiresApproval !== undefined) updateData.requiresApproval = data.requiresApproval;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.eventType !== undefined) updateData.eventType = data.eventType;
      if (data.isPaid !== undefined) updateData.isPaid = data.isPaid;
      
      updateData.updatedAt = new Date();

      console.log("📝 EVENT STORAGE: Dados finais para update:", updateData);

      const [updatedEvent] = await db
        .update(events)
        .set(updateData)
        .where(eq(events.id, id))
        .returning();

      if (!updatedEvent) {
        throw new Error('Event not found');
      }

      const result = this.mapDbEventToEvent(updatedEvent);
      console.log("✅ EVENT STORAGE: Evento atualizado com sucesso. ticketsSold:", result.ticketsSold);
      
      return result;
    } catch (error) {
      console.error('❌ EVENT STORAGE: Erro ao atualizar evento:', error);
      
      if (error instanceof Error) {
        throw new Error(`Failed to update event: ${error.message}`);
      }
      
      throw new Error('Failed to update event');
    }
  }

  async deleteEvent(id: string): Promise<void> {
    try {
      const [deletedEvent] = await db
        .delete(events)
        .where(eq(events.id, id))
        .returning();

      if (!deletedEvent) {
        throw new Error('Event not found');
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      
      if (error instanceof Error) {
        throw new Error(`Failed to delete event: ${error.message}`);
      }
      
      throw new Error('Failed to delete event');
    }
  }

  async getEvent(id: string): Promise<Event | undefined> {
    try {
      const [row] = await db
        .select({
          event: {
            id: events.id,
            title: events.title,
            description: events.description,
            organizerId: events.organizerId,
            startDate: events.startDate,
            endDate: events.endDate,
            startTime: events.startTime,
            endTime: events.endTime,
            venue: events.venue,
            address: events.address,
            lat: events.lat,
            lng: events.lng,
            ticketPrice: events.ticketPrice,
            maxAttendees: events.maxAttendees,
            maxTickets: events.maxTickets,
            currentAttendees: events.currentAttendees,
            ticketsSold: events.ticketsSold,
            category: events.category,
            tags: events.tags,
            images: events.images,
            isPublic: events.isPublic,
            requiresApproval: events.requiresApproval,
            status: events.status,
            createdAt: events.createdAt,
            updatedAt: events.updatedAt,
            isPaid: events.isPaid,
            eventType: events.eventType,
          },
          organizer: {
            id: users.id,
            email: users.email,
            fullName: users.fullName,
            phone: users.phone,
            roles: users.roles,
            profileImageUrl: users.profileImageUrl,
            isVerified: users.isVerified,
          }
        })
        .from(events)
        .leftJoin(users, eq(events.organizerId, users.id))
        .where(eq(events.id, id))
        .limit(1);

      if (!row) return undefined;

      return this.mapDbEventToEvent(row.event, row.organizer);
    } catch (error) {
      console.error('Error fetching event:', error);
      return undefined;
    }
  }

  async searchEvents(criteria: EventSearchCriteria): Promise<Event[]> {
    try {
      let conditions = [];

      if (criteria.location) {
        conditions.push(
          or(
            like(events.venue, `%${criteria.location}%`),
            like(events.address, `%${criteria.location}%`)
          )
        );
      }
      
      if (criteria.category) {
        conditions.push(eq(events.category, criteria.category));
      }
      
      if (criteria.dateRange) {
        conditions.push(
          and(
            gte(events.startDate, criteria.dateRange.from),
            lte(events.endDate, criteria.dateRange.to)
          )
        );
      }
      
      if (criteria.maxPrice !== undefined) {
        conditions.push(sql`CAST(${events.ticketPrice} AS DECIMAL) <= ${criteria.maxPrice}`);
      }
      
      if (criteria.tags && criteria.tags.length > 0) {
        conditions.push(sql`${events.tags} && ${criteria.tags}`);
      }
      
      if (criteria.organizerId) {
        conditions.push(eq(events.organizerId, criteria.organizerId));
      }
      
      if (criteria.isPublic !== undefined) {
        conditions.push(eq(events.isPublic, criteria.isPublic));
      }

      conditions.push(ne(events.status, EVENT_STATUS.CANCELLED));

      const rows = await db
        .select({
          event: {
            id: events.id,
            title: events.title,
            description: events.description,
            organizerId: events.organizerId,
            startDate: events.startDate,
            endDate: events.endDate,
            startTime: events.startTime,
            endTime: events.endTime,
            venue: events.venue,
            address: events.address,
            lat: events.lat,
            lng: events.lng,
            ticketPrice: events.ticketPrice,
            maxAttendees: events.maxAttendees,
            maxTickets: events.maxTickets,
            currentAttendees: events.currentAttendees,
            ticketsSold: events.ticketsSold,
            category: events.category,
            tags: events.tags,
            images: events.images,
            isPublic: events.isPublic,
            requiresApproval: events.requiresApproval,
            status: events.status,
            createdAt: events.createdAt,
            updatedAt: events.updatedAt,
            isPaid: events.isPaid,
            eventType: events.eventType,
          },
          organizer: {
            id: users.id,
            email: users.email,
            fullName: users.fullName,
            phone: users.phone,
            roles: users.roles,
            profileImageUrl: users.profileImageUrl,
            isVerified: users.isVerified,
          }
        })
        .from(events)
        .leftJoin(users, eq(events.organizerId, users.id))
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(events.startDate));

      return rows.map(row => this.mapDbEventToEvent(row.event, row.organizer));
    } catch (error) {
      console.error('Error searching events:', error);
      return [];
    }
  }

  async getEventsByOrganizer(organizerId: string): Promise<Event[]> {
    try {
      const rows = await db
        .select({
          event: {
            id: events.id,
            title: events.title,
            description: events.description,
            organizerId: events.organizerId,
            startDate: events.startDate,
            endDate: events.endDate,
            startTime: events.startTime,
            endTime: events.endTime,
            venue: events.venue,
            address: events.address,
            lat: events.lat,
            lng: events.lng,
            ticketPrice: events.ticketPrice,
            maxAttendees: events.maxAttendees,
            maxTickets: events.maxTickets,
            currentAttendees: events.currentAttendees,
            ticketsSold: events.ticketsSold,
            category: events.category,
            tags: events.tags,
            images: events.images,
            isPublic: events.isPublic,
            requiresApproval: events.requiresApproval,
            status: events.status,
            createdAt: events.createdAt,
            updatedAt: events.updatedAt,
            isPaid: events.isPaid,
            eventType: events.eventType,
          },
          organizer: {
            id: users.id,
            email: users.email,
            fullName: users.fullName,
            phone: users.phone,
            roles: users.roles,
            profileImageUrl: users.profileImageUrl,
            isVerified: users.isVerified,
          }
        })
        .from(events)
        .leftJoin(users, eq(events.organizerId, users.id))
        .where(eq(events.organizerId, organizerId))
        .orderBy(desc(events.createdAt));

      return rows.map(row => this.mapDbEventToEvent(row.event, row.organizer));
    } catch (error) {
      console.error('Error fetching events by organizer:', error);
      return [];
    }
  }

  async getUpcomingEvents(limit: number = 20): Promise<Event[]> {
    try {
      const rows = await db
        .select({
          event: {
            id: events.id,
            title: events.title,
            description: events.description,
            organizerId: events.organizerId,
            startDate: events.startDate,
            endDate: events.endDate,
            startTime: events.startTime,
            endTime: events.endTime,
            venue: events.venue,
            address: events.address,
            lat: events.lat,
            lng: events.lng,
            ticketPrice: events.ticketPrice,
            maxAttendees: events.maxAttendees,
            maxTickets: events.maxTickets,
            currentAttendees: events.currentAttendees,
            ticketsSold: events.ticketsSold,
            category: events.category,
            tags: events.tags,
            images: events.images,
            isPublic: events.isPublic,
            requiresApproval: events.requiresApproval,
            status: events.status,
            createdAt: events.createdAt,
            updatedAt: events.updatedAt,
            isPaid: events.isPaid,
            eventType: events.eventType,
          },
          organizer: {
            id: users.id,
            email: users.email,
            fullName: users.fullName,
            phone: users.phone,
            roles: users.roles,
            profileImageUrl: users.profileImageUrl,
            isVerified: users.isVerified,
          }
        })
        .from(events)
        .leftJoin(users, eq(events.organizerId, users.id))
        .where(
          and(
            gte(events.startDate, new Date()),
            eq(events.isPublic, true),
            ne(events.status, EVENT_STATUS.CANCELLED)
          )
        )
        .orderBy(events.startDate)
        .limit(limit);

      return rows.map(row => this.mapDbEventToEvent(row.event, row.organizer));
    } catch (error) {
      console.error('Error fetching upcoming events:', error);
      return [];
    }
  }

  async getFeaturedEvents(limit: number = 10): Promise<Event[]> {
    try {
      const rows = await db
        .select({
          event: {
            id: events.id,
            title: events.title,
            description: events.description,
            organizerId: events.organizerId,
            startDate: events.startDate,
            endDate: events.endDate,
            startTime: events.startTime,
            endTime: events.endTime,
            venue: events.venue,
            address: events.address,
            lat: events.lat,
            lng: events.lng,
            ticketPrice: events.ticketPrice,
            maxAttendees: events.maxAttendees,
            maxTickets: events.maxTickets,
            currentAttendees: events.currentAttendees,
            ticketsSold: events.ticketsSold,
            category: events.category,
            tags: events.tags,
            images: events.images,
            isPublic: events.isPublic,
            requiresApproval: events.requiresApproval,
            status: events.status,
            createdAt: events.createdAt,
            updatedAt: events.updatedAt,
            isPaid: events.isPaid,
            eventType: events.eventType,
          },
          organizer: {
            id: users.id,
            email: users.email,
            fullName: users.fullName,
            phone: users.phone,
            roles: users.roles,
            profileImageUrl: users.profileImageUrl,
            isVerified: users.isVerified,
          }
        })
        .from(events)
        .leftJoin(users, eq(events.organizerId, users.id))
        .where(
          and(
            gte(events.startDate, new Date()),
            eq(events.isPublic, true),
            ne(events.status, EVENT_STATUS.CANCELLED),
            eq(events.isFeatured, true)
          )
        )
        .orderBy(desc(events.ticketsSold))
        .limit(limit);

      return rows.map(row => this.mapDbEventToEvent(row.event, row.organizer));
    } catch (error) {
      console.error('Error fetching featured events:', error);
      return [];
    }
  }

  async getEventsByCategory(category: string): Promise<Event[]> {
    try {
      const rows = await db
        .select({
          event: {
            id: events.id,
            title: events.title,
            description: events.description,
            organizerId: events.organizerId,
            startDate: events.startDate,
            endDate: events.endDate,
            startTime: events.startTime,
            endTime: events.endTime,
            venue: events.venue,
            address: events.address,
            lat: events.lat,
            lng: events.lng,
            ticketPrice: events.ticketPrice,
            maxAttendees: events.maxAttendees,
            maxTickets: events.maxTickets,
            currentAttendees: events.currentAttendees,
            ticketsSold: events.ticketsSold,
            category: events.category,
            tags: events.tags,
            images: events.images,
            isPublic: events.isPublic,
            requiresApproval: events.requiresApproval,
            status: events.status,
            createdAt: events.createdAt,
            updatedAt: events.updatedAt,
            isPaid: events.isPaid,
            eventType: events.eventType,
          },
          organizer: {
            id: users.id,
            email: users.email,
            fullName: users.fullName,
            phone: users.phone,
            roles: users.roles,
            profileImageUrl: users.profileImageUrl,
            isVerified: users.isVerified,
          }
        })
        .from(events)
        .leftJoin(users, eq(events.organizerId, users.id))
        .where(
          and(
            eq(events.category, category),
            gte(events.startDate, new Date()),
            eq(events.isPublic, true),
            ne(events.status, EVENT_STATUS.CANCELLED)
          )
        )
        .orderBy(events.startDate);

      return rows.map(row => this.mapDbEventToEvent(row.event, row.organizer));
    } catch (error) {
      console.error('Error fetching events by category:', error);
      return [];
    }
  }

  async updateEventAttendance(eventId: string, change: number): Promise<Event> {
    try {
      const [updatedEvent] = await db
        .update(events)
        .set({
          ticketsSold: sql`${events.ticketsSold} + ${change}`,
          currentAttendees: sql`${events.currentAttendees} + ${change}`,
          updatedAt: new Date()
        })
        .where(eq(events.id, eventId))
        .returning();

      if (!updatedEvent) {
        throw new Error('Event not found');
      }

      return this.mapDbEventToEvent(updatedEvent);
    } catch (error) {
      console.error('Error updating event attendance:', error);
      throw error;
    }
  }

  async checkEventAvailability(eventId: string): Promise<boolean> {
    try {
      const [event] = await db
        .select()
        .from(events)
        .where(
          and(
            eq(events.id, eventId),
            eq(events.status, EVENT_STATUS.ACTIVE),
            gte(events.startDate, new Date()),
            sql`${events.ticketsSold} < ${events.maxTickets}`
          )
        )
        .limit(1);

      return !!event;
    } catch (error) {
      console.error('Error checking event availability:', error);
      return false;
    }
  }

  async publishEvent(eventId: string): Promise<Event> {
    try {
      return this.updateEvent(eventId, { status: EVENT_STATUS.ACTIVE });
    } catch (error) {
      console.error('Error publishing event:', error);
      throw error;
    }
  }

  async cancelEvent(eventId: string, reason: string): Promise<Event> {
    try {
      return this.updateEvent(eventId, { status: EVENT_STATUS.CANCELLED });
    } catch (error) {
      console.error('Error cancelling event:', error);
      throw error;
    }
  }

  async getEventStatistics(organizerId?: string): Promise<{
    totalEvents: number;
    upcomingEvents: number;
    completedEvents: number;
    totalAttendees: number;
  }> {
    try {
      let conditions = [];
      
      if (organizerId) {
        conditions.push(eq(events.organizerId, organizerId));
      }

      const baseCondition = conditions.length ? and(...conditions) : undefined;

      const [totalEventsResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(events)
        .where(baseCondition);

      const [upcomingEventsResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(events)
        .where(
          and(
            baseCondition,
            gte(events.startDate, new Date()),
            ne(events.status, EVENT_STATUS.CANCELLED)
          )
        );

      const [completedEventsResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(events)
        .where(
          and(
            baseCondition,
            lte(events.endDate, new Date()),
            ne(events.status, EVENT_STATUS.CANCELLED)
          )
        );

      const [totalAttendeesResult] = await db
        .select({ total: sql<number>`coalesce(sum(${events.ticketsSold}), 0)` })
        .from(events)
        .where(baseCondition);

      return {
        totalEvents: totalEventsResult?.count || 0,
        upcomingEvents: upcomingEventsResult?.count || 0,
        completedEvents: completedEventsResult?.count || 0,
        totalAttendees: totalAttendeesResult?.total || 0,
      };
    } catch (error) {
      console.error('Error fetching event statistics:', error);
      return {
        totalEvents: 0,
        upcomingEvents: 0,
        completedEvents: 0,
        totalAttendees: 0,
      };
    }
  }

  async getEventCategories(): Promise<string[]> {
    try {
      const result = await db
        .selectDistinct({ category: events.category })
        .from(events)
        .where(ne(events.category, ''));

      return result.map(row => row.category).filter(Boolean);
    } catch (error) {
      console.error('Error fetching event categories:', error);
      return [];
    }
  }

  async getEventsByDateRange(startDate: Date, endDate: Date): Promise<Event[]> {
    try {
      return this.searchEvents({
        dateRange: { from: startDate, to: endDate }
      });
    } catch (error) {
      console.error('Error fetching events by date range:', error);
      return [];
    }
  }

  async getNearbyEvents(location: GeoLocation, radius: number = 50): Promise<Event[]> {
    try {
      console.log('Nearby events placeholder:', { location, radius });
      return this.searchEvents({
        location: location.address
      });
    } catch (error) {
      console.error('Error fetching nearby events:', error);
      return [];
    }
  }

  async getEventsByFilter(filters: any): Promise<Event[]> {
    try {
      let conditions = [];

      if (filters.status) {
        conditions.push(eq(events.status, filters.status));
      }
      
      if (filters.isPublic !== undefined) {
        conditions.push(eq(events.isPublic, filters.isPublic));
      }
      
      if (filters.category) {
        conditions.push(eq(events.category, filters.category));
      }
      
      if (filters.eventType) {
        conditions.push(eq(events.eventType, filters.eventType));
      }
      
      if (filters.organizerId) {
        conditions.push(eq(events.organizerId, filters.organizerId));
      }

      const rows = await db
        .select({
          event: {
            id: events.id,
            title: events.title,
            description: events.description,
            organizerId: events.organizerId,
            startDate: events.startDate,
            endDate: events.endDate,
            startTime: events.startTime,
            endTime: events.endTime,
            venue: events.venue,
            address: events.address,
            lat: events.lat,
            lng: events.lng,
            ticketPrice: events.ticketPrice,
            maxAttendees: events.maxAttendees,
            maxTickets: events.maxTickets,
            currentAttendees: events.currentAttendees,
            ticketsSold: events.ticketsSold,
            category: events.category,
            tags: events.tags,
            images: events.images,
            isPublic: events.isPublic,
            requiresApproval: events.requiresApproval,
            status: events.status,
            createdAt: events.createdAt,
            updatedAt: events.updatedAt,
            isPaid: events.isPaid,
            eventType: events.eventType,
          },
          organizer: {
            id: users.id,
            email: users.email,
            fullName: users.fullName,
            phone: users.phone,
            roles: users.roles,
            profileImageUrl: users.profileImageUrl,
            isVerified: users.isVerified,
          }
        })
        .from(events)
        .leftJoin(users, eq(events.organizerId, users.id))
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(events.createdAt));

      return rows.map(row => this.mapDbEventToEvent(row.event, row.organizer));
    } catch (error) {
      console.error('Error getting events by filter:', error);
      return [];
    }
  }

  private mapDbEventToEvent(dbEvent: any, user?: any): Event {
    return {
      id: dbEvent.id,
      title: dbEvent.title || 'Sem título',
      description: dbEvent.description,
      organizerId: dbEvent.organizerId,
      startDate: dbEvent.startDate,
      endDate: dbEvent.endDate,
      startTime: dbEvent.startTime,
      endTime: dbEvent.endTime,
      venue: dbEvent.venue,
      address: dbEvent.address,
      lat: dbEvent.lat ? Number(dbEvent.lat) : undefined,
      lng: dbEvent.lng ? Number(dbEvent.lng) : undefined,
      ticketPrice: Number(dbEvent.ticketPrice || 0),
      maxAttendees: dbEvent.maxAttendees,
      maxTickets: dbEvent.maxTickets,
      currentAttendees: dbEvent.currentAttendees || 0,
      ticketsSold: dbEvent.ticketsSold || 0, // ✅ CORREÇÃO: Garantir que ticketsSold seja retornado
      category: dbEvent.category,
      tags: dbEvent.tags || [],
      images: dbEvent.images || [],
      isPublic: dbEvent.isPublic,
      requiresApproval: dbEvent.requiresApproval,
      status: dbEvent.status,
      createdAt: dbEvent.createdAt,
      updatedAt: dbEvent.updatedAt,
      organizer: user ? this.mapDbUserToUser(user) : undefined
    };
  }

  private mapDbUserToUser(dbUser: any): User {
    return {
      id: dbUser.id,
      email: dbUser.email || null,
      firstName: dbUser.firstName || null,
      lastName: dbUser.lastName || null,
      fullName: dbUser.fullName || null,
      phone: dbUser.phone || null,
      userType: dbUser.userType || 'client',
      roles: dbUser.roles || [],
      canOfferServices: dbUser.canOfferServices || false,
      profileImageUrl: dbUser.profileImageUrl || null,
      avatar: dbUser.avatar || null,
      rating: parseFloat(dbUser.rating || '0'),
      totalReviews: dbUser.totalReviews || 0,
      isVerified: dbUser.isVerified || false,
      verificationStatus: dbUser.verificationStatus || 'pending',
      verificationDate: dbUser.verificationDate || null,
      verificationNotes: dbUser.verificationNotes || null,
      identityDocumentUrl: dbUser.identityDocumentUrl || null,
      identityDocumentType: dbUser.identityDocumentType || null,
      profilePhotoUrl: dbUser.profilePhotoUrl || null,
      documentNumber: dbUser.documentNumber || null,
      dateOfBirth: dbUser.dateOfBirth || null,
      registrationCompleted: dbUser.registrationCompleted || false,
      verificationBadge: dbUser.verificationBadge || null,
      badgeEarnedDate: dbUser.badgeEarnedDate || null,
      createdAt: dbUser.createdAt,
      updatedAt: dbUser.updatedAt || null
    };
  }
}

export const eventStorage = new DatabaseEventStorage();