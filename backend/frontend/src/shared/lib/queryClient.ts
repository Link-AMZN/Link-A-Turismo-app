import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { auth } from "./firebaseConfig";

// ✅ 1. Função auxiliar para headers de autenticação
async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  
  try {
    if (auth?.currentUser) {
      const token = await auth.currentUser.getIdToken();
      headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    // Silently fail - this is expected when user is not logged in
    console.debug('No auth token available:', error);
  }
  
  return headers;
}

// ✅ 2. API_BASE_URL consistente
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://link-a-backend-production.up.railway.app';

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // ✅ 6. Melhor tratamento de erro sem consumir o body
    const errorText = res.statusText || `HTTP ${res.status}`;
    throw new Error(errorText);
  }
}

// ✅ 1. apiRequest retorna JSON tipado diretamente
export async function apiRequest<T>(
  method: string,
  url: string,
  data?: unknown
): Promise<T> {
  // ✅ 5. Só adiciona Content-Type se houver body
  const headers: Record<string, string> = {};
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  // ✅ 3. Usar função auxiliar para auth
  const authHeaders = await getAuthHeaders();
  Object.assign(headers, authHeaders);

  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  
  console.log('🚀 Requisição Railway:', fullUrl);

  const res = await fetch(fullUrl, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);

  // ✅ 6. Tratar 204 No Content
  if (res.status === 204) {
    return {} as T;
  }

  return res.json() as Promise<T>;
}

type UnauthorizedBehavior = "returnNull" | "throw";

// ✅ CORREÇÃO: Usar interface para definir o tipo genérico corretamente
interface GetQueryFnOptions {
  on401: UnauthorizedBehavior;
}

// ✅ CORREÇÃO: Definir a função separadamente com genérico
function createQueryFn<T>({ on401 }: GetQueryFnOptions): QueryFunction<T> {
  return async ({ queryKey }) => {
    // ✅ 3. Usar função auxiliar para auth
    const headers = await getAuthHeaders();

    // ✅ 2. Tratamento seguro do queryKey
    let endpoint = '';
    let params: Record<string, string> = {};

    if (Array.isArray(queryKey)) {
      // Primeiro elemento é sempre o endpoint
      endpoint = String(queryKey[0]);
      
      // Segundo elemento pode ser params ou undefined
      if (queryKey[1] && typeof queryKey[1] === 'object') {
        params = queryKey[1] as Record<string, string>;
      }
    } else {
      endpoint = String(queryKey);
    }

    // ✅ 4. URL consistente com API_BASE_URL
    let fullUrl = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    
    // Adicionar parâmetros de query se existirem
    if (Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      fullUrl += `?${searchParams.toString()}`;
    }

    const res = await fetch(fullUrl, {
      headers,
      credentials: "include",
    });

    if (on401 === "returnNull" && res.status === 401) {
      return null as T;
    }

    await throwIfResNotOk(res);

    // ✅ 6. Tratar 204 No Content
    if (res.status === 204) {
      return {} as T;
    }

    return await res.json() as T;
  };
}

// ✅ CORREÇÃO: Exportar como getQueryFn mantendo a compatibilidade
export const getQueryFn = createQueryFn;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});