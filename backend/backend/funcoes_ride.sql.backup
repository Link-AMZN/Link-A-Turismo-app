    'ride',
-- Name: debug_rides_data(text, text); Type: FUNCTION; Schema: public; Owner: linka_user
CREATE FUNCTION public.debug_rides_data(p_from_city text, p_to_city text) RETURNS TABLE(table_source text, ride_id uuid, driver_id text, driver_name text, vehicle_model text, price numeric, available_seats integer)
    -- Dados da tabela rides
        'rides_table' as table_source,
        r.id as ride_id,
    FROM rides r
            'rides_with_users' as table_source,
            r.id as ride_id,
        FROM rides r
            'rides_with_vehicles' as table_source,
            r.id as ride_id,
        FROM rides r
ALTER FUNCTION public.debug_rides_data(p_from_city text, p_to_city text) OWNER TO linka_user;
-- Name: find_compatible_rides(text, text, integer); Type: FUNCTION; Schema: public; Owner: linka_user
CREATE FUNCTION public.find_compatible_rides(passenger_from_province text, passenger_to_province text, max_distance_km integer DEFAULT 200) RETURNS TABLE(ride_id uuid, driver_from_province text, driver_to_province text, match_type text, route_compatibility integer)
        r.id AS ride_id,
    FROM rides r
ALTER FUNCTION public.find_compatible_rides(passenger_from_province text, passenger_to_province text, max_distance_km integer) OWNER TO linka_user;
-- Name: get_rides_smart_final(text, text, double precision); Type: FUNCTION; Schema: public; Owner: linka_user
CREATE FUNCTION public.get_rides_smart_final(city_from text, city_to text, radius_km double precision DEFAULT 100) RETURNS TABLE(ride_id uuid, driver_id text, driver_name text, driver_rating numeric, vehicle_make text, vehicle_model text, vehicle_type text, vehicle_plate text, vehicle_color text, max_passengers integer, from_city text, to_city text, from_lat double precision, from_lng double precision, to_lat double precision, to_lng double precision, departuredate timestamp without time zone, availableseats integer, priceperseat numeric, distance_from_city_km double precision, distance_to_city_km double precision)
        r.id as ride_id,
    FROM rides r
ALTER FUNCTION public.get_rides_smart_final(city_from text, city_to text, radius_km double precision) OWNER TO linka_user;
-- Name: get_rides_universal(text, text, double precision, double precision, double precision, double precision, double precision); Type: FUNCTION; Schema: public; Owner: linka_user
CREATE FUNCTION public.get_rides_universal(from_city_in text DEFAULT NULL::text, to_city_in text DEFAULT NULL::text, from_lat double precision DEFAULT NULL::double precision, from_lng double precision DEFAULT NULL::double precision, to_lat double precision DEFAULT NULL::double precision, to_lng double precision DEFAULT NULL::double precision, radius_km double precision DEFAULT 20) RETURNS TABLE(ride_id uuid, driver_id text, from_city_out text, to_city_out text, from_lat_out double precision, from_lng_out double precision, to_lat_out double precision, to_lng_out double precision, departuredate timestamp without time zone, availableseats integer, priceperseat numeric, distance_from_km double precision, distance_to_km double precision, match_type text)
    FROM rides r
ALTER FUNCTION public.get_rides_universal(from_city_in text, to_city_in text, from_lat double precision, from_lng double precision, to_lat double precision, to_lng double precision, radius_km double precision) OWNER TO linka_user;
-- Name: is_ride_in_corridor(text, text, text, text); Type: FUNCTION; Schema: public; Owner: linka_user
CREATE FUNCTION public.is_ride_in_corridor(ride_from_province text, ride_to_province text, search_from_province text, search_to_province text) RETURNS TABLE(is_match boolean, corridor_name text, match_type text, compatibility integer)
 IF (LOWER(ride_from_province) IN ('maputo', 'cidade de maputo') 
        AND LOWER(ride_to_province) = 'inhambane'
 IF (LOWER(ride_from_province) IN ('maputo', 'cidade de maputo') 
        AND LOWER(ride_to_province) = 'inhambane'
IF (LOWER(ride_from_province) = LOWER(search_from_province)
        AND LOWER(ride_to_province) = LOWER(search_to_province)) THEN
ALTER FUNCTION public.is_ride_in_corridor(ride_from_province text, ride_to_province text, search_from_province text, search_to_province text) OWNER TO linka_user;
    "rideId" uuid,
    type character varying(20) DEFAULT 'ride'::character varying,
    "bookingType" text DEFAULT 'ride'::text NOT NULL,
    CONSTRAINT ride_booking_requires_ride CHECK ((("bookingType" <> 'ride'::text) OR ("rideId" IS NOT NULL))),
    CONSTRAINT valid_booking_type CHECK (("bookingType" = ANY (ARRAY['ride'::text, 'hotel'::text, 'event'::text])))
    "rideId" uuid,
    "rideId" uuid,
    "rideType" text NOT NULL,
-- Name: rides; Type: TABLE; Schema: public; Owner: linka_user
CREATE TABLE public.rides (
ALTER TABLE public.rides OWNER TO linka_user;
-- Name: rides rides_pkey; Type: CONSTRAINT; Schema: public; Owner: linka_user
ALTER TABLE ONLY public.rides
    ADD CONSTRAINT rides_pkey PRIMARY KEY (id);
-- Name: idx_rides_from_geom; Type: INDEX; Schema: public; Owner: linka_user
CREATE INDEX idx_rides_from_geom ON public.rides USING gist (from_geom);
-- Name: idx_rides_from_geom_gist; Type: INDEX; Schema: public; Owner: linka_user
CREATE INDEX idx_rides_from_geom_gist ON public.rides USING gist (from_geom);
-- Name: idx_rides_to_geom; Type: INDEX; Schema: public; Owner: linka_user
CREATE INDEX idx_rides_to_geom ON public.rides USING gist (to_geom);
-- Name: idx_rides_to_geom_gist; Type: INDEX; Schema: public; Owner: linka_user
CREATE INDEX idx_rides_to_geom_gist ON public.rides USING gist (to_geom);
-- Name: rides_status_idx; Type: INDEX; Schema: public; Owner: linka_user
CREATE INDEX rides_status_idx ON public.rides USING btree (status);
-- Name: rides trigger_auto_fill_provinces; Type: TRIGGER; Schema: public; Owner: linka_user
CREATE TRIGGER trigger_auto_fill_provinces BEFORE INSERT OR UPDATE ON public.rides FOR EACH ROW EXECUTE FUNCTION public.auto_fill_provinces();
-- Name: bookings bookings_rideId_rides_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: linka_user
    ADD CONSTRAINT "bookings_rideId_rides_id_fk" FOREIGN KEY ("rideId") REFERENCES public.rides(id);
-- Name: pickupRequests pickupRequests_rideId_rides_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: linka_user
    ADD CONSTRAINT "pickupRequests_rideId_rides_id_fk" FOREIGN KEY ("rideId") REFERENCES public.rides(id);
-- Name: priceNegotiations priceNegotiations_rideId_rides_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: linka_user
    ADD CONSTRAINT "priceNegotiations_rideId_rides_id_fk" FOREIGN KEY ("rideId") REFERENCES public.rides(id);
-- Name: rides rides_driverId_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: linka_user
ALTER TABLE ONLY public.rides
    ADD CONSTRAINT "rides_driverId_users_id_fk" FOREIGN KEY ("driverId") REFERENCES public.users(id) ON DELETE CASCADE;
-- Name: rides rides_vehicleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: linka_user
ALTER TABLE ONLY public.rides
    ADD CONSTRAINT "rides_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES public."driverVehicles"(id);
