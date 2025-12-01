// Script de migração simplificado - usando psql diretamente
const { execSync } = require('child_process');

async function migrateHotelsData() {
  console.log('🚀 Iniciando migração do sistema de hotéis...');
  
  const dbUrl = 'postgresql://linka_user:@localhost:5432/linka2_database';
  
  try {
    // 1. Migrar accommodations → hotels
    console.log('📋 Migrando accommodations para hotels...');
    execSync(`psql ${dbUrl} -c "
      INSERT INTO hotels (
        id, name, description, address, locality, province, country,
        lat, lng, images, amenities, contact_email, contact_phone,
        host_id, is_active, created_at, updated_at
      )
      SELECT 
        id, name, description, address, locality, province, country,
        lat::numeric, lng::numeric, images, amenities, contact_email, contact_phone,
        \\"hostId\\", \\"isAvailable\\", \\"createdAt\\", \\"updatedAt\\"
      FROM accommodations
      WHERE \\"isAvailable\\" = true;
    "`, { stdio: 'inherit' });

    // 2. Migrar roomTypes → room_types
    console.log('🛏️ Migrando roomTypes para room_types...');
    execSync(`psql ${dbUrl} -c "
      INSERT INTO room_types (
        id, hotel_id, name, description, base_price, max_occupancy,
        amenities, images, total_units, is_active, created_at, updated_at
      )
      SELECT 
        rt.id, 
        rt.\\"accommodationId\\",
        rt.name,
        rt.description,
        COALESCE((
          SELECT MIN(hr.\\"pricePerNight\\") 
          FROM \\"hotelRooms\\" hr 
          WHERE hr.\\"accommodationId\\" = rt.\\"accommodationId\\" 
          AND hr.\\"roomType\\" = rt.name
        ), 1000) as base_price,
        COALESCE(rt.\\"maxGuests\\", 2),
        COALESCE(rt.amenities, ARRAY[]::text[]),
        COALESCE(rt.images, ARRAY[]::text[]),
        COALESCE((
          SELECT COUNT(*) 
          FROM \\"hotelRooms\\" hr 
          WHERE hr.\\"accommodationId\\" = rt.\\"accommodationId\\" 
          AND hr.\\"roomType\\" = rt.name
          AND hr.\\"isAvailable\\" = true
        ), 1) as total_units,
        true,
        rt.\\"createdAt\\",
        rt.\\"updatedAt\\"
      FROM \\"roomTypes\\" rt
      WHERE EXISTS (SELECT 1 FROM hotels h WHERE h.id = rt.\\"accommodationId\\");
    "`, { stdio: 'inherit' });

    // 3. Migrar hotelRooms → rooms
    console.log('🔑 Migrando hotelRooms para rooms...');
    execSync(`psql ${dbUrl} -c "
      INSERT INTO rooms (
        id, hotel_id, room_type_id, room_number, status, created_at, updated_at
      )
      SELECT 
        hr.id,
        hr.\\"accommodationId\\",
        rt.id,
        hr.\\"roomNumber\\",
        CASE 
          WHEN hr.\\"isAvailable\\" = true THEN 'available'
          ELSE 'maintenance'
        END as status,
        hr.\\"createdAt\\",
        hr.\\"updatedAt\\"
      FROM \\"hotelRooms\\" hr
      INNER JOIN \\"roomTypes\\" rt ON hr.\\"accommodationId\\" = rt.\\"accommodationId\\" 
        AND hr.\\"roomType\\" = rt.name
      WHERE hr.\\"isAvailable\\" = true;
    "`, { stdio: 'inherit' });

    // 4. Popular room_availability para os próximos 365 dias
    console.log('📅 Populando room_availability...');
    execSync(`psql ${dbUrl} -c "
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
    "`, { stdio: 'inherit' });

    // 5. Criar rate plan padrão para cada hotel
    console.log('💰 Criando rate plans padrão...');
    execSync(`psql ${dbUrl} -c "
      INSERT INTO rate_plans (hotel_id, name, description, type, is_active)
      SELECT 
        id,
        'Tarifa Standard',
        'Tarifa padrão com cancelamento gratuito até 48h antes do check-in',
        'public',
        true
      FROM hotels;
    "`, { stdio: 'inherit' });

    console.log('✅ Migração concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    throw error;
  }
}

// Executar migração
migrateHotelsData();
