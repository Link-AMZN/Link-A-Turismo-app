import { useState, useCallback } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Calendar, MapPin, Users, Search, Smartphone } from 'lucide-react';
import { RideSearchParams } from '@/shared/hooks/useModalState';
import { useLocation } from 'wouter';
import { useToast } from '@/shared/hooks/use-toast';
import LocationAutocomplete from '@/shared/components/LocationAutocomplete';

// ✅ DEFINIR LocationOption LOCALMENTE
export interface LocationOption {
  label: string;
  city?: string;
  district?: string;
  id?: string;
  lat?: number;
  lng?: number;
  type?: string;
  province?: string;
}

interface RideSearchFormProps {
  initialParams?: {
    fromOption?: LocationOption;
    toOption?: LocationOption;
    date?: string;
    passengers?: number;
  };
}

// ✅ INTERFACE PARA OS PARÂMETROS DE BUSCA
interface SearchParams {
  from: LocationOption;
  to: LocationOption;
  date: string;
  passengers: number;
}

// ✅ INTERFACE PARA RESPOSTA DA API
interface ApiResponse {
  data?: {
    rides?: any[];
    stats?: any;
    searchParams?: any;
  };
  success?: boolean;
  message?: string;
}

// ✅ SERVIÇO DE BUSCA INTELIGENTE
class RideSearchService {
  static async searchSmartRides(from: string, to: string, date: string, passengers: number) {
    try {
      const params = new URLSearchParams({
        from,
        to,
        date,
        passengers: passengers.toString(),
        smartSearch: 'true'
      });

      const response = await fetch(`/api/rides/smart/search?${params}`);
      
      if (!response.ok) {
        throw new Error('Erro na busca inteligente');
      }

      // ✅ 1. CORREÇÃO: Cast explícito para o tipo da resposta
      const data = await response.json() as ApiResponse;
      
      // ✅ 4. CORREÇÃO: Verificação robusta do formato da resposta
      const rides = Array.isArray(data?.data?.rides) ? data.data.rides : [];
      
      return {
        success: true,
        rides: rides,
        stats: data.data?.stats || {},
        searchParams: data.data?.searchParams || {}
      };
    } catch (error) {
      console.error('Erro na busca inteligente:', error);
      return await this.searchTraditionalRides(from, to, date, passengers);
    }
  }

  static async searchTraditionalRides(from: string, to: string, date: string, passengers: number) {
    try {
      const params = new URLSearchParams({
        fromLocation: from,
        toLocation: to,
        departureDate: date,
        seats: passengers.toString()
      });

      const response = await fetch(`/api/rides?${params}`);
      
      if (!response.ok) {
        throw new Error('Erro na busca tradicional');
      }

      // ✅ 1. CORREÇÃO: Cast explícito para o tipo da resposta
      const data = await response.json() as ApiResponse;
      
      // ✅ 4. CORREÇÃO: Verificação robusta do formato da resposta
      const rides = Array.isArray(data?.data?.rides) ? data.data.rides : [];
      
      return {
        success: true,
        rides: rides,
        stats: null,
        searchParams: { from, to, date, passengers }
      };
    } catch (error) {
      console.error('Erro na busca tradicional:', error);
      throw error;
    }
  }
}

export default function RideSearchForm({ initialParams }: RideSearchFormProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const [searchParams, setSearchParams] = useState<SearchParams>({
    from: initialParams?.fromOption || { label: '', city: '', district: '' },
    to: initialParams?.toOption || { label: '', city: '', district: '' },
    date: initialParams?.date || '',
    passengers: initialParams?.passengers || 1,
  });

  const [isSearching, setIsSearching] = useState(false);
  const [useSmartSearch, setUseSmartSearch] = useState(true);

  // ✅ 7. CORREÇÃO: useCallback para melhor performance
  const handleLocationChange = useCallback((field: 'from' | 'to', value: LocationOption) => {
    setSearchParams(prev => ({ ...prev, [field]: value }));
  }, []);

  // ✅ 3. CORREÇÃO: Tipagem mais precisa
  const handlePrimitiveChange = useCallback(<K extends keyof Pick<SearchParams, 'date' | 'passengers'>>(
    field: K,
    value: SearchParams[K]
  ) => {
    setSearchParams(prev => ({ ...prev, [field]: value }));
  }, []);

  // ✅ 7. CORREÇÃO: useCallback para melhor performance
  const handleSearch = useCallback(async () => {
    if (!searchParams.from.label || !searchParams.to.label || !searchParams.date) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Por favor, preencha origem, destino e data.',
        variant: 'destructive',
      });
      return;
    }

    // ✅ 5. CORREÇÃO: Limpar toasts anteriores
    toast.dismiss?.();

    setIsSearching(true);

    try {
      let searchResults;

      if (useSmartSearch) {
        toast({
          title: 'Buscando rotas inteligentes...',
          description: 'Encontrando as melhores opções para sua viagem.',
        });

        searchResults = await RideSearchService.searchSmartRides(
          searchParams.from.label,
          searchParams.to.label,
          searchParams.date,
          searchParams.passengers
        );

        if (searchResults.rides.length > 0) {
          toast({
            title: 'Busca inteligente concluída!',
            description: `Encontramos ${searchResults.rides.length} viagens compatíveis.`,
            variant: 'default',
          });
        }
      } else {
        toast({
          title: 'Buscando viagens...',
          description: 'Procurando opções disponíveis.',
        });

        searchResults = await RideSearchService.searchTraditionalRides(
          searchParams.from.label,
          searchParams.to.label,
          searchParams.date,
          searchParams.passengers
        );
      }

      localStorage.setItem('rideSearchResults', JSON.stringify({
        rides: searchResults.rides,
        stats: searchResults.stats,
        searchParams: {
          ...searchResults.searchParams,
          fromOption: searchParams.from,
          toOption: searchParams.to
        },
        timestamp: new Date().toISOString(),
        smartSearch: useSmartSearch
      }));

      const params = new URLSearchParams({
        from: searchParams.from.label,
        to: searchParams.to.label,
        date: searchParams.date,
        passengers: searchParams.passengers.toString(),
        smartSearch: useSmartSearch.toString(),
        fromCity: searchParams.from.city || '',
        toCity: searchParams.to.city || '',
        fromDistrict: searchParams.from.district || '',
        toDistrict: searchParams.to.district || ''
      });

      setLocation(`/rides/search?${params.toString()}`);

    } catch (error) {
      console.error('Erro na busca:', error);
      
      toast({
        title: 'Erro na busca',
        description: 'Não foi possível encontrar viagens. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  }, [searchParams, useSmartSearch, toast, setLocation]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }, [handleSearch]);

  return (
    <div className="p-6 max-w-lg mx-auto bg-white rounded-lg shadow-lg">
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Encontre sua Viagem
          </h2>
          <p className="text-gray-600 mb-4">
            Sistema inteligente que encontra as melhores rotas para você
          </p>
          
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium">Busca Inteligente</span>
            </div>
            <button
              type="button"
              onClick={() => setUseSmartSearch(!useSmartSearch)}
              // ✅ 6. CORREÇÃO: Melhor acessibilidade
              aria-pressed={useSmartSearch}
              aria-label={useSmartSearch ? 'Busca inteligente ativada' : 'Busca inteligente desativada'}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                useSmartSearch ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  useSmartSearch ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-xs text-gray-500">
              {useSmartSearch ? 'Ativada' : 'Desativada'}
            </span>
          </div>

          {useSmartSearch && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                🎯 <strong>Busca Inteligente:</strong> Encontra viagens compatíveis mesmo com origens/destinos próximos
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="from" className="flex items-center gap-2 text-gray-700">
              <MapPin className="w-4 h-4" /> 
              <span>Origem</span>
              <span className="text-red-500">*</span>
            </Label>
            <LocationAutocomplete
              id="from"
              placeholder="Ex: Maputo, Matola, Xai-Xai..."
              // ✅ 2. CORREÇÃO: Evitar undefined nos inputs controlados
              value={searchParams.from.label || ''}
              onChange={(location) => handleLocationChange('from', location)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="to" className="flex items-center gap-2 text-gray-700">
              <MapPin className="w-4 h-4" /> 
              <span>Destino</span>
              <span className="text-red-500">*</span>
            </Label>
            <LocationAutocomplete
              id="to"
              placeholder="Ex: Inhambane, Beira, Tete..."
              // ✅ 2. CORREÇÃO: Evitar undefined nos inputs controlados
              value={searchParams.to.label || ''}
              onChange={(location) => handleLocationChange('to', location)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="date" className="flex items-center gap-2 text-gray-700">
              <Calendar className="w-4 h-4" /> 
              <span>Data da viagem</span>
              <span className="text-red-500">*</span>
            </Label>
            <Input
              id="date"
              type="date"
              value={searchParams.date}
              onChange={e => handlePrimitiveChange('date', e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="passengers" className="flex items-center gap-2 text-gray-700">
              <Users className="w-4 h-4" /> 
              <span>Passageiros</span>
            </Label>
            <Input
              id="passengers"
              type="number"
              min={1}
              max={8}
              value={searchParams.passengers}
              onChange={e => handlePrimitiveChange('passengers', parseInt(e.target.value) || 1)}
              className="w-full"
            />
          </div>
        </div>

        <Button 
          onClick={handleSearch} 
          disabled={isSearching} 
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
          size="lg"
        >
          {isSearching ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Buscando...
            </>
          ) : (
            <>
              <Search className="w-4 h-4 mr-2" />
              {useSmartSearch ? 'Buscar Viagens Inteligentes' : 'Buscar Viagens'}
            </>
          )}
        </Button>

        <div className="text-center text-sm text-gray-500">
          <p>
            {useSmartSearch 
              ? '🔍 Buscando matches exatos e rotas compatíveis' 
              : '🔍 Buscando apenas matches exatos'
            }
          </p>
        </div>
      </div>
    </div>
  );
}