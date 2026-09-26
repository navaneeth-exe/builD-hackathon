-- ============================================================
-- ParkSync — Complete Auth & Security Migration
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/lehiaorbhcxrriathvhf/sql/new
-- ============================================================

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL DEFAULT '',
  role        TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'staff', 'admin')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. ADD user_id TO reservations
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
CREATE INDEX IF NOT EXISTS idx_reservations_user_id ON public.reservations(user_id);

-- 3. AUTO-CREATE PROFILE ON SIGN-UP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- Read role from metadata (useful for hackathon demo), default to student
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
  IF v_role NOT IN ('student', 'staff', 'admin') THEN
    v_role := 'student';
  END IF;

  INSERT INTO public.profiles (id, full_name, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), v_role)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. UPDATED book_parking_slot RPC
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
  IF p_start_time < NOW() - INTERVAL '5 minutes' THEN
    RAISE EXCEPTION 'PAST_TIME: Cannot book a slot in the past.' USING ERRCODE = 'P0001';
  END IF;
  INSERT INTO reservations (id, reference_code, slot_id, user_id, user_name, user_type, license_plate, start_time, end_time, status, qr_token)
  VALUES (v_res_id, p_reference_code, p_slot_id, v_caller_id, p_user_name, p_user_type, p_license_plate, p_start_time, p_end_time, 'CONFIRMED', p_qr_token);
  INSERT INTO audit_logs (reservation_id, action, actor, details)
  VALUES (v_res_id, 'CREATED', COALESCE(v_caller_id::text, 'anonymous'), jsonb_build_object('user', p_user_name));
  SELECT jsonb_build_object('id', v_res_id, 'referenceCode', p_reference_code, 'slotId', p_slot_id, 'status', 'CONFIRMED') INTO v_result;
  RETURN v_result;
END;
$$;

-- 5. SECURE checkin/checkout/cancel RPCs
CREATE OR REPLACE FUNCTION public.checkin_booking(p_booking_id TEXT) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_booking reservations%ROWTYPE; v_caller_id UUID; v_caller_role TEXT;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED' USING ERRCODE = 'P0001'; END IF;
  SELECT role INTO v_caller_role FROM profiles WHERE id = v_caller_id;
  SELECT * INTO v_booking FROM reservations WHERE id = p_booking_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND: Booking not found.' USING ERRCODE = 'P0001'; END IF;
  IF v_caller_role NOT IN ('admin', 'staff') AND v_booking.user_id <> v_caller_id THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = 'P0001';
  END IF;
  IF v_booking.status <> 'CONFIRMED' THEN
    RAISE EXCEPTION 'INVALID_STATUS: Booking status is %', v_booking.status USING ERRCODE = 'P0001';
  END IF;
  UPDATE reservations SET status = 'CHECKED_IN', checked_in_at = NOW() WHERE id = p_booking_id;
  INSERT INTO audit_logs (reservation_id, action, actor, details) VALUES (p_booking_id, 'CHECKED_IN', v_caller_id::text, '{}'::jsonb);
  RETURN jsonb_build_object('success', true, 'status', 'CHECKED_IN');
END;
$$;

CREATE OR REPLACE FUNCTION public.checkout_booking(p_booking_id TEXT) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_booking reservations%ROWTYPE; v_caller_id UUID; v_caller_role TEXT;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED' USING ERRCODE = 'P0001'; END IF;
  SELECT role INTO v_caller_role FROM profiles WHERE id = v_caller_id;
  SELECT * INTO v_booking FROM reservations WHERE id = p_booking_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND: Booking not found.' USING ERRCODE = 'P0001'; END IF;
  IF v_caller_role NOT IN ('admin', 'staff') AND v_booking.user_id <> v_caller_id THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = 'P0001';
  END IF;
  IF v_booking.status <> 'CHECKED_IN' THEN
    RAISE EXCEPTION 'INVALID_STATUS: Booking must be CHECKED_IN, current: %', v_booking.status USING ERRCODE = 'P0001';
  END IF;
  UPDATE reservations SET status = 'COMPLETED', checked_out_at = NOW() WHERE id = p_booking_id;
  INSERT INTO audit_logs (reservation_id, action, actor, details) VALUES (p_booking_id, 'CHECKED_OUT', v_caller_id::text, '{}'::jsonb);
  RETURN jsonb_build_object('success', true, 'status', 'COMPLETED');
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_booking(p_booking_id TEXT) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_booking reservations%ROWTYPE; v_caller_id UUID; v_caller_role TEXT;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED' USING ERRCODE = 'P0001'; END IF;
  SELECT role INTO v_caller_role FROM profiles WHERE id = v_caller_id;
  SELECT * INTO v_booking FROM reservations WHERE id = p_booking_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND: Booking not found.' USING ERRCODE = 'P0001'; END IF;
  IF v_caller_role <> 'admin' AND v_booking.user_id <> v_caller_id THEN
    RAISE EXCEPTION 'FORBIDDEN: Cannot cancel another user booking.' USING ERRCODE = 'P0001';
  END IF;
  IF v_booking.status NOT IN ('CONFIRMED') THEN
    RAISE EXCEPTION 'INVALID_STATUS: Only CONFIRMED bookings can be cancelled.' USING ERRCODE = 'P0001';
  END IF;
  UPDATE reservations SET status = 'CANCELLED' WHERE id = p_booking_id;
  INSERT INTO audit_logs (reservation_id, action, actor, details) VALUES (p_booking_id, 'CANCELLED', v_caller_id::text, '{}'::jsonb);
  RETURN jsonb_build_object('success', true, 'status', 'CANCELLED');
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_toggle_slot(p_slot_id TEXT, p_is_active BOOLEAN) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_caller_id UUID; v_caller_role TEXT; v_active_bookings INT;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED' USING ERRCODE = 'P0001'; END IF;
  SELECT role INTO v_caller_role FROM profiles WHERE id = v_caller_id;
  IF v_caller_role <> 'admin' THEN RAISE EXCEPTION 'FORBIDDEN: Admin access required.' USING ERRCODE = 'P0001'; END IF;
  IF NOT p_is_active THEN
    SELECT COUNT(*) INTO v_active_bookings FROM reservations WHERE slot_id = p_slot_id AND status IN ('CONFIRMED', 'CHECKED_IN');
    IF v_active_bookings > 0 THEN RAISE EXCEPTION 'HAS_ACTIVE_BOOKINGS: Slot has % active reservation(s).', v_active_bookings USING ERRCODE = 'P0001'; END IF;
  END IF;
  UPDATE slots SET is_active = p_is_active WHERE id = p_slot_id;
  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_add_slot(p_lot_id TEXT, p_slot_number TEXT, p_slot_type TEXT) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_caller_id UUID; v_caller_role TEXT;
  v_slot_id TEXT;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED' USING ERRCODE = 'P0001'; END IF;
  SELECT role INTO v_caller_role FROM profiles WHERE id = v_caller_id;
  IF v_caller_role <> 'admin' THEN RAISE EXCEPTION 'FORBIDDEN: Admin access required.' USING ERRCODE = 'P0001'; END IF;
  v_slot_id := 'slot-' || lower(p_lot_id) || '-' || lower(replace(p_slot_number, '-', ''));
  INSERT INTO slots (id, lot_id, slot_number, slot_type, is_active)
  VALUES (v_slot_id, p_lot_id, upper(p_slot_number), p_slot_type, true);
  RETURN jsonb_build_object('success', true, 'id', v_slot_id);
END;
$$;

-- 6. GRANT EXECUTE
GRANT EXECUTE ON FUNCTION public.book_parking_slot TO authenticated;
GRANT EXECUTE ON FUNCTION public.checkin_booking TO authenticated;
GRANT EXECUTE ON FUNCTION public.checkout_booking TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_booking TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_toggle_slot TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_add_slot TO authenticated;

-- 7. RLS POLICIES
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid() AND role = (SELECT role FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Allow public read access to lots" ON lots;
CREATE POLICY "lots_read_all" ON lots FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow public read access to slots" ON slots;
CREATE POLICY "slots_read_all" ON slots FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow public all access to reservations" ON reservations;
CREATE POLICY "reservations_select_own" ON reservations FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "reservations_select_admin" ON reservations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "reservations_select_staff" ON reservations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'staff'));
CREATE POLICY "reservations_no_direct_insert" ON reservations FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "reservations_no_direct_update" ON reservations FOR UPDATE TO authenticated USING (false);

DROP POLICY IF EXISTS "Allow public all access to audit_logs" ON audit_logs;
CREATE POLICY "audit_logs_admin_read" ON audit_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 8. EXTRA SEED DATA
INSERT INTO lots (id, name, location, total_capacity) VALUES
  ('lot-south', 'South Campus Block', 'South Block, Gate 2', 30),
  ('lot-library', 'Library Annex', 'Main Library, Rear', 20),
  ('lot-sports', 'Sports Complex', 'Sports Block, North', 15)
ON CONFLICT (id) DO NOTHING;

INSERT INTO slots (id, lot_id, slot_number, slot_type, is_active) VALUES
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

SELECT 'Migration 001 complete.' AS result;
