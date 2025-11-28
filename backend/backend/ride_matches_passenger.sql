                                                           pg_get_functiondef                                                           
----------------------------------------------------------------------------------------------------------------------------------------
 CREATE OR REPLACE FUNCTION public.ride_matches_passenger(route geography, passenger_point geography, max_distance_km double precision)+
  RETURNS boolean                                                                                                                      +
  LANGUAGE plpgsql                                                                                                                     +
  IMMUTABLE                                                                                                                            +
 AS $function$                                                                                                                         +
 BEGIN                                                                                                                                 +
   RETURN ST_DWithin(                                                                                                                  +
     route,                                                                                                                            +
     passenger_point,                                                                                                                  +
     max_distance_km * 1000                                                                                                            +
   );                                                                                                                                  +
 END;                                                                                                                                  +
 $function$                                                                                                                            +
 
(1 row)

