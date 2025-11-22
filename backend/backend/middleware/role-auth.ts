import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest, AuthenticatedUser } from '../shared/types';
import admin from 'firebase-admin';

// Defina os tipos de roles válidos
export type UserRole = 'client' | 'driver' | 'hotel_manager' | 'admin';

// ✅ CORREÇÃO: Array com todos os roles válidos para validação
const VALID_ROLES: UserRole[] = ['client', 'driver', 'hotel_manager', 'admin'];

// ✅ CORREÇÃO: Interface para garantir que roles sempre exista
interface AuthenticatedUserWithRoles extends AuthenticatedUser {
  roles: UserRole[];
}

// ✅ CORREÇÃO: Função auxiliar para validar e converter roles
const validateAndConvertRoles = (roles: any): UserRole[] => {
  if (!Array.isArray(roles)) {
    return process.env.NODE_ENV === 'development' 
      ? ['client', 'driver', 'hotel_manager'] 
      : ['client'];
  }
  
  // ✅ CORREÇÃO: Filtrar apenas os roles válidos e fazer type assertion
  return roles.filter((role): role is UserRole => 
    VALID_ROLES.includes(role as UserRole)
  );
};

// ✅ CORREÇÃO: Função auxiliar para obter roles com valor padrão
const getUserRoles = (user: AuthenticatedUser | undefined): UserRole[] => {
  if (!user?.roles) {
    return process.env.NODE_ENV === 'development' 
      ? ['client', 'driver', 'hotel_manager'] 
      : ['client'];
  }
  
  return validateAndConvertRoles(user.roles);
};

// ✅✅✅ CORREÇÃO CRÍTICA: Middleware que VALIDA REALMENTE o token Firebase COM VALIDAÇÕES DE JWT
export const verifyFirebaseToken = async (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
) => {
  // ✅ LOG: Início da verificação
  console.log('🛡️ [AUTH-MIDDLEWARE] Iniciando verificação de token...', {
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  try {
    const authHeader = req.headers.authorization;
    
    // ✅ LOG: Verificar header de autorização
    console.log('🔍 [AUTH-MIDDLEWARE] Header Authorization:', {
      present: !!authHeader,
      startsWithBearer: authHeader?.startsWith('Bearer ') ? 'YES' : 'NO',
      fullHeader: authHeader ? `${authHeader.substring(0, 50)}...` : 'NULL'
    });

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ [AUTH-MIDDLEWARE] Token não fornecido ou formato inválido');
      return res.status(401).json({ 
        success: false,
        error: 'Token de autenticação não fornecido',
        debug: {
          receivedHeader: authHeader || 'NULL',
          expectedFormat: 'Bearer <token>'
        }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // ✅✅✅ NOVAS VALIDAÇÕES: Token deve ser um JWT válido
    console.log('🔍 [AUTH-MIDDLEWARE] Token recebido:', {
      length: token.length,
      looksLikeJWT: token.length > 100, // JWT geralmente tem > 100 chars
      parts: token.split('.').length, // JWT tem 3 partes
      preview: token.substring(0, 30) + '...'
    });

    // ✅ DETECTAR TOKENS FALSOS/MUITO CURTOS
    if (token.length < 50) {
      console.log('❌ [AUTH-MIDDLEWARE] Token muito curto - provavelmente fake');
      return res.status(401).json({ 
        success: false,
        error: 'Token inválido - muito curto',
        debug: {
          tokenLength: token.length,
          expected: 'JWT com > 100 caracteres',
          received: token
        }
      });
    }

    // ✅ DETECTAR TOKENS COM PLACEHOLDERS
    if (token.includes('SEU_TOKEN') || token.includes('YOUR_TOKEN') || token.includes('TOKEN_AQUI')) {
      console.log('❌ [AUTH-MIDDLEWARE] Token contém placeholder - use token REAL');
      return res.status(401).json({ 
        success: false,
        error: 'Use um token REAL do Firebase, não placeholder',
        debug: { 
          received: 'TOKEN_PLACEHOLDER',
          message: 'Obtenha um token real fazendo login no frontend'
        }
      });
    }

    // ✅ VALIDAR ESTRUTURA JWT (deve ter 3 partes)
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      console.log('❌ [AUTH-MIDDLEWARE] Token não é um JWT válido - partes incorretas');
      return res.status(401).json({ 
        success: false,
        error: 'Token malformado - não é um JWT válido',
        debug: {
          parts: tokenParts.length,
          expected: 3,
          tokenPreview: token.substring(0, 50) + '...'
        }
      });
    }

    if (!token || token.trim() === '') {
      console.log('❌ [AUTH-MIDDLEWARE] Token vazio após limpeza');
      return res.status(401).json({ 
        success: false,
        error: 'Token vazio',
        debug: { tokenLength: token.length }
      });
    }

    // ✅ LOG: Verificar Firebase Admin
    console.log('🔍 [AUTH-MIDDLEWARE] Verificando Firebase Admin...', {
      appsCount: admin.apps.length,
      initialized: admin.apps.length > 0 ? 'YES' : 'NO'
    });

    if (admin.apps.length === 0) {
      console.error('❌ [AUTH-MIDDLEWARE] Firebase Admin não inicializado!');
      return res.status(500).json({ 
        success: false,
        error: 'Serviço de autenticação indisponível',
        debug: { 
          appsCount: 0,
          message: 'Firebase Admin SDK não foi inicializado corretamente'
        }
      });
    }

    console.log('🔍 [AUTH-MIDDLEWARE] Firebase Admin OK, validando token com Firebase...');

    // ✅✅✅ VALIDAÇÃO REAL DO TOKEN COM FIREBASE ADMIN SDK
    try {
      console.log('🔐 [AUTH-MIDDLEWARE] Chamando admin.auth().verifyIdToken()...');
      
      // ✅ CORREÇÃO: Adicionar timeout para evitar travamento
      const decodedToken = await Promise.race([
        admin.auth().verifyIdToken(token),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout na validação do token')), 10000)
        )
      ]) as any;
      
      // ✅ LOG: Token decodificado com sucesso
      console.log('✅ [AUTH-MIDDLEWARE] Token válido decodificado:', {
        uid: decodedToken.uid,
        email: decodedToken.email,
        issuedAt: new Date(decodedToken.iat * 1000).toISOString(),
        expiresAt: new Date(decodedToken.exp * 1000).toISOString(),
        authTime: decodedToken.auth_time ? new Date(decodedToken.auth_time * 1000).toISOString() : 'N/A',
        claims: {
          roles: decodedToken.roles || 'N/A',
          userType: decodedToken.userType || 'N/A'
        }
      });

      if (!decodedToken) {
        console.log('❌ [AUTH-MIDDLEWARE] Token inválido - decodedToken é null');
        return res.status(401).json({ 
          success: false,
          error: 'Token inválido',
          debug: { decodedToken: 'null' }
        });
      }

      // ✅ CORREÇÃO: Buscar informações completas do usuário no Firebase
      console.log('🔍 [AUTH-MIDDLEWARE] Buscando informações do usuário no Firebase...');
      const userRecord = await admin.auth().getUser(decodedToken.uid);
      
      console.log('✅ [AUTH-MIDDLEWARE] Usuário encontrado no Firebase:', {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName || 'N/A',
        emailVerified: userRecord.emailVerified,
        disabled: userRecord.disabled,
        providerData: userRecord.providerData.length > 0 ? 'YES' : 'NO'
      });

      // ✅✅✅ CORREÇÃO CRÍTICA: Criar objeto de usuário autenticado COM ID E ROLES FLEXÍVEIS
      // ✅ CORREÇÃO: Usar a função de validação para garantir tipos corretos
      const userRoles = validateAndConvertRoles(decodedToken.roles);

      const authenticatedUser: AuthenticatedUserWithRoles = {
        id: userRecord.uid, // ✅ CORREÇÃO CRÍTICA: Definir id baseado no UID
        uid: userRecord.uid,
        email: userRecord.email || '',
        roles: userRoles, // ✅ CORREÇÃO: Sempre será um array de UserRole válido
        userType: decodedToken.userType || 'client'
      };

      req.user = authenticatedUser;

      console.log('✅ [AUTH-MIDDLEWARE] Autenticação concluída com sucesso:', {
        user: authenticatedUser.email,
        id: authenticatedUser.id,
        roles: authenticatedUser.roles,
        userType: authenticatedUser.userType,
        path: req.path
      });

      next();

    } catch (firebaseError: any) {
      // ✅ LOG: Erro específico do Firebase
      console.error('❌ [AUTH-MIDDLEWARE] Erro na validação do token Firebase:', {
        code: firebaseError.code || 'UNKNOWN_ERROR',
        message: firebaseError.message,
        stack: firebaseError.stack,
        tokenPreview: token.substring(0, 30) + '...',
        tokenLength: token.length,
        tokenParts: token.split('.').length,
        looksLikeJWT: token.length > 100
      });

      let errorMessage = 'Falha na autenticação';
      let statusCode = 401;

      if (firebaseError.code === 'auth/id-token-expired') {
        errorMessage = 'Token expirado';
        console.log('❌ [AUTH-MIDDLEWARE] Token expirado');
      } else if (firebaseError.code === 'auth/id-token-revoked') {
        errorMessage = 'Token revogado';
        console.log('❌ [AUTH-MIDDLEWARE] Token revogado');
      } else if (firebaseError.code === 'auth/argument-error') {
        errorMessage = 'Token malformado ou inválido';
        console.log('❌ [AUTH-MIDDLEWARE] Token malformado - verifique se é um JWT válido');
      } else if (firebaseError.code === 'auth/invalid-id-token') {
        errorMessage = 'Token inválido';
        console.log('❌ [AUTH-MIDDLEWARE] Token inválido');
      } else if (firebaseError.code === 'auth/user-not-found') {
        errorMessage = 'Usuário não encontrado';
        statusCode = 404;
        console.log('❌ [AUTH-MIDDLEWARE] Usuário não encontrado no Firebase');
      } else if (firebaseError.code === 'auth/network-request-failed') {
        errorMessage = 'Erro de rede ao validar token';
        statusCode = 503;
        console.log('❌ [AUTH-MIDDLEWARE] Erro de rede');
      } else if (firebaseError.code === 'auth/app-not-authorized') {
        errorMessage = 'Aplicação não autorizada';
        console.log('❌ [AUTH-MIDDLEWARE] Aplicação não autorizada');
      } else if (firebaseError.message?.includes('Timeout')) {
        errorMessage = 'Timeout na validação do token';
        statusCode = 408;
        console.log('❌ [AUTH-MIDDLEWARE] Timeout na validação');
      } else {
        console.log('❌ [AUTH-MIDDLEWARE] Erro desconhecido do Firebase:', firebaseError.code || 'NO_CODE');
      }

      return res.status(statusCode).json({ 
        success: false,
        error: errorMessage,
        firebaseErrorCode: firebaseError.code || 'UNKNOWN',
        details: process.env.NODE_ENV === 'development' ? firebaseError.message : undefined,
        debug: {
          tokenLength: token.length,
          tokenParts: token.split('.').length,
          looksLikeJWT: token.length > 100,
          timestamp: new Date().toISOString(),
          suggestion: 'Verifique se o token foi obtido corretamente do Firebase Auth'
        }
      });
    }

  } catch (error: any) {
    // ✅ LOG: Erro geral no middleware
    console.error('🔥 [AUTH-MIDDLEWARE] Erro geral no middleware de autenticação:', {
      message: error.message,
      stack: error.stack,
      path: req.path,
      method: req.method
    });
    
    return res.status(500).json({ 
      success: false,
      error: 'Erro interno no servidor de autenticação',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ✅ CORREÇÃO: Função genérica para verificar roles com tratamento seguro
export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    console.log('🔐 [ROLE-MIDDLEWARE] Verificando roles...', {
      path: req.path,
      allowedRoles,
      user: req.user?.email || 'N/A'
    });

    if (!req.user) {
      console.log('❌ [ROLE-MIDDLEWARE] Usuário não autenticado');
      return res.status(401).json({ 
        success: false,
        error: 'Usuário não autenticado' 
      });
    }

    // ✅ CORREÇÃO: Usar função auxiliar para obter roles com valor padrão
    const userRoles = getUserRoles(req.user);
    const hasRequiredRole = userRoles.some(role => 
      allowedRoles.includes(role)
    );

    console.log('🔐 [ROLE-MIDDLEWARE] Resultado da verificação:', {
      userRoles,
      allowedRoles,
      hasRequiredRole,
      user: req.user.email
    });

    if (!hasRequiredRole) {
      console.log('❌ [ROLE-MIDDLEWARE] Acesso negado - roles insuficientes:', {
        user: req.user.email,
        userRoles,
        requiredRoles: allowedRoles
      });
      return res.status(403).json({ 
        success: false,
        error: `Acesso negado. Requer uma das seguintes roles: ${allowedRoles.join(', ')}`,
        userRoles: userRoles,
        requiredRoles: allowedRoles
      });
    }

    console.log('✅ [ROLE-MIDDLEWARE] Role verificada com sucesso:', {
      user: req.user.email,
      required: allowedRoles,
      hasAccess: true
    });

    next();
  };
};

// Roles específicas usando a função genérica
export const requireAdminRole = requireRole(['admin']);
export const requireClientRole = requireRole(['client']);
export const requireDriverRole = requireRole(['driver']);
export const requireHotelManagerRole = requireRole(['hotel_manager']);

// ✅✅✅ NOVO: Middleware para desenvolvimento que permite todas as operações
export const requireAuthOnly = (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
) => {
  console.log('🔓 [AUTH-ONLY] Verificando apenas autenticação (sem verificação de role)...', {
    path: req.path,
    user: req.user?.email || 'N/A'
  });

  if (!req.user) {
    console.log('❌ [AUTH-ONLY] Usuário não autenticado');
    return res.status(401).json({ 
      success: false,
      error: 'Usuário não autenticado' 
    });
  }

  console.log('✅ [AUTH-ONLY] Autenticação OK (sem verificação de role):', {
    user: req.user.email,
    roles: getUserRoles(req.user) // ✅ CORREÇÃO: Usar função auxiliar
  });

  next();
};

// ✅✅✅ NOVO: Middleware flexível para desenvolvimento
export const devRideCreation = (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('🚗 [DEV-RIDES] Modo desenvolvimento - permitindo criação de rides para qualquer usuário autenticado');
    // Em desenvolvimento, permite criar rides sem verificar role específica
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        error: 'Usuário não autenticado' 
      });
    }
    return next();
  }
  
  // Em produção, usa verificação normal de driver
  console.log('🚗 [PROD-RIDES] Modo produção - verificando role de driver');
  requireDriverRole(req, res, next);
};

// Função para autenticação combinada (token + role)
export const authenticate = (role: UserRole) => {
  console.log('🔐 [AUTH-COMBINED] Configurando autenticação combinada para role:', role);
  return [verifyFirebaseToken, requireRole([role])];
};

// Função para múltiplas roles
export const requireAnyRole = (roles: UserRole[]) => {
  console.log('🔐 [AUTH-ANY-ROLE] Configurando verificação para múltiplas roles:', roles);
  return requireRole(roles);
};

// ✅ CORREÇÃO: Função para verificar se é provider (driver ou hotel_manager)
export const requireProviderRole = (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
) => {
  console.log('🔐 [PROVIDER-MIDDLEWARE] Verificando role de provider...', {
    path: req.path,
    user: req.user?.email || 'N/A'
  });

  if (!req.user) {
    console.log('❌ [PROVIDER-MIDDLEWARE] Usuário não autenticado');
    return res.status(401).json({ 
      success: false,
      error: 'Usuário não autenticado' 
    });
  }

  // ✅ CORREÇÃO: Usar função auxiliar para obter roles
  const userRoles = getUserRoles(req.user);
  const isProvider = userRoles.some(role => 
    role === 'driver' || role === 'hotel_manager'
  );

  console.log('🔐 [PROVIDER-MIDDLEWARE] Resultado da verificação:', {
    userRoles,
    isProvider,
    user: req.user.email
  });
  
  if (!isProvider) {
    console.log('❌ [PROVIDER-MIDDLEWARE] Acesso negado - não é provider:', {
      user: req.user.email,
      userRoles
    });
    return res.status(403).json({ 
      success: false,
      error: 'Acesso negado. Requer role de provider (driver ou hotel_manager).',
      userRoles: userRoles
    });
  }

  console.log('✅ [PROVIDER-MIDDLEWARE] Provider role verificada com sucesso para:', req.user.email);
  next();
};

// ✅ CORREÇÃO: Middleware para desenvolvimento (opcional)
export const developmentAuth = (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
) => {
  console.log('🔧 [DEV-AUTH] Verificando modo desenvolvimento...', {
    nodeEnv: process.env.NODE_ENV,
    hasDevHeader: !!req.headers['x-dev-user']
  });

  if (process.env.NODE_ENV === 'development') {
    // Para desenvolvimento, permite simular diferentes usuários
    const devUserHeader = req.headers['x-dev-user'];
    
    if (devUserHeader) {
      try {
        const devUser = JSON.parse(devUserHeader as string);
        console.log('🔧 [DEV-AUTH] Usando usuário de desenvolvimento:', devUser);
        
        // ✅ CORREÇÃO: Usar função de validação para garantir tipos corretos
        const devRoles = validateAndConvertRoles(devUser.roles);
        
        req.user = {
          id: devUser.id || 'dev-user-id',
          uid: devUser.uid || 'dev-firebase-uid',
          email: devUser.email || 'dev@example.com',
          roles: devRoles, // ✅ CORREÇÃO: Sempre será um array de UserRole válido
          userType: devUser.userType || 'driver'
        };
        
        console.log('🔧 [DEV-AUTH] Autenticação de desenvolvimento configurada:', {
          user: req.user.email,
          roles: req.user.roles,
          path: req.path
        });
        
        return next();
      } catch (parseError) {
        console.error('❌ [DEV-AUTH] Erro ao parsear header x-dev-user:', parseError);
      }
    }
  }
  
  console.log('🔧 [DEV-AUTH] Usando autenticação normal do Firebase');
  // Em produção ou sem header de dev, usa autenticação normal
  verifyFirebaseToken(req, res, next);
};

// ✅ NOVO: Middleware para debug de autenticação
export const debugAuth = (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
) => {
  console.log('🐛 [AUTH-DEBUG] Debug completo da requisição:', {
    path: req.path,
    method: req.method,
    headers: {
      authorization: req.headers.authorization ? 'PRESENT' : 'MISSING',
      contentType: req.headers['content-type'],
      userAgent: req.headers['user-agent']
    },
    bodyKeys: req.body ? Object.keys(req.body) : 'NO_BODY',
    query: req.query,
    timestamp: new Date().toISOString()
  });

  // Chama o middleware normal
  verifyFirebaseToken(req, res, next);
};

// ✅ NOVO: Função auxiliar para validar token manualmente (para testes)
export const validateTokenManually = async (token: string) => {
  try {
    console.log('🧪 [TOKEN-VALIDATION] Validando token manualmente...');
    
    if (!token || token.length < 50) {
      return { valid: false, error: 'Token muito curto' };
    }
    
    if (token.split('.').length !== 3) {
      return { valid: false, error: 'Token não é um JWT válido' };
    }
    
    const decoded = await admin.auth().verifyIdToken(token);
    return { valid: true, decoded };
    
  } catch (error: any) {
    return { valid: false, error: error.message, code: error.code };
  }
};

// ✅✅✅ NOVO: Middleware para garantir que user tenha id (SOLUÇÃO TEMPORÁRIA)
export const ensureUserId = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  console.log('🆔 [ENSURE-USER-ID] Verificando propriedade id do usuário...');
  
  if (!req.user) {
    console.log('❌ [ENSURE-USER-ID] req.user não existe');
    return res.status(401).json({ message: 'Usuário não autenticado' });
  }
  
  console.log('📋 [ENSURE-USER-ID] req.user atual:', {
    hasId: !!req.user.id,
    hasUid: !!(req.user as any).uid,
    email: req.user.email,
    allKeys: Object.keys(req.user)
  });
  
  // ✅ SE não tem id mas tem uid, copiar uid para id
  if (!req.user.id && (req.user as any).uid) {
    console.log('🔄 [ENSURE-USER-ID] Copiando uid para id');
    req.user.id = (req.user as any).uid;
  }
  
  // ✅ SE ainda não tem id, usar email como fallback (apenas para debug)
  if (!req.user.id) {
    console.log('⚠️ [ENSURE-USER-ID] Usando email como ID fallback');
    req.user.id = `email:${req.user.email}`;
  }
  
  console.log('✅ [ENSURE-USER-ID] Usuário final:', {
    id: req.user.id,
    email: req.user.email
  });
  
  next();
};

// ✅✅✅ NOVO: Middleware para desenvolvimento que simula admin
export const simulateAdmin = (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('👑 [SIMULATE-ADMIN] Simulando role de admin para desenvolvimento');
    
    if (req.user) {
      // ✅ CORREÇÃO: Usar função auxiliar para obter roles e garantir que é um array
      const currentRoles = getUserRoles(req.user);
      
      // Adiciona role de admin temporariamente se ainda não tiver
      if (!currentRoles.includes('admin')) {
        const updatedRoles = [...currentRoles, 'admin'];
        req.user.roles = updatedRoles;
        console.log('✅ [SIMULATE-ADMIN] Role de admin adicionada:', updatedRoles);
      }
    }
  }
  
  next();
};

// ✅✅✅ NOVO: Exportar todas as funções úteis para testes
export const authUtils = {
  createTestUser: (roles: UserRole[] = ['client', 'driver']): AuthenticatedUserWithRoles => {
    return {
      id: 'test-user-id',
      uid: 'test-firebase-uid', 
      email: 'test@example.com',
      roles, // ✅ CORREÇÃO: Já é um array garantido
      userType: roles.includes('driver') ? 'driver' : 'client'
    };
  },
  
  hasRole: (user: AuthenticatedUser, role: UserRole) => {
    // ✅ CORREÇÃO: Usar função auxiliar para obter roles
    return getUserRoles(user).includes(role);
  },
  
  hasAnyRole: (user: AuthenticatedUser, roles: UserRole[]) => {
    // ✅ CORREÇÃO: Usar função auxiliar para obter roles
    return getUserRoles(user).some(userRole => roles.includes(userRole));
  }
};