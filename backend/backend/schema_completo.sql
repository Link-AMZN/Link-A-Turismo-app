--
-- PostgreSQL database dump
--

\restrict J5LKqygaJeUqlmflmQQNpOjoJ0Is62oDlnMwDBcserHJVRHSH6XPailJmq8Cdef

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
-- Name: cube; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS cube WITH SCHEMA public;


--
-- Name: EXTENSION cube; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION cube IS 'data type for multidimensional cubes';


--
-- Name: earthdistance; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS earthdistance WITH SCHEMA public;


--
-- Name: EXTENSION earthdistance; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION earthdistance IS 'calculate great-circle distances on the surface of the Earth';


--
-- Name: hstore; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS hstore WITH SCHEMA public;


--
-- Name: EXTENSION hstore; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION hstore IS 'data type for storing sets of (key, value) pairs';


--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: postgis; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;


--
-- Name: EXTENSION postgis; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION postgis IS 'PostGIS geometry and geography spatial types and functions';


--
-- Name: unaccent; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public;


--
-- Name: EXTENSION unaccent; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION unaccent IS 'text search dictionary that removes accents';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: partnership_level; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.partnership_level AS ENUM (
    'bronze',
    'silver',
    'gold',
    'platinum'
);


--
-- Name: service_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.service_type AS ENUM (
    'ride',
    'accommodation',
    'event',
    'hotel'
);


--
-- Name: status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.status AS ENUM (
    'pending',
    'active',
    'confirmed',
    'cancelled',
    'completed',
    'expired',
    'available',
    'checked_in',
    'checked_out',
    'no_show'
);


--
-- Name: user_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_type AS ENUM (
    'client',
    'driver',
    'host',
    'admin'
);


--
-- Name: vehicle_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.vehicle_category AS ENUM (
    'economy',
    'comfort',
    'luxury',
    'family',
    'premium',
    'van',
    'suv'
);


--
-- Name: auto_fill_provinces(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: bulk_update_availability(uuid, uuid, date, date, numeric, integer, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.bulk_update_availability(p_hotel_id uuid, p_room_type_id uuid, p_start_date date, p_end_date date, p_price numeric DEFAULT NULL::numeric, p_available_units integer DEFAULT NULL::integer, p_stop_sell boolean DEFAULT false) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_count integer := 0;
    v_date date;
    v_base_price numeric;
    v_total_units integer;
BEGIN
    SELECT base_price, total_units 
    INTO v_base_price, v_total_units
    FROM room_types 
    WHERE id = p_room_type_id AND hotel_id = p_hotel_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Room type not found');
    END IF;
    
    FOR v_date IN 
        SELECT generate_series(p_start_date, p_end_date, '1 day')::date
    LOOP
        INSERT INTO room_availability (
            hotel_id, room_type_id, date, price, available_units, stop_sell
        ) VALUES (
            p_hotel_id, p_room_type_id, v_date,
            COALESCE(p_price, v_base_price),
            COALESCE(p_available_units, v_total_units),
            p_stop_sell
        )
        ON CONFLICT (room_type_id, date) 
        DO UPDATE SET
            price = COALESCE(p_price, room_availability.price),
            available_units = COALESCE(p_available_units, room_availability.available_units),
            stop_sell = p_stop_sell,
            updated_at = NOW();
        
        v_count := v_count + 1;
    END LOOP;
    
    RETURN jsonb_build_object(
        'success', true,
        'updated_count', v_count,
        'message', v_count || ' days updated successfully'
    );
END;
$$;


--
-- Name: calculate_daily_price(uuid, uuid, date, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_daily_price(p_hotel_id uuid, p_room_type_id uuid, p_date date, p_promo_code text DEFAULT NULL::text) RETURNS TABLE(base_price numeric, season_multiplier numeric, promotion_discount numeric, final_price numeric, min_nights integer, is_available boolean)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_base_price numeric;
    v_season_multiplier numeric := 1.0;
    v_promotion_discount numeric := 0.0;
    v_availability_price numeric;
    v_min_nights integer;
    v_is_available boolean;
BEGIN
    -- Buscar informações do room_type
    SELECT 
        COALESCE(
            CASE 
                WHEN EXTRACT(MONTH FROM p_date) IN (12, 1, 2) THEN rt.base_price_high
                WHEN EXTRACT(MONTH FROM p_date) IN (6, 7, 8) THEN rt.base_price_low
                ELSE rt.base_price
            END,
            rt.base_price
        ),
        COALESCE(rt.min_nights_default, 1)
    INTO 
        v_base_price,
        v_min_nights
    FROM room_types rt
    WHERE rt.id = p_room_type_id 
      AND rt.hotel_id = p_hotel_id
      AND rt.is_active = true;
    
    -- Se não encontrou room_type
    IF v_base_price IS NULL THEN
        RETURN QUERY SELECT 
            0::numeric, 1.0::numeric, 0.0::numeric, 0::numeric, 1::integer, false::boolean;
        RETURN;
    END IF;
    
    -- Buscar multiplicador de temporada (se houver)
    SELECT multiplier
    INTO v_season_multiplier
    FROM hotel_seasons 
    WHERE hotel_id = p_hotel_id
      AND p_date BETWEEN start_date AND end_date
      AND is_active = true
    ORDER BY multiplier DESC
    LIMIT 1;
    
    IF v_season_multiplier IS NULL THEN
        v_season_multiplier := 1.0;
    END IF;
    
    -- Buscar promoção (se houver)
    IF p_promo_code IS NOT NULL THEN
        SELECT 
            COALESCE(discount_percent, 0)
        INTO v_promotion_discount
        FROM hotel_promotions 
        WHERE hotel_id = p_hotel_id
          AND (room_type_id = p_room_type_id OR room_type_id IS NULL)
          AND promo_code = p_promo_code
          AND p_date BETWEEN start_date AND end_date
          AND is_active = true
          AND (max_uses IS NULL OR current_uses < max_uses)
        LIMIT 1;
    END IF;
    
    -- Buscar disponibilidade atual
    SELECT 
        ra.price,
        COALESCE(ra.min_nights, v_min_nights),
        (ra.remaining_units > 0 AND NOT ra.stop_sell)
    INTO 
        v_availability_price,
        v_min_nights,
        v_is_available
    FROM room_availability ra
    WHERE ra.room_type_id = p_room_type_id 
      AND ra.hotel_id = p_hotel_id
      AND ra.date = p_date;
    
    -- Se não encontrou registro de disponibilidade
    IF NOT FOUND THEN
        v_is_available := false;
        v_availability_price := v_base_price * v_season_multiplier;
    END IF;
    
    -- Aplicar desconto de promoção
    IF v_promotion_discount > 0 THEN
        v_availability_price := v_availability_price * (1 - v_promotion_discount/100);
    END IF;
    
    RETURN QUERY SELECT 
        v_base_price,
        v_season_multiplier,
        v_promotion_discount,
        v_availability_price,
        v_min_nights,
        v_is_available;
END;
$$;


--
-- Name: cancel_booking_professional(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cancel_booking_professional(p_booking_id uuid) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_booking_record record;
BEGIN
    -- Buscar dados da reserva
    SELECT hotel_id, room_type_id, check_in, check_out, units, status
    INTO v_booking_record
    FROM bookings 
    WHERE id = p_booking_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Booking not found'
        );
    END IF;
    
    IF v_booking_record.status = 'cancelled' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Booking already cancelled'
        );
    END IF;
    
    -- TRANSACTION para restaurar disponibilidade
    BEGIN
        -- 🔒 LOCK na disponibilidade
        PERFORM 1
        FROM room_availability 
        WHERE room_type_id = v_booking_record.room_type_id 
          AND date >= v_booking_record.check_in 
          AND date < v_booking_record.check_out
        FOR UPDATE;
        
        -- 🔄 RESTAURAR DISPONIBILIDADE
        UPDATE room_availability 
        SET available_units = available_units + v_booking_record.units,
            updated_at = NOW()
        WHERE room_type_id = v_booking_record.room_type_id 
          AND date >= v_booking_record.check_in 
          AND date < v_booking_record.check_out;
        
        -- 📝 ATUALIZAR STATUS DA RESERVA
        UPDATE bookings 
        SET status = 'cancelled',
            updated_at = NOW()
        WHERE id = p_booking_id;
        
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Booking cancelled and availability restored'
        );
        
    EXCEPTION
        WHEN OTHERS THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', SQLERRM
            );
    END;
END $$;


--
-- Name: cancel_hotel_booking(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cancel_hotel_booking(p_booking_id uuid, p_reason text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Verificar se a reserva existe e é do tipo hotel
    IF NOT EXISTS (SELECT 1 FROM bookings WHERE id = p_booking_id AND "type" = 'hotel') THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Reserva de hotel não encontrada'
        );
    END IF;
    
    -- Atualizar status para cancelled
    UPDATE bookings 
    SET status = 'cancelled',
        "specialRequests" = COALESCE("specialRequests", '') || ' | Cancelado: ' || COALESCE(p_reason, 'Sem motivo')
    WHERE id = p_booking_id;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Reserva cancelada com sucesso'
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;


--
-- Name: check_hotel_availability_detailed(uuid, uuid, date, date, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_hotel_availability_detailed(p_hotel_id uuid, p_room_type_id uuid, p_check_in date, p_check_out date, p_units integer DEFAULT 1, p_promo_code text DEFAULT NULL::text) RETURNS TABLE(is_available boolean, min_nights_required integer, total_price numeric, nightly_prices jsonb, available_units integer, message text)
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_date_record record;
  v_price_record record;
  v_min_available_units integer;
  v_total_price numeric := 0;
  v_nights integer;
  v_daily_prices jsonb := '[]'::jsonb;
  v_min_nights_required integer := 1;
  v_room_type_record record;
  v_booked_units integer;
  v_actual_available_units integer;
BEGIN
  -- Validação básica
  IF p_check_out <= p_check_in THEN
    is_available := false;
    min_nights_required := 0;
    total_price := 0;
    nightly_prices := '[]'::jsonb;
    available_units := 0;
    message := 'Check-out date must be after check-in date';
    RETURN NEXT;
    RETURN;
  END IF;
  
  v_nights := p_check_out - p_check_in;
  
  -- Buscar informações do room_type
  SELECT 
    min_nights_default,
    base_occupancy,
    max_occupancy,
    total_units
  INTO v_room_type_record
  FROM room_types 
  WHERE id = p_room_type_id 
    AND hotel_id = p_hotel_id 
    AND is_active = true;
  
  IF NOT FOUND THEN
    is_available := false;
    min_nights_required := 0;
    total_price := 0;
    nightly_prices := '[]'::jsonb;
    available_units := 0;
    message := 'Room type not found or inactive';
    RETURN NEXT;
    RETURN;
  END IF;
  
  v_min_nights_required := COALESCE(v_room_type_record.min_nights_default, 1);
  
  -- Verificar mínimo de noites
  IF v_nights < v_min_nights_required THEN
    is_available := false;
    min_nights_required := v_min_nights_required;
    total_price := 0;
    nightly_prices := '[]'::jsonb;
    available_units := 0;
    message := 'Minimum stay requirement: ' || v_min_nights_required || ' nights';
    RETURN NEXT;
    RETURN;
  END IF;
  
  -- Verificar disponibilidade para cada dia
  FOR v_date_record IN 
    SELECT generate_series(p_check_in, p_check_out - INTERVAL '1 day', INTERVAL '1 day')::date as booking_date
  LOOP
    SELECT * INTO v_price_record
    FROM calculate_daily_price(p_hotel_id, p_room_type_id, v_date_record.booking_date, p_promo_code);
    
    IF NOT v_price_record.is_available THEN
      is_available := false;
      min_nights_required := v_min_nights_required;
      total_price := 0;
      nightly_prices := '[]'::jsonb;
      available_units := 0;
      message := 'Room not available for date: ' || v_date_record.booking_date;
      RETURN NEXT;
      RETURN;
    END IF;
    
    -- Atualizar mínimo de noites se necessário
    IF v_date_record.booking_date = p_check_in AND v_price_record.min_nights > v_min_nights_required THEN
      v_min_nights_required := v_price_record.min_nights;
    END IF;
    
    v_total_price := v_total_price + v_price_record.final_price;
    
    v_daily_prices := v_daily_prices || jsonb_build_object(
      'date', v_date_record.booking_date,
      'base_price', v_price_record.base_price,
      'season_multiplier', v_price_record.season_multiplier,
      'promotion_discount', v_price_record.promotion_discount,
      'final_price', v_price_record.final_price,
      'min_nights', v_price_record.min_nights,
      'is_available', v_price_record.is_available
    );
  END LOOP;
  
  -- Verificar mínimo de noites final
  IF v_nights < v_min_nights_required THEN
    is_available := false;
    min_nights_required := v_min_nights_required;
    total_price := 0;
    nightly_prices := v_daily_prices;
    available_units := 0;
    message := 'Minimum stay requirement for selected dates: ' || v_min_nights_required || ' nights';
    RETURN NEXT;
    RETURN;
  END IF;
  
  -- VERIFICAÇÃO CORRIGIDA: Considerar bookings ativos
  -- Primeiro, verificar unidades disponíveis na room_availability
  SELECT MIN(ra.remaining_units) INTO v_min_available_units
  FROM room_availability ra
  WHERE ra.room_type_id = p_room_type_id 
    AND ra.date >= p_check_in 
    AND ra.date < p_check_out
    AND ra.stop_sell = false;
  
  -- Se não encontrou disponibilidade
  IF v_min_available_units IS NULL THEN
    is_available := false;
    min_nights_required := v_min_nights_required;
    total_price := v_total_price * p_units;
    nightly_prices := v_daily_prices;
    available_units := 0;
    message := 'No availability found for selected dates';
    RETURN NEXT;
    RETURN;
  END IF;
  
  -- Verificar se há bookings ativos para essas datas
  SELECT COALESCE(SUM(hb.units), 0) INTO v_booked_units
  FROM hotel_bookings hb
  WHERE hb.room_type_id = p_room_type_id
    AND hb.check_in < p_check_out
    AND hb.check_out > p_check_in
    AND hb.status NOT IN ('cancelled');
  
  -- Calcular unidades realmente disponíveis
  v_actual_available_units := v_min_available_units - v_booked_units;
  
  -- Verificar se há unidades suficientes
  IF v_actual_available_units < p_units THEN
    is_available := false;
    min_nights_required := v_min_nights_required;
    total_price := v_total_price * p_units;
    nightly_prices := v_daily_prices;
    available_units := GREATEST(v_actual_available_units, 0);
    message := 'Not enough units available. Available: ' || GREATEST(v_actual_available_units, 0) || ', Requested: ' || p_units;
    RETURN NEXT;
    RETURN;
  END IF;
  
  -- Tudo OK!
  v_total_price := v_total_price * p_units;
  
  is_available := true;
  min_nights_required := v_min_nights_required;
  total_price := v_total_price;
  nightly_prices := v_daily_prices;
  available_units := v_actual_available_units;
  message := 'Available for booking';
  RETURN NEXT;
  RETURN;
END;
$$;


--
-- Name: check_in_hotel_booking(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_in_hotel_booking(p_booking_id uuid) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE bookings 
    SET status = 'checked_in'
    WHERE id = p_booking_id AND "type" = 'hotel';
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Reserva de hotel não encontrada'
        );
    END IF;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Check-in realizado com sucesso'
    );
END;
$$;


--
-- Name: check_out_hotel_booking(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_out_hotel_booking(p_booking_id uuid) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE bookings 
    SET status = 'checked_out'
    WHERE id = p_booking_id AND "type" = 'hotel';
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Reserva de hotel não encontrada'
        );
    END IF;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Check-out realizado com sucesso'
    );
END;
$$;


--
-- Name: check_real_time_availability(uuid, date, date, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_real_time_availability(p_room_type_id uuid, p_check_in date, p_check_out date, p_units integer DEFAULT 1) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_nights INTEGER;
    v_total_price DECIMAL(10,2);
    v_price_per_night DECIMAL(10,2);
    v_min_available INTEGER;
    v_available BOOLEAN;
BEGIN
    IF p_check_out <= p_check_in THEN
        RETURN jsonb_build_object(
            'available', false,
            'error', 'Check-out must be after check-in'
        );
    END IF;
    
    v_nights := (p_check_out - p_check_in);
    
    SELECT MIN(remaining_units) as min_available,  -- CORREÇÃO: remaining_units
           AVG(price::DECIMAL) as avg_price
    INTO v_min_available, v_price_per_night
    FROM room_availability 
    WHERE room_type_id = p_room_type_id 
    AND date BETWEEN p_check_in AND (p_check_out - INTERVAL '1 day')
    AND stop_sell = false;
    
    v_available := (COALESCE(v_min_available, 0) >= p_units);
    v_total_price := COALESCE(v_price_per_night, 0) * v_nights * p_units;
    
    RETURN jsonb_build_object(
        'available', v_available,
        'nights', v_nights,
        'price_per_night', ROUND(COALESCE(v_price_per_night, 0), 2),
        'total_price', ROUND(v_total_price, 2),
        'min_available_units', COALESCE(v_min_available, 0),
        'requested_units', p_units
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'available', false,
        'error', SQLERRM
    );
END;
$$;


--
-- Name: create_hotel_booking(uuid, uuid, date, date, integer, integer, integer, text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_hotel_booking(p_hotel_id uuid, p_room_type_id uuid, p_check_in date, p_check_out date, p_units integer DEFAULT 1, p_adults integer DEFAULT 2, p_children integer DEFAULT 0, p_guest_name text DEFAULT 'Guest'::text, p_guest_email text DEFAULT 'guest@example.com'::text, p_guest_phone text DEFAULT NULL::text, p_special_requests text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_booking_id uuid;
    v_nights integer;
    v_total_price numeric;
    v_base_price numeric;
    v_extra_charges numeric;
    v_min_available_units integer;
    v_room_type_record record;
    v_date_record record;
BEGIN
    -- Validar parâmetros
    IF p_check_out <= p_check_in THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Check-out date must be after check-in date'
        );
    END IF;
    
    v_nights := p_check_out - p_check_in;
    
    -- Buscar informações do room_type
    SELECT base_price, total_units, max_occupancy, extra_adult_price, extra_child_price
    INTO v_room_type_record
    FROM room_types 
    WHERE id = p_room_type_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Room type not found'
        );
    END IF;
    
    -- Verificar capacidade máxima
    IF (p_adults + p_children) > v_room_type_record.max_occupancy THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Number of guests exceeds maximum occupancy'
        );
    END IF;
    
    -- TRANSACTION COM LOCK
    BEGIN
        -- 🔒 LOCK nas linhas de disponibilidade
        PERFORM 1
        FROM room_availability 
        WHERE room_type_id = p_room_type_id 
          AND date >= p_check_in 
          AND date < p_check_out
        FOR UPDATE;
        
        -- Verificar disponibilidade
        SELECT MIN(available_units) INTO v_min_available_units
        FROM room_availability 
        WHERE room_type_id = p_room_type_id 
          AND date >= p_check_in 
          AND date < p_check_out
          AND stop_sell = false;
        
        IF v_min_available_units IS NULL THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'No availability found for selected dates'
            );
        END IF;
        
        IF v_min_available_units < p_units THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Not enough units available',
                'available_units', v_min_available_units,
                'requested_units', p_units
            );
        END IF;
        
        -- Calcular preços
        v_base_price := 0;
        v_extra_charges := 0;
        
        -- Preço base por noite
        FOR v_date_record IN 
            SELECT date, price 
            FROM room_availability 
            WHERE room_type_id = p_room_type_id 
              AND date >= p_check_in 
              AND date < p_check_out
        LOOP
            v_base_price := v_base_price + v_date_record.price;
        END LOOP;
        
        v_base_price := v_base_price * p_units;
        v_total_price := v_base_price;
        
        -- Extras por hóspedes adicionais
        IF p_adults > 2 THEN -- base_occupancy padrão é 2
            v_extra_charges := v_extra_charges + (
                (p_adults - 2) * 
                COALESCE(v_room_type_record.extra_adult_price, 0) * 
                v_nights * 
                p_units
            );
        END IF;
        
        IF p_children > 0 THEN
            v_extra_charges := v_extra_charges + (
                p_children * 
                COALESCE(v_room_type_record.extra_child_price, 0) * 
                v_nights * 
                p_units
            );
        END IF;
        
        v_total_price := v_base_price + v_extra_charges;
        
        -- 🔄 DECREMENTAR DISPONIBILIDADE
        UPDATE room_availability 
        SET available_units = available_units - p_units,
            updated_at = NOW()
        WHERE room_type_id = p_room_type_id 
          AND date >= p_check_in 
          AND date < p_check_out;
        
        -- 📝 CRIAR RESERVA NA NOVA TABELA
        INSERT INTO hotel_bookings (
            hotel_id,
            room_type_id,
            check_in,
            check_out,
            nights,
            units,
            adults,
            children,
            base_price,
            extra_charges,
            total_price,
            guest_name,
            guest_email,
            guest_phone,
            special_requests,
            status,
            payment_status
        ) VALUES (
            p_hotel_id,
            p_room_type_id,
            p_check_in,
            p_check_out,
            v_nights,
            p_units,
            p_adults,
            p_children,
            v_base_price,
            v_extra_charges,
            v_total_price,
            p_guest_name,
            p_guest_email,
            p_guest_phone,
            p_special_requests,
            'confirmed',
            'pending'
        ) RETURNING id INTO v_booking_id;
        
        -- ✅ COMMIT da transação
        RETURN jsonb_build_object(
            'success', true,
            'booking_id', v_booking_id,
            'base_price', v_base_price,
            'extra_charges', v_extra_charges,
            'total_price', v_total_price,
            'nights', v_nights,
            'message', 'Hotel booking created successfully'
        );
        
    EXCEPTION
        WHEN OTHERS THEN
            -- ❌ ROLLBACK automático
            RETURN jsonb_build_object(
                'success', false,
                'error', SQLERRM
            );
    END;
END $$;


--
-- Name: create_hotel_booking(uuid, uuid, date, date, text, text, integer, integer, integer, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_hotel_booking(p_hotel_id uuid, p_room_type_id uuid, p_check_in date, p_check_out date, p_guest_name text, p_guest_email text, p_units integer DEFAULT 1, p_adults integer DEFAULT 2, p_children integer DEFAULT 0, p_guest_phone text DEFAULT NULL::text, p_special_requests text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_total_nights INTEGER;
    v_base_price DECIMAL(10,2);
    v_total_price DECIMAL(10,2);
    v_booking_id UUID;
    v_room_type RECORD;
    v_accommodation RECORD;
BEGIN
    -- Calcular noites
    v_total_nights := p_check_out - p_check_in;
    
    IF v_total_nights <= 0 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Datas de check-in/check-out inválidas'
        );
    END IF;
    
    -- Buscar informações do accommodation
    SELECT * INTO v_accommodation
    FROM accommodations 
    WHERE id = p_hotel_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Hotel não encontrado'
        );
    END IF;
    
    -- Buscar informações do room type
    SELECT "pricePerNight", "maxOccupancy" INTO v_room_type
    FROM "roomTypes" 
    WHERE id = p_room_type_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Tipo de quarto não encontrado'
        );
    END IF;
    
    -- Verificar ocupação máxima
    IF (p_adults + p_children) > COALESCE(v_room_type."maxOccupancy", 2) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Número de hóspedes excede a capacidade máxima do quarto: ' || COALESCE(v_room_type."maxOccupancy", 2)
        );
    END IF;
    
    -- Calcular preços
    v_base_price := COALESCE(v_room_type."pricePerNight", 0) * v_total_nights * p_units;
    v_total_price := v_base_price;
    
    -- Criar booking com NOVOS CAMPOS
    INSERT INTO bookings (
        "accommodationId",
        "roomTypeId", -- ✅ NOVO CAMPO
        "type",
        "guestName",
        "guestEmail", 
        "guestPhone",
        "checkInDate",
        "checkOutDate",
        "nightsCount",
        "totalPrice",
        "seatsBooked",
        "passengers",
        "numberOfAdults", -- ✅ NOVO CAMPO
        "numberOfChildren", -- ✅ NOVO CAMPO
        "specialRequests", -- ✅ NOVO CAMPO
        status
    ) VALUES (
        p_hotel_id,
        p_room_type_id, -- ✅ roomTypeId
        'hotel', -- ✅ AGORA 'hotel' É VÁLIDO
        p_guest_name,
        p_guest_email,
        COALESCE(p_guest_phone, ''),
        p_check_in::timestamp,
        p_check_out::timestamp,
        v_total_nights,
        v_total_price,
        1, -- seatsBooked (obrigatório mas não usado para hotels)
        p_adults + p_children, -- passengers
        p_adults, -- ✅ numberOfAdults
        p_children, -- ✅ numberOfChildren
        p_special_requests, -- ✅ specialRequests
        'confirmed'
    ) RETURNING id INTO v_booking_id;
    
    RETURN json_build_object(
        'success', true,
        'booking_id', v_booking_id,
        'base_price', v_base_price,
        'total_price', v_total_price,
        'nights', v_total_nights,
        'message', 'Reserva criada com sucesso'
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;


--
-- Name: create_hotel_booking_professional(uuid, uuid, date, date, integer, integer, integer, text, text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_hotel_booking_professional(p_hotel_id uuid, p_room_type_id uuid, p_check_in date, p_check_out date, p_adults integer DEFAULT 2, p_children integer DEFAULT 0, p_units integer DEFAULT 1, p_guest_name text DEFAULT 'Guest'::text, p_guest_email text DEFAULT 'guest@example.com'::text, p_guest_phone text DEFAULT NULL::text, p_special_requests text DEFAULT NULL::text, p_promo_code text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_booking_id uuid;
  v_nights integer;
  v_total_price numeric := 0;
  v_base_price numeric := 0;
  v_extra_charges numeric := 0;
  v_daily_prices jsonb := '[]'::jsonb;
  v_date_record record;
  v_price_record record;
  v_room_type_record record;
  v_min_nights_required integer;
  v_room_type_base_occupancy integer;
  v_extra_adult_price numeric;
  v_extra_child_price numeric;
  v_min_available_units integer;
  v_final_price numeric;
BEGIN
  IF p_check_out <= p_check_in THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Check-out date must be after check-in date'
    );
  END IF;
  
  v_nights := p_check_out - p_check_in;
  
  SELECT 
    rt.base_price,
    rt.max_occupancy,
    rt.base_occupancy,
    rt.extra_adult_price,
    rt.extra_child_price,
    rt.min_nights_default
  INTO 
    v_room_type_record
  FROM room_types rt
  WHERE rt.id = p_room_type_id 
    AND rt.hotel_id = p_hotel_id
    AND rt.is_active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Room type not found or inactive'
    );
  END IF;
  
  v_room_type_base_occupancy := COALESCE(v_room_type_record.base_occupancy, 2);
  v_extra_adult_price := COALESCE(v_room_type_record.extra_adult_price, 0);
  v_extra_child_price := COALESCE(v_room_type_record.extra_child_price, 0);
  v_min_nights_required := COALESCE(v_room_type_record.min_nights_default, 1);
  
  IF (p_adults + p_children) > v_room_type_record.max_occupancy THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Number of guests exceeds maximum occupancy of ' || v_room_type_record.max_occupancy
    );
  END IF;
  
  IF v_nights < v_min_nights_required THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Minimum stay requirement: ' || v_min_nights_required || ' nights',
      'required_nights', v_min_nights_required,
      'requested_nights', v_nights
    );
  END IF;
  
  BEGIN
    -- Lock the availability records
    PERFORM 1
    FROM room_availability 
    WHERE room_type_id = p_room_type_id 
      AND date >= p_check_in 
      AND date < p_check_out
    FOR UPDATE;
    
    -- Calculate daily prices
    FOR v_date_record IN 
      SELECT generate_series(p_check_in, p_check_out - INTERVAL '1 day', INTERVAL '1 day')::date as booking_date
    LOOP
      SELECT * INTO v_price_record
      FROM calculate_daily_price(p_hotel_id, p_room_type_id, v_date_record.booking_date, p_promo_code);
      
      IF NOT v_price_record.is_available THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Room not available for selected dates',
          'unavailable_date', v_date_record.booking_date
        );
      END IF;
      
      IF v_date_record.booking_date = p_check_in AND v_price_record.min_nights > v_min_nights_required THEN
        v_min_nights_required := v_price_record.min_nights;
        
        IF v_nights < v_min_nights_required THEN
          RETURN jsonb_build_object(
            'success', false,
            'error', 'Minimum stay requirement for selected dates: ' || v_min_nights_required || ' nights',
            'required_nights', v_min_nights_required,
            'requested_nights', v_nights
          );
        END IF;
      END IF;
      
      v_base_price := v_base_price + v_price_record.final_price;
      
      v_daily_prices := v_daily_prices || jsonb_build_object(
        'date', v_date_record.booking_date,
        'base_price', v_price_record.base_price,
        'season_multiplier', v_price_record.season_multiplier,
        'promotion_discount', v_price_record.promotion_discount,
        'final_price', v_price_record.final_price,
        'min_nights', v_price_record.min_nights
      );
    END LOOP;
    
    -- Calculate extra charges
    IF p_adults > v_room_type_base_occupancy THEN
      v_extra_charges := v_extra_charges + 
        ((p_adults - v_room_type_base_occupancy) * v_extra_adult_price * v_nights);
    END IF;
    
    IF p_children > 0 THEN
      v_extra_charges := v_extra_charges + 
        (p_children * v_extra_child_price * v_nights);
    END IF;
    
    v_base_price := v_base_price * p_units;
    v_final_price := v_base_price + v_extra_charges;
    
    -- Check availability
    SELECT MIN(remaining_units) INTO v_min_available_units
    FROM room_availability 
    WHERE room_type_id = p_room_type_id 
      AND date >= p_check_in 
      AND date < p_check_out
      AND stop_sell = false;
    
    IF v_min_available_units IS NULL OR v_min_available_units < p_units THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Not enough units available',
        'available_units', COALESCE(v_min_available_units, 0),
        'requested_units', p_units
      );
    END IF;
    
    -- Create hotel booking
    INSERT INTO hotel_bookings (
      hotel_id, 
      room_type_id, 
      guest_name, 
      guest_email,
      guest_phone,
      check_in, 
      check_out, 
      nights,
      units,
      adults, 
      children, 
      base_price,
      extra_charges,
      total_price,
      special_requests,
      status, 
      payment_status
    ) VALUES (
      p_hotel_id,
      p_room_type_id,
      p_guest_name,
      p_guest_email,
      p_guest_phone,
      p_check_in,
      p_check_out,
      v_nights,
      p_units,
      p_adults,
      p_children,
      v_base_price,
      v_extra_charges,
      v_final_price,
      p_special_requests,
      'confirmed',
      'pending'
    ) RETURNING id INTO v_booking_id;
    
    -- Update availability
    UPDATE room_availability 
    SET remaining_units = remaining_units - p_units,
        updated_at = NOW()
    WHERE room_type_id = p_room_type_id 
      AND date >= p_check_in 
      AND date < p_check_out;
    
    -- Create payment record (corrigindo os nomes das colunas)
    INSERT INTO payments (
      "bookingId",
      "userId",
      "serviceType",
      subtotal,
      "platformFee",  -- CORREÇÃO: com F maiúsculo e entre aspas
      total,
      "paymentMethod",
      "paymentStatus"
    ) VALUES (
      v_booking_id,
      NULL,
      'hotel',
      v_final_price,
      v_final_price * 0.10,
      v_final_price * 1.10,
      'pending',
      'pending'
    );
    
    RETURN jsonb_build_object(
      'success', true,
      'booking_id', v_booking_id,
      'hotel_id', p_hotel_id,
      'room_type_id', p_room_type_id,
      'total_price', v_final_price,
      'base_price', v_base_price,
      'extra_charges', v_extra_charges,
      'nights', v_nights,
      'adults', p_adults,
      'children', p_children,
      'units', p_units,
      'daily_prices', v_daily_prices,
      'check_in', p_check_in,
      'check_out', p_check_out,
      'min_nights_required', v_min_nights_required,
      'message', 'Hotel booking created successfully'
    );
    
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'sqlstate', SQLSTATE,
      'message', 'Error creating hotel booking'
    );
  END;
END;
$$;


--
-- Name: extract_province_from_address(text); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: f_unaccent(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.f_unaccent(text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $_$
SELECT public.unaccent($1);
$_$;


--
-- Name: get_booking_details(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_booking_details(p_booking_id uuid) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_result jsonb;
BEGIN
    SELECT jsonb_build_object(
        'success', true,
        'booking', jsonb_build_object(
            'id', hb.id,
            'hotel_id', hb.hotel_id,
            'hotel_name', h.name,
            'hotel_slug', h.slug,
            'hotel_address', h.address,
            'hotel_locality', h.locality,
            'hotel_province', h.province,
            'hotel_phone', h.contact_phone,
            'hotel_email', h.contact_email,
            'room_type_id', hb.room_type_id,
            'room_type_name', rt.name,
            'room_type_images', rt.images,
            'max_occupancy', rt.max_occupancy,
            'base_occupancy', rt.base_occupancy,
            'guest_name', hb.guest_name,
            'guest_email', hb.guest_email,
            'guest_phone', hb.guest_phone,
            'check_in', hb.check_in,
            'check_out', hb.check_out,
            'nights', hb.nights,
            'adults', hb.adults,
            'children', hb.children,
            'units', hb.units,
            'base_price', hb.base_price,
            'extra_charges', hb.extra_charges,
            'total_price', hb.total_price,
            'status', hb.status,
            'payment_status', hb.payment_status,
            'special_requests', hb.special_requests,
            'created_at', hb.created_at,
            'checked_in_at', hb.checked_in_at,
            'checked_out_at', hb.checked_out_at,
            'cancelled_at', hb.cancelled_at,
            'payment_info', (
                SELECT jsonb_build_object(
                    'payment_id', p.id,
                    'amount', p.total,
                    'status', p.paymentStatus,
                    'method', p.paymentMethod,
                    'created_at', p.createdAt
                )
                FROM payments p
                WHERE p.bookingId = hb.id
                LIMIT 1
            )
        )
    ) INTO v_result
    FROM hotel_bookings hb
    LEFT JOIN hotels h ON hb.hotel_id = h.id
    LEFT JOIN room_types rt ON hb.room_type_id = rt.id
    WHERE hb.id = p_booking_id;
    
    IF NOT FOUND THEN
        v_result := jsonb_build_object(
            'success', false,
            'error', 'Booking not found'
        );
    END IF;
    
    RETURN v_result;
END;
$$;


--
-- Name: get_bookings_by_email(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_bookings_by_email(p_guest_email text, p_status text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_bookings jsonb;
BEGIN
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', hb.id,
            'hotel_name', h.name,
            'hotel_slug', h.slug,
            'hotel_image', COALESCE(h.images[1], ''),
            'room_type', rt.name,
            'check_in', hb.check_in,
            'check_out', hb.check_out,
            'nights', hb.nights,
            'adults', hb.adults,
            'children', hb.children,
            'total_price', hb.total_price,
            'status', hb.status,
            'payment_status', hb.payment_status,
            'created_at', hb.created_at,
            'can_cancel', hb.status IN ('confirmed', 'pending') AND hb.check_in > CURRENT_DATE
        )
        ORDER BY hb.created_at DESC
    )
    INTO v_bookings
    FROM hotel_bookings hb
    JOIN hotels h ON hb.hotel_id = h.id
    JOIN room_types rt ON hb.room_type_id = rt.id
    WHERE hb.guest_email = p_guest_email
      AND (p_status IS NULL OR hb.status = p_status);
    
    RETURN jsonb_build_object(
        'success', true,
        'bookings', COALESCE(v_bookings, '[]'::jsonb),
        'count', COALESCE(jsonb_array_length(v_bookings), 0)
    );
END;
$$;


--
-- Name: get_function_code(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_function_code(p_function_name text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_code TEXT;
BEGIN
    SELECT pg_get_functiondef(p.oid)
    INTO v_code
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = p_function_name;
    
    RETURN v_code;
END;
$$;


--
-- Name: get_hotel_booking_details(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_hotel_booking_details(p_booking_id uuid) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_booking_record record;
  v_result jsonb;
BEGIN
  SELECT 
    hb.*,
    h.name as hotel_name,
    h.address as hotel_address,
    h.locality as hotel_locality,
    h.province as hotel_province,
    h.contact_phone as hotel_phone,
    h.contact_email as hotel_email,
    rt.name as room_type_name,
    rt.max_occupancy,
    rt.base_occupancy
  INTO v_booking_record
  FROM hotel_bookings hb
  JOIN hotels h ON hb.hotel_id = h.id
  JOIN room_types rt ON hb.room_type_id = rt.id
  WHERE hb.id = p_booking_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Booking not found'
    );
  END IF;
  
  v_result := jsonb_build_object(
    'success', true,
    'booking', jsonb_build_object(
      'id', v_booking_record.id,
      'hotel_id', v_booking_record.hotel_id,
      'hotel_name', v_booking_record.hotel_name,
      'hotel_address', v_booking_record.hotel_address,
      'hotel_locality', v_booking_record.hotel_locality,
      'hotel_province', v_booking_record.hotel_province,
      'hotel_phone', v_booking_record.hotel_phone,
      'hotel_email', v_booking_record.hotel_email,
      'room_type_id', v_booking_record.room_type_id,
      'room_type_name', v_booking_record.room_type_name,
      'max_occupancy', v_booking_record.max_occupancy,
      'base_occupancy', v_booking_record.base_occupancy,
      'guest_name', v_booking_record.guest_name,
      'guest_email', v_booking_record.guest_email,
      'guest_phone', v_booking_record.guest_phone,
      'check_in', v_booking_record.check_in,
      'check_out', v_booking_record.check_out,
      'nights', v_booking_record.nights,
      'adults', v_booking_record.adults,
      'children', v_booking_record.children,
      'units', v_booking_record.units,
      'base_price', v_booking_record.base_price,
      'extra_charges', v_booking_record.extra_charges,
      'total_price', v_booking_record.total_price,
      'status', v_booking_record.status,
      'payment_status', v_booking_record.payment_status,
      'special_requests', v_booking_record.special_requests,
      'created_at', v_booking_record.created_at,
      'checked_in_at', v_booking_record.checked_in_at,
      'checked_out_at', v_booking_record.checked_out_at
    )
  );
  
  RETURN v_result;
END;
$$;


--
-- Name: get_hotel_bookings_by_email(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_hotel_bookings_by_email(p_guest_email text) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_bookings jsonb;
BEGIN
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', hb.id,
            'hotel_name', h.name,
            'room_type', rt.name,
            'check_in', hb.check_in,
            'check_out', hb.check_out,
            'nights', hb.nights,
            'total_price', hb.total_price,
            'status', hb.status,
            'created_at', hb.created_at
        )
    )
    INTO v_bookings
    FROM hotel_bookings hb
    JOIN hotels h ON hb.hotel_id = h.id
    JOIN room_types rt ON hb.room_type_id = rt.id
    WHERE hb.guest_email = p_guest_email
    ORDER BY hb.created_at DESC;
    
    RETURN jsonb_build_object(
        'success', true,
        'bookings', COALESCE(v_bookings, '[]'::jsonb)
    );
END $$;


--
-- Name: get_hotel_dashboard_stats(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_hotel_dashboard_stats(p_hotel_id uuid) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_total_bookings INTEGER;
    v_active_bookings INTEGER;
    v_revenue DECIMAL(10,2);
BEGIN
    -- Total de bookings
    SELECT COUNT(*) INTO v_total_bookings
    FROM bookings 
    WHERE "accommodationId" = p_hotel_id AND "bookingType" = 'hotel';
    
    -- Bookings ativos (confirmed, checked_in)
    SELECT COUNT(*) INTO v_active_bookings
    FROM bookings 
    WHERE "accommodationId" = p_hotel_id 
      AND "bookingType" = 'hotel'
      AND status IN ('confirmed', 'checked_in');
    
    -- Receita total
    SELECT COALESCE(SUM("totalPrice"), 0) INTO v_revenue
    FROM bookings 
    WHERE "accommodationId" = p_hotel_id 
      AND "bookingType" = 'hotel'
      AND status NOT IN ('cancelled');
    
    RETURN json_build_object(
        'total_bookings', v_total_bookings,
        'active_bookings', v_active_bookings,
        'total_revenue', v_revenue,
        'average_rating', 4.5 -- Placeholder
    );
END;
$$;


--
-- Name: get_hotel_performance(uuid, date, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_hotel_performance(p_hotel_id uuid, p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_report jsonb;
BEGIN
    WITH date_range AS (
        SELECT 
            COALESCE(p_start_date, CURRENT_DATE - INTERVAL '30 days')::date as start_date,
            COALESCE(p_end_date, CURRENT_DATE)::date as end_date
    ),
    stats AS (
        SELECT 
            COUNT(DISTINCT hb.id) as total_bookings,
            SUM(CASE WHEN hb.status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_bookings,
            SUM(CASE WHEN hb.status = 'checked_in' THEN 1 ELSE 0 END) as active_stays,
            SUM(CASE WHEN hb.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_bookings,
            SUM(CASE WHEN hb.status NOT IN ('cancelled') THEN hb.total_price ELSE 0 END) as total_revenue,
            ROUND(AVG(CASE WHEN hb.status NOT IN ('cancelled') THEN hb.total_price / hb.nights ELSE NULL END), 2) as avg_daily_rate,
            ROUND(COUNT(DISTINCT hb.check_in)::numeric / 
                  (SELECT (end_date - start_date + 1) FROM date_range) * 100, 2) as occupancy_rate
        FROM hotel_bookings hb
        CROSS JOIN date_range
        WHERE hb.hotel_id = p_hotel_id
          AND hb.check_in BETWEEN date_range.start_date AND date_range.end_date
    ),
    availability_stats AS (
        SELECT 
            ROUND(AVG(price), 2) as avg_price,
            MIN(price) as min_price,
            MAX(price) as max_price,
            SUM(available_units) as total_available_units
        FROM room_availability ra
        WHERE ra.hotel_id = p_hotel_id
          AND ra.date BETWEEN (SELECT start_date FROM date_range) 
                          AND (SELECT end_date FROM date_range)
    )
    SELECT jsonb_build_object(
        'period', jsonb_build_object(
            'start_date', (SELECT start_date FROM date_range),
            'end_date', (SELECT end_date FROM date_range)
        ),
        'bookings', jsonb_build_object(
            'total', COALESCE((SELECT total_bookings FROM stats), 0),
            'confirmed', COALESCE((SELECT confirmed_bookings FROM stats), 0),
            'active', COALESCE((SELECT active_stays FROM stats), 0),
            'cancelled', COALESCE((SELECT cancelled_bookings FROM stats), 0),
            'cancellation_rate', CASE 
                WHEN (SELECT total_bookings FROM stats) > 0 
                THEN ROUND((SELECT cancelled_bookings FROM stats)::numeric / 
                          (SELECT total_bookings FROM stats) * 100, 2)
                ELSE 0
            END
        ),
        'financial', jsonb_build_object(
            'total_revenue', COALESCE((SELECT total_revenue FROM stats), 0),
            'average_daily_rate', COALESCE((SELECT avg_daily_rate FROM stats), 0),
            'occupancy_rate', COALESCE((SELECT occupancy_rate FROM stats), 0),
            'revenue_per_available_room', CASE 
                WHEN (SELECT total_available_units FROM availability_stats) > 0
                THEN ROUND(COALESCE((SELECT total_revenue FROM stats), 0)::numeric / 
                          (SELECT total_available_units FROM availability_stats), 2)
                ELSE 0
            END
        ),
        'pricing', jsonb_build_object(
            'average_price', COALESCE((SELECT avg_price FROM availability_stats), 0),
            'min_price', COALESCE((SELECT min_price FROM availability_stats), 0),
            'max_price', COALESCE((SELECT max_price FROM availability_stats), 0)
        )
    ) INTO v_report;
    
    RETURN v_report;
END;
$$;


--
-- Name: get_hotel_stats(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_hotel_stats(p_hotel_id uuid) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_stats jsonb;
BEGIN
    SELECT jsonb_build_object(
        'total_bookings', (
            SELECT COUNT(*) 
            FROM hotel_bookings 
            WHERE hotel_id = p_hotel_id
        ),
        'active_bookings', (
            SELECT COUNT(*) 
            FROM hotel_bookings 
            WHERE hotel_id = p_hotel_id 
              AND status IN ('confirmed', 'checked_in')
              AND check_out >= CURRENT_DATE
        ),
        'today_checkins', (
            SELECT COUNT(*) 
            FROM hotel_bookings 
            WHERE hotel_id = p_hotel_id 
              AND check_in = CURRENT_DATE
              AND status IN ('confirmed', 'checked_in')
        ),
        'today_checkouts', (
            SELECT COUNT(*) 
            FROM hotel_bookings 
            WHERE hotel_id = p_hotel_id 
              AND check_out = CURRENT_DATE
              AND status IN ('checked_in', 'confirmed')
        ),
        'total_revenue', (
            SELECT COALESCE(SUM(total_price), 0)
            FROM hotel_bookings 
            WHERE hotel_id = p_hotel_id 
              AND status NOT IN ('cancelled')
              AND created_at >= CURRENT_DATE - INTERVAL '30 days'
        ),
        'available_rooms', (
            SELECT COALESCE(SUM(available_units), 0)
            FROM room_availability ra
            JOIN room_types rt ON ra.room_type_id = rt.id
            WHERE rt.hotel_id = p_hotel_id
              AND ra.date = CURRENT_DATE
              AND ra.stop_sell = false
        ),
        'total_rooms', (
            SELECT COALESCE(SUM(total_units), 0)
            FROM room_types 
            WHERE hotel_id = p_hotel_id 
              AND is_active = true
        )
    ) INTO v_stats;
    
    RETURN v_stats;
END;
$$;


--
-- Name: get_rides_smart_final(text, text, double precision, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_rides_smart_final(search_from text DEFAULT ''::text, search_to text DEFAULT ''::text, radius_km double precision DEFAULT 100, max_results integer DEFAULT 50) RETURNS TABLE(ride_id uuid, driver_id text, driver_name text, driver_rating numeric, vehicle_make text, vehicle_model text, vehicle_type text, vehicle_plate text, vehicle_color text, max_passengers integer, from_city text, to_city text, from_lat double precision, from_lng double precision, to_lat double precision, to_lng double precision, departuredate timestamp without time zone, availableseats integer, priceperseat numeric, distance_from_city_km double precision, distance_to_city_km double precision, match_type text, direction_score integer)
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
    -- 🎯 CORREÇÃO: Usar alias explícito para evitar ambiguidade
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


--
-- Name: manage_booking(text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.manage_booking(p_action text, p_booking_data jsonb) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_result jsonb;
    v_booking_id uuid;
    v_new_status text;
BEGIN
    IF p_action = 'create' THEN
        SELECT public.create_hotel_booking_professional(
            (p_booking_data->>'hotel_id')::uuid,
            (p_booking_data->>'room_type_id')::uuid,
            (p_booking_data->>'check_in')::date,
            (p_booking_data->>'check_out')::date,
            COALESCE((p_booking_data->>'adults')::integer, 2),
            COALESCE((p_booking_data->>'children')::integer, 0),
            COALESCE((p_booking_data->>'units')::integer, 1),
            COALESCE(p_booking_data->>'guest_name', 'Guest'),
            COALESCE(p_booking_data->>'guest_email', 'guest@example.com'),
            p_booking_data->>'guest_phone',
            p_booking_data->>'special_requests',
            p_booking_data->>'promo_code'
        ) INTO v_result;
            
    ELSIF p_action = 'cancel' THEN
        v_booking_id := (p_booking_data->>'booking_id')::uuid;
        
        BEGIN
            PERFORM 1
            FROM hotel_bookings hb
            JOIN room_availability ra ON hb.room_type_id = ra.room_type_id 
                AND ra.date >= hb.check_in 
                AND ra.date < hb.check_out
            WHERE hb.id = v_booking_id
            FOR UPDATE;
            
            UPDATE room_availability 
            SET remaining_units = remaining_units + (
                SELECT units FROM hotel_bookings WHERE id = v_booking_id
            ),
            updated_at = NOW()
            WHERE room_type_id = (
                SELECT room_type_id FROM hotel_bookings WHERE id = v_booking_id
            )
            AND date >= (SELECT check_in FROM hotel_bookings WHERE id = v_booking_id)
            AND date < (SELECT check_out FROM hotel_bookings WHERE id = v_booking_id);
            
            UPDATE hotel_bookings 
            SET status = 'cancelled',
                updated_at = NOW(),
                cancelled_at = NOW()
            WHERE id = v_booking_id;
            
            v_result := jsonb_build_object(
                'success', true,
                'message', 'Booking cancelled successfully'
            );
            
        EXCEPTION WHEN OTHERS THEN
            v_result := jsonb_build_object(
                'success', false,
                'error', SQLERRM
            );
        END;
            
    ELSIF p_action IN ('check_in', 'check_out', 'confirm', 'update') THEN
        v_booking_id := (p_booking_data->>'booking_id')::uuid;
        v_new_status := p_action;
        
        IF p_action = 'check_in' THEN
            UPDATE hotel_bookings 
            SET status = 'checked_in',
                checked_in_at = NOW(),
                updated_at = NOW()
            WHERE id = v_booking_id;
            
        ELSIF p_action = 'check_out' THEN
            UPDATE hotel_bookings 
            SET status = 'checked_out',
                checked_out_at = NOW(),
                updated_at = NOW()
            WHERE id = v_booking_id;
            
        ELSIF p_action = 'confirm' THEN
            UPDATE hotel_bookings 
            SET status = 'confirmed',
                updated_at = NOW()
            WHERE id = v_booking_id;
            
        ELSIF p_action = 'update' THEN
            UPDATE hotel_bookings 
            SET guest_name = COALESCE(p_booking_data->>'guest_name', guest_name),
                guest_phone = COALESCE(p_booking_data->>'guest_phone', guest_phone),
                special_requests = COALESCE(p_booking_data->>'special_requests', special_requests),
                updated_at = NOW()
            WHERE id = v_booking_id;
        END IF;
        
        v_result := jsonb_build_object(
            'success', true,
            'message', 'Booking ' || p_action || ' successfully'
        );
            
    ELSE
        v_result := jsonb_build_object(
            'success', false,
            'error', 'Invalid action'
        );
    END IF; -- Mudei de END CASE para END IF
    
    RETURN v_result;
END;
$$;


--
-- Name: manage_hotel(text, jsonb, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.manage_hotel(p_action text, p_hotel_data jsonb, p_user_id uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_hotel_id uuid;
    v_result jsonb;
BEGIN
    IF p_action = 'create' AND p_user_id IS NOT NULL THEN
        INSERT INTO hotels (
            name, slug, description, address, locality, province,
            lat, lng, images, amenities, contact_email, contact_phone,
            host_id, check_in_time, check_out_time, policies, is_active,
            created_by, updated_by
        ) VALUES (
            p_hotel_data->>'name',
            LOWER(REPLACE(p_hotel_data->>'name', ' ', '-')),
            p_hotel_data->>'description',
            p_hotel_data->>'address',
            p_hotel_data->>'locality',
            p_hotel_data->>'province',
            (p_hotel_data->>'lat')::numeric,
            (p_hotel_data->>'lng')::numeric,
            COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_hotel_data->'images')), '{}'),
            COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_hotel_data->'amenities')), '{}'),
            p_hotel_data->>'contact_email',
            p_hotel_data->>'contact_phone',
            p_user_id,
            COALESCE((p_hotel_data->>'check_in_time')::time, '14:00:00'),
            COALESCE((p_hotel_data->>'check_out_time')::time, '12:00:00'),
            p_hotel_data->>'policies',
            COALESCE((p_hotel_data->>'is_active')::boolean, true),
            p_user_id,
            p_user_id
        ) RETURNING id INTO v_hotel_id;
        
        v_result := jsonb_build_object(
            'success', true,
            'hotel_id', v_hotel_id,
            'message', 'Hotel created successfully'
        );
        
    ELSIF p_action = 'update' THEN
        v_hotel_id := (p_hotel_data->>'id')::uuid;
        
        UPDATE hotels 
        SET 
            name = COALESCE(p_hotel_data->>'name', name),
            description = COALESCE(p_hotel_data->>'description', description),
            address = COALESCE(p_hotel_data->>'address', address),
            locality = COALESCE(p_hotel_data->>'locality', locality),
            province = COALESCE(p_hotel_data->>'province', province),
            lat = COALESCE((p_hotel_data->>'lat')::numeric, lat),
            lng = COALESCE((p_hotel_data->>'lng')::numeric, lng),
            contact_email = COALESCE(p_hotel_data->>'contact_email', contact_email),
            contact_phone = COALESCE(p_hotel_data->>'contact_phone', contact_phone),
            check_in_time = COALESCE((p_hotel_data->>'check_in_time')::time, check_in_time),
            check_out_time = COALESCE((p_hotel_data->>'check_out_time')::time, check_out_time),
            policies = COALESCE(p_hotel_data->>'policies', policies),
            is_active = COALESCE((p_hotel_data->>'is_active')::boolean, is_active),
            updated_at = NOW(),
            updated_by = p_user_id
        WHERE id = v_hotel_id;
        
        v_result := jsonb_build_object(
            'success', true,
            'message', 'Hotel updated successfully'
        );
        
    ELSIF p_action = 'delete' THEN
        v_hotel_id := (p_hotel_data->>'id')::uuid;
        
        UPDATE hotels 
        SET is_active = false,
            deleted_at = NOW(),
            updated_by = p_user_id
        WHERE id = v_hotel_id;
        
        v_result := jsonb_build_object(
            'success', true,
            'message', 'Hotel marked as inactive'
        );
        
    ELSE
        v_result := jsonb_build_object(
            'success', false,
            'error', 'Invalid action or missing parameters'
        );
    END IF;
    
    RETURN v_result;
END;
$$;


--
-- Name: normalize_location_name(text); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: planet_osm_index_bucket(bigint[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.planet_osm_index_bucket(bigint[]) RETURNS bigint[]
    LANGUAGE sql IMMUTABLE
    AS $_$  SELECT ARRAY(SELECT DISTINCT    unnest($1) >> 5)$_$;


--
-- Name: planet_osm_line_osm2pgsql_valid(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: planet_osm_member_ids(jsonb, character); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.planet_osm_member_ids(jsonb, character) RETURNS bigint[]
    LANGUAGE sql IMMUTABLE
    AS $_$  SELECT array_agg((el->>'ref')::int8)   FROM jsonb_array_elements($1) AS el    WHERE el->>'type' = $2$_$;


--
-- Name: planet_osm_point_osm2pgsql_valid(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: planet_osm_polygon_osm2pgsql_valid(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: planet_osm_roads_osm2pgsql_valid(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: search_hotels_smart(text, integer, numeric, numeric, text[], integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.search_hotels_smart(p_location text, p_limit integer, p_min_price numeric, p_max_price numeric, p_amenities text[], p_min_guests integer) RETURNS jsonb
    LANGUAGE sql
    AS $$
WITH loc AS (
    SELECT geom
    FROM mozambique_locations
    WHERE name ILIKE p_location || '%'
    LIMIT 1
),
rooms_per_hotel AS (
    SELECT
        h.id AS hotel_id,
        h.name AS hotel_name,
        h.address,
        h.locality,
        h.province,
        h.geom AS hotel_geom,
        JSONB_AGG(
            JSONB_BUILD_OBJECT(
                'room_type_id', r.id,
                'room_type_name', r.name,
                'base_price', r.base_price,
                'max_occupancy', r.max_occupancy,
                'total_units', r.total_units,
                'amenities', r.amenities,
                'images', r.images
            )
        ) AS available_room_types,
        MIN(r.base_price) AS min_price_per_night,
        MAX(r.base_price) AS max_price_per_night,
        COUNT(r.id) AS total_available_rooms
    FROM hotels h
    JOIN room_types r ON r.hotel_id = h.id
    CROSS JOIN loc
    WHERE r.max_occupancy >= p_min_guests
      AND (p_min_price IS NULL OR r.base_price >= p_min_price)
      AND (p_max_price IS NULL OR r.base_price <= p_max_price)
      AND (p_amenities IS NULL OR r.amenities @> p_amenities)
    GROUP BY h.id, h.name, h.address, h.locality, h.province, h.geom
)
SELECT JSONB_AGG(result) 
FROM (
    SELECT
        hotel_id,
        hotel_name AS name,
        address,
        locality,
        province,
        ST_DistanceSphere(hotel_geom, (SELECT geom FROM loc)) AS distance_meters,
        min_price_per_night,
        max_price_per_night,
        total_available_rooms,
        available_room_types
    FROM rooms_per_hotel
    ORDER BY ST_DistanceSphere(hotel_geom, (SELECT geom FROM loc))
    LIMIT p_limit
) AS result;
$$;


--
-- Name: search_hotels_smart(text, double precision, date, date, integer, text, numeric, text[], integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.search_hotels_smart(search_location text, search_radius_km double precision, check_in_date date, check_out_date date, guests integer, room_type_filter text DEFAULT NULL::text, max_price numeric DEFAULT NULL::numeric, required_amenities text[] DEFAULT NULL::text[], max_results integer DEFAULT 10) RETURNS TABLE(id uuid, name text, slug text, description text, address text, locality text, province text, lat double precision, lng double precision, distance_km double precision, available_room_types jsonb, min_price_per_night numeric, max_price_per_night numeric, match_score integer, total_available_rooms integer)
    LANGUAGE plpgsql
    AS $$
DECLARE
    search_location_geom GEOMETRY;
    nights INTEGER;
BEGIN
    -- Número de noites
    nights := COALESCE(check_out_date - check_in_date, 1);

    -- Localização geométrica da busca
    IF search_location IS NOT NULL THEN
        BEGIN
            SELECT ST_SetSRID(ST_MakePoint(lng::DOUBLE PRECISION, lat::DOUBLE PRECISION), 4326)
            INTO search_location_geom
            FROM locations_cache
            WHERE name ILIKE '%' || search_location || '%'
               OR locality ILIKE '%' || search_location || '%'
               OR province ILIKE '%' || search_location || '%'
            LIMIT 1;
        EXCEPTION WHEN OTHERS THEN
            search_location_geom := NULL;
        END;
    END IF;

    RETURN QUERY
    SELECT
        h.id,
        h.name,
        COALESCE(h.slug, '')::TEXT,
        COALESCE(h.description, '')::TEXT,
        COALESCE(h.address, '')::TEXT,
        COALESCE(h.locality, '')::TEXT,
        COALESCE(h.province, '')::TEXT,
        h.lat::DOUBLE PRECISION,
        h.lng::DOUBLE PRECISION,
        CASE
            WHEN h.lat IS NOT NULL AND h.lng IS NOT NULL AND search_location_geom IS NOT NULL THEN
                ST_DistanceSphere(ST_SetSRID(ST_MakePoint(h.lng::DOUBLE PRECISION, h.lat::DOUBLE PRECISION), 4326), search_location_geom)/1000
            ELSE 9999
        END::DOUBLE PRECISION AS distance_km,
        room_types_json.available_room_types,
        room_types_json.min_price,
        room_types_json.max_price,
        CASE
            WHEN h.lat IS NOT NULL AND h.lng IS NOT NULL AND search_location_geom IS NOT NULL
                 AND ST_DistanceSphere(ST_SetSRID(ST_MakePoint(h.lng::DOUBLE PRECISION, h.lat::DOUBLE PRECISION), 4326), search_location_geom)/1000 <= search_radius_km THEN 100
            WHEN COALESCE(h.locality,'') ILIKE '%' || search_location || '%' THEN 80
            WHEN COALESCE(h.province,'') ILIKE '%' || search_location || '%' THEN 60
            ELSE 0
        END AS match_score,
        room_types_json.total_rooms
    FROM hotels h
    LEFT JOIN LATERAL (
        SELECT
            jsonb_agg(
                jsonb_build_object(
                    'room_type_id', rt.id,
                    'room_type_name', rt.name,
                    'base_price', rt.base_price,
                    'max_occupancy', rt.max_occupancy,
                    'total_units', rt.total_units,
                    'price_per_night', rt.base_price,
                    'total_price', rt.base_price * nights,
                    'amenities', COALESCE(to_jsonb(rt.amenities), '[]'::jsonb),
                    'images', COALESCE(to_jsonb(rt.images), '[]'::jsonb)
                )
            ) AS available_room_types,
            MIN(rt.base_price) AS min_price,
            MAX(rt.base_price) AS max_price,
            COUNT(*)::INTEGER AS total_rooms
        FROM room_types rt
        WHERE rt.hotel_id = h.id
          AND rt.is_active = TRUE
          AND rt.max_occupancy >= guests
          AND (room_type_filter IS NULL OR rt.name ILIKE '%' || room_type_filter || '%')
          AND (max_price IS NULL OR rt.base_price <= max_price)
    ) room_types_json ON TRUE
    WHERE h.is_active = TRUE
      AND (required_amenities IS NULL OR h.amenities @> required_amenities)
      AND (
          search_location_geom IS NULL OR
          ST_DistanceSphere(ST_SetSRID(ST_MakePoint(h.lng::DOUBLE PRECISION, h.lat::DOUBLE PRECISION), 4326), search_location_geom)/1000 <= search_radius_km
      )
    ORDER BY match_score DESC, distance_km ASC, min_price_per_night ASC
    LIMIT max_results;
END;
$$;


--
-- Name: search_hotels_smart_optimized(text, double precision, date, date, integer, text, numeric, text[], integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.search_hotels_smart_optimized(search_location text DEFAULT ''::text, search_radius_km double precision DEFAULT 10, check_in_date date DEFAULT NULL::date, check_out_date date DEFAULT NULL::date, guests integer DEFAULT 2, room_type_filter text DEFAULT NULL::text, max_price numeric DEFAULT NULL::numeric, required_amenities text[] DEFAULT NULL::text[], max_results integer DEFAULT 20) RETURNS TABLE(hotel_id uuid, hotel_name text, hotel_slug text, description text, address text, locality text, province text, lat numeric, lng numeric, distance_km double precision, available_room_types jsonb, min_price_per_night numeric, max_price_per_night numeric, match_score integer, total_available_rooms integer)
    LANGUAGE plpgsql
    AS $$
DECLARE
    search_location_geom GEOMETRY;
    normalized_location TEXT;
    location_city TEXT;
    location_province TEXT;
    nights INTEGER;
BEGIN
    -- Datas padrão (igual à função anterior)
    IF check_in_date IS NULL THEN
        check_in_date := CURRENT_DATE + INTERVAL '1 day';
    END IF;
    
    IF check_out_date IS NULL THEN
        check_out_date := check_in_date + INTERVAL '1 day';
    END IF;
    
    nights := (check_out_date - check_in_date);
    
    -- Buscar geometria (igual à função anterior)
    normalized_location := LOWER(TRIM(search_location));
    location_city := split_part(normalized_location, ',', 1);
    location_province := TRIM(COALESCE(split_part(normalized_location, ',', 2), ''));
    
    SELECT geom INTO search_location_geom
    FROM mozambique_locations 
    WHERE name ILIKE '%' || location_city || '%'
       AND (location_province = '' OR mozambique_locations.province ILIKE '%' || location_province || '%')
    LIMIT 1;
    
    -- Query principal (estrutura similar mas compatível com novas colunas)
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
        
        -- Available room types com nova estrutura
        COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'room_type_id', rt.id,
                        'room_type_name', rt.name,
                        'base_price', rt.base_price,
                        'max_occupancy', rt.max_occupancy,
                        'base_occupancy', rt.base_occupancy,
                        'available_units', MIN(ra.available_units),
                        'price_per_night', MIN(ra.price),
                        'total_price', MIN(ra.price) * nights,
                        'amenities', COALESCE(rt.amenities, '{}'),
                        'images', COALESCE(rt.images, '{}'),
                        'extra_adult_price', rt.extra_adult_price,
                        'extra_child_price', rt.extra_child_price,
                        'total_units', rt.total_units
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
        
        -- Preços mínimos e máximos
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
        
        -- Match score (igual)
        CASE
            WHEN h.location_geom IS NOT NULL AND search_location_geom IS NOT NULL
                 AND ST_DistanceSphere(h.location_geom, search_location_geom) / 1000 <= search_radius_km THEN 100
            WHEN COALESCE(h.locality, '') ILIKE '%' || location_city || '%' THEN 80
            WHEN COALESCE(h.province, '') ILIKE '%' || location_province || '%' THEN 60
            ELSE 0
        END::INTEGER as match_score,
        
        -- Total available rooms
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
$$;


--
-- Name: search_hotels_smart_professional(text, double precision, date, date, integer, text, numeric, text[], integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.search_hotels_smart_professional(search_location text DEFAULT ''::text, search_radius_km double precision DEFAULT 10, check_in_date date DEFAULT NULL::date, check_out_date date DEFAULT NULL::date, guests integer DEFAULT 2, room_type_filter text DEFAULT NULL::text, max_price numeric DEFAULT NULL::numeric, required_amenities text[] DEFAULT NULL::text[], max_results integer DEFAULT 20) RETURNS TABLE(hotel_id uuid, hotel_name text, hotel_slug text, description text, address text, locality text, province text, lat numeric, lng numeric, distance_km double precision, available_room_types jsonb, min_price_per_night numeric, max_price_per_night numeric, match_score integer, total_available_rooms integer)
    LANGUAGE plpgsql
    AS $$
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
                        'available_units', rt_agg.min_remaining_units,  -- CORREÇÃO: usar subquery
                        'price_per_night', rt_agg.min_price,
                        'total_price', rt_agg.min_price * nights,
                        'amenities', COALESCE(
                            CASE 
                                WHEN rt.amenities IS NULL THEN '[]'::jsonb
                                ELSE to_jsonb(rt.amenities)
                            END,
                            '[]'::jsonb
                        ),
                        'images', COALESCE(
                            CASE 
                                WHEN rt.images IS NULL THEN '[]'::jsonb
                                ELSE to_jsonb(rt.images)
                            END,
                            '[]'::jsonb
                        ),
                        'extra_adult_price', rt.extra_adult_price,
                        'extra_child_price', rt.extra_child_price
                    )
                )
                FROM room_types rt
                INNER JOIN (
                    SELECT 
                        ra.room_type_id,
                        MIN(ra.remaining_units) as min_remaining_units,
                        MIN(ra.price) as min_price
                    FROM room_availability ra
                    WHERE ra.date BETWEEN check_in_date AND (check_out_date - INTERVAL '1 day')
                      AND ra.remaining_units > 0
                      AND ra.stop_sell = false
                    GROUP BY ra.room_type_id
                ) rt_agg ON rt.id = rt_agg.room_type_id
                WHERE rt.hotel_id = h.id 
                  AND rt.is_active = true
                  AND rt.max_occupancy >= guests
                  AND (max_price IS NULL OR rt_agg.min_price <= max_price)
                  AND (room_type_filter IS NULL OR rt.name ILIKE '%' || room_type_filter || '%')
            ),
            '[]'::jsonb
        ) as available_room_types,
        
        COALESCE((
            SELECT MIN(ra.price)
            FROM room_types rt
            INNER JOIN room_availability ra ON rt.id = ra.room_type_id 
                AND ra.date BETWEEN check_in_date AND (check_out_date - INTERVAL '1 day')
                AND ra.remaining_units > 0
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
                AND ra.remaining_units > 0
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
                AND ra.remaining_units > 0
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
              AND ra.remaining_units > 0
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
$$;


--
-- Name: test_complete_hotel_system(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.test_complete_hotel_system() RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_results jsonb := '[]'::jsonb;
    v_test_result jsonb;
    v_booking_result jsonb;
    v_booking_id uuid;
BEGIN
    -- Teste 1: Busca de hotéis
    SELECT jsonb_build_object(
        'test', 'search_hotels',
        'passed', (SELECT COUNT(*) > 0 FROM search_hotels_smart_professional(
            search_location := 'Maputo',
            check_in_date := '2025-12-29',
            check_out_date := '2026-01-01',
            guests := 2,
            max_results := 3
        ))
    ) INTO v_test_result;
    v_results := v_results || v_test_result;
    
    -- Teste 2: Verificação de disponibilidade
    SELECT jsonb_build_object(
        'test', 'check_availability',
        'passed', (SELECT is_available FROM check_hotel_availability_detailed(
            p_hotel_id := '23785edf-7e83-471b-8b8f-6c91e56c58fa',
            p_room_type_id := '8de37a99-f790-42d8-b105-bd36d884391e',  -- Standard room
            p_check_in := '2025-12-29',
            p_check_out := '2026-01-01',
            p_units := 1
        ))
    ) INTO v_test_result;
    v_results := v_results || v_test_result;
    
    -- Teste 3: Criação de booking
    SELECT create_hotel_booking_professional(
        p_hotel_id := '23785edf-7e83-471b-8b8f-6c91e56c58fa',
        p_room_type_id := '8de37a99-f790-42d8-b105-bd36d884391e',  -- Standard room
        p_check_in := '2025-12-29',
        p_check_out := '2026-01-01',
        p_adults := 2,
        p_children := 0,
        p_units := 1,
        p_guest_name := 'Teste Sistema Completo',
        p_guest_email := 'teste@sistema.com'
    ) INTO v_booking_result;
    
    v_results := v_results || jsonb_build_object(
        'test', 'create_booking',
        'passed', (v_booking_result->>'success')::boolean,
        'booking_id', v_booking_result->>'booking_id'
    );
    
    -- Teste 4: Verificar booking criado
    IF (v_booking_result->>'success')::boolean THEN
        v_booking_id := (v_booking_result->>'booking_id')::uuid;
        
        SELECT jsonb_build_object(
            'test', 'verify_booking',
            'passed', (SELECT COUNT(*) > 0 FROM hotel_bookings WHERE id = v_booking_id),
            'booking_exists', (SELECT COUNT(*) > 0 FROM hotel_bookings WHERE id = v_booking_id),
            'payment_exists', (SELECT COUNT(*) > 0 FROM payments WHERE "bookingId" = v_booking_id)
        ) INTO v_test_result;
        v_results := v_results || v_test_result;
    END IF;
    
    -- Teste 5: Verificar disponibilidade atualizada
    SELECT jsonb_build_object(
        'test', 'updated_availability',
        'passed', NOT (SELECT is_available FROM check_hotel_availability_detailed(
            p_hotel_id := '23785edf-7e83-471b-8b8f-6c91e56c58fa',
            p_room_type_id := '8de37a99-f790-42d8-b105-bd36d884391e',
            p_check_in := '2025-12-29',
            p_check_out := '2026-01-01',
            p_units := 2  -- Agora só tem 1 disponível (nossa reserva usou 1)
        ))
    ) INTO v_test_result;
    v_results := v_results || v_test_result;
    
    RETURN jsonb_build_object(
        'tests', v_results,
        'total_tests', jsonb_array_length(v_results),
        'passed_tests', (SELECT COUNT(*) FROM jsonb_array_elements(v_results) WHERE value->>'passed' = 'true'),
        'test_date', CURRENT_TIMESTAMP
    );
END;
$$;


--
-- Name: test_search_periods(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.test_search_periods() RETURNS TABLE(period_name text, check_in date, check_out date, hotels_found integer, min_price numeric, max_price numeric)
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Próxima semana
    RETURN QUERY
    SELECT 
        'Próxima semana'::text as period_name,
        CURRENT_DATE + INTERVAL '7 days',
        CURRENT_DATE + INTERVAL '10 days',
        COUNT(*)::integer,
        COALESCE(MIN(min_price_per_night), 0),
        COALESCE(MAX(max_price_per_night), 0)
    FROM search_hotels_smart_professional(
        search_location := 'Maputo',
        search_radius_km := 50,
        check_in_date := CURRENT_DATE + INTERVAL '7 days',
        check_out_date := CURRENT_DATE + INTERVAL '10 days',
        guests := 2,
        max_results := 10
    );
    
    -- Dezembro 2025 (Natal)
    RETURN QUERY
    SELECT 
        'Dezembro 2025'::text as period_name,
        '2025-12-20'::date,
        '2025-12-25'::date,
        COUNT(*)::integer,
        COALESCE(MIN(min_price_per_night), 0),
        COALESCE(MAX(max_price_per_night), 0)
    FROM search_hotels_smart_professional(
        search_location := 'Maputo',
        search_radius_km := 50,
        check_in_date := '2025-12-20',
        check_out_date := '2025-12-25',
        guests := 2,
        max_results := 10
    );
    
    -- Janeiro 2026 (Ano Novo)
    RETURN QUERY
    SELECT 
        'Janeiro 2026'::text as period_name,
        '2026-01-01'::date,
        '2026-01-05'::date,
        COUNT(*)::integer,
        COALESCE(MIN(min_price_per_night), 0),
        COALESCE(MAX(max_price_per_night), 0)
    FROM search_hotels_smart_professional(
        search_location := 'Maputo',
        search_radius_km := 50,
        check_in_date := '2026-01-01',
        check_out_date := '2026-01-05',
        guests := 2,
        max_results := 10
    );
END;
$$;


--
-- Name: update_hotel_geometry(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_hotel_geometry() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.lat IS NOT NULL AND NEW.lng IS NOT NULL THEN
    NEW.location_geom = ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326);
  ELSE
    NEW.location_geom = NULL;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: view_hotel_availability(text, date, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.view_hotel_availability(p_hotel_name text DEFAULT NULL::text, p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date) RETURNS TABLE(hotel text, room_type text, date date, day_of_week text, remaining_units integer, price numeric, season text)
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF p_start_date IS NULL THEN
        p_start_date := CURRENT_DATE + INTERVAL '7 days';
    END IF;
    
    IF p_end_date IS NULL THEN
        p_end_date := p_start_date + INTERVAL '7 days';
    END IF;
    
    RETURN QUERY
    SELECT 
        h.name::text as hotel,
        rt.name::text as room_type,
        ra.date::date,
        TO_CHAR(ra.date, 'Day')::text as day_of_week,
        ra.remaining_units::integer,
        ra.price::numeric,
        CASE 
            WHEN EXTRACT(MONTH FROM ra.date) IN (12, 1, 2) THEN 'Alta'
            WHEN EXTRACT(MONTH FROM ra.date) IN (6, 7, 8) THEN 'Baixa'
            ELSE 'Média'
        END::text as season
    FROM room_availability ra
    JOIN room_types rt ON ra.room_type_id = rt.id
    JOIN hotels h ON rt.hotel_id = h.id
    WHERE (p_hotel_name IS NULL OR h.name ILIKE '%' || p_hotel_name || '%')
      AND ra.date BETWEEN p_start_date AND p_end_date
      AND ra.remaining_units > 0
      AND ra.stop_sell = false
    ORDER BY h.name, rt.name, ra.date
    LIMIT 30;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: accommodations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accommodations (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT accommodations_id_not_null1 NOT NULL,
    name text CONSTRAINT accommodations_name_not_null1 NOT NULL,
    type text CONSTRAINT accommodations_type_not_null1 NOT NULL,
    "hostId" text NOT NULL,
    address text CONSTRAINT accommodations_address_not_null1 NOT NULL,
    locality character varying(100),
    province character varying(100),
    country character varying(100) DEFAULT 'Moçambique'::character varying,
    "searchRadius" integer DEFAULT 50,
    lat numeric(10,7),
    lng numeric(10,7),
    rating numeric(3,2) DEFAULT 0.00,
    "reviewCount" integer DEFAULT 0,
    images text[] DEFAULT '{}'::text[],
    amenities text[] DEFAULT '{}'::text[],
    description text,
    "distanceFromCenter" numeric(4,1),
    "isAvailable" boolean DEFAULT true,
    "offerDriverDiscounts" boolean DEFAULT false,
    "driverDiscountRate" numeric(5,2) DEFAULT 10.00,
    "minimumDriverLevel" public.partnership_level DEFAULT 'bronze'::public.partnership_level,
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


--
-- Name: adminActions; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: bookings; Type: TABLE; Schema: public; Owner: -
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
    "roomTypeId" uuid,
    "numberOfAdults" integer DEFAULT 1,
    "numberOfChildren" integer DEFAULT 0,
    CONSTRAINT hotel_booking_requires_room CHECK ((("bookingType" <> 'hotel'::text) OR (("roomId" IS NOT NULL) AND ("checkInDate" IS NOT NULL) AND ("checkOutDate" IS NOT NULL)))),
    CONSTRAINT ride_booking_requires_ride CHECK ((("bookingType" <> 'ride'::text) OR ("rideId" IS NOT NULL))),
    CONSTRAINT valid_booking_type CHECK (("bookingType" = ANY (ARRAY['ride'::text, 'hotel'::text, 'event'::text])))
);


--
-- Name: chatMessages; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: chatRooms; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: cities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cities (
    id integer NOT NULL,
    name text,
    latitude double precision,
    longitude double precision,
    province text
);


--
-- Name: cities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cities_id_seq OWNED BY public.cities.id;


--
-- Name: driverDocuments; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: driverStats; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: driverVehicles; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: eventManagers; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: events; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: geographic_corridors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.geographic_corridors (
    id integer NOT NULL,
    corridor_name character varying(100) NOT NULL,
    provinces text[] NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: geographic_corridors_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.geographic_corridors_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: geographic_corridors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.geographic_corridors_id_seq OWNED BY public.geographic_corridors.id;


--
-- Name: hotelFinancialReports; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: hotel_bookings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hotel_bookings (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    hotel_id uuid NOT NULL,
    room_type_id uuid NOT NULL,
    room_id uuid,
    guest_name text NOT NULL,
    guest_email text NOT NULL,
    guest_phone text,
    check_in date NOT NULL,
    check_out date NOT NULL,
    nights integer NOT NULL,
    units integer DEFAULT 1 NOT NULL,
    adults integer DEFAULT 2 NOT NULL,
    children integer DEFAULT 0 NOT NULL,
    base_price numeric NOT NULL,
    extra_charges numeric DEFAULT 0,
    total_price numeric NOT NULL,
    status text DEFAULT 'confirmed'::text NOT NULL,
    payment_status text DEFAULT 'pending'::text NOT NULL,
    special_requests text,
    cancellation_reason text,
    cancelled_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    checked_in_at timestamp with time zone,
    checked_out_at timestamp with time zone
);


--
-- Name: hotel_promotions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hotel_promotions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    hotel_id uuid NOT NULL,
    room_type_id uuid,
    name text NOT NULL,
    description text,
    start_date date NOT NULL,
    end_date date NOT NULL,
    discount_percent numeric,
    discount_amount numeric,
    min_nights integer DEFAULT 1,
    promo_code text,
    max_uses integer,
    current_uses integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT hotel_promotions_discount_amount_check CHECK ((discount_amount >= (0)::numeric)),
    CONSTRAINT hotel_promotions_discount_percent_check CHECK (((discount_percent >= (0)::numeric) AND (discount_percent <= (100)::numeric))),
    CONSTRAINT valid_dates CHECK ((end_date >= start_date)),
    CONSTRAINT valid_discount CHECK (((discount_percent IS NOT NULL) OR (discount_amount IS NOT NULL)))
);


--
-- Name: hotel_seasons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hotel_seasons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    hotel_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    start_date date NOT NULL,
    end_date date NOT NULL,
    multiplier numeric DEFAULT 1.0 NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT valid_dates CHECK ((end_date >= start_date)),
    CONSTRAINT valid_multiplier CHECK ((multiplier > (0)::numeric))
);


--
-- Name: hotels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hotels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text,
    description text,
    address text NOT NULL,
    locality character varying(100),
    province character varying(100),
    country character varying(100) DEFAULT 'Mozambique'::character varying,
    lat numeric(10,6),
    lng numeric(10,6),
    location_geom public.geometry(Point,4326),
    images text[],
    amenities text[],
    contact_email text,
    contact_phone text,
    host_id text NOT NULL,
    check_in_time time without time zone DEFAULT '14:00:00'::time without time zone,
    check_out_time time without time zone DEFAULT '12:00:00'::time without time zone,
    policies text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    geom public.geometry(Point,4326)
);


--
-- Name: legacy_accommodations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.legacy_accommodations (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT accommodations_id_not_null NOT NULL,
    name text CONSTRAINT accommodations_name_not_null NOT NULL,
    type text CONSTRAINT accommodations_type_not_null NOT NULL,
    "hostId" text,
    address text CONSTRAINT accommodations_address_not_null NOT NULL,
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


--
-- Name: legacy_hotelRooms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."legacy_hotelRooms" (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT "hotelRooms_id_not_null" NOT NULL,
    "accommodationId" uuid CONSTRAINT "hotelRooms_accommodationId_not_null" NOT NULL,
    "roomNumber" text CONSTRAINT "hotelRooms_roomNumber_not_null" NOT NULL,
    "roomType" text CONSTRAINT "hotelRooms_roomType_not_null" NOT NULL,
    description text,
    images text[] DEFAULT '{}'::text[],
    "pricePerNight" numeric(8,2) CONSTRAINT "hotelRooms_pricePerNight_not_null" NOT NULL,
    "weekendPrice" numeric(8,2),
    "holidayPrice" numeric(8,2),
    "maxOccupancy" integer DEFAULT 2 CONSTRAINT "hotelRooms_maxOccupancy_not_null" NOT NULL,
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


--
-- Name: legacy_roomTypes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."legacy_roomTypes" (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT "roomTypes_id_not_null" NOT NULL,
    "accommodationId" uuid CONSTRAINT "roomTypes_accommodationId_not_null" NOT NULL,
    name text CONSTRAINT "roomTypes_name_not_null" NOT NULL,
    type text DEFAULT 'standard'::text CONSTRAINT "roomTypes_type_not_null" NOT NULL,
    "pricePerNight" numeric(8,2) CONSTRAINT "roomTypes_pricePerNight_not_null" NOT NULL,
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


--
-- Name: loyaltyProgram; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: loyaltyRewards; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: mozambique_admin_level0; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: mozambique_admin_level0_ogc_fid_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.mozambique_admin_level0_ogc_fid_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: mozambique_admin_level0_ogc_fid_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.mozambique_admin_level0_ogc_fid_seq OWNED BY public.mozambique_admin_level0.ogc_fid;


--
-- Name: mozambique_admin_level1; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: mozambique_admin_level1_ogc_fid_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.mozambique_admin_level1_ogc_fid_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: mozambique_admin_level1_ogc_fid_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.mozambique_admin_level1_ogc_fid_seq OWNED BY public.mozambique_admin_level1.ogc_fid;


--
-- Name: mozambique_locations; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: TABLE mozambique_locations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.mozambique_locations IS 'Localidades de Moçambique extraídas do OpenStreetMap (city/town/village)';


--
-- Name: COLUMN mozambique_locations.type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.mozambique_locations.type IS 'Tipo de localidade do OSM: city, town, village';


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: osm2pgsql_properties; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.osm2pgsql_properties (
    property text NOT NULL,
    value text NOT NULL
);


--
-- Name: partnershipApplications; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: partnershipProposals; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: pickupRequests; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: planet_osm_line; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: planet_osm_nodes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.planet_osm_nodes (
    id bigint NOT NULL,
    lat integer NOT NULL,
    lon integer NOT NULL,
    tags jsonb
);


--
-- Name: planet_osm_point; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: planet_osm_polygon; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: planet_osm_rels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.planet_osm_rels (
    id bigint NOT NULL,
    members jsonb NOT NULL,
    tags jsonb
);


--
-- Name: planet_osm_roads; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: planet_osm_ways; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.planet_osm_ways (
    id bigint NOT NULL,
    nodes bigint[] NOT NULL,
    tags jsonb
);


--
-- Name: pointsHistory; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: priceNegotiations; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: priceRegulations; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: province_ordering; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.province_ordering (
    province text NOT NULL,
    order_index integer NOT NULL,
    region text NOT NULL
);


--
-- Name: rate_plan_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rate_plan_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rate_plan_id uuid NOT NULL,
    room_type_id uuid,
    name text NOT NULL,
    type character varying(50) NOT NULL,
    from_date date,
    to_date date,
    days_of_week integer[],
    apply_if_available_less_than integer,
    price_modifier numeric(10,2),
    price_multiplier numeric(5,3) DEFAULT 1.000,
    min_stay integer,
    max_stay integer,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: rate_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rate_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    hotel_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    type character varying(50) DEFAULT 'public'::character varying,
    is_active boolean DEFAULT true,
    cancellation_policy text,
    payment_requirements text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: ratings; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: rewardRedemptions; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: rides; Type: TABLE; Schema: public; Owner: -
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
    vehicle_uuid uuid,
    route_geom public.geography(LineString,4326)
);


--
-- Name: roomTypes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."roomTypes" (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT "roomTypes_id_not_null1" NOT NULL,
    "accommodationId" uuid CONSTRAINT "roomTypes_accommodationId_not_null1" NOT NULL,
    name text CONSTRAINT "roomTypes_name_not_null1" NOT NULL,
    type text DEFAULT 'standard'::text CONSTRAINT "roomTypes_type_not_null1" NOT NULL,
    "pricePerNight" numeric(8,2) CONSTRAINT "roomTypes_pricePerNight_not_null1" NOT NULL,
    description text,
    "maxOccupancy" integer DEFAULT 2,
    "bedType" text,
    "bedCount" integer DEFAULT 1,
    amenities text[] DEFAULT '{}'::text[],
    images text[] DEFAULT '{}'::text[],
    "isAvailable" boolean DEFAULT true,
    status public.status DEFAULT 'active'::public.status,
    "createdAt" timestamp without time zone DEFAULT now(),
    "updatedAt" timestamp without time zone DEFAULT now()
);


--
-- Name: room_availability; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.room_availability (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    hotel_id uuid NOT NULL,
    room_type_id uuid NOT NULL,
    date date NOT NULL,
    remaining_units integer DEFAULT 0 CONSTRAINT room_availability_available_units_not_null NOT NULL,
    price numeric(10,2) NOT NULL,
    stop_sell boolean DEFAULT false,
    min_stay integer DEFAULT 1,
    max_stay integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    min_nights integer,
    blocked_reason text,
    max_available_units integer
);


--
-- Name: room_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.room_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    hotel_id uuid NOT NULL,
    name text NOT NULL,
    code character varying(50),
    description text,
    base_price numeric(10,2) NOT NULL,
    extra_adult_price numeric(10,2) DEFAULT 0,
    extra_child_price numeric(10,2) DEFAULT 0,
    max_occupancy integer DEFAULT 2 NOT NULL,
    base_occupancy integer DEFAULT 2,
    amenities text[],
    images text[],
    total_units integer DEFAULT 1 NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    base_price_low numeric,
    base_price_high numeric,
    min_nights_default integer DEFAULT 1,
    extra_night_price numeric
);


--
-- Name: rooms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rooms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    hotel_id uuid NOT NULL,
    room_type_id uuid,
    room_number character varying(20) NOT NULL,
    floor integer,
    status character varying(20) DEFAULT 'available'::character varying,
    features text[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    sid character varying NOT NULL,
    sess jsonb NOT NULL,
    expire timestamp without time zone NOT NULL
);


--
-- Name: systemSettings; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: TABLE users; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.users IS 'Users table with Firebase-compatible TEXT IDs';


--
-- Name: vehicles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vehicles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    driver_id text NOT NULL,
    plate_number character varying(20) NOT NULL,
    plate_number_raw character varying(20) NOT NULL,
    make character varying(100) NOT NULL,
    model character varying(100) NOT NULL,
    color character varying(50) NOT NULL,
    year integer,
    vehicle_type character varying(50) NOT NULL,
    max_passengers integer NOT NULL,
    features text[],
    photo_url text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT vehicles_max_passengers_check CHECK (((max_passengers > 0) AND (max_passengers <= 50)))
);


--
-- Name: cities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cities ALTER COLUMN id SET DEFAULT nextval('public.cities_id_seq'::regclass);


--
-- Name: geographic_corridors id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geographic_corridors ALTER COLUMN id SET DEFAULT nextval('public.geographic_corridors_id_seq'::regclass);


--
-- Name: mozambique_admin_level0 ogc_fid; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mozambique_admin_level0 ALTER COLUMN ogc_fid SET DEFAULT nextval('public.mozambique_admin_level0_ogc_fid_seq'::regclass);


--
-- Name: mozambique_admin_level1 ogc_fid; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mozambique_admin_level1 ALTER COLUMN ogc_fid SET DEFAULT nextval('public.mozambique_admin_level1_ogc_fid_seq'::regclass);


--
-- Name: legacy_accommodations accommodations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legacy_accommodations
    ADD CONSTRAINT accommodations_pkey PRIMARY KEY (id);


--
-- Name: accommodations accommodations_pkey1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accommodations
    ADD CONSTRAINT accommodations_pkey1 PRIMARY KEY (id);


--
-- Name: adminActions adminActions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."adminActions"
    ADD CONSTRAINT "adminActions_pkey" PRIMARY KEY (id);


--
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);


--
-- Name: chatMessages chatMessages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."chatMessages"
    ADD CONSTRAINT "chatMessages_pkey" PRIMARY KEY (id);


--
-- Name: chatRooms chatRooms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."chatRooms"
    ADD CONSTRAINT "chatRooms_pkey" PRIMARY KEY (id);


--
-- Name: cities cities_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cities
    ADD CONSTRAINT cities_name_key UNIQUE (name);


--
-- Name: cities cities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cities
    ADD CONSTRAINT cities_pkey PRIMARY KEY (id);


--
-- Name: driverDocuments driverDocuments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."driverDocuments"
    ADD CONSTRAINT "driverDocuments_pkey" PRIMARY KEY (id);


--
-- Name: driverStats driverStats_driverId_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."driverStats"
    ADD CONSTRAINT "driverStats_driverId_unique" UNIQUE ("driverId");


--
-- Name: driverStats driverStats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."driverStats"
    ADD CONSTRAINT "driverStats_pkey" PRIMARY KEY (id);


--
-- Name: driverVehicles driverVehicles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."driverVehicles"
    ADD CONSTRAINT "driverVehicles_pkey" PRIMARY KEY (id);


--
-- Name: driverVehicles driverVehicles_vehiclePlate_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."driverVehicles"
    ADD CONSTRAINT "driverVehicles_vehiclePlate_key" UNIQUE ("vehiclePlate");


--
-- Name: eventManagers eventManagers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."eventManagers"
    ADD CONSTRAINT "eventManagers_pkey" PRIMARY KEY (id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: geographic_corridors geographic_corridors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geographic_corridors
    ADD CONSTRAINT geographic_corridors_pkey PRIMARY KEY (id);


--
-- Name: hotelFinancialReports hotelFinancialReports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."hotelFinancialReports"
    ADD CONSTRAINT "hotelFinancialReports_pkey" PRIMARY KEY (id);


--
-- Name: legacy_hotelRooms hotelRooms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."legacy_hotelRooms"
    ADD CONSTRAINT "hotelRooms_pkey" PRIMARY KEY (id);


--
-- Name: hotel_bookings hotel_bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hotel_bookings
    ADD CONSTRAINT hotel_bookings_pkey PRIMARY KEY (id);


--
-- Name: hotel_promotions hotel_promotions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hotel_promotions
    ADD CONSTRAINT hotel_promotions_pkey PRIMARY KEY (id);


--
-- Name: hotel_promotions hotel_promotions_promo_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hotel_promotions
    ADD CONSTRAINT hotel_promotions_promo_code_key UNIQUE (promo_code);


--
-- Name: hotel_seasons hotel_seasons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hotel_seasons
    ADD CONSTRAINT hotel_seasons_pkey PRIMARY KEY (id);


--
-- Name: hotels hotels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hotels
    ADD CONSTRAINT hotels_pkey PRIMARY KEY (id);


--
-- Name: hotels hotels_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hotels
    ADD CONSTRAINT hotels_slug_key UNIQUE (slug);


--
-- Name: loyaltyProgram loyaltyProgram_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."loyaltyProgram"
    ADD CONSTRAINT "loyaltyProgram_pkey" PRIMARY KEY (id);


--
-- Name: loyaltyRewards loyaltyRewards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."loyaltyRewards"
    ADD CONSTRAINT "loyaltyRewards_pkey" PRIMARY KEY (id);


--
-- Name: mozambique_admin_level0 mozambique_admin_level0_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mozambique_admin_level0
    ADD CONSTRAINT mozambique_admin_level0_pkey PRIMARY KEY (ogc_fid);


--
-- Name: mozambique_admin_level1 mozambique_admin_level1_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mozambique_admin_level1
    ADD CONSTRAINT mozambique_admin_level1_pkey PRIMARY KEY (ogc_fid);


--
-- Name: mozambique_locations mozambique_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mozambique_locations
    ADD CONSTRAINT mozambique_locations_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: osm2pgsql_properties osm2pgsql_properties_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.osm2pgsql_properties
    ADD CONSTRAINT osm2pgsql_properties_pkey PRIMARY KEY (property);


--
-- Name: partnershipApplications partnershipApplications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."partnershipApplications"
    ADD CONSTRAINT "partnershipApplications_pkey" PRIMARY KEY (id);


--
-- Name: partnershipProposals partnershipProposals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."partnershipProposals"
    ADD CONSTRAINT "partnershipProposals_pkey" PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: pickupRequests pickupRequests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."pickupRequests"
    ADD CONSTRAINT "pickupRequests_pkey" PRIMARY KEY (id);


--
-- Name: planet_osm_nodes planet_osm_nodes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planet_osm_nodes
    ADD CONSTRAINT planet_osm_nodes_pkey PRIMARY KEY (id);


--
-- Name: planet_osm_rels planet_osm_rels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planet_osm_rels
    ADD CONSTRAINT planet_osm_rels_pkey PRIMARY KEY (id);


--
-- Name: planet_osm_ways planet_osm_ways_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planet_osm_ways
    ADD CONSTRAINT planet_osm_ways_pkey PRIMARY KEY (id);


--
-- Name: pointsHistory pointsHistory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."pointsHistory"
    ADD CONSTRAINT "pointsHistory_pkey" PRIMARY KEY (id);


--
-- Name: priceNegotiations priceNegotiations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."priceNegotiations"
    ADD CONSTRAINT "priceNegotiations_pkey" PRIMARY KEY (id);


--
-- Name: priceRegulations priceRegulations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."priceRegulations"
    ADD CONSTRAINT "priceRegulations_pkey" PRIMARY KEY (id);


--
-- Name: province_ordering province_ordering_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.province_ordering
    ADD CONSTRAINT province_ordering_pkey PRIMARY KEY (province);


--
-- Name: rate_plan_rules rate_plan_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rate_plan_rules
    ADD CONSTRAINT rate_plan_rules_pkey PRIMARY KEY (id);


--
-- Name: rate_plans rate_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rate_plans
    ADD CONSTRAINT rate_plans_pkey PRIMARY KEY (id);


--
-- Name: ratings ratings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ratings
    ADD CONSTRAINT ratings_pkey PRIMARY KEY (id);


--
-- Name: rewardRedemptions rewardRedemptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."rewardRedemptions"
    ADD CONSTRAINT "rewardRedemptions_pkey" PRIMARY KEY (id);


--
-- Name: rides rides_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rides
    ADD CONSTRAINT rides_pkey PRIMARY KEY (id);


--
-- Name: legacy_roomTypes roomTypes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."legacy_roomTypes"
    ADD CONSTRAINT "roomTypes_pkey" PRIMARY KEY (id);


--
-- Name: roomTypes roomTypes_pkey1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."roomTypes"
    ADD CONSTRAINT "roomTypes_pkey1" PRIMARY KEY (id);


--
-- Name: room_availability room_availability_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.room_availability
    ADD CONSTRAINT room_availability_pkey PRIMARY KEY (id);


--
-- Name: room_availability room_availability_room_type_id_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.room_availability
    ADD CONSTRAINT room_availability_room_type_id_date_key UNIQUE (room_type_id, date);


--
-- Name: room_types room_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.room_types
    ADD CONSTRAINT room_types_pkey PRIMARY KEY (id);


--
-- Name: rooms rooms_hotel_id_room_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT rooms_hotel_id_room_number_key UNIQUE (hotel_id, room_number);


--
-- Name: rooms rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT rooms_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (sid);


--
-- Name: systemSettings systemSettings_key_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."systemSettings"
    ADD CONSTRAINT "systemSettings_key_unique" UNIQUE (key);


--
-- Name: systemSettings systemSettings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."systemSettings"
    ADD CONSTRAINT "systemSettings_pkey" PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_phone_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_phone_unique UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: vehicles vehicles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_pkey PRIMARY KEY (id);


--
-- Name: vehicles vehicles_plate_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_plate_number_key UNIQUE (plate_number);


--
-- Name: accommodations_geo_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accommodations_geo_idx ON public.legacy_accommodations USING btree (lat, lng);


--
-- Name: accommodations_location_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accommodations_location_idx ON public.legacy_accommodations USING btree (locality, province);


--
-- Name: accommodations_province_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accommodations_province_idx ON public.legacy_accommodations USING btree (province);


--
-- Name: accommodations_search_address_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accommodations_search_address_idx ON public.legacy_accommodations USING btree (address);


--
-- Name: accommodations_search_locality_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accommodations_search_locality_idx ON public.legacy_accommodations USING btree (locality);


--
-- Name: accommodations_search_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accommodations_search_name_idx ON public.legacy_accommodations USING btree (name);


--
-- Name: bookings_passenger_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bookings_passenger_idx ON public.bookings USING btree ("passengerId");


--
-- Name: bookings_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bookings_status_idx ON public.bookings USING btree (status);


--
-- Name: bookings_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bookings_type_idx ON public.bookings USING btree (type);


--
-- Name: chat_messages_from_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX chat_messages_from_user_idx ON public."chatMessages" USING btree ("fromUserId");


--
-- Name: chat_messages_room_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX chat_messages_room_idx ON public."chatMessages" USING btree ("chatRoomId");


--
-- Name: chat_rooms_participants_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX chat_rooms_participants_idx ON public."chatRooms" USING btree ("participantOneId", "participantTwoId");


--
-- Name: events_location_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX events_location_idx ON public.events USING btree (locality, province);


--
-- Name: events_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX events_status_idx ON public.events USING btree (status);


--
-- Name: hotels_host_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX hotels_host_idx ON public.hotels USING btree (host_id);


--
-- Name: hotels_location_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX hotels_location_idx ON public.hotels USING gist (location_geom);


--
-- Name: hotels_province_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX hotels_province_idx ON public.hotels USING btree (province);


--
-- Name: idx_accommodations_address; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_accommodations_address ON public.legacy_accommodations USING gin (public.f_unaccent(address) public.gin_trgm_ops);


--
-- Name: idx_accommodations_available; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_accommodations_available ON public.accommodations USING btree ("isAvailable");


--
-- Name: idx_accommodations_geo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_accommodations_geo ON public.accommodations USING btree (lat, lng);


--
-- Name: idx_accommodations_host; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_accommodations_host ON public.accommodations USING btree ("hostId");


--
-- Name: idx_accommodations_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_accommodations_location ON public.accommodations USING btree (locality, province);


--
-- Name: idx_accommodations_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_accommodations_name ON public.legacy_accommodations USING gin (public.f_unaccent(name) public.gin_trgm_ops);


--
-- Name: idx_accommodations_province; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_accommodations_province ON public.legacy_accommodations USING gin (public.f_unaccent((province)::text) public.gin_trgm_ops);


--
-- Name: idx_bookings_accommodation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_accommodation ON public.bookings USING btree ("accommodationId", "checkInDate", "checkOutDate");


--
-- Name: idx_bookings_accommodation_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_accommodation_dates ON public.bookings USING btree ("accommodationId", "checkInDate", "checkOutDate");


--
-- Name: idx_bookings_booking_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_booking_type ON public.bookings USING btree ("bookingType");


--
-- Name: idx_bookings_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_dates ON public.bookings USING btree ("checkInDate", "checkOutDate");


--
-- Name: idx_bookings_room_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_room_id ON public.bookings USING btree ("roomId");


--
-- Name: idx_bookings_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_status ON public.bookings USING btree (status);


--
-- Name: idx_bookings_type_hotel; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_type_hotel ON public.bookings USING btree (type) WHERE ((type)::text = 'hotel'::text);


--
-- Name: idx_driverVehicles_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_driverVehicles_active" ON public."driverVehicles" USING btree ("isActive");


--
-- Name: idx_driverVehicles_driverId; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_driverVehicles_driverId" ON public."driverVehicles" USING btree ("driverId");


--
-- Name: idx_driverVehicles_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_driverVehicles_type" ON public."driverVehicles" USING btree ("vehicleType");


--
-- Name: idx_hotel_bookings_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hotel_bookings_created_at ON public.hotel_bookings USING btree (created_at);


--
-- Name: idx_hotel_bookings_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hotel_bookings_dates ON public.hotel_bookings USING btree (check_in, check_out);


--
-- Name: idx_hotel_bookings_guest_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hotel_bookings_guest_email ON public.hotel_bookings USING btree (guest_email);


--
-- Name: idx_hotel_bookings_hotel_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hotel_bookings_hotel_id ON public.hotel_bookings USING btree (hotel_id);


--
-- Name: idx_hotel_bookings_payment_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hotel_bookings_payment_status ON public.hotel_bookings USING btree (payment_status);


--
-- Name: idx_hotel_bookings_room_type_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hotel_bookings_room_type_id ON public.hotel_bookings USING btree (room_type_id);


--
-- Name: idx_hotel_bookings_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hotel_bookings_status ON public.hotel_bookings USING btree (status);


--
-- Name: idx_hotel_promotions_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hotel_promotions_code ON public.hotel_promotions USING btree (promo_code) WHERE (promo_code IS NOT NULL);


--
-- Name: idx_hotel_promotions_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hotel_promotions_dates ON public.hotel_promotions USING btree (start_date, end_date) WHERE (is_active = true);


--
-- Name: idx_hotel_promotions_hotel; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hotel_promotions_hotel ON public.hotel_promotions USING btree (hotel_id);


--
-- Name: idx_hotel_seasons_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hotel_seasons_dates ON public.hotel_seasons USING btree (start_date, end_date) WHERE (is_active = true);


--
-- Name: idx_hotel_seasons_hotel; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hotel_seasons_hotel ON public.hotel_seasons USING btree (hotel_id);


--
-- Name: idx_hotels_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hotels_active ON public.hotels USING btree (is_active);


--
-- Name: idx_hotels_host; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hotels_host ON public.hotels USING btree (host_id);


--
-- Name: idx_hotels_host_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hotels_host_id ON public.hotels USING btree (host_id);


--
-- Name: idx_hotels_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hotels_location ON public.hotels USING gist (location_geom);


--
-- Name: idx_hotels_province; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hotels_province ON public.hotels USING btree (province);


--
-- Name: idx_hotels_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hotels_slug ON public.hotels USING btree (slug);


--
-- Name: idx_locations_name_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_locations_name_gin ON public.mozambique_locations USING gin (name public.gin_trgm_ops);


--
-- Name: idx_locations_name_province; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_locations_name_province ON public.mozambique_locations USING btree (name, province);


--
-- Name: idx_locations_province; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_locations_province ON public.mozambique_locations USING btree (province);


--
-- Name: idx_locations_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_locations_type ON public.mozambique_locations USING btree (type);


--
-- Name: idx_moz_locations_province; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_moz_locations_province ON public.mozambique_locations USING gin (public.f_unaccent((province)::text) public.gin_trgm_ops);


--
-- Name: idx_moz_locations_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_moz_locations_search ON public.mozambique_locations USING gin (public.f_unaccent((name)::text) public.gin_trgm_ops);


--
-- Name: idx_mozambique_locations_geom; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mozambique_locations_geom ON public.mozambique_locations USING gist (geom);


--
-- Name: idx_rides_from_city; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rides_from_city ON public.rides USING gin ("fromCity" public.gin_trgm_ops);


--
-- Name: idx_rides_from_geom; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rides_from_geom ON public.rides USING gist (from_geom);


--
-- Name: idx_rides_from_geom_gist; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rides_from_geom_gist ON public.rides USING gist (from_geom);


--
-- Name: idx_rides_from_province; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rides_from_province ON public.rides USING gin ("fromProvince" public.gin_trgm_ops);


--
-- Name: idx_rides_status_departure; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rides_status_departure ON public.rides USING btree (status, "departureDate") WHERE ((status)::text = 'available'::text);


--
-- Name: idx_rides_to_city; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rides_to_city ON public.rides USING gin ("toCity" public.gin_trgm_ops);


--
-- Name: idx_rides_to_geom; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rides_to_geom ON public.rides USING gist (to_geom);


--
-- Name: idx_rides_to_geom_gist; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rides_to_geom_gist ON public.rides USING gist (to_geom);


--
-- Name: idx_rides_to_province; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rides_to_province ON public.rides USING gin ("toProvince" public.gin_trgm_ops);


--
-- Name: idx_room_availability_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_room_availability_date ON public.room_availability USING btree (date);


--
-- Name: idx_room_availability_hotel; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_room_availability_hotel ON public.room_availability USING btree (hotel_id, date);


--
-- Name: idx_room_availability_hotel_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_room_availability_hotel_date ON public.room_availability USING btree (hotel_id, date);


--
-- Name: idx_room_availability_main; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_room_availability_main ON public.room_availability USING btree (room_type_id, date);


--
-- Name: idx_room_availability_room_type_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_room_availability_room_type_date ON public.room_availability USING btree (room_type_id, date);


--
-- Name: idx_room_types_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_room_types_active ON public.room_types USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_room_types_hotel; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_room_types_hotel ON public.room_types USING btree (hotel_id);


--
-- Name: idx_rooms_hotel; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rooms_hotel ON public.rooms USING btree (hotel_id);


--
-- Name: idx_rooms_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rooms_number ON public.rooms USING btree (hotel_id, room_number);


--
-- Name: idx_rooms_room_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rooms_room_type ON public.rooms USING btree (room_type_id);


--
-- Name: idx_roomtypes_accommodation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_roomtypes_accommodation ON public."roomTypes" USING btree ("accommodationId");


--
-- Name: idx_roomtypes_available; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_roomtypes_available ON public."roomTypes" USING btree ("isAvailable") WHERE ("isAvailable" = true);


--
-- Name: idx_vehicles_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vehicles_active ON public.vehicles USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_vehicles_driver_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vehicles_driver_id ON public.vehicles USING btree (driver_id);


--
-- Name: idx_vehicles_plate; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vehicles_plate ON public.vehicles USING btree (plate_number);


--
-- Name: locations_geo_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX locations_geo_idx ON public.mozambique_locations USING btree (lat, lng);


--
-- Name: locations_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX locations_name_idx ON public.mozambique_locations USING btree (name);


--
-- Name: locations_province_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX locations_province_idx ON public.mozambique_locations USING btree (province);


--
-- Name: locations_search_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX locations_search_idx ON public.mozambique_locations USING btree (name, province, type);


--
-- Name: locations_text_search_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX locations_text_search_idx ON public.mozambique_locations USING btree (name);


--
-- Name: locations_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX locations_type_idx ON public.mozambique_locations USING btree (type);


--
-- Name: mozambique_admin_level0_wkb_geometry_geom_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mozambique_admin_level0_wkb_geometry_geom_idx ON public.mozambique_admin_level0 USING gist (wkb_geometry);


--
-- Name: mozambique_admin_level1_wkb_geometry_geom_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mozambique_admin_level1_wkb_geometry_geom_idx ON public.mozambique_admin_level1 USING gist (wkb_geometry);


--
-- Name: notifications_is_read_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_is_read_idx ON public.notifications USING btree ("isRead");


--
-- Name: notifications_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_user_idx ON public.notifications USING btree ("userId");


--
-- Name: partnership_applications_driver_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX partnership_applications_driver_idx ON public."partnershipApplications" USING btree ("driverId");


--
-- Name: partnership_applications_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX partnership_applications_status_idx ON public."partnershipApplications" USING btree (status);


--
-- Name: partnership_proposals_hotel_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX partnership_proposals_hotel_idx ON public."partnershipProposals" USING btree ("hotelId");


--
-- Name: partnership_proposals_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX partnership_proposals_status_idx ON public."partnershipProposals" USING btree (status);


--
-- Name: planet_osm_line_osm_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX planet_osm_line_osm_id_idx ON public.planet_osm_line USING btree (osm_id);


--
-- Name: planet_osm_line_way_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX planet_osm_line_way_idx ON public.planet_osm_line USING gist (way);


--
-- Name: planet_osm_point_osm_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX planet_osm_point_osm_id_idx ON public.planet_osm_point USING btree (osm_id);


--
-- Name: planet_osm_point_way_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX planet_osm_point_way_idx ON public.planet_osm_point USING gist (way);


--
-- Name: planet_osm_polygon_osm_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX planet_osm_polygon_osm_id_idx ON public.planet_osm_polygon USING btree (osm_id);


--
-- Name: planet_osm_polygon_way_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX planet_osm_polygon_way_idx ON public.planet_osm_polygon USING gist (way);


--
-- Name: planet_osm_rels_node_members_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX planet_osm_rels_node_members_idx ON public.planet_osm_rels USING gin (public.planet_osm_member_ids(members, 'N'::character(1))) WITH (fastupdate=off);


--
-- Name: planet_osm_rels_way_members_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX planet_osm_rels_way_members_idx ON public.planet_osm_rels USING gin (public.planet_osm_member_ids(members, 'W'::character(1))) WITH (fastupdate=off);


--
-- Name: planet_osm_roads_osm_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX planet_osm_roads_osm_id_idx ON public.planet_osm_roads USING btree (osm_id);


--
-- Name: planet_osm_roads_way_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX planet_osm_roads_way_idx ON public.planet_osm_roads USING gist (way);


--
-- Name: planet_osm_ways_nodes_bucket_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX planet_osm_ways_nodes_bucket_idx ON public.planet_osm_ways USING gin (public.planet_osm_index_bucket(nodes)) WITH (fastupdate=off);


--
-- Name: rate_plan_rules_dates_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX rate_plan_rules_dates_idx ON public.rate_plan_rules USING btree (from_date, to_date);


--
-- Name: rate_plans_hotel_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX rate_plans_hotel_idx ON public.rate_plans USING btree (hotel_id);


--
-- Name: ratings_service_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ratings_service_type_idx ON public.ratings USING btree ("serviceType");


--
-- Name: ratings_to_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ratings_to_user_idx ON public.ratings USING btree ("toUserId");


--
-- Name: rides_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX rides_status_idx ON public.rides USING btree (status);


--
-- Name: room_availability_hotel_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX room_availability_hotel_date_idx ON public.room_availability USING btree (hotel_id, date);


--
-- Name: room_availability_room_type_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX room_availability_room_type_date_idx ON public.room_availability USING btree (room_type_id, date);


--
-- Name: room_types_hotel_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX room_types_hotel_idx ON public.room_types USING btree (hotel_id);


--
-- Name: rooms_hotel_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX rooms_hotel_idx ON public.rooms USING btree (hotel_id);


--
-- Name: rooms_room_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX rooms_room_type_idx ON public.rooms USING btree (room_type_id);


--
-- Name: sessions_expire_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sessions_expire_idx ON public.sessions USING btree (expire);


--
-- Name: planet_osm_line planet_osm_line_osm2pgsql_valid; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER planet_osm_line_osm2pgsql_valid BEFORE INSERT OR UPDATE ON public.planet_osm_line FOR EACH ROW EXECUTE FUNCTION public.planet_osm_line_osm2pgsql_valid();


--
-- Name: planet_osm_point planet_osm_point_osm2pgsql_valid; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER planet_osm_point_osm2pgsql_valid BEFORE INSERT OR UPDATE ON public.planet_osm_point FOR EACH ROW EXECUTE FUNCTION public.planet_osm_point_osm2pgsql_valid();


--
-- Name: planet_osm_polygon planet_osm_polygon_osm2pgsql_valid; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER planet_osm_polygon_osm2pgsql_valid BEFORE INSERT OR UPDATE ON public.planet_osm_polygon FOR EACH ROW EXECUTE FUNCTION public.planet_osm_polygon_osm2pgsql_valid();


--
-- Name: planet_osm_roads planet_osm_roads_osm2pgsql_valid; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER planet_osm_roads_osm2pgsql_valid BEFORE INSERT OR UPDATE ON public.planet_osm_roads FOR EACH ROW EXECUTE FUNCTION public.planet_osm_roads_osm2pgsql_valid();


--
-- Name: rides trigger_auto_fill_provinces; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_auto_fill_provinces BEFORE INSERT OR UPDATE ON public.rides FOR EACH ROW EXECUTE FUNCTION public.auto_fill_provinces();


--
-- Name: hotels trigger_update_hotel_geometry; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_hotel_geometry BEFORE INSERT OR UPDATE ON public.hotels FOR EACH ROW EXECUTE FUNCTION public.update_hotel_geometry();


--
-- Name: bookings update_bookings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: hotels update_hotel_geom_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_hotel_geom_trigger BEFORE INSERT OR UPDATE OF lat, lng ON public.hotels FOR EACH ROW EXECUTE FUNCTION public.update_hotel_geometry();


--
-- Name: hotels update_hotels_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_hotels_updated_at BEFORE UPDATE ON public.hotels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: rate_plans update_rate_plans_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_rate_plans_updated_at BEFORE UPDATE ON public.rate_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: room_types update_room_types_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_room_types_updated_at BEFORE UPDATE ON public.room_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: rooms update_rooms_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON public.rooms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: legacy_accommodations accommodations_hostId_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legacy_accommodations
    ADD CONSTRAINT "accommodations_hostId_users_id_fk" FOREIGN KEY ("hostId") REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: adminActions adminActions_adminId_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."adminActions"
    ADD CONSTRAINT "adminActions_adminId_users_id_fk" FOREIGN KEY ("adminId") REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: adminActions adminActions_targetUserId_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."adminActions"
    ADD CONSTRAINT "adminActions_targetUserId_users_id_fk" FOREIGN KEY ("targetUserId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: bookings bookings_accommodationId_accommodations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT "bookings_accommodationId_accommodations_id_fk" FOREIGN KEY ("accommodationId") REFERENCES public.legacy_accommodations(id);


--
-- Name: bookings bookings_hotelRoomId_hotelRooms_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT "bookings_hotelRoomId_hotelRooms_id_fk" FOREIGN KEY ("hotelRoomId") REFERENCES public."legacy_hotelRooms"(id);


--
-- Name: bookings bookings_passengerId_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT "bookings_passengerId_users_id_fk" FOREIGN KEY ("passengerId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: bookings bookings_rideId_rides_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT "bookings_rideId_rides_id_fk" FOREIGN KEY ("rideId") REFERENCES public.rides(id);


--
-- Name: bookings bookings_roomId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT "bookings_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES public."legacy_hotelRooms"(id);


--
-- Name: chatMessages chatMessages_chatRoomId_chatRooms_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."chatMessages"
    ADD CONSTRAINT "chatMessages_chatRoomId_chatRooms_id_fk" FOREIGN KEY ("chatRoomId") REFERENCES public."chatRooms"(id);


--
-- Name: chatMessages chatMessages_fromUserId_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."chatMessages"
    ADD CONSTRAINT "chatMessages_fromUserId_users_id_fk" FOREIGN KEY ("fromUserId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: chatMessages chatMessages_toUserId_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."chatMessages"
    ADD CONSTRAINT "chatMessages_toUserId_users_id_fk" FOREIGN KEY ("toUserId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: chatRooms chatRooms_participantOneId_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."chatRooms"
    ADD CONSTRAINT "chatRooms_participantOneId_users_id_fk" FOREIGN KEY ("participantOneId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: chatRooms chatRooms_participantTwoId_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."chatRooms"
    ADD CONSTRAINT "chatRooms_participantTwoId_users_id_fk" FOREIGN KEY ("participantTwoId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: driverDocuments driverDocuments_driverId_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."driverDocuments"
    ADD CONSTRAINT "driverDocuments_driverId_users_id_fk" FOREIGN KEY ("driverId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: driverStats driverStats_driverId_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."driverStats"
    ADD CONSTRAINT "driverStats_driverId_users_id_fk" FOREIGN KEY ("driverId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: driverVehicles driverVehicles_driverId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."driverVehicles"
    ADD CONSTRAINT "driverVehicles_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: eventManagers eventManagers_userId_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."eventManagers"
    ADD CONSTRAINT "eventManagers_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: events events_managerId_eventManagers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT "events_managerId_eventManagers_id_fk" FOREIGN KEY ("managerId") REFERENCES public."eventManagers"(id);


--
-- Name: events events_organizerId_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT "events_organizerId_users_id_fk" FOREIGN KEY ("organizerId") REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: hotelFinancialReports hotelFinancialReports_accommodationId_accommodations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."hotelFinancialReports"
    ADD CONSTRAINT "hotelFinancialReports_accommodationId_accommodations_id_fk" FOREIGN KEY ("accommodationId") REFERENCES public.legacy_accommodations(id);


--
-- Name: legacy_hotelRooms hotelRooms_accommodationId_accommodations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."legacy_hotelRooms"
    ADD CONSTRAINT "hotelRooms_accommodationId_accommodations_id_fk" FOREIGN KEY ("accommodationId") REFERENCES public.legacy_accommodations(id);


--
-- Name: hotel_bookings hotel_bookings_hotel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hotel_bookings
    ADD CONSTRAINT hotel_bookings_hotel_id_fkey FOREIGN KEY (hotel_id) REFERENCES public.hotels(id) ON DELETE CASCADE;


--
-- Name: hotel_bookings hotel_bookings_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hotel_bookings
    ADD CONSTRAINT hotel_bookings_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id);


--
-- Name: hotel_bookings hotel_bookings_room_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hotel_bookings
    ADD CONSTRAINT hotel_bookings_room_type_id_fkey FOREIGN KEY (room_type_id) REFERENCES public.room_types(id) ON DELETE CASCADE;


--
-- Name: hotel_promotions hotel_promotions_hotel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hotel_promotions
    ADD CONSTRAINT hotel_promotions_hotel_id_fkey FOREIGN KEY (hotel_id) REFERENCES public.hotels(id) ON DELETE CASCADE;


--
-- Name: hotel_promotions hotel_promotions_room_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hotel_promotions
    ADD CONSTRAINT hotel_promotions_room_type_id_fkey FOREIGN KEY (room_type_id) REFERENCES public.room_types(id) ON DELETE CASCADE;


--
-- Name: hotel_seasons hotel_seasons_hotel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hotel_seasons
    ADD CONSTRAINT hotel_seasons_hotel_id_fkey FOREIGN KEY (hotel_id) REFERENCES public.hotels(id) ON DELETE CASCADE;


--
-- Name: loyaltyProgram loyaltyProgram_userId_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."loyaltyProgram"
    ADD CONSTRAINT "loyaltyProgram_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_userId_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "notifications_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: partnershipApplications partnershipApplications_driverId_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."partnershipApplications"
    ADD CONSTRAINT "partnershipApplications_driverId_users_id_fk" FOREIGN KEY ("driverId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: partnershipApplications partnershipApplications_proposalId_partnershipProposals_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."partnershipApplications"
    ADD CONSTRAINT "partnershipApplications_proposalId_partnershipProposals_id_fk" FOREIGN KEY ("proposalId") REFERENCES public."partnershipProposals"(id);


--
-- Name: partnershipProposals partnershipProposals_hotelId_accommodations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."partnershipProposals"
    ADD CONSTRAINT "partnershipProposals_hotelId_accommodations_id_fk" FOREIGN KEY ("hotelId") REFERENCES public.legacy_accommodations(id);


--
-- Name: payments payments_bookingid_hotel_bookings_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_bookingid_hotel_bookings_id_fk FOREIGN KEY ("bookingId") REFERENCES public.hotel_bookings(id);


--
-- Name: payments payments_userId_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT "payments_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: pickupRequests pickupRequests_driverId_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."pickupRequests"
    ADD CONSTRAINT "pickupRequests_driverId_users_id_fk" FOREIGN KEY ("driverId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: pickupRequests pickupRequests_passengerId_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."pickupRequests"
    ADD CONSTRAINT "pickupRequests_passengerId_users_id_fk" FOREIGN KEY ("passengerId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: pickupRequests pickupRequests_rideId_rides_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."pickupRequests"
    ADD CONSTRAINT "pickupRequests_rideId_rides_id_fk" FOREIGN KEY ("rideId") REFERENCES public.rides(id);


--
-- Name: pointsHistory pointsHistory_loyaltyId_loyaltyProgram_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."pointsHistory"
    ADD CONSTRAINT "pointsHistory_loyaltyId_loyaltyProgram_id_fk" FOREIGN KEY ("loyaltyId") REFERENCES public."loyaltyProgram"(id);


--
-- Name: pointsHistory pointsHistory_userId_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."pointsHistory"
    ADD CONSTRAINT "pointsHistory_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: priceNegotiations priceNegotiations_driverId_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."priceNegotiations"
    ADD CONSTRAINT "priceNegotiations_driverId_users_id_fk" FOREIGN KEY ("driverId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: priceNegotiations priceNegotiations_passengerId_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."priceNegotiations"
    ADD CONSTRAINT "priceNegotiations_passengerId_users_id_fk" FOREIGN KEY ("passengerId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: priceNegotiations priceNegotiations_rideId_rides_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."priceNegotiations"
    ADD CONSTRAINT "priceNegotiations_rideId_rides_id_fk" FOREIGN KEY ("rideId") REFERENCES public.rides(id);


--
-- Name: rate_plan_rules rate_plan_rules_rate_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rate_plan_rules
    ADD CONSTRAINT rate_plan_rules_rate_plan_id_fkey FOREIGN KEY (rate_plan_id) REFERENCES public.rate_plans(id) ON DELETE CASCADE;


--
-- Name: rate_plan_rules rate_plan_rules_room_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rate_plan_rules
    ADD CONSTRAINT rate_plan_rules_room_type_id_fkey FOREIGN KEY (room_type_id) REFERENCES public.room_types(id);


--
-- Name: rate_plans rate_plans_hotel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rate_plans
    ADD CONSTRAINT rate_plans_hotel_id_fkey FOREIGN KEY (hotel_id) REFERENCES public.hotels(id) ON DELETE CASCADE;


--
-- Name: ratings ratings_fromUserId_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ratings
    ADD CONSTRAINT "ratings_fromUserId_users_id_fk" FOREIGN KEY ("fromUserId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: ratings ratings_toUserId_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ratings
    ADD CONSTRAINT "ratings_toUserId_users_id_fk" FOREIGN KEY ("toUserId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: rewardRedemptions rewardRedemptions_rewardId_loyaltyRewards_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."rewardRedemptions"
    ADD CONSTRAINT "rewardRedemptions_rewardId_loyaltyRewards_id_fk" FOREIGN KEY ("rewardId") REFERENCES public."loyaltyRewards"(id);


--
-- Name: rewardRedemptions rewardRedemptions_userId_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."rewardRedemptions"
    ADD CONSTRAINT "rewardRedemptions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: rides rides_driverId_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rides
    ADD CONSTRAINT "rides_driverId_users_id_fk" FOREIGN KEY ("driverId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: rides rides_vehicle_uuid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rides
    ADD CONSTRAINT rides_vehicle_uuid_fkey FOREIGN KEY (vehicle_uuid) REFERENCES public.vehicles(id) ON DELETE SET NULL;


--
-- Name: legacy_roomTypes roomTypes_accommodationId_accommodations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."legacy_roomTypes"
    ADD CONSTRAINT "roomTypes_accommodationId_accommodations_id_fk" FOREIGN KEY ("accommodationId") REFERENCES public.legacy_accommodations(id) ON DELETE CASCADE;


--
-- Name: roomTypes roomTypes_accommodationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."roomTypes"
    ADD CONSTRAINT "roomTypes_accommodationId_fkey" FOREIGN KEY ("accommodationId") REFERENCES public.accommodations(id) ON DELETE CASCADE;


--
-- Name: room_availability room_availability_hotel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.room_availability
    ADD CONSTRAINT room_availability_hotel_id_fkey FOREIGN KEY (hotel_id) REFERENCES public.hotels(id) ON DELETE CASCADE;


--
-- Name: room_availability room_availability_room_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.room_availability
    ADD CONSTRAINT room_availability_room_type_id_fkey FOREIGN KEY (room_type_id) REFERENCES public.room_types(id) ON DELETE CASCADE;


--
-- Name: room_types room_types_hotel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.room_types
    ADD CONSTRAINT room_types_hotel_id_fkey FOREIGN KEY (hotel_id) REFERENCES public.hotels(id) ON DELETE CASCADE;


--
-- Name: rooms rooms_hotel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT rooms_hotel_id_fkey FOREIGN KEY (hotel_id) REFERENCES public.hotels(id) ON DELETE CASCADE;


--
-- Name: rooms rooms_room_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT rooms_room_type_id_fkey FOREIGN KEY (room_type_id) REFERENCES public.room_types(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict J5LKqygaJeUqlmflmQQNpOjoJ0Is62oDlnMwDBcserHJVRHSH6XPailJmq8Cdef

