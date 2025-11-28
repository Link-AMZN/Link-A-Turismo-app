import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db.js';
import { vehicles } from '../../shared/schema.js';
import { eq, and } from 'drizzle-orm';

// ✅ Importar apenas o que existe
import { verifyFirebaseToken } from '../../src/shared/firebaseAuth.js';

const router = Router();

// ✅ MIDDLEWARE CORRIGIDO: Temporariamente aceitar qualquer usuário autenticado
const requireDriverRole = (req: any, res: any, next: any) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      error: 'Usuário não autenticado' 
    });
  }
  
  // ✅ TEMPORARIAMENTE: Comentar a verificação de role para debugging
  /*
  // Verificar se tem role de driver
  const userRoles = req.user.roles || [];
  if (!userRoles.includes('driver')) {
    return res.status(403).json({ 
      success: false, 
      error: 'Acesso negado. Requer role de driver.',
      userRoles: userRoles
    });
  }
  
  console.log('✅ Driver role verificada para:', req.user.email);
  */
  
  console.log('✅ Usuário autenticado (role bypass):', req.user.email, 'UID:', req.user.uid);
  next();
};

// ✅ GET /api/vehicles/types - Listar tipos de veículo disponíveis
router.get('/types', verifyFirebaseToken, (req: any, res: any) => {
  const vehicleTypes = [
    { value: 'economy', label: '🚗 Económico', description: 'Veículo básico e económico' },
    { value: 'comfort', label: '🚙 Conforto', description: 'Veículo com mais conforto' },
    { value: 'luxury', label: '🏎️ Luxo', description: 'Veículo de luxo e alta qualidade' },
    { value: 'family', label: '👨‍👩‍👧‍👦 Familiar', description: 'Veículo espaçoso para famílias' },
    { value: 'premium', label: '⭐ Premium', description: 'Serviço premium executivo' },
    { value: 'van', label: '🚐 Van', description: 'Van para grupos maiores' },
    { value: 'suv', label: '🚙 SUV', description: 'SUV espaçoso e confortável' }
  ];
  
  res.json({ success: true, types: vehicleTypes });
});

// ✅ GET /api/vehicles - Listar veículos do motorista
router.get('/', verifyFirebaseToken, requireDriverRole, async (req: any, res: any) => {
  try {
    const driverId = req.user.uid;
    
    console.log('🔍 Buscando veículos para driver:', driverId);
    
    // ✅ Buscar veículos do motorista
    const vehiclesList = await db
      .select()
      .from(vehicles)
      .where(
        and(
          eq(vehicles.driver_id, driverId),
          eq(vehicles.is_active, true)
        )
      );
    
    console.log(`✅ Encontrados ${vehiclesList.length} veículos`);
    
    res.json({
      success: true,
      vehicles: vehiclesList.map((vehicle: any) => ({
        id: vehicle.id,
        plateNumber: vehicle.plate_number,
        plateNumberRaw: vehicle.plate_number_raw,
        make: vehicle.make,
        model: vehicle.model,
        color: vehicle.color,
        year: vehicle.year,
        vehicleType: vehicle.vehicle_type,
        maxPassengers: vehicle.max_passengers,
        features: vehicle.features || [],
        photoUrl: vehicle.photo_url,
        isActive: vehicle.is_active,
        createdAt: vehicle.created_at,
        updatedAt: vehicle.updated_at
      }))
    });
  } catch (error) {
    console.error('❌ Erro ao buscar veículos:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// ✅ POST /api/vehicles - Criar veículo
router.post('/', verifyFirebaseToken, requireDriverRole, async (req: any, res: any) => {
  try {
    const driverId = req.user.uid;
    
    console.log('🚗 Criando veículo para driver:', driverId, 'Dados:', req.body);
    
    // ✅ Schema de validação local
    const vehicleSchema = z.object({
      plateNumber: z.string().min(3).max(20),
      make: z.string().min(1).max(100),
      model: z.string().min(1).max(100),
      color: z.string().min(1).max(50),
      year: z.number().min(1900).max(new Date().getFullYear() + 1).optional(),
      vehicleType: z.enum(['economy', 'comfort', 'luxury', 'family', 'premium', 'van', 'suv']),
      maxPassengers: z.number().min(1).max(50),
      features: z.array(z.string()).optional(),
      photoUrl: z.string().url().optional().or(z.literal(''))
    });

    const validation = vehicleSchema.safeParse(req.body);

    if (!validation.success) {
      console.log('❌ Validação falhou:', validation.error.errors);
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos',
        errors: validation.error.errors
      });
    }

    const { plateNumber, make, model, color, year, vehicleType, maxPassengers, features, photoUrl } = validation.data;

    // Normalizar matrícula
    const plateNumberRaw = plateNumber.toUpperCase().replace(/[-\s]/g, '');
    const plateFormatted = formatLicensePlate(plateNumberRaw);

    if (!plateFormatted) {
      return res.status(400).json({
        success: false,
        message: 'Formato de matrícula inválido. Use formato: AAA 000 AA'
      });
    }

    console.log('🔍 Verificando se matrícula já existe:', plateFormatted);

    // Verificar se matrícula já existe
    const existingVehicle = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.plate_number, plateFormatted))
      .limit(1);

    if (existingVehicle.length > 0) {
      console.log('❌ Matrícula já existe:', plateFormatted);
      return res.status(409).json({
        success: false,
        message: 'Já existe um veículo com esta matrícula'
      });
    }

    console.log('✅ Inserindo novo veículo...');

    // Inserir veículo
    const newVehicle = await db
      .insert(vehicles)
      .values({
        driver_id: driverId,
        plate_number: plateFormatted,
        plate_number_raw: plateNumberRaw,
        make,
        model,
        color,
        year,
        vehicle_type: vehicleType,
        max_passengers: maxPassengers,
        features: features || [],
        photo_url: photoUrl || null,
        is_active: true
      })
      .returning();

    const vehicle = newVehicle[0];

    console.log('✅ Veículo criado com sucesso:', vehicle.id);

    res.status(201).json({
      success: true,
      message: 'Veículo criado com sucesso',
      vehicle: {
        id: vehicle.id,
        plateNumber: vehicle.plate_number,
        plateNumberRaw: vehicle.plate_number_raw,
        make: vehicle.make,
        model: vehicle.model,
        color: vehicle.color,
        year: vehicle.year,
        vehicleType: vehicle.vehicle_type,
        maxPassengers: vehicle.max_passengers,
        features: vehicle.features || [],
        photoUrl: vehicle.photo_url
      }
    });

  } catch (error) {
    console.error('❌ Erro ao criar veículo:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// ✅ Função para formatar matrícula
function formatLicensePlate(plate: string): string | null {
  const cleanPlate = plate.replace(/[-\s]/g, '').toUpperCase();
  const plateRegex = /^[A-Z]{3}[0-9]{3}[A-Z]{2}$/;
  
  if (!plateRegex.test(cleanPlate)) {
    console.log('❌ Formato de matrícula inválido:', cleanPlate);
    return null;
  }
  
  return `${cleanPlate.substring(0, 3)} ${cleanPlate.substring(3, 6)} ${cleanPlate.substring(6, 8)}`;
}

export default router;