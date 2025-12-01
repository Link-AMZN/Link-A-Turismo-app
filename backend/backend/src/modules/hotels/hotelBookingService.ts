// src/modules/hotels/hotelBookingService.ts - VERSÃO CORRIGIDA
import { db } from '../../../db';
import { sql } from 'drizzle-orm';

interface CreateHotelBookingParams {
  hotelId: string;
  roomTypeId: string;
  checkIn: Date;
  checkOut: Date;
  units?: number;
  adults?: number;
  children?: number;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  specialRequests?: string;
}

export class HotelBookingService {
  
  // 🔒 CRIAR RESERVA COM TRANSACTION LOCK (PROFISSIONAL)
  async createBooking(params: CreateHotelBookingParams) {
    try {
      console.log('📝 Criando reserva profissional:', {
        hotelId: params.hotelId,
        roomTypeId: params.roomTypeId,
        checkIn: params.checkIn.toISOString().split('T')[0],
        checkOut: params.checkOut.toISOString().split('T')[0],
        units: params.units,
        adults: params.adults,
        children: params.children
      });

      // ✅ CORREÇÃO: Usar a sintaxe correta do Drizzle
      const result = await db.execute(sql`
        SELECT create_hotel_booking(
          ${params.hotelId}::uuid,
          ${params.roomTypeId}::uuid,
          ${params.checkIn.toISOString().split('T')[0]}::date,
          ${params.checkOut.toISOString().split('T')[0]}::date,
          ${params.units || 1},
          ${params.adults || 2},
          ${params.children || 0},
          ${params.guestName},
          ${params.guestEmail},
          ${params.guestPhone || null},
          ${params.specialRequests || null}
        ) as booking_result
      `);

      // ✅ CORREÇÃO: Acessar o resultado corretamente
      const bookingResult = (result as any)[0]?.booking_result;
      
      if (!bookingResult) {
        throw new Error('Nenhum resultado retornado da função de reserva');
      }
      
      console.log('📋 Resultado da reserva profissional:', bookingResult);
      
      if (bookingResult.success) {
        return {
          success: true,
          bookingId: bookingResult.booking_id,
          basePrice: parseFloat(bookingResult.base_price),
          extraCharges: parseFloat(bookingResult.extra_charges),
          totalPrice: parseFloat(bookingResult.total_price),
          nights: bookingResult.nights,
          message: bookingResult.message
        };
      } else {
        throw new Error(bookingResult.error);
      }
    } catch (error) {
      console.error('❌ Erro ao criar reserva profissional:', error);
      throw error;
    }
  }

  // 🔄 CANCELAR RESERVA COM RESTAURAÇÃO DE DISPONIBILIDADE
  async cancelBooking(bookingId: string, reason?: string) {
    try {
      const result = await db.execute(sql`
        SELECT cancel_hotel_booking(${bookingId}::uuid, ${reason || null}) as cancel_result
      `);

      // ✅ CORREÇÃO: Acessar o resultado corretamente
      const cancelResult = (result as any)[0]?.cancel_result;
      
      if (!cancelResult) {
        throw new Error('Nenhum resultado retornado da função de cancelamento');
      }
      
      if (cancelResult.success) {
        return { success: true, message: cancelResult.message };
      } else {
        throw new Error(cancelResult.error);
      }
    } catch (error) {
      console.error('Erro ao cancelar reserva:', error);
      throw error;
    }
  }

  // 📊 CHECK-IN
  async checkIn(bookingId: string) {
    try {
      const result = await db.execute(sql`
        SELECT check_in_hotel_booking(${bookingId}::uuid) as checkin_result
      `);

      // ✅ CORREÇÃO: Acessar o resultado corretamente
      const checkinResult = (result as any)[0]?.checkin_result;
      
      if (!checkinResult) {
        throw new Error('Nenhum resultado retornado da função de check-in');
      }
      
      if (checkinResult.success) {
        return { success: true, message: checkinResult.message };
      } else {
        throw new Error(checkinResult.error);
      }
    } catch (error) {
      console.error('Erro no check-in:', error);
      throw error;
    }
  }

  // 📊 CHECK-OUT
  async checkOut(bookingId: string) {
    try {
      const result = await db.execute(sql`
        SELECT check_out_hotel_booking(${bookingId}::uuid) as checkout_result
      `);

      // ✅ CORREÇÃO: Acessar o resultado corretamente
      const checkoutResult = (result as any)[0]?.checkout_result;
      
      if (!checkoutResult) {
        throw new Error('Nenhum resultado retornado da função de check-out');
      }
      
      if (checkoutResult.success) {
        return { success: true, message: checkoutResult.message };
      } else {
        throw new Error(checkoutResult.error);
      }
    } catch (error) {
      console.error('Erro no check-out:', error);
      throw error;
    }
  }

  // 📈 DASHBOARD STATS ESPECÍFICO PARA BOOKINGS
  async getDashboardStats(hotelId: string) {
    try {
      const result = await db.execute(sql`
        SELECT get_hotel_dashboard_stats(${hotelId}::uuid) as stats_result
      `);

      // ✅ CORREÇÃO: Acessar o resultado corretamente
      return (result as any)[0]?.stats_result;
    } catch (error) {
      console.error('Erro ao buscar stats do dashboard:', error);
      throw error;
    }
  }

  // 🔍 BUSCAR RESERVAS POR EMAIL
  async getBookingsByEmail(guestEmail: string) {
    try {
      const result = await db.execute(sql`
        SELECT get_hotel_bookings_by_email(${guestEmail}) as bookings_result
      `);

      // ✅ CORREÇÃO: Acessar o resultado corretamente
      return (result as any)[0]?.bookings_result;
    } catch (error) {
      console.error('Erro ao buscar reservas por email:', error);
      throw error;
    }
  }

  // 📋 BUSCAR RESERVAS DO HOTEL (PARA ADMINISTRAÇÃO)
  async getHotelBookings(hotelId: string, filters?: {
    status?: string;
    fromDate?: Date;
    toDate?: Date;
    limit?: number;
  }) {
    try {
      let query = sql`
        SELECT 
          hb.*,
          h.name as hotel_name,
          rt.name as room_type_name
        FROM hotel_bookings hb
        JOIN hotels h ON hb.hotel_id = h.id
        JOIN room_types rt ON hb.room_type_id = rt.id
        WHERE hb.hotel_id = ${hotelId}
      `;

      if (filters?.status) {
        query = sql`${query} AND hb.status = ${filters.status}`;
      }

      if (filters?.fromDate) {
        query = sql`${query} AND hb.check_in >= ${filters.fromDate.toISOString().split('T')[0]}::date`;
      }

      if (filters?.toDate) {
        query = sql`${query} AND hb.check_out <= ${filters.toDate.toISOString().split('T')[0]}::date`;
      }

      query = sql`${query} ORDER BY hb.created_at DESC`;

      if (filters?.limit) {
        query = sql`${query} LIMIT ${filters.limit}`;
      }

      const result = await db.execute(query);
      
      // ✅ CORREÇÃO: Retornar o array completo
      return result as any[];
    } catch (error) {
      console.error('Erro ao buscar reservas do hotel:', error);
      throw error;
    }
  }

  // 🔍 BUSCAR DETALHES DE UMA RESERVA
  async getBookingDetails(bookingId: string) {
    try {
      const result = await db.execute(sql`
        SELECT 
          hb.*,
          h.name as hotel_name,
          h.address as hotel_address,
          h.contact_phone as hotel_phone,
          rt.name as room_type_name,
          rt.max_occupancy,
          rt.amenities as room_amenities
        FROM hotel_bookings hb
        JOIN hotels h ON hb.hotel_id = h.id
        JOIN room_types rt ON hb.room_type_id = rt.id
        WHERE hb.id = ${bookingId}::uuid
      `);

      // ✅ CORREÇÃO: Acessar o primeiro resultado corretamente
      return (result as any)[0] || null;
    } catch (error) {
      console.error('Erro ao buscar detalhes da reserva:', error);
      throw error;
    }
  }

  // 📊 VERIFICAR DISPONIBILIDADE EM TEMPO REAL
  async checkAvailability(params: {
    roomTypeId: string;
    checkIn: Date;
    checkOut: Date;
    units?: number;
  }) {
    try {
      const result = await db.execute(sql`
        SELECT check_real_time_availability(
          ${params.roomTypeId}::uuid,
          ${params.checkIn.toISOString().split('T')[0]}::date,
          ${params.checkOut.toISOString().split('T')[0]}::date,
          ${params.units || 1}
        ) as availability_result
      `);

      // ✅ CORREÇÃO: Acessar o resultado corretamente
      return (result as any)[0]?.availability_result;
    } catch (error) {
      console.error('Erro ao verificar disponibilidade:', error);
      return { available: false, error: 'Erro ao verificar disponibilidade' };
    }
  }
}

export const hotelBookingService = new HotelBookingService();