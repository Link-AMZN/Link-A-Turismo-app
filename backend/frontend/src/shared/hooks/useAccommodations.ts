import { useState, useEffect } from "react";
import { accommodationService } from "src/shared/lib/accommodationService";
import { useAuth } from "./useAuth";
// ✅ IMPORTAR DA FONTE ÚNICA
import { Accommodation, CreateAccommodationData } from "@/shared/types/accommodation";

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
      
      // ✅ AGORA accommodationService.getByHost JÁ RETORNA Accommodation[] UNIFICADO
      const hostAccommodations = await accommodationService.getByHost(user.id);
      
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

      // ✅ CORRIGIDO: Remover propriedades que não existem no CreateAccommodationData
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
        // ✅ APENAS CAMPOS QUE EXISTEM NO CreateAccommodationData
        lat: accommodationData.lat,
        lng: accommodationData.lng,
        pricePerNight: accommodationData.pricePerNight,
      };

      console.log("🔄 Criando acomodação:", dataToSend);

      const newAccommodation = await accommodationService.createAccommodation(dataToSend);
      
      console.log("✅ Acomodação criada com sucesso:", newAccommodation);
      await loadAccommodations();
      
      // Extrair ID corretamente da resposta
      const accommodationId = newAccommodation.id || 
                            (newAccommodation.data && newAccommodation.data.id) ||
                            newAccommodation.accommodationId;
      
      // ✅ CORRIGIDO: Usar apenas propriedades que existem
      const createdAccommodation: Accommodation = {
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
        unavailableDates: newAccommodation.unavailableDates || [],
        
        // Propriedades adicionais (valores padrão)
        lat: newAccommodation.lat,
        lng: newAccommodation.lng,
        pricePerNight: newAccommodation.pricePerNight,
        
        // ✅ PROPRIEDADES OPCIONAIS COM VALORES PADRÃO
        distanceFromCenter: newAccommodation.distanceFromCenter,
        offerDriverDiscounts: newAccommodation.offerDriverDiscounts || false,
        driverDiscountRate: newAccommodation.driverDiscountRate,
        minimumDriverLevel: newAccommodation.minimumDriverLevel,
        partnershipBadgeVisible: newAccommodation.partnershipBadgeVisible || false,
        enablePartnerships: newAccommodation.enablePartnerships || false,
        accommodationDiscount: newAccommodation.accommodationDiscount,
        transportDiscount: newAccommodation.transportDiscount,
        checkInTime: newAccommodation.checkInTime,
        checkOutTime: newAccommodation.checkOutTime,
        policies: newAccommodation.policies,
        contactEmail: newAccommodation.contactEmail,
        contactPhone: newAccommodation.contactPhone,
        roomTypes: newAccommodation.roomTypes || [],
        
        // ✅ CAMPOS DE COMPATIBILIDADE
        availableRooms: newAccommodation.availableRooms || newAccommodation.maxGuests || 2,
        locality: newAccommodation.locality,
        province: newAccommodation.province,
        location: newAccommodation.location || newAccommodation.address,
        price: newAccommodation.price || newAccommodation.pricePerNight || 0,
        
        createdAt: newAccommodation.createdAt || new Date().toISOString(),
        updatedAt: newAccommodation.updatedAt || new Date().toISOString()
      };
      
      return { 
        success: true, 
        accommodation: createdAccommodation
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
      const safeUpdates = { ...updates };
      
      let updatedAccommodation: any;
      
      if (accommodationService.updateAccommodation) {
        console.log("✏️ Usando updateAccommodation...");
        updatedAccommodation = await accommodationService.updateAccommodation(id, safeUpdates);
      } else {
        throw new Error('Nenhum método de atualização disponível');
      }
      
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
      if (accommodationService.deleteAccommodation) {
        console.log("🗑️ Usando deleteAccommodation...");
        await accommodationService.deleteAccommodation(id);
      } else {
        throw new Error('Nenhum método de deleção disponível');
      }
      
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