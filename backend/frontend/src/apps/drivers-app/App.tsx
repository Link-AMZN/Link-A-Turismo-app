import { Route, Switch } from "wouter";
import { Toaster } from "@/shared/components/ui/toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DriversHeader from "./components/DriversHeader";
import DriversMobileNav from "./components/DriversMobileNav";
import NotFound from "./pages/not-found";
import Dashboard from "./pages/dashboard";
import RoutePublisher from "./pages/route-publisher";
import MyOffers from "./pages/my-offers";
import Partnerships from "./pages/partnerships";
import Chat from "./pages/chat";
// ✅ ADICIONAR IMPORT DA PÁGINA DE VEÍCULOS
import VehiclesPage from "./pages/vehicles";

const queryClient = new QueryClient();

export default function DriversApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-50">
        <DriversHeader />
        
        <main className="pb-20 md:pb-0">
          <Switch>
            <Route path="/drivers" component={Dashboard} />
            <Route path="/drivers/publish" component={RoutePublisher} />
            <Route path="/drivers/offers" component={MyOffers} />
            <Route path="/drivers/partnerships" component={Partnerships} />
            <Route path="/drivers/chat" component={Chat} />
            {/* ✅ ADICIONAR ROTA DE VEÍCULOS */}
            <Route path="/drivers/vehicles" component={VehiclesPage} />
            <Route component={NotFound} />
          </Switch>
        </main>
        
        <DriversMobileNav />
        <Toaster />
      </div>
    </QueryClientProvider>
  );
}