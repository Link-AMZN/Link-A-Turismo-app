import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Switch } from "@/shared/components/ui/switch";
import { Badge } from "@/shared/components/ui/badge";
import { ArrowLeft, Save, Wifi, Car, Utensils, Coffee, Hotel, MapPin, Users, Bed, Bath } from "lucide-react";
import LocationAutocomplete from "@/shared/components/LocationAutocomplete";
import { useAccommodations } from "@/shared/hooks/useAccommodations";
import { useToast } from "@/shared/hooks/use-toast";
import { Link } from "wouter";

const amenityOptions = [
  { id: "Wi-Fi", label: "Wi-Fi", icon: Wifi },
  { id: "Estacionamento", label: "Estacionamento", icon: Car },
  { id: "Cozinha", label: "Cozinha", icon: Utensils },
  { id: "Café da manhã", label: "Café da manhã", icon: Coffee },
  { id: "Piscina", label: "Piscina", icon: Hotel },
  { id: "Ar Condicionado", label: "Ar Condicionado", icon: Hotel },
  { id: "Varanda", label: "Varanda", icon: Hotel },
  { id: "Vista Mar", label: "Vista Mar", icon: Hotel },
  { id: "TV", label: "TV", icon: Hotel },
  { id: "Frigobar", label: "Frigobar", icon: Hotel }
];

export default function HotelEditPage() {
  const [match, params] = useRoute("/hotels/:id/edit");
  const { accommodations, updateAccommodation, loading } = useAccommodations();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'hotel_room',
    address: '',
    description: '',
    maxGuests: 2,
    bedrooms: 1,
    bathrooms: 1,
    amenities: [] as string[],
    contactEmail: '',
    contactPhone: '',
    isAvailable: true
  });

  const hotel = accommodations.find(acc => acc.id === params?.id);

  useEffect(() => {
    if (hotel) {
      setFormData({
        name: hotel.name || '',
        type: hotel.type || 'hotel_room',
        address: hotel.address || '',
        description: hotel.description || '',
        maxGuests: hotel.maxGuests || 2,
        bedrooms: hotel.bedrooms || 1,
        bathrooms: hotel.bathrooms || 1,
        amenities: hotel.amenities || [],
        contactEmail: hotel.contactEmail || '',
        contactPhone: hotel.contactPhone || '',
        isAvailable: hotel.isAvailable ?? true
      });
    }
  }, [hotel]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!params?.id || !hotel) return;

    try {
      const result = await updateAccommodation(params.id, formData);
      
      if (result.success) {
        toast({ title: "Sucesso", description: "Propriedade atualizada com sucesso!" });
      } else {
        toast({ title: "Erro", description: result.error || "Erro ao atualizar", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Erro ao atualizar", variant: "destructive" });
    }
  };

  const toggleAmenity = (amenityId: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenityId)
        ? prev.amenities.filter(a => a !== amenityId)
        : [...prev.amenities, amenityId]
    }));
  };

  if (!hotel) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <Hotel className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h2 className="text-2xl font-bold mb-2">Propriedade não encontrada</h2>
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
    <div className="max-w-4xl mx-auto p-6 space-y-6">
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
            <h1 className="text-3xl font-bold">Editar Propriedade</h1>
            <p className="text-gray-600">Atualize as informações de {hotel.name}</p>
          </div>
        </div>
        
        <Button 
          onClick={handleSubmit}
          disabled={loading}
          className="bg-orange-600 hover:bg-orange-700"
        >
          <Save className="w-4 h-4 mr-2" />
          {loading ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações Básicas</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da propriedade *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de propriedade</Label>
                <Select 
                  value={formData.type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
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
                  id="location-autocomplete"
                  placeholder="Digite uma cidade, distrito ou província..."
                  value={formData.address}
                  onChange={(value) => setFormData(prev => ({ ...prev, address: value }))}
                  data-testid="location-autocomplete"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
                required
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxGuests" className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  Hóspedes máx.
                </Label>
                <Input
                  id="maxGuests"
                  type="number"
                  min="1"
                  value={formData.maxGuests}
                  onChange={(e) => setFormData(prev => ({ ...prev, maxGuests: parseInt(e.target.value) || 2 }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="bedrooms" className="flex items-center gap-1">
                  <Bed className="w-4 h-4" />
                  Quartos
                </Label>
                <Input
                  id="bedrooms"
                  type="number"
                  min="1"
                  value={formData.bedrooms}
                  onChange={(e) => setFormData(prev => ({ ...prev, bedrooms: parseInt(e.target.value) || 1 }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="bathrooms" className="flex items-center gap-1">
                  <Bath className="w-4 h-4" />
                  Casas de banho
                </Label>
                <Input
                  id="bathrooms"
                  type="number"
                  min="1"
                  value={formData.bathrooms}
                  onChange={(e) => setFormData(prev => ({ ...prev, bathrooms: parseInt(e.target.value) || 1 }))}
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
                      checked={formData.amenities.includes(amenity.id)}
                      onChange={() => toggleAmenity(amenity.id)}
                      className="rounded border-gray-300"
                    />
                    <amenity.icon className="w-4 h-4" />
                    <span className="text-sm">{amenity.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Email de Contacto</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, contactEmail: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="contactPhone">Telefone</Label>
                <Input
                  id="contactPhone"
                  type="tel"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData(prev => ({ ...prev, contactPhone: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch 
                id="is-available"
                checked={formData.isAvailable}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isAvailable: checked }))}
              />
              <Label htmlFor="is-available">Disponível para reservas</Label>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}