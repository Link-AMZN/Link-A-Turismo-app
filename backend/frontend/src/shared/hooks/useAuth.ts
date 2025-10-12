import { useState, useEffect } from 'react';
import { type User } from 'firebase/auth';
import { 
  onAuthStateChange, 
  signInWithGoogle, 
  signInWithEmail,
  signUpWithEmail,
  signOutUser, 
  resetPassword,
  handleRedirectResult,
  isFirebaseConfigured 
} from '../lib/firebaseConfig';

// Defina um tipo de usuário personalizado
export interface AppUser {
  id: string;
  name?: string;
  email?: string | null;
  // ✅ ADICIONADO: Método getIdToken para compatibilidade
  getIdToken: () => Promise<string>;
}

interface AuthState {
  firebaseUser: User | null; // 🔹 original do Firebase
  appUser: AppUser | null;   // 🔹 seu tipo customizado
  loading: boolean;
  error: string | null;
  token: string | null; // ⭐⭐ NOVA PROPRIEDADE ADICIONADA
}

interface UseAuthReturn extends AuthState {
  user: AppUser | null; // 🔹 compatível com código existente
  signIn: () => Promise<void>;
  signInEmail: (email: string, password: string) => Promise<void>;
  signUpEmail: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

export const useAuth = (): UseAuthReturn => {
  const [authState, setAuthState] = useState<AuthState>({
    firebaseUser: null,
    appUser: null,
    loading: true,
    error: null,
    token: null, // ⭐⭐ INICIALIZADO COMO NULL
  });

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setAuthState({
        firebaseUser: null,
        appUser: null,
        loading: false,
        error: 'Firebase not configured',
        token: null,
      });
      return;
    }

    let mounted = true;

    // Handle redirect result on component mount
    const handleInitialRedirect = async () => {
      try {
        await handleRedirectResult();
      } catch (error) {
        if (mounted) {
          setAuthState(prev => ({
            ...prev,
            error: error instanceof Error ? error.message : 'Redirect handling failed',
          }));
        }
      }
    };

    handleInitialRedirect();

    // ✅ CORREÇÃO: Listen to auth state changes com persistência do token
    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      if (mounted) {
        try {
          if (firebaseUser) {
            // 🔥 OBTER E SALVAR TOKEN NO LOCALSTORAGE
            const token = await firebaseUser.getIdToken();
            localStorage.setItem('token', token);
            
            // 🔥 SALVAR INFORMAÇÕES DO USUÁRIO
            localStorage.setItem('user', JSON.stringify({
              id: firebaseUser.uid,
              email: firebaseUser.email,
              name: firebaseUser.displayName
            }));
            
            console.log('✅ Token salvo no localStorage:', token.substring(0, 20) + '...');
            
            // ✅ CORREÇÃO: Criar AppUser com método getIdToken
            const appUser: AppUser = {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || undefined,
              email: firebaseUser.email,
              // ✅ ADICIONADO: Método getIdToken que delega para o firebaseUser
              getIdToken: () => firebaseUser.getIdToken()
            };
            
            // ⭐⭐ ATUALIZAR STATE COM TOKEN
            setAuthState({
              firebaseUser,
              appUser: appUser,
              loading: false,
              error: null,
              token: token, // ⭐⭐ TOKEN ADICIONADO AO STATE
            });
          } else {
            // 🔥 LIMPAR DADOS AO FAZER LOGOUT
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            console.log('✅ Dados de autenticação removidos do localStorage');
            
            // ⭐⭐ ATUALIZAR STATE SEM TOKEN
            setAuthState({
              firebaseUser: null,
              appUser: null,
              loading: false,
              error: null,
              token: null, // ⭐⭐ TOKEN DEFINIDO COMO NULL
            });
          }
        } catch (error) {
          console.error('Erro ao processar mudança de autenticação:', error);
          if (mounted) {
            setAuthState({
              firebaseUser: null,
              appUser: null,
              loading: false,
              error: 'Erro ao processar autenticação',
              token: null,
            });
          }
        }
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const signIn = async (): Promise<void> => {
    if (!isFirebaseConfigured) {
      throw new Error('Firebase not configured');
    }

    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      await signInWithGoogle();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign in failed';
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      throw error;
    }
  };

  const signInEmail = async (email: string, password: string): Promise<void> => {
    if (!isFirebaseConfigured) {
      throw new Error('Firebase not configured');
    }

    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      await signInWithEmail(email, password);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Email sign in failed';
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      throw error;
    }
  };

  const signUpEmail = async (email: string, password: string): Promise<void> => {
    if (!isFirebaseConfigured) {
      throw new Error('Firebase not configured');
    }

    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      await signUpWithEmail(email, password);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Email sign up failed';
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      throw error;
    }
  };

  const resetPasswordEmail = async (email: string): Promise<void> => {
    if (!isFirebaseConfigured) {
      throw new Error('Firebase not configured');
    }

    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      await resetPassword(email);
      setAuthState(prev => ({ ...prev, loading: false }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Password reset failed';
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      throw error;
    }
  };

  // ✅ CORREÇÃO: Atualizar signOut para limpar localStorage
  const signOut = async (): Promise<void> => {
    if (!isFirebaseConfigured) {
      throw new Error('Firebase not configured');
    }

    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      await signOutUser();
      // 🔥 GARANTIR QUE LOCALSTORAGE SEJA LIMPO
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Force clear the auth state immediately
      setAuthState({
        firebaseUser: null,
        appUser: null,
        loading: false,
        error: null,
        token: null, // ⭐⭐ TOKEN DEFINIDO COMO NULL NO LOGOUT
      });
      
      console.log('✅ Logout realizado e localStorage limpo');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign out failed';
      setAuthState({
        firebaseUser: null,
        appUser: null,
        loading: false,
        error: errorMessage,
        token: null,
      });
      throw error;
    }
  };

  return {
    ...authState,
    user: authState.appUser, // mantém compatibilidade
    signIn,
    signInEmail,
    signUpEmail,
    resetPassword: resetPasswordEmail,
    signOut,
    isAuthenticated: !!authState.appUser,
  };
};

export default useAuth;