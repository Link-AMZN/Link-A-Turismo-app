import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Switch } from "@/shared/components/ui/switch";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Label } from "@/shared/components/ui/label";
import { Badge } from "@/shared/components/ui/badge";
import { Separator } from "@/shared/components/ui/separator";
import { Save, Handshake, Medal, Award, Trophy, Gem } from "lucide-react";

// ✅ CORREÇÃO: Union type para níveis
type PartnershipLevelKey = 'bronze' | 'silver' | 'gold' | 'platinum';

interface PartnershipLevel {
  enabled: boolean;
  discount: number; // ✅ CORREÇÃO: number em vez de string
  minRides: number;
}

// ✅ CORREÇÃO: Interface para benefícios
interface BenefitOption {
  id: string;
  label: string;
}

interface PartnershipProgram {
  isEnabled: boolean;
  programName: string;
  description: string;
  bronze: PartnershipLevel;
  silver: PartnershipLevel;
  gold: PartnershipLevel;
  platinum: PartnershipLevel;
  extraBenefits: string[];
  termsAndConditions: string;
  badgeVisible: boolean;
}

export default function HostPartnershipSetup() {
  const [program, setProgram] = useState<PartnershipProgram>({
    isEnabled: false,
    programName: "Programa VIP Motoristas",
    description: "Descontos especiais para motoristas profissionais qualificados",
    // ✅ CORREÇÃO: Valores numéricos em vez de string
    bronze: { enabled: false, discount: 10, minRides: 10 },
    silver: { enabled: false, discount: 15, minRides: 25 },
    gold: { enabled: false, discount: 20, minRides: 50 },
    platinum: { enabled: false, discount: 25, minRides: 100 },
    extraBenefits: [],
    termsAndConditions: "",
    badgeVisible: false,
  });

  // ✅ CORREÇÃO: Array tipado
  const availableBenefits: BenefitOption[] = [
    { id: "priority_checkin", label: "Check-in Prioritário" },
    { id: "free_breakfast", label: "Pequeno-almoço Gratuito" },
    { id: "late_checkout", label: "Check-out Tardio" },
    { id: "room_upgrade", label: "Upgrade de Quarto" },
    { id: "spa_access", label: "Acesso ao Spa" },
    { id: "free_parking", label: "Estacionamento Gratuito" },
    { id: "welcome_drink", label: "Bebida de Boas-vindas" },
  ];

  // ✅ CORREÇÃO: Tipagem forte da função
  const handleLevelUpdate = (level: PartnershipLevelKey, field: keyof PartnershipLevel, value: any) => {
    setProgram(prev => ({
      ...prev,
      [level]: { 
        ...prev[level], 
        [field]: field === 'discount' || field === 'minRides' ? Number(value) || 0 : value 
      }
    }));
  };

  const handleBenefitToggle = (benefitId: string) => {
    setProgram(prev => ({
      ...prev,
      extraBenefits: prev.extraBenefits.includes(benefitId)
        ? prev.extraBenefits.filter(id => id !== benefitId)
        : [...prev.extraBenefits, benefitId]
    }));
  };

  const handleSave = () => {
    // ✅ CORREÇÃO: Validação básica antes de salvar
    const isValid = validateProgram();
    if (!isValid) {
      console.error("Programa inválido. Verifique os valores.");
      return;
    }
    
    console.log("Saving partnership program:", program);
    // TODO: Implement API call to save partnership program
  };

  // ✅ CORREÇÃO: Função de validação
  const validateProgram = (): boolean => {
    const levels: PartnershipLevelKey[] = ['bronze', 'silver', 'gold', 'platinum'];
    
    for (const level of levels) {
      const levelData = program[level];
      if (levelData.enabled) {
        if (levelData.discount < 0 || levelData.discount > 50) {
          console.error(`Desconto inválido para nível ${level}: ${levelData.discount}`);
          return false;
        }
        if (levelData.minRides < 1) {
          console.error(`Número mínimo de viagens inválido para nível ${level}: ${levelData.minRides}`);
          return false;
        }
      }
    }
    
    return true;
  };

  // ✅ CORREÇÃO: Tipagem forte
  const getLevelIcon = (level: PartnershipLevelKey) => {
    const icons = { 
      bronze: <Medal className="w-5 h-5 text-amber-600" />, 
      silver: <Award className="w-5 h-5 text-gray-600" />, 
      gold: <Trophy className="w-5 h-5 text-yellow-600" />, 
      platinum: <Gem className="w-5 h-5 text-purple-600" /> 
    };
    return icons[level];
  };

  // ✅ CORREÇÃO: Tipagem forte
  const getLevelColor = (level: PartnershipLevelKey) => {
    const colors = {
      bronze: "border-amber-200 bg-amber-50",
      silver: "border-gray-200 bg-gray-50", 
      gold: "border-yellow-200 bg-yellow-50",
      platinum: "border-purple-200 bg-purple-50"
    };
    return colors[level];
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Configurar Programa de Parcerias
        </h1>
        <p className="text-gray-600">
          Ofereça descontos especiais para motoristas qualificados e aumente suas reservas
        </p>
      </div>

      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Programa de Parcerias para Motoristas</CardTitle>
            <div className="flex items-center space-x-2">
              <Label htmlFor="program-enabled">Ativar Programa</Label>
              <Switch
                id="program-enabled"
                checked={program.isEnabled}
                onCheckedChange={(checked) => setProgram(prev => ({ ...prev, isEnabled: checked }))}
                data-testid="program-enabled-switch"
              />
            </div>
          </div>
        </CardHeader>

        {program.isEnabled && (
          <CardContent className="space-y-6">
            {/* Basic Program Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="program-name">Nome do Programa</Label>
                <Input
                  id="program-name"
                  value={program.programName}
                  onChange={(e) => setProgram(prev => ({ ...prev, programName: e.target.value }))}
                  placeholder="Ex: Programa VIP Motoristas"
                  data-testid="program-name-input"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Label htmlFor="badge-visible">Mostrar Badge "Motoristas VIP"</Label>
                <Switch
                  id="badge-visible"
                  checked={program.badgeVisible}
                  onCheckedChange={(checked) => setProgram(prev => ({ ...prev, badgeVisible: checked }))}
                  data-testid="badge-visible-switch"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="program-description">Descrição do Programa</Label>
              <Textarea
                id="program-description"
                value={program.description}
                onChange={(e) => setProgram(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descreva os benefícios do seu programa de parcerias..."
                rows={3}
                data-testid="program-description-textarea"
              />
            </div>

            <Separator />

            {/* Partnership Levels */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Níveis de Parceria</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(['bronze', 'silver', 'gold', 'platinum'] as PartnershipLevelKey[]).map((level) => (
                  <Card key={level} className={`border-2 ${getLevelColor(level)}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {getLevelIcon(level)}
                          <h4 className="font-medium text-lg capitalize">{level}</h4>
                        </div>
                        <Switch
                          checked={program[level].enabled}
                          onCheckedChange={(checked) => handleLevelUpdate(level, 'enabled', checked)}
                          data-testid={`${level}-enabled-switch`}
                        />
                      </div>
                    </CardHeader>
                    
                    {program[level].enabled && (
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label htmlFor={`${level}-discount`}>Desconto (%)</Label>
                            <Input
                              id={`${level}-discount`}
                              type="number"
                              min="0"
                              max="50"
                              value={program[level].discount}
                              onChange={(e) => handleLevelUpdate(level, 'discount', e.target.value)}
                              data-testid={`${level}-discount-input`}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor={`${level}-rides`}>Min. Viagens</Label>
                            <Input
                              id={`${level}-rides`}
                              type="number"
                              min="1"
                              value={program[level].minRides}
                              onChange={(e) => handleLevelUpdate(level, 'minRides', e.target.value)}
                              data-testid={`${level}-rides-input`}
                            />
                          </div>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            </div>

            <Separator />

            {/* Extra Benefits */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Benefícios Adicionais</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {availableBenefits.map((benefit) => (
                  <div key={benefit.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={benefit.id}
                      checked={program.extraBenefits.includes(benefit.id)}
                      onChange={() => handleBenefitToggle(benefit.id)}
                      className="rounded border-gray-300"
                      data-testid={`benefit-${benefit.id}-checkbox`}
                    />
                    <Label htmlFor={benefit.id} className="text-sm">
                      {benefit.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="space-y-2">
              <Label htmlFor="terms">Termos e Condições (Opcional)</Label>
              <Textarea
                id="terms"
                value={program.termsAndConditions}
                onChange={(e) => setProgram(prev => ({ ...prev, termsAndConditions: e.target.value }))}
                placeholder="Adicione termos específicos para o seu programa..."
                rows={4}
                data-testid="terms-textarea"
              />
            </div>

            {/* Preview */}
            {program.badgeVisible && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Pré-visualização</h4>
                <div className="flex items-center space-x-2">
                  <Badge className="bg-blue-600 text-white">
                    <Handshake className="w-3 h-3 mr-1" />
                    Motoristas VIP
                  </Badge>
                  <span className="text-sm text-blue-700">
                    Este badge será exibido no seu alojamento
                  </span>
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="flex justify-end">
              <Button 
                onClick={handleSave} 
                size="lg" 
                data-testid="save-program-button"
                disabled={!validateProgram()} // ✅ CORREÇÃO: Desabilitar se inválido
              >
                <Save className="w-4 h-4 mr-2" />
                Guardar Programa de Parcerias
              </Button>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}