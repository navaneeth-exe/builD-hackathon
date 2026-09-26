# ParkSync — Comprehensive Project Context

> **Target Audience:** AI Coding Assistants & Developers resuming work on ParkSync.  
> **Status:** Active development | React 19 + Vite 8 + Supabase + Tailwind CSS v4.

---

## 1. Project Overview

**ParkSync** is a smart campus parking management system designed to eliminate campus parking congestion, automate slot allocations, and streamline entrance/exit verification using QR passes.

### Core Value Proposition
- **Students / Campus Drivers:** View real-time slot availability, reserve parking spots for specified time slots, receive a dynamic QR parking pass, and view booking history.
- **Gatekeepers (Security & Parking Staff):** Scan driver QR codes using camera or manual ID lookup, validate reservations, handle one-click vehicle check-ins and check-outs, and monitor occupied campus lots in real time.
- **Campus Administrators:** Oversee all parking lots and slots, audit active and historical reservations, configure slot availability, and add new parking slots.

---

## 2. Tech Stack

- **Frontend Framework:** React 19 (`react` ^19.2.8, `react-dom` ^19.2.8)
- **Build Tool & Dev Server:** Vite 8 (`vite` ^8.3.0, `@vitejs/plugin-react` ^6.1.1)
- **Language:** TypeScript 6 (`typescript` ~6.0.2) in strict mode with `verbatimModuleSyntax`
- **Routing:** React Router DOM v7 (`react-router-dom` ^7.18.4)
- **Styling:** Tailwind CSS v4 (`@tailwindcss/vite` ^4.3.3) paired with Vanilla CSS custom properties (`@theme` in `src/index.css`)
- **Icons:** Lucide React (`lucide-react` ^1.48.0)
- **QR Engine:**
  - `qrcode.react` (^4.2.0) for SVG QR pass generation
  - `html5-qrcode` (^2.3.8) for camera barcode & QR scanning
- **Backend & Database:** Supabase (PostgreSQL 15, Auth, Row Level Security, PostgreSQL Stored Procedures / RPCs) via `@supabase/supabase-js` (^2.117.2)

---

## 3. Design System & UI Conventions

ParkSync uses a distinct **"Forest & Lime"** modern campus aesthetic.

### Color Palette (from `src/index.css`)
- **Primary Brand (Forest Green):**
  - Dark: `--color-ps-green: #174C3C` (Sidebar, headings, primary buttons)
  - Mid: `--color-ps-green-mid: #1F6B53` (Hover states)
  - Light: `--color-ps-green-light: #E8F4EF` (Subtle active backgrounds)
- **Accent Brand (Neon Lime):**
  - `--color-ps-lime: #C7F36B` (Badges, selected parking slots, highlights)
  - `--color-ps-lime-dark: #A8D44E`
- **Surfaces & Layout:**
  - Page Background: `#F7F8F4`
  - Cards: `#FFFFFF` with border `#E5EAE4` and subtle shadow
  - Text: Dark `#202923`, Muted `#68736B`
- **Parking Slot Status Colors:**
  - `AVAILABLE`: Background `#DDF5E5`, Border `#A7E8BC`, Text `#065F46`
  - `SELECTED`: Background `#C7F36B`, Border `#A8D44E`, Text `#174C3C`
  - `RESERVED`: Background `#FEF0C7`, Border `#FCD34D`, Text `#92400E`
  - `OCCUPIED`: Background `#FCE2E2`, Border `#FCA5A5`, Text `#B91C1C`
  - `UNAVAILABLE`: Background `#E8EBE8`, Border `#D1D5DB`, Text `#9CA3AF`

### UI Conventions
- **App Layout:** Fixed left sidebar (Forest Green), sticky top header (`TopBar`), and fluid main content area (`.app-content`).
- **Cards:** Wrapped in `.ps-card` class with standardized 16px padding and 12px rounded corners.
- **Buttons:** `.btn-primary` (solid Forest Green), `.btn-secondary` (outlined/neutral).
- **Typography:** Inter font family via standard system fallbacks.

---

## 4. Architecture & File Structure

```
builD-hackathon/
├── src/
│   ├── api.ts                   # Central data access layer (Supabase queries & RPC callers)
│   ├── types.ts                 # Canonical TypeScript models (Slot, Booking, Area, Stats)
│   ├── App.tsx                  # Root routes, ProtectedRoute guards, AppLayout wrapper
│   ├── main.tsx                 # React entry point with BrowserRouter & StrictMode
│   ├── index.css                # Design system tokens, Tailwind directives, global styling
│   ├── contexts/
│   │   └── AuthContext.tsx      # AuthProvider, session tracking, profile & role fetching
│   ├── lib/
│   │   └── supabase.ts          # Supabase client instantiation
│   ├── components/
│   │   ├── Sidebar.tsx          # Dynamic role-based navigation sidebar
│   │   ├── TopBar.tsx           # Page header with title, subtitle, and action buttons
│   │   ├── StatusBadge.tsx      # Color-coded badge for booking & slot statuses
│   │   ├── StatCard.tsx         # Dashboard metric cards with icons and trend indicators
│   │   ├── QRPassModal.tsx      # Modal displaying driver QR pass for check-in
│   │   └── ErrorBoundary.tsx    # Class error boundary preventing white screen of death
│   └── pages/
│       ├── Login.tsx            # Unified sign-in page for all roles
│       ├── Dashboard.tsx        # Student user home (summary metrics, active pass card)
│       ├── ReserveParking.tsx   # Interactive parking slot selector and reservation modal
│       ├── MyBookings.tsx       # Driver reservation history with QR pass trigger & cancellation
│       ├── ScanQR.tsx           # Gatekeeper camera scanner & manual booking validation
│       ├── AdminDashboard.tsx   # Admin slot manager, occupancy stats, and booking audits
│       └── gatekeeper/
│           ├── Overview.tsx     # Gatekeeper home (metrics, quick scan button, recent activity)
│           ├── LiveParking.tsx  # Real-time visual slot grid across all campus lots
│           ├── ActiveVehicles.tsx # List of currently checked-in vehicles with duration
│           └── BookingLookup.tsx# Searchable booking registry with quick check-in/out
```

### Route Table & Access Controls

| Route | Component | Allowed Roles | Description |
|---|---|---|---|
| `/login` | `Login` | Public | Authentication |
| `/` | `RootRedirect` | Authenticated | Redirects to role default (`/dashboard`, `/gatekeeper`, `/admin`) |
| `/dashboard` | `Dashboard` | `student` | Student overview & active passes |
| `/reserve` | `ReserveParking` | `student` | Slot booking interface |
| `/bookings` | `MyBookings` | `student` | Driver booking list & QR pass |
| `/gatekeeper` | `GatekeeperOverview` | `staff`, `admin` | Gatekeeper metrics & actions |
| `/gatekeeper/scan` | `ScanQR` | `staff`, `admin` | QR scanner & check-in flow |
| `/gatekeeper/parking` | `GatekeeperParking`| `staff`, `admin` | Live slot grid view |
| `/gatekeeper/vehicles`| `GatekeeperVehicles`| `staff`, `admin`| Checked-in vehicle tracker |
| `/gatekeeper/bookings`| `GatekeeperBookings`| `staff`, `admin`| Searchable reservation registry |
| `/admin` | `AdminDashboard` | `admin` | Lot/slot manager & stats |

---

## 5. Database Schema & Data Flow

Supabase PostgreSQL schema uses the following tables, relations, and conventions:

### Tables & Entity Mappings (in `src/api.ts`)

1. **`lots` (Mapped to `ParkingArea`)**
   - Columns: `id` (UUID, PK), `name` (text), `location` (text, mapped to `description`), `created_at` (timestamptz).
2. **`slots` (Mapped to `ParkingSlot`)**
   - Columns: `id` (UUID, PK), `slot_number` (text), `lot_id` (UUID, FK -> `lots.id`), `slot_type` (text: `REGULAR`, `EV_CHARGING`, `ACCESSIBLE`), `is_active` (boolean), `created_at` (timestamptz).
3. **`reservations` (Mapped to `Booking`)**
   - Columns: `id` (UUID, PK), `reference_code` (text, e.g. `PS-20241021-XXXX`), `qr_token` (text), `slot_id` (UUID, FK -> `slots.id`), `user_name` (text), `user_type` (text), `license_plate` (text), `start_time` (timestamptz), `end_time` (timestamptz), `status` (text: `CONFIRMED`, `CHECKED_IN`, `COMPLETED`, `CANCELLED`), `checked_in_at` (timestamptz), `checked_out_at` (timestamptz), `created_at` (timestamptz).
4. **`profiles` (Mapped to `UserProfile`)**
   - Columns: `id` (UUID, PK -> `auth.users.id`), `full_name` (text), `role` (text: `student`, `staff`, `admin`).

### Stored Procedures / RPCs Called in Frontend
- `book_parking_slot(p_slot_id, p_user_name, p_user_type, p_license_plate, p_start_time, p_end_time, p_reference_code, p_qr_token)`: Atomically reserves a slot and returns the created reservation record.
- `checkin_booking(p_booking_id)`: Transitions booking status from `CONFIRMED` to `CHECKED_IN` and stamps `checked_in_at`.
- `checkout_booking(p_booking_id)`: Transitions booking from `CHECKED_IN` to `COMPLETED` and stamps `checked_out_at`.
- `cancel_booking(p_booking_id)`: Sets status to `CANCELLED` and releases the slot.
- `admin_add_slot(p_lot_id, p_slot_number, p_slot_type)`: Adds a new parking slot under an area.
- `admin_toggle_slot(p_slot_id, p_is_active)`: Toggles active status of a parking spot.

---

## 6. Authentication & Roles

- Authentication uses Supabase email/password sessions handled in `src/contexts/AuthContext.tsx`.
- User profiles in `public.profiles` specify one of three roles:
  1. **`student`**: Driver/user who books spots. Navigates to `/dashboard`.
  2. **`staff`**: Gatekeeper operating entry/exit kiosks. Navigates to `/gatekeeper`.
  3. **`admin`**: System administrator. Has access to both `/admin` and `/gatekeeper/*`.
- `ProtectedRoute` in `src/App.tsx` redirects unauthorized roles automatically to their respective home dashboards.

---

## 7. Implemented Features (Working)

- [x] **Authentication & Role Redirects:** Working login, logout, and role-based route protection.
- [x] **Student Booking Flow (`/reserve`):** Area selection, time window filtering, slot status computation (`AVAILABLE`, `RESERVED`, `OCCUPIED`), and booking submission via RPC.
- [x] **Driver Bookings & QR Pass (`/bookings`):** View bookings, open SVG QR pass in modal (`QRPassModal`), cancel reservation.
- [x] **Gatekeeper Overview (`/gatekeeper`):** Live counts of today's check-ins, occupied spots, and quick link to scanner.
- [x] **Gatekeeper Live Parking Grid (`/gatekeeper/parking`):** Visual slot-by-slot status grid.
- [x] **Gatekeeper Active Vehicles (`/gatekeeper/vehicles`):** Real-time list of vehicles currently on campus.
- [x] **Gatekeeper Booking Registry (`/gatekeeper/bookings`):** Search by ID, user, or license plate with inline check-in/out buttons.
- [x] **Admin Dashboard (`/admin`):** Campus-wide occupancy metrics, slot creation modal, toggle slot active/inactive.
- [x] **Error Boundary Protection:** `ErrorBoundary` catches unexpected render crashes to prevent blank pages.

---

## 8. Incomplete or Known Issues

1. **Real-time Push Updates (Supabase Realtime):**
   - Live slots and dashboard statistics currently update on page load, polling, or after user actions. Supabase realtime channels (`supabase.channel(...)`) are not yet hooked up to broadcast instant changes across browser tabs without manual refresh.
2. **Camera Permissions in Non-Secure Contexts:**
   - `html5-qrcode` requires `localhost` or `https://` to access camera hardware. On insecure HTTP origins (e.g. testing across a local IP `http://192.168.x.x`), the browser blocks camera access. The fallback manual booking ID input handles this scenario.
3. **Time Conflict Validation:**
   - Overlap queries check start and end timestamps. Recurring bookings or multi-day reservations need strict client-side range guards.

---

## 9. Recent Changes & Fixes

1. **Fixed Blank Page on QR Scan (`src/pages/ScanQR.tsx`):**
   - **Root Cause:**
     - The camera scan callback called `html5QrCode.stop()` asynchronously without awaiting completion, while simultaneously calling `setCameraOn(false)`. This immediately removed the `<div id="qr-reader-el">` container from the DOM while the scanner video tracks were still shutting down, causing an unhandled DOM removal rejection.
     - Rapid consecutive scan frames triggered duplicate validation calls without an in-flight processing guard.
     - Rendering booking details threw exceptions if joined slots or dates were malformed, crashing React completely because there was no Error Boundary.
   - **Fix Applied:**
     - Kept `#qr-reader-el` permanently in the DOM with CSS `display: cameraOn ? 'block' : 'none'`, avoiding DOM unmount collisions during scanner cleanup.
     - Added `isProcessingRef` and proper `stopScanner()` teardown with `.clear()`.
     - Added robust input sanitization `parseScannedCode()` that handles raw codes, URLs, and JSON payloads.
     - Added safe fallbacks for slot numbers and date formatting.
2. **Updated Booking Lookup (`src/api.ts`):**
   - Changed `fetchBookingByCode` to use `.maybeSingle()` instead of `.single()` to eliminate uncaught `PGRST116` errors.
   - Added lookup fallback for reservation UUID `id` in addition to `reference_code` and `qr_token`.
3. **Added ErrorBoundary (`src/components/ErrorBoundary.tsx`):**
   - Wrapped `AppLayout` in a React Error Boundary so runtime rendering errors show a recovery card with a reload button instead of an unrecoverable blank screen.

---

## 10. Environment & Setup

### Requirements
- Node.js 18+ (tested with Node 20 / 22)
- npm or yarn

### Commands
```bash
# Install dependencies
npm install

# Run Vite development server
npm run dev

# TypeScript check & Production build
npm run build

# Preview built production bundle
npm run preview
```

### Environment Variables
Supabase credentials are instantiated in `src/lib/supabase.ts`. For production deployment, configure:
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase public publishable key

*(Note: Never commit service role keys or database secret passwords).*

---

## 11. Remaining Tasks & Priority Roadmap

1. **High Priority — Supabase Realtime Slot Sync:**
   - Add a `supabase.channel('public:reservations')` listener in `src/pages/gatekeeper/LiveParking.tsx` and `src/pages/ReserveParking.tsx` so slot color states update instantly across user and gatekeeper screens when a check-in or booking occurs.
2. **Medium Priority — Sound & Haptic Feedback on Gate Scan:**
   - Add subtle audio beep / visual flash confirmation in `ScanQR.tsx` upon successful QR code validation.
3. **Medium Priority — License Plate Recognition (OCR Fallback):**
   - Optional gatekeeper feature to scan or autocomplete license plate if QR pass is unavailable.
4. **Low Priority — Export Reports:**
   - Add CSV export for daily check-in logs in Admin Dashboard.

---

## 12. Important Constraints & Guidelines for Future Agents

- **DO NOT Rebuild or Scaffold:** Do not run `create-vite-app`, change the routing structure, or replace the tech stack.
- **Preserve the Design System:** Keep the Forest Green (`#174C3C`) and Neon Lime (`#C7F36B`) palette, custom card components (`.ps-card`), and existing responsive sidebar layout.
- **Maintain ErrorBoundary & Safe Cleanup:** Whenever modifying camera or video components in `ScanQR.tsx`, ensure DOM container nodes are never abruptly unmounted before media streams stop cleanly.
- **Strict Typing:** Always run `npm run build` to verify TypeScript builds without errors before concluding tasks.
