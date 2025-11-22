import { eq, and, or, gte, lte, desc, sql, ne, like } from 'drizzle-orm';
import { db } from '../../db';
import { events, users } from '../../shared/schema';
import { 
  User,
  GeoLocation 
} from '../types';

// ✅ Adicionado: Tipo inferido para insert (ajuda o TS)
type EventInsert = typeof events.$inferInsert;

// Event status constants - atualizado para corresponder ao enum do schema
export const EVENT_STATUS = {
  PENDING: 'pending' as const,
  ACTIVE: 'active' as const,
  CANCELLED: 'cancelled' as const,
  COMPLETED: 'completed' as const,
  AVAILABLE: 'available' as const,
  CONFIRMED: 'confirmed' as const,
  EXPIRED: 'expired' as const,
  IN_PROGRESS: 'in_progress' as const,
  APPROVED: 'approved' as const,
  REJECTED: 'rejected' as const,
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
  ticketsSold?: number;
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

// ✅ ADICIONADO: Tipo para filters com tipagem TypeScript
export type EventFilters = Partial<EventSearchCriteria & {
  status?: string;
  eventType?: string;
  organizerId?: string;
}>;

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
  getEventsByFilter(filters: EventFilters): Promise<Event[]>;
}

export class DatabaseEventStorage implements IEventStorage {
  
  private normalizeEventTitle(title: string): string {
    return title.trim().replace(/\s+/g, ' ');
  }

  // ✅ ADICIONADO: Helper para evitar repetição de selects
  private buildEventSelectQuery() {
    return {
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
    };
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

      // ✅ CORREÇÃO: Converter tipos number para string conforme schema do Drizzle
      const eventData: EventInsert = {
        title: this.normalizeEventTitle(data.title),
        description: data.description || "",
        category: data.category,
        venue: data.venue,
        address: data.address,
        // ✅ CORREÇÃO: Converter number para string conforme schema
        lat: data.lat !== undefined && data.lat !== null ? data.lat.toString() : null,
        lng: data.lng !== undefined && data.lng !== null ? data.lng.toString() : null,
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
        // ✅ CORREÇÃO: Converter number para string conforme schema
        ticketPrice: data.ticketPrice.toString(),
        maxTickets: data.maxTickets || data.maxAttendees || 100,
        ticketsSold: 0, // ✅ CORREÇÃO: Garantir 0 no create
        maxAttendees: data.maxAttendees || 100,
        currentAttendees: 0,
        isPublic: data.isPublic ?? true,
        requiresApproval: data.requiresApproval ?? false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const [newEvent] = await db
        .insert(events)
        .values(eventData)
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
      
      // ✅ CORREÇÃO: Converter number para string conforme schema
      if (data.lat !== undefined) {
        updateData.lat = data.lat !== null ? data.lat.toString() : null;
      }
      if (data.lng !== undefined) {
        updateData.lng = data.lng !== null ? data.lng.toString() : null;
      }
      
      if (data.ticketPrice !== undefined) {
        // ✅ CORREÇÃO: Converter number para string conforme schema
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
      if (data.status !== undefined) {
        // ✅ CORREÇÃO: Usar type assertion para o enum
        updateData.status = data.status as any;
      }
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
        .select(this.buildEventSelectQuery())
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
        // ✅ CORREÇÃO: Usar operador correto para JSONB e evitar SQL injection
        conditions.push(sql`${events.tags} @> ${JSON.stringify(criteria.tags)}`);
      }
      
      if (criteria.organizerId) {
        conditions.push(eq(events.organizerId, criteria.organizerId));
      }
      
      if (criteria.isPublic !== undefined) {
        conditions.push(eq(events.isPublic, criteria.isPublic));
      }

      // ✅ CORREÇÃO: Usar type assertion para o enum
      conditions.push(ne(events.status, EVENT_STATUS.CANCELLED as any));

      const rows = await db
        .select(this.buildEventSelectQuery())
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
        .select(this.buildEventSelectQuery())
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
        .select(this.buildEventSelectQuery())
        .from(events)
        .leftJoin(users, eq(events.organizerId, users.id))
        .where(
          and(
            gte(events.startDate, new Date()),
            eq(events.isPublic, true),
            // ✅ CORREÇÃO: Usar type assertion para o enum
            ne(events.status, EVENT_STATUS.CANCELLED as any)
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
        .select(this.buildEventSelectQuery())
        .from(events)
        .leftJoin(users, eq(events.organizerId, users.id))
        .where(
          and(
            gte(events.startDate, new Date()),
            eq(events.isPublic, true),
            // ✅ CORREÇÃO: Usar type assertion para o enum
            ne(events.status, EVENT_STATUS.CANCELLED as any),
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
        .select(this.buildEventSelectQuery())
        .from(events)
        .leftJoin(users, eq(events.organizerId, users.id))
        .where(
          and(
            eq(events.category, category),
            gte(events.startDate, new Date()),
            eq(events.isPublic, true),
            // ✅ CORREÇÃO: Usar type assertion para o enum
            ne(events.status, EVENT_STATUS.CANCELLED as any)
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
            // ✅ CORREÇÃO: Usar type assertion para o enum
            eq(events.status, EVENT_STATUS.ACTIVE as any),
            gte(events.startDate, new Date()),
            // ✅ CORREÇÃO: Usar coalesce para lidar com valores null
            sql`coalesce(${events.ticketsSold}, 0) < coalesce(${events.maxTickets}, 0)`
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
      // ✅ CORREÇÃO: Usar type assertion para o enum
      return this.updateEvent(eventId, { status: EVENT_STATUS.ACTIVE as any });
    } catch (error) {
      console.error('Error publishing event:', error);
      throw error;
    }
  }

  async cancelEvent(eventId: string, reason: string): Promise<Event> {
    try {
      // ✅ CORREÇÃO: Usar type assertion para o enum
      return this.updateEvent(eventId, { status: EVENT_STATUS.CANCELLED as any });
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

      // ✅ CORREÇÃO: Checar se baseCondition existe antes de usar
      const upcomingEventsWhere = baseCondition 
        ? and(baseCondition, gte(events.startDate, new Date()), ne(events.status, EVENT_STATUS.CANCELLED as any))
        : and(gte(events.startDate, new Date()), ne(events.status, EVENT_STATUS.CANCELLED as any));

      const [upcomingEventsResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(events)
        .where(upcomingEventsWhere);

      // ✅ CORREÇÃO: Checar se baseCondition existe antes de usar
      const completedEventsWhere = baseCondition 
        ? and(baseCondition, lte(events.endDate, new Date()), ne(events.status, EVENT_STATUS.CANCELLED as any))
        : and(lte(events.endDate, new Date()), ne(events.status, EVENT_STATUS.CANCELLED as any));

      const [completedEventsResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(events)
        .where(completedEventsWhere);

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

  async getEventsByFilter(filters: EventFilters): Promise<Event[]> {
    try {
      let conditions = [];

      if (filters.status) {
        // ✅ CORREÇÃO: Usar type assertion para o enum
        conditions.push(eq(events.status, filters.status as any));
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
        .select(this.buildEventSelectQuery())
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
      // ✅ CORREÇÃO: Converter string para number no retorno
      lat: dbEvent.lat ? parseFloat(dbEvent.lat) : undefined,
      lng: dbEvent.lng ? parseFloat(dbEvent.lng) : undefined,
      // ✅ CORREÇÃO: Converter string para number no retorno
      ticketPrice: parseFloat(dbEvent.ticketPrice || '0'),
      maxAttendees: dbEvent.maxAttendees,
      maxTickets: dbEvent.maxTickets,
      currentAttendees: dbEvent.currentAttendees || 0,
      ticketsSold: dbEvent.ticketsSold ?? 0, // ✅ CORREÇÃO: Usar ?? em vez de ||
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
      email: dbUser.email ?? null, // ✅ CORREÇÃO: Usar ?? em vez de ||
      firstName: dbUser.firstName ?? null, // ✅ CORREÇÃO: Usar ?? em vez de ||
      lastName: dbUser.lastName ?? null, // ✅ CORREÇÃO: Usar ?? em vez de ||
      fullName: dbUser.fullName ?? null, // ✅ CORREÇÃO: Usar ?? em vez de ||
      phone: dbUser.phone ?? null, // ✅ CORREÇÃO: Usar ?? em vez de ||
      userType: dbUser.userType ?? 'client', // ✅ CORREÇÃO: Usar ?? em vez de ||
      roles: dbUser.roles ?? [], // ✅ CORREÇÃO: Usar ?? em vez de ||
      canOfferServices: dbUser.canOfferServices ?? false, // ✅ CORREÇÃO: Usar ?? em vez de ||
      profileImageUrl: dbUser.profileImageUrl ?? null, // ✅ CORREÇÃO: Usar ?? em vez de ||
      avatar: dbUser.avatar ?? null, // ✅ CORREÇÃO: Usar ?? em vez de ||
      rating: parseFloat(dbUser.rating ?? '0'), // ✅ CORREÇÃO: Usar ?? em vez de ||
      totalReviews: dbUser.totalReviews ?? 0, // ✅ CORREÇÃO: Usar ?? em vez de ||
      isVerified: dbUser.isVerified ?? false, // ✅ CORREÇÃO: Usar ?? em vez de ||
      verificationStatus: dbUser.verificationStatus ?? 'pending', // ✅ CORREÇÃO: Usar ?? em vez de ||
      verificationDate: dbUser.verificationDate ?? null, // ✅ CORREÇÃO: Usar ?? em vez de ||
      verificationNotes: dbUser.verificationNotes ?? null, // ✅ CORREÇÃO: Usar ?? em vez de ||
      identityDocumentUrl: dbUser.identityDocumentUrl ?? null, // ✅ CORREÇÃO: Usar ?? em vez de ||
      identityDocumentType: dbUser.identityDocumentType ?? null, // ✅ CORREÇÃO: Usar ?? em vez de ||
      profilePhotoUrl: dbUser.profilePhotoUrl ?? null, // ✅ CORREÇÃO: Usar ?? em vez de ||
      documentNumber: dbUser.documentNumber ?? null, // ✅ CORREÇÃO: Usar ?? em vez de ||
      dateOfBirth: dbUser.dateOfBirth ?? null, // ✅ CORREÇÃO: Usar ?? em vez de ||
      registrationCompleted: dbUser.registrationCompleted ?? false, // ✅ CORREÇÃO: Usar ?? em vez de ||
      verificationBadge: dbUser.verificationBadge ?? null, // ✅ CORREÇÃO: Usar ?? em vez de ||
      badgeEarnedDate: dbUser.badgeEarnedDate ?? null, // ✅ CORREÇÃO: Usar ?? em vez de ||
      createdAt: dbUser.createdAt,
      updatedAt: dbUser.updatedAt ?? null // ✅ CORREÇÃO: Usar ?? em vez de ||
    };
  }
}

export const eventStorage = new DatabaseEventStorage();