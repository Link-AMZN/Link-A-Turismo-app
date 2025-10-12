import { auth } from '@/shared/lib/firebaseConfig';
import { Booking, RideBookingRequest, HotelBookingRequest } from '@/shared/types/booking';

/**
 * Interfaces para tipagem
 */
interface Hotel {
  id: string;
  userId: string;
  name: string;
  description: string;
  address: string;
  contactEmail: string;
  contactPhone: string;
  amenities: string[];
  images: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface RoomType {
  id: string;
  hotelId: string;
  name: string;
  type: string;
  description?: string;
  pricePerNight: number;
  totalRooms: number;
  availableRooms: number;
  maxGuests: number;
  images?: string[];
  amenities?: string[];
  size?: number;
  bedType?: string;
  hasBalcony: boolean;
  hasSeaView: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface HotelStats {
  totalBookings: number;
  monthlyRevenue: number;
  averageRating: number;
  averageOccupancy: number;
  totalEvents: number;
  upcomingEvents: number;
  activePartnerships: number;
  partnershipEarnings: number;
  totalRoomTypes: number;
  totalRooms: number;
  availableRooms: number;
}

interface HotelEvent {
  id: string;
  title: string;
  description: string;
  eventType: string;
  venue: string;
  startDate: string;
  endDate: string;
  ticketPrice: number;
  maxTickets: number;
  ticketsSold: number;
  status: string;
  organizerId?: string;
}

interface DriverPartnership {
  id: string;
  driver: string;
  route: string;
  commission: number;
  clientsBrought: number;
  totalEarnings: number;
  lastMonth: number;
  rating: number;
  joinedDate: string;
  status: string;
}

interface ChatMessage {
  id: number;
  sender: string;
  message: string;
  time: string;
  isHotel: boolean;
}

/**
 * Serviço central de API para todas as apps
 * Gerencia autenticação Firebase e comunicação com Railway backend
 */
class ApiService {
  private baseURL: string;

  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    console.log('🏗️ API Base URL:', this.baseURL);
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    try {
      const token = await auth.currentUser?.getIdToken() || localStorage.getItem('authToken');
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      } else {
        console.debug('No auth token available');
      }
    } catch (error) {
      console.debug('Error fetching auth token:', error);
    }
    return headers;
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: unknown
  ): Promise<T> {
    const headers = await this.getAuthHeaders();
    const url = `${this.baseURL}${endpoint}`;
    const config: RequestInit = { method, headers, credentials: 'include' };
    if (data && method !== 'GET') config.body = JSON.stringify(data);
    const response = await fetch(url, config);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`${response.status}: ${errorText || 'Request failed'}`);
    }
    return response.json() as Promise<T>;
  }

  // ===== RIDES API =====
  async searchRides(params: { from?: string; to?: string; passengers?: number; date?: string }): Promise<any[]> {
    const searchParams = new URLSearchParams();
    if (params.from) searchParams.append('from', params.from);
    if (params.to) searchParams.append('to', params.to);
    if (params.passengers) searchParams.append('passengers', params.passengers.toString());
    if (params.date) searchParams.append('date', params.date);
    return this.request<any[]>('GET', `/api/rides-simple/search?${searchParams.toString()}`);
  }

  async createRide(rideData: {
    fromLocation: string;
    toLocation: string;
    departureDate: string;
    pricePerSeat: number;
    availableSeats: number;
    vehicleType?: string;
    additionalInfo?: string;
  }): Promise<any> {
    return this.request('POST', '/api/rides-simple/create', rideData);
  }

  // ===== BOOKINGS API =====
  async bookRide(bookingData: RideBookingRequest): Promise<{ success: boolean; booking: Booking }> {
    return this.request('POST', '/api/rides-simple/book', bookingData);
  }

  async bookHotel(bookingData: HotelBookingRequest): Promise<{ success: boolean; booking: Booking }> {
    return this.request('POST', '/api/bookings/create', bookingData);
  }

  async createBooking(
    bookingData: RideBookingRequest | HotelBookingRequest
  ): Promise<{ success: boolean; booking: Booking }> {
    if ('rideId' in bookingData) {
      const user = auth.currentUser;
      if (!user) throw new Error('Usuário não autenticado');

      const payload: RideBookingRequest = {
        rideId: bookingData.rideId!,
        passengerId: user.uid,
        seatsBooked: bookingData.seatsBooked!,
        totalPrice: bookingData.totalPrice,
        guestName: bookingData.guestName,
        guestEmail: bookingData.guestEmail,
        guestPhone: bookingData.guestPhone,
      };

      return this.bookRide(payload);
    } else if ('accommodationId' in bookingData) {
      const user = auth.currentUser;
      if (!user) throw new Error('Usuário não autenticado');

      const payload: HotelBookingRequest = {
        accommodationId: bookingData.accommodationId,
        passengerId: user.uid,
        totalPrice: bookingData.totalPrice,
        guestName: bookingData.guestName,
        guestEmail: bookingData.guestEmail,
        guestPhone: bookingData.guestPhone,
        checkInDate: bookingData.checkInDate!,
        checkOutDate: bookingData.checkOutDate!,
      };

      return this.bookHotel(payload);
    } else {
      throw new Error('Booking must have rideId or accommodationId');
    }
  }

  async getUserBookings(): Promise<Booking[]> {
    return this.request('GET', '/api/bookings/user');
  }

  // ===== USER/AUTH API =====
  async getUserProfile(): Promise<any> {
    return this.request('GET', '/api/auth/profile');
  }

  async updateUserProfile(userData: any): Promise<any> {
    return this.request('PUT', '/api/auth/profile', userData);
  }

  // ===== HOTELS API =====
  async searchAccommodations(params: { location?: string; checkIn?: string; checkOut?: string; guests?: number }): Promise<Hotel[]> {
    const searchParams = new URLSearchParams();
    if (params.location) searchParams.append('address', params.location);
    if (params.checkIn) searchParams.append('checkIn', params.checkIn);
    if (params.checkOut) searchParams.append('checkOut', params.checkOut);
    if (params.guests) searchParams.append('guests', params.guests.toString());
    searchParams.append('isAvailable', 'true');
    return this.request('GET', `/api/hotels?${searchParams.toString()}`);
  }

  async createAccommodation(accommodationData: any): Promise<any> {
    return this.request('POST', '/api/hotels', accommodationData);
  }

  async getUserAccommodations(): Promise<Hotel[]> {
    try {
      return await this.request<Hotel[]>('GET', '/api/hotels/my-hotels');
    } catch (error) {
      console.error('Erro ao buscar acomodações do usuário:', error);
      return [];
    }
  }

  async getHotelById(hotelId: string): Promise<Hotel> {
    return this.request('GET', `/api/hotels/${hotelId}`);
  }

  async updateHotel(hotelId: string, hotelData: Partial<Hotel>): Promise<Hotel> {
    return this.request('PUT', `/api/hotels/${hotelId}`, hotelData);
  }

  async deleteHotel(hotelId: string): Promise<void> {
    return this.request('DELETE', `/api/hotels/${hotelId}`);
  }

  async updateRoom(roomId: string, roomData: Partial<RoomType>): Promise<RoomType> {
    return this.request('PUT', `/api/rooms/${roomId}`, roomData);
  }

  async getHotelStats(hotelId: string): Promise<HotelStats> {
    return this.request('GET', `/api/hotels/${hotelId}/stats`);
  }

  // ===== ROOMS API =====
  async getRoomsByHotelId(hotelId: string): Promise<RoomType[]> {
    return this.request('GET', `/api/hotels/${hotelId}/rooms`);
  }

  async createRoom(roomData: Partial<RoomType>): Promise<RoomType> {
    return this.request('POST', '/api/rooms', roomData);
  }

  async deleteRoom(roomId: string): Promise<void> {
    return this.request('DELETE', `/api/rooms/${roomId}`);
  }

  // ===== PARTNERSHIPS API =====
  async createPartnership(partnershipData: { partnerId: string; type: 'driver-hotel' | 'hotel-driver'; terms: string }): Promise<any> {
    return this.request('POST', '/api/partnerships/create', partnershipData);
  }

  async getPartnershipRequests(): Promise<any[]> {
    return this.request('GET', '/api/partnerships/requests');
  }

  async getDriverPartnerships(hotelId: string): Promise<DriverPartnership[]> {
    return this.request('GET', `/api/partnerships/driver?hotelId=${hotelId}`);
  }

  // ===== EVENTS API =====
  async getEvents(hotelId?: string): Promise<HotelEvent[]> {
    const url = hotelId ? `/api/events?hotelId=${hotelId}` : '/api/events';
    return this.request('GET', url);
  }

  async createEvent(eventData: any): Promise<HotelEvent> {
    return this.request('POST', '/api/events/create', eventData);
  }

  async updateEvent(eventId: string, eventData: Partial<HotelEvent>): Promise<HotelEvent> {
    return this.request('PUT', `/api/events/${eventId}`, eventData);
  }

  // ===== FEATURED OFFERS API =====
  async getFeaturedOffers(): Promise<any[]> {
    return this.request('GET', '/api/offers/featured');
  }

  // ===== CHAT API =====
  async getChatRooms(): Promise<any[]> {
    return this.request('GET', '/api/chat/rooms');
  }

  async getChatMessages(roomId: string): Promise<ChatMessage[]> {
    return this.request('GET', `/api/chat/messages/${roomId}`);
  }

  async sendChatMessage(roomId: string, messageData: { message: string }): Promise<ChatMessage> {
    return this.request('POST', `/api/chat/messages/${roomId}`, messageData);
  }

  // ===== ADMIN API =====
  async getAdminStats(): Promise<any> {
    return this.request('GET', '/api/admin/stats');
  }

  async getAdminRides(): Promise<any[]> {
    return this.request('GET', '/api/admin/rides');
  }

  async getAdminBookings(): Promise<Booking[]> {
    return this.request('GET', '/api/admin/bookings');
  }
}

export const apiService = new ApiService();
export default apiService;