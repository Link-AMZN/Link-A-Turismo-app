import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Badge } from "@/shared/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Hotel, MapPin, Star, Users, Wifi, Car as CarIcon, Coffee, Utensils, X, Plus, Bed, Eye, Settings, Edit } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "../hooks/useAuth";
import { useAccommodations } from "../hooks/useAccommodations";
import { useHotelRooms } from "../hooks/useHotelRooms";
import { useToast } from "../hooks/use-toast";
import LocationAutocomplete from "./LocationAutocomplete";
import type { Accommodation } from "../hooks/useAccommodations";

interface AccommodationManagerProps {
  hostId?: string;
}

interface CreateAccommodationData {
  name: string;
  type: string;
  address: string;
  description: string;
  maxGuests?: number;
  amenities?: string[];
  images?: string[];
  isAvailable?: boolean;
}

export default function AccommodationManager({ hostId }: AccommodationManagerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const currentHostId = hostId || user?.id;
  
  const [activeTab, setActiveTab] = useState("properties");
  const [showAddProperty, setShowAddProperty] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Accommodation | null>(null);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [selectedPropertyForRoom, setSelectedPropertyForRoom] = useState<Accommodation | null>(null);
  const [newRoom, setNewRoom] = useState({
    roomNumber: "",
    roomType: "standard",
    pricePerNight: 0,
    maxOccupancy: 2,
    description: "",
    amenities: [] as string[]
  });

  const { 
    accommodations: realAccommodations, 
    loading: accommodationsLoading, 
    createAccommodation,
    updateAccommodation,
    error: accommodationsError 
  } = useAccommodations();

  const { 
    rooms: propertyRooms, 
    loading: roomsLoading, 
    createRoom,
    updateRoom,
    deleteRoom,
    refetch: refetchRooms 
  } = useHotelRooms(selectedPropertyForRoom?.id);

  const hostProperties = realAccommodations?.filter(acc => acc.hostId === currentHostId) || [];

  const [newProperty, setNewProperty] = useState<CreateAccommodationData>({
    name: "",
    type: "hotel_room",
    address: "",
    description: "",
    maxGuests: 2,
    amenities: [],
    images: [],
    isAvailable: true
  });

  const amenityOptions = [
    { id: "Wi-Fi", label: "Wi-Fi", icon: Wifi },
    { id: "Estacionamento", label: "Estacionamento", icon: CarIcon },
    { id: "Cozinha", label: "Cozinha", icon: Utensils },
    { id: "Café da manhã", label: "Café da manhã", icon: Coffee },
    { id: "Piscina", label: "Piscina", icon: Hotel },
    { id: "Ar Condicionado", label: "Ar Condicionado", icon: Hotel },
    { id: "Varanda", label: "Varanda", icon: Hotel },
    { id: "Vista Mar", label: "Vista Mar", icon: Hotel },
    { id: "TV", label: "TV", icon: Hotel },
    { id: "Frigobar", label: "Frigobar", icon: Hotel }
  ];

  const roomTypeOptions = [
    { value: "standard", label: "Standard" },
    { value: "deluxe", label: "Deluxe" },
    { value: "suite", label: "Suite" },
    { value: "family", label: "Família" },
    { value: "executive", label: "Executivo" }
  ];

  const roomAmenityOptions = [
    { id: "tv", label: "TV" },
    { id: "frigobar", label: "Frigobar" },
    { id: "ar-condicionado", label: "Ar Condicionado" },
    { id: "varanda", label: "Varanda" },
    { id: "vista-mar", label: "Vista Mar" },
    { id: "cofre", label: "Cofre" },
    { id: "secador", label: "Secador de Cabelo" },
    { id: "amenities", label: "Amenities" },
    { id: "room-service", label: "Room Service" }
  ];

  const handleManageRooms = (hotelId: string) => {
    const hotel = hostProperties.find(h => h.id === hotelId);
    if (hotel) {
      setSelectedProperty(hotel);
      setActiveTab("rooms");
    }
  };

  const handleSubmitProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newProperty.name.trim()) {
      toast({ title: "Erro", description: "Nome da propriedade é obrigatório", variant: "destructive" });
      return;
    }
    
    if (!newProperty.address.trim()) {
      toast({ title: "Erro", description: "Endereço é obrigatório", variant: "destructive" });
      return;
    }

    if (!newProperty.description.trim()) {
      toast({ title: "Erro", description: "Descrição é obrigatória", variant: "destructive" });
      return;
    }

    try {
      const result = await createAccommodation(newProperty);

      if (result.success) {
        toast({ 
          title: "Sucesso", 
          description: "Propriedade criada com sucesso! Agora pode adicionar quartos." 
        });
        setShowAddProperty(false);
        setNewProperty({
          name: "",
          type: "hotel_room",
          address: "",
          description: "",
          maxGuests: 2,
          amenities: [],
          images: [],
          isAvailable: true
        });
      } else {
        toast({ title: "Erro", description: result.error || "Falha ao criar propriedade", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Erro ao criar propriedade", variant: "destructive" });
    }
  };

  const handleAddRoom = (property: Accommodation) => {
    setSelectedPropertyForRoom(property);
    setShowAddRoom(true);
    setNewRoom({
      roomNumber: "",
      roomType: "standard",
      pricePerNight: 0,
      maxOccupancy: 2,
      description: "",
      amenities: []
    });
  };

  const handleSubmitRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPropertyForRoom) return;

    if (!newRoom.roomNumber.trim()) {
      toast({ title: "Erro", description: "Número do quarto é obrigatório", variant: "destructive" });
      return;
    }

    if (!newRoom.pricePerNight || newRoom.pricePerNight <= 0) {
      toast({ title: "Erro", description: "Preço por noite deve ser maior que zero", variant: "destructive" });
      return;
    }

    try {
      const result = await createRoom({
        accommodationId: selectedPropertyForRoom.id,
        roomNumber: newRoom.roomNumber,
        roomType: newRoom.roomType,
        pricePerNight: Number(newRoom.pricePerNight),
        maxOccupancy: newRoom.maxOccupancy,
        description: newRoom.description,
        roomAmenities: newRoom.amenities,
        isAvailable: true
      });

      if (result.success) {
        toast({ 
          title: "Sucesso", 
          description: "Quarto adicionado com sucesso!" 
        });
        setShowAddRoom(false);
        setSelectedPropertyForRoom(null);
        setNewRoom({
          roomNumber: "",
          roomType: "standard",
          pricePerNight: 0,
          maxOccupancy: 2,
          description: "",
          amenities: []
        });
      } else {
        toast({ 
          title: "Erro", 
          description: result.error || "Erro ao criar quarto", 
          variant: "destructive" 
        });
      }
    } catch (error: any) {
      console.error("Erro ao criar quarto:", error);
      toast({ 
        title: "Erro", 
        description: error.message || "Erro ao criar quarto", 
        variant: "destructive" 
      });
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    try {
      const result = await deleteRoom(roomId);
      if (result.success) {
        toast({ title: "Sucesso", description: "Quarto removido com sucesso!" });
      } else {
        toast({ title: "Erro", description: result.error || "Erro ao remover quarto", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Erro ao remover quarto", variant: "destructive" });
    }
  };

  const handleToggleRoomAvailability = async (roomId: string, isAvailable: boolean) => {
    try {
      const result = await updateRoom(roomId, { isAvailable });
      if (result.success) {
        toast({ 
          title: "Sucesso", 
          description: `Quarto ${isAvailable ? 'disponibilizado' : 'indisponibilizado'} com sucesso!` 
        });
      } else {
        toast({ title: "Erro", description: result.error || "Erro ao atualizar quarto", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Erro ao atualizar quarto", variant: "destructive" });
    }
  };

  const toggleAmenity = (amenityId: string) => {
    setNewProperty(prev => ({
      ...prev,
      amenities: prev.amenities?.includes(amenityId)
        ? prev.amenities.filter(a => a !== amenityId)
        : [...(prev.amenities || []), amenityId]
    }));
  };

  const toggleRoomAmenity = (amenityId: string) => {
    setNewRoom(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenityId)
        ? prev.amenities.filter(a => a !== amenityId)
        : [...prev.amenities, amenityId]
    }));
  };

  const getPropertyTypeLabel = (type: string) => {
    const typeMap: { [key: string]: string } = {
      'hotel_room': 'Quarto de Hotel',
      'hotel_suite': 'Suite',
      'apartment': 'Apartamento',
      'house': 'Casa',
      'villa': 'Villa',
      'guesthouse': 'Pensão',
      'hostel': 'Hostel'
    };
    return typeMap[type] || type;
  };

  const getRoomTypeLabel = (type: string) => {
    const typeMap: { [key: string]: string } = {
      'standard': 'Standard',
      'deluxe': 'Deluxe',
      'suite': 'Suite',
      'family': 'Família',
      'executive': 'Executivo'
    };
    return typeMap[type] || type;
  };

  if (accommodationsLoading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
            <p>Carregando propriedades...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestão de Alojamentos</h1>
          <p className="text-gray-600">Gerir as suas propriedades e disponibilidade</p>
        </div>
        
        <Button
          onClick={() => setShowAddProperty(true)}
          className="bg-orange-600 hover:bg-orange-700"
          data-testid="add-property-button"
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Propriedade
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="properties">
            Propriedades ({hostProperties.length})
          </TabsTrigger>
          <TabsTrigger value="rooms">Quartos</TabsTrigger>
        </TabsList>

        <TabsContent value="properties" className="space-y-4">
          {hostProperties.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Hotel className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhuma propriedade encontrada
                </h3>
                <p className="text-gray-600 mb-4">
                  Comece por adicionar a sua primeira propriedade para gerir alojamentos.
                </p>
                <Button
                  onClick={() => setShowAddProperty(true)}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Primeira Propriedade
                </Button>
              </CardContent>
            </Card>
          ) : (
            hostProperties.map((property) => (
              <Card key={property.id}>
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between space-y-4 lg:space-y-0">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-xl font-semibold">{property.name}</h3>
                          <div className="flex items-center space-x-2 text-gray-600 mt-1">
                            <MapPin className="w-4 h-4" />
                            <span>{property.address}</span>
                            <Badge variant={property.isAvailable ? "default" : "secondary"}>
                              {property.isAvailable ? "Ativa" : "Inativa"}
                            </Badge>
                            <Badge variant="outline">
                              {getPropertyTypeLabel(property.type)}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            asChild
                            title="Ver detalhes"
                          >
                            <Link href={`/hotels/${property.id}/details`}>
                              <Eye className="w-4 h-4" />
                            </Link>
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            asChild
                            title="Editar"
                          >
                            <Link href={`/hotels/${property.id}/edit`}>
                              <Edit className="w-4 h-4" />
                            </Link>
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            asChild
                            title="Configurar"
                          >
                            <Link href={`/hotels/${property.id}/configure`}>
                              <Settings className="w-4 h-4" />
                            </Link>
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleAddRoom(property)}
                            title="Adicionar quarto"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <p className="text-gray-600 mb-4">{property.description}</p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <div className="text-sm text-gray-500">Hóspedes</div>
                          <div className="font-medium flex items-center">
                            <Users className="w-4 h-4 mr-1" />
                            {property.maxGuests}
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-sm text-gray-500">Avaliação</div>
                          <div className="font-medium flex items-center">
                            <Star className="w-4 h-4 mr-1 fill-yellow-400 text-yellow-400" />
                            {property.rating || 'N/A'} ({property.reviewCount || 0})
                          </div>
                        </div>
                      </div>

                      {property.amenities && property.amenities.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {property.amenities.map((amenity) => {
                            const amenityOption = amenityOptions.find(a => a.id === amenity);
                            return (
                              <Badge key={amenity} variant="secondary" className="flex items-center">
                                {amenityOption && <amenityOption.icon className="w-3 h-3 mr-1" />}
                                {amenityOption?.label || amenity}
                              </Badge>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="lg:ml-6">
                      <div className="text-right mb-4">
                        <div className="text-sm text-gray-500">Preços definidos por quarto</div>
                        <Button 
                          variant="link" 
                          className="text-orange-600 p-0 h-auto"
                          onClick={() => handleAddRoom(property)}
                        >
                          Adicionar primeiro quarto
                        </Button>
                      </div>
                      
                      <div className="space-y-2">
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            setSelectedProperty(property);
                            setActiveTab("rooms");
                          }}
                          data-testid={`manage-rooms-${property.id}`}
                        >
                          <Bed className="w-4 h-4 mr-2" />
                          Gerir Quartos
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="rooms" className="space-y-4">
          {selectedProperty ? (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Quartos - {selectedProperty.name}</h2>
                  <p className="text-gray-600">Gerir os quartos desta propriedade</p>
                </div>
                <Button
                  onClick={() => handleAddRoom(selectedProperty)}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Quarto
                </Button>
              </div>

              {roomsLoading ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
                    <p>Carregando quartos...</p>
                  </CardContent>
                </Card>
              ) : propertyRooms.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <Bed className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Nenhum quarto encontrado
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Adicione o primeiro quarto para começar a receber reservas.
                    </p>
                    <Button
                      onClick={() => handleAddRoom(selectedProperty)}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Primeiro Quarto
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {propertyRooms.map((room) => (
                    <Card key={room.id} className="relative">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold">Quarto {room.roomNumber}</h4>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge variant="outline">
                                {getRoomTypeLabel(room.roomType)}
                              </Badge>
                              <Badge variant={room.isAvailable ? "default" : "secondary"}>
                                {room.isAvailable ? "Disponível" : "Indisponível"}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex space-x-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleRoomAvailability(room.id, !room.isAvailable)}
                            >
                              {room.isAvailable ? '❌' : '✅'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteRoom(room.id)}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">Preço/noite:</span>
                            <span className="font-bold text-orange-600">
                              {room.pricePerNight.toLocaleString()} MT
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">Ocupação:</span>
                            <span className="font-medium">
                              {room.maxOccupancy} pessoa{room.maxOccupancy > 1 ? 's' : ''}
                            </span>
                          </div>

                          {room.description && (
                            <p className="text-sm text-gray-600 mt-2">{room.description}</p>
                          )}

                          {room.roomAmenities && room.roomAmenities.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {room.roomAmenities.slice(0, 3).map((amenity) => (
                                <Badge key={amenity} variant="secondary" className="text-xs">
                                  {amenity}
                                </Badge>
                              ))}
                              {room.roomAmenities.length > 3 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{room.roomAmenities.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Bed className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Selecione uma Propriedade
                </h3>
                <p className="text-gray-600">
                  Escolha uma propriedade da aba "Propriedades" para gerir os quartos
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {showAddProperty && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Adicionar Nova Propriedade</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddProperty(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleSubmitProperty} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da propriedade *</Label>
                  <Input
                    id="name"
                    placeholder="ex: Casa Vista Mar - Tofo"
                    value={newProperty.name}
                    onChange={(e) => setNewProperty(prev => ({...prev, name: e.target.value}))}
                    required
                    data-testid="property-name"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo de propriedade *</Label>
                    <Select 
                      value={newProperty.type}
                      onValueChange={(value) => setNewProperty(prev => ({...prev, type: value}))}
                    >
                      <SelectTrigger data-testid="property-type">
                        <SelectValue placeholder="Selecionar tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hotel_room">Quarto de Hotel</SelectItem>
                        <SelectItem value="hotel_suite">Suite</SelectItem>
                        <SelectItem value="apartment">Apartamento</SelectItem>
                        <SelectItem value="house">Casa</SelectItem>
                        <SelectItem value="villa">Villa</SelectItem>
                        <SelectItem value="guesthouse">Pensão</SelectItem>
                        <SelectItem value="hostel">Hostel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="address">Localização *</Label>
                    <LocationAutocomplete
                      id="address"
                      value={newProperty.address}
                      onChange={(value) => setNewProperty(prev => ({...prev, address: value}))}
                      placeholder="Endereço completo..."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição *</Label>
                  <Textarea
                    id="description"
                    placeholder="Descreva a propriedade, características especiais, etc."
                    value={newProperty.description}
                    onChange={(e) => setNewProperty(prev => ({...prev, description: e.target.value}))}
                    rows={3}
                    required
                    data-testid="property-description"
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxGuests">Hóspedes máx.</Label>
                    <Input
                      id="maxGuests"
                      type="number"
                      min="1"
                      value={newProperty.maxGuests}
                      onChange={(e) => setNewProperty(prev => ({...prev, maxGuests: parseInt(e.target.value) || 2}))}
                      data-testid="property-guests"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Comodidades</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {amenityOptions.map((amenity) => (
                      <label key={amenity.id} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newProperty.amenities?.includes(amenity.id) || false}
                          onChange={() => toggleAmenity(amenity.id)}
                          className="rounded"
                        />
                        <amenity.icon className="w-4 h-4" />
                        <span className="text-sm">{amenity.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex space-x-4 pt-4">
                  <Button
                    type="submit"
                    className="flex-1 bg-orange-600 hover:bg-orange-700"
                    data-testid="property-submit"
                    disabled={accommodationsLoading}
                  >
                    {accommodationsLoading ? 'Criando...' : 'Adicionar Propriedade'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddProperty(false)}
                    className="flex-1"
                    data-testid="property-cancel"
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {showAddRoom && selectedPropertyForRoom && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Adicionar Quarto - {selectedPropertyForRoom.name}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddRoom(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleSubmitRoom} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="roomNumber">Número do Quarto *</Label>
                  <Input
                    id="roomNumber"
                    placeholder="ex: 101, A1, etc."
                    value={newRoom.roomNumber}
                    onChange={(e) => setNewRoom(prev => ({...prev, roomNumber: e.target.value}))}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="roomType">Tipo de Quarto</Label>
                    <Select 
                      value={newRoom.roomType}
                      onValueChange={(value) => setNewRoom(prev => ({...prev, roomType: value}))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {roomTypeOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="maxOccupancy">Ocupação Máx.</Label>
                    <Input
                      id="maxOccupancy"
                      type="number"
                      min="1"
                      value={newRoom.maxOccupancy}
                      onChange={(e) => setNewRoom(prev => ({...prev, maxOccupancy: parseInt(e.target.value) || 2}))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pricePerNight">Preço por Noite (MT) *</Label>
                  <Input
                    id="pricePerNight"
                    type="number"
                    min="100"
                    placeholder="2500"
                    value={newRoom.pricePerNight}
                    onChange={(e) => setNewRoom(prev => ({...prev, pricePerNight: Number(e.target.value)}))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="roomDescription">Descrição (opcional)</Label>
                  <Textarea
                    id="roomDescription"
                    placeholder="Descrição do quarto..."
                    value={newRoom.description}
                    onChange={(e) => setNewRoom(prev => ({...prev, description: e.target.value}))}
                    rows={2}
                  />
                </div>

                <div className="space-y-3">
                  <Label>Comodidades do Quarto</Label>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                    {roomAmenityOptions.map((amenity) => (
                      <label key={amenity.id} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newRoom.amenities.includes(amenity.id)}
                          onChange={() => toggleRoomAmenity(amenity.id)}
                          className="rounded"
                        />
                        <span className="text-sm">{amenity.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex space-x-4 pt-4">
                  <Button
                    type="submit"
                    className="flex-1 bg-orange-600 hover:bg-orange-700"
                    disabled={roomsLoading}
                  >
                    {roomsLoading ? 'Criando...' : 'Adicionar Quarto'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddRoom(false)}
                    className="flex-1"
                    disabled={roomsLoading}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}