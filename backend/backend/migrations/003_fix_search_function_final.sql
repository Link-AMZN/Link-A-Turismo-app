-- Corrigir a função search_hotels_smart - versão final
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

    RETURN QUERY
    WITH room_availability_summary AS (
        SELECT 
            rt.id as room_type_id,
            MIN(ra.price) as min_price,
            MAX(ra.price) as max_price,
            MIN(ra.available_units) as min_available_units
        FROM room_types rt
        INNER JOIN room_availability ra ON rt.id = ra.room_type_id 
            AND ra.date BETWEEN check_in_date AND (check_out_date - INTERVAL '1 day')
            AND ra.available_units > 0
            AND ra.stop_sell = false
        GROUP BY rt.id
    ),
    available_hotels AS (
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
                    jsonb_build_object(
                        'room_type_id', rt.id,
                        'room_type_name', rt.name,
                        'base_price', rt.base_price,
                        'max_occupancy', rt.max_occupancy,
                        'available_units', ras.min_available_units,
                        'price_per_night', ras.min_price,
                        'total_price', ras.min_price * nights,
                        'amenities', rt.amenities,
                        'images', rt.images
                    )
                ) FILTER (WHERE rt.id IS NOT NULL),
                '[]'::jsonb
            ) as available_room_types,
            
            ras.min_price as min_price_per_night,
            ras.max_price as max_price_per_night,
            
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
        INNER JOIN room_availability_summary ras ON rt.id = ras.room_type_id
        
        WHERE h.is_active = true
          AND rt.max_occupancy >= guests
          AND (max_price IS NULL OR ras.min_price <= max_price)
          AND (room_type_filter IS NULL OR rt.name ILIKE '%' || room_type_filter || '%')
          AND (required_amenities IS NULL OR h.amenities @> required_amenities)
        
        GROUP BY h.id, h.name, h.slug, h.description, h.address, h.locality, h.province, 
                 h.lat, h.lng, h.location_geom, h.amenities, ras.min_price, ras.max_price
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
