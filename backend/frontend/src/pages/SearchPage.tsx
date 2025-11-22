import React, { useState, useEffect } from 'react';
import { useHotelSearch } from '../shared/hooks/useHotelSearch';
import { HotelCard } from '../components/HotelCard';
import { LocationAutocomplete } from '@/components/ui/location-autocomplete';
import { LocationSuggestion as AccommodationLocationSuggestion } from '@/shared/types/accommodation';
import { LocationSuggestion as ServiceLocationSuggestion } from '@/services/locationsService';

// ✅ INTERFACE PARA LocationOption (se necessário pelo LocationAutocomplete)
interface LocationOption {
  label: string;
  value: string;
  lat?: number;
  lng?: number;
}

const SearchPage: React.FC = () => {
  const {
    hotels,
    loading,
    error,
    suggestions,
    searchIntelligent,
    getLocationSuggestions,
    clearSuggestions
  } = useHotelSearch();

  const [searchParams, setSearchParams] = useState({
    address: '',
    checkIn: '',
    checkOut: '',
    guests: 2
  });

  // ✅ CORREÇÃO: Estado separado para loading de sugestões
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // ✅ FUNÇÃO PARA CONVERTER SUGESTÕES
  const convertSuggestions = (serviceSuggestions: ServiceLocationSuggestion[]): AccommodationLocationSuggestion[] => {
    return serviceSuggestions.map(suggestion => ({
      id: suggestion.id,
      name: suggestion.name,
      province: suggestion.province,
      district: suggestion.district,
      type: suggestion.type,
      lat: suggestion.lat,
      lng: suggestion.lng,
      relevance_rank: suggestion.relevance_rank
    }));
  };

  // ✅ BUSCAR SUGESTÕES QUANDO O USUÁRIO DIGITA - CORRIGIDO
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchParams.address.length > 2) {
        setLoadingSuggestions(true);
        try {
          await getLocationSuggestions(searchParams.address);
        } catch (error) {
          console.error('Erro ao buscar sugestões:', error);
        } finally {
          setLoadingSuggestions(false);
        }
      } else {
        clearSuggestions();
      }
    };

    fetchSuggestions();
  }, [searchParams.address, getLocationSuggestions, clearSuggestions]);

  // ✅ SUBMETER BUSCA
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchParams.address.trim()) return;
    
    searchIntelligent(searchParams);
  };

  // ✅ CORREÇÃO: Handler para onChange do LocationAutocomplete
  const handleLocationChange = (value: string | LocationOption) => {
    // ✅ CORREÇÃO: Extrair string do valor (pode ser string ou objeto)
    const addressValue = typeof value === 'string' ? value : value.label;
    
    setSearchParams(prev => ({ 
      ...prev, 
      address: addressValue 
    }));
  };

  // ✅ CORREÇÃO: SELECIONAR SUGESTÃO com estado consistente
  const handleSuggestionSelect = (suggestion: ServiceLocationSuggestion) => {
    // ✅ CORREÇÃO: Criar nova cópia do estado para garantir consistência
    const newParams = { 
      ...searchParams, 
      address: suggestion.name 
    };
    
    setSearchParams(newParams);
    
    // ✅ CORREÇÃO: Usar nova cópia para busca inteligente
    searchIntelligent(newParams);
  };

  // ✅ CONVERTER SUGESTÕES PARA O TIPO CORRETO
  const convertedSuggestions = convertSuggestions(suggestions);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header de Busca */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Campo de Localização com Autocomplete - CORRIGIDO */}
              <div className="md:col-span-2">
                <LocationAutocomplete
                  value={searchParams.address}
                  onChange={handleLocationChange} // ✅ CORREÇÃO: Usar handler corrigido
                  onSelect={handleSuggestionSelect}
                  suggestions={convertedSuggestions}
                  loading={loadingSuggestions} // ✅ CORREÇÃO: Usar loading separado para sugestões
                  placeholder="Cidade, província ou localidade..."
                />
              </div>

              {/* Check-in */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Check-in
                </label>
                <input
                  type="date"
                  value={searchParams.checkIn}
                  onChange={(e) => setSearchParams(prev => ({ ...prev, checkIn: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Check-out */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Check-out
                </label>
                <input
                  type="date"
                  value={searchParams.checkOut}
                  onChange={(e) => setSearchParams(prev => ({ ...prev, checkOut: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hóspedes
                  </label>
                  <select
                    value={searchParams.guests}
                    onChange={(e) => setSearchParams(prev => ({ ...prev, guests: parseInt(e.target.value) }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {[1, 2, 3, 4, 5, 6].map(num => (
                      <option key={num} value={num}>
                        {num} {num === 1 ? 'hóspede' : 'hóspedes'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !searchParams.address.trim()}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Buscando...' : 'Buscar Hotéis'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Resultados */}
      <div className="container mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-red-700">{error}</span>
            </div>
          </div>
        )}

        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Buscando os melhores hotéis para você...</p>
          </div>
        )}

        {!loading && hotels.length > 0 && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {hotels.length} hotéis encontrados
                {searchParams.address && ` para "${searchParams.address}"`}
              </h2>
              
              <div className="text-sm text-gray-500">
                Ordenado por: <span className="font-medium">Relevância</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {hotels.map(hotel => (
                <HotelCard 
                  key={hotel.id} // ✅ CORREÇÃO: Verificar se hotel.id é único
                  hotel={hotel}
                  onSelect={(hotel) => {
                    // Navegar para página de detalhes
                    console.log('Hotel selecionado:', hotel);
                    // ✅ CORREÇÃO: Adicionar navegação real aqui
                    // Exemplo: navigate(`/hotel/${hotel.id}`);
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {!loading && hotels.length === 0 && searchParams.address && (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum hotel encontrado
            </h3>
            <p className="text-gray-500 mb-4">
              Não encontramos hotéis para "{searchParams.address}". Tente buscar por uma cidade ou província próxima.
            </p>
            <button
              onClick={() => setSearchParams(prev => ({ ...prev, address: '' }))}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Limpar busca
            </button>
          </div>
        )}

        {!loading && !searchParams.address && (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Encontre o hotel perfeito
            </h3>
            <p className="text-gray-500">
              Digite uma localização para começar sua busca
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;