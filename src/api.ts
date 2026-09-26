import { supabase } from './lib/supabase';
import type { BookingStatus, SlotStatus } from './types';

// =========================================================
// NOTE: The Supabase schema uses:
//   - `lots` table  → we expose as ParkingArea (with `location` as description)
//   - `slots` table → we expose as ParkingSlot (with `lot_id` as area_id)
//   - `reservations` table → we expose as Booking (with reference_code as booking_code)
// =========================================================

// ---- Map a raw `lot` row to ParkingArea shape ----
function mapLot(raw: any) {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.location ?? raw.description ?? null,
    created_at: raw.created_at,
  };
}

// ---- Map a raw `slot` row to ParkingSlot shape ----
function mapSlot(raw: any) {
  return {
    id: raw.id,
    slot_number: raw.slot_number,
    area_id: raw.lot_id ?? raw.area_id,
    slot_type: normalizeSlotType(raw.slot_type),
    is_active: raw.is_active,
    created_at: raw.created_at,
    parking_areas: raw.lots ? mapLot(raw.lots) : undefined,
  };
}

function normalizeSlotType(t: string): string {
  if (!t) return 'Car';
  const u = t.toUpperCase();
  if (u === 'EV_CHARGING') return 'EV';
  if (u === 'ACCESSIBLE') return 'Accessible';
  if (u === 'REGULAR') return 'Car';
  return t;
}

// ---- Map a raw `reservation` row to Booking shape ----
function mapReservation(raw: any) {
  return {
    id: raw.id,
    booking_code: raw.reference_code ?? raw.booking_code ?? raw.qr_token ?? raw.id,
    user_name: raw.user_name ?? 'John Smith',
    user_role: raw.user_type ?? 'Student',
    slot_id: raw.slot_id,
    start_time: raw.start_time,
    end_time: raw.end_time,
    status: raw.status as BookingStatus,
    license_plate: raw.license_plate ?? 'N/A',
    checked_in_at: raw.checked_in_at ?? null,
    checked_out_at: raw.checked_out_at ?? null,
    created_at: raw.created_at,
    parking_slots: raw.slots ? {
      ...mapSlot(raw.slots),
      parking_areas: raw.slots?.lots ? mapLot(raw.slots.lots) : undefined,
    } : undefined,
  };
}

// ==========================================
// Parking Areas (from `lots`)
// ==========================================

export async function fetchParkingAreas() {
  const { data, error } = await supabase
    .from('lots')
    .select('*')
    .order('name');
  if (error) throw error;
  return (data ?? []).map(mapLot);
}

// ==========================================
// Parking Slots (from `slots`)
// ==========================================

export async function fetchSlotsForArea(areaId: string) {
  const { data, error } = await supabase
    .from('slots')
    .select('*, lots(*)')
    .eq('lot_id', areaId)
    .eq('is_active', true)
    .order('slot_number');
  if (error) throw error;
  return (data ?? []).map(mapSlot);
}

export async function fetchAllSlots() {
  const { data, error } = await supabase
    .from('slots')
    .select('*, lots(*)')
    .order('slot_number');
  if (error) throw error;
  return (data ?? []).map(mapSlot);
}

// Returns slot IDs with conflicting reservations
export async function fetchConflictingSlotIds(
  areaId: string,
  startTime: string,
  endTime: string,
  excludeBookingId?: string
): Promise<string[]> {
  let query = supabase
    .from('reservations')
    .select('slot_id, slots!inner(lot_id)')
    .in('status', ['CONFIRMED', 'CHECKED_IN'])
    .lt('start_time', endTime)
    .gt('end_time', startTime);

  if (excludeBookingId) {
    query = query.neq('id', excludeBookingId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? [])
    .filter((b: any) => b.slots?.lot_id === areaId)
    .map((b: any) => b.slot_id);
}

export function computeSlotStatus(
  slot: { id: string; is_active: boolean },
  conflictIds: string[]
): SlotStatus {
  if (!slot.is_active) return 'UNAVAILABLE';
  if (conflictIds.includes(slot.id)) return 'RESERVED';
  return 'AVAILABLE';
}

// ==========================================
// Dashboard Statistics
// ==========================================

export async function fetchDashboardStats(areaId?: string) {
  let slotsQ = supabase.from('slots').select('id', { count: 'exact' }).eq('is_active', true);
  if (areaId) slotsQ = slotsQ.eq('lot_id', areaId);
  const { count: total, error: se } = await slotsQ;
  if (se) throw se;

  const now = new Date().toISOString();
  let bookQ = supabase
    .from('reservations')
    .select('slot_id, status, slots!inner(is_active, lot_id)')
    .in('status', ['CONFIRMED', 'CHECKED_IN'])
    .lt('start_time', now)
    .gt('end_time', now);
  if (areaId) bookQ = (bookQ as any).eq('slots.lot_id', areaId);

  const { data: active, error: be } = await bookQ;
  if (be) throw be;

  const occupied = (active ?? []).filter((b: any) => b.status === 'CHECKED_IN').length;
  const reserved = (active ?? []).filter((b: any) => b.status === 'CONFIRMED').length;
  const t = total ?? 0;

  return { total: t, available: Math.max(0, t - occupied - reserved), reserved, occupied };
}

// ==========================================
// Bookings (from `reservations`)
// ==========================================

export async function createBooking(
  slotId: string,
  startTime: string,
  endTime: string,
  userName: string,
  userRole: string,
  licensePlate: string = 'N/A'
) {
  // Generate a deterministic reference code client-side
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  const refCode = `PS-${dateStr}-${rand}`;

  const { data, error } = await supabase.rpc('book_parking_slot', {
    p_slot_id: slotId,
    p_user_name: userName,
    p_user_type: userRole,
    p_license_plate: licensePlate.toUpperCase().trim() || 'N/A',
    p_start_time: startTime,
    p_end_time: endTime,
    p_reference_code: refCode,
    p_qr_token: refCode,
  });
  if (error) throw error;
  // Returns jsonb with {id, referenceCode, slotId, status}
  const result = typeof data === 'string' ? JSON.parse(data) : data;
  return result?.id ?? result;
}

export async function fetchMyBookings() {
  // RLS will ensure we only get the authenticated user's bookings.
  const { data, error } = await supabase
    .from('reservations')
    .select('*, slots(*, lots(*))')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapReservation);
}

export async function fetchBookingByCode(code: string) {
  const cleanCode = (code || '').trim();
  if (!cleanCode) throw new Error('Booking code cannot be empty.');

  // Try reference_code first
  let { data } = await supabase
    .from('reservations')
    .select('*, slots(*, lots(*))')
    .eq('reference_code', cleanCode)
    .maybeSingle();

  // Then try qr_token
  if (!data) {
    const res2 = await supabase
      .from('reservations')
      .select('*, slots(*, lots(*))')
      .eq('qr_token', cleanCode)
      .maybeSingle();
    data = res2.data;
  }

  // Then try id (UUID or string)
  if (!data) {
    const res3 = await supabase
      .from('reservations')
      .select('*, slots(*, lots(*))')
      .eq('id', cleanCode)
      .maybeSingle();
    data = res3.data;
  }

  if (!data) {
    throw new Error('No booking found with that ID or QR pass.');
  }

  return mapReservation(data);
}

export async function fetchBookingById(id: string) {
  const { data, error } = await supabase
    .from('reservations')
    .select('*, slots(*, lots(*))')
    .eq('id', id)
    .single();
  if (error) throw error;
  return mapReservation(data);
}

export async function updateBookingStatus(id: string, status: BookingStatus) {
  if (status === 'CHECKED_IN') {
    const { error } = await supabase.rpc('checkin_booking', { p_booking_id: id });
    if (error) throw error;
  } else if (status === 'COMPLETED') {
    const { error } = await supabase.rpc('checkout_booking', { p_booking_id: id });
    if (error) throw error;
  } else if (status === 'CANCELLED') {
    const { error } = await supabase.rpc('cancel_booking', { p_booking_id: id });
    if (error) throw error;
  } else {
    // Other statuses shouldn't be directly updated this way by the frontend.
    throw new Error('Unsupported status update operation.');
  }
}

export async function cancelBooking(id: string) {
  const { error } = await supabase.rpc('cancel_booking', { p_booking_id: id });
  if (error) throw error;
}

// ==========================================
// Admin
// ==========================================

export async function fetchAllBookings(filters?: { status?: BookingStatus; search?: string }) {
  let query = supabase
    .from('reservations')
    .select('*, slots(*, lots(*))')
    .order('created_at', { ascending: false });

  if (filters?.status) query = query.eq('status', filters.status);
  const { data, error } = await query;
  if (error) throw error;

  let results = (data ?? []).map(mapReservation);
  if (filters?.search) {
    const s = filters.search.toLowerCase();
    results = results.filter(b =>
      b.booking_code?.toLowerCase().includes(s) ||
      b.user_name?.toLowerCase().includes(s) ||
      b.parking_slots?.slot_number?.toLowerCase().includes(s)
    );
  }
  return results;
}

export async function addParkingSlot(
  areaId: string,
  slotNumber: string,
  slotType: string
) {
  // Map slot type back to DB format
  let dbType = slotType;
  if (slotType === 'EV') dbType = 'EV_CHARGING';
  if (slotType === 'Car') dbType = 'REGULAR';
  if (slotType === 'Bike') dbType = 'REGULAR';

  const { data, error } = await supabase.rpc('admin_add_slot', {
    p_lot_id: areaId,
    p_slot_number: slotNumber,
    p_slot_type: dbType,
  });
  
  if (error) throw error;
  
  // Refetch the created slot to map it properly
  const result = typeof data === 'string' ? JSON.parse(data) : data;
  
  const { data: slotData, error: fetchErr } = await supabase
    .from('slots')
    .select('*, lots(*)')
    .eq('id', result.id)
    .single();
    
  if (fetchErr) throw fetchErr;
  return mapSlot(slotData);
}

export async function toggleSlotActive(slotId: string, isActive: boolean) {
  const { error } = await supabase.rpc('admin_toggle_slot', {
    p_slot_id: slotId,
    p_is_active: isActive,
  });
  if (error) throw error;
}

// ==========================================
// Utilities
// ==========================================

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

export function formatDuration(start: string, end: string) {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

// ==========================================
// AI Forecast and Insights
// ==========================================

export async function fetchParkingDemandForecast(minutesAhead: number) {
  const { data, error } = await supabase.rpc('get_parking_demand_forecast', {
    p_minutes: minutesAhead,
  });
  if (error) throw error;
  return data;
}

export async function fetchParkingInsights() {
  const { data, error } = await supabase.functions.invoke('parking_insights');
  if (error) throw error;
  return data;
}
