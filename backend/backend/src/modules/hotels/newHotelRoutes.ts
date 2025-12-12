// src/modules/hotels/newHotelRoutes.ts - VERSÃO CORRIGIDA COMPLETA

import { Router } from 'express';
import { 
  searchHotels,
  getHotelById,
  getHotelRoomTypes,
  getHotelStats,
  createHotel,
  bulkUpdateAvailability,
  getAvailability,
  getQuickAvailability,
  createBooking,
  getBookingDetails,
  cancelBooking,
  getMyBookings,
  getAllHotels,
  updateHotel,
  deactivateHotel,
  createRoomType,
  getRoomTypeById,
  updateRoomType,
  deleteRoomType,
  getHotelPerformance,
  healthCheck,
  validateUUID,
  validate,
  createHotelSchema,
  createRoomTypeSchema,
  bulkAvailabilitySchema,
  createBookingSchema,
  updateHotelSchema,
  updateRoomTypeSchema,
  searchHotelsSchema,
  testRoute
} from './newHotelController';
import { authenticate } from '../../../middleware/role-auth';

const router = Router();

// ====================== DEBUG ======================
console.log('🛣️  newHotelRoutes.ts CARREGADO - VERSÃO CORRIGIDA');

// ====================== ROTAS PÚBLICAS ======================

// 1. Health check - SEMPRE PRIMEIRO
router.get('/health', healthCheck);

// 2. Rotas de teste (debug) - REMOVIDAS getAvailabilityTest
router.get('/test', testRoute);

// ====================== ROTAS DE BUSCA E DISPONIBILIDADE ======================

// 3. Busca de hotéis - PÚBLICA
router.get('/search', searchHotels);

// 4. Disponibilidade - PÚBLICA (NÃO TEM PARÂMETROS NA ROTA!)
router.get('/availability', getAvailability);
router.get('/availability/quick', getQuickAvailability);

// 5. Listagem de hotéis - PÚBLICA
router.get('/', getAllHotels);

// 6. Minhas reservas - PÚBLICA (usa query params)
router.get('/my-bookings', getMyBookings);

// ====================== ROTAS COM PARÂMETROS ======================

// 7. Hotel específico - PÚBLICA
router.get('/:hotelId', validateUUID('hotelId'), getHotelById);

// 8. Room types de um hotel - PÚBLICA
router.get('/:hotelId/room-types', validateUUID('hotelId'), getHotelRoomTypes);

// 9. Estatísticas do hotel - PÚBLICA
router.get('/:hotelId/stats', validateUUID('hotelId'), getHotelStats);

// 10. Performance do hotel - PROTEGIDA
router.get('/:hotelId/performance', 
  authenticate('hotel_manager'), 
  validateUUID('hotelId'), 
  getHotelPerformance
);

// ====================== ROTAS DE RESERVAS ======================

// 11. Criar reserva - PÚBLICA (qualquer um pode reservar)
router.post('/bookings', validate(createBookingSchema), createBooking);

// 12. Detalhes da reserva - PÚBLICA
router.get('/bookings/:bookingId', validateUUID('bookingId'), getBookingDetails);

// 13. Cancelar reserva - PÚBLICA
router.post('/bookings/:bookingId/cancel', validateUUID('bookingId'), cancelBooking);

// ====================== ROTAS PROTEGIDAS (HOTEL MANAGER) ======================

// 14. Criar hotel - PROTEGIDA
router.post('/', 
  authenticate('hotel_manager'), 
  validate(createHotelSchema), 
  createHotel
);

// 15. Atualizar hotel - PROTEGIDA
router.put('/:hotelId', 
  authenticate('hotel_manager'), 
  validateUUID('hotelId'), 
  validate(updateHotelSchema), 
  updateHotel
);

// 16. Desativar hotel - PROTEGIDA
router.delete('/:hotelId', 
  authenticate('hotel_manager'), 
  validateUUID('hotelId'), 
  deactivateHotel
);

// 17. Criar room type - PROTEGIDA
router.post('/:hotelId/room-types', 
  authenticate('hotel_manager'), 
  validateUUID('hotelId'), 
  validate(createRoomTypeSchema), 
  createRoomType
);

// 18. Atualizar disponibilidade em massa - CORREÇÃO IMPORTANTE ⚠️
// Rota antiga (incorreta): /:hotelId/room-types/:roomTypeId/availability/bulk
// Rota nova (correta): /:hotelId/availability/bulk (roomTypeId vem no body)
router.post('/:hotelId/availability/bulk', 
  authenticate('hotel_manager'), 
  validateUUID('hotelId'), 
  validate(bulkAvailabilitySchema), 
  bulkUpdateAvailability
);

// ====================== ROTAS DE ROOM TYPES INDIVIDUAIS ======================

// 19. Obter room type por ID - PÚBLICA
router.get('/room-types/:roomTypeId', validateUUID('roomTypeId'), getRoomTypeById);

// 20. Atualizar room type - PROTEGIDA
router.put('/room-types/:roomTypeId', 
  authenticate('hotel_manager'), 
  validateUUID('roomTypeId'), 
  validate(updateRoomTypeSchema), 
  updateRoomType
);

// 21. Deletar room type - PROTEGIDA
router.delete('/room-types/:roomTypeId', 
  authenticate('hotel_manager'), 
  validateUUID('roomTypeId'), 
  deleteRoomType
);

// ====================== ROTA FALLBACK ======================

// 19. Rota para debug de 404s
router.use('*', (req, res) => {
  console.log('🔍 ROTA NÃO ENCONTRADA - FALLBACK:', req.originalUrl);
  console.log('📋 Método:', req.method);
  console.log('📋 Parâmetros:', req.params);
  console.log('📋 Query:', req.query);
  
  res.status(404).json({
    success: false,
    error: 'Rota não encontrada',
    path: req.originalUrl,
    method: req.method,
    availableRoutes: [
      'GET /api/v2/hotels/health',
      'GET /api/v2/hotels/test',
      'GET /api/v2/hotels/search',
      'GET /api/v2/hotels/availability',
      'GET /api/v2/hotels/availability/quick',
      'GET /api/v2/hotels',
      'GET /api/v2/hotels/:hotelId',
      'GET /api/v2/hotels/:hotelId/room-types',
      'GET /api/v2/hotels/:hotelId/stats',
      'GET /api/v2/hotels/:hotelId/performance',
      'POST /api/v2/hotels/bookings',
      'GET /api/v2/hotels/bookings/:bookingId',
      'POST /api/v2/hotels/bookings/:bookingId/cancel',
      'GET /api/v2/hotels/my-bookings',
      'POST /api/v2/hotels',
      'PUT /api/v2/hotels/:hotelId',
      'DELETE /api/v2/hotels/:hotelId',
      'POST /api/v2/hotels/:hotelId/room-types',
      'POST /api/v2/hotels/:hotelId/availability/bulk',
      'GET /api/v2/hotels/room-types/:roomTypeId',
      'PUT /api/v2/hotels/room-types/:roomTypeId',
      'DELETE /api/v2/hotels/room-types/:roomTypeId'
    ]
  });
});

export { router as newHotelRoutes };

// Log para debug
console.log('✅ Rotas configuradas:');
console.log('  GET  /api/v2/hotels/health');
console.log('  GET  /api/v2/hotels/test');
console.log('  GET  /api/v2/hotels/search');
console.log('  GET  /api/v2/hotels/availability');
console.log('  GET  /api/v2/hotels/availability/quick');
console.log('  GET  /api/v2/hotels');
console.log('  GET  /api/v2/hotels/:hotelId');
console.log('  GET  /api/v2/hotels/:hotelId/room-types');
console.log('  GET  /api/v2/hotels/:hotelId/stats');
console.log('  GET  /api/v2/hotels/:hotelId/performance');
console.log('  POST /api/v2/hotels/bookings');
console.log('  GET  /api/v2/hotels/bookings/:bookingId');
console.log('  POST /api/v2/hotels/bookings/:bookingId/cancel');
console.log('  GET  /api/v2/hotels/my-bookings');
console.log('  POST /api/v2/hotels');
console.log('  PUT  /api/v2/hotels/:hotelId');
console.log('  DELETE /api/v2/hotels/:hotelId');
console.log('  POST /api/v2/hotels/:hotelId/room-types');
console.log('  POST /api/v2/hotels/:hotelId/availability/bulk');
console.log('  GET  /api/v2/hotels/room-types/:roomTypeId');
console.log('  PUT  /api/v2/hotels/room-types/:roomTypeId');
console.log('  DELETE /api/v2/hotels/room-types/:roomTypeId');