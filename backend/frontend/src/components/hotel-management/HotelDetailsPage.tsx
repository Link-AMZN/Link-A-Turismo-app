import React from 'react';
import { useRoute } from "wouter";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { ArrowLeft, MapPin, Phone, Mail, Calendar, Star, Users, Car } from "lucide-react";
import { useAccommodations } from "@/shared/hooks/useAccommodations";
import { Link } from "wouter";

export default function HotelDetailsPage() {
  const [match, params] = useRoute("/hotels/:id");
  const { accommodations, loading } = useAccommodations();

  // ✅ CORRIGIDO: Aceita string | undefined
  const formatTime = (time: string | undefined) => {
    if (!time) return 'Não definido';
    return time.includes(':') ? time : `${time}:00`;
  };

  const formatBoolean = (value: boolean | undefined) => {
    return value ? 'Sim' : 'Não';
  };

  const formatDiscount = (value: number | undefined) => {
    return value ? `${value}%` : 'Não aplicável';
  };

  const hotel = accommodations.find(acc => acc.id === params?.id);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando detalhes do hotel...</p>
        </div>
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🏨</div>
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
              🏨 {hotel.name}
            </h1>
            <p className="text-gray-600">Detalhes completos da propriedade</p>
          </div>
        </div>
        
        <Link href={`/hotels/${hotel.id}/edit`}>
          <Button className="bg-orange-600 hover:bg-orange-700">
            Editar Propriedade
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Informações Básicas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Informações Básicas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <strong className="block text-sm text-gray-600">Endereço:</strong>
              <p className="text-gray-800 mt-1">{hotel.address || 'Não informado'}</p>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-500" />
              <div>
                <strong className="block text-sm text-gray-600">Email:</strong>
                <p className="text-gray-800">{hotel.contactEmail || 'Não informado'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-500" />
              <div>
                <strong className="block text-sm text-gray-600">Telefone:</strong>
                <p className="text-gray-800">{hotel.contactPhone || 'Não informado'}</p>
              </div>
            </div>
            <div>
              <strong className="block text-sm text-gray-600">Descrição:</strong>
              <p className="text-gray-800 mt-1 text-sm">{hotel.description || 'Sem descrição'}</p>
            </div>
            <div>
              <strong className="block text-sm text-gray-600">Tipo:</strong>
              <Badge variant="outline" className="mt-1 capitalize">
                {hotel.type || 'Não definido'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Status e Disponibilidade */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5" />
              Status e Disponibilidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <strong className="block text-sm text-gray-600">Disponível:</strong>
                <Badge 
                  variant={hotel.isAvailable ? "default" : "destructive"}
                  className="mt-1"
                >
                  {formatBoolean(hotel.isAvailable)}
                </Badge>
              </div>
              <div>
                <strong className="block text-sm text-gray-600">Avaliação:</strong>
                <div className="flex items-center gap-1 mt-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                  <span className="text-gray-800">
                    {hotel.rating || 0}/5 ({hotel.reviewCount || 0} reviews)
                  </span>
                </div>
              </div>
              <div>
                <strong className="block text-sm text-gray-600">Hóspedes Máx:</strong>
                <div className="flex items-center gap-1 mt-1">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-800">{hotel.maxGuests || 'Não definido'}</span>
                </div>
              </div>
              <div>
                <strong className="block text-sm text-gray-600">Distância do Centro:</strong>
                <p className="text-gray-800 mt-1">
                  {hotel.distanceFromCenter ? `${hotel.distanceFromCenter} km` : 'Não informada'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Horários */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Horários
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <strong className="block text-sm text-gray-600">Check-in:</strong>
                <p className="text-gray-800 mt-1 text-lg font-semibold">
                  {formatTime(hotel.checkInTime)}
                </p>
              </div>
              <div>
                <strong className="block text-sm text-gray-600">Check-out:</strong>
                <p className="text-gray-800 mt-1 text-lg font-semibold">
                  {formatTime(hotel.checkOutTime)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Programa de Parcerias */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="w-5 h-5" />
              Programa de Parcerias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <strong className="block text-sm text-gray-600">Oferece Descontos:</strong>
                <Badge 
                  variant={hotel.offerDriverDiscounts ? "default" : "outline"}
                  className="mt-1"
                >
                  {formatBoolean(hotel.offerDriverDiscounts)}
                </Badge>
              </div>
              <div>
                <strong className="block text-sm text-gray-600">Taxa de Desconto:</strong>
                <p className="text-gray-800 mt-1 font-semibold">
                  {formatDiscount(hotel.driverDiscountRate)}
                </p>
              </div>
              <div>
                <strong className="block text-sm text-gray-600">Parcerias Ativas:</strong>
                <Badge 
                  variant={hotel.enablePartnerships ? "default" : "outline"}
                  className="mt-1"
                >
                  {formatBoolean(hotel.enablePartnerships)}
                </Badge>
              </div>
              <div>
                <strong className="block text-sm text-gray-600">Nível Mínimo:</strong>
                <p className="text-gray-800 mt-1">
                  {hotel.minimumDriverLevel || 'Não definido'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comodidades */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Comodidades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {hotel.amenities && hotel.amenities.length > 0 ? (
                hotel.amenities.map((amenity, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="px-3 py-1"
                  >
                    {amenity}
                  </Badge>
                ))
              ) : (
                <p className="text-gray-500 italic">Nenhuma comodidade cadastrada</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Imagens */}
        {hotel.images && hotel.images.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Imagens</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 overflow-x-auto py-2">
                {hotel.images.map((image, index) => (
                  <img
                    key={index}
                    src={image}
                    alt={`${hotel.name} - Imagem ${index + 1}`}
                    className="w-48 h-32 object-cover rounded-lg border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Informações Adicionais */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Informações Adicionais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <strong className="block text-gray-600">Criado em:</strong>
                <p className="text-gray-800">
                  {hotel.createdAt ? new Date(hotel.createdAt).toLocaleDateString('pt-MZ') : 'N/A'}
                </p>
              </div>
              <div>
                <strong className="block text-gray-600">Atualizado em:</strong>
                <p className="text-gray-800">
                  {hotel.updatedAt ? new Date(hotel.updatedAt).toLocaleDateString('pt-MZ') : 'N/A'}
                </p>
              </div>
              <div>
                <strong className="block text-gray-600">ID do Hotel:</strong>
                <p className="text-gray-800 font-mono text-xs truncate" title={hotel.id}>
                  {hotel.id}
                </p>
              </div>
              <div>
                <strong className="block text-gray-600">ID do Host:</strong>
                <p className="text-gray-800 font-mono text-xs truncate" title={hotel.hostId}>
                  {hotel.hostId}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}