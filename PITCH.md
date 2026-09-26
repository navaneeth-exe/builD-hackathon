# 🎙️ ParkSync: Hackathon 2-Minute Demo Script

## 🎯 The Hook (0:00 - 0:20)
**Speaker 1:** 
"Have you ever spent 15 minutes driving around campus just trying to find a parking spot, only to be late for class? 
We built **ParkSync** to solve this. It's a real-time, smart campus parking system that guarantees you a spot before you even arrive. No more guessing, no more congestion. Let us show you how it works."

## 💻 The Student Experience (0:20 - 0:50)
**Speaker 1 (Driving the screen):**
"First, I'll log in to the **Student Portal**. As you can see, our UI features a modern, glassmorphism design that's mobile-friendly. 
Watch the live availability counters. I can see exactly how many spots are left for Cars, Bikes, and EVs. 
I'm going to book a Car spot in the 'North Campus' lot. 
*(Click Book)* 
Instantly, the system locks that slot and generates a secure, unique QR Pass for me. I can screenshot this or keep it on my phone."

## 🛂 The Gate Operator & Real-time Magic (0:50 - 1:30)
**Speaker 2:**
"Now, let's look at the **Gate Operator Portal**. 
When the student arrives, the gate operator doesn't need to check lists or do manual entries. They just scan the QR code.
*(Open Gate Operator Portal in another tab, simulate scanning or enter manual code)*
Notice how the moment I scan it, the Check-in is verified instantly!
And here’s the best part: Because we use **Supabase Realtime subscriptions**, everything is instantly synced. Look at the **Admin Dashboard**..."

## 📊 The Admin Dashboard & Architecture (1:30 - 2:00)
**Speaker 2 (Switch to Admin Dashboard):**
"The Admin Dashboard updates live without any page reloads. You can see the occupancy just ticked up, and the audit log recorded the exact check-in time.

**How did we build this to scale in just 4 hours?**
1. **Concurrency Safety**: We wrote a custom PostgreSQL RPC (Remote Procedure Call) using **Advisory Locks**. If 500 students try to book the last spot at the exact same millisecond, the database safely queues them, preventing any double-booking.
2. **Real-time Sync**: We utilized WebSockets via Supabase to instantly push updates to the Gate and Admin screens.
3. **No Backend Bottlenecks**: By leaning on Postgres RPCs and Row Level Security, we eliminated the need for a heavy intermediate Node.js server, keeping our system blazing fast and cost-effective.

**ParkSync** is ready to deploy on campus today. Thank you!"

---

## 🛠️ Setup Checklist Before You Present:
- [ ] **Reset the Demo**: Go to the Admin Dashboard and click the red `Reset Demo Data` button to clear any test data.
- [ ] **Window Setup**: Have 3 tabs ready:
  1. Student Portal
  2. Gate Operator
  3. Admin Dashboard
- [ ] **Zoom/Scale**: Ensure your browser zoom is at 100% so the UI looks crisp on the projector.
