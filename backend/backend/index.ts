// ✅ CORREÇÃO: DOTENV DEVE SER A PRIMEIRA COISA NO ARQUIVO!
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// ✅ OBTER CAMINHO ABSOLUTO ANTES DE TUDO
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '.env');

// ✅ CARREGAR .env IMEDIATAMENTE - EM TODOS OS AMBIENTES
console.log('🔍 [DOTENV] Tentando carregar .env de:', envPath);
config({ path: envPath });

// ✅ DEBUG DAS VARIÁVEIS CARREGADAS
console.log('🌍 [ENV] NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('🔍 [ENV] FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? 'EXISTE' : 'NÃO EXISTE');
console.log('🔍 [ENV] FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? 'EXISTE' : 'NÃO EXISTE');
console.log('🔍 [ENV] FIREBASE_PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? 'EXISTE' : 'NÃO EXISTE');
console.log('🔍 [ENV] DATABASE_URL:', process.env.DATABASE_URL ? 'EXISTE' : 'NÃO EXISTE');

// ✅ AGORA IMPORTAR O RESTO
import express from "express";
import cors from "cors";
import fs from "fs";

// ✅ CORREÇÃO: Importar e inicializar Firebase APÓS dotenv
import { initializeFirebase } from "./src/shared/firebaseAuth";

// ✅ Importar Drizzle DB
import { db } from "./db";
import { users } from "./shared/schema";
import { eq } from "drizzle-orm";

// Import routes function
import { registerRoutes } from "./routes/index";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8000;

// ✅ CORREÇÃO: Inicializar Firebase explicitamente
try {
  initializeFirebase();
  console.log('✅ Firebase inicializado com sucesso após dotenv');
} catch (error) {
  console.log('⚠️  Firebase não inicializado, continuando sem autenticação');
}

// Middleware - CORS configurado para Railway e desenvolvimento
app.use(
  cors({
    origin: (origin, callback) => {
      // In development, allow all origins (including Replit proxy)
      if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
        callback(null, true);
        return;
      }
      
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
        "http://127.0.0.1:5000",
        
        // Replit development
        undefined // Para ferramentas de desenvolvimento
      ];
      
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log(`❌ CORS blocked origin: ${origin}`);
        callback(new Error(`CORS policy: Origin ${origin} not allowed`));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  }),
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos do frontend build com debug
const staticPath = path.join(__dirname, "../frontend/dist");
console.log(`📂 Servindo arquivos estáticos de: ${staticPath}`);
console.log(`📂 Diretório existe: ${fs.existsSync(staticPath)}`);
if (fs.existsSync(staticPath)) {
  const files = fs.readdirSync(staticPath);
  console.log(`📂 Arquivos encontrados: ${files.join(', ')}`);
}
app.use(express.static(staticPath));

// API Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Link-A Backend API funcionando",
    timestamp: new Date().toISOString(),
    version: "2.0.0",
    environment: process.env.NODE_ENV || "development",
  });
});

// ✅✅✅ ADICIONE A ROTA setup-roles AQUI (ANTES de registerRoutes)
app.post('/api/auth/setup-roles', async (req, res) => {
  try {
    const { uid, email, displayName, photoURL, roles } = req.body;
    
    console.log('🎯 [SETUP-ROLES] Configurando roles para:', email, roles);
    
    // Verificar se o usuário já existe
    const existingUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, uid)
    });
    
    if (existingUser) {
      console.log('📝 [SETUP-ROLES] Usuário já existe, atualizando roles:', existingUser.email);
      
      // Atualizar usuário existente
      const [updatedUser] = await db.update(users)
        .set({
          roles: roles || ['client'],
          updatedAt: new Date(),
          userType: roles?.includes('driver') ? 'driver' : 'client'
        })
       .where(eq(users.id, uid))
        .returning();
      
      console.log('💾 [SETUP-ROLES] Usuário atualizado:', updatedUser);
      
      return res.json({ 
        success: true, 
        message: 'Roles atualizadas com sucesso',
        user: updatedUser
      });
    }
    
    // Criar novo usuário
    const userData = {
      id: uid,
      email: email || '',
      firstName: displayName || '',
      profileImageUrl: photoURL || '',
      roles: roles || ['client'],
      userType: roles?.includes('driver') ? 'driver' : 'client',
      createdAt: new Date(),
      updatedAt: new Date(),
      isVerified: false,
      verificationStatus: 'pending',
      registrationCompleted: true
    };
    
    console.log('💾 [SETUP-ROLES] Salvando novo usuário:', userData);
    
    // Inserir no banco de dados
    const [savedUser] = await db.insert(users)
      .values(userData)
      .returning();
    
    console.log('✅ [SETUP-ROLES] Usuário salvo no banco:', savedUser);
    
    res.json({ 
      success: true, 
      message: 'Usuário criado e roles configuradas com sucesso',
      user: savedUser
    });
    
  } catch (error) {
    console.error('❌ [SETUP-ROLES] Erro:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno ao configurar roles',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// Função principal do servidor
async function startServer() {
  try {
    console.log("🚀 Inicializando Link-A Backend...");
    
    // 🚨 DEBUG: Verificar ambiente и variáveis
    console.log('🌍 [ENV DEBUG] NODE_ENV:', process.env.NODE_ENV || 'development');
    console.log('🌍 [ENV DEBUG] PORT:', process.env.PORT || '8000');
    console.log('🌍 [ENV DEBUG] DATABASE_URL existe:', !!process.env.DATABASE_URL);
    console.log('🌍 [ENV DEBUG] FIREBASE_PROJECT_ID existe:', !!process.env.FIREBASE_PROJECT_ID);

    // 1. Registrar todas as rotas da API PRIMEIRO
    await registerRoutes(app);
    
    // 2. Para rotas API não encontradas - SEMPRE retorne JSON
    app.all("/api/*", (req, res) => {
      console.log(`❌ API endpoint não encontrado: ${req.method} ${req.path}`);
      res.status(404).json({
        error: "API endpoint não encontrado",
        path: req.path,
        method: req.method,
        availableEndpoints: [
          "GET /api/health",
          "POST /api/auth/setup-roles", // ✅ AGORA INCLUÍDA
          "POST /api/rides-simple/create", 
          "GET /api/rides-simple/search"
        ]
      });
    });

    // 3. Para todas as outras rotas - sirva o SPA (React Router)
    app.get("*", (req, res) => {
      const frontendPath = path.join(__dirname, "../frontend/dist");
      const indexFile = path.join(frontendPath, "index.html");
      
      console.log(`📦 Servindo SPA para rota: ${req.path}`);
      
      // Verificar se é uma rota de API pela URL
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({
          error: "API endpoint não encontrado",
          path: req.path,
        });
      }
      
      if (!fs.existsSync(frontendPath)) {
        console.error(`❌ Pasta do frontend não existe: ${frontendPath}`);
        return res.status(503).json({ 
          error: "Frontend não disponível", 
          message: "O frontend ainda não foi construído ou deployado",
          path: frontendPath
        });
      }
      
      if (!fs.existsSync(indexFile)) {
        console.error(`❌ index.html não encontrado: ${indexFile}`);
        return res.status(503).json({ 
          error: "Frontend index.html não encontrado", 
          message: "Build do frontend incompleto",
          path: indexFile
        });
      }
      
      // Servir o index.html para todas as rotas (SPA)
      res.sendFile(indexFile);
    });
    
    // 4. Criar servidor HTTP
    const server = app.listen(PORT, "0.0.0.0");

    // Configurar graceful shutdown
    const gracefulShutdown = (signal: string) => {
      console.log(
        `🛑 Recebido sinal ${signal}. Iniciando shutdown elegante...`,
      );

      server.close(() => {
        console.log("✅ Backend servidor fechado com sucesso");
        process.exit(0);
      });

      // Force kill após 5 segundos
      setTimeout(() => {
        console.log("⚡ Forçando encerramento do backend...");
        process.exit(1);
      }, 5000);
    };

    // Registrar handlers de shutdown
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

    // Tratamento de erro para porta em uso
    server.on("error", (error: any) => {
      if (error.code === "EADDRINUSE") {
        console.error(
          `❌ Porta ${PORT} já em uso. Use PORT=0 para auto-atribuição ou PORT=8001 para porta alternativa.`,
        );
        console.log("💡 Tentando porta alternativa em 2 segundos...");

        setTimeout(() => {
          server.listen(0, "0.0.0.0", () => {
            const address = server.address();
            const actualPort =
              address && typeof address === "object" ? address.port : "unknown";
            console.log(
              `🌐 Link-A Backend Server running on port ${actualPort} (auto-atribuída)`,
            );
            console.log(`📱 Frontend: http://localhost:${actualPort}/`);
            console.log(`🔌 API: http://localhost:${actualPort}/api/`);
            console.log(`🏥 Health: http://localhost:${actualPort}/api/health`);
            console.log("✅ Todas as APIs configuradas e funcionando");
          });
        }, 2000);
      } else {
        console.error("❌ Erro no servidor:", error);
        process.exit(1);
      }
    });

    // Configurar callback de sucesso
    server.on('listening', () => {
      console.log(`🌐 Link-A Backend Server running on port ${PORT}`);
      console.log(`📱 Frontend: http://localhost:${PORT}/`);
      console.log(`🔌 API: http://localhost:${PORT}/api/`);
      console.log(`🏥 Health: http://localhost:${PORT}/api/health`);
      console.log("✅ Todas as APIs configuradas e funcionando");
    });
  } catch (error) {
    console.error("❌ Erro ao inicializar servidor:", error);
    process.exit(1);
  }
}

// Iniciar servidor
startServer();

// Não exportar app antes das rotas serem registradas