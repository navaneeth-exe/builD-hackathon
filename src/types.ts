// ==========================================
// ParkSync — Central Type Definitions
// ==========================================

export type SlotStatus = 'AVAILABLE' | 'RESERVED' | 'OCCUPIED' | 'UNAVAILABLE';
export type BookingStatus = 'CONFIRMED' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED';
export type SlotType = 'REGULAR' | 'EV_CHARGING' | 'ACCESSIBLE' | 'Car' | 'Bike' | 'EV';

// Parking Area (maps to `lots` table)
export interface ParkingArea {
  id: string;
  name: string;
  description: string | null;    // maps from `location`
  created_at: string;
}

// Parking Slot (maps to `slots` table)
export interface ParkingSlot {
  id: string;
  slot_number: string;
  area_id: string;               // maps from `lot_id`
  slot_type: string;
  is_active: boolean;
  created_at: string;
  // joined
  parking_areas?: ParkingArea;
}

export interface SlotWithStatus extends ParkingSlot {
  status: SlotStatus;
}

// Booking (maps to `reservations` table)
export interface Booking {
  id: string;
  booking_code: string;          // maps from `reference_code`
  user_name: string;             // maps from `user_name`
  user_role: string;             // maps from `user_type`
  slot_id: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  license_plate?: string;
  checked_in_at: string | null;
  checked_out_at: string | null;
  created_at: string;
  // joined
  parking_slots?: ParkingSlot & { parking_areas?: ParkingArea };
}

export interface DashboardStats {
  total: number;
  available: number;
  reserved: number;
  occupied: number;
}
