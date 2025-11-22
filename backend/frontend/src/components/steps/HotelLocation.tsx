import React, { useState, useEffect } from 'react';
import { HotelFormData } from '../hotel-wizard/types';
import LocationAutocomplete from '@/shared/components/LocationAutocomplete';
import { LocationSuggestion } from '../../services/locationsService';

interface HotelLocationProps {
  formData: HotelFormData;
  updateFormData: (data: Partial<HotelFormData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const HotelLocation: React.FC<HotelLocationProps> = ({
  formData,
  updateFormData,
  onNext,
  onBack
}) => {
  const [locationError, setLocationError] = useState('');
  const [localAddress, setLocalAddress] = useState(formData.address || '');

  // ✅ Sincronizar com formData.address
  useEffect(() => {
    setLocalAddress(formData.address || '');
  }, [formData.address]);

  // ✅ CORREÇÃO COMPLETA: Preencher todos os campos necessários
  const handleLocationSelect = (location: LocationSuggestion) => {
    console.log('📍 Localização selecionada no HotelLocation:', location);
    
    // ✅ CORREÇÃO: Preencher todos os campos corretamente
    updateFormData({
      address: `${location.name}, ${location.district}, ${location.province}`,
      locality: location.name,        // ✅ EXISTE NO BANCO
      province: location.province,    // ✅ EXISTE NO BANCO
      country: 'Moçambique',          // ✅ EXISTE NO BANCO
      // ✅ Manter city e state vazios (existem na interface mas não no banco)
      city: '',
      state: '',
      lat: location.lat,
      lng: location.lng
    });

    setLocalAddress(`${location.name}, ${location.district}, ${location.province}`);
    setLocationError('');
  };

  const handleAddressChange = (value: string) => {
    setLocalAddress(value);
    updateFormData({ address: value });
    
    // Se usuário apagar manualmente, limpar outros campos
    if (!value.trim()) {
      updateFormData({
        locality: '',
        province: '',
        city: '',
        state: '',
        lat: undefined,
        lng: undefined
      });
    }
  };

  const handleNext = () => {
    // Validação corrigida - apenas campos importantes
    if (!formData.address?.trim()) {
      setLocationError('Endereço é obrigatório');
      return;
    }

    if (!formData.lat || !formData.lng) {
      setLocationError('Selecione uma localização válida da lista de sugestões');
      return;
    }

    // ✅ CORREÇÃO: Validar apenas campos essenciais
    if (!formData.locality || !formData.province) {
      setLocationError('Localização incompleta. Selecione uma opção da lista.');
      return;
    }

    setLocationError('');
    onNext();
  };

  // Estilos usando React.CSSProperties
  const styles: { [key: string]: React.CSSProperties } = {
    container: {
      marginBottom: '2rem'
    },
    title: {
      marginBottom: '0.5rem',
      fontSize: '1.5rem',
      fontWeight: 'bold',
      textAlign: 'center'
    },
    description: {
      color: '#666',
      marginBottom: '2rem',
      textAlign: 'center'
    },
    formGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '1rem',
      maxWidth: '600px',
      margin: '0 auto'
    },
    formField: {
      display: 'flex',
      flexDirection: 'column'
    },
    fullWidth: {
      gridColumn: '1 / -1'
    },
    label: {
      marginBottom: '0.5rem',
      fontWeight: 'bold',
      fontSize: '0.875rem',
      color: '#333'
    },
    input: {
      padding: '0.75rem',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '1rem',
      fontFamily: 'inherit'
    },
    error: {
      backgroundColor: '#ffebee',
      color: '#c62828',
      border: '1px solid #ffcdd2',
      padding: '1rem',
      borderRadius: '4px',
      marginBottom: '1rem'
    },
    locationPreview: {
      padding: '1rem',
      backgroundColor: '#f0f9ff',
      border: '1px solid #bae6fd',
      borderRadius: '4px',
      marginTop: '1rem'
    },
    locationPreviewTitle: {
      fontWeight: 'bold',
      color: '#0369a1',
      marginBottom: '0.25rem'
    },
    locationPreviewText: {
      fontSize: '0.875rem',
      color: '#0c4a6e'
    },
    navigation: {
      display: 'flex',
      justifyContent: 'space-between',
      marginTop: '2rem',
      maxWidth: '600px',
      margin: '0 auto'
    },
    button: {
      padding: '0.75rem 1.5rem',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '1rem',
      transition: 'all 0.3s ease'
    },
    buttonPrimary: {
      background: '#1976d2',
      color: 'white'
    },
    buttonSecondary: {
      background: '#f5f5f5',
      color: '#333',
      border: '1px solid #ddd'
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Localização do Hotel</h2>
      
      <p style={styles.description}>
        Informe a localização completa do seu estabelecimento
      </p>

      {locationError && (
        <div style={styles.error}>
          ❌ {locationError}
        </div>
      )}

      <div style={styles.formGrid}>
        <div style={{ ...styles.formField, ...styles.fullWidth }}>
          <label htmlFor="location-autocomplete" style={styles.label}>
            Localização Completa *
          </label>
          
          <LocationAutocomplete
            id="location-autocomplete"
            placeholder="Digite o nome da cidade, vila ou localidade..."
            value={localAddress}
            onChange={handleAddressChange}
            onLocationSelect={handleLocationSelect}
            data-testid="location-autocomplete"
          />
          
          <p style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.5rem' }}>
            💡 Comece a digitar e selecione uma opção da lista
          </p>
        </div>

        {/* ✅ CORREÇÃO: Campos de visualização com todos os campos necessários */}
        <div style={styles.formField}>
          <label style={styles.label}>Localidade</label>
          <input
            type="text"
            value={formData.locality || ''}
            readOnly
            style={{ ...styles.input, backgroundColor: '#f9f9f9', color: '#666' }}
            placeholder="Preenchido automaticamente"
          />
        </div>

        <div style={styles.formField}>
          <label style={styles.label}>Província</label>
          <input
            type="text"
            value={formData.province || ''}
            readOnly
            style={{ ...styles.input, backgroundColor: '#f9f9f9', color: '#666' }}
            placeholder="Preenchido automaticamente"
          />
        </div>

        <div style={styles.formField}>
          <label style={styles.label}>País</label>
          <input
            type="text"
            value={formData.country || ''}
            readOnly
            style={{ ...styles.input, backgroundColor: '#f9f9f9', color: '#666' }}
            placeholder="Preenchido automaticamente"
          />
        </div>

        <div style={styles.formField}>
          <label htmlFor="zipCode" style={styles.label}>CEP</label>
          <input
            id="zipCode"
            type="text"
            value={formData.zipCode || ''}
            onChange={(e) => updateFormData({ zipCode: e.target.value })}
            placeholder="Ex: 01310-100"
            style={styles.input}
          />
        </div>

        {/* ✅ CORREÇÃO: Preview da localização com campos corretos */}
        {formData.lat && formData.lng && (
          <div style={{ ...styles.locationPreview, ...styles.fullWidth }}>
            <div style={styles.locationPreviewTitle}>
              ✅ Localização confirmada
            </div>
            <div style={styles.locationPreviewText}>
              <strong>{formData.locality}</strong>
              {formData.province && `, ${formData.province}`}
              {formData.country && `, ${formData.country}`}
              <br />
              <small>Coordenadas: {formData.lat?.toFixed(4)}, {formData.lng?.toFixed(4)}</small>
            </div>
          </div>
        )}

        {/* Campos hidden para debug */}
        <div style={{ ...styles.fullWidth, fontSize: '0.75rem', color: '#999', marginTop: '1rem' }}>
          Debug: {formData.lat ? `Coordenadas OK (${formData.lat}, ${formData.lng})` : 'Aguardando coordenadas...'}
          {formData.locality && ` | Localidade: ${formData.locality}`}
          {formData.province && ` | Província: ${formData.province}`}
        </div>
      </div>

      {/* Navegação */}
      <div style={styles.navigation}>
        <button
          type="button"
          onClick={onBack}
          style={{ ...styles.button, ...styles.buttonSecondary }}
        >
          Voltar
        </button>
        
        <button
          type="button"
          onClick={handleNext}
          style={{ ...styles.button, ...styles.buttonPrimary }}
        >
          Próximo
        </button>
      </div>
    </div>
  );
};

export default HotelLocation;