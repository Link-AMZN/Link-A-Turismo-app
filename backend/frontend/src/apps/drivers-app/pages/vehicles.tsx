// src/apps/drivers-app/pages/vehicles.tsx - VERSÃO CORRIGIDA
import { useState, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { useToast } from '@/shared/hooks/use-toast';
import { useAuth } from '@/shared/hooks/useAuth';
import { Plus, Car, Edit, Trash2, AlertCircle, CheckCircle, X } from 'lucide-react';
import { vehiclesApi, Vehicle, VehicleFormData } from '../../../api/driver/vehicles';

export default function VehiclesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [formLoading, setFormLoading] = useState(false); // ✅ NOVO ESTADO

  const [formData, setFormData] = useState<VehicleFormData>({
    plateNumber: '',
    make: '',
    model: '',
    color: '',
    year: new Date().getFullYear(),
    vehicleType: 'sedan',
    maxPassengers: 4,
    features: [],
    photoUrl: '',
  });

  const vehicleTypes = [
    { value: 'sedan', label: 'Sedan', description: 'Carro de 4 portas' },
    { value: 'suv', label: 'SUV', description: 'Veículo utilitário desportivo' },
    { value: 'hatchback', label: 'Hatchback', description: 'Carro compacto' },
    { value: 'pickup', label: 'Pickup', description: 'Camião de caixa aberta' },
    { value: 'van', label: 'Van', description: 'Van ou Minibus' },
    { value: 'minibus', label: 'Minibus', description: 'Minibus de passageiros' },
  ];

  const loadVehicles = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await vehiclesApi.getMyVehicles();
      if (response.success) {
        setVehicles(response.vehicles);
      } else {
        setError('Erro ao carregar veículos');
      }
    } catch (error) {
      console.error('❌ Erro ao carregar veículos:', error);
      setError('Erro ao carregar veículos. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVehicles();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) {
      toast({
        title: "Erro de autenticação",
        description: "Você precisa estar autenticado para cadastrar um veículo.",
        variant: "destructive",
      });
      return;
    }

    try {
      setFormLoading(true); // ✅ LOADING INICIADO
      
      if (editingVehicle) {
        // Atualizar veículo
        const response = await vehiclesApi.updateVehicle(editingVehicle.id, formData);
        if (response.success) {
          toast({
            title: "✅ Veículo atualizado!",
            description: "Seu veículo foi atualizado com sucesso.",
          });
          await loadVehicles();
          resetForm();
        }
      } else {
        // Criar veículo
        const response = await vehiclesApi.createVehicle(formData);
        if (response.success) {
          toast({
            title: "✅ Veículo cadastrado!",
            description: "Seu veículo foi cadastrado com sucesso.",
          });
          await loadVehicles();
          resetForm();
        }
      }
    } catch (error: any) {
      console.error('❌ Erro ao salvar veículo:', error);
      toast({
        title: "❌ Erro",
        description: error.message || "Erro ao salvar veículo. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setFormLoading(false); // ✅ LOADING FINALIZADO
    }
  };

  const handleDelete = async (vehicleId: string) => {
    if (!confirm('Tem certeza que deseja desativar este veículo?')) {
      return;
    }

    try {
      const response = await vehiclesApi.deleteVehicle(vehicleId);
      if (response.success) {
        toast({
          title: "✅ Veículo desativado!",
          description: "Seu veículo foi desativado com sucesso.",
        });
        await loadVehicles();
      }
    } catch (error: any) {
      console.error('❌ Erro ao desativar veículo:', error);
      toast({
        title: "❌ Erro",
        description: error.message || "Erro ao desativar veículo. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      plateNumber: '',
      make: '',
      model: '',
      color: '',
      year: new Date().getFullYear(),
      vehicleType: 'sedan',
      maxPassengers: 4,
      features: [],
      photoUrl: '',
    });
    setEditingVehicle(null);
    setShowForm(false);
  };

  const startEdit = (vehicle: Vehicle) => {
    setFormData({
      plateNumber: vehicle.plateNumber,
      make: vehicle.make,
      model: vehicle.model,
      color: vehicle.color,
      year: vehicle.year,
      vehicleType: vehicle.vehicleType,
      maxPassengers: vehicle.maxPassengers,
      features: vehicle.features || [],
      photoUrl: vehicle.photoUrl || '',
    });
    setEditingVehicle(vehicle);
    setShowForm(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Meus Veículos
          </h1>
          <p className="text-gray-600">
            Gerencie seus veículos para oferecer boleias
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-4">
            <AlertCircle className="w-4 h-4 inline mr-2" />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de Veículos */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Veículos Cadastrados</CardTitle>
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Veículo
                </Button>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
                    <p className="text-gray-500 mt-2">Carregando veículos...</p>
                  </div>
                ) : vehicles.length === 0 ? (
                  <div className="text-center py-8">
                    <Car className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Nenhum veículo cadastrado
                    </h3>
                    <p className="text-gray-500 mb-4">
                      Cadastre seu primeiro veículo para começar a oferecer boleias.
                    </p>
                    <Button onClick={() => setShowForm(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Cadastrar Primeiro Veículo
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {vehicles.map((vehicle) => (
                      <div
                        key={vehicle.id}
                        className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                              <Car className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold">
                                {vehicle.make} {vehicle.model}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {vehicle.color} • {vehicle.plateNumber}
                              </p>
                              <p className="text-xs text-gray-500">
                                {vehicle.vehicleType} • {vehicle.maxPassengers} passageiros
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                vehicle.isActive
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {vehicle.isActive ? (
                                <>
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Ativo
                                </>
                              ) : (
                                'Inativo'
                              )}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => startEdit(vehicle)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(vehicle.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Formulário */}
          {showForm && (
            <div className="lg:col-span-1">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>
                    {editingVehicle ? 'Editar Veículo' : 'Cadastrar Veículo'}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetForm}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="plateNumber">Matrícula *</Label>
                      <Input
                        id="plateNumber"
                        value={formData.plateNumber}
                        onChange={(e) =>
                          setFormData({ ...formData, plateNumber: e.target.value })
                        }
                        placeholder="ex: AB-123-CD"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="make">Marca *</Label>
                        <Input
                          id="make"
                          value={formData.make}
                          onChange={(e) =>
                            setFormData({ ...formData, make: e.target.value })
                          }
                          placeholder="ex: Toyota"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="model">Modelo *</Label>
                        <Input
                          id="model"
                          value={formData.model}
                          onChange={(e) =>
                            setFormData({ ...formData, model: e.target.value })
                          }
                          placeholder="ex: Corolla"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="color">Cor *</Label>
                        <Input
                          id="color"
                          value={formData.color}
                          onChange={(e) =>
                            setFormData({ ...formData, color: e.target.value })
                          }
                          placeholder="ex: Preto"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="year">Ano</Label>
                        <Input
                          id="year"
                          type="number"
                          min="1900"
                          max={new Date().getFullYear() + 1}
                          value={formData.year}
                          onChange={(e) =>
                            setFormData({ ...formData, year: parseInt(e.target.value) })
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="vehicleType">Tipo de Veículo *</Label>
                      <Select
                        value={formData.vehicleType}
                        onValueChange={(value) =>
                          setFormData({ ...formData, vehicleType: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          {vehicleTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label} - {type.description}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="maxPassengers">Capacidade de Passageiros *</Label>
                      <Select
                        value={formData.maxPassengers.toString()}
                        onValueChange={(value) =>
                          setFormData({ ...formData, maxPassengers: parseInt(value) })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Número de passageiros" />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map(
                            (num) => (
                              <SelectItem key={num} value={num.toString()}>
                                {num} {num === 1 ? 'passageiro' : 'passageiros'}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="photoUrl">URL da Foto (Opcional)</Label>
                      <Input
                        id="photoUrl"
                        value={formData.photoUrl}
                        onChange={(e) =>
                          setFormData({ ...formData, photoUrl: e.target.value })
                        }
                        placeholder="https://exemplo.com/foto.jpg"
                      />
                    </div>

                    <div className="flex space-x-2 pt-4">
                      <Button 
                        type="submit" 
                        className="flex-1"
                        disabled={formLoading}
                      >
                        {formLoading ? (
                          <>
                            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                            {editingVehicle ? 'Atualizando...' : 'Cadastrando...'}
                          </>
                        ) : (
                          editingVehicle ? 'Atualizar Veículo' : 'Cadastrar Veículo'
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={resetForm}
                        disabled={formLoading}
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
      </div>
    </div>
  );
}