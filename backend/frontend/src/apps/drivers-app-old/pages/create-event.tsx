import { useState } from "react";
import { Link } from "wouter";
import PageHeader from "@/shared/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Switch } from "@/shared/components/ui/switch";
import { Badge } from "@/shared/components/ui/badge";
import { useToast } from "@/shared/hooks/use-toast";
import DateInput from "@/shared/components/DateInput";
import { CalendarDays, MapPin, DollarSign, Users, Ticket, Image, Shield } from "lucide-react";
import { useAuth } from "@/shared/hooks/useAuth";

export default function CreateEvent() {
  const [activeService] = useState<"rides" | "stays">("rides");
  const { toast } = useToast();
  const { user, firebaseUser } = useAuth();
  
  const [eventData, setEventData] = useState({
    title: "",
    description: "",
    category: "culture",
    location: "",
    address: "",
    startDate: "",
    endDate: "",
    startTime: "",
    endTime: "",
    isPaid: false,
    price: 0,
    maxTickets: 100,
    image: null as File | null,
    
    // Partnership options
    enablePartnerships: false,
    accommodationDiscount: 10,
    transportDiscount: 15,
    
    // Organizer info
    organizerName: "",
    organizerContact: "",
    organizerEmail: "",
    
    // Additional settings
    requiresApproval: false,
    isPublic: true,
    tags: [] as string[]
  });

  const [newTag, setNewTag] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: string, value: any) => {
    setEventData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddTag = () => {
    if (newTag.trim() && !eventData.tags.includes(newTag.trim())) {
      setEventData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setEventData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleImageChange = (file: File | null) => {
    setEventData(prev => ({ ...prev, image: file }));
  };

  const handleSubmit = async () => {
    if (!eventData.title || !eventData.description || !eventData.location || !eventData.startDate) {
      toast({
        title: "Campos Obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    if (eventData.isPaid && eventData.price <= 0) {
      toast({
        title: "Preço Inválido",
        description: "Para eventos pagos, o preço deve ser maior que zero.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // ✅ CORREÇÃO: Montar payload real para envio ao backend
      const payload = {
        title: eventData.title,
        description: eventData.description,
        category: eventData.category,
        venue: eventData.location,
        address: eventData.address,
        startDate: eventData.startDate,
        endDate: eventData.endDate || eventData.startDate, // Se não tiver endDate, usa startDate
        startTime: eventData.startTime,
        endTime: eventData.endTime,
        isPaid: eventData.isPaid,
        ticketPrice: eventData.isPaid ? eventData.price : 0,
        maxTickets: eventData.maxTickets,
        
        // Partnership options
        enablePartnerships: eventData.enablePartnerships,
        accommodationDiscount: eventData.enablePartnerships ? eventData.accommodationDiscount : 0,
        transportDiscount: eventData.enablePartnerships ? eventData.transportDiscount : 0,
        
        // Organizer info
        organizerName: eventData.organizerName || user?.name || firebaseUser?.displayName || "",
        organizerContact: eventData.organizerContact,
        organizerEmail: eventData.organizerEmail || user?.email || firebaseUser?.email || "",
        
        // Additional settings
        requiresApproval: eventData.requiresApproval,
        isPublic: eventData.isPublic,
        tags: eventData.tags,
        
        // Default values for required fields
        eventType: "public",
        status: "pending", // Todos os eventos começam como pendentes
        isFeatured: false,
        hasPartnerships: eventData.enablePartnerships
      };

      // ✅ CORREÇÃO: Obter token de autenticação
      const token = firebaseUser ? await firebaseUser.getIdToken() : localStorage.getItem('token');
      
      console.log("🚀 Enviando evento para o backend:", payload);

      // ✅ CORREÇÃO: Fazer requisição real para o backend
      const response = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Erro ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      console.log("✅ Evento criado com sucesso:", result);

      toast({
        title: "Evento Criado",
        description: "O seu evento foi criado com sucesso e está em análise.",
      });
      
      // Redirect to events page
      window.location.href = "/events";
    } catch (error: any) {
      console.error("❌ Erro ao criar evento:", error);
      toast({
        title: "Erro na Criação",
        description: error.message || "Ocorreu um erro ao criar o evento. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PageHeader title="Criar Evento ou Feira" />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Page Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
              <CalendarDays className="text-white text-3xl" />
            </div>
            <div>
              <p className="text-gray-600 mt-1">
                Crie eventos gratuitos ou pagos com parcerias incluídas
              </p>
            </div>
          </div>
        </div>

        {/* Verification Notice */}
        <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Shield className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-blue-800 font-medium">
                  Conta Verificada Necessária
                </p>
                <p className="text-xs text-blue-700">
                  Apenas utilizadores verificados podem criar eventos. Todos os eventos passam por aprovação.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Nome do Evento *</Label>
                <Input
                  id="title"
                  value={eventData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  placeholder="Ex: Festival de Música Tradicional"
                  data-testid="input-event-title"
                />
              </div>

              <div>
                <Label htmlFor="description">Descrição *</Label>
                <Textarea
                  id="description"
                  value={eventData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  placeholder="Descreva o seu evento..."
                  rows={4}
                  data-testid="textarea-event-description"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Categoria *</Label>
                  <Select value={eventData.category} onValueChange={(value) => handleInputChange("category", value)}>
                    <SelectTrigger data-testid="select-event-category">
                      <SelectValue placeholder="Seleccione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="culture">Cultura</SelectItem>
                      <SelectItem value="business">Negócios</SelectItem>
                      <SelectItem value="entertainment">Entretenimento</SelectItem>
                      <SelectItem value="gastronomy">Gastronomia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="maxTickets">Capacidade Máxima</Label>
                  <Input
                    id="maxTickets"
                    type="number"
                    value={eventData.maxTickets}
                    onChange={(e) => handleInputChange("maxTickets", parseInt(e.target.value))}
                    placeholder="100"
                    data-testid="input-max-tickets"
                  />
                </div>
              </div>

              {/* Event Image */}
              <div>
                <Label htmlFor="eventImage">Imagem do Evento</Label>
                <div className="mt-2">
                  <input
                    id="eventImage"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageChange(e.target.files?.[0] || null)}
                    className="hidden"
                    data-testid="file-event-image"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById("eventImage")?.click()}
                    className="w-full"
                  >
                    <Image className="w-4 h-4 mr-2" />
                    {eventData.image ? eventData.image.name : "Selecionar Imagem"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location and Date */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="w-5 h-5" />
                <span>Local e Data</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="location">Local do Evento *</Label>
                <Input
                  id="location"
                  value={eventData.location}
                  onChange={(e) => handleInputChange("location", e.target.value)}
                  placeholder="Ex: Centro Cultural de Maputo"
                  data-testid="input-event-location"
                />
              </div>

              <div>
                <Label htmlFor="address">Endereço Completo</Label>
                <Input
                  id="address"
                  value={eventData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  placeholder="Rua, número, cidade..."
                  data-testid="input-event-address"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Data de Início *</Label>
                  <DateInput
                    id="startDate"
                    value={eventData.startDate}
                    onChange={(value) => handleInputChange("startDate", value)}
                    data-testid="input-start-date"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">Data de Fim</Label>
                  <DateInput
                    id="endDate"
                    value={eventData.endDate}
                    onChange={(value) => handleInputChange("endDate", value)}
                    data-testid="input-end-date"
                  />
                </div>
                <div>
                  <Label htmlFor="startTime">Hora de Início</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={eventData.startTime}
                    onChange={(e) => handleInputChange("startTime", e.target.value)}
                    data-testid="input-start-time"
                  />
                </div>
                <div>
                  <Label htmlFor="endTime">Hora de Fim</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={eventData.endTime}
                    onChange={(e) => handleInputChange("endTime", e.target.value)}
                    data-testid="input-end-time"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Ticket className="w-5 h-5" />
                <span>Preços e Bilhetes</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <Switch
                  checked={eventData.isPaid}
                  onCheckedChange={(checked) => handleInputChange("isPaid", checked)}
                  data-testid="switch-paid-event"
                />
                <Label>Evento Pago</Label>
                {!eventData.isPaid && (
                  <Badge className="bg-green-500 text-white">Gratuito</Badge>
                )}
              </div>

              {eventData.isPaid && (
                <div>
                  <Label htmlFor="price">Preço por Bilhete (MZN)</Label>
                  <div className="relative mt-1">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="price"
                      type="number"
                      value={eventData.price}
                      onChange={(e) => handleInputChange("price", parseFloat(e.target.value))}
                      placeholder="0.00"
                      className="pl-10"
                      data-testid="input-event-price"
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Taxa da plataforma: 10% será deduzida do valor total
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Partnership Options */}
          <Card>
            <CardHeader>
              <CardTitle>Parcerias Link-A</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <Switch
                  checked={eventData.enablePartnerships}
                  onCheckedChange={(checked) => handleInputChange("enablePartnerships", checked)}
                  data-testid="switch-enable-partnerships"
                />
                <Label>Ativar Parcerias</Label>
              </div>
              <p className="text-sm text-gray-600">
                As parcerias oferecem descontos em alojamentos e transporte para participantes do seu evento
              </p>

              {eventData.enablePartnerships && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
                  <div>
                    <Label htmlFor="accommodationDiscount">Desconto Alojamentos (%)</Label>
                    <Input
                      id="accommodationDiscount"
                      type="number"
                      min="5"
                      max="30"
                      value={eventData.accommodationDiscount}
                      onChange={(e) => handleInputChange("accommodationDiscount", parseInt(e.target.value))}
                      data-testid="input-accommodation-discount"
                    />
                  </div>
                  <div>
                    <Label htmlFor="transportDiscount">Desconto Transporte (%)</Label>
                    <Input
                      id="transportDiscount"
                      type="number"
                      min="5"
                      max="25"
                      value={eventData.transportDiscount}
                      onChange={(e) => handleInputChange("transportDiscount", parseInt(e.target.value))}
                      data-testid="input-transport-discount"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Organizer Information */}
          <Card>
            <CardHeader>
              <CardTitle>Dados do Organizador</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="organizerName">Nome do Organizador</Label>
                  <Input
                    id="organizerName"
                    value={eventData.organizerName}
                    onChange={(e) => handleInputChange("organizerName", e.target.value)}
                    placeholder="Nome ou empresa"
                    data-testid="input-organizer-name"
                  />
                </div>
                <div>
                  <Label htmlFor="organizerContact">Contacto</Label>
                  <Input
                    id="organizerContact"
                    value={eventData.organizerContact}
                    onChange={(e) => handleInputChange("organizerContact", e.target.value)}
                    placeholder="+258 XX XXX XXXX"
                    data-testid="input-organizer-contact"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="organizerEmail">Email</Label>
                <Input
                  id="organizerEmail"
                  type="email"
                  value={eventData.organizerEmail}
                  onChange={(e) => handleInputChange("organizerEmail", e.target.value)}
                  placeholder="organizador@email.com"
                  data-testid="input-organizer-email"
                />
              </div>
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle>Tags e Palavras-chave</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Adicionar tag..."
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  data-testid="input-new-tag"
                />
                <Button type="button" variant="outline" onClick={handleAddTag}>
                  Adicionar
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {eventData.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="cursor-pointer" onClick={() => handleRemoveTag(tag)}>
                    {tag} ×
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex space-x-4 pt-6">
            <Link href="/events">
              <Button variant="outline" className="flex-1">
                Cancelar
              </Button>
            </Link>
            <Button 
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1"
              data-testid="button-create-event"
            >
              {isSubmitting ? "A Criar Evento..." : "Criar Evento"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}