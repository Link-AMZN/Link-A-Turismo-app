import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { accommodationService } from '@/shared/lib/accommodationService';
import { useAuth } from '@/shared/hooks/useAuth';
import AddRoomForm from '../../../components/hotel-wizard/RoomsForm';
import { Accommodation } from '@/shared/lib/accommodationService';

// ⭐ INTERFACE CORRIGIDA
interface ExtendedAccommodation extends Omit<Accommodation, 'availableRooms'> {
  hotelId?: string;
  address?: string;
  maxGuests?: number;
  pricePerNight?: number;
  availableRooms?: number;
}

// ⭐ Interface para Room (baseado na tabela hotelRooms)
interface HotelRoom {
  id: string;
  accommodationId: string;
  roomNumber: string;
  roomType: string;
  description?: string;
  pricePerNight: number;
  maxOccupancy: number;
  bedType?: string;
  bedCount: number;
  hasPrivateBathroom: boolean;
  hasAirConditioning: boolean;
  hasWifi: boolean;
  hasTV: boolean;
  hasBalcony: boolean;
  hasKitchen: boolean;
  roomAmenities: string[];
  images: string[];
  isAvailable: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
}

const HotelManagementPage: React.FC = () => {
  const { hotelId } = useParams<{ hotelId: string }>();
  const [, setLocation] = useLocation();
  const { user, token: authToken, loading: authLoading } = useAuth();

  // ⭐⭐ DEBUG TEMPORÁRIO
  useEffect(() => {
    console.log("🔍 DEBUG useAuth:", {
      user: user?.email,
      tokenFromHook: authToken ? `SIM (${authToken.length} chars)` : "NÃO",
      tokenFromStorage: localStorage.getItem('token') ? `SIM (${localStorage.getItem('token')?.length} chars)` : "NÃO",
      authLoading
    });
  }, [user, authToken, authLoading]);

  // ⭐⭐ CORREÇÃO: Usar token do hook OU do localStorage como fallback
  const effectiveToken = authToken || localStorage.getItem('token');
  
  const [hotel, setHotel] = useState<ExtendedAccommodation | null>(null);
  const [rooms, setRooms] = useState<HotelRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  console.log("🎯 Token efetivo para API:", effectiveToken ? `SIM (${effectiveToken.length} chars)` : "NÃO");

  // ⭐⭐ CORREÇÃO: Carregar dados quando hotelId e effectiveToken estiverem disponíveis
  useEffect(() => {
    if (hotelId && effectiveToken) {
      console.log("🎯 FRONTEND: Hotel ID e Token disponíveis, carregando dados...");
      loadHotelData();
    } else if (hotelId && !effectiveToken) {
      console.log("⏳ FRONTEND: Aguardando token...");
      setError('Aguardando autenticação...');
    }
  }, [hotelId, effectiveToken]);

  // ⭐⭐ FUNÇÃO HELPER PARA REQUISIÇÕES AUTENTICADAS
  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    if (!effectiveToken) {
      throw new Error('Token de autenticação não encontrado');
    }

    const headers = {
      'Authorization': `Bearer ${effectiveToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    console.log(`🔍 FRONTEND: Fetch ${url} com token`);
    
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ FRONTEND: Erro ${response.status} em ${url}:`, errorText);
      
      if (response.status === 401) {
        throw new Error('Não autorizado - faça login novamente');
      } else if (response.status === 403) {
        throw new Error('Sem permissão para acessar este recurso');
      } else if (response.status === 404) {
        throw new Error('Recurso não encontrado');
      } else {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }
    }

    return response.json();
  };

  const loadHotelData = async () => {
    if (!hotelId || !effectiveToken) return;
    
    try {
      setLoading(true);
      setError('');
      
      console.log("🔍 FRONTEND: Buscando hotel com ID:", hotelId);

      // ⭐⭐ CORREÇÃO: Usar função helper com autenticação
      const hotelData = await fetchWithAuth(`/api/hotels/manage-hotel/${hotelId}`);
      
      console.log("🔍 FRONTEND: Dados recebidos:", hotelData);
      
      if (hotelData.success && hotelData.data) {
        setHotel(hotelData.data.hotel);
        
        // ⭐⭐ CORREÇÃO: Buscar quartos também com autenticação
        const roomsData = await fetchWithAuth(`/api/hotels/${hotelId}/rooms`);
        
        if (roomsData.success) {
          setRooms(roomsData.data?.rooms || []);
        }
      } else {
        throw new Error('Dados do hotel inválidos');
      }
      
    } catch (err) {
      console.error('❌ FRONTEND: Erro ao carregar dados do hotel:', err);
      setError(err instanceof Error ? err.message : 'Não foi possível carregar os dados do hotel');
    } finally {
      setLoading(false);
    }
  };

  const handleRoomCreated = () => {
    console.log('Recarregando dados após criação do quarto...');
    loadHotelData();
  };

  const navigateTo = (path: string) => {
    setLocation(path);
  };

  // ⭐ WRAPPER para AddRoomForm que aceita onRoomCreated
  const AddRoomFormWrapper: React.FC<{ 
    accommodationId: string; 
    hotelAddress: string; 
    onRoomCreated: () => void;
  }> = ({ accommodationId, hotelAddress, onRoomCreated }) => {
    
    const handleRoomCreatedInternal = () => {
      console.log('Quarto criado com sucesso!');
      onRoomCreated();
    };

    return (
      <div>
        <AddRoomForm 
          accommodationId={accommodationId}
          hotelAddress={hotelAddress}
          onRoomCreated={handleRoomCreatedInternal}
        />
      </div>
    );
  };

  // ⭐⭐ CORREÇÃO: Verificar effectiveToken em vez de apenas authToken
  if (!effectiveToken) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Aguardando autenticação...</p>
          <p className="text-sm text-gray-500 mt-2">Conectando com o servidor de segurança</p>
          <div className="mt-4 space-y-2">
            <p className="text-xs text-gray-400">Usuário: {user?.email || 'Não autenticado'}</p>
            <p className="text-xs text-gray-400">Token do Hook: {authToken ? 'Disponível' : 'Indisponível'}</p>
            <p className="text-xs text-gray-400">Token do Storage: {localStorage.getItem('token') ? 'Disponível' : 'Indisponível'}</p>
            <p className="text-xs text-gray-400">Loading do Auth: {authLoading ? 'Sim' : 'Não'}</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando dados do hotel...</p>
          <p className="text-sm text-gray-500 mt-2">Hotel ID: {hotelId}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded max-w-md">
            <p className="font-bold">Erro</p>
            <p>{error}</p>
            <div className="mt-4 flex gap-2 justify-center">
              <button 
                onClick={() => window.location.reload()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
              >
                Recarregar
              </button>
              <button 
                onClick={() => navigateTo('/hotels')}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
              >
                Voltar aos Hotéis
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Hotel não encontrado</h2>
          <button 
            onClick={() => navigateTo('/hotels')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Voltar aos Hotéis
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Cabeçalho do Hotel */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Gestão de Quartos - {hotel.name}</h1>
        <p className="text-gray-600">{hotel.address || 'Endereço não disponível'}</p>
        
        <div className="mt-4 flex gap-4">
          <button 
            onClick={() => navigateTo('/hotels')}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            Voltar aos Hotéis
          </button>
          <button 
            onClick={() => navigateTo(`/hotels/${hotelId}/edit`)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Editar Hotel
          </button>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold text-gray-700">Quartos Cadastrados</h3>
          <p className="text-2xl font-bold text-green-600">{rooms.length}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold text-gray-700">Taxa de Ocupação</h3>
          <p className="text-2xl font-bold text-blue-600">82%</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold text-gray-700">Receita Mensal</h3>
          <p className="text-2xl font-bold text-purple-600">224,500 MT</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold text-gray-700">Total de Reservas</h3>
          <p className="text-2xl font-bold text-orange-600">73</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulário de Adicionar Quarto */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Adicionar Novo Quarto</h2>
            <AddRoomFormWrapper 
              accommodationId={hotelId!}
              hotelAddress={hotel.address || ''}
              onRoomCreated={handleRoomCreated}
            />
          </div>
        </div>

        {/* Lista de Quartos Existentes */}
        <div className="lg:col-span-2">
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Quartos do Hotel</h2>
            
            {rooms.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🏨</span>
                </div>
                <p className="text-lg font-medium mb-2">Nenhum quarto cadastrado ainda.</p>
                <p className="text-sm">Use o formulário ao lado para adicionar o primeiro quarto.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {rooms.map(room => (
                  <div key={room.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-gray-800">
                          Quarto {room.roomNumber} - {room.roomType}
                        </h3>
                        <p className="text-gray-600 capitalize">{room.description}</p>
                        <p className="text-green-600 font-bold text-lg">
                          {room.pricePerNight ? `${room.pricePerNight.toLocaleString()} MT/noite` : 'Preço não definido'}
                        </p>
                        <p className="text-sm text-gray-600">
                          Capacidade: {room.maxOccupancy || 'N/A'} hóspedes
                        </p>
                        <p className="text-sm text-gray-600">
                          Status: <span className={`font-semibold ${room.status === 'available' ? 'text-green-600' : 'text-red-600'}`}>
                            {room.status === 'available' ? 'Disponível' : 'Indisponível'}
                          </span>
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600 transition-colors"
                          onClick={() => console.log('Editar quarto:', room.id)}
                        >
                          Editar
                        </button>
                        <button 
                          className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors"
                          onClick={() => console.log('Excluir quarto:', room.id)}
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotelManagementPage;