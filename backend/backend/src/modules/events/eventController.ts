import { Router, Request, Response } from "express";
import { storage } from "../../../storage";
const router = Router();

import { 
  verifyFirebaseToken, 
  type AuthenticatedRequest,
  createApiResponse,
  createApiError 
} from "../../shared/firebaseAuth";

import { validateEventData } from "../../../shared/event-validation";
import { CreateEventData } from "../../../storage/business/EventStorage";

// GET /api/events - Lista todos os eventos públicos com filtros
router.get("/", async (req, res) => {
  try {
    const { 
      eventType, 
      category, 
      status = 'approved', 
      isPublic = 'true',
      startDate,
      location,
      sortBy = 'startDate',
      page = 1, 
      limit = 20 
    } = req.query;

    const filters: any = {};
    
    if (eventType) filters.eventType = eventType;
    if (category) filters.category = category;
    if (status) filters.status = status;
    if (isPublic !== undefined) filters.isPublic = isPublic === 'true';
    if (startDate) filters.startDate = new Date(startDate as string);

    let events = await storage.event.getEventsByFilter(filters);
    
    // Filtros adicionais
    if (location) {
      events = events.filter(event => 
        event.address?.toLowerCase().includes((location as string).toLowerCase()) ||
        event.venue?.toLowerCase().includes((location as string).toLowerCase())
      );
    }
    
    // Ordenação personalizada - ✅ CORREÇÃO: Usar startDate da tabela
    if (sortBy === 'date_asc') {
      events = events.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    } else if (sortBy === 'price_asc') {
      events = events.sort((a, b) => Number(a.ticketPrice || 0) - Number(b.ticketPrice || 0));
    } else if (sortBy === 'popular') {
      events = events.sort((a, b) => (b.currentAttendees || 0) - (a.currentAttendees || 0));
    } else {
      // Ordenação padrão por data de início (mais recente primeiro)
      events = events.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    }
    
    // Aplicar paginação
    const startIndex = (Number(page) - 1) * Number(limit);
    const endIndex = startIndex + Number(limit);
    const paginatedEvents = events.slice(startIndex, endIndex);

    res.json(createApiResponse({
      events: paginatedEvents,
      total: events.length,
      page: Number(page),
      totalPages: Math.ceil(events.length / Number(limit))
    }, "Eventos listados com sucesso"));
  } catch (error) {
    console.error("Erro ao listar eventos:", error);
    res.status(500).json(createApiError("Erro interno do servidor", "INTERNAL_ERROR", error instanceof Error ? error.message : String(error)));
  }
});

// GET /api/events/:id - Obter evento específico
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const event = await storage.event.getEvent(id);

    if (!event) {
      return res.status(404).json(createApiError("Evento não encontrado", "EVENT_NOT_FOUND"));
    }

    res.json(createApiResponse({ event }, "Evento encontrado com sucesso"));
  } catch (error) {
    console.error("Erro ao buscar evento:", error);
    res.status(500).json(createApiError("Erro interno do servidor", "INTERNAL_ERROR", error instanceof Error ? error.message : String(error)));
  }
});

// POST /api/events - Criar novo evento (apenas organizadores)
router.post("/", verifyFirebaseToken, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  
  try {
    const userId = authReq.user?.uid;
    if (!userId) {
      return res.status(401).json(createApiError("Usuário não autenticado", "UNAUTHENTICATED"));
    }

    console.log("🎯 BACKEND: Criando evento - Dados recebidos:", req.body);

    // ✅ CORREÇÃO: Preparar dados para validação com nomes CORRETOS da tabela
    const eventDataForValidation = {
      ...req.body,
      organizerId: userId,
      // ✅ CORREÇÃO: Mapear para nomes da tabela
      title: req.body.title,
      description: req.body.description,
      eventType: req.body.eventType,
      category: req.body.eventType || req.body.category, // Usar eventType como category se não fornecido
      venue: req.body.venue,
      address: req.body.venue, // venue → address na tabela
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      startTime: req.body.startTime || '10:00',
      endTime: req.body.endTime || '18:00',
      ticketPrice: req.body.ticketPrice || 0,
      maxTickets: req.body.maxTickets || req.body.maxAttendees || 100,
      isPublic: true,
      requiresApproval: false
    };

    // Validação manual
    const validation = validateEventData(eventDataForValidation);

    if (!validation.isValid) {
      console.error("❌ BACKEND: Validação falhou:", validation.errors);
      return res.status(400).json({
        success: false,
        message: "Dados inválidos",
        errors: validation.errors
      });
    }

    // ✅ CORREÇÃO COMPLETA: Remover propriedades que não existem no tipo CreateEventData
    const eventData: CreateEventData = {
      // Campos obrigatórios da tabela
      title: validation.validatedData!.title,
      description: validation.validatedData!.description,
      eventType: validation.validatedData!.eventType,
      category: validation.validatedData!.category,
      venue: validation.validatedData!.venue,
      address: validation.validatedData!.address,
      startDate: new Date(validation.validatedData!.startDate),
      endDate: new Date(validation.validatedData!.endDate),
      startTime: validation.validatedData!.startTime as string, // ✅ CORREÇÃO: Garantir que é string
      endTime: validation.validatedData!.endTime as string, // ✅ CORREÇÃO: Garantir que é string
      ticketPrice: validation.validatedData!.ticketPrice,
      maxTickets: validation.validatedData!.maxTickets,
      organizerId: validation.validatedData!.organizerId,
      
      // Campos opcionais com valores padrão
      isPublic: validation.validatedData!.isPublic !== undefined ? validation.validatedData!.isPublic : true,
      requiresApproval: validation.validatedData!.requiresApproval || false,
      isPaid: validation.validatedData!.ticketPrice > 0,
      
      // Campos adicionais que podem vir do frontend
      images: validation.validatedData!.images || [],
      tags: validation.validatedData!.tags || []
    };

    console.log("✅ BACKEND: Dados mapeados para criação:", eventData);

    const newEvent = await storage.event.createEvent(eventData);

    console.log("🎉 BACKEND: Evento criado com sucesso:", newEvent.id);

    res.status(201).json(createApiResponse(newEvent, "Evento criado com sucesso"));
  } catch (error) {
    console.error("❌ BACKEND: Erro ao criar evento:", error);
    res.status(500).json(createApiError("Erro interno do servidor", "INTERNAL_ERROR", error instanceof Error ? error.message : String(error)));
  }
});

// PUT /api/events/:id - Atualizar evento
router.put("/:id", verifyFirebaseToken, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  
  try {
    const userId = authReq.user?.uid;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json(createApiError("Usuário não autenticado", "UNAUTHENTICATED"));
    }

    console.log("🔄 BACKEND: Atualizando evento:", id, "Dados:", req.body);

    // Verificar se o evento existe e pertence ao usuário
    const existingEvent = await storage.event.getEvent(id);
    if (!existingEvent) {
      return res.status(404).json(createApiError("Evento não encontrado", "EVENT_NOT_FOUND"));
    }

    if (existingEvent.organizerId !== userId) {
      return res.status(403).json(createApiError("Sem permissão para editar este evento", "FORBIDDEN"));
    }

    // ✅ CORREÇÃO CRÍTICA: Definir campos permitidos para atualização, INCLUINDO ticketsSold
    const allowedFields = [
      'title', 'description', 'eventType', 'category', 
      'venue', 'address', 'startDate', 'endDate',
      'startTime', 'endTime', 'ticketPrice', 'maxTickets',
      'ticketsSold', 'status', 'images', 'tags', 'isPublic'
    ];

    const updateData: any = {
      updatedAt: new Date()
    };

    // ✅ CORREÇÃO: Apenas incluir campos permitidos e válidos
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined && req.body[field] !== null) {
        // Conversões específicas para tipos de dados
        if (field === 'startDate' || field === 'endDate') {
          updateData[field] = new Date(req.body[field]);
        } else if (field === 'ticketPrice' || field === 'maxTickets' || field === 'ticketsSold') {
          updateData[field] = Number(req.body[field]);
        } else {
          updateData[field] = req.body[field];
        }
      }
    });

    // ✅ CORREÇÃO: Atualizar isPaid baseado no ticketPrice
    if (req.body.ticketPrice !== undefined) {
      updateData.isPaid = Number(req.body.ticketPrice) > 0;
    }

    // ✅ CORREÇÃO: Sincronizar address com venue se venue for atualizado
    if (req.body.venue && !req.body.address) {
      updateData.address = req.body.venue;
    }

    console.log("✅ BACKEND: Dados para atualização:", updateData);

    const updatedEvent = await storage.event.updateEvent(id, updateData);

    console.log("🎉 BACKEND: Evento atualizado com sucesso:", id);
    console.log("🎫 BACKEND: ticketsSold atualizado para:", updatedEvent.ticketsSold);

    res.json(createApiResponse(updatedEvent, "Evento atualizado com sucesso"));
  } catch (error) {
    console.error("❌ BACKEND: Erro ao atualizar evento:", error);
    res.status(500).json(createApiError("Erro interno do servidor", "INTERNAL_ERROR", error instanceof Error ? error.message : String(error)));
  }
});

// DELETE /api/events/:id - Excluir evento
router.delete("/:id", verifyFirebaseToken, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  
  try {
    const userId = authReq.user?.uid;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json(createApiError("Usuário não autenticado", "UNAUTHENTICATED"));
    }

    console.log("🗑️ BACKEND: Eliminando evento:", id);

    // Verificar se o evento existe e pertence ao usuário
    const existingEvent = await storage.event.getEvent(id);
    if (!existingEvent) {
      return res.status(404).json(createApiError("Evento não encontrado", "EVENT_NOT_FOUND"));
    }

    if (existingEvent.organizerId !== userId) {
      return res.status(403).json(createApiError("Sem permissão para excluir este evento", "FORBIDDEN"));
    }

    await storage.event.deleteEvent(id);

    console.log("✅ BACKEND: Evento eliminado com sucesso:", id);

    res.json(createApiResponse(null, "Evento excluído com sucesso"));
  } catch (error) {
    console.error("❌ BACKEND: Erro ao excluir evento:", error);
    res.status(500).json(createApiError("Erro interno do servidor", "INTERNAL_ERROR", error instanceof Error ? error.message : String(error)));
  }
});

// Dashboard do organizador de eventos
router.get('/dashboard', verifyFirebaseToken, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const userId = authReq.user?.uid;
    if (!userId) {
      return res.status(401).json(createApiError("ID do usuário não encontrado", "USER_ID_NOT_FOUND"));
    }

    // ✅ CORREÇÃO: Buscar eventos reais do usuário para stats
    const userEvents = await storage.event.getEventsByFilter({ organizerId: userId });
    const activeEvents = userEvents.filter(event => event.status === 'upcoming' || event.status === 'active');
    const pastEvents = userEvents.filter(event => event.status === 'completed' || new Date(event.endDate) < new Date());
    
    const totalRevenue = userEvents.reduce((sum, event) => {
      return sum + (Number(event.ticketPrice) * (event.ticketsSold || 0));
    }, 0);

    const totalParticipants = userEvents.reduce((sum, event) => {
      return sum + (event.currentAttendees || 0);
    }, 0);

    const upcomingEvents = activeEvents.slice(0, 5).map(event => ({
      id: event.id,
      title: event.title,
      venue: event.venue,
      capacity: event.maxTickets,
      sold: event.ticketsSold || 0,
      date: event.startDate,
      price: Number(event.ticketPrice)
    }));

    const stats = {
      activeEvents: activeEvents.length,
      totalParticipants,
      totalRevenue,
      occupancyRate: userEvents.length > 0 ? Math.round((totalParticipants / userEvents.reduce((sum, e) => sum + (e.maxTickets || 0), 0)) * 100) : 0,
      upcomingEvents,
      recentSales: [
        {
          id: "sale-1",
          event: "Festival de Música",
          buyer: "Ana Silva",
          tickets: 3,
          amount: 750.00,
          time: "há 5 minutos"
        },
        {
          id: "sale-2",
          event: "Workshop Fotografia", 
          buyer: "Carlos Santos",
          tickets: 1,
          amount: 450.00,
          time: "há 12 minutos"
        }
      ],
      weeklyPerformance: [
        { day: 'Dom', date: '25', sales: 12, revenue: '2.450' },
        { day: 'Seg', date: '26', sales: 8, revenue: '1.800' },
        { day: 'Ter', date: '27', sales: 15, revenue: '3.200' },
        { day: 'Qua', date: '28', sales: 22, revenue: '4.750' },
        { day: 'Qui', date: '29', sales: 18, revenue: '3.900' },
        { day: 'Sex', date: '30', sales: 35, revenue: '7.500' },
        { day: 'Sáb', date: '31', sales: 28, revenue: '6.100' }
      ]
    };

    res.json(createApiResponse(stats, "Dashboard carregado com sucesso"));
  } catch (error) {
    console.error("Event dashboard error:", error);
    res.status(500).json(createApiError("Erro ao carregar dashboard", "INTERNAL_ERROR", error instanceof Error ? error.message : String(error)));
  }
});

// Lista de eventos do organizador
router.get('/organizer/events', verifyFirebaseToken, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const organizerId = authReq.user?.uid;
    if (!organizerId) {
      return res.status(401).json(createApiError("ID do usuário não encontrado", "USER_ID_NOT_FOUND"));
    }

    console.log("📋 BACKEND: Buscando eventos do organizador:", organizerId);

    // Buscar eventos reais do organizador
    const events = await storage.event.getEventsByFilter({ organizerId });

    console.log(`✅ BACKEND: Encontrados ${events.length} eventos para o organizador`);

    res.json(createApiResponse(events, "Eventos do organizador listados com sucesso"));
  } catch (error) {
    console.error("❌ BACKEND: Erro ao carregar eventos:", error);
    res.status(500).json(createApiError("Erro ao carregar eventos", "INTERNAL_ERROR", error instanceof Error ? error.message : String(error)));
  }
});

// Inscrições/vendas de ingressos
router.get('/organizer/bookings', verifyFirebaseToken, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const organizerId = authReq.user?.uid;
    if (!organizerId) {
      return res.status(401).json(createApiError("ID do usuário não encontrado", "USER_ID_NOT_FOUND"));
    }

    const bookings = await storage.booking.getProviderBookings(organizerId);

    res.json(createApiResponse(bookings, "Inscrições carregadas com sucesso"));
  } catch (error) {
    console.error("Event bookings error:", error);
    res.status(500).json(createApiError("Erro ao carregar inscrições", "INTERNAL_ERROR", error instanceof Error ? error.message : String(error)));
  }
});

// Relatórios de evento
router.get('/organizer/analytics', verifyFirebaseToken, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const organizerId = authReq.user?.uid;
    if (!organizerId) {
      return res.status(401).json(createApiError("ID do usuário não encontrado", "USER_ID_NOT_FOUND"));
    }

    // ✅ CORREÇÃO: Analytics com dados reais
    const userEvents = await storage.event.getEventsByFilter({ organizerId });
    const totalEvents = userEvents.length;
    const totalRevenue = userEvents.reduce((sum, event) => 
      sum + (Number(event.ticketPrice) * (event.ticketsSold || 0)), 0
    );
    const totalAttendees = userEvents.reduce((sum, event) => 
      sum + (event.currentAttendees || 0), 0
    );
    
    const averageOccupancy = totalEvents > 0 ? 
      Math.round((totalAttendees / userEvents.reduce((sum, e) => sum + (e.maxTickets || 0), 0)) * 100) : 0;

    const analytics = {
      totalEvents,
      totalRevenue,
      totalAttendees,
      averageOccupancy,
      monthlyGrowth: 18.5, // Placeholder - implementar cálculo real
      topEvents: userEvents
        .sort((a, b) => (b.ticketsSold || 0) - (a.ticketsSold || 0))
        .slice(0, 5)
        .map(event => ({
          title: event.title,
          attendees: event.currentAttendees || 0,
          revenue: Number(event.ticketPrice) * (event.ticketsSold || 0)
        }))
    };

    res.json(createApiResponse(analytics, "Relatórios carregados com sucesso"));
  } catch (error) {
    console.error("Event analytics error:", error);
    res.status(500).json(createApiError("Erro ao carregar relatórios", "INTERNAL_ERROR", error instanceof Error ? error.message : String(error)));
  }
});

export default router;