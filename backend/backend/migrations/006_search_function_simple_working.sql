-- Função search_hotels_smart - VERSÃO SIMPLIFICADA E FUNCIONAL
DROP FUNCTION IF EXISTS search_hotels_smart;

CREATE OR REPLACE FUNCTION search_hotels_smart(
    search_location TEXT DEFAULT '',
    search_radius_km DOUBLE PRECISION DEFAULT 10,
    check_in_date DATE DEFAULT NULL,
    check_out_date DATE DEFAULT NULL,
    guests INTEGER DEFAULT 2,
    room_type_filter TEXT DEFAULT NULL,
    max_price NUMERIC DEFAULT NULL,
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
    -- Datas padrão
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
    
    -- Buscar geometria da localização
    normalized_location := LOWER(TRIM(search_location));
    location_city := split_part(normalized_location, ',', 1);
    location_province := TRIM(COALESCE(split_part(normalized_location, ',', 2), ''));
    
    SELECT geom INTO search_location_geom
    FROM mozambique_locations 
    WHERE name ILIKE '%' || location_city || '%'
       AND (location_province = '' OR mozambique_locations.province ILIKE '%' || location_province || '%')
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

    -- Query simplificada e funcional
    RETURN QUERY
    SELECT 
        h.id::UUID as hotel_id,
        h.name::TEXT as hotel_name,
        COALESCE(h.slug, '')::TEXT as hotel_slug,
        COALESCE(h.description, '')::TEXT as description,
        COALESCE(h.address, '')::TEXT as address,
        COALESCE(h.locality, '')::TEXT as locality,
        COALESCE(h.province, '')::TEXT as province,
        COALESCE(h.lat, 0)::NUMERIC as lat,
        COALESCE(h.lng, 0)::NUMERIC as lng,
        
        CASE 
            WHEN h.location_geom IS NOT NULL AND search_location_geom IS NOT NULL THEN
                ST_DistanceSphere(h.location_geom, search_location_geom) / 1000
            ELSE 9999
        END::DOUBLE PRECISION as distance_km,
        
        COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'room_type_id', rt.id,
                        'room_type_name', rt.name,
                        'base_price', rt.base_price,
                        'max_occupancy', rt.max_occupancy,
                        'available_units', MIN(ra.available_units),
                        'price_per_night', MIN(ra.price),
                        'total_price', MIN(ra.price) * nights,
                        'amenities', COALESCE(rt.amenities::jsonb, '[]'::jsonb),
                        'images', COALESCE(rt.images::jsonb, '[]'::jsonb)
                    )
                )
                FROM room_types rt
                INNER JOIN room_availability ra ON rt.id = ra.room_type_id 
                    AND ra.date BETWEEN check_in_date AND (check_out_date - INTERVAL '1 day')
                    AND ra.available_units > 0
                    AND ra.stop_sell = false
                WHERE rt.hotel_id = h.id 
                  AND rt.is_active = true
                  AND rt.max_occupancy >= guests
                  AND (max_price IS NULL OR ra.price <= max_price)
                  AND (room_type_filter IS NULL OR rt.name ILIKE '%' || room_type_filter || '%')
                GROUP BY rt.id
            ),
            '[]'::jsonb
        ) as available_room_types,
        
        COALESCE((
            SELECT MIN(ra.price)
            FROM room_types rt
            INNER JOIN room_availability ra ON rt.id = ra.room_type_id 
                AND ra.date BETWEEN check_in_date AND (check_out_date - INTERVAL '1 day')
                AND ra.available_units > 0
                AND ra.stop_sell = false
            WHERE rt.hotel_id = h.id 
              AND rt.is_active = true
              AND rt.max_occupancy >= guests
        ), 0)::NUMERIC as min_price_per_night,
        
        COALESCE((
            SELECT MAX(ra.price)
            FROM room_types rt
            INNER JOIN room_availability ra ON rt.id = ra.room_type_id 
                AND ra.date BETWEEN check_in_date AND (check_out_date - INTERVAL '1 day')
                AND ra.available_units > 0
                AND ra.stop_sell = false
            WHERE rt.hotel_id = h.id 
              AND rt.is_active = true
              AND rt.max_occupancy >= guests
        ), 0)::NUMERIC as max_price_per_night,
        
        CASE
            WHEN h.location_geom IS NOT NULL AND search_location_geom IS NOT NULL
                 AND ST_DistanceSphere(h.location_geom, search_location_geom) / 1000 <= search_radius_km THEN 100
            WHEN COALESCE(h.locality, '') ILIKE '%' || location_city || '%' THEN 80
            WHEN COALESCE(h.province, '') ILIKE '%' || location_province || '%' THEN 60
            ELSE 0
        END::INTEGER as match_score,
        
        COALESCE((
            SELECT COUNT(DISTINCT rt.id)
            FROM room_types rt
            INNER JOIN room_availability ra ON rt.id = ra.room_type_id 
                AND ra.date BETWEEN check_in_date AND (check_out_date - INTERVAL '1 day')
                AND ra.available_units > 0
                AND ra.stop_sell = false
            WHERE rt.hotel_id = h.id 
              AND rt.is_active = true
              AND rt.max_occupancy >= guests
        ), 0)::INTEGER as total_available_rooms
        
    FROM hotels h
    WHERE h.is_active = true
      AND (required_amenities IS NULL OR h.amenities @> required_amenities)
      AND EXISTS (
          SELECT 1 
          FROM room_types rt
          INNER JOIN room_availability ra ON rt.id = ra.room_type_id 
              AND ra.date BETWEEN check_in_date AND (check_out_date - INTERVAL '1 day')
              AND ra.available_units > 0
              AND ra.stop_sell = false
          WHERE rt.hotel_id = h.id 
            AND rt.is_active = true
            AND rt.max_occupancy >= guests
            AND (max_price IS NULL OR ra.price <= max_price)
            AND (room_type_filter IS NULL OR rt.name ILIKE '%' || room_type_filter || '%')
      )
    ORDER BY 
        match_score DESC,
        distance_km ASC,
        min_price_per_night ASC
    LIMIT max_results;

END;
$$ LANGUAGE plpgsql;