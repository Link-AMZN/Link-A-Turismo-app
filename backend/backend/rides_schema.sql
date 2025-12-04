--
-- PostgreSQL database dump
--

\restrict dpKXbWoDRTmATtLq5iVW1NrgGje04PZMOhR8ZqpImctgXGAnQCMvaYK8hqKOdYW

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
    "roomTypeId" uuid,
    "numberOfAdults" integer DEFAULT 1,
    "numberOfChildren" integer DEFAULT 0,
    CONSTRAINT hotel_booking_requires_room CHECK ((("bookingType" <> 'hotel'::text) OR (("roomId" IS NOT NULL) AND ("checkInDate" IS NOT NULL) AND ("checkOutDate" IS NOT NULL)))),
    CONSTRAINT ride_booking_requires_ride CHECK ((("bookingType" <> 'ride'::text) OR ("rideId" IS NOT NULL))),
    CONSTRAINT valid_booking_type CHECK (("bookingType" = ANY (ARRAY['ride'::text, 'hotel'::text, 'event'::text])))
);


ALTER TABLE public.bookings OWNER TO linka_user;

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
    vehicle_uuid uuid,
    route_geom public.geography(LineString,4326)
);


ALTER TABLE public.rides OWNER TO linka_user;

--
-- Name: vehicles; Type: TABLE; Schema: public; Owner: linka_user
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


ALTER TABLE public.vehicles OWNER TO linka_user;

--
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);


--
-- Name: rides rides_pkey; Type: CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public.rides
    ADD CONSTRAINT rides_pkey PRIMARY KEY (id);


--
-- Name: vehicles vehicles_pkey; Type: CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_pkey PRIMARY KEY (id);


--
-- Name: vehicles vehicles_plate_number_key; Type: CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_plate_number_key UNIQUE (plate_number);


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
-- Name: idx_bookings_accommodation; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX idx_bookings_accommodation ON public.bookings USING btree ("accommodationId", "checkInDate", "checkOutDate");


--
-- Name: idx_bookings_accommodation_dates; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX idx_bookings_accommodation_dates ON public.bookings USING btree ("accommodationId", "checkInDate", "checkOutDate");


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
-- Name: idx_bookings_status; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX idx_bookings_status ON public.bookings USING btree (status);


--
-- Name: idx_bookings_type_hotel; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX idx_bookings_type_hotel ON public.bookings USING btree (type) WHERE ((type)::text = 'hotel'::text);


--
-- Name: idx_rides_from_city; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX idx_rides_from_city ON public.rides USING gin ("fromCity" public.gin_trgm_ops);


--
-- Name: idx_rides_from_geom; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX idx_rides_from_geom ON public.rides USING gist (from_geom);


--
-- Name: idx_rides_from_geom_gist; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX idx_rides_from_geom_gist ON public.rides USING gist (from_geom);


--
-- Name: idx_rides_from_province; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX idx_rides_from_province ON public.rides USING gin ("fromProvince" public.gin_trgm_ops);


--
-- Name: idx_rides_status_departure; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX idx_rides_status_departure ON public.rides USING btree (status, "departureDate") WHERE ((status)::text = 'available'::text);


--
-- Name: idx_rides_to_city; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX idx_rides_to_city ON public.rides USING gin ("toCity" public.gin_trgm_ops);


--
-- Name: idx_rides_to_geom; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX idx_rides_to_geom ON public.rides USING gist (to_geom);


--
-- Name: idx_rides_to_geom_gist; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX idx_rides_to_geom_gist ON public.rides USING gist (to_geom);


--
-- Name: idx_rides_to_province; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX idx_rides_to_province ON public.rides USING gin ("toProvince" public.gin_trgm_ops);


--
-- Name: idx_vehicles_active; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX idx_vehicles_active ON public.vehicles USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_vehicles_driver_id; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX idx_vehicles_driver_id ON public.vehicles USING btree (driver_id);


--
-- Name: idx_vehicles_plate; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX idx_vehicles_plate ON public.vehicles USING btree (plate_number);


--
-- Name: rides_status_idx; Type: INDEX; Schema: public; Owner: linka_user
--

CREATE INDEX rides_status_idx ON public.rides USING btree (status);


--
-- Name: rides trigger_auto_fill_provinces; Type: TRIGGER; Schema: public; Owner: linka_user
--

CREATE TRIGGER trigger_auto_fill_provinces BEFORE INSERT OR UPDATE ON public.rides FOR EACH ROW EXECUTE FUNCTION public.auto_fill_provinces();


--
-- Name: bookings update_bookings_updated_at; Type: TRIGGER; Schema: public; Owner: linka_user
--

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: bookings bookings_accommodationId_accommodations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT "bookings_accommodationId_accommodations_id_fk" FOREIGN KEY ("accommodationId") REFERENCES public.legacy_accommodations(id);


--
-- Name: bookings bookings_hotelRoomId_hotelRooms_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT "bookings_hotelRoomId_hotelRooms_id_fk" FOREIGN KEY ("hotelRoomId") REFERENCES public."legacy_hotelRooms"(id);


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
    ADD CONSTRAINT "bookings_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES public."legacy_hotelRooms"(id);


--
-- Name: rides rides_driverId_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public.rides
    ADD CONSTRAINT "rides_driverId_users_id_fk" FOREIGN KEY ("driverId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: rides rides_vehicle_uuid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: linka_user
--

ALTER TABLE ONLY public.rides
    ADD CONSTRAINT rides_vehicle_uuid_fkey FOREIGN KEY (vehicle_uuid) REFERENCES public.vehicles(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict dpKXbWoDRTmATtLq5iVW1NrgGje04PZMOhR8ZqpImctgXGAnQCMvaYK8hqKOdYW

