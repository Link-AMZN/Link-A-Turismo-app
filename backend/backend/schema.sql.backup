--
-- PostgreSQL database dump
--

\restrict uVTBszx1qzMgd7DrO0KktfmyHR4p75JRlF7Rixil5hlWglI8IXsapGySMlehozg

-- Dumped from database version 18.0 (Ubuntu 18.0-1.pgdg24.04+3)
-- Dumped by pg_dump version 18.0 (Ubuntu 18.0-1.pgdg24.04+3)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO pg_database_owner;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: partnership_level; Type: TYPE; Schema: public; Owner: linka_user
--

CREATE TYPE public.partnership_level AS ENUM (
    'bronze',
    'silver',
    'gold',
    'platinum'
);


ALTER TYPE public.partnership_level OWNER TO linka_user;

--
-- Name: service_type; Type: TYPE; Schema: public; Owner: linka_user
--

CREATE TYPE public.service_type AS ENUM (
    'ride',
    'accommodation',
    'event'
);


ALTER TYPE public.service_type OWNER TO linka_user;

--
-- Name: status; Type: TYPE; Schema: public; Owner: linka_user
--

CREATE TYPE public.status AS ENUM (
    'pending',
    'active',
    'confirmed',
    'cancelled',
    'completed',
    'expired',
    'available'
);


ALTER TYPE public.status OWNER TO linka_user;

--
-- Name: user_type; Type: TYPE; Schema: public; Owner: linka_user
--

CREATE TYPE public.user_type AS ENUM (
    'client',
    'driver',
    'host',
    'admin'
);


ALTER TYPE public.user_type OWNER TO linka_user;

--
-- Name: auto_fill_provinces(); Type: FUNCTION; Schema: public; Owner: linka_user
--

CREATE FUNCTION public.auto_fill_provinces() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
IF NEW."fromProvince" IS NULL OR NEW."fromProvince" = '' THEN
    NEW."fromProvince" := extract_province_from_address(NEW."fromAddress");
  END IF;
IF NEW."toProvince" IS NULL OR NEW."toProvince" = '' THEN
    NEW."toProvince" := extract_province_from_address(NEW."toAddress");
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.auto_fill_provinces() OWNER TO linka_user;

--
-- Name: debug_rides_data(text, text); Type: FUNCTION; Schema: public; Owner: linka_user
--

CREATE FUNCTION public.debug_rides_data(p_from_city text, p_to_city text) RETURNS TABLE(table_source text, ride_id uuid, driver_id text, driver_name text, vehicle_model text, price numeric, available_seats integer)
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Dados da tabela rides
    RETURN QUERY
    SELECT 
        'rides_table' as table_source,
        r.id as ride_id,
        r.driver_id,
        'N/A' as driver_name,
        'N/A' as vehicle_model,
        r.priceperseat as price,
        r.availableseats as available_seats
    FROM rides r
    WHERE r.status = 'available'
      AND r.departuredate > NOW()
    LIMIT 10;

    -- Verificar se há joins possíveis
    IF EXISTS (SELECT 1 FROM users LIMIT 1) THEN
        RETURN QUERY
        SELECT 
            'rides_with_users' as table_source,
            r.id as ride_id,
            r.driver_id,
            COALESCE(u.full_name, 'Sem nome') as driver_name,
            'N/A' as vehicle_model,
            r.priceperseat as price,
            r.availableseats as available_seats
        FROM rides r
        LEFT JOIN users u ON r.driver_id = u.firebase_uid
        WHERE r.status = 'available'
          AND r.departuredate > NOW()
        LIMIT 10;
    END IF;

    -- Verificar vehicles
    IF EXISTS (SELECT 1 FROM vehicles LIMIT 1) THEN
        RETURN QUERY
        SELECT 
            'rides_with_vehicles' as table_source,
            r.id as ride_id,
            r.driver_id,
            COALESCE(u.full_name, 'Sem nome') as driver_name,
            COALESCE(v.model, 'Sem modelo') as vehicle_model,
            r.priceperseat as price,
            r.availableseats as available_seats
        FROM rides r
        LEFT JOIN users u ON r.driver_id = u.firebase_uid
        LEFT JOIN vehicles v ON r.driver_id = v.driver_id
        WHERE r.status = 'available'
          AND r.departuredate > NOW()
        LIMIT 10;
    END IF;
END;
$$;


ALTER FUNCTION public.debug_rides_data(p_from_city text, p_to_city text) OWNER TO linka_user;

--
-- Name: extract_province_from_address(text); Type: FUNCTION; Schema: public; Owner: linka_user
--

CREATE FUNCTION public.extract_province_from_address(address_text text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
  province_name TEXT;
BEGIN
  IF address_text IS NULL OR address_text = '' THEN
    RETURN NULL;
  END IF;
SELECT province INTO province_name
  FROM mozambique_locations 
  WHERE name ILIKE '%' || TRIM(SPLIT_PART(address_text, ',', 1)) || '%'
  LIMIT 1;
  
  RETURN province_name;
END;
$$;


ALTER FUNCTION public.extract_province_from_address(address_text text) OWNER TO linka_user;

--
-- Name: f_unaccent(text); Type: FUNCTION; Schema: public; Owner: linka_user
--

CREATE FUNCTION public.f_unaccent(text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $_$
SELECT public.unaccent($1);
$_$;


ALTER FUNCTION public.f_unaccent(text) OWNER TO linka_user;

--
-- Name: find_compatible_rides(text, text, integer); Type: FUNCTION; Schema: public; Owner: linka_user
--

CREATE FUNCTION public.find_compatible_rides(passenger_from_province text, passenger_to_province text, max_distance_km integer DEFAULT 200) RETURNS TABLE(ride_id uuid, driver_from_province text, driver_to_province text, match_type text, route_compatibility integer)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        r.id AS ride_id,
        r."fromProvince"::text AS driver_from_province,
        r."toProvince"::text AS driver_to_province,
        CASE
            WHEN r."fromProvince"::text = passenger_from_province
                 AND r."toProvince"::text = passenger_to_province
            THEN 'exact_match'
            
            WHEN (SELECT COALESCE(po_from.order_index, 0)
                  FROM province_ordering po_from
                  WHERE po_from.province = r."fromProvince"::text) <=
                 (SELECT COALESCE(po_pass_from.order_index, 0)
                  FROM province_ordering po_pass_from
                  WHERE po_pass_from.province = passenger_from_province)
             AND (SELECT COALESCE(po_to.order_index, 0)
                  FROM province_ordering po_to
                  WHERE po_to.province = r."toProvince"::text) >=
                 (SELECT COALESCE(po_pass_to.order_index, 0)
                  FROM province_ordering po_pass_to
                  WHERE po_pass_to.province = passenger_to_province)
            THEN 'same_segment'

            ELSE 'potential'
        END AS match_type,
        
        CASE
            WHEN r."fromProvince"::text = passenger_from_province
                 AND r."toProvince"::text = passenger_to_province
            THEN 100

            WHEN (SELECT COALESCE(po_from.order_index, 0)
                  FROM province_ordering po_from
                  WHERE po_from.province = r."fromProvince"::text) <=
                 (SELECT COALESCE(po_pass_from.order_index, 0)
                  FROM province_ordering po_pass_from
                  WHERE po_pass_from.province = passenger_from_province)
             AND (SELECT COALESCE(po_to.order_index, 0)
                  FROM province_ordering po_to
                  WHERE po_to.province = r."toProvince"::text) >=
                 (SELECT COALESCE(po_pass_to.order_index, 0)
                  FROM province_ordering po_pass_to
                  WHERE po_pass_to.province = passenger_to_province)
            THEN 85

            ELSE 50
        END AS route_compatibility
    FROM rides r
    WHERE r.status = 'available'
      AND r."fromProvince" IS NOT NULL
      AND r."toProvince" IS NOT NULL
    ORDER BY route_compatibility DESC;
END;
$$;


ALTER FUNCTION public.find_compatible_rides(passenger_from_province text, passenger_to_province text, max_distance_km integer) OWNER TO linka_user;

--
-- Name: get_rides_smart_final(text, text, double precision); Type: FUNCTION; Schema: public; Owner: linka_user
--

CREATE FUNCTION public.get_rides_smart_final(city_from text, city_to text, radius_km double precision DEFAULT 100) RETURNS TABLE(ride_id uuid, driver_id text, driver_name text, driver_rating numeric, vehicle_make text, vehicle_model text, vehicle_type text, vehicle_plate text, vehicle_color text, max_passengers integer, from_city text, to_city text, from_lat double precision, from_lng double precision, to_lat double precision, to_lng double precision, departuredate timestamp without time zone, availableseats integer, priceperseat numeric, distance_from_city_km double precision, distance_to_city_km double precision)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id as ride_id,
        r."driverId" as driver_id,
        COALESCE(u."fullName", r."driverName", 'Motorista') as driver_name,
        COALESCE(ds."averageRating", 4.5) as driver_rating,
        COALESCE(dv."vehicleMake", '') as vehicle_make,
        COALESCE(dv."vehicleModel", 'Veículo') as vehicle_model,
        COALESCE(dv."vehicleType", r."vehicleType") as vehicle_type,
        COALESCE(dv."vehiclePlate", 'N/A') as vehicle_plate,
        COALESCE(dv."vehicleColor", 'Não informada') as vehicle_color,
        COALESCE(dv."maxPassengers", r."maxPassengers", 4) as max_passengers,
        r."fromCity"::text as from_city,
        r."toCity"::text as to_city,
        ST_Y(r.from_geom) AS from_lat,
        ST_X(r.from_geom) AS from_lng,
        ST_Y(r.to_geom) AS to_lat,
        ST_X(r.to_geom) AS to_lng,
        r."departureDate" as departuredate,
        r."availableSeats" as availableseats,
        r."pricePerSeat" as priceperseat,
        ST_Distance(
            ST_SetSRID(ST_MakePoint(lf.lng, lf.lat), 4326)::geography,
            r.from_geom::geography
        ) / 1000 AS distance_from_city_km,
        ST_Distance(
            ST_SetSRID(ST_MakePoint(lt.lng, lt.lat), 4326)::geography,
            r.to_geom::geography
        ) / 1000 AS distance_to_city_km
    FROM rides r
    LEFT JOIN users u ON r."driverId" = u.id
    LEFT JOIN "driverStats" ds ON r."driverId" = ds."driverId"
    LEFT JOIN "driverVehicles" dv ON r."vehicleId" = dv.id
    JOIN LATERAL (
        SELECT lat, lng
        FROM mozambique_locations
        WHERE LOWER(name) = LOWER(city_from)
           OR LOWER(district) = LOWER(city_from)
           OR LOWER(province) = LOWER(city_from)
        ORDER BY earth_distance(
            ll_to_earth(ST_Y(r.from_geom), ST_X(r.from_geom)),
            ll_to_earth(lat, lng)
        )
        LIMIT 1
    ) lf ON true
    JOIN LATERAL (
        SELECT lat, lng
        FROM mozambique_locations
        WHERE LOWER(name) = LOWER(city_to)
           OR LOWER(district) = LOWER(city_to)
           OR LOWER(province) = LOWER(city_to)
        ORDER BY earth_distance(
            ll_to_earth(ST_Y(r.to_geom), ST_X(r.to_geom)),
            ll_to_earth(lat, lng)
        )
        LIMIT 1
    ) lt ON true
    WHERE r.status = 'available'
      AND r."departureDate" > NOW()
      AND r."availableSeats" > 0
      AND (
          ST_Distance(
              ST_SetSRID(ST_MakePoint(lf.lng, lf.lat), 4326)::geography,
              r.from_geom::geography
          ) <= radius_km * 1000
          OR ST_Distance(
              ST_SetSRID(ST_MakePoint(lt.lng, lt.lat), 4326)::geography,
              r.to_geom::geography
          ) <= radius_km * 1000
      )
    ORDER BY
        (ST_Distance(
            ST_SetSRID(ST_MakePoint(lf.lng, lf.lat), 4326)::geography,
            r.from_geom::geography
        ) + ST_Distance(
            ST_SetSRID(ST_MakePoint(lt.lng, lt.lat), 4326)::geography,
            r.to_geom::geography
        )) ASC
    LIMIT 50;
END;
$$;


ALTER FUNCTION public.get_rides_smart_final(city_from text, city_to text, radius_km double precision) OWNER TO linka_user;

--
-- Name: get_rides_universal(text, text, double precision, double precision, double precision, double precision, double precision); Type: FUNCTION; Schema: public; Owner: linka_user
--

CREATE FUNCTION public.get_rides_universal(from_city_in text DEFAULT NULL::text, to_city_in text DEFAULT NULL::text, from_lat double precision DEFAULT NULL::double precision, from_lng double precision DEFAULT NULL::double precision, to_lat double precision DEFAULT NULL::double precision, to_lng double precision DEFAULT NULL::double precision, radius_km double precision DEFAULT 20) RETURNS TABLE(ride_id uuid, driver_id text, from_city_out text, to_city_out text, from_lat_out double precision, from_lng_out double precision, to_lat_out double precision, to_lng_out double precision, departuredate timestamp without time zone, availableseats integer, priceperseat numeric, distance_from_km double precision, distance_to_km double precision, match_type text)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        r.id,
        r."driverId",
        r."fromCity"::text AS from_city_out,
        r."toCity"::text AS to_city_out,
        ST_Y(r.from_geom) AS from_lat_out,
        ST_X(r.from_geom) AS from_lng_out,
        ST_Y(r.to_geom) AS to_lat_out,
        ST_X(r.to_geom) AS to_lng_out,
        r."departureDate",
        r."availableSeats",
        r."pricePerSeat",
        COALESCE(
            CASE 
                WHEN from_lat IS NOT NULL AND from_lng IS NOT NULL THEN
                    ST_Distance(
                        ST_SetSRID(ST_MakePoint(from_lng, from_lat), 4326)::geography,
                        ST_MakeLine(r.from_geom, r.to_geom)::geography
                    ) / 1000
            END,
            0
        ) AS distance_from_km,
        COALESCE(
            CASE 
                WHEN to_lat IS NOT NULL AND to_lng IS NOT NULL THEN
                    ST_Distance(
                        ST_SetSRID(ST_MakePoint(to_lng, to_lat), 4326)::geography,
                        ST_MakeLine(r.from_geom, r.to_geom)::geography
                    ) / 1000
            END,
            0
        ) AS distance_to_km,
        CASE
            WHEN from_lat IS NOT NULL AND from_lng IS NOT NULL AND to_lat IS NOT NULL AND to_lng IS NOT NULL THEN 'geo_match'
            WHEN from_city_in IS NOT NULL OR to_city_in IS NOT NULL THEN 'city_match'
            ELSE 'nearby_match'
        END AS match_type
    FROM rides r
    WHERE r."availableSeats" > 0
      AND r."departureDate" >= NOW()
      AND (
          (from_lat IS NULL OR from_lng IS NULL OR
           ST_DWithin(
               ST_SetSRID(ST_MakePoint(from_lng, from_lat), 4326)::geography,
               ST_MakeLine(r.from_geom, r.to_geom)::geography,
               radius_km * 1000
           ))
          AND
          (to_lat IS NULL OR to_lng IS NULL OR
           ST_DWithin(
               ST_SetSRID(ST_MakePoint(to_lng, to_lat), 4326)::geography,
               ST_MakeLine(r.from_geom, r.to_geom)::geography,
               radius_km * 1000
           ))
      )
      AND (
          (from_city_in IS NULL OR r."fromCity" ILIKE '%' || from_city_in || '%')
          AND (to_city_in IS NULL OR r."toCity" ILIKE '%' || to_city_in || '%')
      )
    ORDER BY (distance_from_km + distance_to_km) ASC
    LIMIT 50;
END;
$$;


ALTER FUNCTION public.get_rides_universal(from_city_in text, to_city_in text, from_lat double precision, from_lng double precision, to_lat double precision, to_lng double precision, radius_km double precision) OWNER TO linka_user;

--
-- Name: is_ride_in_corridor(text, text, text, text); Type: FUNCTION; Schema: public; Owner: linka_user
--

CREATE FUNCTION public.is_ride_in_corridor(ride_from_province text, ride_to_province text, search_from_province text, search_to_province text) RETURNS TABLE(is_match boolean, corridor_name text, match_type text, compatibility integer)
    LANGUAGE plpgsql
    AS $$
BEGIN
 IF (LOWER(ride_from_province) IN ('maputo', 'cidade de maputo') 
        AND LOWER(ride_to_province) = 'inhambane'
        AND LOWER(search_from_province) = 'gaza'
        AND LOWER(search_to_province) = 'inhambane') THEN
        
        RETURN QUERY SELECT true, 'EN1-Sul-Extendido', 'covers_route', 95;
        RETURN;
    END IF;
 IF (LOWER(ride_from_province) IN ('maputo', 'cidade de maputo') 
        AND LOWER(ride_to_province) = 'inhambane'
        AND LOWER(search_from_province) = 'maputo'
        AND LOWER(search_to_province) = 'gaza') THEN
        
        RETURN QUERY SELECT true, 'EN1-Sul', 'first_leg', 80;
        RETURN;
    END IF;
IF (LOWER(ride_from_province) = LOWER(search_from_province)
        AND LOWER(ride_to_province) = LOWER(search_to_province)) THEN
        
        RETURN QUERY SELECT true, 'Rota-Exata', 'exact_match', 100;
        RETURN;
    END IF;
 RETURN QUERY SELECT false, '', 'no_match', 0;
END;
$$;


ALTER FUNCTION public.is_ride_in_corridor(ride_from_province text, ride_to_province text, search_from_province text, search_to_province text) OWNER TO linka_user;

--
-- Name: normalize_location_name(text); Type: FUNCTION; Schema: public; Owner: linka_user
--

CREATE FUNCTION public.normalize_location_name(location_text text) RETURNS text
    LANGUAGE plpgsql
    AS $_$
DECLARE
    clean_text TEXT;
    result TEXT;
BEGIN
    -- Limpa o texto mantendo a especificidade
    clean_text = LOWER(TRIM(location_text));
    
    -- Remove apenas partes genéricas, mantendo nomes específicos
    clean_text = REGEXP_REPLACE(clean_text, ',\s*(cidade de|vila de|bairro de|munic[íi]pio de).*$', '', 'gi');
    clean_text = TRIM(clean_text);
    
    -- Se ainda tiver vírgula, pega a PRIMEIRA parte (mais específica)
    IF clean_text LIKE '%,%' THEN
        clean_text = SPLIT_PART(clean_text, ',', 1);
    END IF;
    
    clean_text = TRIM(clean_text);
    
    -- Tenta encontrar match no banco
    SELECT name INTO result
    FROM mozambique_locations 
    WHERE LOWER(name) = clean_text
       OR LOWER(name) LIKE clean_text || '%'
       OR LOWER(district) = clean_text
    ORDER BY 
        CASE 
            WHEN LOWER(name) = clean_text THEN 1
            WHEN LOWER(name) LIKE clean_text || '%' THEN 2  
            WHEN LOWER(district) = clean_text THEN 3
            ELSE 4
        END,
        CASE type
            WHEN 'city' THEN 1
            WHEN 'town' THEN 2
            WHEN 'village' THEN 3
            WHEN 'neighbourhood' THEN 4
            ELSE 5
        END
    LIMIT 1;
    
    -- Fallback: retorna o texto limpo (não generaliza!)
    IF result IS NULL THEN
        result = clean_text;
    END IF;
    
    RETURN result;
END;
$_$;


ALTER FUNCTION public.normalize_location_name(location_text text) OWNER TO linka_user;

--
-- Name: planet_osm_index_bucket(bigint[]); Type: FUNCTION; Schema: public; Owner: linka_user
--

CREATE FUNCTION public.planet_osm_index_bucket(bigint[]) RETURNS bigint[]
    LANGUAGE sql IMMUTABLE
    AS $_$  SELECT ARRAY(SELECT DISTINCT    unnest($1) >> 5)$_$;


ALTER FUNCTION public.planet_osm_index_bucket(bigint[]) OWNER TO linka_user;

--
-- Name: planet_osm_line_osm2pgsql_valid(); Type: FUNCTION; Schema: public; Owner: linka_user
--

CREATE FUNCTION public.planet_osm_line_osm2pgsql_valid() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF ST_IsValid(NEW.way) THEN 
    RETURN NEW;
  END IF;
  RETURN NULL;
END;$$;


ALTER FUNCTION public.planet_osm_line_osm2pgsql_valid() OWNER TO linka_user;

--
-- Name: planet_osm_member_ids(jsonb, character); Type: FUNCTION; Schema: public; Owner: linka_user
--

CREATE FUNCTION public.planet_osm_member_ids(jsonb, character) RETURNS bigint[]
    LANGUAGE sql IMMUTABLE
    AS $_$  SELECT array_agg((el->>'ref')::int8)   FROM jsonb_array_elements($1) AS el    WHERE el->>'type' = $2$_$;


ALTER FUNCTION public.planet_osm_member_ids(jsonb, character) OWNER TO linka_user;

--
-- Name: planet_osm_point_osm2pgsql_valid(); Type: FUNCTION; Schema: public; Owner: linka_user
--

CREATE FUNCTION public.planet_osm_point_osm2pgsql_valid() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF ST_IsValid(NEW.way) THEN 
    RETURN NEW;
  END IF;
  RETURN NULL;
END;$$;


ALTER FUNCTION public.planet_osm_point_osm2pgsql_valid() OWNER TO linka_user;

--
-- Name: planet_osm_polygon_osm2pgsql_valid(); Type: FUNCTION; Schema: public; Owner: linka_user
--

CREATE FUNCTION public.planet_osm_polygon_osm2pgsql_valid() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF ST_IsValid(NEW.way) THEN 
    RETURN NEW;
  END IF;
  RETURN NULL;
END;$$;


ALTER FUNCTION public.planet_osm_polygon_osm2pgsql_valid() OWNER TO linka_user;

--
-- Name: planet_osm_roads_osm2pgsql_valid(); Type: FUNCTION; Schema: public; Owner: linka_user
--

CREATE FUNCTION public.planet_osm_roads_osm2pgsql_valid() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF ST_IsValid(NEW.way) THEN 
    RETURN NEW;
  END IF;
  RETURN NULL;
END;$$;


ALTER FUNCTION public.planet_osm_roads_osm2pgsql_valid() OWNER TO linka_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: accommodations; Type: TABLE; Schema: public; Owner: linka_user
--

CREATE TABLE public.accommodations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    "hostId" text,
    address text NOT NULL,
    locality character varying(100),
    province character varying(100),
    country character varying(100) DEFAULT 'Moçambique'::character varying,
    "searchRadius" integer DEFAULT 50,
    lat numeric(10,7),
    lng numeric(10,7),
    rating numeric(3,1),
    "reviewCount" integer DEFAULT 0,
    images text[] DEFAULT '{}'::text[],
    amenities text[] DEFAULT '{}'::text[],
    description text,
    "distanceFromCenter" numeric(4,1),
    "isAvailable" boolean DEFAULT true,
    "offerDriverDiscounts" boolean DEFAULT false,
    "driverDiscountRate" numeric(5,2) DEFAULT 10.00,
    "minimumDriverLevel" text DEFAULT 'bronze'::text,
    "partnershipBadgeVisible" boolean DEFAULT false,
    "enablePartnerships" boolean DEFAULT false,
    "accommodationDiscount" integer DEFAULT 10,
    "transportDiscount" integer DEFAULT 15,
    "maxGuests" integer DEFAULT 2,
    "checkInTime" text,
    "checkOutTime" text,
    policies text,
    "contactEmail" text,
    "contactPhone" text,
    "createdAt" timestamp without time zone DEFAULT now(),
    "updatedAt" timestamp without time zone DEFAULT now()
);


ALTER TABLE public.accommodations OWNER TO linka_user;

--
-- Name: adminActions; Type: TABLE; Schema: public; Owner: linka_user
--

CREATE TABLE public."adminActions" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "adminId" text,
    "targetUserId" text,
    action text NOT NULL,
    reason text NOT NULL,
    duration integer,
    notes text,
    "isActive" boolean DEFAULT true,
    "createdAt" timestamp without time zone DEFAULT now()
);


ALTER TABLE public."adminActions" OWNER TO linka_user;

--
-- Name: bookings; Type: TABLE; Schema: public; Owner: linka_user
--

CREATE TABLE public.bookings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "rideId" uuid,
    "passengerId" text,
    "accommodationId" uuid,
    "hotelRoomId" uuid,
    type character varying(20) DEFAULT 'ride'::character varying,
    status character varying(20) DEFAULT 'pending'::character varying,
    "totalPrice" numeric(10,2) NOT NULL,
    "seatsBooked" integer NOT NULL,
    passengers integer DEFAULT 1,
    "guestName" text,
    "guestEmail" text,
    "guestPhone" text,
    "checkInDate" timestamp without time zone,
    "checkOutDate" timestamp without time zone,
    "nightsCount" integer,
    "createdAt" timestamp without time zone DEFAULT now(),
    "updatedAt" timestamp without time zone DEFAULT now(),
    "roomId" uuid,
    "bookingType" text DEFAULT 'ride'::text NOT NULL,
    "numberOfGuests" integer DEFAULT 1,
    "totalAmount" numeric(10,2),
    "specialRequests" text,
    CONSTRAINT hotel_booking_requires_room CHECK ((("bookingType" <> 'hotel'::text) OR (("roomId" IS NOT NULL) AND ("checkInDate" IS NOT NULL) AND ("checkOutDate" IS NOT NULL)))),
    CONSTRAINT ride_booking_requires_ride CHECK ((("bookingType" <> 'ride'::text) OR ("rideId" IS NOT NULL))),
    CONSTRAINT valid_booking_type CHECK (("bookingType" = ANY (ARRAY['ride'::text, 'hotel'::text, 'event'::text])))
);


ALTER TABLE public.bookings OWNER TO linka_user;

--
-- Name: chatMessages; Type: TABLE; Schema: public; Owner: linka_user
--

CREATE TABLE public."chatMessages" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "chatRoomId" uuid NOT NULL,
    "fromUserId" text,
    "toUserId" text,
    message text NOT NULL,
    "messageType" text DEFAULT 'text'::text,
    "bookingId" uuid,
    "isRead" boolean DEFAULT false,
    "createdAt" timestamp without time zone DEFAULT now()
);


ALTER TABLE public."chatMessages" OWNER TO linka_user;

--
-- Name: chatRooms; Type: TABLE; Schema: public; Owner: linka_user
--

CREATE TABLE public."chatRooms" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "participantOneId" text NOT NULL,
    "participantTwoId" text NOT NULL,
    "bookingId" uuid,
    "serviceType" text,
    "lastMessage" text,
    "lastMessageAt" timestamp without time zone,
    "isActive" boolean DEFAULT true,
    "createdAt" timestamp without time zone DEFAULT now(),
    "updatedAt" timestamp without time zone DEFAULT now()
);


ALTER TABLE public."chatRooms" OWNER TO linka_user;

--
-- Name: cities; Type: TABLE; Schema: public; Owner: linka_user
--

CREATE TABLE public.cities (
    id integer NOT NULL,
    name text,
    latitude double precision,
    longitude double precision,
    province text
);


ALTER TABLE public.cities OWNER TO linka_user;

--
-- Name: cities_id_seq; Type: SEQUENCE; Schema: public; Owner: linka_user
--

CREATE SEQUENCE public.cities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.cities_id_seq OWNER TO linka_user;

--
-- Name: cities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: linka_user
--

ALTER SEQUENCE public.cities_id_seq OWNED BY public.cities.id;


--
-- Name: driverDocuments; Type: TABLE; Schema: public; Owner: linka_user
--

CREATE TABLE public."driverDocuments" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "driverId" text NOT NULL,
    "vehicleRegistrationUrl" text,
    "drivingLicenseUrl" text,
    "vehicleInsuranceUrl" text,
    "vehicleInspectionUrl" text,
    "vehicleMake" text,
    "vehicleModel" text,
    "vehicleYear" integer,
    "vehiclePlate" text,
    "vehicleColor" text,
    "isVerified" boolean DEFAULT false,
    "verificationDate" timestamp without time zone,
    "verificationNotes" text,
    "createdAt" timestamp without time zone DEFAULT now(),
    "updatedAt" timestamp without time zone DEFAULT now()
);


ALTER TABLE public."driverDocuments" OWNER TO linka_user;

--
-- Name: driverStats; Type: TABLE; Schema: public; Owner: linka_user
--

CREATE TABLE public."driverStats" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "driverId" text,
    "totalRides" integer DEFAULT 0,
    "totalDistance" numeric(10,2) DEFAULT 0.00,
    "totalEarnings" numeric(12,2) DEFAULT 0.00,
    "averageRating" numeric(3,2) DEFAULT 0.00,
    "completedRidesThisMonth" integer DEFAULT 0,
    "completedRidesThisYear" integer DEFAULT 0,
    "partnershipLevel" text DEFAULT 'bronze'::text,
    "lastRideDate" timestamp without time zone,
    "joinedAt" timestamp without time zone DEFAULT now(),
    "updatedAt" timestamp without time zone DEFAULT now()
);


ALTER TABLE public."driverStats" OWNER TO linka_user;

--
-- Name: driverVehicles; Type: TABLE; Schema: public; Owner: linka_user
--

CREATE TABLE public."driverVehicles" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "driverId" text NOT NULL,
    "vehicleMake" text NOT NULL,
    "vehicleModel" text NOT NULL,
    "vehicleYear" integer NOT NULL,
    "vehiclePlate" text NOT NULL,
    "vehicleType" text NOT NULL,
    "vehicleColor" text,
    "maxPassengers" integer DEFAULT 4 NOT NULL,
    "vehiclePhotoUrl" text,
    "isActive" boolean DEFAULT true,
    "isVerified" boolean DEFAULT false,
    "createdAt" timestamp without time zone DEFAULT now(),
    "updatedAt" timestamp without time zone DEFAULT now(),
    CONSTRAINT "driverVehicles_vehicleType_check" CHECK (("vehicleType" = ANY (ARRAY['economy'::text, 'comfort'::text, 'luxury'::text, 'family'::text, 'cargo'::text, 'motorcycle'::text])))
);


ALTER TABLE public."driverVehicles" OWNER TO linka_user;

--
-- Name: eventManagers; Type: TABLE; Schema: public; Owner: linka_user
--

CREATE TABLE public."eventManagers" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "userId" text,
    "companyName" text NOT NULL,
    "companyType" text NOT NULL,
    description text,
    "contactEmail" text NOT NULL,
    "contactPhone" text,
    website text,
    logo text,
    "isVerified" boolean DEFAULT false,
    "createdAt" timestamp without time zone DEFAULT now(),
    "updatedAt" timestamp without time zone DEFAULT now()
);


ALTER TABLE public."eventManagers" OWNER TO linka_user;

--
-- Name: events; Type: TABLE; Schema: public; Owner: linka_user
--

CREATE TABLE public.events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "organizerId" text,
    "managerId" uuid,
    title text NOT NULL,
    description text NOT NULL,
    "eventType" text NOT NULL,
    category text NOT NULL,
    venue text NOT NULL,
    address text NOT NULL,
    locality character varying(100),
    province character varying(100),
    lat numeric(10,7),
    lng numeric(10,7),
    "startDate" timestamp without time zone NOT NULL,
    "endDate" timestamp without time zone NOT NULL,
    "startTime" text,
    "endTime" text,
    "isPaid" boolean DEFAULT false,
    "ticketPrice" numeric(8,2) DEFAULT '0'::numeric,
    "maxTickets" integer DEFAULT 100,
    "ticketsSold" integer DEFAULT 0,
    "enablePartnerships" boolean DEFAULT false,
    "accommodationDiscount" integer DEFAULT 10,
    "transportDiscount" integer DEFAULT 15,
    "organizerName" text,
    "organizerContact" text,
    "organizerEmail" text,
    images text[] DEFAULT '{}'::text[],
    "maxAttendees" integer,
    "currentAttendees" integer DEFAULT 0,
    status text DEFAULT 'pending'::text NOT NULL,
    "requiresApproval" boolean DEFAULT true,
    "isPublic" boolean DEFAULT true,
    "isFeatured" boolean DEFAULT false,
    "hasPartnerships" boolean DEFAULT false,
    "websiteUrl" text,
    "socialMediaLinks" text[] DEFAULT '{}'::text[],
    tags text[] DEFAULT '{}'::text[],
    "createdAt" timestamp without time zone DEFAULT now(),
    "updatedAt" timestamp without time zone DEFAULT now()
);


ALTER TABLE public.events OWNER TO linka_user;

--
-- Name: geographic_corridors; Type: TABLE; Schema: public; Owner: linka_user
--

CREATE TABLE public.geographic_corridors (
    id integer NOT NULL,
    corridor_name character varying(100) NOT NULL,
    provinces text[] NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.geographic_corridors OWNER TO linka_user;

--
-- Name: geographic_corridors_id_seq; Type: SEQUENCE; Schema: public; Owner: linka_user
--

CREATE SEQUENCE public.geographic_corridors_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.geographic_corridors_id_seq OWNER TO linka_user;

--
-- Name: geographic_corridors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: linka_user
--

ALTER SEQUENCE public.geographic_corridors_id_seq OWNED BY public.geographic_corridors.id;


--
-- Name: hotelFinancialReports; Type: TABLE; Schema: public; Owner: linka_user
--

CREATE TABLE public."hotelFinancialReports" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "accommodationId" uuid NOT NULL,
    "reportDate" timestamp without time zone NOT NULL,
    "reportType" text NOT NULL,
    "totalRevenue" numeric(10,2) NOT NULL,
    "roomRevenue" numeric(10,2) NOT NULL,
    "serviceRevenue" numeric(10,2) DEFAULT 0.00,
    "totalBookings" integer DEFAULT 0,
    "confirmedBookings" integer DEFAULT 0,
    "cancelledBookings" integer DEFAULT 0,
    "noShowBookings" integer DEFAULT 0,
    "totalRooms" integer NOT NULL,
    "occupiedRooms" integer DEFAULT 0,
    "occupancyRate" numeric(5,2) DEFAULT 0.00,
    "averageDailyRate" numeric(8,2) DEFAULT 0.00,
    "revenuePerAvailableRoom" numeric(8,2) DEFAULT 0.00,
    "platformFees" numeric(8,2) DEFAULT 0.00,
    "netRevenue" numeric(10,2) NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now()
);


ALTER TABLE public."hotelFinancialReports" OWNER TO linka_user;

--
-- Name: hotelRooms; Type: TABLE; Schema: public; Owner: linka_user
--

CREATE TABLE public."hotelRooms" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "accommodationId" uuid NOT NULL,
    "roomNumber" text NOT NULL,
    "roomType" text NOT NULL,
    description text,
    images text[] DEFAULT '{}'::text[],
    "pricePerNight" numeric(8,2) NOT NULL,
    "weekendPrice" numeric(8,2),
    "holidayPrice" numeric(8,2),
    "maxOccupancy" integer DEFAULT 2 NOT NULL,
    status text DEFAULT 'available'::text,
    "bedType" text,
    "bedCount" integer DEFAULT 1,
    "hasPrivateBathroom" boolean DEFAULT true,
    "hasAirConditioning" boolean DEFAULT false,
    "hasWifi" boolean DEFAULT false,
    "hasTV" boolean DEFAULT false,
    "hasBalcony" boolean DEFAULT false,
    "hasKitchen" boolean DEFAULT false,
    "roomAmenities" text[] DEFAULT '{}'::text[],
    "isAvailable" boolean DEFAULT true,
    "maintenanceUntil" timestamp without time zone,
    "createdAt" timestamp without time zone DEFAULT now(),
    "updatedAt" timestamp without time zone DEFAULT now(),
    amenities text[] DEFAULT '{}'::text[]
);


ALTER TABLE public."hotelRooms" OWNER TO linka_user;

--
-- Name: loyaltyProgram; Type: TABLE; Schema: public; Owner: linka_user
--

CREATE TABLE public."loyaltyProgram" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "userId" text,
    "totalPoints" integer DEFAULT 0,
    "currentPoints" integer DEFAULT 0,
    "membershipLevel" text DEFAULT 'bronze'::text,
    "joinedAt" timestamp without time zone DEFAULT now(),
    "lastActivityAt" timestamp without time zone DEFAULT now(),
    "updatedAt" timestamp without time zone DEFAULT now()
);


ALTER TABLE public."loyaltyProgram" OWNER TO linka_user;

--
-- Name: loyaltyRewards; Type: TABLE; Schema: public; Owner: linka_user
--

CREATE TABLE public."loyaltyRewards" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    "rewardType" text NOT NULL,
    "pointsCost" integer NOT NULL,
    "discountValue" numeric(8,2),
    "minimumLevel" text DEFAULT 'bronze'::text,
    "isActive" boolean DEFAULT true,
    "maxRedemptions" integer,
    "validUntil" timestamp without time zone,
    "createdAt" timestamp without time zone DEFAULT now(),
    "updatedAt" timestamp without time zone DEFAULT now()
);


ALTER TABLE public."loyaltyRewards" OWNER TO linka_user;

--
-- Name: mozambique_admin_level0; Type: TABLE; Schema: public; Owner: linka_user
--

CREATE TABLE public.mozambique_admin_level0 (
    ogc_fid integer NOT NULL,
    shape_leng numeric(18,11),
    shape_area numeric(18,11),
    adm0_en character varying(50),
    adm0_pt character varying(50),
    adm0_pcode character varying(50),
    adm0_ref character varying(50),
    adm0alt1en character varying(50),
    adm0alt2en character varying(50),
    adm0alt1pt character varying(50),
    adm0alt2pt character varying(50),
    date date,
    validon date,
    validto date,
    wkb_geometry public.geometry(MultiPolygon,4326)
);


ALTER TABLE public.mozambique_admin_level0 OWNER TO linka_user;

--
-- Name: mozambique_admin_level0_ogc_fid_seq; Type: SEQUENCE; Schema: public; Owner: linka_user
--

CREATE SEQUENCE public.mozambique_admin_level0_ogc_fid_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.mozambique_admin_level0_ogc_fid_seq OWNER TO linka_user;

--
-- Name: mozambique_admin_level0_ogc_fid_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: linka_user
--

ALTER SEQUENCE public.mozambique_admin_level0_ogc_fid_seq OWNED BY public.mozambique_admin_level0.ogc_fid;


--
-- Name: mozambique_admin_level1; Type: TABLE; Schema: public; Owner: linka_user
--

CREATE TABLE public.mozambique_admin_level1 (
    ogc_fid integer NOT NULL,
    shape_leng numeric(18,11),
    shape_area numeric(18,11),
    adm1_pt character varying(50),
    adm1_pcode character varying(50),
    adm1_ref character varying(50),
    adm1alt1pt character varying(50),
    adm1alt2pt character varying(50),
    adm0_en character varying(50),
    adm0_pt character varying(50),
    adm0_pcode character varying(50),
    date date,
    validon date,
    validto date,
    wkb_geometry public.geometry(MultiPolygon,4326)
);


ALTER TABLE public.mozambique_admin_level1 OWNER TO linka_user;

--
-- Name: mozambique_admin_level1_ogc_fid_seq; Type: SEQUENCE; Schema: public; Owner: linka_user
--

CREATE SEQUENCE public.mozambique_admin_level1_ogc_fid_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.mozambique_admin_level1_ogc_fid_seq OWNER TO linka_user;

--
-- Name: mozambique_admin_level1_ogc_fid_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: linka_user
--

ALTER SEQUENCE public.mozambique_admin_level1_ogc_fid_seq OWNED BY public.mozambique_admin_level1.ogc_fid;


--
-- Name: mozambique_locations; Type: TABLE; Schema: public; Owner: linka_user
--

CREATE TABLE public.mozambique_locations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    province character varying(100),
    district character varying(100),
    lat numeric(10,7) NOT NULL,
    lng numeric(10,7) NOT NULL,
    type character varying(20) NOT NULL,
    "tourismInterest" boolean DEFAULT false,
    "searchPriority" integer DEFAULT 0,
    "createdAt" timestamp without time zone DEFAULT now(),
    "updatedAt" timestamp without time zone DEFAULT now(),
    geom public.geometry(Point,4326),
    needs_review boolean DEFAULT false
);


ALTER TABLE public.mozambique_locations OWNER TO linka_user;

--
-- Name: TABLE mozambique_locations; Type: COMMENT; Schema: public; Owner: linka_user
--

COMMENT ON TABLE public.mozambique_locations IS 'Localidades de Moçambique extraídas do OpenStreetMap (city/town/village)';


--
-- Name: COLUMN mozambique_locations.type; Type: COMMENT; Schema: public; Owner: linka_user
--

COMMENT ON COLUMN public.mozambique_locations.type IS 'Tipo de localidade do OSM: city, town, village';


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: linka_user
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "userId" text,
    title text NOT NULL,
    message text NOT NULL,
    type text NOT NULL,
    priority text DEFAULT 'normal'::text,
    "isRead" boolean DEFAULT false,
    "actionUrl" text,
    "relatedId" uuid,
    "createdAt" timestamp without time zone DEFAULT now(),
    "readAt" timestamp without time zone
);


ALTER TABLE public.notifications OWNER TO linka_user;

--
-- Name: osm2pgsql_properties; Type: TABLE; Schema: public; Owner: linka_user
--

CREATE TABLE public.osm2pgsql_properties (
    property text NOT NULL,
    value text NOT NULL
);


ALTER TABLE public.osm2pgsql_properties OWNER TO linka_user;

--
-- Name: partnershipApplications; Type: TABLE; Schema: public; Owner: linka_user
--

CREATE TABLE public."partnershipApplications" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "proposalId" uuid NOT NULL,
    "driverId" text NOT NULL,
    status text DEFAULT 'pending'::text,
    "applicationDate" timestamp without time zone DEFAULT now(),
    "acceptedAt" timestamp without time zone,
    "completedAt" timestamp without time zone,
    message text,
    "estimatedCompletion" timestamp without time zone,
    "createdAt" timestamp without time zone DEFAULT now(),
    "updatedAt" timestamp without time zone DEFAULT now()
);


ALTER TABLE public."partnershipApplications" OWNER TO linka_user;

--
-- Name: partnershipProposals; Type: TABLE; Schema: public; Owner: linka_user
--

CREATE TABLE public."partnershipProposals" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "hotelId" uuid NOT NULL,
    title text NOT NULL,
    description text,
    status character varying DEFAULT 'pending'::character varying NOT NULL,
    "startDate" timestamp without time zone DEFAULT now(),
    "endDate" timestamp without time zone NOT NULL,
    province character varying,
    city character varying,
    "offerFuel" boolean DEFAULT false,
    "offerMeals" boolean DEFAULT false,
    "offerFreeAccommodation" boolean DEFAULT false,
    "premiumRate" numeric DEFAULT '0'::numeric,
    "minimumDriverLevel" character varying DEFAULT 'bronze'::character varying,
    "requiredVehicleType" character varying DEFAULT 'any'::character varying,
    "currentApplicants" integer DEFAULT 0,
    "createdAt" timestamp without time zone DEFAULT now(),
    "updatedAt" timestamp without time zone DEFAULT now()
);


ALTER TABLE public."partnershipProposals" OWNER TO linka_user;

--
-- Name: payments; Type: TABLE; Schema: public; Owner: linka_user
--

CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "bookingId" uuid,
    "userId" text,
    "serviceType" text NOT NULL,
    subtotal numeric(10,2) NOT NULL,
    "platformFee" numeric(10,2) NOT NULL,
    "discountAmount" numeric(10,2) DEFAULT 0.00,
    total numeric(10,2) NOT NULL,
    "paymentMethod" text,
    "cardLast4" text,
    "cardBrand" text,
    "mpesaNumber" text,
    "paymentStatus" text DEFAULT 'pending'::text,
    "paymentReference" text,
    "paidAt" timestamp without time zone,
    "createdAt" timestamp without time zone DEFAULT now(),
    "updatedAt" timestamp without time zone DEFAULT now()
);


ALTER TABLE public.payments OWNER TO linka_user;

--
-- Name: pickupRequests; Type: TABLE; Schema: public; Owner: linka_user
--

CREATE TABLE public."pickupRequests" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "rideId" uuid,
    "passengerId" text,
    "driverId" text,
    "pickupLocation" text NOT NULL,
    "pickupLat" numeric(10,7),
    "pickupLng" numeric(10,7),
    "destinationLocation" text NOT NULL,
    "destinationLat" numeric(10,7),
    "destinationLng" numeric(10,7),
    "requestedSeats" integer DEFAULT 1,
    "proposedPrice" numeric(8,2),
    status text DEFAULT 'pending'::text,
    message text,
    "estimatedDetour" integer,
    "createdAt" timestamp without time zone DEFAULT now(),
    "updatedAt" timestamp without time zone DEFAULT now()
);


ALTER TABLE public."pickupRequests" OWNER TO linka_user;

--
-- Name: planet_osm_line; Type: TABLE; Schema: public; Owner: linka_user
--

CREATE TABLE public.planet_osm_line (
    osm_id bigint,
    access text,
    "addr:housename" text,
    "addr:housenumber" text,
    "addr:interpolation" text,
    admin_level text,
    aerialway text,
    aeroway text,
    amenity text,
    area text,
    barrier text,
    bicycle text,
    brand text,
    bridge text,
    boundary text,
    building text,
    construction text,
    covered text,
    culvert text,
    cutting text,
    denomination text,
    disused text,
    embankment text,
    foot text,
    "generator:source" text,
    harbour text,
    highway text,
    historic text,
    horse text,
    intermittent text,
    junction text,
    landuse text,
    layer text,
    leisure text,
    lock text,
    man_made text,
    military text,
    motorcar text,
    name text,
    "natural" text,
    office text,
    oneway text,
    operator text,
    place text,
    population text,
    power text,
    power_source text,
    public_transport text,
    railway text,
    ref text,
    religion text,
    route text,
    service text,
    shop text,
    sport text,
    surface text,
    toll text,
    tourism text,
    "tower:type" text,
    tracktype text,
    tunnel text,
    water text,
    waterway text,
    wetland text,
    width text,
    wood text,
    z_order integer,
    way_area real,
    tags public.hstore,
    way public.geometry(LineString,3857)
);


ALTER TABLE public.planet_osm_line OWNER TO linka_user;

--
-- Name: planet_osm_nodes; Type: TABLE; Schema: public; Owner: linka_user
--

CREATE TABLE public.planet_osm_nodes (
    id bigint NOT NULL,
    lat integer NOT NULL,
    lon integer NOT NULL,
    tags jsonb
);


ALTER TABLE public.planet_osm_nodes OWNER TO linka_user;

--
-- Name: planet_osm_point; Type: TABLE; Schema: public; Owner: linka_user
--

CREATE TABLE public.planet_osm_point (
    osm_id bigint,
    access text,
    "addr:housename" text,
    "addr:housenumber" text,
    "addr:interpolation" text,
    admin_level text,
    aerialway text,
    aeroway text,
    amenity text,
    area text,
    barrier text,
    bicycle text,
    brand text,
    bridge text,
    boundary text,
    building text,
    capital text,
    construction text,
    covered text,
    culvert text,
    cutting text,
    denomination text,
    disused text,
    ele text,
    embankment text,
    foot text,
    "generator:source" text,
    harbour text,
    highway text,
    historic text,
    horse text,
    intermittent text,
    junction text,
    landuse text,
    layer text,
    leisure text,
    lock text,
    man_made text,
    military text,
    motorcar text,
    name text,
    "natural" text,
    office text,
    oneway text,
    operator text,
    place text,
    population text,
    power text,
    power_source text,
    public_transport text,
    railway text,
    ref text,
    religion text,
    route text,
    service text,
    shop text,
    sport text,
    surface text,
    toll text,
    tourism text,
    "tower:type" text,
    tunnel text,
    water text,
    waterway text,
    wetland text,
    width text,
    wood text,
    z_order integer,
    tags public.hstore,
    way public.geometry(Point,3857)
);


ALTER TABLE public.planet_osm_point OWNER TO linka_user;

--
-- Name: planet_osm_polygon; Type: TABLE; Schema: public; Owner: linka_user
--

CREATE TABLE public.planet_osm_polygon (
    osm_id bigint,
    access text,
    "addr:housename" text,
    "addr:housenumber" text,
    "addr:interpolation" text,
    admin_level text,
    aerialway text,
    aeroway text,
    amenity text,
    area text,
    barrier text,
    bicycle text,
    brand text,
    bridge text,
    boundary text,
    building text,
    construction text,
    covered text,
    culvert text,
    cutting text,
    denomination text,
    disused text,
    embankment text,
    foot text,
    "generator:source" text,
    harbour text,
    highway text,
    historic text,
    horse text,
    intermittent text,
    junction text,
    landuse text,
    layer text,
    leisure text,
    lock text,
    man_made text,
    military text,
    motorcar text,
    name text,
    "natural" text,
    office text,
    oneway text,
    operator text,
    place text,
    population text,
    power text,
    power_source text,
    public_transport text,
    railway text,
    ref text,
    religion text,
    route text,
    service text,
    shop text,
    sport text,
    surface text,
    toll text,
    tourism text,
    "tower:type" text,
    tracktype text,
    tunnel text,
    water text,
    waterway text,
    wetland text,
    width text,
    wood text,
    z_order integer,
    way_area real,
    tags public.hstore,
    way public.geometry(Geometry,3857)
);


ALTER TABLE public.planet_osm_polygon OWNER TO linka_user;

--
-- Name: planet_osm_rels; Type: TABLE; Schema: public; Owner: linka_user
--

CREATE TABLE public.planet_osm_rels (
    id bigint NOT NULL,
    members jsonb NOT NULL,
    tags jsonb
);


ALTER TABLE public.planet_osm_rels OWNER TO linka_user;

--
-- Name: planet_osm_roads; Type: TABLE; Schema: public; Owner: linka_user
--

CREATE TABLE public.planet_osm_roads (
    osm_id bigint,
    access text,
    "addr:housename" text,
    "addr:housenumber" text,
    "addr:interpolation" text,
    admin_level text,
    aerialway text,
    aeroway text,
    amenity text,
    area text,
    barrier text,
    bicycle text,
    brand text,
    bridge text,
    boundary text,
    building text,
    construction text,
    covered text,
    culvert text,
    cutting text,
    denomination text,
    disused text,
    embankment text,
    foot text,
    "generator:source" text,
    harbour text,
    highway text,
    historic text,
    horse text,
    intermittent text,
    junction text,
    landuse text,
    layer text,
    leisure text,
    lock text,
    man_made text,
    military text,
    motorcar text,
    name text,
    "natural" text,
    office text,
    oneway text,
    operator text,
    place text,
    population text,
    power text,
    power_source text,
    public_transport text,
    railway text,
    ref text,
    religion text,
    route text,
    service text,
    shop text,
    sport text,
    surface text,
    toll text,
    tourism text,
    "tower:type" text,
    tracktype text,
    tunnel text,
    water text,
    waterway text,
    wetland text,
    width text,
    wood text,
    z_order integer,
    way_area real,
    tags public.hstore,
    way public.geometry(LineString,3857)
);


ALTER TABLE public.planet_osm_roads OWNER TO linka_user;

--
-- Name: planet_osm_ways; Type: TABLE; Schema: public; Owner: linka_user
--

CREATE TABLE public.planet_osm_ways (
    id bigint NOT NULL,
    nodes bigint[] NOT NULL,
    tags jsonb
);


ALTER TABLE public.planet_osm_ways OWNER TO linka_user;

--
-- Name: pointsHistory; Type: TABLE; Schema: public; Owner: linka_user
--

CREATE TABLE public."pointsHistory" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "userId" text,
    "loyaltyId" uuid,
    "actionType" text NOT NULL,
    "pointsAmount" integer NOT NULL,
    reason text NOT NULL,
    "relatedId" uuid,
    "createdAt" timestamp without time zone DEFAULT now()
);


ALTER TABLE public."pointsHistory" OWNER TO linka_user;

--
-- Name: priceNegotiations; Type: TABLE; Schema: public; Owner: linka_user
--

CREATE TABLE public."priceNegotiations" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "rideId" uuid,
    "passengerId" text,
    "driverId" text,
    "originalPrice" numeric(8,2) NOT NULL,
    "proposedPrice" numeric(8,2) NOT NULL,
    "counterPrice" numeric(8,2),
    status text DEFAULT 'pending'::text,
    message text,
    "expiresAt" timestamp without time zone,
    "createdAt" timestamp without time zone DEFAULT now(),
    "updatedAt" timestamp without time zone DEFAULT now()
);


ALTER TABLE public."priceNegotiations" OWNER TO linka_user;

--
-- Name: priceRegulations; Type: TABLE; Schema: public; Owner: linka_user
--

CREATE TABLE public."priceRegulations" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "rideType" text NOT NULL,
    "minPricePerKm" numeric(8,2) NOT NULL,
    "maxPricePerKm" numeric(8,2) NOT NULL,
    "baseFare" numeric(8,2) NOT NULL,
    "isActive" boolean DEFAULT true,
    "createdAt" timestamp without time zone DEFAULT now(),
    "updatedAt" timestamp without time zone DEFAULT now()
);


ALTER TABLE public."priceRegulations" OWNER TO linka_user;

--
-- Name: province_ordering; Type: TABLE; Schema: public; Owner: linka_user
--

CREATE TABLE public.province_ordering (
    province text NOT NULL,
    order_index integer NOT NULL,
    region text NOT NULL
);


ALTER TABLE public.province_ordering OWNER TO linka_user;

--
-- Name: ratings; Type: TABLE; Schema: public; Owner: linka_user
--

CREATE TABLE public.ratings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "fromUserId" text,
    "toUserId" text,
    rating integer NOT NULL,
    comment text,
    "serviceType" text NOT NULL,
    "bookingId" uuid,
    "createdAt" timestamp without time zone DEFAULT now()
);


ALTER TABLE public.ratings OWNER TO linka_user;

--
-- Name: rewardRedemptions; Type: TABLE; Schema: public; Owner: linka_user
--

CREATE TABLE public."rewardRedemptions" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "userId" text,
    "rewardId" uuid,
    "pointsUsed" integer NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    "expiresAt" timestamp without time zone,
    "usedAt" timestamp without time zone,
    "createdAt" timestamp without time zone DEFAULT now()
);


ALTER TABLE public."rewardRedemptions" OWNER TO linka_user;

--
-- Name: rides; Type: TABLE; Schema: public; Owner: linka_user
--

CREATE TABLE public.rides (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "driverId" text NOT NULL,
    "driverName" text,
    "fromAddress" character varying(255) NOT NULL,
    "toAddress" character varying(255) NOT NULL,
    "fromProvince" character varying(100),
    "toProvince" character varying(100),
    "departureDate" timestamp without time zone NOT NULL,
    "departureTime" text NOT NULL,
    "availableSeats" integer NOT NULL,
    "maxPassengers" integer DEFAULT 4,
    "pricePerSeat" numeric(10,2) NOT NULL,
    "vehicleType" character varying(50),
    "additionalInfo" text,
    status character varying(20) DEFAULT 'active'::character varying,
    type character varying(20) DEFAULT 'regular'::character varying,
    "createdAt" timestamp without time zone DEFAULT now(),
    "updatedAt" timestamp without time zone DEFAULT now(),
    "fromCity" character varying(100),
    "fromDistrict" character varying(100),
    "toCity" character varying(100),
    "toDistrict" character varying(100),
    from_geom public.geometry(Point,4326),
    to_geom public.geometry(Point,4326),
    distance_real_km numeric(10,2),
    polyline public.geography(LineString,4326),
    "fromLocality" character varying(100),
    "toLocality" character varying(100),
    "vehicleId" uuid
);


ALTER TABLE public.rides OWNER TO linka_user;

--
-- Name: roomTypes; Type: TABLE; Schema: public; Owner: linka_user
--

CREATE TABLE public."roomTypes" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "accommodationId" uuid NOT NULL,
    name text NOT NULL,
    type text DEFAULT 'standard'::text NOT NULL,
    "pricePerNight" numeric(8,2) NOT NULL,
    description text,
    "maxOccupancy" integer DEFAULT 2,
    "bedType" text,
    "bedCount" integer DEFAULT 1,
    amenities text[] DEFAULT '{}'::text[],
    images text[] DEFAULT '{}'::text[],
    "createdAt" timestamp without time zone DEFAULT now(),
    "updatedAt" timestamp without time zone DEFAULT now(),
    "isAvailable" boolean DEFAULT true,
    status text DEFAULT 'active'::text,
    "basePrice" numeric(8,2)
);


ALTER TABLE public."roomTypes" OWNER TO linka_user;

--
-- Name: sessions; Type: TABLE; Schema: public; Owner: linka_user
--

CREATE TABLE public.sessions (
    sid character varying NOT NULL,
    sess jsonb NOT NULL,
    expire timestamp without time zone NOT NULL
);


ALTER TABLE public.sessions OWNER TO linka_user;

--
-- Name: systemSettings; Type: TABLE; Schema: public; Owner: linka_user
--

CREATE TABLE public."systemSettings" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key character varying NOT NULL,
    value text NOT NULL,
    description text,
    type character varying,
    "updatedBy" uuid,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public."systemSettings" OWNER TO linka_user;

--
-- Name: users; Type: TABLE; Schema: public; Owner: linka_user
--

CREATE TABLE public.users (
    id text NOT NULL,
    email character varying,
    "firstName" character varying,
    "lastName" character varying,
    "profileImageUrl" character varying,
    "createdAt" timestamp without time zone DEFAULT now(),
    "updatedAt" timestamp without time zone DEFAULT now(),
    phone text,
    "userType" text DEFAULT 'client'::text,
    roles text[] DEFAULT '{}'::text[],
    "canOfferServices" boolean DEFAULT false,
    avatar text,
    rating numeric(3,2) DEFAULT 0.00,
    "totalReviews" integer DEFAULT 0,
    "isVerified" boolean DEFAULT false,
    "verificationStatus" text DEFAULT 'pending'::text,
    "verificationDate" timestamp without time zone,
    "verificationNotes" text,
    "identityDocumentUrl" text,
    "identityDocumentType" text,
    "profilePhotoUrl" text,
    "fullName" text,
    "documentNumber" text,
    "dateOfBirth" timestamp without time zone,
    "registrationCompleted" boolean DEFAULT false,
    "verificationBadge" text,
    "badgeEarnedDate" timestamp without time zone
);


ALTER TABLE public.users OWNER TO linka_user;

--
-- Name: TABLE users; Type: COMMENT; Schema: public; Owner: linka_user
--

COMMENT ON TABLE public.users IS 'Users table with Firebase-compatible TEXT IDs';


--
-- Name: cities id; Type: DEFAULT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public.cities ALTER COLUMN id SET DEFAULT nextval('public.cities_id_seq'::regclass);


--
-- Name: geographic_corridors id; Type: DEFAULT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public.geographic_corridors ALTER COLUMN id SET DEFAULT nextval('public.geographic_corridors_id_seq'::regclass);


--
-- Name: mozambique_admin_level0 ogc_fid; Type: DEFAULT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public.mozambique_admin_level0 ALTER COLUMN ogc_fid SET DEFAULT nextval('public.mozambique_admin_level0_ogc_fid_seq'::regclass);


--
-- Name: mozambique_admin_level1 ogc_fid; Type: DEFAULT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public.mozambique_admin_level1 ALTER COLUMN ogc_fid SET DEFAULT nextval('public.mozambique_admin_level1_ogc_fid_seq'::regclass);


--
-- Name: accommodations accommodations_pkey; Type: CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public.accommodations
    ADD CONSTRAINT accommodations_pkey PRIMARY KEY (id);


--
-- Name: adminActions adminActions_pkey; Type: CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public."adminActions"
    ADD CONSTRAINT "adminActions_pkey" PRIMARY KEY (id);


--
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);


--
-- Name: chatMessages chatMessages_pkey; Type: CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public."chatMessages"
    ADD CONSTRAINT "chatMessages_pkey" PRIMARY KEY (id);


--
-- Name: chatRooms chatRooms_pkey; Type: CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public."chatRooms"
    ADD CONSTRAINT "chatRooms_pkey" PRIMARY KEY (id);


--
-- Name: cities cities_name_key; Type: CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public.cities
    ADD CONSTRAINT cities_name_key UNIQUE (name);


--
-- Name: cities cities_pkey; Type: CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public.cities
    ADD CONSTRAINT cities_pkey PRIMARY KEY (id);


--
-- Name: driverDocuments driverDocuments_pkey; Type: CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public."driverDocuments"
    ADD CONSTRAINT "driverDocuments_pkey" PRIMARY KEY (id);


--
-- Name: driverStats driverStats_driverId_unique; Type: CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public."driverStats"
    ADD CONSTRAINT "driverStats_driverId_unique" UNIQUE ("driverId");


--
-- Name: driverStats driverStats_pkey; Type: CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public."driverStats"
    ADD CONSTRAINT "driverStats_pkey" PRIMARY KEY (id);


--
-- Name: driverVehicles driverVehicles_pkey; Type: CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public."driverVehicles"
    ADD CONSTRAINT "driverVehicles_pkey" PRIMARY KEY (id);


--
-- Name: driverVehicles driverVehicles_vehiclePlate_key; Type: CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public."driverVehicles"
    ADD CONSTRAINT "driverVehicles_vehiclePlate_key" UNIQUE ("vehiclePlate");


--
-- Name: eventManagers eventManagers_pkey; Type: CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public."eventManagers"
    ADD CONSTRAINT "eventManagers_pkey" PRIMARY KEY (id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: geographic_corridors geographic_corridors_pkey; Type: CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public.geographic_corridors
    ADD CONSTRAINT geographic_corridors_pkey PRIMARY KEY (id);


--
-- Name: hotelFinancialReports hotelFinancialReports_pkey; Type: CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public."hotelFinancialReports"
    ADD CONSTRAINT "hotelFinancialReports_pkey" PRIMARY KEY (id);


--
-- Name: hotelRooms hotelRooms_pkey; Type: CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public."hotelRooms"
    ADD CONSTRAINT "hotelRooms_pkey" PRIMARY KEY (id);


--
-- Name: loyaltyProgram loyaltyProgram_pkey; Type: CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public."loyaltyProgram"
    ADD CONSTRAINT "loyaltyProgram_pkey" PRIMARY KEY (id);


--
-- Name: loyaltyRewards loyaltyRewards_pkey; Type: CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public."loyaltyRewards"
    ADD CONSTRAINT "loyaltyRewards_pkey" PRIMARY KEY (id);


--
-- Name: mozambique_admin_level0 mozambique_admin_level0_pkey; Type: CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public.mozambique_admin_level0
    ADD CONSTRAINT mozambique_admin_level0_pkey PRIMARY KEY (ogc_fid);


--
-- Name: mozambique_admin_level1 mozambique_admin_level1_pkey; Type: CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public.mozambique_admin_level1
    ADD CONSTRAINT mozambique_admin_level1_pkey PRIMARY KEY (ogc_fid);


--
-- Name: mozambique_locations mozambique_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public.mozambique_locations
    ADD CONSTRAINT mozambique_locations_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: osm2pgsql_properties osm2pgsql_properties_pkey; Type: CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public.osm2pgsql_properties
    ADD CONSTRAINT osm2pgsql_properties_pkey PRIMARY KEY (property);


--
-- Name: partnershipApplications partnershipApplications_pkey; Type: CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public."partnershipApplications"
    ADD CONSTRAINT "partnershipApplications_pkey" PRIMARY KEY (id);


--
-- Name: partnershipProposals partnershipProposals_pkey; Type: CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public."partnershipProposals"
    ADD CONSTRAINT "partnershipProposals_pkey" PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: pickupRequests pickupRequests_pkey; Type: CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public."pickupRequests"
    ADD CONSTRAINT "pickupRequests_pkey" PRIMARY KEY (id);


--
-- Name: planet_osm_nodes planet_osm_nodes_pkey; Type: CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public.planet_osm_nodes
    ADD CONSTRAINT planet_osm_nodes_pkey PRIMARY KEY (id);


--
-- Name: planet_osm_rels planet_osm_rels_pkey; Type: CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public.planet_osm_rels
    ADD CONSTRAINT planet_osm_rels_pkey PRIMARY KEY (id);


--
-- Name: planet_osm_ways planet_osm_ways_pkey; Type: CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public.planet_osm_ways
    ADD CONSTRAINT planet_osm_ways_pkey PRIMARY KEY (id);


--
-- Name: pointsHistory pointsHistory_pkey; Type: CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public."pointsHistory"
    ADD CONSTRAINT "pointsHistory_pkey" PRIMARY KEY (id);


--
-- Name: priceNegotiations priceNegotiations_pkey; Type: CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public."priceNegotiations"
    ADD CONSTRAINT "priceNegotiations_pkey" PRIMARY KEY (id);


--
-- Name: priceRegulations priceRegulations_pkey; Type: CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public."priceRegulations"
    ADD CONSTRAINT "priceRegulations_pkey" PRIMARY KEY (id);


--
-- Name: province_ordering province_ordering_pkey; Type: CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public.province_ordering
    ADD CONSTRAINT province_ordering_pkey PRIMARY KEY (province);


--
-- Name: ratings ratings_pkey; Type: CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public.ratings
    ADD CONSTRAINT ratings_pkey PRIMARY KEY (id);


--
-- Name: rewardRedemptions rewardRedemptions_pkey; Type: CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public."rewardRedemptions"
    ADD CONSTRAINT "rewardRedemptions_pkey" PRIMARY KEY (id);


--
-- Name: rides rides_pkey; Type: CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public.rides
    ADD CONSTRAINT rides_pkey PRIMARY KEY (id);


--
-- Name: roomTypes roomTypes_pkey; Type: CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public."roomTypes"
    ADD CONSTRAINT "roomTypes_pkey" PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (sid);


--
-- Name: systemSettings systemSettings_key_unique; Type: CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public."systemSettings"
    ADD CONSTRAINT "systemSettings_key_unique" UNIQUE (key);


--
-- Name: systemSettings systemSettings_pkey; Type: CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public."systemSettings"
    ADD CONSTRAINT "systemSettings_pkey" PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_phone_unique; Type: CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_phone_unique UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: accommodations_geo_idx; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX accommodations_geo_idx ON public.accommodations USING btree (lat, lng);


--
-- Name: accommodations_location_idx; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX accommodations_location_idx ON public.accommodations USING btree (locality, province);


--
-- Name: accommodations_province_idx; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX accommodations_province_idx ON public.accommodations USING btree (province);


--
-- Name: accommodations_search_address_idx; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX accommodations_search_address_idx ON public.accommodations USING btree (address);


--
-- Name: accommodations_search_locality_idx; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX accommodations_search_locality_idx ON public.accommodations USING btree (locality);


--
-- Name: accommodations_search_name_idx; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX accommodations_search_name_idx ON public.accommodations USING btree (name);


--
-- Name: bookings_passenger_idx; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX bookings_passenger_idx ON public.bookings USING btree ("passengerId");


--
-- Name: bookings_status_idx; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX bookings_status_idx ON public.bookings USING btree (status);


--
-- Name: bookings_type_idx; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX bookings_type_idx ON public.bookings USING btree (type);


--
-- Name: chat_messages_from_user_idx; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX chat_messages_from_user_idx ON public."chatMessages" USING btree ("fromUserId");


--
-- Name: chat_messages_room_idx; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX chat_messages_room_idx ON public."chatMessages" USING btree ("chatRoomId");


--
-- Name: chat_rooms_participants_idx; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX chat_rooms_participants_idx ON public."chatRooms" USING btree ("participantOneId", "participantTwoId");


--
-- Name: events_location_idx; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX events_location_idx ON public.events USING btree (locality, province);


--
-- Name: events_status_idx; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX events_status_idx ON public.events USING btree (status);


--
-- Name: idx_accommodations_address; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX idx_accommodations_address ON public.accommodations USING gin (public.f_unaccent(address) public.gin_trgm_ops);


--
-- Name: idx_accommodations_name; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX idx_accommodations_name ON public.accommodations USING gin (public.f_unaccent(name) public.gin_trgm_ops);


--
-- Name: idx_accommodations_province; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX idx_accommodations_province ON public.accommodations USING gin (public.f_unaccent((province)::text) public.gin_trgm_ops);


--
-- Name: idx_bookings_booking_type; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX idx_bookings_booking_type ON public.bookings USING btree ("bookingType");


--
-- Name: idx_bookings_dates; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX idx_bookings_dates ON public.bookings USING btree ("checkInDate", "checkOutDate");


--
-- Name: idx_bookings_room_id; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX idx_bookings_room_id ON public.bookings USING btree ("roomId");


--
-- Name: idx_driverVehicles_active; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX "idx_driverVehicles_active" ON public."driverVehicles" USING btree ("isActive");


--
-- Name: idx_driverVehicles_driverId; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX "idx_driverVehicles_driverId" ON public."driverVehicles" USING btree ("driverId");


--
-- Name: idx_driverVehicles_type; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX "idx_driverVehicles_type" ON public."driverVehicles" USING btree ("vehicleType");


--
-- Name: idx_locations_name_gin; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX idx_locations_name_gin ON public.mozambique_locations USING gin (name public.gin_trgm_ops);


--
-- Name: idx_locations_name_province; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX idx_locations_name_province ON public.mozambique_locations USING btree (name, province);


--
-- Name: idx_locations_province; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX idx_locations_province ON public.mozambique_locations USING btree (province);


--
-- Name: idx_locations_type; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX idx_locations_type ON public.mozambique_locations USING btree (type);


--
-- Name: idx_moz_locations_province; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX idx_moz_locations_province ON public.mozambique_locations USING gin (public.f_unaccent((province)::text) public.gin_trgm_ops);


--
-- Name: idx_moz_locations_search; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX idx_moz_locations_search ON public.mozambique_locations USING gin (public.f_unaccent((name)::text) public.gin_trgm_ops);


--
-- Name: idx_mozambique_locations_geom; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX idx_mozambique_locations_geom ON public.mozambique_locations USING gist (geom);


--
-- Name: idx_rides_from_geom; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX idx_rides_from_geom ON public.rides USING gist (from_geom);


--
-- Name: idx_rides_from_geom_gist; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX idx_rides_from_geom_gist ON public.rides USING gist (from_geom);


--
-- Name: idx_rides_to_geom; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX idx_rides_to_geom ON public.rides USING gist (to_geom);


--
-- Name: idx_rides_to_geom_gist; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX idx_rides_to_geom_gist ON public.rides USING gist (to_geom);


--
-- Name: locations_geo_idx; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX locations_geo_idx ON public.mozambique_locations USING btree (lat, lng);


--
-- Name: locations_name_idx; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX locations_name_idx ON public.mozambique_locations USING btree (name);


--
-- Name: locations_province_idx; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX locations_province_idx ON public.mozambique_locations USING btree (province);


--
-- Name: locations_search_idx; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX locations_search_idx ON public.mozambique_locations USING btree (name, province, type);


--
-- Name: locations_text_search_idx; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX locations_text_search_idx ON public.mozambique_locations USING btree (name);


--
-- Name: locations_type_idx; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX locations_type_idx ON public.mozambique_locations USING btree (type);


--
-- Name: mozambique_admin_level0_wkb_geometry_geom_idx; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX mozambique_admin_level0_wkb_geometry_geom_idx ON public.mozambique_admin_level0 USING gist (wkb_geometry);


--
-- Name: mozambique_admin_level1_wkb_geometry_geom_idx; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX mozambique_admin_level1_wkb_geometry_geom_idx ON public.mozambique_admin_level1 USING gist (wkb_geometry);


--
-- Name: notifications_is_read_idx; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX notifications_is_read_idx ON public.notifications USING btree ("isRead");


--
-- Name: notifications_user_idx; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX notifications_user_idx ON public.notifications USING btree ("userId");


--
-- Name: partnership_applications_driver_idx; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX partnership_applications_driver_idx ON public."partnershipApplications" USING btree ("driverId");


--
-- Name: partnership_applications_status_idx; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX partnership_applications_status_idx ON public."partnershipApplications" USING btree (status);


--
-- Name: partnership_proposals_hotel_idx; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX partnership_proposals_hotel_idx ON public."partnershipProposals" USING btree ("hotelId");


--
-- Name: partnership_proposals_status_idx; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX partnership_proposals_status_idx ON public."partnershipProposals" USING btree (status);


--
-- Name: planet_osm_line_osm_id_idx; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX planet_osm_line_osm_id_idx ON public.planet_osm_line USING btree (osm_id);


--
-- Name: planet_osm_line_way_idx; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX planet_osm_line_way_idx ON public.planet_osm_line USING gist (way);


--
-- Name: planet_osm_point_osm_id_idx; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX planet_osm_point_osm_id_idx ON public.planet_osm_point USING btree (osm_id);


--
-- Name: planet_osm_point_way_idx; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX planet_osm_point_way_idx ON public.planet_osm_point USING gist (way);


--
-- Name: planet_osm_polygon_osm_id_idx; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX planet_osm_polygon_osm_id_idx ON public.planet_osm_polygon USING btree (osm_id);


--
-- Name: planet_osm_polygon_way_idx; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX planet_osm_polygon_way_idx ON public.planet_osm_polygon USING gist (way);


--
-- Name: planet_osm_rels_node_members_idx; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX planet_osm_rels_node_members_idx ON public.planet_osm_rels USING gin (public.planet_osm_member_ids(members, 'N'::character(1))) WITH (fastupdate=off);


--
-- Name: planet_osm_rels_way_members_idx; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX planet_osm_rels_way_members_idx ON public.planet_osm_rels USING gin (public.planet_osm_member_ids(members, 'W'::character(1))) WITH (fastupdate=off);


--
-- Name: planet_osm_roads_osm_id_idx; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX planet_osm_roads_osm_id_idx ON public.planet_osm_roads USING btree (osm_id);


--
-- Name: planet_osm_roads_way_idx; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX planet_osm_roads_way_idx ON public.planet_osm_roads USING gist (way);


--
-- Name: planet_osm_ways_nodes_bucket_idx; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX planet_osm_ways_nodes_bucket_idx ON public.planet_osm_ways USING gin (public.planet_osm_index_bucket(nodes)) WITH (fastupdate=off);


--
-- Name: ratings_service_type_idx; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX ratings_service_type_idx ON public.ratings USING btree ("serviceType");


--
-- Name: ratings_to_user_idx; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX ratings_to_user_idx ON public.ratings USING btree ("toUserId");


--
-- Name: rides_status_idx; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX rides_status_idx ON public.rides USING btree (status);


--
-- Name: sessions_expire_idx; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX sessions_expire_idx ON public.sessions USING btree (expire);


--
-- Name: planet_osm_line planet_osm_line_osm2pgsql_valid; Type: TRIGGER; Schema: public; Owner: linka_user
--

CREATE TRIGGER planet_osm_line_osm2pgsql_valid BEFORE INSERT OR UPDATE ON public.planet_osm_line FOR EACH ROW EXECUTE FUNCTION public.planet_osm_line_osm2pgsql_valid();


--
-- Name: planet_osm_point planet_osm_point_osm2pgsql_valid; Type: TRIGGER; Schema: public; Owner: linka_user
--

CREATE TRIGGER planet_osm_point_osm2pgsql_valid BEFORE INSERT OR UPDATE ON public.planet_osm_point FOR EACH ROW EXECUTE FUNCTION public.planet_osm_point_osm2pgsql_valid();


--
-- Name: planet_osm_polygon planet_osm_polygon_osm2pgsql_valid; Type: TRIGGER; Schema: public; Owner: linka_user
--

CREATE TRIGGER planet_osm_polygon_osm2pgsql_valid BEFORE INSERT OR UPDATE ON public.planet_osm_polygon FOR EACH ROW EXECUTE FUNCTION public.planet_osm_polygon_osm2pgsql_valid();


--
-- Name: planet_osm_roads planet_osm_roads_osm2pgsql_valid; Type: TRIGGER; Schema: public; Owner: linka_user
--

CREATE TRIGGER planet_osm_roads_osm2pgsql_valid BEFORE INSERT OR UPDATE ON public.planet_osm_roads FOR EACH ROW EXECUTE FUNCTION public.planet_osm_roads_osm2pgsql_valid();


--
-- Name: rides trigger_auto_fill_provinces; Type: TRIGGER; Schema: public; Owner: linka_user
--

CREATE TRIGGER trigger_auto_fill_provinces BEFORE INSERT OR UPDATE ON public.rides FOR EACH ROW EXECUTE FUNCTION public.auto_fill_provinces();


--
-- Name: accommodations accommodations_hostId_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public.accommodations
    ADD CONSTRAINT "accommodations_hostId_users_id_fk" FOREIGN KEY ("hostId") REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: adminActions adminActions_adminId_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public."adminActions"
    ADD CONSTRAINT "adminActions_adminId_users_id_fk" FOREIGN KEY ("adminId") REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: adminActions adminActions_targetUserId_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public."adminActions"
    ADD CONSTRAINT "adminActions_targetUserId_users_id_fk" FOREIGN KEY ("targetUserId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: bookings bookings_accommodationId_accommodations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT "bookings_accommodationId_accommodations_id_fk" FOREIGN KEY ("accommodationId") REFERENCES public.accommodations(id);


--
-- Name: bookings bookings_hotelRoomId_hotelRooms_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT "bookings_hotelRoomId_hotelRooms_id_fk" FOREIGN KEY ("hotelRoomId") REFERENCES public."hotelRooms"(id);


--
-- Name: bookings bookings_passengerId_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT "bookings_passengerId_users_id_fk" FOREIGN KEY ("passengerId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: bookings bookings_rideId_rides_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT "bookings_rideId_rides_id_fk" FOREIGN KEY ("rideId") REFERENCES public.rides(id);


--
-- Name: bookings bookings_roomId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT "bookings_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES public."hotelRooms"(id);


--
-- Name: chatMessages chatMessages_chatRoomId_chatRooms_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public."chatMessages"
    ADD CONSTRAINT "chatMessages_chatRoomId_chatRooms_id_fk" FOREIGN KEY ("chatRoomId") REFERENCES public."chatRooms"(id);


--
-- Name: chatMessages chatMessages_fromUserId_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public."chatMessages"
    ADD CONSTRAINT "chatMessages_fromUserId_users_id_fk" FOREIGN KEY ("fromUserId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: chatMessages chatMessages_toUserId_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public."chatMessages"
    ADD CONSTRAINT "chatMessages_toUserId_users_id_fk" FOREIGN KEY ("toUserId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: chatRooms chatRooms_participantOneId_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public."chatRooms"
    ADD CONSTRAINT "chatRooms_participantOneId_users_id_fk" FOREIGN KEY ("participantOneId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: chatRooms chatRooms_participantTwoId_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public."chatRooms"
    ADD CONSTRAINT "chatRooms_participantTwoId_users_id_fk" FOREIGN KEY ("participantTwoId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: driverDocuments driverDocuments_driverId_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public."driverDocuments"
    ADD CONSTRAINT "driverDocuments_driverId_users_id_fk" FOREIGN KEY ("driverId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: driverStats driverStats_driverId_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public."driverStats"
    ADD CONSTRAINT "driverStats_driverId_users_id_fk" FOREIGN KEY ("driverId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: driverVehicles driverVehicles_driverId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public."driverVehicles"
    ADD CONSTRAINT "driverVehicles_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: eventManagers eventManagers_userId_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public."eventManagers"
    ADD CONSTRAINT "eventManagers_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: events events_managerId_eventManagers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT "events_managerId_eventManagers_id_fk" FOREIGN KEY ("managerId") REFERENCES public."eventManagers"(id);


--
-- Name: events events_organizerId_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT "events_organizerId_users_id_fk" FOREIGN KEY ("organizerId") REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: hotelFinancialReports hotelFinancialReports_accommodationId_accommodations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public."hotelFinancialReports"
    ADD CONSTRAINT "hotelFinancialReports_accommodationId_accommodations_id_fk" FOREIGN KEY ("accommodationId") REFERENCES public.accommodations(id);


--
-- Name: hotelRooms hotelRooms_accommodationId_accommodations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public."hotelRooms"
    ADD CONSTRAINT "hotelRooms_accommodationId_accommodations_id_fk" FOREIGN KEY ("accommodationId") REFERENCES public.accommodations(id);


--
-- Name: loyaltyProgram loyaltyProgram_userId_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public."loyaltyProgram"
    ADD CONSTRAINT "loyaltyProgram_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_userId_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "notifications_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: partnershipApplications partnershipApplications_driverId_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public."partnershipApplications"
    ADD CONSTRAINT "partnershipApplications_driverId_users_id_fk" FOREIGN KEY ("driverId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: partnershipApplications partnershipApplications_proposalId_partnershipProposals_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public."partnershipApplications"
    ADD CONSTRAINT "partnershipApplications_proposalId_partnershipProposals_id_fk" FOREIGN KEY ("proposalId") REFERENCES public."partnershipProposals"(id);


--
-- Name: partnershipProposals partnershipProposals_hotelId_accommodations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public."partnershipProposals"
    ADD CONSTRAINT "partnershipProposals_hotelId_accommodations_id_fk" FOREIGN KEY ("hotelId") REFERENCES public.accommodations(id);


--
-- Name: payments payments_bookingId_bookings_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT "payments_bookingId_bookings_id_fk" FOREIGN KEY ("bookingId") REFERENCES public.bookings(id);


--
-- Name: payments payments_userId_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT "payments_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: pickupRequests pickupRequests_driverId_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public."pickupRequests"
    ADD CONSTRAINT "pickupRequests_driverId_users_id_fk" FOREIGN KEY ("driverId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: pickupRequests pickupRequests_passengerId_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public."pickupRequests"
    ADD CONSTRAINT "pickupRequests_passengerId_users_id_fk" FOREIGN KEY ("passengerId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: pickupRequests pickupRequests_rideId_rides_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public."pickupRequests"
    ADD CONSTRAINT "pickupRequests_rideId_rides_id_fk" FOREIGN KEY ("rideId") REFERENCES public.rides(id);


--
-- Name: pointsHistory pointsHistory_loyaltyId_loyaltyProgram_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public."pointsHistory"
    ADD CONSTRAINT "pointsHistory_loyaltyId_loyaltyProgram_id_fk" FOREIGN KEY ("loyaltyId") REFERENCES public."loyaltyProgram"(id);


--
-- Name: pointsHistory pointsHistory_userId_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public."pointsHistory"
    ADD CONSTRAINT "pointsHistory_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: priceNegotiations priceNegotiations_driverId_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public."priceNegotiations"
    ADD CONSTRAINT "priceNegotiations_driverId_users_id_fk" FOREIGN KEY ("driverId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: priceNegotiations priceNegotiations_passengerId_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public."priceNegotiations"
    ADD CONSTRAINT "priceNegotiations_passengerId_users_id_fk" FOREIGN KEY ("passengerId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: priceNegotiations priceNegotiations_rideId_rides_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public."priceNegotiations"
    ADD CONSTRAINT "priceNegotiations_rideId_rides_id_fk" FOREIGN KEY ("rideId") REFERENCES public.rides(id);


--
-- Name: ratings ratings_fromUserId_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public.ratings
    ADD CONSTRAINT "ratings_fromUserId_users_id_fk" FOREIGN KEY ("fromUserId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: ratings ratings_toUserId_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public.ratings
    ADD CONSTRAINT "ratings_toUserId_users_id_fk" FOREIGN KEY ("toUserId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: rewardRedemptions rewardRedemptions_rewardId_loyaltyRewards_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public."rewardRedemptions"
    ADD CONSTRAINT "rewardRedemptions_rewardId_loyaltyRewards_id_fk" FOREIGN KEY ("rewardId") REFERENCES public."loyaltyRewards"(id);


--
-- Name: rewardRedemptions rewardRedemptions_userId_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public."rewardRedemptions"
    ADD CONSTRAINT "rewardRedemptions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: rides rides_driverId_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public.rides
    ADD CONSTRAINT "rides_driverId_users_id_fk" FOREIGN KEY ("driverId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: rides rides_vehicleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public.rides
    ADD CONSTRAINT "rides_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES public."driverVehicles"(id);


--
-- Name: roomTypes roomTypes_accommodationId_accommodations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public."roomTypes"
    ADD CONSTRAINT "roomTypes_accommodationId_accommodations_id_fk" FOREIGN KEY ("accommodationId") REFERENCES public.accommodations(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict uVTBszx1qzMgd7DrO0KktfmyHR4p75JRlF7Rixil5hlWglI8IXsapGySMlehozg

