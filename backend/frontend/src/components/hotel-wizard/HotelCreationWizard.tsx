import React, { useState, useEffect } from 'react';
import { accommodationService } from '../../shared/lib/accommodationService';
import { formatMetical } from '@/shared/utils/currency';
import { HotelFormData, HotelCreationWizardProps, RoomFormData, HotelRoomType } from './types';

// Componentes das etapas
import HotelBasicInfo from '../steps/HotelBasicInfo';
import HotelLocation from '../steps/HotelLocation';
import HotelAmenities from '../steps/HotelAmenities';
import HotelRooms from '../steps/HotelRooms';
import HotelImages from '../steps/HotelImages';
import ReviewAndSubmit from '../steps/ReviewAndSubmit';

const steps = [
  'Informações Básicas',
  'Localização',
  'Comodidades',
  'Quartos',
  'Imagens',
  'Revisão'
];

// Estilos usando objetos React.CSSProperties
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '2rem 1rem'
  },
  paper: {
    background: 'white',
    borderRadius: '8px',
    padding: '2rem',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
  },
  title: {
    fontSize: '2rem',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: '0.5rem'
  },
  subtitle: {
    textAlign: 'center',
    color: '#666',
    marginBottom: '2rem'
  },
  stepper: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '2rem',
    position: 'relative'
  },
  step: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    position: 'relative',
    zIndex: 2,
    flex: 1
  },
  stepCircle: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: '#e0e0e0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    marginBottom: '0.5rem'
  },
  stepCircleActive: {
    background: '#1976d2',
    color: 'white'
  },
  stepCircleCompleted: {
    background: '#4caf50',
    color: 'white'
  },
  stepLabel: {
    fontSize: '0.8rem',
    textAlign: 'center'
  },
  alert: {
    padding: '1rem',
    borderRadius: '4px',
    marginBottom: '1rem'
  },
  error: {
    background: '#ffebee',
    color: '#c62828',
    border: '1px solid #ffcdd2'
  },
  success: {
    background: '#e8f5e8',
    color: '#2e7d32',
    border: '1px solid #c8e6c9'
  },
  stepContent: {
    minHeight: '400px'
  },
  navigation: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '2rem'
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
  buttonPrimaryHover: {
    background: '#1565c0'
  },
  buttonSecondary: {
    background: '#f5f5f5',
    color: '#333'
  },
  buttonSecondaryHover: {
    background: '#e0e0e0'
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed'
  },
  stepperLine: {
    position: 'absolute',
    top: '20px',
    left: 0,
    right: 0,
    height: '2px',
    background: '#e0e0e0',
    zIndex: 1
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(255, 255, 255, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    zIndex: 10
  },
  loadingSpinner: {
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #1976d2',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    animation: 'spin 1s linear infinite'
  },
  priceDisplay: {
    color: '#059669',
    fontWeight: 'bold',
    fontSize: '1.1rem'
  },
  modeBadge: {
    display: 'inline-block',
    padding: '0.25rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.875rem',
    fontWeight: 'bold',
    marginBottom: '1rem'
  },
  createBadge: {
    background: '#e8f5e8',
    color: '#2e7d32',
    border: '1px solid #c8e6c9'
  },
  editBadge: {
    background: '#fff3e0',
    color: '#ef6c00',
    border: '1px solid #ffe0b2'
  }
};

// Adicionar keyframes para a animação do spinner
const spinnerStyle = `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`;

const HotelCreationWizard: React.FC<HotelCreationWizardProps> = ({
  onSuccess,
  onCancel,
  mode = 'create',
  initialData,
  hotelId
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState<HotelFormData>({
    name: '',
    description: '',
    category: '',
    email: '',
    phone: '',
    address: '',
    // ✅ CAMPOS CORRETOS - INCLUINDO city E state QUE A INTERFACE EXIGE
    city: '',
    state: '',
    locality: '',
    province: '',
    country: '',
    zipCode: '',
    lat: undefined,
    lng: undefined,
    location: undefined,
    amenities: [],
    rooms: [],
    images: [],
    existingImages: [],
    checkInTime: '',
    checkOutTime: '',
    policies: [],
    isActive: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Converte RoomFormData -> HotelRoomType do service
  const mapRoomsForService = (rooms: RoomFormData[]): HotelRoomType[] => {
    return rooms.map(room => ({
      id: room.id || '',
      name: room.name,
      type: room.type,
      price: room.pricePerNight,
      capacity: room.maxOccupancy,
      quantity: room.quantity,
      description: room.description,
      amenities: room.amenities,
      images: room.images,
      size: room.size,
      bedType: room.bedType,
      hasBalcony: room.hasBalcony,
      hasSeaView: room.hasSeaView
    }));
  };

  useEffect(() => {
    if (mode === 'edit' && hotelId) {
      loadHotelData();
    } else if (initialData) {
      const processedData = {
        ...initialData,
        // ✅ INCLUINDO TODOS OS CAMPOS QUE A INTERFACE EXIGE
        city: initialData.city || '',
        state: initialData.state || '',
        locality: initialData.locality || '',
        province: initialData.province || '',
        country: initialData.country || '',
        lat: initialData.lat || initialData.location?.lat || undefined,
        lng: initialData.lng || initialData.location?.lng || undefined,
        images: initialData.images || [],
        existingImages: initialData.existingImages || [],
        checkInTime: initialData.checkInTime || '',
        checkOutTime: initialData.checkOutTime || '',
        policies: initialData.policies || [],
        isActive: initialData.isActive ?? true,
        amenities: initialData.amenities || [],
        rooms: initialData.rooms || []
      };
      setFormData(processedData as HotelFormData);
    }
  }, [mode, hotelId, initialData]);

  const loadHotelData = async () => {
    if (!hotelId) return;
    
    try {
      setIsLoading(true);
      console.log('📋 Carregando dados do hotel para edição:', hotelId);
      
      if (initialData) {
        const processedData = {
          ...initialData,
          // ✅ INCLUINDO TODOS OS CAMPOS QUE A INTERFACE EXIGE
          city: initialData.city || '',
          state: initialData.state || '',
          locality: initialData.locality || '',
          province: initialData.province || '',
          country: initialData.country || '',
          lat: initialData.lat || initialData.location?.lat || undefined,
          lng: initialData.lng || initialData.location?.lng || undefined,
          images: initialData.images || [],
          existingImages: initialData.existingImages || [],
          checkInTime: initialData.checkInTime || '',
          checkOutTime: initialData.checkOutTime || '',
          policies: initialData.policies || [],
          isActive: initialData.isActive ?? true,
          amenities: initialData.amenities || [],
          rooms: initialData.rooms || []
        };
        setFormData(processedData as HotelFormData);
        console.log('✅ Dados iniciais carregados:', processedData);
      } else {
        try {
          console.log('ℹ️ Tentando carregar dados da API para o hotel:', hotelId);
          await new Promise(resolve => setTimeout(resolve, 1000));
          console.log('⚠️ Nenhum dado encontrado na API, mantendo formulário vazio');
        } catch (apiError) {
          console.error('❌ Erro na API:', apiError);
          setError('Não foi possível carregar os dados do hotel. Preencha manualmente.');
        }
      }
    } catch (err) {
      console.error('❌ Erro ao carregar dados do hotel:', err);
      setError('Erro ao carregar dados do hotel. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateAveragePrice = (): string => {
    if (formData.rooms.length === 0) return formatMetical(0);
    
    const total = formData.rooms.reduce((sum, room) => sum + room.pricePerNight, 0);
    const average = total / formData.rooms.length;
    return formatMetical(average);
  };

  const calculatePriceRange = (): { min: string; max: string } => {
    if (formData.rooms.length === 0) {
      return { min: formatMetical(0), max: formatMetical(0) };
    }
    
    const prices = formData.rooms.map(room => room.pricePerNight);
    return {
      min: formatMetical(Math.min(...prices)),
      max: formatMetical(Math.max(...prices))
    };
  };

  const getTitle = (): string => {
    return mode === 'edit' ? 'Editar Hotel' : 'Cadastro de Hotel';
  };

  const getSubtitle = (): string => {
    const baseText = `Preencha as informações do seu hotel em ${steps.length} etapas`;
    return mode === 'edit' 
      ? `Edite as informações do hotel em ${steps.length} etapas`
      : baseText;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep((prevStep) => prevStep + 1);
      setError('');
      setSuccess('');
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
    setError('');
    setSuccess('');
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 0: // Informações básicas
        if (!formData.name.trim()) {
          setError('Nome do hotel é obrigatório');
          return false;
        }
        if (!formData.category) {
          setError('Categoria do hotel é obrigatória');
          return false;
        }
        if (!formData.email) {
          setError('Email é obrigatório');
          return false;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
          setError('Email inválido');
          return false;
        }
        return true;
      
      case 1: // Localização - ✅ VALIDAÇÃO CORRIGIDA (USANDO CAMPOS EXISTENTES)
        if (!formData.address.trim()) {
          setError('Endereço é obrigatório');
          return false;
        }
        if (!formData.locality.trim()) {
          setError('Localidade é obrigatória');
          return false;
        }
        if (!formData.province.trim()) {
          setError('Província é obrigatória');
          return false;
        }
        if (!formData.country.trim()) {
          setError('País é obrigatório');
          return false;
        }
        // ✅ city e state são opcionais na validação, mas mantidos na interface
        if (formData.lat === undefined || formData.lng === undefined) {
          setError('Selecione uma localização válida da lista de sugestões');
          return false;
        }
        return true;
      
      case 2: // Comodidades
        if (formData.amenities.length === 0) {
          setError('Selecione pelo menos uma comodidade');
          return false;
        }
        return true;
      
      case 3: // Quartos
        if (formData.rooms.length === 0) {
          setError('Adicione pelo menos um tipo de quarto');
          return false;
        }
        
        for (const room of formData.rooms) {
          if (!room.type.trim()) {
            setError('Tipo de quarto é obrigatório para todos os quartos');
            return false;
          }
          
          if (room.pricePerNight === null || room.pricePerNight === undefined) {
            setError(`Preço é obrigatório para: ${room.type}`);
            return false;
          }
          
          if (typeof room.pricePerNight !== 'number' || isNaN(room.pricePerNight)) {
            setError(`Preço deve ser um número válido para: ${room.type}`);
            return false;
          }
          
          if (room.pricePerNight <= 0) {
            setError(`Preço em Metical deve ser maior que zero para: ${room.type}`);
            return false;
          }
          
          if (room.pricePerNight < 100) {
            setError(`Preço muito baixo para ${room.type}. Mínimo recomendado: ${formatMetical(100)}`);
            return false;
          }
          
          if (room.maxOccupancy <= 0) {
            setError('Capacidade deve ser maior que zero para todos os quartos');
            return false;
          }
          
          if (room.quantity <= 0) {
            setError('Quantidade deve ser maior que zero para todos os quartos');
            return false;
          }
        }
        
        console.log('✅ Todos os quartos validados com preços:', 
          formData.rooms.map(room => ({ type: room.type, pricePerNight: room.pricePerNight }))
        );
        return true;
      
      case 4: // Imagens
        const hasImages = (formData.images?.length || 0) + (formData.existingImages?.length || 0) > 0;
        if (!hasImages) {
          setError('Adicione pelo menos uma imagem do hotel');
          return false;
        }
        return true;
      
      default:
        return true;
    }
  };

  const updateFormData = (newData: Partial<HotelFormData>) => {
    setFormData(prev => {
      const updated = { ...prev, ...newData };
      
      if (!updated.images) updated.images = [];
      if (!updated.existingImages) updated.existingImages = [];
      if (!updated.amenities) updated.amenities = [];
      if (!updated.rooms) updated.rooms = [];
      if (!updated.policies) updated.policies = [];
      
      return updated;
    });
  };

  const separateImages = () => {
    const fileImages = formData.images?.filter((img: any): img is File => img instanceof File) || [];
    const stringImages = [
      ...(formData.images?.filter((img: any): img is string => typeof img === 'string') || []),
      ...(formData.existingImages || [])
    ];
    
    return {
      fileImages,
      stringImages
    };
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError('');
      setSuccess('');

      console.log(`🏨 Iniciando ${mode === 'edit' ? 'edição' : 'criação'} do hotel...`, formData);

      const invalidRooms = formData.rooms.filter(room => 
        room.pricePerNight === null || room.pricePerNight === undefined || room.pricePerNight <= 0
      );
      
      if (invalidRooms.length > 0) {
        const invalidRoomNames = invalidRooms.map(room => room.type).join(', ');
        throw new Error(`Preço inválido para os quartos: ${invalidRoomNames}. Preço mínimo: ${formatMetical(100)}`);
      }

      console.log('💰 Preços validados dos quartos (MT):', 
        formData.rooms.map(room => ({
          type: room.type,
          pricePerNight: room.pricePerNight,
          formatted: formatMetical(room.pricePerNight)
        }))
      );

      const { fileImages, stringImages } = separateImages();
      console.log('🖼️ Imagens - Files:', fileImages.length, 'URLs:', stringImages.length);

      let result;
      
      if (mode === 'edit' && hotelId) {
        console.log('✏️ Editando hotel existente:', hotelId);
        
        const editData = {
          ...formData,
          zipCode: formData.zipCode || '',
          images: fileImages,
          existingImages: stringImages,
          rooms: mapRoomsForService(formData.rooms)
        };
        
        result = await accommodationService.updateHotel(hotelId, editData);
        setSuccess('Hotel atualizado com sucesso!');
      } else {
        const createData = {
          ...formData,
          zipCode: formData.zipCode || '',
          images: fileImages,
          existingImages: [],
          rooms: mapRoomsForService(formData.rooms)
        };
        
        console.log('📤 Dados enviados para criação:', {
          hotelInfo: {
            name: createData.name,
            category: createData.category,
            roomsCount: createData.rooms.length,
            hasCoordinates: !!(createData.lat && createData.lng),
            // ✅ LOGS CORRETOS - CAMPOS EXISTENTES
            locality: createData.locality,
            province: createData.province,
            country: createData.country
          },
          rooms: createData.rooms.map(room => ({
            type: room.type,
            price: room.price,
            hasPrice: room.price > 0
          }))
        });

        result = await accommodationService.createHotel(createData);
        setSuccess('Hotel criado com sucesso!');
      }
      
      console.log(`✅ Hotel ${mode === 'edit' ? 'atualizado' : 'criado'} com sucesso:`, result);

      setTimeout(() => {
        onSuccess?.(result.hotelId || hotelId || '');
      }, 2000);
      
    } catch (err) {
      console.error(`❌ Erro ao ${mode === 'edit' ? 'editar' : 'criar'} hotel:`, err);
      
      const errorMessage = err instanceof Error 
        ? err.message 
        : `Erro desconhecido ao ${mode === 'edit' ? 'editar' : 'criar'} hotel. Tente novamente.`;
      
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleButtonHover = (e: React.MouseEvent<HTMLButtonElement>, isPrimary: boolean) => {
    if (!isSubmitting) {
      e.currentTarget.style.backgroundColor = isPrimary 
        ? styles.buttonPrimaryHover.background as string
        : styles.buttonSecondaryHover.background as string;
    }
  };

  const handleButtonLeave = (e: React.MouseEvent<HTMLButtonElement>, isPrimary: boolean) => {
    if (!isSubmitting) {
      e.currentTarget.style.backgroundColor = isPrimary 
        ? styles.buttonPrimary.background as string
        : styles.buttonSecondary.background as string;
    }
  };

  const renderPriceSummary = () => {
    if (formData.rooms.length === 0) return null;

    const priceRange = calculatePriceRange();
    
    return (
      <div style={{ marginBottom: '1rem', padding: '1rem', background: '#f8f9fa', borderRadius: '4px' }}>
        <h4 style={{ margin: '0 0 0.5rem 0', color: '#374151' }}>Resumo de Preços</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <strong>Faixa de Preço:</strong>
            <div style={styles.priceDisplay}>
              {priceRange.min} - {priceRange.max}
            </div>
          </div>
          <div>
            <strong>Preço Médio:</strong>
            <div style={styles.priceDisplay}>
              {calculateAveragePrice()}
            </div>
          </div>
          <div>
            <strong>Tipos de Quarto:</strong>
            <div>{formData.rooms.length} tipos</div>
          </div>
        </div>
      </div>
    );
  };

  const renderModeBadge = () => {
    const badgeStyle = {
      ...styles.modeBadge,
      ...(mode === 'create' ? styles.createBadge : styles.editBadge)
    };

    return (
      <div style={{ textAlign: 'center' }}>
        <span style={badgeStyle}>
          {mode === 'create' ? '📝 CRIANDO NOVO HOTEL' : '✏️ EDITANDO HOTEL'}
        </span>
      </div>
    );
  };

  const renderStep = () => {
    const commonProps = {
      formData,
      updateFormData,
      onNext: handleNext,
      onBack: handleBack,
      mode
    };

    switch (activeStep) {
      case 0:
        return <HotelBasicInfo {...commonProps} />;
      case 1:
        return <HotelLocation {...commonProps} />;
      case 2:
        return <HotelAmenities {...commonProps} />;
      case 3:
        return <HotelRooms {...commonProps} />;
      case 4:
        return <HotelImages {...commonProps} />;
      case 5:
        return (
          <div>
            {renderPriceSummary()}
            <ReviewAndSubmit
              {...commonProps}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              mode={mode}
            />
          </div>
        );
      default:
        return <div>Etapa não encontrada</div>;
    }
  };

  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.paper}>
          <div style={styles.loadingOverlay}>
            <div style={styles.loadingSpinner}></div>
            <div style={{ marginLeft: '1rem' }}>
              {mode === 'edit' ? 'Carregando dados do hotel...' : 'Preparando formulário...'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <style>{spinnerStyle}</style>
      
      <div style={styles.paper}>
        {isSubmitting && (
          <div style={styles.loadingOverlay}>
            <div style={styles.loadingSpinner}></div>
            <div style={{ marginLeft: '1rem' }}>
              {mode === 'edit' ? 'Atualizando hotel...' : 'Criando hotel...'}
            </div>
          </div>
        )}

        <h1 style={styles.title}>{getTitle()}</h1>
        {renderModeBadge()}
        
        <p style={styles.subtitle}>
          {getSubtitle()}
        </p>

        <div style={styles.stepper}>
          <div style={styles.stepperLine}></div>
          {steps.map((label, index) => {
            const isActive = index === activeStep;
            const isCompleted = index < activeStep;
            
            const stepCircleStyle = {
              ...styles.stepCircle,
              ...(isActive ? styles.stepCircleActive : {}),
              ...(isCompleted ? styles.stepCircleCompleted : {})
            };

            return (
              <div key={label} style={styles.step}>
                <div style={stepCircleStyle}>{index + 1}</div>
                <div style={styles.stepLabel}>{label}</div>
              </div>
            );
          })}
        </div>

        {success && (
          <div style={{ ...styles.alert, ...styles.success }}>
            ✅ {success}
          </div>
        )}

        {error && (
          <div style={{ ...styles.alert, ...styles.error }}>
            ❌ {error}
          </div>
        )}

        <div style={styles.stepContent}>
          {renderStep()}
        </div>

        {activeStep < steps.length - 1 && (
          <div style={styles.navigation}>
            <button
              onClick={onCancel || handleBack}
              disabled={(activeStep === 0 && !onCancel) || isSubmitting}
              style={{
                ...styles.button,
                ...styles.buttonSecondary,
                ...((activeStep === 0 && !onCancel) ? styles.buttonDisabled : {})
              }}
              onMouseEnter={(e) => handleButtonHover(e, false)}
              onMouseLeave={(e) => handleButtonLeave(e, false)}
            >
              {activeStep === 0 && onCancel ? 'Cancelar' : 'Voltar'}
            </button>
            
            <button
              onClick={handleNext}
              disabled={isSubmitting}
              style={{
                ...styles.button,
                ...styles.buttonPrimary,
                ...(isSubmitting ? styles.buttonDisabled : {})
              }}
              onMouseEnter={(e) => handleButtonHover(e, true)}
              onMouseLeave={(e) => handleButtonLeave(e, true)}
            >
              {activeStep === steps.length - 2 ? 'Revisar' : 'Próximo'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default HotelCreationWizard;