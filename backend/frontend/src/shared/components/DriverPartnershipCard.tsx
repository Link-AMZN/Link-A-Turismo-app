import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { formatMzn } from "@/shared/lib/currency";
import { 
  CheckCircle, 
  Star, 
  MapPin, 
  Calendar, 
  Car,
  Percent,
  Gem,
  Medal,
  Trophy,
  Award
} from "lucide-react";

// Types for partnership system
interface DriverHotelPartnership {
  id: string;
  driverId: string;
  accommodationId: string;
  partnershipType: PartnershipLevel;
  discountPercentage: number;
  minimumRides: number;
  isActive: boolean;
  validFrom: Date;
  validUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface Accommodation {
  id: string;
  name: string;
  type: string;
  address: string;
  lat: number | null;
  lng: number | null;
  pricePerNight: number;
  rating: number | null;
  reviewCount: number;
  images: string[] | null;
  amenities: string[] | null;
  description: string | null;
  distanceFromCenter: number | null;
  isAvailable: boolean;
}

interface PartnershipBenefit {
  id: string;
  level: PartnershipLevel;
  benefitType: string;
  benefitValue: number | null;
  description: string;
  minimumRidesRequired: number;
  minimumRatingRequired: number;
  isActive: boolean;
  createdAt: Date;
}

type PartnershipLevel = "bronze" | "silver" | "gold" | "platinum";

interface DriverPartnershipCardProps {
  partnership: DriverHotelPartnership;
  accommodation: Accommodation;
  benefits: PartnershipBenefit[];
  onUseDiscount: (partnershipId: string) => void;
}

export default function DriverPartnershipCard({ 
  partnership, 
  accommodation, 
  benefits,
  onUseDiscount 
}: DriverPartnershipCardProps) {
  // ✅ CORREÇÃO: Tipagem forte para partnership type
  const getPartnershipColor = (type: PartnershipLevel) => {
    switch (type) {
      case "bronze": return "bg-amber-100 text-amber-800 border-amber-200";
      case "silver": return "bg-gray-100 text-gray-800 border-gray-200";
      case "gold": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "platinum": return "bg-purple-100 text-purple-800 border-purple-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // ✅ CORREÇÃO: Tipagem forte e uso de ícones React
  const getPartnershipIcon = (type: PartnershipLevel) => {
    const iconClass = "w-6 h-6";
    switch (type) {
      case "bronze": return <Medal className={`${iconClass} text-amber-600`} />;
      case "silver": return <Award className={`${iconClass} text-gray-600`} />;
      case "gold": return <Trophy className={`${iconClass} text-yellow-600`} />;
      case "platinum": return <Gem className={`${iconClass} text-purple-600`} />;
      default: return <Award className={`${iconClass} text-gray-600`} />;
    }
  };

  // ✅ CORREÇÃO: Otimizar cálculo de data
  const validUntilDate = partnership.validUntil ? new Date(partnership.validUntil) : null;
  const isExpired = validUntilDate && validUntilDate < new Date();
  
  const accommodationBenefits = benefits.filter(b => b.level === partnership.partnershipType);

  return (
    <Card className="border-2 hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getPartnershipIcon(partnership.partnershipType)}
            <div>
              <CardTitle className="text-lg">{accommodation.name}</CardTitle>
              <p className="text-sm text-gray-600">{accommodation.address}</p>
            </div>
          </div>
          <Badge className={`${getPartnershipColor(partnership.partnershipType)} font-medium`}>
            {partnership.partnershipType.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Discount Information */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-green-800 font-medium flex items-center">
              <Percent className="w-4 h-4 mr-2" />
              Desconto Especial
            </span>
            <span className="text-2xl font-bold text-green-600">
              {partnership.discountPercentage}%
            </span>
          </div>
          <p className="text-sm text-green-700 mt-1">
            Válido para estadias neste hotel parceiro
          </p>
        </div>

        {/* Benefits List */}
        <div className="space-y-2">
          <h4 className="font-medium text-gray-800">Benefícios Incluídos:</h4>
          {accommodationBenefits.map((benefit) => (
            <div key={benefit.id} className="flex items-center space-x-2 text-sm">
              {/* ✅ CORREÇÃO: Ícone React e key por id */}
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>{benefit.description}</span>
              {benefit.benefitValue != null && benefit.benefitValue > 0 && (
                <Badge variant="outline" className="text-xs">
                  {benefit.benefitType === 'accommodation_discount' 
                    ? `${benefit.benefitValue}%` 
                    : formatMzn(benefit.benefitValue)}
                </Badge>
              )}
            </div>
          ))}
        </div>

        {/* Accommodation Info */}
        <div className="border-t pt-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              {accommodation.rating != null && (
                <span className="text-gray-600 flex items-center">
                  <Star className="w-4 h-4 text-yellow-400 mr-1 fill-current" />
                  {accommodation.rating}/5 ({accommodation.reviewCount} avaliações)
                </span>
              )}
              {accommodation.distanceFromCenter != null && (
                <span className="text-gray-600 flex items-center">
                  <MapPin className="w-4 h-4 text-gray-400 mr-1" />
                  {accommodation.distanceFromCenter}km do centro
                </span>
              )}
            </div>
            <span className="font-medium text-lg">
              {formatMzn(accommodation.pricePerNight)}/noite
            </span>
          </div>
        </div>

        {/* Validity and Requirements */}
        <div className="text-xs text-gray-500 space-y-1">
          {partnership.minimumRides > 0 && (
            <p className="flex items-center">
              <Car className="w-3 h-3 mr-1" />
              Mínimo de {partnership.minimumRides} viagens realizadas
            </p>
          )}
          {validUntilDate && (
            <p className={`flex items-center ${isExpired ? "text-red-500" : ""}`}>
              <Calendar className="w-3 h-3 mr-1" />
              Válido até {validUntilDate.toLocaleDateString('pt-PT')}
              {isExpired && " (Expirado)"}
            </p>
          )}
        </div>

        {/* Action Button */}
        <Button 
          onClick={() => onUseDiscount(partnership.id)}
          disabled={isExpired || !partnership.isActive}
          className="w-full"
          data-testid={`use-discount-${partnership.id}`}
        >
          {isExpired ? "Parceria Expirada" : "Usar Desconto"}
        </Button>
      </CardContent>
    </Card>
  );
}