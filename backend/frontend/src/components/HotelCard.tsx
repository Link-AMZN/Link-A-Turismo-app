import React from 'react';
import { Accommodation } from '../shared/types/accommodation';
import { getLocationBadge } from '../shared/lib/accommodationService';

interface HotelCardProps {
  hotel: Accommodation;
  onSelect?: (hotel: Accommodation) => void;
}

export const HotelCard: React.FC<HotelCardProps> = ({ hotel, onSelect }) => {
  const handleClick = () => {
    onSelect?.(hotel);
  };

  // ✅ BADGE DE LOCALIZAÇÃO INTELIGENTE
  const renderLocationBadge = () => {
    if (hotel.match_type === undefined) return null;
    
    const badge = getLocationBadge(hotel.match_type, hotel.distance);
    
    return (
      <span 
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${badge.color}-100 text-${badge.color}-800`}
      >
        {badge.label}
      </span>
    );
  };

  // ✅ DISTÂNCIA FORMATADA
  const renderDistance = () => {
    if (!hotel.distance) return null;
    
    const distanceKm = Math.round(hotel.distance / 1000);
    return (
      <div className="flex items-center text-sm text-gray-500">
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        {distanceKm} km do centro
      </div>
    );
  };

  return (
    <div 
      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
      onClick={handleClick}
    >
      {/* Imagem */}
      <div className="relative h-48 bg-gray-200">
        {hotel.images && hotel.images.length > 0 ? (
          <img 
            src={hotel.images[0]} 
            alt={hotel.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            </svg>
          </div>
        )}
        
        {/* Badge de Localização */}
        <div className="absolute top-2 right-2">
          {renderLocationBadge()}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold text-gray-900">{hotel.name}</h3>
          <div className="flex items-center">
            <span className="text-yellow-500">⭐</span>
            <span className="ml-1 font-medium">{hotel.rating || 'N/A'}</span>
          </div>
        </div>

        <p className="text-gray-600 text-sm mb-3 line-clamp-2">{hotel.description}</p>

        {/* Localização e Distância */}
        <div className="mb-3 space-y-1">
          <div className="flex items-center text-sm text-gray-700">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            {hotel.location}
          </div>
          {renderDistance()}
        </div>

        {/* Amenidades */}
        {hotel.amenities && hotel.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {hotel.amenities.slice(0, 3).map((amenity, index) => (
              <span 
                key={index}
                className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700"
              >
                {amenity}
              </span>
            ))}
            {hotel.amenities.length > 3 && (
              <span className="text-xs text-gray-500">
                +{hotel.amenities.length - 3} mais
              </span>
            )}
          </div>
        )}

        {/* Preço e Disponibilidade */}
        <div className="flex justify-between items-center">
          <div>
            <span className="text-2xl font-bold text-gray-900">
              MT {hotel.price}
            </span>
            <span className="text-sm text-gray-500">/noite</span>
          </div>
          
          <div className="text-right">
            <div className={`text-sm font-medium ${
              hotel.hasAvailableRooms !== false ? 'text-green-600' : 'text-red-600'
            }`}>
              {hotel.hasAvailableRooms !== false ? 'Disponível' : 'Indisponível'}
            </div>
            <div className="text-xs text-gray-500">
              {hotel.availableRooms} quartos
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};