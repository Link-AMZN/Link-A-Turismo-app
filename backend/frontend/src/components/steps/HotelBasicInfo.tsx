import React from 'react';
import { HotelFormData } from '../hotel-wizard/types'; // ✅ CORRIGIDO: import do types correto

interface HotelBasicInfoProps {
  formData: HotelFormData;
  updateFormData: (data: Partial<HotelFormData>) => void;
  onNext: () => void;
  onBack: () => void;
  mode: 'create' | 'edit'; // ✅ ADICIONADO: prop mode que falta
}

const categories = [
  { value: 'budget', label: 'Econômico' },
  { value: 'standard', label: 'Standard' },
  { value: 'luxury', label: 'Luxo' },
  { value: 'boutique', label: 'Boutique' },
  { value: 'resort', label: 'Resort' }
];

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    marginBottom: '2rem'
  },
  title: {
    marginBottom: '0.5rem',
    fontSize: '1.5rem',
    fontWeight: 'bold',
    textAlign: 'center' // ✅ MELHORIA: centralizar título
  },
  description: {
    color: '#666',
    marginBottom: '2rem',
    textAlign: 'center' // ✅ MELHORIA: centralizar descrição
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
    maxWidth: '600px', // ✅ MELHORIA: limitar largura
    margin: '0 auto' // ✅ MELHORIA: centralizar formulário
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
    fontSize: '0.875rem', // ✅ MELHORIA: tamanho de fonte consistente
    color: '#333'
  },
  input: {
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '1rem',
    fontFamily: 'inherit', // ✅ MELHORIA: manter fonte consistente
    transition: 'border-color 0.3s' // ✅ MELHORIA: transição suave
  },
  textarea: {
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '1rem',
    resize: 'vertical',
    minHeight: '100px',
    fontFamily: 'inherit',
    transition: 'border-color 0.3s' // ✅ MELHORIA: transição suave
  },
  select: {
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '1rem',
    backgroundColor: 'white',
    fontFamily: 'inherit',
    transition: 'border-color 0.3s' // ✅ MELHORIA: transição suave
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

const HotelBasicInfo: React.FC<HotelBasicInfoProps> = ({
  formData,
  updateFormData,
  onNext,
  onBack,
  mode
}) => {
  const handleChange = (field: keyof HotelFormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    updateFormData({ [field]: event.target.value });
  };

  // ✅ MELHORIA: Adicionar foco visual nos inputs
  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.target.style.borderColor = '#1976d2';
    e.target.style.boxShadow = '0 0 0 2px rgba(25, 118, 210, 0.2)';
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.target.style.borderColor = '#ddd';
    e.target.style.boxShadow = 'none';
  };

  const handleNext = () => {
    // Validação básica
    if (!formData.name.trim()) {
      alert('Nome do hotel é obrigatório');
      return;
    }
    if (!formData.category) {
      alert('Categoria do hotel é obrigatória');
      return;
    }
    if (!formData.email) {
      alert('Email é obrigatório');
      return;
    }
    
    onNext();
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Informações Básicas do Hotel</h2>
      
      <p style={styles.description}>
        Forneça as informações fundamentais do seu estabelecimento
      </p>

      <div style={styles.formGrid}>
        <div style={styles.formField}>
          <label htmlFor="name" style={styles.label}>Nome do Hotel *</label>
          <input
            id="name"
            type="text"
            value={formData.name}
            onChange={handleChange('name')}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            placeholder="Ex: Hotel Praia Dourada"
            style={styles.input}
          />
        </div>

        <div style={{ ...styles.formField, ...styles.fullWidth }}>
          <label htmlFor="description" style={styles.label}>Descrição</label>
          <textarea
            id="description"
            value={formData.description}
            onChange={handleChange('description')}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            placeholder="Descreva as características e serviços do seu hotel..."
            style={styles.textarea}
          />
        </div>

        <div style={styles.formField}>
          <label htmlFor="category" style={styles.label}>Categoria *</label>
          <select
            id="category"
            value={formData.category}
            onChange={handleChange('category')}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            style={styles.select}
          >
            <option value="">Selecione uma categoria</option>
            {categories.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.formField}>
          <label htmlFor="phone" style={styles.label}>Telefone</label>
          <input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={handleChange('phone')}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            placeholder="(11) 99999-9999"
            style={styles.input}
          />
        </div>

        <div style={{ ...styles.formField, ...styles.fullWidth }}>
          <label htmlFor="email" style={styles.label}>Email *</label>
          <input
            id="email"
            type="email"
            value={formData.email}
            onChange={handleChange('email')}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            placeholder="contato@hotel.com"
            style={styles.input}
          />
        </div>
      </div>

      {/* ✅ CORREÇÃO: Adicionar navegação */}
      <div style={styles.navigation}>
        <button
          type="button"
          onClick={onBack}
          style={styles.buttonSecondary}
        >
          Voltar
        </button>
        
        <button
          type="button"
          onClick={handleNext}
          style={styles.buttonPrimary}
        >
          Próximo
        </button>
      </div>
    </div>
  );
};

export default HotelBasicInfo;