// components/HotelPartnerships.tsx - VERSÃO CORRIGIDA COM SELETOR
import { useState, useEffect } from "react";
import { usePartnerships } from "../../../shared/hooks/usePartnerships";
import { useAuth } from "@/shared/hooks/useAuth";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Handshake, Users, MapPin, DollarSign, Plus, MessageSquare, Star, Calendar, TrendingUp, Eye, CheckCircle, XCircle, Building2, Loader2 } from "lucide-react";
import { useToast } from "@/shared/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import apiService from "../../../shared/lib/api";

// Interfaces para tipagem forte
interface Hotel {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  isActive: boolean;
}

interface Proposal {
  id: string;
  hotelId: string;
  title: string;
  description: string;
  type: "accommodation" | "meal" | "fuel" | "maintenance";
  city: string;
  state: string;
  country: string;
  radiusKm: number;
  discountRate: number;
  offerFreeAccommodation: boolean;
  offerMeals: boolean;
  offerFuel: boolean;
  premiumRate: number;
  minimumDriverLevel: string;
  requiredVehicleType: string;
  maxApplicants?: number;
  currentApplicants: number;
  startDate: string;
  endDate: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface Application {
  id: string;
  proposalId: string;
  driverId: string;
  applicationDate: string;
  driverFeedback?: string;
  hotelFeedback?: string;
  status: "pending" | "accepted" | "rejected" | "completed" | "cancelled";
  acceptedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export default function HotelPartnerships() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<string | null>(null);
  const [selectedHotelId, setSelectedHotelId] = useState<string | null>(null);
  
  const {
    useHotelProposals,
    createProposal,
    useProposalApplications,
    updateApplicationStatus
  } = usePartnerships();

  // ✅ CORREÇÃO: Resetar proposta selecionada ao mudar hotel
  useEffect(() => {
    setSelectedProposal(null);
  }, [selectedHotelId]);

  // Buscar hotéis do usuário
  const { data: userHotels = [], isLoading: hotelsLoading } = useQuery<Hotel[]>({
    queryKey: ['user-hotels', user?.id],
    queryFn: async () => {
      try {
        const response = await apiService.getUserHotels();
        return Array.isArray(response) ? response : [];
      } catch (error) {
        console.error('Erro ao buscar hotéis:', error);
        toast({
          title: "Erro",
          description: "Falha ao carregar hotéis",
          variant: "destructive"
        });
        return [];
      }
    },
    enabled: !!user?.id
  });

  // Selecionar o primeiro hotel automaticamente quando carregar
  useEffect(() => {
    if (userHotels.length > 0 && !selectedHotelId) {
      setSelectedHotelId(userHotels[0].id);
    }
  }, [userHotels, selectedHotelId]);

  // Estado do formulário alinhado com backend
  const [newProposal, setNewProposal] = useState({
    title: "",
    description: "",
    type: "accommodation" as "accommodation" | "meal" | "fuel" | "maintenance",
    city: "",
    state: "",
    country: "Moçambique",
    radiusKm: 50,
    discountRate: 10,
    offerFreeAccommodation: false,
    offerMeals: false,
    offerFuel: false,
    premiumRate: 0,
    minimumDriverLevel: "bronze",
    requiredVehicleType: "any",
    maxApplicants: undefined as number | undefined,
    startDate: "",
    endDate: ""
  });

  // Buscar propostas do hotel selecionado
  const { data: proposals = [], isLoading: proposalsLoading, refetch: refetchProposals } = useHotelProposals(selectedHotelId || '');

  // Buscar aplicações se uma proposta estiver selecionada
  const { data: applications = [], refetch: refetchApplications } = useProposalApplications(selectedProposal || '');

  const handleCreateProposal = async () => {
    if (!selectedHotelId) {
      toast({
        title: "Erro",
        description: "Por favor, selecione um hotel primeiro",
        variant: "destructive"
      });
      return;
    }

    try {
      await createProposal.mutateAsync({
        ...newProposal,
        hotelId: selectedHotelId
      });
      setShowCreateForm(false);
      setNewProposal({
        title: "",
        description: "",
        type: "accommodation",
        city: "",
        state: "",
        country: "Moçambique",
        radiusKm: 50,
        discountRate: 10,
        offerFreeAccommodation: false,
        offerMeals: false,
        offerFuel: false,
        premiumRate: 0,
        minimumDriverLevel: "bronze",
        requiredVehicleType: "any",
        maxApplicants: undefined,
        startDate: "",
        endDate: ""
      });
      refetchProposals();
      
      // ✅ CORREÇÃO: Toast de sucesso
      toast({
        title: "Sucesso",
        description: "Proposta criada com sucesso!",
        variant: "default"
      });
    } catch (error) {
      // ✅ CORREÇÃO: Toast de erro
      toast({
        title: "Erro",
        description: "Falha ao criar proposta",
        variant: "destructive"
      });
    }
  };

  const handleUpdateApplicationStatus = async (applicationId: string, status: string) => {
    try {
      await updateApplicationStatus.mutateAsync({ 
        applicationId, 
        status,
        feedback: status === 'accepted' ? 'Parceria aceita com sucesso!' : undefined
      });
      refetchApplications();
      
      // ✅ CORREÇÃO: Toast de sucesso
      toast({
        title: "Sucesso",
        description: `Candidatura ${status === 'accepted' ? 'aceita' : 'rejeitada'} com sucesso!`,
        variant: "default"
      });
    } catch (error) {
      // ✅ CORREÇÃO: Toast de erro
      toast({
        title: "Erro",
        description: "Falha ao atualizar candidatura",
        variant: "destructive"
      });
    }
  };

  // ✅ CORREÇÃO: Tipagem forte da função
  const calculateTotalDiscount = (proposal: Proposal) => {
    let discount = proposal.discountRate || 0;
    if (proposal.offerFreeAccommodation) discount += 15;
    if (proposal.offerMeals) discount += 5;
    if (proposal.offerFuel) discount += 8;
    if (proposal.premiumRate) discount += proposal.premiumRate;
    return Math.min(discount, 40);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: 'Ativa', color: 'bg-green-100 text-green-800' },
      paused: { label: 'Pausada', color: 'bg-yellow-100 text-yellow-800' },
      completed: { label: 'Concluída', color: 'bg-blue-100 text-blue-800' },
      cancelled: { label: 'Cancelada', color: 'bg-red-100 text-red-800' }
    };
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
  };

  const getSelectedHotelName = () => {
    if (!selectedHotelId) return "";
    const hotel = userHotels.find(h => h.id === selectedHotelId);
    return hotel?.name || "Hotel Selecionado";
  };

  // ✅ CORREÇÃO: Função para navegação (placeholder)
  const handleCreateHotel = () => {
    toast({
      title: "Funcionalidade em desenvolvimento",
      description: "Criação de hotel será implementada em breve",
      variant: "default"
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-4">
        <div className="mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Programa de Parcerias</h1>
              <p className="text-gray-600">Crie propostas de parceria para motoristas e gerencie candidaturas</p>
            </div>
            
            {/* Seletor de Hotel */}
            {userHotels.length > 0 && (
              <div className="flex items-center gap-4">
                <Label htmlFor="hotel-select" className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  Hotel:
                </Label>
                <Select value={selectedHotelId || ""} onValueChange={setSelectedHotelId}>
                  <SelectTrigger className="w-64" id="hotel-select">
                    <Building2 className="w-4 h-4 mr-2" />
                    {hotelsLoading ? (
                      <span>Carregando hotéis...</span>
                    ) : (
                      <SelectValue placeholder="Selecionar hotel" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {userHotels.map((hotel) => (
                      <SelectItem key={hotel.id} value={hotel.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{hotel.name}</span>
                          <span className="text-xs text-gray-500">
                            {hotel.city}, {hotel.state}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        {/* Mensagem se não houver hotéis */}
        {userHotels.length === 0 && !hotelsLoading && (
          <Card className="mb-6">
            <CardContent className="text-center py-12">
              <Building2 className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhum hotel cadastrado
              </h3>
              <p className="text-gray-600 mb-4">
                Você precisa ter pelo menos um hotel cadastrado para criar propostas de parceria.
              </p>
              <Button onClick={handleCreateHotel}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Hotel
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Conteúdo principal (só mostra se tiver hotel selecionado) */}
        {selectedHotelId && userHotels.length > 0 && (
          <Tabs defaultValue="proposals">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="proposals">
                Minhas Propostas ({proposals.length})
              </TabsTrigger>
              <TabsTrigger value="applications">
                Candidaturas ({applications.length})
              </TabsTrigger>
            </TabsList>

            {/* Lista de Propostas */}
            <TabsContent value="proposals" className="mt-6">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Propostas de Parceria - {getSelectedHotelName()}
                  </h2>
                  <p className="text-gray-600 text-sm">
                    Crie e gerencie propostas de parceria para o seu hotel
                  </p>
                </div>
                <Button 
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="bg-green-600 hover:bg-green-700"
                  disabled={!selectedHotelId}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {showCreateForm ? "Cancelar" : "Nova Proposta"}
                </Button>
              </div>

              {/* Formulário de Criação */}
              {showCreateForm && (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Criar Nova Proposta de Parceria</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="title">Título da Proposta *</Label>
                        <Input
                          id="title"
                          placeholder="Ex: Parceria VIP para Motoristas Gold"
                          value={newProposal.title}
                          onChange={(e) => setNewProposal(prev => ({ ...prev, title: e.target.value }))}
                          disabled={createProposal.isPending} // ✅ CORREÇÃO: Desabilitar durante mutation
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="type">Tipo de Parceria *</Label>
                        <Select 
                          value={newProposal.type} 
                          onValueChange={(value: "accommodation" | "meal" | "fuel" | "maintenance") => setNewProposal(prev => ({ ...prev, type: value }))}
                          disabled={createProposal.isPending} // ✅ CORREÇÃO: Desabilitar durante mutation
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="accommodation">Hospedagem</SelectItem>
                            <SelectItem value="meal">Refeições</SelectItem>
                            <SelectItem value="fuel">Combustível</SelectItem>
                            <SelectItem value="maintenance">Manutenção</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Descrição Detalhada *</Label>
                      <Textarea
                        id="description"
                        placeholder="Descreva os benefícios, condições e requisitos da parceria..."
                        value={newProposal.description}
                        onChange={(e) => setNewProposal(prev => ({ ...prev, description: e.target.value }))}
                        rows={4}
                        disabled={createProposal.isPending} // ✅ CORREÇÃO: Desabilitar durante mutation
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city">Cidade *</Label>
                        <Input
                          id="city"
                          placeholder="Ex: Maputo"
                          value={newProposal.city}
                          onChange={(e) => setNewProposal(prev => ({ ...prev, city: e.target.value }))}
                          disabled={createProposal.isPending} // ✅ CORREÇÃO: Desabilitar durante mutation
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="state">Província *</Label>
                        <Input
                          id="state"
                          placeholder="Ex: Maputo"
                          value={newProposal.state}
                          onChange={(e) => setNewProposal(prev => ({ ...prev, state: e.target.value }))}
                          disabled={createProposal.isPending} // ✅ CORREÇÃO: Desabilitar durante mutation
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="discountRate">Desconto Base (%)</Label>
                        <Input
                          id="discountRate"
                          type="number"
                          min="0"
                          max="100"
                          value={newProposal.discountRate}
                          onChange={(e) => setNewProposal(prev => ({ ...prev, discountRate: Number(e.target.value) }))}
                          disabled={createProposal.isPending} // ✅ CORREÇÃO: Desabilitar durante mutation
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="startDate">Data de Início *</Label>
                        <Input
                          id="startDate"
                          type="date"
                          value={newProposal.startDate}
                          onChange={(e) => setNewProposal(prev => ({ ...prev, startDate: e.target.value }))}
                          disabled={createProposal.isPending} // ✅ CORREÇÃO: Desabilitar durante mutation
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="endDate">Data de Término *</Label>
                        <Input
                          id="endDate"
                          type="date"
                          value={newProposal.endDate}
                          onChange={(e) => setNewProposal(prev => ({ ...prev, endDate: e.target.value }))}
                          disabled={createProposal.isPending} // ✅ CORREÇÃO: Desabilitar durante mutation
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button 
                        onClick={handleCreateProposal}
                        disabled={!newProposal.title || !newProposal.description || !newProposal.city || !newProposal.state || !newProposal.startDate || !newProposal.endDate || createProposal.isPending}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {createProposal.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Criando...
                          </>
                        ) : (
                          "Publicar Proposta"
                        )}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setShowCreateForm(false)}
                        disabled={createProposal.isPending}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Lista de Propostas */}
              <div className="space-y-4">
                {proposalsLoading ? (
                  <div className="text-center py-8 flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Carregando propostas...</span>
                  </div>
                ) : proposals.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-12">
                      <Handshake className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Nenhuma proposta criada
                      </h3>
                      <p className="text-gray-600 mb-4">
                        Comece criando sua primeira proposta de parceria para motoristas.
                      </p>
                      <Button onClick={() => setShowCreateForm(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Criar Primeira Proposta
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  proposals.map((proposal: Proposal) => {
                    const totalDiscount = calculateTotalDiscount(proposal);
                    const statusBadge = getStatusBadge(proposal.status);
                    
                    return (
                      <Card key={proposal.id} className="border-l-4 border-l-green-500">
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="flex items-center gap-2">
                                <Handshake className="w-5 h-5 text-green-600" />
                                {proposal.title}
                              </CardTitle>
                              <div className="flex items-center gap-4 mt-2">
                                <Badge className={statusBadge.color}>
                                  {statusBadge.label}
                                </Badge>
                                <span className="text-sm text-gray-600 flex items-center gap-1">
                                  <MapPin className="w-4 h-4" />
                                  {proposal.city}, {proposal.state}
                                </span>
                                <span className="text-sm text-gray-600 flex items-center gap-1">
                                  <Users className="w-4 h-4" />
                                  {proposal.currentApplicants} candidatos
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-green-600">
                                {totalDiscount}% OFF
                              </div>
                              <div className="text-sm text-gray-600">
                                Desconto total
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        
                        <CardContent>
                          <p className="text-gray-700 mb-4">{proposal.description}</p>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div>
                              <p className="text-sm text-gray-600">Tipo</p>
                              <p className="font-medium capitalize">{proposal.type}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Nível Mínimo</p>
                              <p className="font-medium capitalize">{proposal.minimumDriverLevel}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Período</p>
                              <p className="font-medium">
                                {new Date(proposal.startDate).toLocaleDateString()} - {new Date(proposal.endDate).toLocaleDateString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Candidaturas</p>
                              <p className="font-medium">
                                {proposal.currentApplicants}
                                {proposal.maxApplicants && ` / ${proposal.maxApplicants}`}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setSelectedProposal(proposal.id)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Ver Candidaturas
                            </Button>
                            <Button size="sm" variant="outline">
                              <TrendingUp className="w-4 h-4 mr-1" />
                              Estatísticas
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </TabsContent>

            {/* Lista de Candidaturas */}
            <TabsContent value="applications" className="mt-6">
              {!selectedProposal ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <Users className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Selecione uma proposta
                    </h3>
                    <p className="text-gray-600">
                      Clique em "Ver Candidaturas" em uma proposta para ver as candidaturas recebidas.
                    </p>
                  </CardContent>
                </Card>
              ) : applications.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <Users className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Nenhuma candidatura
                    </h3>
                    <p className="text-gray-600">
                      Esta proposta ainda não recebeu candidaturas de motoristas.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {applications.map((application: Application) => (
                    <Card key={application.id}>
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <Users className="w-5 h-5 text-blue-600" />
                              </div>
                              <div>
                                <h4 className="font-semibold">Motorista #{application.driverId}</h4>
                                <p className="text-sm text-gray-600">
                                  Candidatou-se em {new Date(application.applicationDate).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            
                            {application.driverFeedback && (
                              <div className="bg-gray-50 p-3 rounded-lg mb-3">
                                <p className="text-sm text-gray-700">
                                  <strong>Mensagem do motorista:</strong> {application.driverFeedback}
                                </p>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex flex-col gap-2">
                            <Badge variant={
                              application.status === 'accepted' ? 'default' :
                              application.status === 'rejected' ? 'destructive' : 'secondary'
                            }>
                              {application.status === 'pending' && 'Pendente'}
                              {application.status === 'accepted' && 'Aceite'}
                              {application.status === 'rejected' && 'Rejeitada'}
                              {application.status === 'completed' && 'Concluída'}
                              {application.status === 'cancelled' && 'Cancelada'}
                            </Badge>
                            
                            {application.status === 'pending' && (
                              <div className="flex gap-1">
                                <Button 
                                  size="sm" 
                                  onClick={() => handleUpdateApplicationStatus(application.id, 'accepted')}
                                  className="bg-green-600 hover:bg-green-700"
                                  disabled={updateApplicationStatus.isPending}
                                >
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  {updateApplicationStatus.isPending ? '...' : 'Aceitar'}
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="destructive"
                                  onClick={() => handleUpdateApplicationStatus(application.id, 'rejected')}
                                  disabled={updateApplicationStatus.isPending}
                                >
                                  <XCircle className="w-3 h-3 mr-1" />
                                  {updateApplicationStatus.isPending ? '...' : 'Rejeitar'}
                                </Button>
                              </div>
                            )}
                            
                            <Button size="sm" variant="outline">
                              <MessageSquare className="w-3 h-3 mr-1" />
                              Contactar
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}