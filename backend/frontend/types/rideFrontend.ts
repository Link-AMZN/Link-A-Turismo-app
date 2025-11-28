// rideFrontend.ts

// ✅✅✅ CORREÇÃO: REMOVER import problemático e criar interface independente
// ❌ REMOVER: import { Ride } from '../src/api/client/rides';

// ✅✅✅ CORREÇÃO: Interface RideWithMatch COMPLETAMENTE INDEPENDENTE
export interface RideWithMatch {
  // ✅ Campos básicos
  id: string;
  driverId: string;
  driverName: string;
  driverRating: number;
  fromLocation: string;
  toLocation: string;
  fromCity: string;
  toCity: string;
  fromAddress: string;
  toAddress: string;
  fromProvince?: string;
  toProvince?: string;
  departureDate: string;
  departureTime: string;
  price: number;
  pricePerSeat: number;
  availableSeats: number;
  maxPassengers: number;
  vehicle: string;
  vehicleType: string;
  status: string;
  type: string;
  
  // ✅✅✅ CORREÇÃO CRÍTICA: CAMPOS DO VEÍCULO
  vehiclePlate?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  vehiclePlateRaw?: string;
  
  // ✅ Campos formatados
  departureDateFormatted?: string;
  departureTimeFormatted?: string;
  departureDateTimeFormatted?: string;
  departureLongDate?: string;
  departureWeekday?: string;
  distanceFromUserKm?: number;
  
  // ✅ Campos de matching
  match_type?: 'exact_match' | 'same_segment' | 'covers_route' | 'nearby' | 'same_direction' | 'smart_match' | 'potential_match' | 'smart_final_direct';
  route_compatibility?: number;
  matchScore?: number;
  dist_from_user_km?: number;
  distance_from_city_km?: number;
  distance_to_city_km?: number;
  
  // ✅ Campos adicionais
  currentPassengers?: number;
  vehicleInfo?: any;
  description?: string;
  vehiclePhoto?: string;
  estimatedDuration?: number;
  estimatedDistance?: number;
  allowNegotiation?: boolean;
  allowPickupEnRoute?: boolean;
  isVerifiedDriver?: boolean;
  driver?: {
    firstName?: string;
    lastName?: string;
    rating?: number;
    isVerified?: boolean;
  };
  from_lat?: number;
  from_lng?: number;
  to_lat?: number;
  to_lng?: number;
  vehicleFeatures?: string[];
}

// ✅ Interface para compatibilidade (manter se necessário para outros componentes)
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
  pricePerSeat: number;
  distanceFromCityKm: number;
  distanceToCityKm: number;
  
  // ✅ campos opcionais de matching
  matchType?: string;
  routeCompatibility?: number;
  matchDescription?: string;

  // ✅✅✅ CAMPOS ADICIONAIS
  fromLocation?: string | null;
  toLocation?: string | null;
  estimatedDuration?: number;
  vehicleFeatures?: string[];
  vehiclePhoto?: string;
  price?: number;
  currentPassengers?: number;
  departureTime?: string | null;
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

// ✅✅✅ CORREÇÃO: Função de mapeamento simplificada para RideWithMatch
export function mapToRideWithMatch(ride: any): RideWithMatch {
  console.log('🔄 [MAPEAMENTO-RideWithMatch] Processando ride:', {
    id: ride.id,
    vehiclePlate: ride.vehiclePlate,
    vehicleMake: ride.vehicleMake,
    vehicleModel: ride.vehicleModel,
    vehicleColor: ride.vehicleColor
  });

  return {
    // ✅ Campos básicos
    id: ride.id || ride.ride_id || '',
    driverId: ride.driverId || ride.driver_id || '',
    driverName: ride.driverName || ride.driver_name || 'Motorista',
    driverRating: Number(ride.driverRating ?? ride.driver_rating ?? 4.5),
    fromLocation: ride.fromLocation || ride.from_address || ride.from_city || '',
    toLocation: ride.toLocation || ride.to_address || ride.to_city || '',
    fromCity: ride.fromCity || ride.from_city || '',
    toCity: ride.toCity || ride.to_city || '',
    fromAddress: ride.fromAddress || ride.from_address || '',
    toAddress: ride.toAddress || ride.to_address || '',
    fromProvince: ride.fromProvince || ride.from_province,
    toProvince: ride.toProvince || ride.to_province,
    departureDate: ride.departureDate || ride.departuredate || '',
    departureTime: ride.departureTime || '',
    price: Number(ride.price ?? ride.pricePerSeat ?? ride.priceperseat ?? 0),
    pricePerSeat: Number(ride.pricePerSeat ?? ride.priceperseat ?? 0),
    availableSeats: Number(ride.availableSeats ?? ride.availableseats ?? 0),
    maxPassengers: Number(ride.maxPassengers ?? ride.max_passengers ?? 4),
    vehicle: ride.vehicle || 'Veículo não disponível',
    vehicleType: ride.vehicleType || ride.vehicle_type || 'economy',
    status: ride.status || 'available',
    type: ride.type || 'one-way',
    
    // ✅✅✅ CORREÇÃO CRÍTICA: CAMPOS DO VEÍCULO
    vehiclePlate: ride.vehiclePlate,
    vehicleMake: ride.vehicleMake,
    vehicleModel: ride.vehicleModel,
    vehicleColor: ride.vehicleColor,
    vehiclePlateRaw: ride.vehiclePlateRaw,
    
    // ✅ Campos formatados
    departureDateFormatted: ride.departureDateFormatted,
    departureTimeFormatted: ride.departureTimeFormatted,
    departureDateTimeFormatted: ride.departureDateTimeFormatted,
    departureLongDate: ride.departureLongDate,
    departureWeekday: ride.departureWeekday,
    distanceFromUserKm: ride.distanceFromUserKm,
    
    // ✅ Campos de matching
    match_type: ride.match_type || ride.matchType,
    route_compatibility: ride.route_compatibility || ride.routeCompatibility,
    matchScore: ride.matchScore,
    dist_from_user_km: ride.dist_from_user_km || ride.distanceFromUserKm,
    distance_from_city_km: ride.distance_from_city_km || ride.distanceFromCityKm,
    distance_to_city_km: ride.distance_to_city_km || ride.distanceToCityKm,
    
    // ✅ Campos adicionais
    currentPassengers: ride.currentPassengers,
    vehicleInfo: ride.vehicleInfo,
    description: ride.description,
    vehiclePhoto: ride.vehiclePhoto,
    estimatedDuration: ride.estimatedDuration,
    estimatedDistance: ride.estimatedDistance,
    allowNegotiation: ride.allowNegotiation,
    allowPickupEnRoute: ride.allowPickupEnRoute,
    isVerifiedDriver: ride.isVerifiedDriver,
    driver: ride.driver,
    from_lat: ride.from_lat || ride.fromLat,
    from_lng: ride.from_lng || ride.fromLng,
    to_lat: ride.to_lat || ride.toLat,
    to_lng: ride.to_lng || ride.toLng,
    vehicleFeatures: ride.vehicleFeatures,
  };
}

// ✅ Função para mapear múltiplos rides
export function mapRidesToRideWithMatch(rides: any[]): RideWithMatch[] {
  return rides.map(mapToRideWithMatch);
}

// ✅✅✅ CORREÇÃO: Função de mapeamento para RideFrontend (manter compatibilidade)
export function mapRideToFrontend(ride: any): RideFrontend {
  const rideWithMatch = mapToRideWithMatch(ride);
  
  return {
    id: rideWithMatch.id,
    driverId: rideWithMatch.driverId,
    driverName: rideWithMatch.driverName,
    driverRating: rideWithMatch.driverRating,
    vehicleMake: rideWithMatch.vehicleMake || '',
    vehicleModel: rideWithMatch.vehicleModel || 'Veículo',
    vehicleType: rideWithMatch.vehicleType,
    vehiclePlate: rideWithMatch.vehiclePlate || 'Não informada',
    vehicleColor: rideWithMatch.vehicleColor || 'Não informada',
    maxPassengers: rideWithMatch.maxPassengers,
    fromCity: rideWithMatch.fromCity,
    toCity: rideWithMatch.toCity,
    fromLat: rideWithMatch.from_lat || 0,
    fromLng: rideWithMatch.from_lng || 0,
    toLat: rideWithMatch.to_lat || 0,
    toLng: rideWithMatch.to_lng || 0,
    departureDate: rideWithMatch.departureDate,
    availableSeats: rideWithMatch.availableSeats,
    pricePerSeat: rideWithMatch.pricePerSeat,
    distanceFromCityKm: rideWithMatch.distance_from_city_km || 0,
    distanceToCityKm: rideWithMatch.distance_to_city_km || 0,
    
    matchType: rideWithMatch.match_type,
    routeCompatibility: rideWithMatch.route_compatibility,
    matchDescription: ride.match_description,

    fromLocation: rideWithMatch.fromLocation || null,
    toLocation: rideWithMatch.toLocation || null,
    estimatedDuration: rideWithMatch.estimatedDuration,
    vehicleFeatures: rideWithMatch.vehicleFeatures,
    vehiclePhoto: rideWithMatch.vehiclePhoto,
    price: rideWithMatch.price,
    currentPassengers: rideWithMatch.currentPassengers || 0,
    departureTime: rideWithMatch.departureTime || null,
    status: rideWithMatch.status,
    allowNegotiation: rideWithMatch.allowNegotiation,
    allowPickupEnRoute: rideWithMatch.allowPickupEnRoute,
    isVerifiedDriver: rideWithMatch.isVerifiedDriver,
    
    driver: rideWithMatch.driver
  };
}

export function mapRidesToFrontend(rides: any[]): RideFrontend[] {
  return rides.map(mapRideToFrontend);
}