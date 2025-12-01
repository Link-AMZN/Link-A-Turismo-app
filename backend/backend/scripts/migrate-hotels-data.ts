import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function migrateHotelsData() {
  console.log('🚀 Iniciando migração do sistema de hotéis...');
  
  try {
    // 1. Migrar hotels → hotels
    console.log('📋 Migrando hotels para hotels...');
    const hotelsResult = await db.execute(sql`
      INSERT INTO hotels (
        id, name, description, address, locality, province, country,
        lat, lng, images, amenities, contact_email, contact_phone,
        host_id, is_active, created_at, updated_at
      )
      SELECT 
        id, name, description, address, locality, province, country,
        lat::numeric, lng::numeric, images, amenities, contact_email, contact_phone,
        "hostId", "isAvailable", "createdAt", "updatedAt"
      FROM hotels
      WHERE "isAvailable" = true;
    `);
    console.log(`✅ Hotels migrados`);

    // 2. Migrar room_types → room_types
    console.log('🛏️ Migrando room_types para room_types...');
    const room_typesResult = await db.execute(sql`
      INSERT INTO room_types (
        id, hotel_id, name, description, base_price, max_occupancy,
        amenities, images, total_units, is_active, created_at, updated_at
      )
      SELECT 
        rt.id, 
        rt."accommodationId",
        rt.name,
        rt.description,
        COALESCE((
          SELECT MIN(hr."pricePerNight") 
          FROM "rooms" hr 
          WHERE hr."accommodationId" = rt."accommodationId" 
          AND hr."roomType" = rt.name
        ), 1000) as base_price,
        COALESCE(rt."maxGuests", 2),
        COALESCE(rt.amenities, ARRAY[]::text[]),
        COALESCE(rt.images, ARRAY[]::text[]),
        COALESCE((
          SELECT COUNT(*) 
          FROM "rooms" hr 
          WHERE hr."accommodationId" = rt."accommodationId" 
          AND hr."roomType" = rt.name
          AND hr."isAvailable" = true
        ), 1) as total_units,
        true,
        rt."createdAt",
        rt."updatedAt"
      FROM "room_types" rt
      WHERE EXISTS (SELECT 1 FROM hotels h WHERE h.id = rt."accommodationId");
    `);
    console.log(`✅ Room Types migrados`);

    // 3. Migrar rooms → rooms
    console.log('🔑 Migrando rooms para rooms...');
    const roomsResult = await db.execute(sql`
      INSERT INTO rooms (
        id, hotel_id, room_type_id, room_number, status, created_at, updated_at
      )
      SELECT 
        hr.id,
        hr."accommodationId",
        rt.id,
        hr."roomNumber",
        CASE 
          WHEN hr."isAvailable" = true THEN 'available'
          ELSE 'maintenance'
        END as status,
        hr."createdAt",
        hr."updatedAt"
      FROM "rooms" hr
      INNER JOIN "room_types" rt ON hr."accommodationId" = rt."accommodationId" 
        AND hr."roomType" = rt.name
      WHERE hr."isAvailable" = true;
    `);
    console.log(`✅ Rooms migrados`);

    // 4. Popular room_availability para os próximos 365 dias
    console.log('📅 Populando room_availability...');
    const availabilityResult = await db.execute(sql`
      INSERT INTO room_availability (
        hotel_id, room_type_id, date, available_units, price
      )
      SELECT 
        rt.hotel_id,
        rt.id,
        dates.date,
        rt.total_units as available_units,
        CASE 
          WHEN EXTRACT(DOW FROM dates.date) IN (0, 6) THEN rt.base_price * 1.2
          ELSE rt.base_price
        END as price
      FROM room_types rt
      CROSS JOIN (
        SELECT CURRENT_DATE + INTERVAL '1 day' * s AS date
        FROM generate_series(0, 364) AS s
      ) dates
      WHERE rt.is_active = true;
    `);
    console.log(`✅ Room Availability populada`);

    // 5. Criar rate plan padrão para cada hotel
    console.log('💰 Criando rate plans padrão...');
    const ratePlansResult = await db.execute(sql`
      INSERT INTO rate_plans (hotel_id, name, description, type, is_active)
      SELECT 
        id,
        'Tarifa Standard',
        'Tarifa padrão com cancelamento gratuito até 48h antes do check-in',
        'public',
        true
      FROM hotels;
    `);
    console.log(`✅ Rate Plans criados`);

    console.log('🎉 Migração concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    throw error;
  }
}

// Executar migração se chamado diretamente
if (require.main === module) {
  migrateHotelsData().catch(console.error);
}

export { migrateHotelsData };
