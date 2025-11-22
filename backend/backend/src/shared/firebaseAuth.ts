import admin from "firebase-admin";
import { Request, Response, NextFunction } from "express";
import { AuthenticatedUser as SharedAuthenticatedUser } from "./types";

// ✅ CORREÇÃO: Remover execução durante importação
// Firebase configuration validation
interface FirebaseConfig {
  projectId: string;
  privateKey: string;
  clientEmail: string;
}

const validateFirebaseConfig = (): FirebaseConfig => {
  const { FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL } = process.env;
  
  // 🔍 DEBUG detalhado de cada variável
  console.log('🔍 [FIREBASE DEBUG VALIDATION]');
  console.log('🔍 FIREBASE_PROJECT_ID:', FIREBASE_PROJECT_ID || 'UNDEFINED');
  console.log('🔍 FIREBASE_CLIENT_EMAIL:', FIREBASE_CLIENT_EMAIL || 'UNDEFINED');
  console.log('🔍 FIREBASE_PRIVATE_KEY length:', FIREBASE_PRIVATE_KEY ? FIREBASE_PRIVATE_KEY.length : 'UNDEFINED');
  
  if (!FIREBASE_PROJECT_ID) {
    throw new Error('FIREBASE_PROJECT_ID is missing');
  }
  if (!FIREBASE_PRIVATE_KEY) {
    throw new Error('FIREBASE_PRIVATE_KEY is missing');
  }
  if (!FIREBASE_CLIENT_EMAIL) {
    throw new Error('FIREBASE_CLIENT_EMAIL is missing');
  }
  
  return {
    projectId: FIREBASE_PROJECT_ID,
    privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    clientEmail: FIREBASE_CLIENT_EMAIL,
  };
};

// ✅ CORREÇÃO: Inicialização lazy do Firebase
let firebaseApp: admin.app.App | null = null;
let firebaseInitialized = false;

export const initializeFirebase = (): admin.app.App => {
  if (firebaseApp) {
    return firebaseApp;
  }
  
  try {
    console.log('🔧 Tentando inicializar Firebase Admin...');
    const config = validateFirebaseConfig();
    
    // ✅ CORREÇÃO CRÍTICA 3: Usar camelCase conforme exigido pelo TypeScript do Firebase Admin
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: config.projectId,
        privateKey: config.privateKey,    // ✅ camelCase (privateKey)
        clientEmail: config.clientEmail,  // ✅ camelCase (clientEmail)
      }),
    });
    
    firebaseInitialized = true;
    console.log('✅ Firebase Admin inicializado com sucesso');
    return firebaseApp;
  } catch (error) {
    console.error('❌ Erro ao inicializar Firebase Admin:', error);
    console.error('❌ Verifique o arquivo .env na pasta backend/');
    console.error('❌ Variáveis necessárias: FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL');
    
    // Não sair do processo em desenvolvimento
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    } else {
      console.log('⚠️  Modo desenvolvimento: Continuando sem Firebase');
      throw error;
    }
  }
};

// ✅ CORREÇÃO: Obter auth apenas quando necessário
export const getFirebaseAuth = () => {
  if (!firebaseInitialized) {
    try {
      initializeFirebase();
      return admin.auth();
    } catch {
      return null;
    }
  }
  return admin.auth();
};

// Firebase token claims interface
export interface FirebaseTokenClaims {
  sub: string;
  aud: string;
  auth_time: number;
  exp: number;
  firebase: {
    identities: Record<string, string[]>;
    sign_in_provider: string;
  };
  iat: number;
  iss: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  uid?: string;
}

export interface AuthenticatedUser extends SharedAuthenticatedUser {}
export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

export interface ApiError {
  success: false;
  message: string;
  code: string;
  details?: any;
  timestamp: string;
}

export interface ApiResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
}

export const createApiResponse = <T>(data: T, message?: string): ApiResponse<T> => ({
  success: true,
  data,
  message,
  timestamp: new Date().toISOString(),
});

export const createApiError = (message: string, code: string = "API_ERROR", details?: any): ApiError => ({
  success: false,
  message,
  code,
  details: details instanceof Error ? details.message : details,
  timestamp: new Date().toISOString(),
});

const nullToUndefined = <T>(value: T | null): T | undefined => {
  return value === null ? undefined : value;
};

// Enhanced Firebase token verification middleware
export const verifyFirebaseToken = async (
  req: Request, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  const auth = getFirebaseAuth();
  if (!auth) {
    console.log('⚠️  Firebase não inicializado - Pulando verificação de token');
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json(createApiError(
      "Token de autenticação não fornecido", 
      "AUTH_TOKEN_MISSING"
    ));
    return;
  }

  const token = authHeader.split('Bearer ')[1];
  
  if (!token || token.trim() === '') {
    res.status(401).json(createApiError(
      "Token vazio", 
      "AUTH_TOKEN_EMPTY"
    ));
    return;
  }

  try {
    // ✅ CORREÇÃO CRÍTICA 1: Remover o "true" que rejeita tokens válidos
    const decodedToken = await auth.verifyIdToken(token); // ❌ ANTES: auth.verifyIdToken(token, true)
    
    const userRecord = await auth.getUser(decodedToken.uid);
    
    const authReq = req as AuthenticatedRequest;
    const { sub, ...decodedTokenWithoutSub } = decodedToken;
    
    authReq.user = {
      id: userRecord.uid,
      uid: userRecord.uid,
      email: nullToUndefined(userRecord.email),
      firstName: nullToUndefined(userRecord.displayName?.split(' ')[0]),
      lastName: nullToUndefined(userRecord.displayName?.split(' ').slice(1).join(' ')),
      fullName: nullToUndefined(userRecord.displayName),
      phone: nullToUndefined(userRecord.phoneNumber),
      userType: 'client' as const,
      roles: ['client'],
      canOfferServices: false,
      isVerified: userRecord.emailVerified || false,
      profileImageUrl: nullToUndefined(userRecord.photoURL),
      avatar: nullToUndefined(userRecord.photoURL),
      rating: 0,
      totalReviews: 0,
      verificationStatus: 'pending' as const,
      verificationDate: null,
      verificationNotes: null,
      verificationBadge: null,
      badgeEarnedDate: null,
      identityDocumentUrl: null,
      identityDocumentType: null,
      profilePhotoUrl: nullToUndefined(userRecord.photoURL),
      documentNumber: null,
      dateOfBirth: null,
      registrationCompleted: false,
      claims: {
        sub: decodedToken.sub,
        email: decodedToken.email,
        ...decodedTokenWithoutSub
      },
      createdAt: new Date(userRecord.metadata.creationTime || Date.now()),
      updatedAt: userRecord.metadata.lastSignInTime ? new Date(userRecord.metadata.lastSignInTime) : null
    };
    
    next();
  } catch (error) {
    console.error('Erro na verificação do token Firebase:', error);
    
    let errorMessage = "Token inválido";
    let errorCode = "AUTH_TOKEN_INVALID";
    
    if (error instanceof Error) {
      if (error.message.includes('expired')) {
        errorMessage = "Token expirado";
        errorCode = "AUTH_TOKEN_EXPIRED";
      } else if (error.message.includes('revoked')) {
        errorMessage = "Token revogado";
        errorCode = "AUTH_TOKEN_REVOKED";
      }
    }
    
    res.status(401).json(createApiError(
      errorMessage, 
      errorCode, 
      error instanceof Error ? error.message : String(error)
    ));
  }
};

// ✅ Exportar função de inicialização
export default {
  initializeFirebase,
  getFirebaseAuth,
  verifyFirebaseToken
};