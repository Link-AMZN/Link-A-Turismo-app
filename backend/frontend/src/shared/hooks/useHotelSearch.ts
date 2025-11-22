import { useState, useCallback } from 'react';
import { accommodationService } from '../lib/accommodationService';
import { Accommodation, SearchFilters, LocationSuggestion } from '../types/accommodation';

export const useHotelSearch = () => {
  const [hotels, setHotels] = useState<Accommodation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);

  // ✅ BUSCA INTELIGENTE
  const searchIntelligent = useCallback(async (filters: SearchFilters) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Executando busca inteligente:', filters);
      
      const result = await accommodationService.searchIntelligent({
        address: filters.address || filters.location || '',
        checkIn: filters.checkIn,
        checkOut: filters.checkOut,
        guests: filters.guests,
        isAvailable: filters.isAvailable
      });
      
      if (result.success) {
        setHotels(result.data);
        console.log(`✅ Encontrados ${result.data.length} hotéis`);
      } else {
        throw new Error(result.message || 'Erro na busca');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      console.error('❌ Erro na busca inteligente:', errorMessage);
      setHotels([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ BUSCA POR PROXIMIDADE
  const searchNearby = useCallback(async (lat: number, lng: number, radius: number = 50) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('📍 Buscando hotéis próximos:', { lat, lng, radius });
      
      const result = await accommodationService.searchNearby({
        lat,
        lng,
        radius
      });
      
      if (result.success) {
        setHotels(result.data);
        console.log(`📍 Encontrados ${result.data.length} hotéis próximos`);
      } else {
        throw new Error(result.message || 'Erro na busca por proximidade');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      console.error('❌ Erro na busca por proximidade:', errorMessage);
      setHotels([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ SUGESTÕES DE LOCALIZAÇÃO
  const getLocationSuggestions = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }
    
    try {
      console.log('💡 Buscando sugestões para:', query);
      const suggestions = await accommodationService.getLocationSuggestions(query);
      setSuggestions(suggestions);
    } catch (err) {
      console.error('❌ Erro ao buscar sugestões:', err);
      setSuggestions([]);
    }
  }, []);

  // ✅ LIMPAR SUGESTÕES
  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  return {
    hotels,
    loading,
    error,
    suggestions,
    searchIntelligent,
    searchNearby,
    getLocationSuggestions,
    clearSuggestions
  };
};