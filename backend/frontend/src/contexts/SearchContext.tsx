import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { Accommodation, SearchFilters } from '../shared/types/accommodation';

// Action types como constantes para evitar erros de digitação
export const SET_FILTERS = 'SET_FILTERS';
export const SET_RESULTS = 'SET_RESULTS';
export const SET_LOADING = 'SET_LOADING';
export const SET_ERROR = 'SET_ERROR';

interface SearchState {
  filters: SearchFilters;
  results: Accommodation[];
  loading: boolean;
  error: string | null;
}

// Usando Partial<SearchFilters> para permitir atualizações parciais
type SearchAction =
  | { type: typeof SET_FILTERS; payload: Partial<SearchFilters> }
  | { type: typeof SET_RESULTS; payload: Accommodation[] }
  | { type: typeof SET_LOADING; payload: boolean }
  | { type: typeof SET_ERROR; payload: string | null };

const initialState: SearchState = {
  filters: {
    address: '',
    checkIn: '',
    checkOut: '',
    guests: 2,
    isAvailable: true,
  },
  results: [],
  loading: false,
  error: null,
};

const searchReducer = (state: SearchState, action: SearchAction): SearchState => {
  switch (action.type) {
    case SET_FILTERS:
      return { 
        ...state, 
        filters: { ...state.filters, ...action.payload } 
      };
    case SET_RESULTS:
      return { ...state, results: action.payload };
    case SET_LOADING:
      return { ...state, loading: action.payload };
    case SET_ERROR:
      return { ...state, error: action.payload };
    default:
      // Opção mais segura para actions desconhecidas
      throw new Error(`Unknown action type: ${(action as SearchAction).type}`);
  }
};

// Context tipado com undefined em vez de null para melhor segurança
const SearchContext = createContext<{
  state: SearchState;
  dispatch: React.Dispatch<SearchAction>;
} | undefined>(undefined);

export const SearchProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(searchReducer, initialState);

  return (
    <SearchContext.Provider value={{ state, dispatch }}>
      {children}
    </SearchContext.Provider>
  );
};

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};