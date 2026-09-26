-- ============================================================
-- ParkSync — Complete Schema & Auth Setup
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/lehiaorbhcxrriathvhf/sql/new
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. LOTS (Parking Areas)
CREATE TABLE IF NOT EXISTS public.lots (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  location        TEXT NOT NULL,
  total_capacity  INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 2. SLOTS (Parking Slots)
CREATE TABLE IF NOT EXISTS public.slots (
  id          TEXT PRIMARY KEY,
  lot_id      TEXT NOT NULL REFERENCES public.lots(id) ON DELETE CASCADE,
  slot_number TEXT NOT NULL,
  slot_type   TEXT NOT NULL DEFAULT 'REGULAR' CHECK (slot_type IN ('REGULAR', 'EV_CHARGING', 'ACCESSIBLE', 'STAFF_ONLY')),
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (lot_id, slot_number)
);

CREATE INDEX IF NOT EXISTS idx_slots_lot_id ON public.slots(lot_id);

-- 3. PROFILES (Linked to Supabase Auth users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL DEFAULT '',
  role        TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'staff', 'admin')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 4. RESERVATIONS
CREATE TABLE IF NOT EXISTS public.reservations (
  id              TEXT PRIMARY KEY,
  reference_code  TEXT UNIQUE NOT NULL,
  slot_id         TEXT NOT NULL REFERENCES public.slots(id) ON DELETE RESTRICT,
  user_id         UUID REFERENCES auth.users(id),
  user_name       TEXT NOT NULL,
  user_type       TEXT NOT NULL DEFAULT 'Student' CHECK (user_type IN ('Student', 'Faculty', 'Staff', 'Visitor')),
  license_plate   TEXT NOT NULL,
  start_time      TIMESTAMPTZ NOT NULL,
  end_time        TIMESTAMPTZ NOT NULL,
  status          TEXT NOT NULL DEFAULT 'CONFIRMED' CHECK (status IN ('CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED', 'EXPIRED')),
  qr_token        TEXT NOT NULL,
  checked_in_at   TIMESTAMPTZ,
  checked_out_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_time_window CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_reservations_slot_id ON public.reservations(slot_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON public.reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_user_id ON public.reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_reservations_qr_token ON public.reservations(qr_token);

-- 5. AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id  TEXT REFERENCES public.reservations(id) ON DELETE CASCADE,
  action          TEXT NOT NULL,
  actor           TEXT NOT NULL,
  timestamp       TIMESTAMPTZ DEFAULT NOW(),
  details         JSONB DEFAULT '{}'::jsonb
);

-- 6. AUTOMATIC PROFILE CREATION ON USER SIGN-UP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role TEXT;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
  IF v_role NOT IN ('student', 'staff', 'admin') THEN
    v_role := 'student';
  END IF;

  INSERT INTO public.profiles (id, full_name, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), v_role)
  ON CONFLICT (id) DO UPDATE 
  SET full_name = EXCLUDED.full_name,
      role = EXCLUDED.role;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. ATOMIC RPC: BOOK PARKING SLOT
CREATE OR REPLACE FUNCTION public.book_parking_slot(
  p_slot_id TEXT, p_user_name TEXT, p_user_type TEXT, p_license_plate TEXT,
  p_start_time TIMESTAMPTZ, p_end_time TIMESTAMPTZ, p_reference_code TEXT, p_qr_token TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_conflict_count INT;
  v_res_id TEXT := 'res_' || substr(md5(random()::text), 1, 10);
  v_result JSONB;
  v_caller_id UUID;
BEGIN
  v_caller_id := auth.uid();
  PERFORM pg_advisory_xact_lock(hashtext(p_slot_id));

  SELECT COUNT(*) INTO v_conflict_count FROM reservations
  WHERE slot_id = p_slot_id AND status IN ('CONFIRMED', 'CHECKED_IN')
    AND (p_start_time < end_time AND p_end_time > start_time);

  IF v_conflict_count > 0 THEN
    RAISE EXCEPTION 'SLOT_UNAVAILABLE: This slot is already booked for the selected time.' USING ERRCODE = 'P0001';
  END IF;

  IF p_end_time <= p_start_time THEN
    RAISE EXCEPTION 'INVALID_TIME: End time must be after start time.' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO reservations (id, reference_code, slot_id, user_id, user_name, user_type, license_plate, start_time, end_time, status, qr_token)
  VALUES (v_res_id, p_reference_code, p_slot_id, v_caller_id, p_user_name, p_user_type, p_license_plate, p_start_time, p_end_time, 'CONFIRMED', p_qr_token);

  INSERT INTO audit_logs (reservation_id, action, actor, details)
  VALUES (v_res_id, 'CREATED', COALESCE(v_caller_id::text, 'anonymous'), jsonb_build_object('user', p_user_name));

  SELECT jsonb_build_object('id', v_res_id, 'referenceCode', p_reference_code, 'slotId', p_slot_id, 'status', 'CONFIRMED') INTO v_result;
  RETURN v_result;
END;
$$;

-- 8. SECURE RPCS (CHECKIN, CHECKOUT, CANCEL)
CREATE OR REPLACE FUNCTION public.checkin_booking(p_booking_id TEXT) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_booking reservations%ROWTYPE; 
  v_caller_id UUID; 
  v_caller_role TEXT;
BEGIN
  v_caller_id := auth.uid();
  SELECT role INTO v_caller_role FROM profiles WHERE id = v_caller_id;
  SELECT * INTO v_booking FROM reservations WHERE id = p_booking_id;
  
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND: Booking not found.' USING ERRCODE = 'P0001'; END IF;
  IF v_caller_role <> 'admin' AND v_booking.user_id IS NOT NULL AND v_booking.user_id <> v_caller_id THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = 'P0001';
  END IF;
  IF v_booking.status <> 'CONFIRMED' THEN
    RAISE EXCEPTION 'INVALID_STATUS: Booking status is %', v_booking.status USING ERRCODE = 'P0001';
  END IF;

  UPDATE reservations SET status = 'CHECKED_IN', checked_in_at = NOW() WHERE id = p_booking_id;
  INSERT INTO audit_logs (reservation_id, action, actor, details) VALUES (p_booking_id, 'CHECKED_IN', COALESCE(v_caller_id::text, 'system'), '{}'::jsonb);
  RETURN jsonb_build_object('success', true, 'status', 'CHECKED_IN');
END;
$$;

CREATE OR REPLACE FUNCTION public.checkout_booking(p_booking_id TEXT) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_booking reservations%ROWTYPE; 
  v_caller_id UUID; 
  v_caller_role TEXT;
BEGIN
  v_caller_id := auth.uid();
  SELECT role INTO v_caller_role FROM profiles WHERE id = v_caller_id;
  SELECT * INTO v_booking FROM reservations WHERE id = p_booking_id;
  
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND: Booking not found.' USING ERRCODE = 'P0001'; END IF;
  IF v_caller_role <> 'admin' AND v_booking.user_id IS NOT NULL AND v_booking.user_id <> v_caller_id THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = 'P0001';
  END IF;
  IF v_booking.status <> 'CHECKED_IN' THEN
    RAISE EXCEPTION 'INVALID_STATUS: Booking must be CHECKED_IN, current: %', v_booking.status USING ERRCODE = 'P0001';
  END IF;

  UPDATE reservations SET status = 'COMPLETED', checked_out_at = NOW() WHERE id = p_booking_id;
  INSERT INTO audit_logs (reservation_id, action, actor, details) VALUES (p_booking_id, 'CHECKED_OUT', COALESCE(v_caller_id::text, 'system'), '{}'::jsonb);
  RETURN jsonb_build_object('success', true, 'status', 'COMPLETED');
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_booking(p_booking_id TEXT) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_booking reservations%ROWTYPE; 
  v_caller_id UUID; 
  v_caller_role TEXT;
BEGIN
  v_caller_id := auth.uid();
  SELECT role INTO v_caller_role FROM profiles WHERE id = v_caller_id;
  SELECT * INTO v_booking FROM reservations WHERE id = p_booking_id;
  
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND: Booking not found.' USING ERRCODE = 'P0001'; END IF;
  IF v_caller_role <> 'admin' AND v_booking.user_id IS NOT NULL AND v_booking.user_id <> v_caller_id THEN
    RAISE EXCEPTION 'FORBIDDEN: Cannot cancel another user booking.' USING ERRCODE = 'P0001';
  END IF;
  IF v_booking.status NOT IN ('CONFIRMED') THEN
    RAISE EXCEPTION 'INVALID_STATUS: Only CONFIRMED bookings can be cancelled.' USING ERRCODE = 'P0001';
  END IF;

  UPDATE reservations SET status = 'CANCELLED' WHERE id = p_booking_id;
  INSERT INTO audit_logs (reservation_id, action, actor, details) VALUES (p_booking_id, 'CANCELLED', COALESCE(v_caller_id::text, 'system'), '{}'::jsonb);
  RETURN jsonb_build_object('success', true, 'status', 'CANCELLED');
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_toggle_slot(p_slot_id TEXT, p_is_active BOOLEAN) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_caller_id UUID; 
  v_caller_role TEXT; 
  v_active_bookings INT;
BEGIN
  v_caller_id := auth.uid();
  SELECT role INTO v_caller_role FROM profiles WHERE id = v_caller_id;
  IF v_caller_role <> 'admin' THEN RAISE EXCEPTION 'FORBIDDEN: Admin access required.' USING ERRCODE = 'P0001'; END IF;
  
  IF NOT p_is_active THEN
    SELECT COUNT(*) INTO v_active_bookings FROM reservations WHERE slot_id = p_slot_id AND status IN ('CONFIRMED', 'CHECKED_IN');
    IF v_active_bookings > 0 THEN RAISE EXCEPTION 'HAS_ACTIVE_BOOKINGS: Slot has active reservation(s).' USING ERRCODE = 'P0001'; END IF;
  END IF;
  
  UPDATE slots SET is_active = p_is_active WHERE id = p_slot_id;
  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_add_slot(p_lot_id TEXT, p_slot_number TEXT, p_slot_type TEXT) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_caller_id UUID; 
  v_caller_role TEXT;
  v_slot_id TEXT;
BEGIN
  v_caller_id := auth.uid();
  SELECT role INTO v_caller_role FROM profiles WHERE id = v_caller_id;
  IF v_caller_role <> 'admin' THEN RAISE EXCEPTION 'FORBIDDEN: Admin access required.' USING ERRCODE = 'P0001'; END IF;
  
  v_slot_id := 'slot-' || lower(p_lot_id) || '-' || lower(replace(p_slot_number, '-', ''));
  INSERT INTO slots (id, lot_id, slot_number, slot_type, is_active)
  VALUES (v_slot_id, p_lot_id, upper(p_slot_number), p_slot_type, true);
  RETURN jsonb_build_object('success', true, 'id', v_slot_id);
END;
$$;

-- 9. PERMISSIONS
GRANT EXECUTE ON FUNCTION public.book_parking_slot TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.checkin_booking TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.checkout_booking TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_booking TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_toggle_slot TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_add_slot TO authenticated;

-- 10. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT TO authenticated USING (id = auth.uid());

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE TO authenticated USING (id = auth.uid());

DROP POLICY IF EXISTS "lots_read_all" ON lots;
CREATE POLICY "lots_read_all" ON lots FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "slots_read_all" ON slots;
CREATE POLICY "slots_read_all" ON slots FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "reservations_select_own" ON reservations;
CREATE POLICY "reservations_select_own" ON reservations FOR SELECT TO authenticated USING (user_id = auth.uid() OR auth.uid() IS NULL);

DROP POLICY IF EXISTS "reservations_select_admin" ON reservations;
CREATE POLICY "reservations_select_admin" ON reservations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "audit_logs_admin_read" ON audit_logs;
CREATE POLICY "audit_logs_admin_read" ON audit_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 11. INITIAL SEED DATA
INSERT INTO public.lots (id, name, location, total_capacity) VALUES
  ('lot-north', 'North Gate Campus Lot', 'North Gate, Sector 1', 50),
  ('lot-south', 'South Campus Block', 'South Block, Gate 2', 30),
  ('lot-library', 'Library Annex', 'Main Library, Rear', 20),
  ('lot-sports', 'Sports Complex', 'Sports Block, North', 15)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.slots (id, lot_id, slot_number, slot_type, is_active) VALUES
  ('slot-N01', 'lot-north', 'N-01', 'REGULAR', true),
  ('slot-N02', 'lot-north', 'N-02', 'REGULAR', true),
  ('slot-N03', 'lot-north', 'N-03', 'EV_CHARGING', true),
  ('slot-N04', 'lot-north', 'N-04', 'ACCESSIBLE', true),
  ('slot-N05', 'lot-north', 'N-05', 'STAFF_ONLY', true),
  ('slot-S01', 'lot-south', 'S-01', 'REGULAR', true),
  ('slot-S02', 'lot-south', 'S-02', 'REGULAR', true),
  ('slot-S03', 'lot-south', 'S-03', 'REGULAR', true),
  ('slot-S04', 'lot-south', 'S-04', 'REGULAR', true),
  ('slot-S05', 'lot-south', 'S-05', 'EV_CHARGING', true),
  ('slot-L01', 'lot-library', 'L-01', 'REGULAR', true),
  ('slot-L02', 'lot-library', 'L-02', 'REGULAR', true),
  ('slot-L03', 'lot-library', 'L-03', 'EV_CHARGING', true),
  ('slot-SP01', 'lot-sports', 'SP-01', 'REGULAR', true),
  ('slot-SP02', 'lot-sports', 'SP-02', 'REGULAR', true),
  ('slot-SP03', 'lot-sports', 'SP-03', 'ACCESSIBLE', true)
ON CONFLICT (id) DO NOTHING;

SELECT 'ParkSync setup completed successfully!' AS status;
