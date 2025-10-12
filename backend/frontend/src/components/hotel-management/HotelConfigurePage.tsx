import React, { useState } from 'react';
import { useRoute } from "wouter";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { ArrowLeft, Settings, Bed, Handshake, Users, Star, Clock, Image, FileText } from "lucide-react";
import { useAccommodations } from "@/shared/hooks/useAccommodations";
import { Link } from "wouter";
import { useToast } from "@/shared/hooks/use-toast";

export default function HotelConfigurePage() {
  const [match, params] = useRoute("/hotels/:id/configure");
  const { accommodations, loading } = useAccommodations();
  const { toast } = useToast();

  const formatBoolean = (value: boolean | undefined) => {
    return value ? 'Sim' : 'Não';
  };

  const formatDiscount = (value: number | undefined) => {
    return value ? `${value}%` : '0%';
  };

  const handleAddRoomType = (hotelId: string) => {
    toast({
      title: "Criar Tipo de Quarto",
      description: `Redirecionando para criação de tipo de quarto do hotel ${hotelId}`
    });
    // Implementar navegação para criar tipo de quarto
  };

  const handleManageRooms = (hotelId: string) => {
    toast({
      title: "Gerir Quartos",
      description: `Redirecionando para gestão de quartos do hotel ${hotelId}`
    });
    // Implementar navegação para gestão de quartos
  };

  const handleEditRoomType = (roomTypeId: string) => {
    toast({
      title: "Editar Tipo de Quarto",
      description: `Editando tipo de quarto ${roomTypeId}`
    });
    // Implementar navegação para editar tipo de quarto
  };

  const hotel = accommodations.find(acc => acc.id === params?.id);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando configurações do hotel...</p>
        </div>
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center py-12">
          <Settings className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h2 className="text-2xl font-bold mb-2">Hotel não encontrado</h2>
          <p className="text-gray-600 mb-6">O hotel que você está procurando não existe ou foi removido.</p>
          <Link href="/hotels">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para a lista
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/hotels">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Settings className="w-8 h-8" />
              Configurar {hotel.name}
            </h1>
            <p className="text-gray-600">ID: {hotel.id}</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Link href={`/hotels/${hotel.id}`}>
            <Button variant="outline">
              Ver Detalhes
            </Button>
          </Link>
          <Link href={`/hotels/${hotel.id}/edit`}>
            <Button>
              Editar Propriedade
            </Button>
          </Link>
        </div>
      </div>

      <Tabs defaultValue="rooms" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="rooms" className="flex items-center gap-2">
            <Bed className="w-4 h-4" />
            Gestão de Quartos
          </TabsTrigger>
          <TabsTrigger value="partnerships" className="flex items-center gap-2">
            <Handshake className="w-4 h-4" />
            Programa de Parcerias
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Configurações Gerais
          </TabsTrigger>
        </TabsList>

        {/* Tab - Gestão de Quartos */}
        <TabsContent value="rooms" className="space-y-6">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Bed className="w-6 h-6 text-blue-600" />
                <div>
                  <h3 className="font-semibold text-blue-900 text-lg">
                    Gestão de Quartos e Tipos
                  </h3>
                  <p className="text-blue-700 text-sm">
                    Gerencie os tipos de quarto, preços e disponibilidade do seu hotel.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ações Rápidas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-green-200 hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-6 text-center">
                <div className="text-3xl mb-3">🆕</div>
                <h4 className="font-semibold mb-2 text-green-800 text-lg">Novo Tipo de Quarto</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Crie um novo tipo de quarto com preços e comodidades
                </p>
                <Button 
                  onClick={() => handleAddRoomType(hotel.id)}
                  className="bg-green-600 hover:bg-green-700 w-full"
                >
                  Criar Tipo de Quarto
                </Button>
              </CardContent>
            </Card>

            <Card className="border-blue-200 hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-6 text-center">
                <div className="text-3xl mb-3">📊</div>
                <h4 className="font-semibold mb-2 text-blue-800 text-lg">Gerir Quartos</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Veja e edite todos os quartos e tipos existentes
                </p>
                <Button 
                  onClick={() => handleManageRooms(hotel.id)}
                  className="bg-blue-600 hover:bg-blue-700 w-full"
                >
                  Gerir Quartos
                </Button>
              </CardContent>
            </Card>

            <Card className="border-purple-200 hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-6 text-center">
                <div className="text-3xl mb-3">📈</div>
                <h4 className="font-semibold mb-2 text-purple-800 text-lg">Relatórios</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Acesse relatórios de ocupação e receita
                </p>
                <Button 
                  onClick={() => toast({ title: "Relatórios", description: "Funcionalidade em desenvolvimento" })}
                  className="bg-purple-600 hover:bg-purple-700 w-full"
                >
                  Ver Relatórios
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Lista de tipos de quarto existentes */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Tipos de Quarto Existentes</CardTitle>
                <Badge variant="secondary">
                  {hotel.roomTypes?.length || 0} tipos cadastrados
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {hotel.roomTypes && hotel.roomTypes.length > 0 ? (
                <div className="space-y-4">
                  {hotel.roomTypes.map((roomType) => (
                    <Card key={roomType.id} className="hover:bg-gray-50 transition-colors">
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <h4 className="font-semibold text-lg">{roomType.name}</h4>
                              <Badge 
                                variant={roomType.isAvailable ? "default" : "destructive"}
                              >
                                {roomType.isAvailable ? 'Disponível' : 'Indisponível'}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                              <div>
                                <strong>Preço:</strong> {roomType.pricePerNight} MT/noite
                              </div>
                              <div>
                                <strong>Ocupação:</strong> {roomType.maxOccupancy || 2} pessoas
                              </div>
                              <div>
                                <strong>Comodidades:</strong> {roomType.amenities?.length || 0}
                              </div>
                              <div>
                                <strong>Imagens:</strong> {roomType.images?.length || 0}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <Button
                              onClick={() => handleEditRoomType(roomType.id)}
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              Editar
                            </Button>
                            <Button
                              onClick={() => toast({ title: "Detalhes", description: `Detalhes do tipo ${roomType.name}` })}
                              size="sm"
                              variant="outline"
                            >
                              Detalhes
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">🏨</div>
                  <p className="text-gray-500 text-lg mb-2">Nenhum tipo de quarto cadastrado</p>
                  <p className="text-gray-400 text-sm mb-6">
                    Comece criando seu primeiro tipo de quarto para receber reservas
                  </p>
                  <Button
                    onClick={() => handleAddRoomType(hotel.id)}
                    className="bg-green-600 hover:bg-green-700"
                    size="lg"
                  >
                    🆕 Criar Primeiro Tipo de Quarto
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab - Programa de Parcerias */}
        <TabsContent value="partnerships" className="space-y-6">
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Handshake className="w-6 h-6 text-green-600" />
                <div>
                  <h3 className="font-semibold text-green-900 text-lg">
                    Programa de Parcerias com Motoristas
                  </h3>
                  <p className="text-green-700 text-sm">
                    Configure como seu hotel trabalha com motoristas parceiros e ofertas especiais.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Configurações de Desconto */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  💰 Configurações de Desconto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Oferece descontos para motoristas:</span>
                  <Badge 
                    variant={hotel.offerDriverDiscounts ? "default" : "secondary"}
                  >
                    {formatBoolean(hotel.offerDriverDiscounts)}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Taxa de desconto:</span>
                  <span className="font-semibold">{formatDiscount(hotel.driverDiscountRate)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Nível mínimo do motorista:</span>
                  <span className="font-semibold">{hotel.minimumDriverLevel || 'Bronze'}</span>
                </div>
              </CardContent>
            </Card>

            {/* Programa de Parcerias */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  🤝 Programa de Parcerias
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Parcerias ativas:</span>
                  <Badge 
                    variant={hotel.enablePartnerships ? "default" : "secondary"}
                  >
                    {formatBoolean(hotel.enablePartnerships)}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Badge visível:</span>
                  <Badge 
                    variant={hotel.partnershipBadgeVisible ? "default" : "secondary"}
                  >
                    {formatBoolean(hotel.partnershipBadgeVisible)}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Desconto em acomodação:</span>
                  <span className="font-semibold">{formatDiscount(hotel.accommodationDiscount)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Desconto em transporte:</span>
                  <span className="font-semibold">{formatDiscount(hotel.transportDiscount)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Ações */}
          <Card>
            <CardHeader>
              <CardTitle>🚀 Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 flex-wrap">
                <Button className="bg-green-600 hover:bg-green-700">
                  Ativar Programa
                </Button>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  Configurar Descontos
                </Button>
                <Button className="bg-purple-600 hover:bg-purple-700">
                  Ver Parceiros
                </Button>
                <Button variant="outline">
                  Relatório de Parcerias
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab - Configurações Gerais */}
        <TabsContent value="settings" className="space-y-6">
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Settings className="w-6 h-6 text-purple-600" />
                <div>
                  <h3 className="font-semibold text-purple-900 text-lg">
                    Configurações Gerais do Hotel
                  </h3>
                  <p className="text-purple-700 text-sm">
                    Configure as informações básicas e políticas do seu estabelecimento.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Informações Básicas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Informações Básicas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Status do hotel:</span>
                  <Badge 
                    variant={hotel.isAvailable ? "default" : "destructive"}
                  >
                    {formatBoolean(hotel.isAvailable)}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Avaliação:</span>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    <span className="font-semibold">{hotel.rating || 0}/5</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Total de reviews:</span>
                  <span className="font-semibold">{hotel.reviewCount || 0}</span>
                </div>
              </CardContent>
            </Card>

            {/* Configurações de Horário */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Horários
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Check-in:</span>
                  <span className="font-semibold">{hotel.checkInTime || '14:00'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Check-out:</span>
                  <span className="font-semibold">{hotel.checkOutTime || '12:00'}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Ações de Configuração */}
          <Card>
            <CardHeader>
              <CardTitle>🔧 Configurações Avançadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button 
                  variant="outline" 
                  className="h-auto py-6 flex flex-col gap-2"
                  onClick={() => toast({ title: "Editar Informações", description: "Redirecionando para edição" })}
                >
                  <FileText className="w-8 h-8" />
                  <span className="font-medium">Editar Informações</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto py-6 flex flex-col gap-2"
                  onClick={() => toast({ title: "Gerir Imagens", description: "Abrindo galeria de imagens" })}
                >
                  <Image className="w-8 h-8" />
                  <span className="font-medium">Gerir Imagens</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto py-6 flex flex-col gap-2"
                  onClick={() => toast({ title: "Políticas", description: "Configurando políticas do hotel" })}
                >
                  <Settings className="w-8 h-8" />
                  <span className="font-medium">Políticas</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}