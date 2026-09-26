-- ============================================================
-- ParkSync — AI Analytics and Prediction Baseline Migration
-- ============================================================

-- 1. Demand Forecast RPC
CREATE OR REPLACE FUNCTION public.get_parking_demand_forecast(p_minutes INT)
RETURNS TABLE (
  lot_id TEXT,
  lot_name TEXT,
  total_capacity INT,
  predicted_occupied INT,
  predicted_available INT,
  demand_level TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_target_time TIMESTAMPTZ := NOW() + (p_minutes || ' minutes')::interval;
BEGIN
  RETURN QUERY
  SELECT 
    l.id AS lot_id,
    l.name AS lot_name,
    l.total_capacity,
    COALESCE(r_count.occupied, 0)::INT AS predicted_occupied,
    GREATEST(0, l.total_capacity - COALESCE(r_count.occupied, 0))::INT AS predicted_available,
    CASE 
      WHEN COALESCE(r_count.occupied, 0) >= l.total_capacity THEN 'Full'
      WHEN COALESCE(r_count.occupied, 0) >= l.total_capacity * 0.8 THEN 'High'
      WHEN COALESCE(r_count.occupied, 0) >= l.total_capacity * 0.4 THEN 'Moderate'
      ELSE 'Low'
    END AS demand_level
  FROM public.lots l
  LEFT JOIN (
    SELECT s.lot_id, COUNT(r.id) AS occupied
    FROM public.reservations r
    JOIN public.slots s ON r.slot_id = s.id
    WHERE r.status IN ('CONFIRMED', 'CHECKED_IN')
      AND v_target_time BETWEEN r.start_time AND r.end_time
    GROUP BY s.lot_id
  ) r_count ON l.id = r_count.lot_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_parking_demand_forecast TO authenticated;


-- 2. Parking Statistics RPC
CREATE OR REPLACE FUNCTION public.get_parking_statistics(p_days INT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_total_capacity INT;
  v_current_occupancy INT;
  v_avg_booking_duration INTERVAL;
  v_cancellation_rate NUMERIC;
  v_most_used_lot TEXT;
  v_underutilized_lot TEXT;
  v_result JSONB;
BEGIN
  -- Total capacity
  SELECT SUM(total_capacity) INTO v_total_capacity FROM public.lots;
  
  -- Current occupancy
  SELECT COUNT(*) INTO v_current_occupancy 
  FROM public.reservations 
  WHERE status = 'CHECKED_IN';
  
  -- Average booking duration in the last p_days
  SELECT AVG(end_time - start_time) INTO v_avg_booking_duration
  FROM public.reservations
  WHERE created_at >= NOW() - (p_days || ' days')::interval;

  -- Cancellation rate
  SELECT 
    CASE WHEN COUNT(*) = 0 THEN 0 
    ELSE ROUND((COUNT(*) FILTER (WHERE status = 'CANCELLED')::numeric / COUNT(*)::numeric) * 100, 2)
    END INTO v_cancellation_rate
  FROM public.reservations
  WHERE created_at >= NOW() - (p_days || ' days')::interval;

  -- Most used zone
  SELECT l.name INTO v_most_used_lot
  FROM public.reservations r
  JOIN public.slots s ON r.slot_id = s.id
  JOIN public.lots l ON s.lot_id = l.id
  WHERE r.created_at >= NOW() - (p_days || ' days')::interval
  GROUP BY l.id, l.name
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  -- Underutilized zone
  SELECT l.name INTO v_underutilized_lot
  FROM public.reservations r
  JOIN public.slots s ON r.slot_id = s.id
  JOIN public.lots l ON s.lot_id = l.id
  WHERE r.created_at >= NOW() - (p_days || ' days')::interval
  GROUP BY l.id, l.name
  ORDER BY COUNT(*) ASC
  LIMIT 1;
  
  -- Fallbacks if no data
  IF v_most_used_lot IS NULL THEN
     SELECT name INTO v_most_used_lot FROM public.lots ORDER BY total_capacity DESC LIMIT 1;
  END IF;
  IF v_underutilized_lot IS NULL THEN
     SELECT name INTO v_underutilized_lot FROM public.lots ORDER BY total_capacity ASC LIMIT 1;
  END IF;

  v_result := jsonb_build_object(
    'total_capacity', COALESCE(v_total_capacity, 0),
    'current_occupancy', COALESCE(v_current_occupancy, 0),
    'avg_booking_duration_mins', COALESCE(EXTRACT(EPOCH FROM v_avg_booking_duration)/60, 0),
    'cancellation_rate_pct', v_cancellation_rate,
    'most_heavily_used_zone', v_most_used_lot,
    'underutilized_zone', v_underutilized_lot,
    'peak_parking_hours', '09:00 AM - 11:00 AM' -- Baseline static estimation for MVP if sparse data
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_parking_statistics TO authenticated;
