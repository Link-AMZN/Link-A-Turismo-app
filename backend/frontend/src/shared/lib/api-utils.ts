export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('pt-MZ', {
    style: 'currency',
    currency: 'MZN'
  }).format(price);
};

export const normalizeRide = (ride: any) => {
  if (!ride) return null;
  
  return {
    ...ride,
    id: ride.id || ride.ride_id,
    driverId: ride.driverId || ride.driver_id,
    fromAddress: ride.fromAddress || ride.from_address,
    toAddress: ride.toAddress || ride.to_address,
    departureDate: ride.departureDate || ride.departure_date,
    pricePerSeat: ride.pricePerSeat || ride.price_per_seat,
    availableSeats: ride.availableSeats || ride.available_seats,
    formattedPrice: formatPrice(ride.pricePerSeat || ride.price_per_seat || 0),
  };
};

export interface Ride {
  id: string;
  driverId: string;
  fromAddress: string;
  toAddress: string;
  departureDate: string;
  pricePerSeat: number;
  availableSeats: number;
  formattedPrice?: string;
}

export interface RideSearchResponse {
  success: boolean;
  data: Ride[];
  error?: string;
}
