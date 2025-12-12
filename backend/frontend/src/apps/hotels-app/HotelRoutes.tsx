// src/apps/hotels-app/HotelRoutes.tsx - VERSÃO FINAL SIMPLIFICADA
import { Route } from 'wouter';

// Importar páginas
import HotelsHome from './pages/home';
import HotelDetailsPage from './pages/[hotelId]';
import HotelDashboard from './pages/dashboard/HotelDashboard';
import HotelCreatePage from './pages/create/HotelCreatePage';
import HotelEditPage from './pages/[hotelId]/edit/HotelEditPage';

import RoomTypeListPage from './pages/[hotelId]/room-types/RoomTypeListPage';
import RoomTypeCreatePage from './pages/[hotelId]/room-types/create/RoomTypeCreatePage';
import RoomTypeEditPage from './pages/[hotelId]/room-types/edit/RoomTypeEditPage';
import RoomTypeDetailsPage from './pages/[hotelId]/room-types/[roomTypeId]/RoomTypeDetailsPage';

import EventSpaceListPage from './pages/[hotelId]/event-spaces/EventSpaceListPage';
import EventSpaceCreatePage from './pages/[hotelId]/event-spaces/create/EventSpaceCreatePage';
import EventSpaceEditPage from './pages/[hotelId]/event-spaces/edit/EventSpaceEditPage';
import EventSpaceDetailsPage from './pages/[hotelId]/event-spaces/[eventSpaceId]/EventSpaceDetailsPage';

import AvailabilityPage from './pages/[hotelId]/availability/AvailabilityPage';
import BookingListPage from './pages/bookings/BookingListPage';
import BookingDetailsPage from './pages/bookings/[bookingId]/BookingDetailsPage';
import BookingCreatePage from './pages/bookings/create/BookingCreatePage';
import AnalyticsPage from './pages/analytics/AnalyticsPage';
import ReportsPage from './pages/analytics/ReportsPage';
import HotelSettingsPage from './pages/settings/HotelSettingsPage';
import AccountSettingsPage from './pages/settings/AccountSettingsPage';
import BillingPage from './pages/settings/BillingPage';

export default function HotelRoutes() {
  console.log('🏨 HotelRoutes carregado');
  
  return (
    <>
      {/* ⭐⭐ ORDEM CRÍTICA: Mais específicas primeiro! ⭐⭐ */}
      
      {/* ========== ROTA DEBUG ========== */}
      <Route path="/hotels/debug">
        {() => (
          <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-xl shadow-lg p-8 border-2 border-blue-300">
                <h1 className="text-3xl font-bold text-blue-700 mb-6">✅ Sistema de Rotas Hoteleiro</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-bold text-blue-800 mb-2">Páginas SEM selector:</h3>
                    <ul className="space-y-1 text-sm">
                      <li>• /hotels/:hotelId (dashboard específico)</li>
                      <li>• /hotels/:hotelId/room-types</li>
                      <li>• /hotels/:hotelId/edit</li>
                      <li>• /hotels/:hotelId/availability</li>
                      <li>• /hotels/:hotelId/room-types/create</li>
                      <li>• /hotels/:hotelId/room-types/:roomTypeId</li>
                      <li>• /hotels/:hotelId/room-types/:roomTypeId/edit</li>
                    </ul>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h3 className="font-bold text-green-800 mb-2">Páginas COM selector:</h3>
                    <ul className="space-y-1 text-sm">
                      <li>✅ /hotels (home principal)</li>
                      <li>✅ /hotels/dashboard (global)</li>
                      <li>✅ /hotels/analytics</li>
                      <li>✅ /hotels/bookings</li>
                      <li>✅ /hotels/create</li>
                      <li>✅ /hotels/settings</li>
                    </ul>
                  </div>
                </div>
                <div className="space-y-3">
                  <a 
                    href="/hotels" 
                    className="inline-block px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
                  >
                    Ir para Home (COM selector)
                  </a>
                  <a 
                    href="/hotels/test-id" 
                    className="inline-block px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 ml-3"
                  >
                    Ir para Dashboard Hotel (SEM selector)
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </Route>
      
      {/* ========== ROTAS SEM hotelId ========== */}
      {/* Dashboard Global - COM selector */}
      <Route path="/hotels/dashboard">
        <PageContainer>
          <HotelDashboard />
        </PageContainer>
      </Route>
      
      {/* Criar Hotel - COM selector */}
      <Route path="/hotels/create">
        <PageContainer>
          <HotelCreatePage />
        </PageContainer>
      </Route>
      
      {/* Reservas - COM selector */}
      <Route path="/hotels/bookings/create">
        <PageContainer>
          <BookingCreatePage />
        </PageContainer>
      </Route>
      
      <Route path="/hotels/bookings/:bookingId">
        <PageContainer>
          <BookingDetailsPage />
        </PageContainer>
      </Route>
      
      <Route path="/hotels/bookings">
        <PageContainer>
          <BookingListPage />
        </PageContainer>
      </Route>
      
      {/* Análises - COM selector */}
      <Route path="/hotels/analytics/reports">
        <PageContainer>
          <ReportsPage />
        </PageContainer>
      </Route>
      
      <Route path="/hotels/analytics">
        <PageContainer>
          <AnalyticsPage />
        </PageContainer>
      </Route>
      
      {/* Configurações - COM selector */}
      <Route path="/hotels/settings/account">
        <PageContainer>
          <AccountSettingsPage />
        </PageContainer>
      </Route>
      
      <Route path="/hotels/settings/billing">
        <PageContainer>
          <BillingPage />
        </PageContainer>
      </Route>
      
      <Route path="/hotels/settings">
        <PageContainer>
          <HotelSettingsPage />
        </PageContainer>
      </Route>
      
      {/* ========== ROTAS COM hotelId ========== */}
      {/* ⭐ MAIS ESPECÍFICAS PRIMEIRO! ⭐ */}
      
      {/* Room Type Edit - SEM selector */}
      <Route path="/hotels/:hotelId/room-types/:roomTypeId/edit">
        <PageContainer>
          <RoomTypeEditPage />
        </PageContainer>
      </Route>
      
      {/* Room Type Details - SEM selector */}
      <Route path="/hotels/:hotelId/room-types/:roomTypeId">
        <PageContainer>
          <RoomTypeDetailsPage />
        </PageContainer>
      </Route>
      
      {/* Criar Room Type - SEM selector */}
      <Route path="/hotels/:hotelId/room-types/create">
        <PageContainer>
          <RoomTypeCreatePage />
        </PageContainer>
      </Route>
      
      {/* Listar Room Types - SEM selector */}
      <Route path="/hotels/:hotelId/room-types">
        <PageContainer>
          <RoomTypeListPage />
        </PageContainer>
      </Route>
      
      {/* Event Space Edit - SEM selector */}
      <Route path="/hotels/:hotelId/event-spaces/:eventSpaceId/edit">
        <PageContainer>
          <EventSpaceEditPage />
        </PageContainer>
      </Route>
      
      {/* Event Space Details - SEM selector */}
      <Route path="/hotels/:hotelId/event-spaces/:eventSpaceId">
        <PageContainer>
          <EventSpaceDetailsPage />
        </PageContainer>
      </Route>
      
      {/* Criar Event Space - SEM selector */}
      <Route path="/hotels/:hotelId/event-spaces/create">
        <PageContainer>
          <EventSpaceCreatePage />
        </PageContainer>
      </Route>
      
      {/* Listar Event Spaces - SEM selector */}
      <Route path="/hotels/:hotelId/event-spaces">
        <PageContainer>
          <EventSpaceListPage />
        </PageContainer>
      </Route>
      
      {/* Disponibilidade - SEM selector */}
      <Route path="/hotels/:hotelId/availability">
        <PageContainer>
          <AvailabilityPage />
        </PageContainer>
      </Route>
      
      {/* Editar Hotel - SEM selector */}
      <Route path="/hotels/:hotelId/edit">
        <PageContainer>
          <HotelEditPage />
        </PageContainer>
      </Route>
      
      {/* Dashboard Específico do Hotel - SEM SELECTOR! */}
      <Route path="/hotels/:hotelId">
        <PageContainer>
          <HotelDetailsPage />
        </PageContainer>
      </Route>
      
      {/* ========== ROTA HOME (DEVE SER A ÚLTIMA!) ========== */}
      {/* COM SELECTOR! */}
      <Route path="/hotels">
        <PageContainer>
          <HotelsHome />
        </PageContainer>
      </Route>
      
      {/* ========== ROTA 404 ========== */}
      <Route path="/hotels/:rest*">
        {() => (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center border-2 border-red-300">
              <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center bg-red-100 rounded-full">
                <span className="text-3xl">❌</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">404 - Página não encontrada</h2>
              <p className="text-gray-600 mb-6">
                Esta página não existe no sistema hoteleiro.
              </p>
              <div className="space-y-3">
                <a 
                  href="/hotels" 
                  className="block w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
                >
                  Ir para Home (COM selector)
                </a>
                <a 
                  href="/hotels/debug" 
                  className="block w-full px-4 py-3 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700"
                >
                  Página de Debug
                </a>
              </div>
            </div>
          </div>
        )}
      </Route>
    </>
  );
}

// Container genérico para todas as páginas
function PageContainer({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-gray-50">{children}</div>;
}