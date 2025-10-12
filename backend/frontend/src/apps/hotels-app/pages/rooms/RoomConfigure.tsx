import React, { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import accommodationService, { HotelRoom } from "../../../../shared/lib/accommodationService";

const RoomConfigure: React.FC = () => {
  const [, setLocation] = useLocation();
  const params = useParams();

  // ⭐ OBTER accommodationId DINAMICAMENTE
  const getAccommodationId = (): string | null => {
    if (params.hotelId) return params.hotelId;
    if (params.id) return params.id;
    return null;
  };

  const actualAccommodationId = getAccommodationId();
  const roomId = params.roomId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roomData, setRoomData] = useState<Partial<HotelRoom>>({
    roomNumber: "",
    roomType: "",
    pricePerNight: 0,
    status: "Disponível",
    amenities: [],
    images: [],
  });

  // Carrega dados se estiver editando
  useEffect(() => {
    if (!roomId) {
      setLoading(false);
      return;
    }

    const fetchRoom = async () => {
      try {
        const data = await accommodationService.getRoomById(roomId);
        setRoomData(data);
      } catch (err) {
        console.error("Erro ao carregar quarto:", err);
        setError("Não foi possível carregar os dados do quarto.");
      } finally {
        setLoading(false);
      }
    };

    fetchRoom();
  }, [roomId]);

  const handleChange = (key: keyof HotelRoom, value: any) => {
    setRoomData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!actualAccommodationId) {
      alert("Erro: Nenhum hotel selecionado. Volte para a lista de hotéis.");
      setLocation("/hotels");
      return;
    }

    // ⭐ VALIDAÇÃO DOS CAMPOS OBRIGATÓRIOS
    if (!roomData.roomNumber?.trim()) {
      alert("Por favor, preencha o número do quarto.");
      return;
    }

    if (!roomData.roomType?.trim()) {
      alert("Por favor, selecione o tipo de quarto.");
      return;
    }

    setSaving(true);
    try {
      const roomToSave = {
        accommodationId: actualAccommodationId,
        roomTypeId: roomData.roomTypeId || roomData.roomType || "",
        roomNumber: roomData.roomNumber || "",
        roomType: roomData.roomType || "",
        pricePerNight: roomData.pricePerNight ?? 0,
        status: roomData.status || "Disponível",
        amenities: roomData.amenities || [],
        images: roomData.images || [],
      };

      if (roomId) {
        // ⭐ CORREÇÃO: Passa hotelId (accommodationId) como primeiro parâmetro
        await accommodationService.updateRoom(actualAccommodationId, roomId, roomToSave);
        alert("Quarto atualizado com sucesso!");
      } else {
        await accommodationService.createRoom(roomToSave);
        alert("Quarto criado com sucesso!");
      }
      
      // ⭐ CORRIGIDO: Navega de volta para a página apropriada com a rota correta
      if (actualAccommodationId) {
        setLocation(`/hotels/manage-hotel/${actualAccommodationId}`);
      } else {
        setLocation("/rooms");
      }
    } catch (err) {
      console.error("Erro ao salvar quarto:", err);
      alert("Erro ao salvar o quarto. Verifique os dados e tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // ⭐ CORRIGIDO: Navega de volta com a rota correta
    if (actualAccommodationId) {
      setLocation(`/hotels/manage-hotel/${actualAccommodationId}`);
    } else {
      setLocation("/rooms");
    }
  };

  // ⭐ ESTADO DE SEM HOTEL SELECIONADO
  if (!actualAccommodationId) {
    return (
      <div style={{ maxWidth: 600, margin: "0 auto", padding: 16 }}>
        <div style={{ 
          textAlign: 'center', 
          padding: '40px 20px',
          border: '2px dashed #ccc',
          borderRadius: '8px',
          backgroundColor: '#f9f9f9'
        }}>
          <h2 style={{ color: '#666', marginBottom: '16px' }}>Nenhum Hotel Selecionado</h2>
          <p style={{ color: '#888', marginBottom: '24px' }}>
            Para {roomId ? 'editar' : 'criar'} um quarto, você precisa acessar através de um hotel específico.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button 
              onClick={() => setLocation("/hotels")}
              style={{
                padding: '10px 20px',
                backgroundColor: '#0070f3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Ir para Meus Hotéis
            </button>
            <button 
              onClick={() => setLocation("/rooms")}
              style={{
                padding: '10px 20px',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Ver Todos os Quartos
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 16, textAlign: 'center' }}>
      <p>Carregando dados do quarto...</p>
      <small>Hotel ID: {actualAccommodationId}</small>
    </div>
  );
  
  if (error) return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 16, color: '#dc2626' }}>
      {error}
    </div>
  );

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 16 }}>
      <div style={{ marginBottom: '16px' }}>
        <h1>{roomId ? "Editar Quarto" : "Criar Novo Quarto"}</h1>
        <small style={{ color: '#666' }}>
          Hotel ID: {actualAccommodationId}
          {roomId && ` | Quarto ID: ${roomId}`}
        </small>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
          Número do Quarto: *
        </label>
        <input
          type="text"
          value={roomData.roomNumber || ""}
          onChange={(e) => handleChange("roomNumber", e.target.value)}
          style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #ccc" }}
          placeholder="Ex: 101, 201-A, Suite Master"
          required
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
          Tipo de Quarto: *
        </label>
        <select
          value={roomData.roomType || ""}
          onChange={(e) => handleChange("roomType", e.target.value)}
          style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #ccc" }}
          required
        >
          <option value="">Selecione o tipo</option>
          <option value="Standard">Standard</option>
          <option value="Deluxe">Deluxe</option>
          <option value="Suite">Suite</option>
          <option value="Família">Família</option>
          <option value="Executivo">Executivo</option>
        </select>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
          Preço por Noite (MT):
        </label>
        <input
          type="number"
          value={roomData.pricePerNight || 0}
          onChange={(e) => handleChange("pricePerNight", parseFloat(e.target.value) || 0)}
          style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #ccc" }}
          min="0"
          step="0.01"
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
          Status:
        </label>
        <select
          value={roomData.status || "Disponível"}
          onChange={(e) => handleChange("status", e.target.value)}
          style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #ccc" }}
        >
          <option value="Disponível">Disponível</option>
          <option value="Ocupado">Ocupado</option>
          <option value="Manutenção">Manutenção</option>
          <option value="Reservado">Reservado</option>
        </select>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
          Amenities (separados por vírgula):
        </label>
        <input
          type="text"
          value={(roomData.amenities || []).join(", ")}
          onChange={(e) => handleChange("amenities", e.target.value.split(",").map((a) => a.trim()))}
          style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #ccc" }}
          placeholder="Ex: Wi-Fi, Ar condicionado, TV, Frigobar"
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
          URLs das Imagens (separadas por vírgula):
        </label>
        <input
          type="text"
          value={(roomData.images || []).join(", ")}
          onChange={(e) => handleChange("images", e.target.value.split(",").map((a) => a.trim()))}
          style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #ccc" }}
          placeholder="Ex: https://exemplo.com/foto1.jpg, https://exemplo.com/foto2.jpg"
        />
      </div>

      <div style={{ marginTop: 24, display: 'flex', gap: '12px' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{ 
            padding: "12px 24px", 
            background: "#10b981", 
            color: "#fff", 
            border: "none", 
            borderRadius: 4, 
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.7 : 1
          }}
        >
          {saving ? "Salvando..." : "Salvar Quarto"}
        </button>
        <button
          onClick={handleCancel}
          style={{ 
            padding: "12px 24px", 
            background: "#6b7280", 
            color: "#fff", 
            border: "none", 
            borderRadius: 4, 
            cursor: "pointer" 
          }}
        >
          Cancelar
        </button>
      </div>

      <div style={{ marginTop: 16, fontSize: '12px', color: '#666' }}>
        <p>* Campos obrigatórios</p>
      </div>
    </div>
  );
};

export default RoomConfigure;