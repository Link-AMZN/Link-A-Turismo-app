import { useState } from 'react';

// ---------------- Interfaces ----------------
export interface RideSearchParams {
  from?: string;
  to?: string;
  date?: string;
  passengers?: number;
}

export interface RideCreateParams {
  from?: string;
  to?: string;
  date?: string;
  seats?: number;
  price?: number;
}

export interface HotelSearchParams {
  location?: string;
  locationId?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
}

export interface HotelBookingParams {
  hotelId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
}

export interface ModalState {
  rideSearch: {
    isOpen: boolean;
    params: RideSearchParams;
  };
  rideCreate: {
    isOpen: boolean;
    params: RideCreateParams;
  };
  hotelSearch: {
    isOpen: boolean;
    params: HotelSearchParams;
  };
  hotelBooking: {
    isOpen: boolean;
    params: HotelBookingParams | null;
  };
}

// ---------------- Estado Inicial ----------------
const initialModalState: ModalState = {
  rideSearch: { isOpen: false, params: {} as RideSearchParams },
  rideCreate: { isOpen: false, params: {} as RideCreateParams },
  hotelSearch: { isOpen: false, params: {} as HotelSearchParams },
  hotelBooking: { isOpen: false, params: null },
};

// ---------------- Hook ----------------
export function useModalState() {
  const [modalState, setModalState] = useState<ModalState>(initialModalState);

  // Função genérica para abrir/fechar modais
  const setModal = <
    T extends keyof ModalState,
    P extends ModalState[T]['params']
  >(
    key: T,
    isOpen: boolean,
    params: P = {} as P
  ) => {
    setModalState(prev => ({
      ...prev,
      [key]: { isOpen, params },
    }));
  };

  // Métodos específicos usando a função genérica
  const openRideSearch = (params: RideSearchParams = {}) =>
    setModal('rideSearch', true, params);
  const closeRideSearch = () => setModal('rideSearch', false);

  const openRideCreate = (params: RideCreateParams = {}) =>
    setModal('rideCreate', true, params);
  const closeRideCreate = () => setModal('rideCreate', false);

  const openHotelSearch = (params: HotelSearchParams = {}) =>
    setModal('hotelSearch', true, params);
  const closeHotelSearch = () => setModal('hotelSearch', false);

  const openHotelBooking = (params: HotelBookingParams) =>
    setModal('hotelBooking', true, params);
  const closeHotelBooking = () => setModal('hotelBooking', false, null);

  const closeAllModals = () => setModalState(initialModalState);

  return {
    modalState,
    openRideSearch,
    closeRideSearch,
    openRideCreate,
    closeRideCreate,
    openHotelSearch,
    closeHotelSearch,
    openHotelBooking,
    closeHotelBooking,
    closeAllModals,
  };
}