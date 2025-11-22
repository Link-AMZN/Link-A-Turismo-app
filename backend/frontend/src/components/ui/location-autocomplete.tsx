import { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Loader2 } from 'lucide-react';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { locationsService, LocationSuggestion } from '../../services/locationsService';

// ✅ NOVA INTERFACE para o objeto de localização
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

interface LocationAutocompleteProps {
  value: string | LocationOption; // ✅ CORREÇÃO: value agora aceita string OU objeto
  onChange: (location: LocationOption) => void;
  onSelect?: (suggestion: LocationSuggestion) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  suggestions?: LocationSuggestion[];
  id?: string;
  'data-testid'?: string;
  "aria-describedby"?: string;
}

export function LocationAutocomplete({ 
  value, 
  onChange, 
  onSelect,
  placeholder = "Digite uma cidade...", 
  className = "",
  disabled = false,
  loading = false,
  suggestions = [],
  id,
  'data-testid': dataTestId = "input-location",
  "aria-describedby": ariaDescribedby
}: LocationAutocompleteProps) {
  const [internalSuggestions, setInternalSuggestions] = useState<LocationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [hasExternalSuggestions, setHasExternalSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // ✅ CORREÇÃO CRÍTICA: transformar value em texto SEMPRE
  const textValue =
    typeof value === "string" ? value : value?.label ?? "";

  // ✅ CORREÇÃO: Controlar se estamos usando sugestões externas
  useEffect(() => {
    const hasExtSuggestions = suggestions.length > 0;
    setHasExternalSuggestions(hasExtSuggestions);
    
    if (hasExtSuggestions) {
      setInternalSuggestions(suggestions);
      if (textValue.length >= 2) {
        setShowSuggestions(true);
      }
    }
  }, [suggestions, textValue]);

  // ✅ CORREÇÃO: Buscar sugestões apenas se não houver sugestões externas
  const fetchSuggestions = async (query: string) => {
    // Se suggestions são fornecidas externamente, não buscar
    if (hasExternalSuggestions) return;

    if (query.length < 2) {
      setInternalSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoading(true);
    try {
      const results = await locationsService.searchSuggestions(query, 8);
      setInternalSuggestions(results);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Failed to fetch location suggestions:', error);
      setInternalSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ CORREÇÃO: Debounced search - apenas se não houver sugestões externas
  useEffect(() => {
    if (hasExternalSuggestions) return;

    const timer = setTimeout(() => {
      if (textValue && textValue.length >= 2) {
        fetchSuggestions(textValue);
      } else {
        setInternalSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [textValue, hasExternalSuggestions]);

  // ✅ CORREÇÃO CRÍTICA: Handle input change - SEMPRE gerar LocationOption válido
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const label = e.target.value;

    // ✅ CORREÇÃO: Criar LocationOption básico para digitação livre
    onChange({
      label,
      city: "",
      district: "",
      province: "",
    });

    setSelectedIndex(-1);
    
    // Mostrar sugestões se houver e o input tiver pelo menos 2 caracteres
    if (label.length >= 2) {
      const hasSuggestions = hasExternalSuggestions ? suggestions.length > 0 : internalSuggestions.length > 0;
      if (hasSuggestions) {
        setShowSuggestions(true);
      }
    } else {
      setShowSuggestions(false);
    }
  };

  // ✅ CORREÇÃO CRÍTICA: Handle suggestion selection - AGORA RETORNA LocationOption
  const handleSuggestionSelect = (suggestion: LocationSuggestion) => {
    const displayName = locationsService.formatLocationName(suggestion);
    
    console.log('📍 [LocationAutocomplete] Selecionado:', {
      name: displayName,
      province: suggestion.province,
      fullData: suggestion
    });
    
    // ✅ CORREÇÃO: Criar LocationOption completo
    const locationOption: LocationOption = {
      label: displayName,
      city: suggestion.name, // Usar o nome principal como cidade
      district: suggestion.district,
      province: suggestion.province,
      id: suggestion.id,
      lat: suggestion.lat,
      lng: suggestion.lng,
      type: suggestion.type
    };
    
    // ✅ CORREÇÃO: Chamar onChange com LocationOption
    onChange(locationOption);
    
    // ✅ CORREÇÃO: Chamar onSelect SEPARADAMENTE para compatibilidade
    if (onSelect) {
      console.log('📍 [LocationAutocomplete] Chamando onSelect com:', suggestion);
      onSelect(suggestion);
    }
    
    setShowSuggestions(false);
    setSelectedIndex(-1);
    inputRef.current?.blur();
  };

  // ✅ CORREÇÃO: Handle input focus
  const handleInputFocus = () => {
    const hasSuggestions = hasExternalSuggestions ? suggestions.length > 0 : internalSuggestions.length > 0;
    if (hasSuggestions && textValue.length >= 2) {
      setShowSuggestions(true);
    }
  };

  // ✅ CORREÇÃO: Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const currentSuggestions = hasExternalSuggestions ? suggestions : internalSuggestions;
    
    if (!showSuggestions || currentSuggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < currentSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < currentSuggestions.length) {
          handleSuggestionSelect(currentSuggestions[selectedIndex]);
        } else if (currentSuggestions.length === 1) {
          // ✅ CORREÇÃO: Se há apenas uma sugestão, selecionar automaticamente
          handleSuggestionSelect(currentSuggestions[0]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
      case 'Tab':
        // ✅ CORREÇÃO: Permitir tab para navegação normal
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // ✅ CORREÇÃO: Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current &&
        suggestionsRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ✅ CORREÇÃO: Scroll para sugestão selecionada
  useEffect(() => {
    if (selectedIndex >= 0 && suggestionsRef.current) {
      const selectedElement = suggestionsRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [selectedIndex]);

  // ✅ CORREÇÃO: Get type display name
  const getTypeDisplayName = (type: string): string => {
    const typeMap: { [key: string]: string } = {
      'city': 'Cidade',
      'town': 'Vila', 
      'village': 'Aldeia',
      'capital': 'Capital',
      'district': 'Distrito',
      'transport_hub': 'Transporte',
      'landmark': 'Ponto de Referência',
      'beach': 'Praia',
      'neighborhood': 'Bairro',
      'airport': 'Aeroporto',
      'bus_station': 'Terminal'
    };
    return typeMap[type] || type;
  };

  // ✅ CORREÇÃO: Get type icon color
  const getTypeColor = (type: string): string => {
    const colorMap: { [key: string]: string } = {
      'city': 'text-green-600',
      'town': 'text-blue-600',
      'village': 'text-gray-600',
      'capital': 'text-purple-600',
      'district': 'text-orange-600',
      'transport_hub': 'text-red-600',
      'landmark': 'text-yellow-600',
      'beach': 'text-cyan-600',
      'neighborhood': 'text-indigo-600',
      'airport': 'text-pink-600',
      'bus_station': 'text-teal-600'
    };
    return colorMap[type] || 'text-gray-500';
  };

  // ✅ CORREÇÃO: Get type background color para badges
  const getTypeBackgroundColor = (type: string): string => {
    const colorMap: { [key: string]: string } = {
      'city': 'bg-green-100 text-green-800',
      'town': 'bg-blue-100 text-blue-800',
      'village': 'bg-gray-100 text-gray-800',
      'capital': 'bg-purple-100 text-purple-800',
      'district': 'bg-orange-100 text-orange-800',
      'transport_hub': 'bg-red-100 text-red-800',
      'landmark': 'bg-yellow-100 text-yellow-800',
      'beach': 'bg-cyan-100 text-cyan-800',
      'neighborhood': 'bg-indigo-100 text-indigo-800'
    };
    return colorMap[type] || 'bg-gray-100 text-gray-800';
  };

  // ✅ CORREÇÃO: Loading state
  const showLoading = loading || isLoading;
  
  // ✅ CORREÇÃO: Sugestões atuais
  const currentSuggestions = hasExternalSuggestions ? suggestions : internalSuggestions;
  
  // ✅ CORREÇÃO: Mostrar sugestões apenas se há algo para mostrar
  const shouldShowSuggestions = showSuggestions && currentSuggestions.length > 0 && textValue.length >= 2;

  return (
    <div className={`relative w-full ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          ref={inputRef}
          id={id}
          type="text"
          value={textValue} // ✅ CORREÇÃO CRÍTICA: SEMPRE STRING
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full pl-10 pr-10"
          data-testid={dataTestId}
          aria-autocomplete="list"
          aria-expanded={shouldShowSuggestions}
          aria-haspopup="listbox"
          aria-controls="location-suggestions"
          aria-describedby={ariaDescribedby}
        />
        {showLoading && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 animate-spin" />
        )}
      </div>

      {shouldShowSuggestions && (
        <div
          ref={suggestionsRef}
          id="location-suggestions"
          role="listbox"
          aria-label="Sugestões de localização"
          className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto"
          data-testid="suggestions-list"
        >
          {currentSuggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.id}-${index}`}
              type="button"
              role="option"
              aria-selected={index === selectedIndex}
              onClick={() => handleSuggestionSelect(suggestion)}
              className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 focus:bg-gray-50 dark:focus:bg-gray-700 focus:outline-none border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors duration-150 ${
                index === selectedIndex ? 'bg-gray-50 dark:bg-gray-700' : ''
              }`}
              data-testid={`suggestion-${suggestion.id}`}
            >
              <div className="flex items-center space-x-3">
                <MapPin className={`h-4 w-4 ${getTypeColor(suggestion.type)} flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                    {suggestion.name}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-1">
                    <span>{suggestion.district}</span>
                    <span className="text-gray-300">•</span>
                    <span className="font-medium text-blue-600 dark:text-blue-400">
                      {suggestion.province}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-xs px-2 py-1 rounded-full ${getTypeBackgroundColor(suggestion.type)} capitalize`}>
                    {getTypeDisplayName(suggestion.type)}
                  </span>
                  {suggestion.relevance_rank !== undefined && suggestion.relevance_rank <= 1 && (
                    <span className="text-xs text-green-600 font-medium">Relevante</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {showSuggestions && currentSuggestions.length === 0 && textValue.length >= 2 && !showLoading && (
        <div 
          className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg p-4"
          data-testid="no-suggestions-message"
        >
          <div className="text-gray-500 dark:text-gray-400 text-sm text-center">
            Nenhuma localização encontrada para "{textValue}"
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-500 text-center mt-1">
            Tente buscar por cidade, distrito ou ponto de referência
          </div>
        </div>
      )}
    </div>
  );
}