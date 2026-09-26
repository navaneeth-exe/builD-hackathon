-- ============================================================
-- ParkSync — Scheduled Notifications Migration
-- ============================================================

CREATE OR REPLACE FUNCTION public.process_scheduled_notifications()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- 1. Upcoming Bookings (15 min reminder)
  INSERT INTO public.notifications (recipient_id, title, message, type, related_booking_id, related_slot_id)
  SELECT r.user_id, 'Upcoming Booking', 'Your booking starts in 15 minutes.', 'BOOKING_REMINDER', r.id, r.slot_id
  FROM public.reservations r
  WHERE r.status = 'CONFIRMED' 
    AND r.start_time BETWEEN NOW() AND NOW() + INTERVAL '16 minutes'
    AND r.user_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications n 
      WHERE n.related_booking_id = r.id AND n.type = 'BOOKING_REMINDER'
    );

  -- 2. Exit Reminder (10 min before end)
  INSERT INTO public.notifications (recipient_id, title, message, type, related_booking_id, related_slot_id)
  SELECT r.user_id, 'Exit Reminder', 'Your booking ends in 10 minutes.', 'EXIT_REMINDER', r.id, r.slot_id
  FROM public.reservations r
  WHERE r.status = 'CHECKED_IN'
    AND r.end_time BETWEEN NOW() AND NOW() + INTERVAL '11 minutes'
    AND r.user_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.related_booking_id = r.id AND n.type = 'EXIT_REMINDER'
    );

  -- 3. Overstay Alert (grace period 15 mins exceeded)
  INSERT INTO public.notifications (recipient_id, title, message, type, related_booking_id, related_slot_id)
  SELECT r.user_id, 'Overstay Alert', 'You have exceeded your parking time. Please check out immediately.', 'OVERSTAY_ALERT', r.id, r.slot_id
  FROM public.reservations r
  WHERE r.status = 'CHECKED_IN'
    AND r.end_time < NOW() - INTERVAL '15 minutes'
    AND r.user_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.related_booking_id = r.id AND n.type = 'OVERSTAY_ALERT'
    );
    
  -- 4. Gatekeeper Notification for Overstay
  INSERT INTO public.notifications (recipient_id, title, message, type, related_booking_id, related_slot_id)
  SELECT p.id, 'Vehicle Overstay', 'A vehicle has exceeded its scheduled parking duration.', 'GATEKEEPER_OVERSTAY', r.id, r.slot_id
  FROM public.reservations r
  CROSS JOIN public.profiles p
  WHERE r.status = 'CHECKED_IN'
    AND r.end_time < NOW() - INTERVAL '15 minutes'
    AND p.role IN ('staff', 'admin')
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.related_booking_id = r.id AND n.type = 'GATEKEEPER_OVERSTAY' AND n.recipient_id = p.id
    );
END;
$$;

-- We expose this so it can be called safely from an authenticated client or pg_cron
GRANT EXECUTE ON FUNCTION public.process_scheduled_notifications TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_scheduled_notifications TO anon;

SELECT 'Migration 004 complete.' AS result;
