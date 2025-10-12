import { Route, Switch, useRoute } from "wouter";  
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/shared/components/ui/toaster";
import HotelsHeader from "./components/HotelsHeader";
import HotelsMobileNav from "./components/HotelsMobileNav";
import Home from "./pages/home";
import HotelCreationWizardPage from "./pages/hotel-creation-wizard";
import RoomEdit from "./pages/rooms/RoomEdit";
import RoomDetails from "./pages/rooms/RoomDetails";
import RoomConfigure from "./pages/rooms/RoomConfigure";
import RoomList from "./pages/rooms/RoomList";
// Importações das novas páginas
import HotelEditPage from "../../components/hotel-management/HotelEditPage";
import HotelDetailsPage from "../../components/hotel-management/HotelDetailsPage";
import HotelConfigurePage from "../../components/hotel-management/HotelConfigurePage";
// ⭐ NOVA IMPORTACAO
import HotelManagementPage from "./pages/HotelManagementPage";

// ✅ ADICIONADO: Importações das páginas de eventos
import EventList from "./pages/events/EventList";
import EventCreate from "./pages/events/EventCreate";
import EventEdit from "./pages/events/EventEdit";
import EventDetails from "./pages/events/EventDetails";

const queryClient = new QueryClient();

export default function HotelsApp() {
  // ⭐⭐ DEBUG: Verificar se as rotas estão sendo capturadas
  const [matchManageHotel, paramsManageHotel] = useRoute("/hotels/manage-hotel/:hotelId");
  const [matchHotelsRest, paramsHotelsRest] = useRoute("/hotels/:rest*");
  
  console.log("🔍 HotelsApp Debug:");
  console.log("📍 Rota /hotels/manage-hotel/:hotelId - Match:", matchManageHotel);
  console.log("📍 Rota /hotels/manage-hotel/:hotelId - Params:", paramsManageHotel);
  console.log("📍 Rota /hotels/:rest* - Match:", matchHotelsRest);
  console.log("📍 Rota /hotels/:rest* - Params:", paramsHotelsRest);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-50">
        <HotelsHeader />
        <main className="pb-20 md:pb-0">
          <Switch>
            {/* Rota de criação de hotel */}
            <Route path="/hotels/create" component={HotelCreationWizardPage} />

            {/* ⭐⭐ ROTA CORRIGIDA: Gestão de Quartos do Hotel */}
            <Route path="/hotels/manage-hotel/:hotelId">
              {(params) => {
                console.log("🎯 HotelManagementPage RENDERIZADA com params:", params);
                return <HotelManagementPage />;
              }}
            </Route>

            {/* ✅ ADICIONADO: Rotas de Eventos */}
            <Route path="/events" component={EventList} />
            <Route path="/events/create" component={EventCreate} />
            <Route path="/events/edit/:eventId" component={EventEdit} />
            <Route path="/events/:eventId" component={EventDetails} />

            {/* Novas rotas de hotéis */}
            <Route path="/hotels/:id/edit" component={HotelEditPage} />
            <Route path="/hotels/:id/configure" component={HotelConfigurePage} />
            <Route path="/hotels/:id" component={HotelDetailsPage} />

            {/* ⭐ CORRIGIDO: Rotas de quartos sem accommodationId hardcoded */}
            <Route path="/rooms" component={RoomList} />
            <Route path="/rooms/edit/:roomId" component={RoomEdit} />
            <Route path="/rooms/details/:roomId" component={RoomDetails} />
            <Route path="/rooms/configure/:roomId?" component={RoomConfigure} />

            {/* Rotas principais de hotéis */}
            <Route path="/hotels" component={Home} />

            {/* Rota fallback */}
            <Route component={Home} />
          </Switch>
        </main>

        <HotelsMobileNav />
        <Toaster />
      </div>
    </QueryClientProvider>
  );
}