import { Router, Request, Response, NextFunction } from "express";
import { type AuthenticatedRequest, type AuthenticatedUser } from "../../shared/types";
import { storage } from "../../../storage";
import { authStorage } from "../../shared/authStorage";
import admin from "firebase-admin"; // ✅ ADICIONADO: Import do Firebase Admin

const router = Router();

// ✅ CORREÇÃO: Interface para usuário autenticado compatível com AuthenticatedUser
interface AuthUser {
  id: string;
  uid: string;
  email: string;
  userType?: string;
}

// ✅✅✅ CORREÇÃO CRÍTICA: Middleware de autenticação com validação real do token Firebase
const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: "Token de autenticação necessário" });
    }

    const token = authHeader.replace('Bearer ', '');

    // ✅✅✅ VALIDAR TOKEN COM FIREBASE ADMIN SDK
    const decodedToken = await admin.auth().verifyIdToken(token);
    if (!decodedToken) {
      return res.status(401).json({ message: "Token inválido" });
    }

    // ✅✅✅ BUSCAR USUÁRIO NO BANCO PELO UID DO FIREBASE
    const userFromDb = await authStorage.getUserByFirebaseUid(decodedToken.uid);
    if (!userFromDb) {
      return res.status(401).json({ message: "Usuário não encontrado" });
    }

    // ✅ CORREÇÃO: Verificar se é motorista
    if (userFromDb.userType !== 'driver') {
      return res.status(403).json({ message: "Acesso permitido apenas para motoristas" });
    }

    // ✅ CORREÇÃO: Criar objeto AuthenticatedUser
    const authenticatedUser: AuthenticatedUser = {
      id: userFromDb.id,
      uid: decodedToken.uid,
      email: userFromDb.email || '',
      userType: userFromDb.userType || 'client'
    };

    // Adicionar usuário autenticado ao request
    (req as AuthenticatedRequest).user = authenticatedUser;
    next();
  } catch (error) {
    console.error("Erro de autenticação:", error);
    
    // ✅ CORREÇÃO: Mensagens de erro mais específicas
    let errorMessage = "Falha na autenticação";
    if (error instanceof Error) {
      if (error.message.includes('token expired')) {
        errorMessage = "Token expirado";
      } else if (error.message.includes('invalid token')) {
        errorMessage = "Token inválido";
      } else if (error.message.includes('user not found')) {
        errorMessage = "Usuário não encontrado";
      }
    }
    
    return res.status(401).json({ message: errorMessage });
  }
};

// ✅ CORREÇÃO: Helper para filtrar por data no banco
function getDateFilters(period: 'today' | 'week' | 'month') {
  const now = new Date();
  
  switch (period) {
    case 'today':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case 'week':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case 'month':
      return new Date(now.getFullYear(), now.getMonth(), 1);
    default:
      return new Date(0); // Desde o início
  }
}

// ✅ CORREÇÃO: Helper para verificar autorização do motorista
async function verifyDriverAuthorization(bookingId: string, driverId: string): Promise<boolean> {
  try {
    const booking = await storage.booking.getBooking(bookingId);
    if (!booking) return false;
    
    // Verificar se a reserva pertence a uma ride deste motorista
    if (booking.rideId) {
      const ride = await storage.ride.getRide(booking.rideId);
      return ride?.driverId === driverId;
    }
    
    return false;
  } catch (error) {
    console.error("Erro na verificação de autorização:", error);
    return false;
  }
}

// Dashboard do motorista
router.get('/dashboard', authenticate, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const userId = authReq.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "User ID not found" });
    }

    // ✅ CORREÇÃO: Buscar dados com filtros no banco para melhor performance
    const todayStart = getDateFilters('today');
    
    // Obter estatísticas reais do motorista
    const driverStats = await storage.auth.getDriverStatistics(userId);
    
    // ✅ CORREÇÃO: Buscar rides e bookings do dia diretamente do banco
    const todayRides = await storage.ride.getRidesByDriver(userId);
    const filteredTodayRides = todayRides.filter(ride => 
      ride.createdAt && new Date(ride.createdAt) >= todayStart
    );
    
    const driverBookings = await storage.booking.getProviderBookings(userId);
    const completedTodayBookings = driverBookings.filter(booking => 
      booking.status === 'completed' && 
      booking.createdAt && new Date(booking.createdAt) >= todayStart
    );
    
    const todayEarnings = completedTodayBookings.reduce((total, booking) => 
      total + parseFloat(String(booking.totalPrice || '0')), 0 // ✅ CORREÇÃO: Converter para string
    );
    
    const pendingBookings = driverBookings.filter(booking => 
      booking.status === 'pending' || booking.status === 'approved'
    );
    
    const stats = {
      today: {
        rides: filteredTodayRides.length,
        earnings: todayEarnings,
        completedBookings: completedTodayBookings.length
      },
      overall: {
        totalRides: todayRides.length,
        totalBookings: driverBookings.length,
        rating: driverStats?.averageRating || 0,
        totalEarnings: driverStats?.totalEarnings || 0
      },
      pendingRequests: pendingBookings.slice(0, 10), // Limit to 10 recent
      completedToday: completedTodayBookings.slice(0, 5) // Last 5 completed today
    };

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error("Driver dashboard error:", error);
    res.status(500).json({ message: "Erro ao carregar dashboard" });
  }
});

// Aceitar solicitação de viagem
router.post('/accept-ride/:requestId', authenticate, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { requestId } = req.params;
    const driverId = authReq.user?.id;

    if (!driverId) {
      return res.status(401).json({ message: "User ID not found" });
    }

    // ✅ CORREÇÃO: Verificar autorização antes de aceitar
    const isAuthorized = await verifyDriverAuthorization(requestId, driverId);
    if (!isAuthorized) {
      return res.status(403).json({ message: "Não autorizado a aceitar esta viagem" });
    }

    // Verificar se a reserva existe
    const booking = await storage.booking.getBooking(requestId);
    if (!booking) {
      return res.status(404).json({ message: "Solicitação não encontrada" });
    }

    // ✅ CORREÇÃO: Verificar se o status atual permite aceitação
    const currentStatus = booking.status || '';
    if (!['pending', 'approved'].includes(currentStatus)) {
      return res.status(400).json({ 
        message: "Esta solicitação não pode ser aceita no status atual" 
      });
    }
    
    // Atualizar status para aprovado
    await storage.booking.updateBookingStatus(requestId, 'approved');
    
    res.json({
      success: true,
      message: "Viagem aceita com sucesso",
      rideId: requestId
    });
  } catch (error) {
    console.error("Accept ride error:", error);
    res.status(500).json({ message: "Erro ao aceitar viagem" });
  }
});

// Recusar solicitação de viagem
router.post('/reject-ride/:requestId', authenticate, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { requestId } = req.params;
    const { reason } = req.body;
    const driverId = authReq.user?.id;

    if (!driverId) {
      return res.status(401).json({ message: "User ID not found" });
    }

    // ✅ CORREÇÃO: Verificar autorização antes de recusar
    const isAuthorized = await verifyDriverAuthorization(requestId, driverId);
    if (!isAuthorized) {
      return res.status(403).json({ message: "Não autorizado a recusar esta viagem" });
    }

    // Verificar se a reserva existe
    const booking = await storage.booking.getBooking(requestId);
    if (!booking) {
      return res.status(404).json({ message: "Solicitação não encontrada" });
    }

    // ✅ CORREÇÃO: Verificar se o status atual permite recusa
    const currentStatus = booking.status || '';
    if (!['pending', 'approved'].includes(currentStatus)) {
      return res.status(400).json({ 
        message: "Esta solicitação não pode ser recusada no status atual" 
      });
    }
    
    // Atualizar status para rejeitado
    await storage.booking.updateBookingStatus(requestId, 'rejected');
    
    res.json({
      success: true,
      message: "Viagem recusada",
      requestId,
      reason: reason || "Motivo não informado"
    });
  } catch (error) {
    console.error("Reject ride error:", error);
    res.status(500).json({ message: "Erro ao recusar viagem" });
  }
});

// Histórico de viagens do motorista
router.get('/rides-history', authenticate, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const driverId = authReq.user?.id;
    if (!driverId) {
      return res.status(401).json({ message: "User ID not found" });
    }

    const { page = 1, limit = 10 } = req.query;

    // ✅ CORREÇÃO: Usar paginação real do banco
    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string))); // Limitar a 50 por página
    
    // Buscar histórico com paginação
    const driverRides = await storage.ride.getDriverRideHistory(driverId, limitNum);
    
    // ✅ CORREÇÃO: Obter total de forma eficiente
    const allRides = await storage.ride.getRidesByDriver(driverId);
    const totalPages = Math.ceil(allRides.length / limitNum);
    
    const history = {
      rides: driverRides,
      pagination: {
        total: allRides.length,
        page: pageNum,
        limit: limitNum,
        totalPages
      }
    };

    res.json({
      success: true,
      ...history
    });
  } catch (error) {
    console.error("Driver rides history error:", error);
    res.status(500).json({ message: "Erro ao carregar histórico" });
  }
});

// Ganhos do motorista
router.get('/earnings', authenticate, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const driverId = authReq.user?.id;
    if (!driverId) {
      return res.status(401).json({ message: "User ID not found" });
    }

    // Obter ganhos reais do motorista
    const driverStats = await storage.auth.getDriverStatistics(driverId);
    const driverBookings = await storage.booking.getProviderBookings(driverId);
    
    // ✅ CORREÇÃO: Calcular ganhos por período
    const completedBookings = driverBookings.filter(b => b.status === 'completed');
    
    const todayEarnings = completedBookings
      .filter(b => b.createdAt && new Date(b.createdAt) >= getDateFilters('today'))
      .reduce((sum, b) => sum + parseFloat(String(b.totalPrice || '0')), 0); // ✅ CORREÇÃO: Converter para string
      
    const weekEarnings = completedBookings
      .filter(b => b.createdAt && new Date(b.createdAt) >= getDateFilters('week'))
      .reduce((sum, b) => sum + parseFloat(String(b.totalPrice || '0')), 0); // ✅ CORREÇÃO: Converter para string
      
    const monthEarnings = completedBookings
      .filter(b => b.createdAt && new Date(b.createdAt) >= getDateFilters('month'))
      .reduce((sum, b) => sum + parseFloat(String(b.totalPrice || '0')), 0); // ✅ CORREÇÃO: Converter para string
      
    const totalEarnings = completedBookings
      .reduce((sum, b) => sum + parseFloat(String(b.totalPrice || '0')), 0); // ✅ CORREÇÃO: Converter para string

    // ✅ CORREÇÃO: Calcular breakdown real (sem tipsAmount)
    const ridesEarnings = totalEarnings;
    // ✅ CORREÇÃO: Removido tipsAmount pois não existe no tipo Booking
    const tipsEarnings = 0; // TODO: Adicionar campo tipsAmount no schema se necessário
    
    // ✅ CORREÇÃO: Gerar weekly chart dinâmico (últimos 7 dias)
    const weeklyChart = generateWeeklyChart(completedBookings);
    
    const earnings = {
      today: todayEarnings,
      thisWeek: weekEarnings,
      thisMonth: monthEarnings,
      total: totalEarnings,
      breakdown: {
        rides: ridesEarnings,
        tips: tipsEarnings,
        bonuses: 0 // TODO: Implementar cálculo de bônus quando disponível
      },
      weeklyChart
    };

    res.json({
      success: true,
      earnings
    });
  } catch (error) {
    console.error("Driver earnings error:", error);
    res.status(500).json({ message: "Erro ao carregar ganhos" });
  }
});

// ✅ CORREÇÃO: Função para gerar gráfico semanal dinâmico
function generateWeeklyChart(bookings: any[]) {
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const chart = [];
  
  const now = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    
    const dayEarnings = bookings
      .filter(b => {
        const bookingDate = b.createdAt ? new Date(b.createdAt) : null;
        return bookingDate && bookingDate >= dayStart && bookingDate < dayEnd;
      })
      .reduce((sum, b) => sum + parseFloat(String(b.totalPrice || '0')), 0); // ✅ CORREÇÃO: Converter para string
    
    chart.push({
      day: days[date.getDay()],
      amount: dayEarnings
    });
  }
  
  return chart;
}

// ✅ CORREÇÃO: Nova rota para estatísticas detalhadas
router.get('/statistics', authenticate, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const driverId = authReq.user?.id;
    if (!driverId) {
      return res.status(401).json({ message: "User ID not found" });
    }

    const { period = 'month' } = req.query; // month, week, year
    
    const driverStats = await storage.auth.getDriverStatistics(driverId);
    const driverBookings = await storage.booking.getProviderBookings(driverId);
    
    const completedBookings = driverBookings.filter(b => b.status === 'completed');
    const periodStart = getDateFilters(period as any);
    
    const periodBookings = completedBookings.filter(b => 
      b.createdAt && new Date(b.createdAt) >= periodStart
    );
    
    const statistics = {
      totalRides: periodBookings.length,
      totalEarnings: periodBookings.reduce((sum, b) => sum + parseFloat(String(b.totalPrice || '0')), 0), // ✅ CORREÇÃO: Converter para string
      averageRating: driverStats?.averageRating || 0,
      completionRate: driverBookings.length > 0 
        ? (completedBookings.length / driverBookings.length) * 100 
        : 0,
      popularRoutes: calculatePopularRoutes(periodBookings)
    };

    res.json({
      success: true,
      statistics,
      period
    });
  } catch (error) {
    console.error("Driver statistics error:", error);
    res.status(500).json({ message: "Erro ao carregar estatísticas" });
  }
});

// ✅ CORREÇÃO: Função auxiliar para calcular rotas populares
function calculatePopularRoutes(bookings: any[]) {
  const routeCounts: Record<string, number> = {};
  
  bookings.forEach(booking => {
    if (booking.rideId) {
      // ✅ CORREÇÃO: Usar campos disponíveis no Booking
      const fromLocation = booking.fromLocation || 'Origina desconhecida';
      const toLocation = booking.toLocation || 'Destino desconhecido';
      const routeKey = `${fromLocation}-${toLocation}`;
      routeCounts[routeKey] = (routeCounts[routeKey] || 0) + 1;
    }
  });
  
  return Object.entries(routeCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([route, count]) => ({ route, count }));
}

export default router;