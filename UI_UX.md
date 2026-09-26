# 🎨 UI/UX Design System & Strategy
## ParkSync

### 1. Design Philosophy
For this hackathon, we adopted a **"Weightless & Spatial"** design language, heavily leaning into **Glassmorphism**. The goal is to make a campus utility app feel like a premium, state-of-the-art fintech or lifestyle application.

### 2. Color Palette
- **Primary:** Electric Blue (`#2563EB`) & Indigo (`#4F46E5`) for primary actions.
- **Backgrounds:** Spatial mesh gradients with soft, blurred orbs to create depth.
- **Surfaces:** Translucent white panels with varying opacities (`rgba(255,255,255,0.7)`) and subtle white borders.
- **Accents:** Emerald Green (`#10B981`) for available statuses, Coral/Red for errors or occupied states.

### 3. Typography
- **Primary Font:** `Inter` (sans-serif) for clean, readable numbers and technical data.
- **Hierarchy:**
  - `h1`: Bold, tight tracking for hero sections.
  - `h2/h3`: Semi-bold for panel headers.
  - `p`: Medium gray (`text-gray-500`) for secondary information to reduce cognitive load.

### 4. Key UX Flows
#### A. The Booking Experience
1. User lands on dashboard, instantly sees visual capacity gauges.
2. Selects vehicle type via segmented control (visual icons for Car/Bike/EV).
3. Clicks "Book".
4. *Micro-animation:* A success checkmark appears, followed by a sliding transition to reveal the generated QR code ticket.

#### B. The Gate Operator Experience
1. High-contrast UI suitable for outdoor/daylight environments.
2. Large, prominent camera viewfinder.
3. *Feedback loop:* Immediate large colored banner (Green = Verified, Red = Invalid) upon scan.

### 5. Implementation Details
- Built with **Tailwind CSS v4** utilizing arbitrary values for blurs (`backdrop-blur-xl`).
- Interactions powered by React state transitions and standard CSS transitions (`transition-all duration-300`).
