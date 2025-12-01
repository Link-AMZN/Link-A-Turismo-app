// src/shared/hooks/useMyHotels.ts
import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../lib/api';

export const useMyHotels = () => {
  const [hotels, setHotels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMyHotels = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.getMyHotels();
      
      if (response.success) {
        setHotels(response.data);
      } else {
        setError('Erro ao carregar hotéis');
      }
    } catch (err) {
      setError('Falha na conexão com o servidor');
      console.error('Error fetching my hotels:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createHotel = useCallback(async (hotelData: any) => {
    try {
      const response = await apiService.createHotel(hotelData);
      
      if (response.success) {
        // Atualizar lista após criação
        await fetchMyHotels();
        return response;
      } else {
        throw new Error('Erro ao criar hotel');
      }
    } catch (err) {
      console.error('Error creating hotel:', err);
      throw err;
    }
  }, [fetchMyHotels]);

  const createRoomType = useCallback(async (roomTypeData: any) => {
    try {
      const response = await apiService.createRoomType(roomTypeData);
      
      if (response.success) {
        return response;
      } else {
        throw new Error('Erro ao criar tipo de quarto');
      }
    } catch (err) {
      console.error('Error creating room type:', err);
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchMyHotels();
  }, [fetchMyHotels]);

  return {
    hotels,
    loading,
    error,
    refetch: fetchMyHotels,
    createHotel,
    createRoomType
  };
};