# AI Interaction Logs — Auriga IT Campus Recruitment Drive (SDE I Builder Round)

This document contains the unmodified interaction and prompt history between the candidate and the AI Assistant (Google DeepMind Antigravity / Gemini 3.6 Flash) during the 2.5-hour Builder Round.

---

## Task & Problem Brief Received

**Storyline**:
"A neighbourhood pharmacy stocks medicines in batches, each with its own expiry date. When they dispense a medicine they should use the batch that expires soonest first, and never dispense an expired batch. The pharmacist wants to know the sellable stock of a medicine (ignoring expired batches), gets asked 'do we have paracetamol in date?', and needs a heads-up on batches about to expire. Build the pharmacy something so stock is always dispensed oldest-first and nothing expired goes out."

---

## Trajectory Summary & Executed Timeline

### Phase 1: Requirements Analysis & Architectural Planning
- Received problem statement and mandatory deliverables checklist (Database, REST APIs, UI, Auth, Search, Landing Page, Pagination/Sorting, README.md, REASONING.md, AI_LOGS.md).
- Designed FEFO (First-Expiry-First-Out) algorithm specification and SQLite schema (`users`, `medicines`, `batches`, `dispense_records`, `dispense_items`).
- Generated formal Implementation Plan artifact (`implementation_plan.md`) and obtained explicit user approval.

### Phase 2: Full-Stack Project & Backend Implementation
- Initialized Node.js / Express backend server with Vite React frontend in unified single repository.
- Created `package.json` with Express, JWT, bcryptjs, SQLite, React, React Router, and Lucide icons.
- Configured Vite API proxy (`vite.config.js`) forwarding `/api` to Express backend on port 5001.
- Implemented SQLite database module (`server/db/database.js`) with Promise-wrapped `sqlite3` helpers (`queryAll`, `queryOne`, `execute`).
- Seeded realistic test dataset:
  - 8 medicines across multiple therapeutic categories.
  - Active batches with near-expiry dates (e.g. 12 days, 25 days) and expired batches (e.g. expired 10 days ago).
  - Pre-loaded Pharmacist (`pharmacist@pharma.com`) and Admin (`admin@pharma.com`) demo credentials.
- Created REST API Route Modules:
  - `server/routes/auth.js`: User registration, JWT authentication, and profile verification.
  - `server/routes/medicines.js`: Medicine catalog CRUD, search, category filtering, pagination, sorting, and `/api/medicines/check-indate` quick inquiry endpoint.
  - `server/routes/batches.js`: Granular batch registry, risk level categorization (`HEALTHY`, `EXPIRING_SOON`, `EXPIRED`), and quarantine actions.
  - `server/routes/dispense.js`: FEFO engine (`/preview` and `/dispense`), atomic batch stock deduction, invoice reference generation, and dispense audit history.
  - `server/routes/alerts.js`: Expiry risk breakdown and low stock warnings.
  - `server/routes/dashboard.js`: High-level inventory telemetry metrics.

### Phase 3: Algorithm Verification Suite
- Created standalone test script `server/tests/fefo.test.js`.
- Executed `npm run test:fefo` and verified that Paracetamol dispensing selects batch expiring in 12 days as Priority #1, batch expiring in 90 days as Priority #2, and completely excludes expired batches.

### Phase 4: Frontend UI/UX Development
- Built custom HSL dark mode design system in `src/index.css` featuring glassmorphism, gradient accents, modern typography (`Inter` & `Outfit`), custom scrollbars, and badges.
- Built `Navbar.jsx` with real-time quick stock search modal ("Do we have X in date?").
- Built `LandingPage.jsx`: Problem overview, key features, target audience, before/after comparison, interactive FEFO live simulator, and 3 future roadmap features.
- Built `LoginPage.jsx` and `RegisterPage.jsx` with 1-click evaluator login presets.
- Built `DashboardPage.jsx`: Telemetry metrics cards, quick stock checker, and recent sales table.
- Built `DispensePage.jsx`: FEFO POS workbench with visual step-by-step batch allocation preview, batch timeline, and printable receipt modal.
- Built `InventoryPage.jsx`: Medicine catalog with search, category filtering, pagination, sorting, and batch breakdown drawer.
- Built `BatchesPage.jsx`: Granular batch registry, risk badges, and batch creation modal.
- Built `AlertsPage.jsx`: Dedicated expiry risk board and quarantine action controls.

### Phase 5: Build Verification & Git Repository Initialization
- Ran `npm run build` to verify clean Rollup bundling (0 errors).
- Generated mandatory root-level evaluation files: `README.md`, `REASONING.md`, and `AI_LOGS.md`.
- Initialized local Git repository, added all project files, and created initial release commit.

---
*End of AI Log.*
