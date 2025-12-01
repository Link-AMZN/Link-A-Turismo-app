-- Function: get_rides_smart_final
-- Description: Busca inteligente de rides com filtros de direção geográfica
-- Version: 2.0 - Corrigido filtro de direção para evitar rotas opostas

CREATE OR REPLACE FUNCTION public.get_rides_smart_final(
    search_from text DEFAULT ''::text, 
    search_to text DEFAULT ''::text, 
    radius_km double precision DEFAULT 100,
    max_results integer DEFAULT 50
) RETURNS TABLE(
    ride_id uuid, 
    driver_id text, 
    driver_name text, 
    driver_rating numeric, 
    vehicle_make text, 
    vehicle_model text, 
    vehicle_type text, 
    vehicle_plate text, 
    vehicle_color text, 
    max_passengers integer, 
    from_city text, 
    to_city text, 
    from_lat double precision, 
    from_lng double precision, 
    to_lat double precision, 
    to_lng double precision, 
    departuredate timestamp without time zone, 
    availableseats integer, 
    priceperseat numeric, 
    distance_from_city_km double precision, 
    distance_to_city_km double precision,
    match_type text,
    direction_score integer
)
LANGUAGE plpgsql
AS $$
DECLARE
    normalized_from TEXT;
    normalized_to TEXT;
    search_from_city TEXT;
    search_to_city TEXT;
    search_from_province TEXT;
    search_to_province TEXT;
    from_location_geom GEOMETRY;
    to_location_geom GEOMETRY;
    from_city_name TEXT;
    to_city_name TEXT;
    
    -- 🎯 NOVAS VARIÁVEIS PARA FILTROS DE DIREÇÃO
    user_direction_radians double precision;
    max_destination_distance_km double precision := 600;
    max_direction_diff_degrees double precision := 120;
BEGIN
    -- Normalização
    normalized_from := LOWER(TRIM(search_from));
    normalized_to := LOWER(TRIM(search_to));

    -- Extrair cidade e província
    search_from_city := split_part(normalized_from, ',', 1);
    search_to_city := split_part(normalized_to, ',', 1);
    search_from_province := TRIM(COALESCE(split_part(normalized_from, ',', 2), ''));
    search_to_province := TRIM(COALESCE(split_part(normalized_to, ',', 2), ''));

    -- Selecionar geometrias
    SELECT 
        geom,
        name,
        province
    INTO 
        from_location_geom,
        from_city_name,
        search_from_province
    FROM mozambique_locations 
    WHERE name ILIKE '%' || search_from_city || '%'
       AND (search_from_province = '' OR province ILIKE '%' || search_from_province || '%')
    ORDER BY 
        CASE 
            WHEN name = INITCAP(search_from_city) AND 
                 (search_from_province = '' OR province ILIKE '%' || search_from_province || '%') THEN 1
            WHEN name ILIKE search_from_city || '%' AND 
                 (search_from_province = '' OR province ILIKE '%' || search_from_province || '%') THEN 2
            WHEN name ILIKE '%' || search_from_city || '%' AND 
                 (search_from_province = '' OR province ILIKE '%' || search_from_province || '%') THEN 3
            ELSE 4
        END,
        LENGTH(name)
    LIMIT 1;

    SELECT 
        geom,
        name,
        province
    INTO 
        to_location_geom,
        to_city_name,
        search_to_province
    FROM mozambique_locations 
    WHERE name ILIKE '%' || search_to_city || '%'
       AND (search_to_province = '' OR province ILIKE '%' || search_to_province || '%')
    ORDER BY 
        CASE 
            WHEN name = INITCAP(search_to_city) AND 
                 (search_to_province = '' OR province ILIKE '%' || search_to_province || '%') THEN 1
            WHEN name ILIKE search_to_city || '%' AND 
                 (search_to_province = '' OR province ILIKE '%' || search_to_province || '%') THEN 2
            WHEN name ILIKE '%' || search_to_city || '%' AND 
                 (search_to_province = '' OR province ILIKE '%' || search_to_province || '%') THEN 3
            ELSE 4
        END,
        LENGTH(name)
    LIMIT 1;

    -- 🎯 CALCULAR DIREÇÃO DO USUÁRIO
    IF from_location_geom IS NOT NULL AND to_location_geom IS NOT NULL THEN
        user_direction_radians := ATAN2(
            ST_Y(to_location_geom) - ST_Y(from_location_geom),
            ST_X(to_location_geom) - ST_X(from_location_geom)
        );
    ELSE
        user_direction_radians := NULL;
    END IF;

    RAISE NOTICE 'Busca: % → % | Geometrias: % → %', 
        search_from, search_to, 
        COALESCE(from_city_name, 'NULL'), COALESCE(to_city_name, 'NULL');

    RETURN QUERY 
    WITH available_rides AS (
        SELECT 
            r.id as ride_id,
            r."driverId"::TEXT as driver_id,
            COALESCE(u."firstName", 'Motorista')::TEXT as driver_name,
            COALESCE(u.rating, 4.5) as driver_rating,
            COALESCE(v.make, 'Desconhecida')::TEXT as vehicle_make,
            COALESCE(v.model, 'Desconhecido')::TEXT as vehicle_model,
            COALESCE(v.vehicle_type, 'standard')::TEXT as vehicle_type,
            COALESCE(v.plate_number, 'N/A')::TEXT as vehicle_plate,
            COALESCE(v.color, 'N/A')::TEXT as vehicle_color,
            r."maxPassengers" as max_passengers,

            r."fromCity"::TEXT as from_city,
            r."toCity"::TEXT as to_city,
            CASE WHEN r.from_geom IS NOT NULL THEN ST_Y(r.from_geom) END as from_lat,
            CASE WHEN r.from_geom IS NOT NULL THEN ST_X(r.from_geom) END as from_lng,
            CASE WHEN r.to_geom IS NOT NULL THEN ST_Y(r.to_geom) END as to_lat,
            CASE WHEN r.to_geom IS NOT NULL THEN ST_X(r.to_geom) END as to_lng,

            r."departureDate" as departuredate,
            r."availableSeats" as availableseats,
            r."pricePerSeat" as priceperseat,

            -- Distâncias
            CASE 
                WHEN r.from_geom IS NOT NULL AND from_location_geom IS NOT NULL THEN
                    ST_DistanceSphere(r.from_geom, from_location_geom) / 1000
                ELSE 1000
            END as distance_from_city_km,

            CASE 
                WHEN r.to_geom IS NOT NULL AND to_location_geom IS NOT NULL THEN
                    ST_DistanceSphere(r.to_geom, to_location_geom) / 1000
                ELSE 1000
            END as distance_to_city_km,

            -- Tipo de match
            CASE 
                WHEN (r.from_geom IS NOT NULL AND from_location_geom IS NOT NULL 
                      AND ST_DistanceSphere(r.from_geom, from_location_geom) / 1000 <= radius_km)
                      AND (r.to_geom IS NOT NULL AND to_location_geom IS NOT NULL 
                      AND ST_DistanceSphere(r.to_geom, to_location_geom) / 1000 <= radius_km) THEN 'exact_both'
                WHEN (r.from_geom IS NOT NULL AND from_location_geom IS NOT NULL 
                      AND ST_DistanceSphere(r.from_geom, from_location_geom) / 1000 <= radius_km) THEN 'nearby_origin'
                WHEN (r.to_geom IS NOT NULL AND to_location_geom IS NOT NULL 
                      AND ST_DistanceSphere(r.to_geom, to_location_geom) / 1000 <= radius_km) THEN 'nearby_destination'
                ELSE 'no_match'
            END::TEXT as match_type,

            -- 🎯 SCORE DE DIREÇÃO
            CASE 
                WHEN (r.from_geom IS NOT NULL AND from_location_geom IS NOT NULL 
                      AND ST_DistanceSphere(r.from_geom, from_location_geom) / 1000 <= radius_km)
                      AND (r.to_geom IS NOT NULL AND to_location_geom IS NOT NULL 
                      AND ST_DistanceSphere(r.to_geom, to_location_geom) / 1000 <= radius_km) THEN 100
                WHEN (r.from_geom IS NOT NULL AND from_location_geom IS NOT NULL 
                      AND ST_DistanceSphere(r.from_geom, from_location_geom) / 1000 <= radius_km) THEN 80
                WHEN (r.to_geom IS NOT NULL AND to_location_geom IS NOT NULL 
                      AND ST_DistanceSphere(r.to_geom, to_location_geom) / 1000 <= radius_km) THEN 60
                ELSE 0
            END as direction_score

        FROM rides r
        LEFT JOIN users u ON r."driverId" = u.id
        LEFT JOIN vehicles v ON r."vehicle_uuid" = v.id
        WHERE r.status = 'available'
          AND r."departureDate" > NOW()
          AND r."availableSeats" > 0
          -- 🎯 FILTRO CRÍTICO: Aplicar limites de direção e distância
          AND (
            user_direction_radians IS NULL 
            OR r.from_geom IS NULL 
            OR r.to_geom IS NULL
            OR ABS(DEGREES(
                ATAN2(ST_Y(r.to_geom) - ST_Y(r.from_geom), ST_X(r.to_geom) - ST_X(r.from_geom))
                - user_direction_radians
            )) < max_direction_diff_degrees
          )
          AND (
            to_location_geom IS NULL 
            OR r.to_geom IS NULL
            OR ST_DistanceSphere(r.to_geom, to_location_geom) / 1000 < max_destination_distance_km
          )
    )
    SELECT 
        ar.ride_id, 
        ar.driver_id, 
        ar.driver_name, 
        ar.driver_rating,
        ar.vehicle_make, 
        ar.vehicle_model, 
        ar.vehicle_type, 
        ar.vehicle_plate, 
        ar.vehicle_color,
        ar.max_passengers, 
        ar.from_city, 
        ar.to_city, 
        ar.from_lat, 
        ar.from_lng, 
        ar.to_lat, 
        ar.to_lng,
        ar.departuredate, 
        ar.availableseats, 
        ar.priceperseat,
        ar.distance_from_city_km, 
        ar.distance_to_city_km,
        ar.match_type,
        ar.direction_score::integer
    FROM available_rides ar
    WHERE ar.direction_score > 0
    ORDER BY 
        ar.direction_score DESC,
        ar.distance_from_city_km ASC,
        ar.priceperseat ASC
    LIMIT max_results;

END;
$$;

-- Define o owner da função
ALTER FUNCTION public.get_rides_smart_final(text, text, double precision, integer) OWNER TO linka_user;