import { Router } from "express";
import { storage } from "./storage";
import { verifyFirebaseToken, type AuthenticatedRequest } from "./src/shared/firebaseAuth";
// ✅ ADICIONE ESTAS IMPORTAÇÕES
import { 
  getAccommodations, 
  getAccommodationById, 
  getRoomsByHotelId 
} from "./src/modules/hotels/hotelService";
// ✅ IMPORTE O SERVIÇO OFICIAL DE MATCHING E SUA FUNÇÃO DE CONVERSÃO
import { SmartRideMatchingService, type RideWithMatching } from "./services/SmartRideMatchingService";

const router = Router();

// 🎯 INTERFACE COMPATÍVEL PARA RIDES
interface RideWithDetails {
  id: string;
  driverId: string;
  driverName?: string;
  fromLocation: string;
  toLocation: string;
  fromAddress?: string;
  toAddress?: string;
  fromProvince?: string;
  toProvince?: string;
  price: number;
  pricePerSeat?: number;
  availableSeats: number;
  maxPassengers: number;
  departureDate: Date;
  estimatedDuration?: number;
  estimatedDistance?: number;
  vehicleType?: string;
  vehicleInfo?: string;
  vehicleFeatures?: string[];
  driverRating?: number;
  allowNegotiation?: boolean;
  isVerifiedDriver?: boolean;
  status: string;
  matchScore?: number;
  matchType?: string;
  matchDescription?: string;
}

// 🚀 ENHANCED RIDE SEARCH WITH SMART MATCHING - ATUALIZADO PARA USAR FUNÇÃO INTELIGENTE
router.get("/rides", async (req, res) => {
  try {
    const { 
      from, 
      to, 
      departureDate,
      minPrice,
      maxPrice,
      vehicleType,
      seats,
      allowNegotiation,
      driverId,
      smartSearch = 'true',
      radiusKm = '100',
      maxResults = '50'
    } = req.query;

    if (!from || !to) {
      return res.status(400).json({ 
        error: "Origem e destino são obrigatórios",
        details: "Os parâmetros 'from' e 'to' devem ser fornecidos"
      });
    }

    let rides: RideWithDetails[] = [];
    
    // 🚀 BUSCA INTELIGENTE ATIVADA - USANDO FUNÇÃO get_rides_smart_final
    if (smartSearch === 'true') {
      try {
        console.log(`🔍 BUSCA INTELIGENTE: ${from} → ${to}`);
        
        // ✅✅✅ CORREÇÃO: Usar a função inteligente atualizada do rideService
        const smartRides = await SmartRideMatchingService.searchRidesSmart(
          from as string,
          to as string,
          Number(radiusKm),
          Number(maxResults)
        );
        
        // ✅ Converter para o formato RideWithDetails
        rides = smartRides.map((matchingRide: RideWithMatching) => {
          const ride = matchingRide.ride || matchingRide;
          
          return {
            id: matchingRide.id || ride.id || ride.ride_id,
            driverId: matchingRide.driver_id || ride.driverId || ride.driver_id,
            driverName: matchingRide.driver_name || ride.driverName || ride.driver_name || 'Motorista',
            fromLocation: matchingRide.from_city || ride.fromCity || ride.from_city || from as string,
            toLocation: matchingRide.to_city || ride.toCity || ride.to_city || to as string,
            fromAddress: matchingRide.from_city || ride.fromCity || ride.from_city || from as string,
            toAddress: matchingRide.to_city || ride.toCity || ride.to_city || to as string,
            fromProvince: matchingRide.fromProvince || ride.fromProvince,
            toProvince: matchingRide.toProvince || ride.toProvince,
            price: matchingRide.priceperseat || ride.pricePerSeat || ride.priceperseat || 0,
            pricePerSeat: matchingRide.priceperseat || ride.pricePerSeat || ride.priceperseat,
            availableSeats: matchingRide.availableseats || ride.availableSeats || ride.availableseats || 0,
            maxPassengers: matchingRide.max_passengers || ride.maxPassengers || ride.max_passengers || 4,
            departureDate: matchingRide.departuredate ? new Date(matchingRide.departuredate) : 
                         ride.departureDate ? new Date(ride.departureDate) : new Date(),
            estimatedDuration: ride.estimatedDuration,
            estimatedDistance: ride.estimatedDistance,
            vehicleType: matchingRide.vehicle_type || ride.vehicleType || ride.vehicle_type,
            vehicleInfo: ride.vehicleInfo,
            vehicleFeatures: ride.vehicleFeatures || [],
            driverRating: matchingRide.driver_rating || ride.driverRating || ride.driver_rating,
            allowNegotiation: ride.allowNegotiation || false,
            isVerifiedDriver: ride.isVerifiedDriver || false,
            status: ride.status || 'available',
            matchScore: matchingRide.compatibilityScore || matchingRide.direction_score,
            matchType: matchingRide.matchType,
            matchDescription: matchingRide.matchDescription
          };
        });

        console.log(`✅ Encontrados ${rides.length} rides compatíveis via função inteligente`);

      } catch (error) {
        console.error("❌ Erro na busca inteligente:", error);
        // ✅ FALLBACK: Tentar busca tradicional
        try {
          console.log("🔄 Tentando fallback para busca tradicional...");
          const searchCriteria = {
            fromLocation: from as string,
            toLocation: to as string,
            departureDate: departureDate ? new Date(departureDate as string) : undefined,
            minSeats: seats ? parseInt(seats as string) : undefined,
            maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined
          };
          
          const dbRides = await storage.ride.searchRides(searchCriteria);
          
          rides = dbRides.map((ride: any) => ({
            id: ride.id,
            driverId: ride.driverId,
            driverName: ride.driver?.firstName + ' ' + ride.driver?.lastName,
            fromLocation: ride.fromLocation,
            toLocation: ride.toLocation,
            fromAddress: ride.fromLocation,
            toAddress: ride.toLocation,
            fromProvince: ride.fromProvince,
            toProvince: ride.toProvince,
            price: ride.pricePerSeat || ride.price || 0,
            pricePerSeat: ride.pricePerSeat,
            availableSeats: ride.availableSeats || 0,
            maxPassengers: ride.maxPassengers || 4,
            departureDate: ride.departureDate ? new Date(ride.departureDate) : new Date(),
            estimatedDuration: ride.estimatedDuration,
            estimatedDistance: ride.estimatedDistance,
            vehicleType: ride.vehicleType,
            vehicleInfo: ride.vehicleInfo,
            vehicleFeatures: ride.vehicleFeatures || [],
            driverRating: ride.driver?.rating,
            allowNegotiation: ride.allowNegotiation || false,
            isVerifiedDriver: ride.driver?.isVerified || false,
            status: ride.status || 'active'
          }));
          
          console.log(`✅ Fallback: ${rides.length} rides encontrados`);
        } catch (fallbackError) {
          console.error("❌ Erro no fallback também:", fallbackError);
          rides = [];
        }
      }
    } else {
      // ❌ BUSCA TRADICIONAL DESATIVADA - apenas busca inteligente
      console.log(`🔍 BUSCA TRADICIONAL DESATIVADA - usando apenas busca inteligente`);
      rides = [];
    }

    // Aplicar filtros adicionais
    let filteredRides = rides;

    if (minPrice) {
      filteredRides = filteredRides.filter(ride => ride.price >= Number(minPrice));
    }

    if (maxPrice) {
      filteredRides = filteredRides.filter(ride => ride.price <= Number(maxPrice));
    }

    if (seats) {
      filteredRides = filteredRides.filter(ride => ride.availableSeats >= Number(seats));
    }

    if (allowNegotiation === 'true') {
      filteredRides = filteredRides.filter(ride => ride.allowNegotiation);
    }

    if (vehicleType) {
      filteredRides = filteredRides.filter(ride => 
        ride.vehicleType?.toLowerCase().includes((vehicleType as string).toLowerCase())
      );
    }

    if (driverId) {
      filteredRides = filteredRides.filter(ride => ride.driverId === driverId);
    }

    // 📊 ESTATÍSTICAS DE MATCHING ATUALIZADAS
    const matchStats = {
      exact_match: filteredRides.filter((r: RideWithDetails) => r.matchType === 'exact_match').length,
      exact_province: filteredRides.filter((r: RideWithDetails) => r.matchType === 'exact_province').length,
      from_correct_province_to: filteredRides.filter((r: RideWithDetails) => r.matchType === 'from_correct_province_to').length,
      to_correct_province_from: filteredRides.filter((r: RideWithDetails) => r.matchType === 'to_correct_province_from').length,
      partial_from: filteredRides.filter((r: RideWithDetails) => r.matchType === 'partial_from').length,
      partial_to: filteredRides.filter((r: RideWithDetails) => r.matchType === 'partial_to').length,
      nearby: filteredRides.filter((r: RideWithDetails) => r.matchType === 'nearby').length,
      total: filteredRides.length
    };

    res.json({
      success: true,
      rides: filteredRides,
      matchStats,
      searchParams: {
        from,
        to,
        departureDate,
        smartSearch: smartSearch === 'true',
        radiusKm: Number(radiusKm),
        maxResults: Number(maxResults),
        appliedFilters: {
          minPrice: minPrice ? Number(minPrice) : null,
          maxPrice: maxPrice ? Number(maxPrice) : null,
          seats: seats ? Number(seats) : null,
          allowNegotiation: allowNegotiation === 'true',
          vehicleType: vehicleType || null,
          driverId: driverId || null
        }
      },
      total: filteredRides.length,
      smart_function_used: smartSearch === 'true'
    });
  } catch (error) {
    console.error("Error searching rides:", error);
    res.status(500).json({ 
      error: "Erro ao pesquisar viagens",
      message: "Tente novamente mais tarde" 
    });
  }
});

// ✅ ATUALIZADO: Enhanced Accommodation Search - AGORA COM DADOS REAIS
router.get("/accommodations", async (req, res) => {
  try {
    const { 
      location, 
      checkIn, 
      checkOut, 
      guests,
      minPrice,
      maxPrice,
      amenities,
      accommodationType
    } = req.query;

    console.log("🎯 SEARCH: Buscando acomodações reais com filtros:", req.query);

    // Filtros básicos - apenas hotéis disponíveis
    const filters: any = {
      isAvailable: true
    };

    if (location) {
      filters.address = location;
    }
    if (accommodationType) {
      filters.type = accommodationType;
    }

    // Buscar hotéis reais do banco
    let hotels = await getAccommodations(filters);
    
    // Buscar informações de quartos para cada hotel
    const hotelsWithRooms = await Promise.all(
      hotels.map(async (hotel) => {
        try {
          const rooms = await getRoomsByHotelId(hotel.id);
          const availableRooms = rooms.filter(room => 
            room.isAvailable && room.status === 'available'
          );
          
          // Calcular preço mínimo entre quartos disponíveis
          const minPriceValue = availableRooms.length > 0 
            ? Math.min(...availableRooms.map(room => Number(room.pricePerNight || 0)))
            : null;

          // Verificar se tem as amenidades solicitadas
          const hotelAmenities = hotel.amenities || [];
          const meetsAmenityFilter = !amenities || 
            (amenities as string).split(',').every(amenity => 
              hotelAmenities.some(hotelAmenity => 
                hotelAmenity.toLowerCase().includes(amenity.toLowerCase())
              )
            );

          // Verificar capacidade de hóspedes
          const meetsGuestFilter = !guests || 
            availableRooms.some(room => room.maxOccupancy >= Number(guests));

          if (!meetsAmenityFilter || !meetsGuestFilter) {
            return null;
          }

          return {
            id: hotel.id,
            name: hotel.name,
            type: hotel.type,
            address: hotel.address,
            rating: hotel.rating,
            reviewCount: hotel.reviewCount,
            images: hotel.images || [],
            amenities: hotelAmenities,
            description: hotel.description,
            pricePerNight: minPriceValue,
            distanceFromCenter: hotel.distanceFromCenter,
            contactEmail: hotel.contactEmail,
            contactPhone: hotel.contactPhone,
            checkInTime: hotel.checkInTime,
            checkOutTime: hotel.checkOutTime,
            policies: hotel.policies,
            availableRooms: availableRooms.length,
            totalRooms: rooms.length,
            offerDriverDiscounts: hotel.offerDriverDiscounts,
            driverDiscountRate: hotel.driverDiscountRate,
            transportDiscount: hotel.transportDiscount,
            isVerified: true,
            partnershipBadgeVisible: hotel.partnershipBadgeVisible
          };
        } catch (error) {
          console.error(`❌ Erro ao buscar quartos do hotel ${hotel.id}:`, error);
          return null;
        }
      })
    );

    // Remover hotéis nulos e filtrar por preço
    let filteredHotels = hotelsWithRooms.filter((hotel): hotel is NonNullable<typeof hotel> => hotel !== null);

    // Aplicar filtro de preço
    if (minPrice) {
      filteredHotels = filteredHotels.filter(hotel => 
        hotel.pricePerNight && hotel.pricePerNight >= Number(minPrice)
      );
    }
    if (maxPrice) {
      filteredHotels = filteredHotels.filter(hotel => 
        hotel.pricePerNight && hotel.pricePerNight <= Number(maxPrice)
      );
    }

    console.log(`✅ SEARCH: Encontrados ${filteredHotels.length} hotéis reais`);

    res.json({
      success: true,
      accommodations: filteredHotels,
      searchParams: {
        location,
        checkIn,
        checkOut,
        guests: guests ? Number(guests) : null,
        appliedFilters: {
          minPrice: minPrice ? Number(minPrice) : null,
          maxPrice: maxPrice ? Number(maxPrice) : null,
          accommodationType,
          amenities: amenities ? (amenities as string).split(',') : null
        }
      },
      total: filteredHotels.length
    });

  } catch (error) {
    console.error("❌ SEARCH: Erro ao pesquisar hospedagens reais:", error);
    res.status(500).json({ 
      error: "Erro ao pesquisar hospedagens",
      message: "Tente novamente mais tarde" 
    });
  }
});

// ✅ NOVA ROTA: Detalhes de hotel específico
router.get("/accommodations/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log("🎯 SEARCH: Buscando detalhes do hotel:", id);

    // Buscar hotel real
    const hotel = await getAccommodationById(id);
    
    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel não encontrado"
      });
    }

    if (!hotel.isAvailable) {
      return res.status(404).json({
        success: false,
        message: "Hotel não está disponível para reservas"
      });
    }

    // Buscar quartos disponíveis
    const allRooms = await getRoomsByHotelId(id);
    const availableRooms = allRooms.filter(room => 
      room.isAvailable && room.status === 'available'
    );

    // Calcular preço mínimo
    const minPrice = availableRooms.length > 0 
      ? Math.min(...availableRooms.map(room => Number(room.pricePerNight || 0)))
      : null;

    // Preparar dados do hotel
    const hotelData = {
      id: hotel.id,
      name: hotel.name,
      type: hotel.type,
      address: hotel.address,
      rating: hotel.rating,
      reviewCount: hotel.reviewCount,
      images: hotel.images || [],
      amenities: hotel.amenities || [],
      description: hotel.description,
      lat: hotel.lat,
      lng: hotel.lng,
      distanceFromCenter: hotel.distanceFromCenter,
      contactEmail: hotel.contactEmail,
      contactPhone: hotel.contactPhone,
      checkInTime: hotel.checkInTime,
      checkOutTime: hotel.checkOutTime,
      policies: hotel.policies,
      minPrice,
      totalRooms: allRooms.length,
      availableRooms: availableRooms.length,
      offerDriverDiscounts: hotel.offerDriverDiscounts,
      driverDiscountRate: hotel.driverDiscountRate,
      transportDiscount: hotel.transportDiscount,
      isVerified: true
    };

    console.log(`✅ SEARCH: Detalhes do hotel ${hotel.name} carregados`);

    res.json({
      success: true,
      data: {
        hotel: hotelData,
        rooms: availableRooms
      }
    });

  } catch (error) {
    console.error("❌ SEARCH: Erro ao buscar detalhes do hotel:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor"
    });
  }
});

// Event Search with comprehensive filters
router.get("/events", async (req, res) => {
  try {
    const { 
      city, 
      month, 
      year, 
      category,
      eventType,
      isPaid,
      enablePartnerships,
      organizerId
    } = req.query;

    if (!city || !month || !year) {
      return res.status(400).json({ 
        error: "Cidade, mês e ano são obrigatórios",
        details: "Os parâmetros 'city', 'month' e 'year' devem ser fornecidos"
      });
    }

    // Mock comprehensive event data
    const mockEvents = [
      {
        id: "event_1",
        organizerId: "org_001",
        organizerName: "Associação Cultural Maputo",
        title: "Festival de Música Moçambicana",
        description: "Grande festival celebrando a música tradicional e moderna de Moçambique com artistas nacionais e internacionais.",
        eventType: "festival",
        category: "cultura",
        venue: "Estádio Nacional do Zimpeto",
        address: `${city}, Estádio Nacional`,
        startDate: `${year}-${String(month).padStart(2, '0')}-15`,
        endDate: `${year}-${String(month).padStart(2, '0')}-17`,
        startTime: "18:00",
        endTime: "23:00",
        isPaid: true,
        ticketPrice: 500.00,
        maxTickets: 5000,
        ticketsSold: 1250,
        enablePartnerships: true,
        accommodationDiscount: 20,
        transportDiscount: 15,
        images: [
          "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400",
          "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400"
        ],
        organizerContact: "+258 84 123 4567",
        organizerEmail: "cultura@maputo.mz",
        maxAttendees: 5000,
        currentAttendees: 1250,
        status: "approved",
        isFeatured: true,
        tags: ["música", "cultura", "festival", "artistas"],
        hasPartnerships: true
      },
      {
        id: "event_2",
        organizerId: "org_002", 
        organizerName: "Centro de Negócios Beira",
        title: "Conferência de Empreendedorismo Digital",
        description: "Evento focado em estratégias digitais para pequenas e médias empresas em Moçambique.",
        eventType: "conferencia",
        category: "negocios",
        venue: "Hotel VIP Executive Beira",
        address: `${city}, Centro da Cidade`,
        startDate: `${year}-${String(month).padStart(2, '0')}-08`,
        endDate: `${year}-${String(month).padStart(2, '0')}-08`,
        startTime: "09:00",
        endTime: "17:00",
        isPaid: true,
        ticketPrice: 750.00,
        maxTickets: 200,
        ticketsSold: 89,
        enablePartnerships: true,
        accommodationDiscount: 25,
        transportDiscount: 20,
        images: [
          "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400",
          "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=400"
        ],
        organizerContact: "+258 82 987 6543",
        organizerEmail: "eventos@negocios-beira.mz",
        maxAttendees: 200,
        currentAttendees: 89,
        status: "approved",
        isFeatured: false,
        tags: ["negócios", "empreendedorismo", "digital", "PME"],
        hasPartnerships: true
      },
      {
        id: "event_3",
        organizerId: "org_003",
        organizerName: "Produtora Festa Livre",
        title: "Noite de Marrabenta e Afrobeat",
        description: "Festa com os melhores DJs e bandas de marrabenta e afrobeat da região.",
        eventType: "festa",
        category: "entretenimento",
        venue: "Praia do Tofo",
        address: `${city}, Praia do Tofo`,
        startDate: `${year}-${String(month).padStart(2, '0')}-22`,
        endDate: `${year}-${String(month).padStart(2, '0')}-23`,
        startTime: "20:00",
        endTime: "04:00",
        isPaid: true,
        ticketPrice: 300.00,
        maxTickets: 1000,
        ticketsSold: 456,
        enablePartnerships: false,
        images: [
          "https://images.unsplash.com/photo-1571266028243-cdb221e9f4cb?w=400",
          "https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?w=400"
        ],
        organizerContact: "+258 86 555 1234",
        organizerEmail: "festa@praialivre.mz",
        maxAttendees: 1000,
        currentAttendees: 456,
        status: "approved",
        isFeatured: false,
        tags: ["festa", "marrabenta", "afrobeat", "praia"],
        hasPartnerships: false
      }
    ];

    // Apply filters
    let filteredEvents = mockEvents;

    if (category && category !== "") {
      filteredEvents = filteredEvents.filter(event => event.category === category);
    }

    if (eventType) {
      filteredEvents = filteredEvents.filter(event => event.eventType === eventType);
    }

    if (isPaid !== undefined) {
      const paidFilter = isPaid === 'true';
      filteredEvents = filteredEvents.filter(event => event.isPaid === paidFilter);
    }

    if (enablePartnerships === 'true') {
      filteredEvents = filteredEvents.filter(event => event.enablePartnerships);
    }

    if (organizerId) {
      filteredEvents = filteredEvents.filter(event => event.organizerId === organizerId);
    }

    res.json({
      success: true,
      events: filteredEvents,
      searchParams: {
        city,
        month: parseInt(month as string),
        year: parseInt(year as string),
        appliedFilters: {
          category,
          eventType,
          isPaid: isPaid ? isPaid === 'true' : null,
          enablePartnerships: enablePartnerships === 'true',
          organizerId
        }
      },
      total: filteredEvents.length,
      summary: {
        totalEvents: filteredEvents.length,
        paidEvents: filteredEvents.filter(e => e.isPaid).length,
        freeEvents: filteredEvents.filter(e => !e.isPaid).length,
        eventsWithPartnerships: filteredEvents.filter(e => e.enablePartnerships).length
      }
    });
  } catch (error) {
    console.error("Error searching events:", error);
    res.status(500).json({ 
      error: "Erro ao pesquisar eventos",
      message: "Tente novamente mais tarde" 
    });
  }
});

// Universal search endpoint (searches across all services)
router.get("/all", async (req, res) => {
  try {
    const { query, type } = req.query;

    if (!query) {
      return res.status(400).json({ 
        error: "Termo de pesquisa é obrigatório",
        details: "O parâmetro 'query' deve ser fornecido"
      });
    }

    const searchTerm = (query as string).toLowerCase();
    
    const results = {
      rides: [] as any[],
      accommodations: [] as any[],
      events: [] as any[],
      total: 0
    };

    // ✅✅✅ CORREÇÃO: Search rides usando função inteligente
    if (!type || type === 'rides') {
      try {
        console.log(`🔍 UNIVERSAL SEARCH: Buscando rides para "${searchTerm}"`);
        
        // Usar a função inteligente para buscar rides
        const smartRides = await SmartRideMatchingService.searchRidesSmart(
          searchTerm,
          '',
          100, // radiusKm
          10   // maxResults para pesquisa universal
        );
        
        results.rides = smartRides.slice(0, 5).map((ride: any) => ({
          id: ride.id || ride.ride_id,
          title: `${ride.from_city || ride.fromCity} → ${ride.to_city || ride.toCity}`,
          type: "ride",
          price: ride.priceperseat || ride.pricePerSeat || 0,
          description: `Viagem de ${ride.from_city || ride.fromCity} para ${ride.to_city || ride.toCity}`,
          driver: ride.driver_name || ride.driverName,
          vehicle: ride.vehicle_type || ride.vehicleType,
          departureDate: ride.departuredate || ride.departureDate,
          matchType: ride.match_type,
          directionScore: ride.direction_score
        }));
        
        console.log(`✅ UNIVERSAL SEARCH: ${results.rides.length} rides encontrados via função inteligente`);
      } catch (error) {
        console.error("❌ UNIVERSAL SEARCH: Erro ao buscar rides:", error);
        results.rides = [];
      }
    }

    // Search accommodations - AGORA COM DADOS REAIS
    if (!type || type === 'accommodations') {
      try {
        const hotels = await getAccommodations({ isAvailable: true });
        const matchingHotels = hotels.filter(hotel => 
          hotel.name.toLowerCase().includes(searchTerm) ||
          hotel.description?.toLowerCase().includes(searchTerm) ||
          hotel.address.toLowerCase().includes(searchTerm)
        );

        results.accommodations = matchingHotels.map(hotel => ({
          id: hotel.id,
          title: hotel.name,
          type: "accommodation",
          price: 0,
          description: hotel.description,
          address: hotel.address
        })).slice(0, 5);
      } catch (error) {
        console.error("Erro ao buscar acomodações reais:", error);
        results.accommodations = [];
      }
    }

    // Search events
    if (!type || type === 'events') {
      results.events = [
        {
          id: "event_search_1",
          title: "Festival de Música Moçambicana",
          type: "event",
          price: 500.00,
          description: "Grande festival de música tradicional"
        }
      ].filter(item => 
        item.title.toLowerCase().includes(searchTerm) ||
        item.description.toLowerCase().includes(searchTerm)
      ).slice(0, 5);
    }

    results.total = results.rides.length + results.accommodations.length + results.events.length;

    res.json({
      success: true,
      query: searchTerm,
      results,
      searchType: type || 'all',
      smart_search_used: true
    });
  } catch (error) {
    console.error("Error in universal search:", error);
    res.status(500).json({ 
      error: "Erro na pesquisa",
      message: "Tente novamente mais tarde" 
    });
  }
});

export default router;