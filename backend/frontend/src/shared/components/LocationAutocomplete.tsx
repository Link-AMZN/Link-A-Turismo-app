import { useState, useRef, useEffect } from "react";
import { Input } from "@/shared/components/ui/input";
import { locationsService, LocationSuggestion } from "../../services/locationsService";

// ✅ INTERFACE CORRIGIDA: Adicionados province e locality
export interface LocationOption {
  label: string;
  city?: string;
  district?: string;
  province?: string;    // ✅ ADICIONADO
  locality?: string;    // ✅ ADICIONADO
  id?: string;
  lat?: number;
  lng?: number;
  type?: string;
}

interface LocationAutocompleteProps {
  id: string;
  placeholder: string;
  value: string | LocationOption; // ✅ CORREÇÃO: string | LocationOption
  onChange: (location: LocationOption) => void;
  onLocationSelect?: (location: LocationOption) => void;
  className?: string;
  "data-testid"?: string;
  loading?: boolean;
  suggestions?: LocationSuggestion[];
  "aria-describedby"?: string;
}

// ✅ CORREÇÃO CRÍTICA: Usar React.FC para preservar a tipagem das props
const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  id,
  placeholder,
  value,
  onChange,
  onLocationSelect,
  className,
  "data-testid": testId,
  loading = false,
  suggestions = [],
  "aria-describedby": ariaDescribedby
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredLocations, setFilteredLocations] = useState<LocationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // ✅ CORREÇÃO: Obter o valor do input como string
  const inputValue = typeof value === "string" ? value : value.label;

  // ✅ USAR SUGESTÕES EXTERNAS SE FORNECIDAS
  useEffect(() => {
    if (suggestions.length > 0) {
      setFilteredLocations(suggestions);
      if (inputValue.length >= 2) {
        setIsOpen(true);
      }
    }
  }, [suggestions, inputValue]);

  // ✅ BUSCAR SUGESTÕES APENAS SE NÃO FORNECIDAS EXTERNAMENTE
  useEffect(() => {
    const fetchSuggestions = async () => {
      // Se suggestions são fornecidas externamente, não buscar
      if (suggestions.length > 0) return;

      if (inputValue.length < 2) {
        setFilteredLocations([]);
        setIsOpen(false);
        return;
      }

      setIsLoading(true);
      try {
        const results = await locationsService.searchSuggestions(inputValue, 15);
        setFilteredLocations(results);
        setIsOpen(results.length > 0);
      } catch (error) {
        console.error('Erro ao buscar sugestões de localização:', error);
        setFilteredLocations([]);
        setIsOpen(false);
      } finally {
        setIsLoading(false);
      }
    };

    const timeoutId = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timeoutId);
  }, [inputValue, suggestions]);

  // ✅ CORREÇÃO: Função para converter LocationSuggestion para LocationOption
  const mapSuggestionToOption = (suggestion: LocationSuggestion): LocationOption => {
    const displayName = locationsService.formatLocationName(suggestion);
    return {
      id: suggestion.id,
      label: displayName,
      city: suggestion.name,
      district: suggestion.district,
      province: suggestion.province, // ✅ ADICIONADO
      locality: suggestion.locality, // ✅ ADICIONADO
      lat: suggestion.lat,
      lng: suggestion.lng,
      type: suggestion.type
    };
  };

  // Get location icon based on type
  const getLocationIcon = (type: string) => {
    switch (type) {
      case 'city': return 'fas fa-city';
      case 'town': return 'fas fa-building';
      case 'village': return 'fas fa-home';
      case 'transport_hub': return 'fas fa-plane';
      case 'landmark': return 'fas fa-landmark';
      case 'beach': return 'fas fa-umbrella-beach';
      case 'neighborhood': return 'fas fa-map-marker-alt';
      default: return 'fas fa-map-marker-alt';
    }
  };

  // Get location type label in Portuguese
  const getLocationTypeLabel = (type: string) => {
    switch (type) {
      case 'city': return 'Cidade';
      case 'town': return 'Vila';
      case 'village': return 'Aldeia';
      case 'transport_hub': return 'Transporte';
      case 'landmark': return 'Ponto de Referência';
      case 'beach': return 'Praia';
      case 'neighborhood': return 'Bairro';
      default: return type;
    }
  };

  // Get type color for styling
  const getTypeColor = (type: string): string => {
    const colorMap: { [key: string]: string } = {
      'city': 'text-green-500',
      'town': 'text-blue-500',
      'village': 'text-gray-500',
      'transport_hub': 'text-purple-500',
      'landmark': 'text-orange-500',
      'beach': 'text-cyan-500',
      'neighborhood': 'text-indigo-500'
    };
    return colorMap[type] || 'text-gray-400';
  };

  // ✅ CORREÇÃO: Fechar dropdown quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ✅ CORREÇÃO CRÍTICA: Handle location selection - AGORA SEMPRE RETORNA LocationOption
  const handleLocationClick = (location: LocationSuggestion) => {
    const locationOption = mapSuggestionToOption(location);
    
    // ✅ AGORA onChange recebe LocationOption
    onChange(locationOption);
    
    // ✅ AGORA onLocationSelect também recebe LocationOption
    if (onLocationSelect) {
      onLocationSelect(locationOption);
    }
    
    setIsOpen(false);
  };

  // ✅ CORREÇÃO: Handle input change - AGORA CRIA LocationOption mínimo
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    
    // ✅ Criar um LocationOption básico para digitação livre
    const minimalLocation: LocationOption = {
      label: newValue,
      city: "",
      district: "",
      province: "", // ✅ ADICIONADO
      locality: ""  // ✅ ADICIONADO
    };
    
    onChange(minimalLocation);
    
    if (newValue.length >= 2 && (suggestions.length > 0 || filteredLocations.length > 0)) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  // ✅ CORREÇÃO: Handle input focus
  const handleInputFocus = () => {
    if ((suggestions.length > 0 || filteredLocations.length > 0) && inputValue.length >= 2) {
      setIsOpen(true);
    }
  };

  // ✅ CORREÇÃO: Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || filteredLocations.length === 0) return;

    switch (e.key) {
      case 'Escape':
        setIsOpen(false);
        break;
      case 'Enter':
        if (filteredLocations.length > 0) {
          handleLocationClick(filteredLocations[0]);
        }
        break;
    }
  };

  // ✅ USAR LOADING EXTERNO SE FORNECIDO
  const showLoading = loading || isLoading;

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <i className="fas fa-map-marker-alt absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
        
        {/* ✅ CORREÇÃO CRÍTICA: Input com value tratado corretamente */}
        <Input
          id={id}
          placeholder={placeholder}
          value={typeof value === "string" ? value : value.label} // ✅ CORREÇÃO: Sempre string
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          className={`pl-10 pr-10 py-3 w-full ${className}`}
          data-testid={testId}
          autoComplete="off"
          aria-describedby={ariaDescribedby}
        />
        
        {showLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>
      
      {isOpen && filteredLocations.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {filteredLocations.map((location, index) => (
            <button
              key={location.id}
              type="button"
              className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-200 dark:border-gray-600 last:border-b-0 transition-colors focus:bg-gray-50 focus:outline-none"
              onClick={() => handleLocationClick(location)}
              data-testid={`suggestion-${index}`}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-0.5">
                  <i className={`${getLocationIcon(location.type)} ${getTypeColor(location.type)} w-4 h-4`}></i>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                    {location.name}
                    {location.relevance_rank !== undefined && location.relevance_rank <= 1 && (
                      <span className="ml-1 text-green-500 text-xs">•</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                    {locationsService.formatLocationName(location)}
                  </div>
                  <div className="flex items-center mt-1 space-x-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-foreground">
                      {getLocationTypeLabel(location.type)}
                    </span>
                    {location.district && location.district !== location.name && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                        {location.district}
                      </span>
                    )}
                    {location.province && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-700 text-blue-700 dark:text-blue-300">
                        {location.province}
                      </span>
                    )}
                  </div>
                </div>
                {location.lat && location.lng && (
                  <div className="flex-shrink-0 text-xs text-gray-400 dark:text-gray-500 text-right">
                    <div>{location.lat.toFixed(4)}</div>
                    <div>{location.lng.toFixed(4)}</div>
                  </div>
                )}
              </div>
            </button>
          ))}
          <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 text-center border-t">
            {filteredLocations.length} localidade(s) encontrada(s)
          </div>
        </div>
      )}

      {isOpen && filteredLocations.length === 0 && inputValue.length >= 2 && !showLoading && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg">
          <div className="px-4 py-3 text-gray-500 dark:text-gray-400 text-sm text-center">
            Nenhuma localização encontrada para "{inputValue}"
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationAutocomplete;