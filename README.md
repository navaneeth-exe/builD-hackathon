# ParkSync - Smart Campus Parking System

**Built for builD Hackathon 2026**

ParkSync is a modern, real-time smart campus parking management system designed to solve the chaos of campus parking by providing seamless reservations, real-time availability tracking, and automated QR-code based entry/exit for students and staff.

## Features

* **Student / Staff Portal**: View live parking slot availability and book a slot instantly to guarantee a spot.
* **Atomic Reservations**: Prevents double-booking and race conditions using Postgres advisory locks.
* **Gate Operator Portal**: Equipped with a QR code scanner (webcam support) to quickly check-in/check-out vehicles upon arrival and departure.
* **Admin Dashboard**: Real-time operational oversight, seeing active reservations, total available slots, and an audit trail of activity.
* **Live Updates**: Built with Supabase Realtime, so as soon as a slot is booked, the UI updates for everyone instantly.

## Tech Stack

* **Frontend**: React 18, Vite, TypeScript, Tailwind CSS v4, Lucide React
* **Backend**: Supabase (PostgreSQL, Realtime, RPC Stored Procedures), Node.js/Express
* **Architecture**: Serverless-first approach relying on Postgres Row Level Security and Stored Procedures for atomic transactions.

## Setup Instructions

### 1. Prerequisites
- Node.js v18+
- npm or yarn

### 2. Installation
Clone this repository and install the dependencies:
```bash
npm install
```

### 3. Environment Variables
The Supabase URL and Anon Key are already provided in `src/lib/supabase.ts` for the hackathon demonstration purposes. No `.env` setup is strictly required to run the frontend demonstration.

### 4. Running the Application
Start the development server:
```bash
npm run dev
```

Open your browser and navigate to `http://localhost:5173`.

## Demonstration Flow

1. **Home Screen**: Open `http://localhost:5173`. You will see three main entry points.
2. **Student Portal**:
   - Go to the Student/Staff portal.
   - Click on an available green slot.
   - Fill in your details (Name, License Plate, Duration).
   - Click Confirm. You will see a success page with a generated QR Code.
3. **Gate Operator**:
   - Open the Gate Operator portal.
   - Either scan the QR code using your laptop webcam OR paste the `QR-XXXX` token in the manual input field.
   - Click "Check In Vehicle". The status will change to `CHECKED_IN`.
   - When leaving, scan again and click "Check Out Vehicle".
4. **Admin Dashboard**:
   - Open the Admin Dashboard to see live updates to the slot availability and the recent activity logs matching your exact booking.

## Future Enhancements
- Automated license plate recognition (ALPR).
- Payment gateway integration for paid lots.
- Push notifications for booking expirations.

---
*Developed by our 2-person team during the 4-hour hackathon constraints using Google Antigravity.*
