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
        event.location?.toLowerCase().includes((location as string).toLowerCase())
      );
    }
    
    // Ordenação personalizada
    if (sortBy === 'date_asc') {
      events = events.sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
    } else if (sortBy === 'price_asc') {
      events = events.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    } else if (sortBy === 'popular') {
      events = events.sort((a, b) => (b.currentAttendees || 0) - (a.currentAttendees || 0));
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

    // Validação manual
    const validation = validateEventData({
      ...req.body,
      organizerId: userId,
      organizerName: authReq.user?.name || authReq.user?.email || 'Organizador'
    });

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Dados inválidos",
        errors: validation.errors
      });
    }

    // ✅ CORREÇÃO APLICADA: Mapeamento correto usando 'title' em vez de 'name'
    const eventData: CreateEventData = {
      // Campos obrigatórios do CreateEventData
      title: validation.validatedData!.title,                   // ✅ CORRETO: title em vez de name
      eventDate: new Date(validation.validatedData!.startDate), // startDate → eventDate
      startTime: validation.validatedData!.startTime || '10:00', // Valor padrão se não fornecido
      location: validation.validatedData!.address,             // address → location
      price: validation.validatedData!.ticketPrice || 0,       // ticketPrice → price
      category: validation.validatedData!.category,
      organizerId: validation.validatedData!.organizerId,
      
      // Campos opcionais mapeados
      description: validation.validatedData!.description,
      endTime: validation.validatedData!.endTime,
      maxAttendees: validation.validatedData!.maxAttendees,
      tags: validation.validatedData!.tags,
      images: validation.validatedData!.images,
      isPublic: validation.validatedData!.isPublic,
      requiresApproval: validation.validatedData!.requiresApproval || false,
    };

    const newEvent = await storage.event.createEvent(eventData);

    res.status(201).json(createApiResponse(newEvent, "Evento criado com sucesso"));
  } catch (error) {
    console.error("Erro ao criar evento:", error);
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

    // Verificar se o evento existe e pertence ao usuário
    const existingEvent = await storage.event.getEvent(id);
    if (!existingEvent) {
      return res.status(404).json(createApiError("Evento não encontrado", "EVENT_NOT_FOUND"));
    }

    if (existingEvent.organizerId !== userId) {
      return res.status(403).json(createApiError("Sem permissão para editar este evento", "FORBIDDEN"));
    }

    const updateData = {
      ...req.body,
      startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
      endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
      updatedAt: new Date()
    };

    const updatedEvent = await storage.event.updateEvent(id, updateData);

    res.json(createApiResponse(updatedEvent, "Evento atualizado com sucesso"));
  } catch (error) {
    console.error("Erro ao atualizar evento:", error);
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

    // Verificar se o evento existe e pertence ao usuário
    const existingEvent = await storage.event.getEvent(id);
    if (!existingEvent) {
      return res.status(404).json(createApiError("Evento não encontrado", "EVENT_NOT_FOUND"));
    }

    if (existingEvent.organizerId !== userId) {
      return res.status(403).json(createApiError("Sem permissão para excluir este evento", "FORBIDDEN"));
    }

    await storage.event.deleteEvent(id);

    res.json(createApiResponse(null, "Evento excluído com sucesso"));
  } catch (error) {
    console.error("Erro ao excluir evento:", error);
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

    const stats = {
      activeEvents: 8,
      totalParticipants: 1245,
      totalRevenue: 85500.00,
      occupancyRate: 87,
      upcomingEvents: [
        {
          id: "event-1",
          title: "Festival de Música Moçambicana",
          venue: "Centro de Conferências",
          capacity: 500,
          sold: 450,
          date: "2024-08-30T19:00:00Z",
          price: 250.00
        },
        {
          id: "event-2",
          title: "Workshop de Fotografia", 
          venue: "Estúdio Arte",
          capacity: 25,
          sold: 18,
          date: "2024-09-02T09:00:00Z",
          price: 450.00
        }
      ],
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

    // Buscar eventos reais do organizador
    const events = await storage.event.getEventsByFilter({ organizerId });

    res.json(createApiResponse(events, "Eventos do organizador listados com sucesso"));
  } catch (error) {
    console.error("Event list error:", error);
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

    // TODO: Implementar analytics reais
    const analytics = {
      totalEvents: 15,
      totalRevenue: 125000.00,
      totalAttendees: 2850,
      averageOccupancy: 82,
      monthlyGrowth: 18.5,
      topEvents: [
        {
          title: "Festival de Música",
          attendees: 450,
          revenue: 112500.00
        },
        {
          title: "Workshop Fotografia",
          attendees: 18,
          revenue: 8100.00
        }
      ]
    };

    res.json(createApiResponse(analytics, "Relatórios carregados com sucesso"));
  } catch (error) {
    console.error("Event analytics error:", error);
    res.status(500).json(createApiError("Erro ao carregar relatórios", "INTERNAL_ERROR", error instanceof Error ? error.message : String(error)));
  }
});

export default router;