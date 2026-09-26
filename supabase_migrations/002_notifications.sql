-- ============================================================
-- ParkSync — Notifications Migration
-- ============================================================

-- 1. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  related_booking_id TEXT,
  related_slot_id TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON public.notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);

-- 2. RLS POLICIES
DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON notifications;

CREATE POLICY "notifications_select_own" ON notifications 
  FOR SELECT TO authenticated USING (recipient_id = auth.uid());

CREATE POLICY "notifications_update_own" ON notifications 
  FOR UPDATE TO authenticated USING (recipient_id = auth.uid()) WITH CHECK (recipient_id = auth.uid());

CREATE POLICY "notifications_insert_admin" ON notifications
  FOR INSERT TO authenticated 
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff')));

-- 3. TRIGGERS FOR AUTOMATED NOTIFICATIONS
CREATE OR REPLACE FUNCTION public.handle_reservation_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.user_id IS NOT NULL THEN
      INSERT INTO public.notifications (recipient_id, title, message, type, related_booking_id, related_slot_id)
      VALUES (NEW.user_id, 'Booking Confirmed', 'Your parking slot has been reserved successfully.', 'BOOKING_CREATED', NEW.id, NEW.slot_id);
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status <> NEW.status AND NEW.user_id IS NOT NULL THEN
      IF NEW.status = 'CANCELLED' THEN
        INSERT INTO public.notifications (recipient_id, title, message, type, related_booking_id, related_slot_id)
        VALUES (NEW.user_id, 'Booking Cancelled', 'Your reservation has been cancelled.', 'BOOKING_CANCELLED', NEW.id, NEW.slot_id);
      ELSIF NEW.status = 'CHECKED_IN' THEN
         INSERT INTO public.notifications (recipient_id, title, message, type, related_booking_id, related_slot_id)
         VALUES (NEW.user_id, 'Checked In', 'You have successfully checked in to your parking slot.', 'CHECKED_IN', NEW.id, NEW.slot_id);
      ELSIF NEW.status = 'COMPLETED' THEN
         INSERT INTO public.notifications (recipient_id, title, message, type, related_booking_id, related_slot_id)
         VALUES (NEW.user_id, 'Checked Out', 'You have successfully checked out. Thank you!', 'COMPLETED', NEW.id, NEW.slot_id);
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_reservation_change ON public.reservations;
CREATE TRIGGER on_reservation_change
  AFTER INSERT OR UPDATE ON public.reservations FOR EACH ROW EXECUTE FUNCTION public.handle_reservation_change();

-- 4. FUNCTION TO MARK ALL AS READ
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_caller_id UUID;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN 
    RAISE EXCEPTION 'UNAUTHORIZED' USING ERRCODE = 'P0001'; 
  END IF;
  
  UPDATE public.notifications 
  SET is_read = true, read_at = NOW() 
  WHERE recipient_id = v_caller_id AND is_read = false;
  
  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read TO authenticated;

SELECT 'Migration 002 complete.' AS result;
