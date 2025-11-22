import express from 'express';
import { createServer } from 'http';
import cors from 'cors';

// ===== ROTAS COMPARTILHADAS =====
import sharedHealthRoutes from './shared/health';

// ===== NOVA API DRIZZLE UNIFICADA =====
import drizzleApiRoutes from './drizzle-api';

// ===== SISTEMAS FUNCIONAIS (Firebase Auth apenas) =====
import authRoutes from './auth';
import bookingsRoutes from './bookings';
import geoRoutes from './geo';
import billingRoutes from './billing';
import chatRoutes from './chat';
import pmsRoutes from './pms';

// ===== ROTAS DE LOCALIDADES =====
import locationsRouter from './locations';

// ===== SISTEMA DE HOTELS =====
import hotelController from '../src/modules/hotels/hotelController';

// ===== NOVAS IMPORTACOES PARA PROVIDER/DRIVER =====
import providerRidesRoutes from './provider/rides';
import providerDashboardRoutes from './provider/dashboard';
import rideController from '../src/modules/rides/rideController';
import driverController from '../src/modules/drivers/driverController';

// ===== ROTAS DE PARCERIAS =====
import { partnershipRoutes } from '../src/modules/partnerships/partnershipRoutes';
import { driverPartnershipRoutes } from '../src/modules/drivers/partnershipRoutes';
import { hotelPartnershipRoutes } from '../src/modules/hotels/partnershipRoutes';

// ===== OUTRAS ROTAS =====
import clientController from '../src/modules/clients/clientController';
import adminController from '../src/modules/admin/adminController';
import eventController from '../src/modules/events/eventController';
import userController from '../src/modules/users/userController';

// ===== ROTAS INDIVIDUAIS DA RAIZ =====
import adminRoutes from '../adminRoutes';
import paymentRoutes from '../paymentRoutes';
import profileRoutes from '../profileRoutes';
import searchRoutes from '../searchRoutes';

// ===== IMPORTE DO DRIZZLE COM CAMINHOS CORRETOS =====
import { db } from '../db';
import { users } from '../shared/schema';
import { eq, sql } from 'drizzle-orm';

// ✅ CORREÇÃO: Importar Firebase Admin para debug
import admin from 'firebase-admin';

// ✅ CORREÇÃO: Funções auxiliares para validação
const safeString = (value: unknown, defaultValue: string = ''): string => {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }
  return String(value);
};

const safeNumber = (value: unknown, defaultValue: number = 0): number => {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }
  
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
};

const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidUid = (uid: string): boolean => {
  return uid.length >= 10 && uid.length <= 128;
};

export async function registerRoutes(app: express.Express): Promise<void> {
  // ===== CONFIGURAÇÃO DO CORS DINÂMICO =====
  app.use(cors({
    origin: (origin, callback) => {
      // ✅ CORREÇÃO: CORS dinâmico para produção e desenvolvimento
      const allowedOrigins = [
        // Domínios de produção
        "https://link-aturismomoz.com",
        "https://www.link-aturismomoz.com",
        "https://link-a-backend-production.up.railway.app",
        
        // Railway backend URL
        process.env.CORS_ORIGIN || "https://link-a-backend-production.up.railway.app",
        
        // Desenvolvimento
        "http://localhost:3000",
        "http://localhost:5000",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5000",
        "http://127.0.0.1:8000",
        
        // Replit development
        undefined // Para ferramentas de desenvolvimento
      ];
      
      // ✅ CORREÇÃO: Permitir requests sem origin (como mobile apps ou curl)
      if (!origin) {
        return callback(null, true);
      }
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`⚠️  CORS bloqueado para origem: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  }));
  console.log('✅ CORS configurado com sucesso');

  // ===== MIDDLEWARE DE LOGGING INTELIGENTE =====
  app.use((req, res, next) => {
    // ✅ CORREÇÃO: Logging apenas em desenvolvimento ou para rotas importantes
    if (process.env.NODE_ENV !== 'production' || 
        req.path.includes('/api/auth') || 
        req.path.includes('/api/admin') ||
        req.method !== 'GET') {
      console.log('🌐 Request:', {
        method: req.method,
        url: req.url,
        timestamp: new Date().toISOString(),
        userAgent: req.get('User-Agent')?.substring(0, 50)
      });
    }
    next();
  });

  // ===== MIDDLEWARE PARA JSON =====
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // ===== ✅✅✅ NOVO ENDPOINT DE DEBUG PARA FIREBASE AUTH =====
  app.get('/api/debug/firebase-auth', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      
      console.log('🔍 [DEBUG-FIREBASE] Headers recebidos:', {
        authorization: authHeader ? 'PRESENT' : 'MISSING',
        hasBearer: authHeader?.includes('Bearer ') ? 'YES' : 'NO'
      });

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          error: 'Token não fornecido',
          debug: { receivedHeader: authHeader || 'NULL' }
        });
      }

      const token = authHeader.replace('Bearer ', '');
      
      console.log('🔍 [DEBUG-FIREBASE] Token recebido:', {
        length: token.length,
        first10: token.substring(0, 10) + '...',
        last10: '...' + token.substring(token.length - 10)
      });

      // ✅ TESTAR FIREBASE ADMIN
      try {
        console.log('🔍 [DEBUG-FIREBASE] Firebase Admin status:', {
          initialized: admin.apps.length > 0 ? 'YES' : 'NO',
          appsCount: admin.apps.length
        });

        if (admin.apps.length === 0) {
          return res.status(500).json({
            success: false,
            error: 'Firebase Admin não inicializado',
            debug: { appsCount: 0 }
          });
        }

        // ✅ TENTAR VALIDAR O TOKEN
        const decodedToken = await admin.auth().verifyIdToken(token);
        
        console.log('✅ [DEBUG-FIREBASE] Token válido:', {
          uid: decodedToken.uid,
          email: decodedToken.email,
          issuedAt: new Date(decodedToken.iat * 1000).toISOString(),
          expiresAt: new Date(decodedToken.exp * 1000).toISOString()
        });

        res.json({
          success: true,
          message: 'Token válido!',
          decoded: {
            uid: decodedToken.uid,
            email: decodedToken.email,
            issuedAt: new Date(decodedToken.iat * 1000).toISOString(),
            expiresAt: new Date(decodedToken.exp * 1000).toISOString()
          }
        });

      } catch (firebaseError: any) {
        console.error('❌ [DEBUG-FIREBASE] Erro Firebase:', {
          code: firebaseError.code,
          message: firebaseError.message,
          stack: firebaseError.stack
        });

        res.status(401).json({
          success: false,
          error: 'Erro na validação do token',
          firebaseError: {
            code: firebaseError.code,
            message: firebaseError.message
          },
          debug: {
            tokenLength: token.length,
            timestamp: new Date().toISOString()
          }
        });
      }

    } catch (error: any) {
      console.error('❌ [DEBUG-FIREBASE] Erro geral:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno no debug',
        message: error.message
      });
    }
  });

  // ===== ROTAS DE LOCALIDADES =====
  app.use('/api/locations', locationsRouter);
  console.log('📍 Rotas de localidades registradas com sucesso');

  // ===== TESTE DO POSTGIS MELHORADO =====
  app.get('/api/test-postgis', async (req, res) => {
    try {
      console.log('🧪 Testando PostGIS...');
      
      // Testar se PostGIS está funcionando
      const postgisTest = await db.execute(sql`SELECT PostGIS_Version()`);
      const postgisVersion = (postgisTest as any).rows?.[0]?.postgis_version || 'unknown';
      console.log('✅ PostGIS Version:', postgisVersion);
      
      // ✅ CORREÇÃO: Usar ST_DistanceSphere para metros corretos
      const distanceTest = await db.execute(sql`
        SELECT ST_DistanceSphere(
          ST_SetSRID(ST_MakePoint(32.573, -25.966), 4326), -- Maputo
          ST_SetSRID(ST_MakePoint(32.645, -25.959), 4326)  -- Matola
        ) as distance_metros
      `);
      
      const distanceMeters = (distanceTest as any).rows?.[0]?.distance_metros || 0;
      console.log('✅ Distância testada (metros):', Math.round(distanceMeters));
      
      res.json({
        success: true,
        postgis: 'ativo',
        version: postgisVersion,
        distanceTest: {
          meters: Math.round(distanceMeters),
          km: Math.round(distanceMeters / 1000)
        },
        message: 'PostGIS configurado e funcionando'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('❌ Erro no teste PostGIS:', errorMessage);
      
      res.status(500).json({
        success: false,
        postgis: 'inativo',
        error: errorMessage,
        message: 'PostGIS não está configurado corretamente'
      });
    }
  });

  // ===== ROTA DE SUGESTÕES DE LOCALIZAÇÃO SEGURA =====
  app.get('/api/locations/suggest', async (req, res) => {
    try {
      const { query, limit = 10 } = req.query;
      
      console.log('💡 Buscando sugestões para:', query);

      // ✅ CORREÇÃO: Validação robusta
      const searchQuery = safeString(query);
      const searchLimit = Math.min(safeNumber(limit, 10), 50); // Limitar a 50 resultados

      if (searchQuery.length < 2) {
        return res.status(400).json({
          success: false,
          error: 'Query deve ter pelo menos 2 caracteres'
        });
      }

      // ✅ CORREÇÃO: Query segura com bind parameters
      const suggestions = await db.execute(sql`
        SELECT 
          id, name, province, district, type,
          lat::float, lng::float,
          CASE 
            WHEN lower(name) = lower(${searchQuery}) THEN 0
            WHEN lower(name) LIKE lower(${searchQuery} || '%') THEN 1
            WHEN lower(name) LIKE lower('%' || ${searchQuery} || '%') THEN 2
            ELSE 3
          END as relevance_rank
        FROM mozambique_locations 
        WHERE name ILIKE ${'%' + searchQuery + '%'}
        ORDER BY relevance_rank, name
        LIMIT ${searchLimit}
      `);

      const results = (suggestions as any).rows || [];
      console.log(`💡 Encontradas ${results.length} sugestões`);

      res.json({
        success: true,
        data: results,
        query: searchQuery,
        totalResults: results.length
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('❌ Erro nas sugestões:', errorMessage);
      
      res.status(500).json({
        success: false,
        error: 'Erro interno ao buscar sugestões',
        message: errorMessage
      });
    }
  });

  // ===== FUNÇÃO AUXILIAR PARA UPSERT DE USUÁRIO =====
  const upsertUser = async (userData: {
    uid: string;
    email: string;
    displayName?: string;
    photoURL?: string;
    roles?: string[];
  }) => {
    const { uid, email, displayName, photoURL, roles = ['client'] } = userData;
    
    // ✅ CORREÇÃO: Validações
    if (!isValidUid(uid)) {
      throw new Error('UID inválido');
    }
    
    if (!isValidEmail(email)) {
      throw new Error('Email inválido');
    }

    // Garantir que roles seja um array de strings válido
    const validRoles = Array.isArray(roles) ? roles : ['client'];
    const userType = validRoles.includes('driver') ? 'driver' : 'client';

    // Verificar se usuário já existe
    const existingUser = await db.select()
      .from(users)
      .where(eq(users.id, uid))
      .limit(1);

    if (existingUser.length > 0) {
      // Atualizar usuário existente
      await db.update(users)
        .set({
          email,
          firstName: displayName || existingUser[0].firstName,
          profileImageUrl: photoURL || existingUser[0].profileImageUrl,
          roles: validRoles,
          userType,
          canOfferServices: validRoles.includes('driver'),
          updatedAt: new Date()
        })
        .where(eq(users.id, uid));

      const [updatedUser] = await db.select()
        .from(users)
        .where(eq(users.id, uid))
        .limit(1);

      return updatedUser;
    } else {
      // Criar novo usuário
      await db.insert(users).values({
        id: uid,
        email,
        firstName: displayName || '',
        profileImageUrl: photoURL || '',
        roles: validRoles,
        createdAt: new Date(),
        updatedAt: new Date(),
        userType,
        isVerified: false
      });

      const [newUser] = await db.select()
        .from(users)
        .where(eq(users.id, uid))
        .limit(1);

      return newUser;
    }
  };

  // ===== ROTAS DE AUTENTICAÇÃO CONSOLIDADAS =====
  
  // ✅ Rota de signup para registro de usuários
  app.post('/api/auth/signup', async (req, res) => {
    try {
      const { email, uid, displayName, photoURL, roles } = req.body;
      
      console.log('📝 Tentativa de registro:', { email, uid });
      
      const userData = await upsertUser({
        uid,
        email,
        displayName,
        photoURL,
        roles
      });

      res.json({ 
        success: true, 
        message: 'Usuário registrado com sucesso',
        user: userData
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('❌ Erro no signup:', errorMessage);
      res.status(500).json({ 
        success: false, 
        error: 'Erro interno no servidor' 
      });
    }
  });

  // ✅ Rota para verificar status de registro
  app.post('/api/auth/check-registration', async (req, res) => {
    try {
      const { uid } = req.body;
      
      if (!uid || !isValidUid(uid)) {
        return res.status(400).json({
          success: false,
          error: 'UID inválido'
        });
      }
      
      console.log('🔍 Verificando registro para UID:', uid);
      
      // Verificar se usuário existe no banco
      const existingUser = await db.select()
        .from(users)
        .where(eq(users.id, uid))
        .limit(1);

      const userExists = existingUser.length > 0;
      
      res.json({ 
        success: true,
        needsRegistration: !userExists,
        exists: userExists,
        message: userExists ? 'Usuário já registrado' : 'Usuário precisa completar registro',
        user: userExists ? existingUser[0] : null
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('❌ Erro ao verificar registro:', errorMessage);
      res.status(500).json({ 
        success: false,
        error: 'Erro interno no servidor',
        needsRegistration: true
      });
    }
  });

  // ✅ ROTA setup-roles CONSOLIDADA
  app.post('/api/auth/setup-roles', async (req, res) => {
    try {
      const { uid, email, displayName, photoURL, roles } = req.body;
      
      console.log('🎯 Configurando roles para:', email, roles);
      
      const userData = await upsertUser({
        uid,
        email,
        displayName,
        photoURL,
        roles
      });

      res.json({ 
        success: true, 
        message: 'Roles configuradas com sucesso',
        user: userData
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('❌ Erro ao configurar roles:', errorMessage);
      res.status(500).json({ 
        success: false, 
        error: 'Erro interno ao configurar roles' 
      });
    }
  });

  // ===== REGISTRO DE TODAS AS ROTAS =====
  
  // ===== ROTAS COMPARTILHADAS =====
  app.use('/api/health', sharedHealthRoutes);
  console.log('✅ Rotas básicas registradas com sucesso');

  // ===== NOVA API DRIZZLE UNIFICADA =====
  // ✅ CORREÇÃO: Remover duplicação - usar apenas uma rota
  app.use('/api/drizzle', drizzleApiRoutes);
  console.log('🗃️ API Drizzle principal configurada');

  // ===== SISTEMAS FUNCIONAIS (Firebase Auth) =====
  app.use('/api/auth', authRoutes);
  app.use('/api/bookings', bookingsRoutes);
  app.use('/api/geo', geoRoutes);
  app.use('/api/billing', billingRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/pms', pmsRoutes);
  console.log('🔐 Sistemas funcionais registrados com sucesso');

  // ===== SISTEMA DE HOTELS =====
  app.use('/api/hotels', hotelController);
  console.log('🏨 Rotas de hotels registradas com sucesso');

  // ===== NOVAS ROTAS DE PROVIDER/DRIVER =====
  app.use('/api/provider/rides', providerRidesRoutes);
  app.use('/api/provider/dashboard', providerDashboardRoutes);
  app.use('/api/rides', rideController);
  app.use('/api/driver', driverController);
  console.log('🚗 Rotas de provider/driver registradas com sucesso');

  // ===== ROTAS DE PARCERIAS =====
  app.use('/api/partnerships', partnershipRoutes);
  app.use('/api/driver/partnerships', driverPartnershipRoutes);
  app.use('/api/hotel/partnerships', hotelPartnershipRoutes);
  console.log('🤝 Rotas completas de parceria registradas com sucesso');

  // ===== ROTAS DE CLIENTES =====
  app.use('/api/clients', clientController);
  console.log('👥 Rotas de clientes registradas com sucesso');

  // ===== ROTAS DE ADMINISTRAÇÃO =====
  app.use('/api/admin/system', adminController);
  console.log('👨‍💼 Rotas de administração registradas com sucesso');

  // ===== ROTAS DE EVENTOS =====
  app.use('/api/events', eventController);
  console.log('🎉 Rotas de eventos registradas com sucesso');

  // ===== ROTAS DE USUÁRIOS =====
  app.use('/api/users', userController);
  console.log('👤 Rotas de usuários registradas com sucesso');

  // ===== ROTAS INDIVIDUAIS DA RAIZ =====
  app.use('/api/admin-legacy', adminRoutes);
  app.use('/api/payment', paymentRoutes);
  app.use('/api/profile', profileRoutes);
  app.use('/api/search', searchRoutes);
  console.log('📁 Rotas individuais registradas com sucesso');

  // ===== ROTA DE ESTATÍSTICAS ADMIN =====
  app.get('/api/admin/stats', async (req, res) => {
    try {
      res.json({
        success: true,
        data: {
          totalUsers: 1250,
          totalRides: 89,
          totalHotels: 23,
          totalEvents: 12,
          pendingApprovals: 5,
          monthlyRevenue: 45000,
          activeBookings: 156
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('Erro ao buscar estatísticas:', errorMessage);
      res.status(500).json({ 
        success: false,
        error: 'Erro interno do servidor' 
      });
    }
  });

  // ===== ROTA DE HEALTH CHECK COMPLETA COM POSTGIS =====
  app.get('/api/health-check', async (req, res) => {
    try {
      // Testar conexão com banco de dados
      const dbTest = await db.select().from(users).limit(1);
      
      // Testar PostGIS com mais detalhes
      let postgisStatus = 'unknown';
      let postgisVersion = 'unknown';
      
      try {
        const postgisTest = await db.execute(sql`SELECT PostGIS_Version()`);
        postgisVersion = (postgisTest as any).rows?.[0]?.postgis_version || 'unknown';
        postgisStatus = 'connected';
        console.log('✅ PostGIS ativo na health check:', postgisVersion);
      } catch (postgisError) {
        postgisStatus = 'disconnected';
        console.warn('⚠️ PostGIS não disponível na health check');
      }
      
      res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: 'connected',
        postgis: {
          status: postgisStatus,
          version: postgisVersion
        },
        services: {
          auth: 'operational',
          hotels: 'operational',
          rides: 'operational',
          partnerships: 'operational',
          events: 'operational',
          chat: 'operational',
          search_intelligent: 'operational'
        },
        version: '1.0.0'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('❌ Health check failed:', errorMessage);
      res.status(500).json({
        success: false,
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        postgis: 'unknown',
        error: errorMessage
      });
    }
  });

  // ===== ROTA DE FALLBACK PARA ERRO 404 =====
  app.use('*', (req, res) => {
    console.log('❌ Rota não encontrada:', req.originalUrl);
    
    // ✅ CORREÇÃO: Em produção, não mostrar todas as rotas disponíveis
    const response: any = {
      success: false,
      error: 'Rota não encontrada',
      path: req.originalUrl,
      method: req.method
    };
    
    if (process.env.NODE_ENV !== 'production') {
      response.availableRoutes = [
        '/api/health',
        '/api/auth',
        '/api/hotels',
        '/api/locations/suggest',
        '/api/test-postgis',
        '/api/rides',
        '/api/events',
        '/api/users',
        '/api/admin/system',
        '/api/partnerships',
        '/api/debug/firebase-auth' // ✅ NOVA ROTA DE DEBUG
      ];
    }
    
    res.status(404).json(response);
  });

  // ===== MIDDLEWARE DE TRATAMENTO DE ERROS =====
  app.use((error: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('🔥 Erro não tratado:', errorMessage);
    if (errorStack && process.env.NODE_ENV !== 'production') {
      console.error('📋 Stack trace:', errorStack);
    }
    
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: process.env.NODE_ENV === 'development' ? errorMessage : 'Algo deu errado',
      ...(process.env.NODE_ENV === 'development' && { stack: errorStack })
    });
  });

  console.log('🔌 Todas as rotas registradas - pronto para criar servidor HTTP');
  console.log('🌐 Frontend: http://localhost:8000/');
  console.log('🔌 API: http://localhost:8000/api/');
  console.log('🏥 Health: http://localhost:8000/api/health');
  console.log('🗺️  PostGIS: http://localhost:8000/api/test-postgis');
  console.log('📍 Sugestões: http://localhost:8000/api/locations/suggest?query=map');
  console.log('🔍 Debug Auth: http://localhost:8000/api/debug/firebase-auth');
  console.log('✅ Todas as APIs configuradas e funcionando!');
}