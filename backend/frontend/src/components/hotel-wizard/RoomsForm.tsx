import React, { useState } from 'react';
import { useAuth } from '@/shared/hooks/useAuth'; // ⭐⭐ ADICIONAR IMPORT DO HOOK

interface AddRoomFormProps {
  accommodationId: string;
  hotelAddress: string;
  onRoomCreated?: () => void; // ⭐ NOVO: Callback para atualizar a lista
}

const AddRoomForm: React.FC<AddRoomFormProps> = ({ accommodationId, hotelAddress, onRoomCreated }) => {
  const { token: authToken } = useAuth(); // ⭐⭐ OBTER TOKEN DO HOOK
  
  const [formData, setFormData] = useState({
    roomNumber: '',
    roomType: 'standard',
    description: '',
    pricePerNight: 0,
    maxOccupancy: 2,
    bedType: 'double',
    bedCount: 1,
    hasPrivateBathroom: true,
    hasAirConditioning: false,
    hasWifi: false,
    hasTV: false,
    hasBalcony: false,
    hasKitchen: false,
    amenities: [] as string[],
    images: [] as string[],
    isAvailable: true,
    status: 'available'
  });
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      // ⭐⭐ VERIFICAR SE TOKEN ESTÁ DISPONÍVEL
      if (!authToken) {
        throw new Error('Token de autenticação não disponível. Faça login novamente.');
      }

      console.log('🔑 Token disponível:', authToken ? `SIM (${authToken.length} chars)` : 'NÃO');

      // ⭐⭐ CORREÇÃO: Criar na tabela hotelRooms usando a API correta
      const roomPayload = {
        accommodationId: accommodationId, // ID do hotel pai
        roomNumber: formData.roomNumber,
        roomType: formData.roomType,
        description: formData.description,
        pricePerNight: Number(formData.pricePerNight),
        maxOccupancy: Number(formData.maxOccupancy),
        bedType: formData.bedType,
        bedCount: Number(formData.bedCount),
        hasPrivateBathroom: formData.hasPrivateBathroom,
        hasAirConditioning: formData.hasAirConditioning,
        hasWifi: formData.hasWifi,
        hasTV: formData.hasTV,
        hasBalcony: formData.hasBalcony,
        hasKitchen: formData.hasKitchen,
        amenities: [
          ...(formData.hasPrivateBathroom ? ['Banheiro Privativo'] : []),
          ...(formData.hasAirConditioning ? ['Ar Condicionado'] : []),
          ...(formData.hasWifi ? ['Wi-Fi'] : []),
          ...(formData.hasTV ? ['TV'] : []),
          ...(formData.hasBalcony ? ['Varanda'] : []),
          ...(formData.hasKitchen ? ['Cozinha'] : []),
        ],
        images: formData.images,
        isAvailable: formData.isAvailable,
        status: formData.status
      };

      console.log('📤 Criando QUARTO na tabela hotelRooms:', roomPayload);
      
      // ⭐⭐ CORREÇÃO: Usar a rota API correta COM TOKEN
      const response = await fetch(`/api/hotels/${accommodationId}/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}` // ⭐⭐ ADICIONAR TOKEN NO HEADER
        },
        body: JSON.stringify(roomPayload)
      });

      console.log('📨 Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erro da API:', errorText);
        
        if (response.status === 401) {
          throw new Error('Não autorizado - token inválido ou expirado');
        } else if (response.status === 403) {
          throw new Error('Sem permissão para criar quartos neste hotel');
        } else if (response.status === 404) {
          throw new Error('Hotel não encontrado');
        } else {
          throw new Error(`Falha ao criar quarto: ${response.status} ${response.statusText}`);
        }
      }

      const result = await response.json();
      
      console.log('✅ Quarto criado com sucesso:', result);
      setSuccess('Quarto criado com sucesso!');
      
      // Reset form
      setFormData({
        roomNumber: '',
        roomType: 'standard',
        description: '',
        pricePerNight: 0,
        maxOccupancy: 2,
        bedType: 'double',
        bedCount: 1,
        hasPrivateBathroom: true,
        hasAirConditioning: false,
        hasWifi: false,
        hasTV: false,
        hasBalcony: false,
        hasKitchen: false,
        amenities: [],
        images: [],
        isAvailable: true,
        status: 'available'
      });

      // ⭐⭐ CORREÇÃO: Chamar callback para atualizar lista
      if (onRoomCreated) {
        onRoomCreated();
      }
      
    } catch (err) {
      console.error('❌ Erro ao criar quarto:', err);
      setError(err instanceof Error ? err.message : 'Falha ao criar o quarto. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked 
              : type === 'number' ? Number(value) 
              : value
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-bold">Adicionar Novo Quarto</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p className="font-bold">Erro</p>
          <p>{error}</p>
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          <p className="font-bold">Sucesso!</p>
          <p>{success}</p>
        </div>
      )}

      {/* Debug info - pode remover depois */}
      <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded">
        <p>🔑 Token: {authToken ? `Disponível (${authToken.length} chars)` : 'Indisponível'}</p>
        <p>🏨 Hotel ID: {accommodationId}</p>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">Número do Quarto *</label>
        <input
          type="text"
          name="roomNumber"
          value={formData.roomNumber}
          onChange={handleChange}
          placeholder="ex: 101, 202-A, Suite-1"
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">Tipo de Quarto *</label>
        <select
          name="roomType"
          value={formData.roomType}
          onChange={handleChange}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          required
        >
          <option value="standard">Standard</option>
          <option value="deluxe">Deluxe</option>
          <option value="suite">Suite</option>
          <option value="executive">Executivo</option>
          <option value="family">Família</option>
          <option value="presidential">Presidencial</option>
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">Descrição</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Descreva as características do quarto..."
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          rows={3}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Preço por Noite (MT) *</label>
          <input
            type="number"
            name="pricePerNight"
            value={formData.pricePerNight}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            required
            min="1"
            step="0.01"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Máx. Ocupação *</label>
          <input
            type="number"
            name="maxOccupancy"
            value={formData.maxOccupancy}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            required
            min="1"
            max="10"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Tipo de Cama</label>
          <select
            name="bedType"
            value={formData.bedType}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="single">Solteiro</option>
            <option value="double">Casal</option>
            <option value="queen">Queen</option>
            <option value="king">King</option>
            <option value="twin">Gêmeas</option>
            <option value="bunk">Beliche</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Nº de Camas</label>
          <input
            type="number"
            name="bedCount"
            value={formData.bedCount}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            min="1"
            max="5"
          />
        </div>
      </div>

      {/* Comodidades */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Comodidades</label>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              name="hasPrivateBathroom"
              checked={formData.hasPrivateBathroom}
              onChange={handleCheckboxChange}
              className="mr-2"
            />
            Banheiro Privativo
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              name="hasAirConditioning"
              checked={formData.hasAirConditioning}
              onChange={handleCheckboxChange}
              className="mr-2"
            />
            Ar Condicionado
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              name="hasWifi"
              checked={formData.hasWifi}
              onChange={handleCheckboxChange}
              className="mr-2"
            />
            Wi-Fi
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              name="hasTV"
              checked={formData.hasTV}
              onChange={handleCheckboxChange}
              className="mr-2"
            />
            TV
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              name="hasBalcony"
              checked={formData.hasBalcony}
              onChange={handleCheckboxChange}
              className="mr-2"
            />
            Varanda
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              name="hasKitchen"
              checked={formData.hasKitchen}
              onChange={handleCheckboxChange}
              className="mr-2"
            />
            Cozinha
          </label>
        </div>
      </div>

      <div className="flex space-x-2 pt-4">
        <button 
          type="submit" 
          disabled={loading || !authToken}
          className={`px-4 py-2 text-white rounded ${
            loading || !authToken
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          {loading ? 'Criando...' : 'Criar Quarto'}
        </button>
        
        <button
          type="button"
          onClick={() => setFormData({
            roomNumber: '',
            roomType: 'standard',
            description: '',
            pricePerNight: 0,
            maxOccupancy: 2,
            bedType: 'double',
            bedCount: 1,
            hasPrivateBathroom: true,
            hasAirConditioning: false,
            hasWifi: false,
            hasTV: false,
            hasBalcony: false,
            hasKitchen: false,
            amenities: [],
            images: [],
            isAvailable: true,
            status: 'available'
          })}
          className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
        >
          Limpar
        </button>
      </div>

      {!authToken && (
        <div className="text-sm text-orange-600 bg-orange-100 p-2 rounded">
          ⚠️ Token de autenticação não disponível. Faça login novamente.
        </div>
      )}
    </form>
  );
};

export default AddRoomForm;