import { Link, useLocation } from "wouter";
import { Button } from "@/shared/components/ui/button";
import { TrendingUp, Plus, Car, MessageCircle, Home, Wrench } from "lucide-react";

export default function DriversMobileNav() {
  const [location] = useLocation();

  const navItems = [
    {
      href: "/drivers",
      icon: TrendingUp,
      label: "Dashboard",
      active: location === "/drivers"
    },
    {
      href: "/drivers/publish",
      icon: Plus,
      label: "Publicar",
      active: location.startsWith("/drivers/publish")
    },
    {
      href: "/drivers/offers",
      icon: Car,
      label: "Ofertas",
      active: location.startsWith("/drivers/offers")
    },
    // ✅ ADICIONAR ITEM DE VEÍCULOS
    {
      href: "/drivers/vehicles",
      icon: Wrench,
      label: "Veículos",
      active: location.startsWith("/drivers/vehicles")
    },
    {
      href: "/drivers/chat",
      icon: MessageCircle,
      label: "Chat",
      active: location.startsWith("/drivers/chat")
    },
    {
      href: "/",
      icon: Home,
      label: "Voltar",
      active: false
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 md:hidden">
      <div className="grid grid-cols-6 h-16"> {/* ✅ MUDAR PARA grid-cols-6 */}
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant="ghost"
                size="sm"
                className={`h-full w-full flex flex-col items-center justify-center space-y-1 rounded-none ${
                  item.active 
                    ? "text-blue-600 bg-blue-50" 
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </Button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}