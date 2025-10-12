import { useState, useEffect } from "react";
import { accommodationService } from "src/shared/lib/accommodationService";
import { useAuth } from "./useAuth";

// Interface unificada para Accommodation
export interface Accommodation {
  id: string;
  hostId: string;
  name: string;
  type: string;
  address: string;
  description: string;
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  amenities: string[];
  images: string[];
  isAvailable: boolean;
  rating?: number;
  reviewCount?: number;
  unavailableDates?: string[];
  
  // Propriedades adicionais para compatibilidade completa
  lat?: number;
  lng?: number;
  distanceFromCenter?: number;
  offerDriverDiscounts?: boolean;
  driverDiscountRate?: number;
  minimumDriverLevel?: string;
  partnershipBadgeVisible?: boolean;
  enablePartnerships?: boolean;
  accommodationDiscount?: number;
  transportDiscount?: number;
  checkInTime?: string;
  checkOutTime?: string;
  policies?: string;
  contactEmail?: string;
  contactPhone?: string;
  roomTypes?: any[];
  
  createdAt: string;
  updatedAt: string;
}

// Interface simplificada para criação - compatível com CreateAccommodationRequest
export interface CreateAccommodationData {
  name: string;
  type: string;
  address?: string;
  description?: string;
  maxGuests?: number;
  bedrooms?: number;
  bathrooms?: number;
  amenities?: string[];
  images?: string[];
  isAvailable?: boolean;
  // Campos opcionais para compatibilidade
  lat?: number;
  lng?: number;
  pricePerNight?: number;
  reviewCount?: number;
  distanceFromCenter?: number;
  offerDriverDiscounts?: boolean;
  driverDiscountRate?: number;
  minimumDriverLevel?: string;
  partnershipBadgeVisible?: boolean;
  enablePartnerships?: boolean;
  accommodationDiscount?: number;
  transportDiscount?: number;
  hotelId?: string; // Adicionado para suportar quartos de hotel
}

export const useAccommodations = () => {
  const { user } = useAuth();
  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAccommodations = async () => {
    if (!user?.id) {
      setAccommodations([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log("🔄 Carregando acomodações para hostId:", user.id);
      
      let hostAccommodations: Accommodation[] = [];
      
      // Tentar método específico primeiro
      if (accommodationService.getByHost) {
        const accommodationsData = await accommodationService.getByHost(user.id);
        hostAccommodations = accommodationsData.map((acc: any) => ({
          id: acc.id,
          hostId: user.id,
          name: acc.name,
          type: acc.type,
          address: acc.address || acc.location,
          description: acc.description || '',
          maxGuests: acc.maxGuests || acc.availableRooms || 2,
          bedrooms: acc.bedrooms || 1,
          bathrooms: acc.bathrooms || 1,
          amenities: acc.amenities || [],
          images: acc.images || [],
          isAvailable: acc.isAvailable !== false,
          rating: acc.rating || 0,
          reviewCount: acc.reviewCount || 0,
          unavailableDates: acc.unavailableDates || [],
          
          // Propriedades adicionais para compatibilidade
          lat: acc.lat,
          lng: acc.lng,
          distanceFromCenter: acc.distanceFromCenter,
          offerDriverDiscounts: acc.offerDriverDiscounts,
          driverDiscountRate: acc.driverDiscountRate,
          minimumDriverLevel: acc.minimumDriverLevel,
          partnershipBadgeVisible: acc.partnershipBadgeVisible,
          enablePartnerships: acc.enablePartnerships,
          accommodationDiscount: acc.accommodationDiscount,
          transportDiscount: acc.transportDiscount,
          checkInTime: acc.checkInTime,
          checkOutTime: acc.checkOutTime,
          policies: acc.policies,
          contactEmail: acc.contactEmail,
          contactPhone: acc.contactPhone,
          roomTypes: acc.roomTypes || [],
          
          createdAt: acc.createdAt || new Date().toISOString(),
          updatedAt: acc.updatedAt || new Date().toISOString()
        }));
      } 
      // Fallback: buscar todas acomodações
      else if (accommodationService.getAllAccommodations) {
        console.warn('📝 getByHost não disponível, usando getAllAccommodations como fallback');
        const allAccommodations = await accommodationService.getAllAccommodations();
        
        // Filtrar pelo hostId atual
        hostAccommodations = allAccommodations
          .filter((acc: any) => acc.hostId === user.id)
          .map((acc: any) => ({
            id: acc.id,
            hostId: user.id,
            name: acc.name,
            type: acc.type,
            address: acc.address || acc.location,
            description: acc.description || '',
            maxGuests: acc.maxGuests || acc.availableRooms || 2,
            bedrooms: acc.bedrooms || 1,
            bathrooms: acc.bathrooms || 1,
            amenities: acc.amenities || [],
            images: acc.images || [],
            isAvailable: acc.isAvailable !== false,
            rating: acc.rating || 0,
            reviewCount: acc.reviewCount || 0,
            unavailableDates: acc.unavailableDates || [],
            
            // Propriedades adicionais para compatibilidade
            lat: acc.lat,
            lng: acc.lng,
            distanceFromCenter: acc.distanceFromCenter,
            offerDriverDiscounts: acc.offerDriverDiscounts,
            driverDiscountRate: acc.driverDiscountRate,
            minimumDriverLevel: acc.minimumDriverLevel,
            partnershipBadgeVisible: acc.partnershipBadgeVisible,
            enablePartnerships: acc.enablePartnerships,
            accommodationDiscount: acc.accommodationDiscount,
            transportDiscount: acc.transportDiscount,
            checkInTime: acc.checkInTime,
            checkOutTime: acc.checkOutTime,
            policies: acc.policies,
            contactEmail: acc.contactEmail,
            contactPhone: acc.contactPhone,
            roomTypes: acc.roomTypes || [],
            
            createdAt: acc.createdAt || new Date().toISOString(),
            updatedAt: acc.updatedAt || new Date().toISOString()
          }));
      }
      // Fallback final: array vazio
      else {
        console.warn('⚠️ Nenhum método de busca disponível no accommodationService');
        hostAccommodations = [];
      }
      
      console.log("✅ Acomodações carregadas:", hostAccommodations.length);
      setAccommodations(hostAccommodations);
      
    } catch (err) {
      console.error("❌ Erro ao carregar acomodações:", err);
      setError("Erro ao carregar propriedades");
      setAccommodations([]);
    } finally {
      setLoading(false);
    }
  };

  const createAccommodation = async (accommodationData: CreateAccommodationData) => {
    if (!user?.id) {
      return { success: false, error: "Utilizador não autenticado" };
    }

    try {
      setError(null);
      
      // Validação
      if (!accommodationData.name?.trim()) {
        return { success: false, error: "Nome da propriedade é obrigatório" };
      }
      
      if (!accommodationData.address?.trim()) {
        return { success: false, error: "Endereço é obrigatório" };
      }

      // Preparar dados no formato correto para CreateAccommodationRequest
      const dataToSend = {
        name: accommodationData.name.trim(),
        type: accommodationData.type || 'hotel_room',
        address: accommodationData.address?.trim() || '',
        description: accommodationData.description?.trim() || '',
        maxGuests: accommodationData.maxGuests || 2,
        bedrooms: accommodationData.bedrooms || 1,
        bathrooms: accommodationData.bathrooms || 1,
        amenities: accommodationData.amenities || [],
        images: accommodationData.images || [],
        isAvailable: accommodationData.isAvailable !== false,
        hostId: user.id,
        // Campos de compatibilidade
        availableRooms: accommodationData.maxGuests || 2,
        location: accommodationData.address?.trim() || '',
        // Campos opcionais
        lat: accommodationData.lat,
        lng: accommodationData.lng,
        pricePerNight: accommodationData.pricePerNight,
        reviewCount: accommodationData.reviewCount,
        distanceFromCenter: accommodationData.distanceFromCenter,
        offerDriverDiscounts: accommodationData.offerDriverDiscounts,
        driverDiscountRate: accommodationData.driverDiscountRate,
        minimumDriverLevel: accommodationData.minimumDriverLevel,
        partnershipBadgeVisible: accommodationData.partnershipBadgeVisible,
        enablePartnerships: accommodationData.enablePartnerships,
        accommodationDiscount: accommodationData.accommodationDiscount,
        transportDiscount: accommodationData.transportDiscount,
        hotelId: accommodationData.hotelId || undefined, // Incluído para suportar quartos de hotel
      };

      console.log("🔄 Criando acomodação:", dataToSend);

      let newAccommodation: any;
      
      // Usar apenas métodos que existem no accommodationService
      if (accommodationService.createAccommodation) {
        console.log("📤 Usando createAccommodation...");
        newAccommodation = await accommodationService.createAccommodation(dataToSend);
      } else {
        throw new Error('Nenhum método de criação disponível no accommodationService');
      }
      
      console.log("✅ Acomodação criada com sucesso:", newAccommodation);
      await loadAccommodations(); // Recarregar lista
      
      // Extrair ID corretamente da resposta
      const accommodationId = newAccommodation.id || 
                            (newAccommodation.data && newAccommodation.data.id) ||
                            newAccommodation.accommodationId;
      
      return { 
        success: true, 
        accommodation: {
          id: accommodationId,
          hostId: user.id,
          name: newAccommodation.name || accommodationData.name,
          type: newAccommodation.type || accommodationData.type,
          address: newAccommodation.address || accommodationData.address || '',
          description: newAccommodation.description || accommodationData.description || '',
          maxGuests: newAccommodation.maxGuests || accommodationData.maxGuests || 2,
          bedrooms: newAccommodation.bedrooms || accommodationData.bedrooms || 1,
          bathrooms: newAccommodation.bathrooms || accommodationData.bathrooms || 1,
          amenities: newAccommodation.amenities || accommodationData.amenities || [],
          images: newAccommodation.images || accommodationData.images || [],
          isAvailable: newAccommodation.isAvailable !== false,
          rating: newAccommodation.rating || 0,
          reviewCount: newAccommodation.reviewCount || 0,
          
          // Propriedades adicionais para compatibilidade
          lat: newAccommodation.lat,
          lng: newAccommodation.lng,
          distanceFromCenter: newAccommodation.distanceFromCenter,
          offerDriverDiscounts: newAccommodation.offerDriverDiscounts,
          driverDiscountRate: newAccommodation.driverDiscountRate,
          minimumDriverLevel: newAccommodation.minimumDriverLevel,
          partnershipBadgeVisible: newAccommodation.partnershipBadgeVisible,
          enablePartnerships: newAccommodation.enablePartnerships,
          accommodationDiscount: newAccommodation.accommodationDiscount,
          transportDiscount: newAccommodation.transportDiscount,
          checkInTime: newAccommodation.checkInTime,
          checkOutTime: newAccommodation.checkOutTime,
          policies: newAccommodation.policies,
          contactEmail: newAccommodation.contactEmail,
          contactPhone: newAccommodation.contactPhone,
          roomTypes: newAccommodation.roomTypes || [],
          
          createdAt: newAccommodation.createdAt || new Date().toISOString(),
          updatedAt: newAccommodation.updatedAt || new Date().toISOString()
        }
      };
      
    } catch (err: any) {
      console.error("❌ Erro ao criar acomodação:", err);
      const errorMsg = err.response?.data?.error || err.message || "Erro ao criar propriedade";
      return { success: false, error: errorMsg };
    }
  };

  // Função auxiliar para atualizar uma acomodação
  const updateAccommodation = async (id: string, updates: Partial<Accommodation>) => {
    try {
      // Solução defensiva - criar safeUpdates
      const safeUpdates = { ...updates };
      // Remover pricePerNight caso exista (para compatibilidade com código antigo)
      if ('pricePerNight' in safeUpdates) {
        delete (safeUpdates as any).pricePerNight;
      }
      
      let updatedAccommodation: any;
      
      // Usar apenas métodos que existem no accommodationService
      if (accommodationService.updateAccommodation) {
        console.log("✏️ Usando updateAccommodation...");
        updatedAccommodation = await accommodationService.updateAccommodation(id, safeUpdates);
      } else {
        throw new Error('Nenhum método de atualização disponível');
      }
      
      // Atualizar lista local
      setAccommodations(prev => 
        prev.map(acc => acc.id === id ? { ...acc, ...updatedAccommodation } : acc)
      );
      
      return { success: true, accommodation: updatedAccommodation };
    } catch (err: any) {
      console.error("❌ Erro ao atualizar acomodação:", err);
      return { success: false, error: err.message };
    }
  };

  // Função auxiliar para deletar uma acomodação
  const deleteAccommodation = async (id: string) => {
    try {
      // Usar apenas métodos que existem no accommodationService
      if (accommodationService.deleteAccommodation) {
        console.log("🗑️ Usando deleteAccommodation...");
        await accommodationService.deleteAccommodation(id);
      } else {
        throw new Error('Nenhum método de deleção disponível');
      }
      
      // Atualizar lista local
      setAccommodations(prev => prev.filter(acc => acc.id !== id));
      
      return { success: true };
    } catch (err: any) {
      console.error("❌ Erro ao deletar acomodação:", err);
      return { success: false, error: err.message };
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadAccommodations();
    } else {
      setAccommodations([]);
      setLoading(false);
    }
  }, [user?.id]);

  return {
    accommodations,
    loading,
    error,
    createAccommodation,
    updateAccommodation,
    deleteAccommodation,
    refetch: loadAccommodations
  };
};