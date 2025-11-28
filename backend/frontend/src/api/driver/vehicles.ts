// src/api/vehicles.ts - COM CORREÇÃO PARA O PROBLEMA DO RESPONSE
import { apiRequest } from '@/shared/lib/queryClient';

export interface Vehicle {
  id: string;
  plateNumber: string;
  plateNumberRaw: string;
  make: string;
  model: string;
  color: string;
  year?: number;
  vehicleType: string;
  maxPassengers: number;
  features: string[];
  photoUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleFormData {
  plateNumber: string;
  make: string;
  model: string;
  color: string;
  year?: number;
  vehicleType: string;
  maxPassengers: number;
  features?: string[];
  photoUrl?: string;
}

export interface VehicleTypeOption {
  value: string;
  label: string;
  description: string;
}

// ✅ SERVIÇO COMPATÍVEL COM O BACKEND - COM TIPAGEM EXPLÍCITA
export const vehiclesApi = {
  // ✅ Listar tipos de veículos disponíveis
  getVehicleTypes: async (): Promise<{ success: boolean; types: VehicleTypeOption[] }> => {
    console.log('🚗 [VEHICLES API] Buscando tipos de veículos');
    
    try {
      // ✅ CORREÇÃO: Type assertion explícito
      const data = await apiRequest<{ success: boolean; types: VehicleTypeOption[] }>('GET', '/api/vehicles/types');
      return data;
    } catch (error) {
      console.error('❌ Erro ao buscar tipos de veículos:', error);
      throw error;
    }
  },

  // ✅ Listar veículos do motorista
  getMyVehicles: async (): Promise<{ success: boolean; vehicles: Vehicle[] }> => {
    console.log('🚗 [VEHICLES API] Buscando meus veículos');
    
    try {
      // ✅ CORREÇÃO: Type assertion explícito
      const data = await apiRequest<{ success: boolean; vehicles: Vehicle[] }>('GET', '/api/vehicles');
      return data;
    } catch (error) {
      console.error('❌ Erro ao buscar meus veículos:', error);
      throw error;
    }
  },

  // ✅ Criar veículo
  createVehicle: async (vehicleData: VehicleFormData): Promise<{ success: boolean; vehicle: Vehicle; message: string }> => {
    console.log('🚗 [VEHICLES API] Criando veículo:', vehicleData);
    
    try {
      // ✅ CORREÇÃO: Type assertion explícito
      const data = await apiRequest<{ success: boolean; vehicle: Vehicle; message: string }>('POST', '/api/vehicles', vehicleData);
      return data;
    } catch (error) {
      console.error('❌ Erro ao criar veículo:', error);
      throw error;
    }
  },

  // ✅ Atualizar veículo
  updateVehicle: async (vehicleId: string, vehicleData: Partial<VehicleFormData>): Promise<{ success: boolean; vehicle: Vehicle; message: string }> => {
    console.log('🚗 [VEHICLES API] Atualizando veículo:', vehicleId, vehicleData);
    
    try {
      // ✅ CORREÇÃO: Type assertion explícito
      const data = await apiRequest<{ success: boolean; vehicle: Vehicle; message: string }>('PUT', `/api/vehicles/${vehicleId}`, vehicleData);
      return data;
    } catch (error) {
      console.error('❌ Erro ao atualizar veículo:', error);
      throw error;
    }
  },

  // ✅ Desativar veículo
  deleteVehicle: async (vehicleId: string): Promise<{ success: boolean; message: string }> => {
    console.log('🚗 [VEHICLES API] Desativando veículo:', vehicleId);
    
    try {
      // ✅ CORREÇÃO: Type assertion explícito
      const data = await apiRequest<{ success: boolean; message: string }>('DELETE', `/api/vehicles/${vehicleId}`);
      return data;
    } catch (error) {
      console.error('❌ Erro ao desativar veículo:', error);
      throw error;
    }
  }
};

// ✅ FUNÇÃO AUXILIAR PARA BUSCAR VEÍCULOS (usada no RideCreateModal)
export const getMyVehicles = async (): Promise<Vehicle[]> => {
  try {
    const response = await vehiclesApi.getMyVehicles();
    if (response.success) {
      return response.vehicles;
    }
    throw new Error('Falha ao carregar veículos');
  } catch (error) {
    console.error('❌ Erro em getMyVehicles:', error);
    throw error;
  }
};

export default vehiclesApi;