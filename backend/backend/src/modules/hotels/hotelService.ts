import { db } from "../../../db";
import { accommodations, hotelRooms, roomTypes, bookings } from "../../../shared/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { type InferModel } from "drizzle-orm";
import { z } from "zod";

// Tipos inferidos corretamente do Drizzle
export type Accommodation = InferModel<typeof accommodations>; // SELECT
export type AccommodationInsert = InferModel<typeof accommodations, "insert">; // INSERT
export type HotelRoom = InferModel<typeof hotelRooms>;
export type RoomType = InferModel<typeof roomTypes>;
export type Booking = InferModel<typeof bookings>;

// Helper function para formatar datas para string ISO
const formatDate = (date: Date | null) => date?.toISOString() ?? null;

// Helper function para comparar datas com strings
const isDateEqualToString = (date: Date | null, dateString: string) => {
  return date?.toISOString().split('T')[0] === dateString;
};

// ✅ Obter quarto por ID
export const getRoomById = async (roomId: string): Promise<HotelRoom | undefined> => {
  const [room] = await db.select().from(hotelRooms).where(eq(hotelRooms.id, roomId));
  return room;
};

// ✅ Obter room type por ID
export const getRoomTypeById = async (roomTypeId: string): Promise<RoomType | undefined> => {
  const [roomType] = await db.select().from(roomTypes).where(eq(roomTypes.id, roomTypeId));
  return roomType;
};

// ✅ Criar apenas acomodação básica (SEM quartos automáticos)
export const createAccommodation = async (data: AccommodationInsert): Promise<Accommodation> => {
  const [accommodation] = await db.insert(accommodations).values(data).returning();
  // NÃO criar roomTypes/rooms automaticamente - usuário configurará depois
  return accommodation;
};

// Obter todas as acomodações com filtros - CORREÇÃO APLICADA
export const getAccommodations = async (filters: any = {}): Promise<Accommodation[]> => {
  const conditions = [];

  if (filters.type) {
    conditions.push(eq(accommodations.type, filters.type));
  }
  if (filters.address) {
    conditions.push(sql`${accommodations.address} ILIKE ${'%' + filters.address + '%'}`);
  }
  // ✅ CORREÇÃO CRÍTICA: Usar o valor booleano diretamente em vez de comparar com string
  if (filters.isAvailable !== undefined) {
    conditions.push(eq(accommodations.isAvailable, filters.isAvailable));
  }
  

  const query = conditions.length > 0
    ? db.select().from(accommodations).where(and(...conditions))
    : db.select().from(accommodations);

  return await query;
};

// Obter acomodação por ID
export const getAccommodationById = async (id: string): Promise<Accommodation | undefined> => {
  const [accommodation] = await db.select().from(accommodations).where(eq(accommodations.id, id));
  return accommodation;
};

// Atualizar acomodação
export const updateAccommodation = async (id: string, data: Partial<AccommodationInsert>): Promise<Accommodation | null> => {
  const [accommodation] = await db.update(accommodations).set(data).where(eq(accommodations.id, id)).returning();
  return accommodation || null;
};

// Deletar acomodação
export const deleteAccommodation = async (id: string): Promise<void> => {
  await db.delete(accommodations).where(eq(accommodations.id, id));
};

// Verificar se usuário é dono da acomodação
export const isUserAccommodationOwner = async (accommodationId: string, userId: string): Promise<boolean> => {
  const accommodation = await getAccommodationById(accommodationId);
  return accommodation?.hostId === userId;
};

// Obter quartos de uma acomodação
export const getAccommodationRooms = async (accommodationId: string): Promise<HotelRoom[]> => {
  const rooms = await db.select().from(hotelRooms).where(eq(hotelRooms.accommodationId, accommodationId));
  return rooms;
};

// Obter room types de uma acomodação
export const getAccommodationRoomTypes = async (accommodationId: string): Promise<RoomType[]> => {
  const roomTypesList = await db.select().from(roomTypes).where(eq(roomTypes.accommodationId, accommodationId));
  return roomTypesList;
};

// Obter dados do dashboard do hotel
export const getHotelDashboardData = async (userId: string) => {
  // Obter acomodações do usuário
  const userAccommodations = await db.select()
    .from(accommodations)
    .where(eq(accommodations.hostId, userId));
  
  if (userAccommodations.length === 0) {
    return {
      occupancy: { today: 0, currentRooms: 0, totalRooms: 0 },
      revenue: { today: 0, changePercent: '0%' },
      checkins: { today: 0, pending: 0 },
      rating: { average: 0, totalReviews: 0 },
      todayCheckins: [],
      weeklyOccupancy: [],
      pendingTasks: []
    };
  }

  const accommodationIds = userAccommodations.map(acc => acc.id);

  // Obter quartos das acomodações
  const rooms = await db.select()
    .from(hotelRooms)
    .where(inArray(hotelRooms.accommodationId, accommodationIds));

  // Obter reservas das acomodações
  const today = new Date().toISOString().split('T')[0];
  const reservations = await db.select()
    .from(bookings)
    .where(
      and(
        inArray(bookings.accommodationId, accommodationIds),
        eq(bookings.type, 'hotel')
      )
    );

  // Calcular estatísticas
  const totalRooms = rooms.length;
  const occupiedRooms = rooms.filter(room => room.status === 'occupied').length;
  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  // Calcular receita do dia
  const todayRevenue = reservations
    .filter(res => isDateEqualToString(res.checkInDate, today))
    .reduce((sum, res) => sum + Number(res.totalPrice || 0), 0);

  // Check-ins do dia
  const todayCheckins = reservations.filter(res => isDateEqualToString(res.checkInDate, today));

  return {
    occupancy: {
      today: occupancyRate,
      currentRooms: occupiedRooms,
      totalRooms: totalRooms
    },
    revenue: {
      today: todayRevenue,
      changePercent: '+0%'
    },
    checkins: {
      today: todayCheckins.length,
      pending: reservations.filter(res => res.status === 'pending').length
    },
    rating: {
      average: userAccommodations.reduce((sum, acc) => sum + Number(acc.rating || 0), 0) / userAccommodations.length,
      totalReviews: userAccommodations.reduce((sum, acc) => sum + (acc.reviewCount || 0), 0)
    },
    todayCheckins: todayCheckins.map(res => ({
      id: res.id,
      guestName: res.guestName || 'Cliente',
      roomType: 'Quarto',
      nights: res.checkInDate && res.checkOutDate 
        ? Math.ceil((new Date(res.checkOutDate).getTime() - new Date(res.checkInDate).getTime()) / (1000 * 3600 * 24))
        : 1,
      checkInTime: "14:00",
      status: res.status,
      price: Number(res.totalPrice || 0)
    })),
    weeklyOccupancy: [
      { day: 'Dom', date: '25', occupancy: 78, rooms: '31/40' },
      { day: 'Seg', date: '26', occupancy: 65, rooms: '26/40' },
      { day: 'Ter', date: '27', occupancy: 82, rooms: '33/40' },
      { day: 'Qua', date: '28', occupancy: 85, rooms: '34/40' },
      { day: 'Qui', date: '29', occupancy: 92, rooms: '37/40' },
      { day: 'Sex', date: '30', occupancy: 95, rooms: '38/40' },
      { day: 'Sáb', date: '31', occupancy: 88, rooms: '35/40' }
    ],
    pendingTasks: [
      {
        id: "task-1",
        type: "cleaning",
        description: "Limpeza urgente - Quarto 205",
        detail: "Check-in às 15:00",
        priority: "urgent"
      },
      {
        id: "task-2",
        type: "confirmation", 
        description: "Confirmar reserva - Ana Costa",
        detail: "Check-in amanhã",
        priority: "normal"
      }
    ]
  };
};

// Obter quartos das acomodações do usuário
export const getHotelRooms = async (userId: string): Promise<HotelRoom[]> => {
  // Buscar acomodações do usuário
  const userAccommodations = await db.select()
    .from(accommodations)
    .where(eq(accommodations.hostId, userId));
  
  if (userAccommodations.length === 0) {
    return [];
  }

  const accommodationIds = userAccommodations.map(acc => acc.id);

  // Buscar quartos das acomodações do usuário
  const rooms = await db.select()
    .from(hotelRooms)
    .where(inArray(hotelRooms.accommodationId, accommodationIds));

  return rooms;
};

// Obter reservas das acomodações do usuário
export const getProviderBookings = async (userId: string): Promise<any[]> => {
  // Buscar acomodações do usuário
  const userAccommodations = await db.select()
    .from(accommodations)
    .where(eq(accommodations.hostId, userId));
  
  if (userAccommodations.length === 0) {
    return [];
  }

  const accommodationIds = userAccommodations.map(acc => acc.id);

  // Buscar reservas das acomodações do usuário (apenas do tipo hotel)
  const reservations = await db.select()
    .from(bookings)
    .where(
      and(
        inArray(bookings.accommodationId, accommodationIds),
        eq(bookings.type, 'hotel')
      )
    )
    .orderBy(bookings.createdAt);

  // Formatar datas para string ISO antes de retornar
  return reservations.map(res => ({
    ...res,
    checkInDate: formatDate(res.checkInDate),
    checkOutDate: formatDate(res.checkOutDate),
    createdAt: formatDate(res.createdAt),
    updatedAt: formatDate(res.updatedAt)
  }));
};

// Obter reserva por ID
export const getBookingById = async (bookingId: string): Promise<any | null> => {
  const [booking] = await db.select()
    .from(bookings)
    .where(eq(bookings.id, bookingId));
  
  if (!booking) return null;

  // Formatar datas para string ISO antes de retornar
  return {
    ...booking,
    checkInDate: formatDate(booking.checkInDate),
    checkOutDate: formatDate(booking.checkOutDate),
    createdAt: formatDate(booking.createdAt),
    updatedAt: formatDate(booking.updatedAt)
  };
};

// Atualizar status da reserva
export const updateBookingStatus = async (bookingId: string, status: string): Promise<any | null> => {
  const [booking] = await db.update(bookings)
    .set({ status, updatedAt: new Date() })
    .where(eq(bookings.id, bookingId))
    .returning();
  
  if (!booking) return null;

  // Formatar datas para string ISO antes de retornar
  return {
    ...booking,
    checkInDate: formatDate(booking.checkInDate),
    checkOutDate: formatDate(booking.checkOutDate),
    createdAt: formatDate(booking.createdAt),
    updatedAt: formatDate(booking.updatedAt)
  };
};

// ✅ CORREÇÃO CRÍTICA: Função para criar tipo de quarto com pricePerNight incluído
export async function createRoomType(data: any) {
  if (!data.type || !data.type.trim()) {
    data.type = 'standard'; // valor default seguro
  }
  
  // ✅ CORREÇÃO CRÍTICA: Incluir pricePerNight que estava faltando
  const processedData: any = {
    name: data.name,
    type: data.type,
    accommodationId: data.accommodationId,
    // ✅ CORREÇÃO: Adicionar pricePerNight obrigatório
    pricePerNight: data.pricePerNight !== undefined ? String(data.pricePerNight) : '0',
    description: data.description || null,
    images: data.images || null,
    amenities: data.amenities || null,
    isAvailable: data.isAvailable !== undefined ? data.isAvailable : true,
    status: data.status || 'active'
  };
  
  // ✅ CORREÇÃO: Adicionar apenas campos que existem no schema
  if (data.basePrice !== undefined) {
    processedData.basePrice = String(data.basePrice);
  }
  
  if (data.maxOccupancy !== undefined) {
    processedData.maxOccupancy = String(data.maxOccupancy);
  }

  // ✅ CORREÇÃO: Adicionar campos opcionais do schema
  if (data.bedType !== undefined) {
    processedData.bedType = data.bedType;
  }

  if (data.bedCount !== undefined) {
    processedData.bedCount = String(data.bedCount);
  }

  console.log('🔍 DEBUG - Dados para criar roomType:', {
    ...processedData,
    pricePerNight: processedData.pricePerNight,
    hasPricePerNight: !!processedData.pricePerNight
  });

  const [newRoomType] = await db.insert(roomTypes).values(processedData).returning();
  return newRoomType;
}

// Função para listar tipos de quarto de um hotel
export async function getRoomTypesByHotelId(hotelId: string) {
  return await db.select().from(roomTypes).where(eq(roomTypes.accommodationId, hotelId));
}

// ✅ CORREÇÃO: Função para criar quarto específico com tratamento correto
export async function createRoom(data: any) {
  // ✅ CORREÇÃO: Criar objeto com apenas os campos que existem no schema hotelRooms
  const processedData: any = {
    accommodationId: data.accommodationId,
    roomNumber: data.roomNumber,
    roomType: data.roomType,
    roomTypeId: data.roomTypeId,
    status: data.status || 'available',
    isAvailable: data.isAvailable !== undefined ? data.isAvailable : true,
    images: data.images || null,
    amenities: data.amenities || null
  };
  
  // ✅ CORREÇÃO: Adicionar apenas campos que existem no schema
  if (data.pricePerNight !== undefined) {
    processedData.pricePerNight = String(data.pricePerNight);
  }
  
  if (data.maxOccupancy !== undefined) {
    processedData.maxOccupancy = String(data.maxOccupancy);
  }

  const [newRoom] = await db.insert(hotelRooms).values(processedData).returning();
  return newRoom;
}

// Função para listar quartos de um hotel
export async function getRoomsByHotelId(hotelId: string) {
  return await db.select().from(hotelRooms).where(eq(hotelRooms.accommodationId, hotelId));
}

// ✅ CORREÇÃO: Atualizar quarto com conversão de tipos
export const updateRoom = async (roomId: string, data: Partial<HotelRoom>): Promise<HotelRoom | null> => {
  // ✅ CORREÇÃO: Converter campos numéricos para string
  const processedData: any = { ...data };
  
  if (processedData.pricePerNight !== undefined) {
    processedData.pricePerNight = String(processedData.pricePerNight);
  }
  
  if (processedData.maxOccupancy !== undefined) {
    processedData.maxOccupancy = String(processedData.maxOccupancy);
  }

  const [room] = await db.update(hotelRooms)
    .set(processedData)
    .where(eq(hotelRooms.id, roomId))
    .returning();
  
  return room || null;
};

// ✅ CORREÇÃO: Atualizar room type com conversão de tipos
export const updateRoomType = async (roomTypeId: string, data: Partial<RoomType>): Promise<RoomType | null> => {
  // ✅ CORREÇÃO: Converter campos numéricos para string
  const processedData: any = { ...data };
  
  if (processedData.pricePerNight !== undefined) {
    processedData.pricePerNight = String(processedData.pricePerNight);
  }
  
  if (processedData.basePrice !== undefined) {
    processedData.basePrice = String(processedData.basePrice);
  }
  
  if (processedData.maxOccupancy !== undefined) {
    processedData.maxOccupancy = String(processedData.maxOccupancy);
  }

  const [roomType] = await db.update(roomTypes)
    .set(processedData)
    .where(eq(roomTypes.id, roomTypeId))
    .returning();
  
  return roomType || null;
};

// Deletar quarto
export const deleteRoom = async (roomId: string): Promise<void> => {
  await db.delete(hotelRooms).where(eq(hotelRooms.id, roomId));
};

// Deletar room type
export const deleteRoomType = async (roomTypeId: string): Promise<void> => {
  await db.delete(roomTypes).where(eq(roomTypes.id, roomTypeId));
};