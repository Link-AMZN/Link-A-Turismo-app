import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/shared/hooks/useAuth";
import { Button } from "@/shared/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu";
import { Menu, UserCircle, LogOut, Settings, Car, Plus, MessageCircle, TrendingUp, Wrench } from "lucide-react";

export default function DriversHeader() {
  const { user, signOut } = useAuth();
  const [location] = useLocation();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  // ✅ CORREÇÃO: Função para obter o nome de exibição seguro
  const getDisplayName = () => {
    if (!user) return '';
    
    // Tenta diferentes propriedades possíveis
    return (user as any).displayName || 
           (user as any).name || 
           user.email?.split('@')[0] || 
           user.email || 
           'Utilizador';
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo e Nome */}
        <div className="flex items-center space-x-3">
          <Link href="/drivers" className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 text-white">
              <Car className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Link-A</h1>
              <p className="text-xs text-gray-500 -mt-1">Motoristas</p>
            </div>
          </Link>
        </div>

        {/* Navegação Desktop */}
        <nav className="hidden md:flex items-center space-x-1">
          <Link href="/drivers">
            <Button 
              variant={location === "/drivers" ? "default" : "ghost"} 
              size="sm"
              className="h-9"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
          </Link>
          <Link href="/drivers/publish">
            <Button 
              variant={location.startsWith("/drivers/publish") ? "default" : "ghost"} 
              size="sm"
              className="h-9"
            >
              <Plus className="h-4 w-4 mr-2" />
              Publicar Rota
            </Button>
          </Link>
          <Link href="/drivers/offers">
            <Button 
              variant={location.startsWith("/drivers/offers") ? "default" : "ghost"} 
              size="sm"
              className="h-9"
            >
              <Car className="h-4 w-4 mr-2" />
              Minhas Ofertas
            </Button>
          </Link>
          {/* ✅ ADICIONAR LINK PARA VEÍCULOS */}
          <Link href="/drivers/vehicles">
            <Button 
              variant={location.startsWith("/drivers/vehicles") ? "default" : "ghost"} 
              size="sm"
              className="h-9"
            >
              <Wrench className="h-4 w-4 mr-2" />
              Meus Veículos
            </Button>
          </Link>
          <Link href="/drivers/partnerships">
            <Button 
              variant={location.startsWith("/drivers/partnerships") ? "default" : "ghost"} 
              size="sm"
              className="h-9"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Parcerias
            </Button>
          </Link>
          <Link href="/drivers/chat">
            <Button 
              variant={location.startsWith("/drivers/chat") ? "default" : "ghost"} 
              size="sm"
              className="h-9"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Chat
            </Button>
          </Link>
        </nav>

        {/* Menu do Utilizador */}
        <div className="flex items-center space-x-3">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                  <UserCircle className="h-5 w-5" />
                  {/* ✅ CORREÇÃO: Usar função segura para display name */}
                  <span className="hidden sm:inline text-sm">{getDisplayName()}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  Configurações
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/login">
              <Button size="sm">
                Entrar
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}