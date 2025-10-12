// @/components/hotel-wizard/types.ts

// Tipo de quarto usado no wizard (frontend)
export interface RoomFormData {
  id?: string; // existe após salvar no backend
  name: string;
  type: string; // ex: "standard", "suite"
  pricePerNight: number; // frontend usa pricePerNight
  maxOccupancy: number;   // frontend usa maxOccupancy
  quantity: number;
  description: string;
  amenities: string[];
  images: (string | File)[];
  size?: number;
  bedType?: string;
  hasBalcony?: boolean;
  hasSeaView?: boolean;
}

// Tipo usado pelo serviço/backend (o que o Wizard envia)
export interface HotelRoomType {
  id: string; // obrigatório no backend
  name: string;
  type: string;
  price: number;     // corresponde a pricePerNight
  capacity: number;  // corresponde a maxOccupancy
  quantity: number;
  description: string;
  amenities: string[];
  images: (string | File)[];
  size?: number;
  bedType?: string;
  hasBalcony?: boolean;
  hasSeaView?: boolean;
}

// Função de mapeamento de frontend → backend
export const mapRoomToBackend = (room: RoomFormData): HotelRoomType => ({
  id: room.id || '', // obrigatório no backend
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
});

// Tipo principal do hotel usado no wizard
export interface HotelFormData {
  hotelId?: string; // opcional, usado para edição
  name: string;
  description: string;
  category: string;
  email: string;
  phone: string;

  address: string;
  city: string;
  state: string;
  country: string;
  zipCode?: string;
  location?: { lat: number; lng: number };

  amenities: string[];
  rooms: RoomFormData[];

  images: (string | File)[];
  existingImages?: string[];

  checkInTime: string;
  checkOutTime: string;
  policies?: string[];

  isActive: boolean;
}

// Props para o wizard
export interface HotelCreationWizardProps {
  open: boolean;
  onCancel?: () => void; // substituir onClose
  onSuccess?: (hotelId: string) => void; // substituir onSubmit
  mode?: 'create' | 'edit';
  initialData?: HotelFormData;
  hotelId?: string;
}

// Props do ReviewAndSubmit
export interface ReviewAndSubmitProps {
  formData: HotelFormData;
  updateFormData: (newData: Partial<HotelFormData>) => void;
  onNext: () => void;
  onBack: () => void;
  mode: 'create' | 'edit';
  isSubmitting: boolean;
  onSuccess: () => Promise<void>; // async
}