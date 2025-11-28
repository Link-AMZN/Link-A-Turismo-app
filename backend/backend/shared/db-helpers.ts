// shared/db-helpers.ts - VERSÃO CORRIGIDA
import { db } from '../db';
import { vehicles } from '../shared/database-schema';
import { sql, eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export const vehicleQueries = {
  // ✅ Buscar veículo por ID e driver
  getVehicleByIdAndDriver: async (vehicleId: string, driverId: string) => {
    const result = await db
      .select()
      .from(vehicles)
      .where(
        and(
          eq(vehicles.id, vehicleId),
          eq(vehicles.driver_id, driverId),
          eq(vehicles.is_active, true)
        )
      )
      .limit(1);
    
    return result[0] || null;
  },

  // ✅ Verificar se matrícula existe
  checkPlateNumberExists: async (plateNumber: string) => {
    const result = await db
      .select({ id: vehicles.id })
      .from(vehicles)
      .where(eq(vehicles.plate_number, plateNumber))
      .limit(1);
    
    return result[0] || null;
  },

  // ✅ Listar veículos do motorista
  getDriverVehicles: async (driverId: string) => {
    return await db
      .select()
      .from(vehicles)
      .where(
        and(
          eq(vehicles.driver_id, driverId),
          eq(vehicles.is_active, true)
        )
      )
      .orderBy(vehicles.created_at);
  },

  // ✅ CORREÇÃO: Criar veículo com ID gerado
  createVehicle: async (vehicleData: {
    driver_id: string;
    plate_number: string;
    plate_number_raw: string;
    make: string;
    model: string;
    color: string;
    year?: number;
    vehicle_type: string;
    max_passengers: number;
    features?: string[];
    photo_url?: string;
  }) => {
    const vehicleWithId = {
      id: uuidv4(), // ✅ GERAR ID ÚNICO
      ...vehicleData,
      created_at: new Date(), // ✅ ADICIONAR TIMESTAMPS
      updated_at: new Date(),
    };

    const result = await db
      .insert(vehicles)
      .values(vehicleWithId)
      .returning();
    
    return result[0];
  },

  // ✅ ADICIONADO: Atualizar veículo
  updateVehicle: async (vehicleId: string, updateData: Partial<{
    plate_number: string;
    plate_number_raw: string;
    make: string;
    model: string;
    color: string;
    year: number;
    vehicle_type: string;
    max_passengers: number;
    features: string[];
    photo_url: string;
    is_active: boolean;
  }>) => {
    const result = await db
      .update(vehicles)
      .set({
        ...updateData,
        updated_at: new Date()
      })
      .where(eq(vehicles.id, vehicleId))
      .returning();
    
    return result[0] || null;
  },

  // ✅ ADICIONADO: Desativar veículo (soft delete)
  deactivateVehicle: async (vehicleId: string, driverId: string) => {
    const result = await db
      .update(vehicles)
      .set({
        is_active: false,
        updated_at: new Date()
      })
      .where(
        and(
          eq(vehicles.id, vehicleId),
          eq(vehicles.driver_id, driverId)
        )
      )
      .returning();
    
    return result[0] || null;
  },

  // ✅ ADICIONADO: Buscar veículo por ID apenas
  getVehicleById: async (vehicleId: string) => {
    const result = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.id, vehicleId))
      .limit(1);
    
    return result[0] || null;
  }
};