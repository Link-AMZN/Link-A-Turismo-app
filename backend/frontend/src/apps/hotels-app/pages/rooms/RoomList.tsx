import React, { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import accommodationService, { HotelRoom } from "../../../../shared/lib/accommodationService";

const RoomList: React.FC = () => {
  const [, setLocation] = useLocation();
  const params = useParams();
  const [rooms, setRooms] = useState<HotelRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  // ⭐ OBTER accommodationId DINAMICAMENTE (agora sem props)
  const getAccommodationId = (): string | null => {
    // 1. Da URL /hotels/manage-hotel/:hotelId (nova rota corrigida)
    if (params.hotelId) return params.hotelId;
    
    // 2. Da URL /hotels/:id (rotas existentes)
    if (params.id) return params.id;
    
    // 3. Tentar obter de outras formas (contexto, localStorage, etc.)
    // Por enquanto, retorna null se não encontrar na URL
    return null;
  };

  const actualAccommodationId = getAccommodationId();

  const fetchRooms = async () => {
    if (!actualAccommodationId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await accommodationService.getRooms(actualAccommodationId);
      setRooms(data);
    } catch (err) {
      console.error("Erro ao buscar quartos:", err);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [actualAccommodationId]);

  const handleEdit = (roomId: string) => {
    setLocation(`/rooms/edit/${roomId}`);
  };

  const handleViewDetails = (roomId: string) => {
    setLocation(`/rooms/details/${roomId}`);
  };

  const handleDelete = async (roomId: string) => {
    if (!confirm("Tem certeza que deseja excluir este quarto?")) return;

    setDeleting(roomId);
    try {
      if (accommodationService.deleteRoom) {
        await accommodationService.deleteRoom(roomId);
      } else {
        console.warn("Método deleteRoom não implementado no service.");
      }
      // Atualiza a lista após exclusão
      setRooms((prev) => prev.filter((r) => r.id !== roomId));
      alert("Quarto excluído com sucesso!");
    } catch (err) {
      console.error("Erro ao excluir quarto:", err);
      alert("Erro ao excluir quarto.");
    } finally {
      setDeleting(null);
    }
  };

  const handleAddRoom = () => {
    if (actualAccommodationId) {
      // ⭐ CORRIGIDO: Navega para a página de gestão do hotel específico com a rota correta
      setLocation(`/hotels/manage-hotel/${actualAccommodationId}`);
    } else {
      // ⭐ CORRIGIDO: Fallback para página geral de hotéis
      setLocation("/hotels");
    }
  };

  // ⭐ ESTADO DE SEM ACCOMMODATION ID
  if (!actualAccommodationId) {
    return (
      <div style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
        <div style={{ 
          textAlign: 'center', 
          padding: '40px 20px',
          border: '2px dashed #ccc',
          borderRadius: '8px',
          backgroundColor: '#f9f9f9'
        }}>
          <h2 style={{ color: '#666', marginBottom: '16px' }}>Nenhum Hotel Selecionado</h2>
          <p style={{ color: '#888', marginBottom: '24px' }}>
            Para visualizar e gerenciar quartos, você precisa acessar através de um hotel específico.
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
              onClick={() => setLocation("/hotels/manage-hotel")}
              style={{
                padding: '10px 20px',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Gerenciar Quartos
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <p>Carregando quartos do hotel...</p>
          <small>Hotel ID: {actualAccommodationId}</small>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <div>
          <h1>Quartos do Hotel</h1>
          <small style={{ color: '#666' }}>ID: {actualAccommodationId}</small>
        </div>
        <button 
          onClick={handleAddRoom}
          style={{
            padding: '8px 16px',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          + Adicionar Quarto
        </button>
      </div>

      {rooms.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px 20px',
          border: '2px dashed #ccc',
          borderRadius: '8px',
          backgroundColor: '#f9f9f9'
        }}>
          <h3 style={{ color: '#666', marginBottom: '16px' }}>Nenhum Quarto Encontrado</h3>
          <p style={{ color: '#888', marginBottom: '24px' }}>
            Este hotel ainda não possui quartos cadastrados.
          </p>
          <button 
            onClick={handleAddRoom}
            style={{
              padding: '10px 20px',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Adicionar Primeiro Quarto
          </button>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: '16px', color: '#666' }}>
            {rooms.length} quarto(s) encontrado(s)
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", border: '1px solid #ddd' }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #ccc", backgroundColor: '#f5f5f5' }}>
                <th style={{ textAlign: "left", padding: "12px 8px" }}>Número</th>
                <th style={{ textAlign: "left", padding: "12px 8px" }}>Tipo</th>
                <th style={{ textAlign: "left", padding: "12px 8px" }}>Preço / Noite</th>
                <th style={{ textAlign: "left", padding: "12px 8px" }}>Status</th>
                <th style={{ textAlign: "center", padding: "12px 8px" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => (
                <tr key={room.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td
                    style={{ padding: "12px 8px", cursor: "pointer", color: "#0070f3" }}
                    onClick={() => handleViewDetails(room.id)}
                    title="Clique para ver detalhes"
                  >
                    {room.roomNumber}
                  </td>
                  <td style={{ padding: "12px 8px" }}>{room.roomType}</td>
                  <td style={{ padding: "12px 8px" }}>
                    {room.pricePerNight ? `MT ${room.pricePerNight.toFixed(2)}` : "-"}
                  </td>
                  <td style={{ padding: "12px 8px" }}>
                    <span style={{ 
                      padding: '4px 8px', 
                      borderRadius: '12px',
                      fontSize: '12px',
                      backgroundColor: room.status === 'available' ? '#10b981' : '#ef4444',
                      color: 'white'
                    }}>
                      {room.status === 'available' ? 'Disponível' : 'Indisponível'}
                    </span>
                  </td>
                  <td style={{ padding: "12px 8px", textAlign: "center" }}>
                    <button 
                      onClick={() => handleEdit(room.id)} 
                      style={{ 
                        marginRight: 8,
                        padding: '6px 12px',
                        border: '1px solid #0070f3',
                        backgroundColor: 'white',
                        color: '#0070f3',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(room.id)}
                      disabled={deleting === room.id}
                      style={{ 
                        padding: '6px 12px',
                        border: '1px solid #dc2626',
                        backgroundColor: deleting === room.id ? '#fca5a5' : 'white',
                        color: deleting === room.id ? '#7f1d1d' : '#dc2626',
                        borderRadius: '4px',
                        cursor: deleting === room.id ? 'not-allowed' : 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      {deleting === room.id ? "Excluindo..." : "Excluir"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
};

export default RoomList;