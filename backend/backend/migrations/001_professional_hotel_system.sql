-- migration_001_professional_hotel_system.sql
-- Cria a nova estrutura profissional para o sistema de hotéis

-- 1. Tabela principal de hotéis (padronizada)
CREATE TABLE hotels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  address TEXT NOT NULL,
  locality VARCHAR(100),
  province VARCHAR(100),
  country VARCHAR(100) DEFAULT 'Mozambique',
  lat NUMERIC(10, 6),
  lng NUMERIC(10, 6),
  location_geom GEOMETRY(Point, 4326),
  images TEXT[],
  amenities TEXT[],
  contact_email TEXT,
  contact_phone TEXT,
  host_id TEXT NOT NULL,
  check_in_time TIME DEFAULT '14:00',
  check_out_time TIME DEFAULT '12:00',
  policies TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tipos de quarto
CREATE TABLE room_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code VARCHAR(50),
  description TEXT,
  base_price NUMERIC(10, 2) NOT NULL,
  extra_adult_price NUMERIC(10, 2) DEFAULT 0,
  extra_child_price NUMERIC(10, 2) DEFAULT 0,
  max_occupancy INTEGER NOT NULL DEFAULT 2,
  base_occupancy INTEGER DEFAULT 2,
  amenities TEXT[],
  images TEXT[],
  total_units INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Quartos físicos
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  room_type_id UUID REFERENCES room_types(id) ON DELETE SET NULL,
  room_number VARCHAR(20) NOT NULL,
  floor INTEGER,
  status VARCHAR(20) DEFAULT 'available',
  features TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(hotel_id, room_number)
);

-- 4. CALENDAR TABLE - Sistema de disponibilidade profissional
CREATE TABLE room_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  room_type_id UUID NOT NULL REFERENCES room_types(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  available_units INTEGER NOT NULL DEFAULT 0,
  price NUMERIC(10, 2) NOT NULL,
  stop_sell BOOLEAN DEFAULT false,
  min_stay INTEGER DEFAULT 1,
  max_stay INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (room_type_id, date)
);

-- 5. Reservas profissionais
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  room_type_id UUID NOT NULL REFERENCES room_types(id),
  room_id UUID REFERENCES rooms(id),
  guest_id TEXT,
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  guest_phone TEXT,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  nights INTEGER NOT NULL,
  units INTEGER NOT NULL DEFAULT 1,
  adults INTEGER DEFAULT 2,
  children INTEGER DEFAULT 0,
  total_price NUMERIC(10, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'confirmed',
  special_requests TEXT,
  payment_status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Rate Plans
CREATE TABLE rate_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type VARCHAR(50) DEFAULT 'public',
  is_active BOOLEAN DEFAULT true,
  cancellation_policy TEXT,
  payment_requirements TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Regras de Rate Plans
CREATE TABLE rate_plan_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_plan_id UUID NOT NULL REFERENCES rate_plans(id) ON DELETE CASCADE,
  room_type_id UUID REFERENCES room_types(id),
  name TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  from_date DATE,
  to_date DATE,
  days_of_week INTEGER[],
  apply_if_available_less_than INTEGER,
  price_modifier NUMERIC(10, 2),
  price_multiplier NUMERIC(5, 3) DEFAULT 1.000,
  min_stay INTEGER,
  max_stay INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ÍNDICES PARA PERFORMANCE
CREATE INDEX hotels_location_idx ON hotels USING GIST(location_geom);
CREATE INDEX hotels_host_idx ON hotels(host_id);
CREATE INDEX hotels_province_idx ON hotels(province);
CREATE INDEX room_types_hotel_idx ON room_types(hotel_id);
CREATE INDEX rooms_hotel_idx ON rooms(hotel_id);
CREATE INDEX rooms_room_type_idx ON rooms(room_type_id);
CREATE INDEX room_availability_room_type_date_idx ON room_availability(room_type_id, date);
CREATE INDEX room_availability_hotel_date_idx ON room_availability(hotel_id, date);
CREATE INDEX bookings_hotel_dates_idx ON bookings(hotel_id, check_in, check_out);
CREATE INDEX bookings_room_type_dates_idx ON bookings(room_type_id, check_in, check_out);
CREATE INDEX bookings_status_idx ON bookings(status);
CREATE INDEX rate_plans_hotel_idx ON rate_plans(hotel_id);
CREATE INDEX rate_plan_rules_dates_idx ON rate_plan_rules(from_date, to_date);

-- FUNÇÃO para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- TRIGGERS para updated_at
CREATE TRIGGER update_hotels_updated_at BEFORE UPDATE ON hotels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_room_types_updated_at BEFORE UPDATE ON room_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rate_plans_updated_at BEFORE UPDATE ON rate_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- FUNÇÃO de busca inteligente
CREATE OR REPLACE FUNCTION search_hotels_smart(
    search_location TEXT DEFAULT '',
    search_radius_km DOUBLE PRECISION DEFAULT 10,
    check_in_date DATE DEFAULT NULL,
    check_out_date DATE DEFAULT NULL,
    guests INTEGER DEFAULT 2,
    room_type_filter TEXT DEFAULT NULL,
    max_price_per_night NUMERIC DEFAULT NULL,
    required_amenities TEXT[] DEFAULT NULL,
    max_results INTEGER DEFAULT 20
)
RETURNS TABLE(
    hotel_id UUID,
    hotel_name TEXT,
    hotel_slug TEXT,
    description TEXT,
    address TEXT,
    locality TEXT,
    province TEXT,
    lat NUMERIC,
    lng NUMERIC,
    distance_km DOUBLE PRECISION,
    available_room_types JSONB,
    min_price_per_night NUMERIC,
    max_price_per_night NUMERIC,
    match_score INTEGER,
    total_available_rooms INTEGER
) AS $$
DECLARE
    search_location_geom GEOMETRY;
    normalized_location TEXT;
    location_city TEXT;
    location_province TEXT;
    nights INTEGER;
BEGIN
    IF check_in_date IS NULL THEN
        check_in_date := CURRENT_DATE + INTERVAL '1 day';
    END IF;
    
    IF check_out_date IS NULL THEN
        check_out_date := check_in_date + INTERVAL '1 day';
    END IF;
    
    IF check_out_date <= check_in_date THEN
        RAISE EXCEPTION 'Check-out date must be after check-in date';
    END IF;
    
    nights := (check_out_date - check_in_date);
    
    normalized_location := LOWER(TRIM(search_location));
    location_city := split_part(normalized_location, ',', 1);
    location_province := TRIM(COALESCE(split_part(normalized_location, ',', 2), ''));
    
    SELECT geom INTO search_location_geom
    FROM mozambique_locations 
    WHERE name ILIKE '%' || location_city || '%'
       AND (location_province = '' OR province ILIKE '%' || location_province || '%')
    ORDER BY 
        CASE 
            WHEN name = INITCAP(location_city) THEN 1
            WHEN name ILIKE location_city || '%' THEN 2
            ELSE 3
        END,
        LENGTH(name)
    LIMIT 1;
    
    RAISE NOTICE 'Busca hotels: % | Datas: % → % | Hóspedes: %', 
        search_location, check_in_date, check_out_date, guests;

    RETURN QUERY
    WITH available_hotels AS (
        SELECT 
            h.id as hotel_id,
            h.name as hotel_name,
            h.slug as hotel_slug,
            h.description,
            h.address,
            h.locality,
            h.province,
            h.lat,
            h.lng,
            
            CASE 
                WHEN h.location_geom IS NOT NULL AND search_location_geom IS NOT NULL THEN
                    ST_DistanceSphere(h.location_geom, search_location_geom) / 1000
                ELSE 9999
            END as distance_km,
            
            COALESCE(
                jsonb_agg(
                    DISTINCT jsonb_build_object(
                        'room_type_id', rt.id,
                        'room_type_name', rt.name,
                        'base_price', rt.base_price,
                        'max_occupancy', rt.max_occupancy,
                        'available_units', MIN(ra.available_units),
                        'price_per_night', MIN(ra.price),
                        'total_price', MIN(ra.price) * nights,
                        'amenities', rt.amenities,
                        'images', rt.images
                    )
                ) FILTER (WHERE rt.id IS NOT NULL),
                '[]'::jsonb
            ) as available_room_types,
            
            MIN(ra.price) as min_price_per_night,
            MAX(ra.price) as max_price_per_night,
            
            CASE
                WHEN h.location_geom IS NOT NULL AND search_location_geom IS NOT NULL
                     AND ST_DistanceSphere(h.location_geom, search_location_geom) / 1000 <= search_radius_km THEN 100
                WHEN h.locality ILIKE '%' || location_city || '%' THEN 80
                WHEN h.province ILIKE '%' || location_province || '%' THEN 60
                ELSE 0
            END as base_score,
            
            CASE 
                WHEN required_amenities IS NOT NULL AND h.amenities @> required_amenities THEN 20
                ELSE 0
            END as amenities_bonus,
            
            COUNT(DISTINCT rt.id) as total_available_rooms

        FROM hotels h
        INNER JOIN room_types rt ON h.id = rt.hotel_id AND rt.is_active = true
        INNER JOIN room_availability ra ON rt.id = ra.room_type_id 
            AND ra.date BETWEEN check_in_date AND (check_out_date - INTERVAL '1 day')
            AND ra.available_units > 0
            AND ra.stop_sell = false
        
        WHERE h.is_active = true
          AND rt.max_occupancy >= guests
          AND (max_price_per_night IS NULL OR ra.price <= max_price_per_night)
          AND (room_type_filter IS NULL OR rt.name ILIKE '%' || room_type_filter || '%')
          AND (required_amenities IS NULL OR h.amenities @> required_amenities)
        
        GROUP BY h.id, h.name, h.slug, h.description, h.address, h.locality, h.province, 
                 h.lat, h.lng, h.location_geom, h.amenities
    )
    SELECT 
        hotel_id,
        hotel_name,
        hotel_slug,
        description,
        address,
        locality,
        province,
        lat,
        lng,
        distance_km,
        available_room_types,
        min_price_per_night,
        max_price_per_night,
        (base_score + amenities_bonus) as match_score,
        total_available_rooms
        
    FROM available_hotels
    WHERE total_available_rooms > 0
      AND (base_score > 0 OR search_radius_km = 0)
    ORDER BY 
        match_score DESC,
        distance_km ASC,
        min_price_per_night ASC
    LIMIT max_results;

END;
$$ LANGUAGE plpgsql;
