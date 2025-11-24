// rideFrontend.ts
import { Ride } from '../src/api/client/rides';

// ✅ Interface extendida para incluir campos do RideWithMatch
interface RideWithMatch extends Ride {
  fromLocation?: string;
  toLocation?: string;
  estimatedDuration?: number;
  vehicleFeatures?: string[];
  vehiclePhoto?: string;
  price?: number;
  currentPassengers?: number;
  departureTime?: string;
  vehicleType?: string;
  status?: string;
  allowNegotiation?: boolean;
  allowPickupEnRoute?: boolean;
  isVerifiedDriver?: boolean;
  driver?: {
    firstName?: string;
    lastName?: string;
    rating?: number;
    isVerified?: boolean;
  };
}

export interface RideFrontend {
  id: string;
  driverId: string;
  driverName: string;
  driverRating: number;
  vehicleMake: string;
  vehicleModel: string;
  vehicleType: string;
  vehiclePlate: string;
  vehicleColor: string;
  maxPassengers: number;
  fromCity: string;
  toCity: string;
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
  departureDate: string;
  availableSeats: number;
  pricePerSeat: number; // ✅ CORREÇÃO: Agora é number
  distanceFromCityKm: number;
  distanceToCityKm: number;
  
  // ✅ campos opcionais de matching
  matchType?: string;
  routeCompatibility?: number;
  matchDescription?: string;

  // ✅✅✅ CAMPOS ADICIONAIS PARA RideWithMatch
  fromLocation?: string | null; // ✅ CORREÇÃO: Pode ser null
  toLocation?: string | null;   // ✅ CORREÇÃO: Pode ser null
  estimatedDuration?: number;
  vehicleFeatures?: string[];
  vehiclePhoto?: string;
  price?: number;
  currentPassengers?: number;
  departureTime?: string | null; // ✅ CORREÇÃO: Pode ser null
  status?: string;
  allowNegotiation?: boolean;
  allowPickupEnRoute?: boolean;
  isVerifiedDriver?: boolean;
  
  // ✅ Informações do driver para compatibilidade
  driver?: {
    firstName?: string;
    lastName?: string;
    rating?: number;
    isVerified?: boolean;
  };
}

export function mapRideToFrontend(ride: Ride | RideWithMatch): RideFrontend {
  // ✅ Converter campos numéricos com segurança e fallbacks apropriados
  const driverRating = Number(
    ride.driver_rating ?? 
    ride.driver_rating ?? 
    4.5
  );
  
  const maxPassengers = Number(
    ride.max_passengers ?? 
    ride.max_passengers ?? 
    4
  );
  
  const availableSeats = Number(
    ride.availableseats ?? 
    ride.availableseats ?? 
    0
  );
  
  const fromLat = Number(ride.from_lat ?? 0);
  const fromLng = Number(ride.from_lng ?? 0);
  const toLat = Number(ride.to_lat ?? 0);
  const toLng = Number(ride.to_lng ?? 0);
  const distanceFromCityKm = Number(ride.distance_from_city_km ?? 0);
  const distanceToCityKm = Number(ride.distance_to_city_km ?? 0);
  
  // ✅ Preço como número (CORREÇÃO CRÍTICA)
  const pricePerSeat = Number(
    ride.priceperseat ?? 
    ride.priceperseat ?? 
    0
  );
  
  // ✅ Extrair campos do RideWithMatch se disponíveis
  const rideWithMatch = ride as RideWithMatch;
  
  return {
    // ✅ Campos principais do PostgreSQL
    id: ride.ride_id || ride.id || '',
    driverId: ride.driver_id || ride.driver_id || '',
    driverName: ride.driver_name || 'Motorista',
    driverRating: driverRating,
    vehicleMake: ride.vehicle_make || '',
    vehicleModel: ride.vehicle_model || 'Veículo',
    
    // ✅ CORREÇÃO: vehicleType com fallback 'unknown'
    vehicleType: ride.vehicle_type ?? rideWithMatch.vehicleType ?? 'unknown',
    
    vehiclePlate: ride.vehicle_plate || 'Não informada',
    vehicleColor: ride.vehicle_color || 'Não informada',
    maxPassengers: maxPassengers,
    fromCity: ride.from_city || '',
    toCity: ride.to_city || '',
    fromLat: fromLat,
    fromLng: fromLng,
    toLat: toLat,
    toLng: toLng,
    departureDate: ride.departuredate || ride.departuredate || '',
    availableSeats: availableSeats,
    
    // ✅ CORREÇÃO: pricePerSeat agora é number
    pricePerSeat: pricePerSeat,
    
    distanceFromCityKm: distanceFromCityKm,
    distanceToCityKm: distanceToCityKm,
    
    // ✅ Campos de matching
    matchType: ride.match_type,
    routeCompatibility: ride.route_compatibility,
    matchDescription: ride.match_description,

    // ✅✅✅ CAMPOS ADICIONAIS - CORREÇÕES APLICADAS
    // ✅ CORREÇÃO: Usar null em vez de fallback para cidade
    fromLocation: rideWithMatch.fromLocation ?? null,
    toLocation: rideWithMatch.toLocation ?? null,
    
    estimatedDuration: rideWithMatch.estimatedDuration,
    vehicleFeatures: rideWithMatch.vehicleFeatures,
    vehiclePhoto: rideWithMatch.vehiclePhoto,
    
    // ✅ CORREÇÃO: Preço com fallback do pricePerSeat
    price: rideWithMatch.price ?? pricePerSeat,
    
    currentPassengers: rideWithMatch.currentPassengers ?? 0,
    
    // ✅ CORREÇÃO: departureTime com fallback apropriado
    departureTime: rideWithMatch.departureTime ?? ride.departuredate ?? null,
    
    status: rideWithMatch.status ?? 'available',
    allowNegotiation: rideWithMatch.allowNegotiation ?? true,
    allowPickupEnRoute: rideWithMatch.allowPickupEnRoute ?? true,
    isVerifiedDriver: rideWithMatch.isVerifiedDriver,
    
    // ✅ Informações do driver para compatibilidade
    driver: rideWithMatch.driver || (ride.driver_name ? {
      firstName: ride.driver_name.split(' ')[0] || 'Motorista',
      lastName: ride.driver_name.split(' ').slice(1).join(' ') || '',
      rating: driverRating,
      isVerified: rideWithMatch.isVerifiedDriver ?? false
    } : undefined)
  };
}

export function mapRidesToFrontend(rides: (Ride | RideWithMatch)[]): RideFrontend[] {
  return rides.map(mapRideToFrontend);
}