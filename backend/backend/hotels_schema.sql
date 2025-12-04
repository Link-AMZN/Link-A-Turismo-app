--
-- PostgreSQL database dump
--

\restrict AfVLcxXb421kAFOgDkjAwiiB7cBTIuXq8bK9qzJaR8PawUNsctSgHQrznfzTRwx

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: hotel_bookings; Type: TABLE; Schema: public; Owner: linka_user
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


ALTER TABLE public.hotel_bookings OWNER TO linka_user;

--
-- Name: hotels; Type: TABLE; Schema: public; Owner: linka_user
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


ALTER TABLE public.hotels OWNER TO linka_user;

--
-- Name: room_availability; Type: TABLE; Schema: public; Owner: linka_user
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


ALTER TABLE public.room_availability OWNER TO linka_user;

--
-- Name: room_types; Type: TABLE; Schema: public; Owner: linka_user
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


ALTER TABLE public.room_types OWNER TO linka_user;

--
-- Name: hotel_bookings hotel_bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public.hotel_bookings
    ADD CONSTRAINT hotel_bookings_pkey PRIMARY KEY (id);


--
-- Name: hotels hotels_pkey; Type: CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public.hotels
    ADD CONSTRAINT hotels_pkey PRIMARY KEY (id);


--
-- Name: hotels hotels_slug_key; Type: CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public.hotels
    ADD CONSTRAINT hotels_slug_key UNIQUE (slug);


--
-- Name: room_availability room_availability_pkey; Type: CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public.room_availability
    ADD CONSTRAINT room_availability_pkey PRIMARY KEY (id);


--
-- Name: room_availability room_availability_room_type_id_date_key; Type: CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public.room_availability
    ADD CONSTRAINT room_availability_room_type_id_date_key UNIQUE (room_type_id, date);


--
-- Name: room_types room_types_pkey; Type: CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public.room_types
    ADD CONSTRAINT room_types_pkey PRIMARY KEY (id);


--
-- Name: hotels_host_idx; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX hotels_host_idx ON public.hotels USING btree (host_id);


--
-- Name: hotels_location_idx; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX hotels_location_idx ON public.hotels USING gist (location_geom);


--
-- Name: hotels_province_idx; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX hotels_province_idx ON public.hotels USING btree (province);


--
-- Name: idx_hotel_bookings_created_at; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX idx_hotel_bookings_created_at ON public.hotel_bookings USING btree (created_at);


--
-- Name: idx_hotel_bookings_dates; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX idx_hotel_bookings_dates ON public.hotel_bookings USING btree (check_in, check_out);


--
-- Name: idx_hotel_bookings_guest_email; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX idx_hotel_bookings_guest_email ON public.hotel_bookings USING btree (guest_email);


--
-- Name: idx_hotel_bookings_hotel_id; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX idx_hotel_bookings_hotel_id ON public.hotel_bookings USING btree (hotel_id);


--
-- Name: idx_hotel_bookings_payment_status; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX idx_hotel_bookings_payment_status ON public.hotel_bookings USING btree (payment_status);


--
-- Name: idx_hotel_bookings_room_type_id; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX idx_hotel_bookings_room_type_id ON public.hotel_bookings USING btree (room_type_id);


--
-- Name: idx_hotel_bookings_status; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX idx_hotel_bookings_status ON public.hotel_bookings USING btree (status);


--
-- Name: idx_hotels_active; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX idx_hotels_active ON public.hotels USING btree (is_active);


--
-- Name: idx_hotels_host; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX idx_hotels_host ON public.hotels USING btree (host_id);


--
-- Name: idx_hotels_host_id; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX idx_hotels_host_id ON public.hotels USING btree (host_id);


--
-- Name: idx_hotels_location; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX idx_hotels_location ON public.hotels USING gist (location_geom);


--
-- Name: idx_hotels_province; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX idx_hotels_province ON public.hotels USING btree (province);


--
-- Name: idx_hotels_slug; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX idx_hotels_slug ON public.hotels USING btree (slug);


--
-- Name: idx_room_availability_date; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX idx_room_availability_date ON public.room_availability USING btree (date);


--
-- Name: idx_room_availability_hotel; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX idx_room_availability_hotel ON public.room_availability USING btree (hotel_id, date);


--
-- Name: idx_room_availability_hotel_date; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX idx_room_availability_hotel_date ON public.room_availability USING btree (hotel_id, date);


--
-- Name: idx_room_availability_main; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX idx_room_availability_main ON public.room_availability USING btree (room_type_id, date);


--
-- Name: idx_room_availability_room_type_date; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX idx_room_availability_room_type_date ON public.room_availability USING btree (room_type_id, date);


--
-- Name: idx_room_types_active; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX idx_room_types_active ON public.room_types USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_room_types_hotel; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX idx_room_types_hotel ON public.room_types USING btree (hotel_id);


--
-- Name: room_availability_hotel_date_idx; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX room_availability_hotel_date_idx ON public.room_availability USING btree (hotel_id, date);


--
-- Name: room_availability_room_type_date_idx; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX room_availability_room_type_date_idx ON public.room_availability USING btree (room_type_id, date);


--
-- Name: room_types_hotel_idx; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX room_types_hotel_idx ON public.room_types USING btree (hotel_id);


--
-- Name: hotels trigger_update_hotel_geometry; Type: TRIGGER; Schema: public; Owner: linka_user
--

CREATE TRIGGER trigger_update_hotel_geometry BEFORE INSERT OR UPDATE ON public.hotels FOR EACH ROW EXECUTE FUNCTION public.update_hotel_geometry();


--
-- Name: hotels update_hotel_geom_trigger; Type: TRIGGER; Schema: public; Owner: linka_user
--

CREATE TRIGGER update_hotel_geom_trigger BEFORE INSERT OR UPDATE OF lat, lng ON public.hotels FOR EACH ROW EXECUTE FUNCTION public.update_hotel_geometry();


--
-- Name: hotels update_hotels_updated_at; Type: TRIGGER; Schema: public; Owner: linka_user
--

CREATE TRIGGER update_hotels_updated_at BEFORE UPDATE ON public.hotels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: room_types update_room_types_updated_at; Type: TRIGGER; Schema: public; Owner: linka_user
--

CREATE TRIGGER update_room_types_updated_at BEFORE UPDATE ON public.room_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: hotel_bookings hotel_bookings_hotel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public.hotel_bookings
    ADD CONSTRAINT hotel_bookings_hotel_id_fkey FOREIGN KEY (hotel_id) REFERENCES public.hotels(id) ON DELETE CASCADE;


--
-- Name: hotel_bookings hotel_bookings_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public.hotel_bookings
    ADD CONSTRAINT hotel_bookings_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id);


--
-- Name: hotel_bookings hotel_bookings_room_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public.hotel_bookings
    ADD CONSTRAINT hotel_bookings_room_type_id_fkey FOREIGN KEY (room_type_id) REFERENCES public.room_types(id) ON DELETE CASCADE;


--
-- Name: room_availability room_availability_hotel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public.room_availability
    ADD CONSTRAINT room_availability_hotel_id_fkey FOREIGN KEY (hotel_id) REFERENCES public.hotels(id) ON DELETE CASCADE;


--
-- Name: room_availability room_availability_room_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public.room_availability
    ADD CONSTRAINT room_availability_room_type_id_fkey FOREIGN KEY (room_type_id) REFERENCES public.room_types(id) ON DELETE CASCADE;


--
-- Name: room_types room_types_hotel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public.room_types
    ADD CONSTRAINT room_types_hotel_id_fkey FOREIGN KEY (hotel_id) REFERENCES public.hotels(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict AfVLcxXb421kAFOgDkjAwiiB7cBTIuXq8bK9qzJaR8PawUNsctSgHQrznfzTRwx

