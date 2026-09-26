# ⚙️ Implementation & Architecture Plan
## ParkSync

This document outlines the architectural decisions and technical implementation strategy used to build ParkSync within the 4-hour hackathon constraint.

### 1. Architecture Overview
We chose a **Client-Heavy, Serverless Backend** model. 
Instead of building a traditional Express.js/Node.js REST API layer (which would consume too much time to write, test, and deploy), we directly interfaced our React frontend with **Supabase (PostgreSQL + PostgREST)**.

- **Frontend:** Vite + React 18 + TypeScript + Tailwind CSS
- **Database:** Supabase PostgreSQL
- **Real-time Engine:** Supabase WebSockets (Realtime)

### 2. Solving the "Concurrency" Problem
**The Challenge:** In a campus environment, multiple students might click "Book" on the exact same parking slot at the same millisecond. A standard `SELECT -> UPDATE` transaction causes race conditions and double-bookings.

**The Solution:** PostgreSQL Advisory Locks.
We wrote a custom database function (RPC) called `book_parking_slot`. 
1. It attempts to acquire a transaction-level advisory lock on the specific slot ID.
2. If the slot is already booked by someone else microseconds earlier, the function safely aborts and returns an error.
3. If successful, it updates the slot status to `BOOKED` and creates the `reservation` record atomically.

### 3. Data Schema
- **`lots`:** Represents a physical parking area (e.g., North Campus).
- **`slots`:** Represents individual spaces (Car/Bike/EV). Has a `status` (`AVAILABLE`, `BOOKED`, `OCCUPIED`).
- **`reservations`:** Links a User ID to a Slot ID. Generates the UUID used for the QR Code.
- **`audit_logs`:** Append-only table tracking system actions (Check-in, Check-out, Booking) for the Admin Dashboard.

### 4. Real-time Synchronization
Using `supabase.channel('postgres_changes')`, the Admin and Gate Operator dashboards listen directly to `INSERT` and `UPDATE` events on the `reservations` and `audit_logs` tables. This enables the UI to react instantly (zero latency) when a QR code is scanned, without requiring the client to poll the database.
