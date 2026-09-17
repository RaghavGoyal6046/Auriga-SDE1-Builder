# AI Conversation Log — Auriga IT SDE I Builder Round

**Project**: PharmaExpiry — First-Expiry-First-Out (FEFO) Pharmacy & Inventory Management System  
**Repository**: [https://github.com/RaghavGoyal6046/Auriga-SDE1-Builder](https://github.com/RaghavGoyal6046/Auriga-SDE1-Builder)  
**Candidate Name**: Raghav Goyal  
**Institution**: Swami Keshvanand Institute of Technology (SKIT)  
**Drive**: Auriga IT Campus Recruitment Drive — 2027 Batch (SDE I Builder Round)  
**Date**: September 17, 2026  

---

## Turn-by-Turn AI Conversation & Trajectory Log

### Turn 1: Project Assignment & Solution Architecture
> **User Prompt**:  
> "Develop a full-stack First-Expiry-First-Out (FEFO) Pharmacy & Stock Management System based on the Auriga IT campus drive problem specification. Stock must be dispensed strictly by earliest expiry date (`expiry_date ASC`), expired stock must be 100% excluded from sellable stock, quick inquiry queries ('Do we have Paracetamol in date?') must be answered instantly, expiry risk alerts must be generated, and all mandatory evaluation files (`README.md`, `REASONING.md`, `AI_LOGS.md`) must be included."

> **AI Assistant Response**:  
> Deconstructed the problem brief and created a detailed Implementation Plan artifact (`implementation_plan.md`):
> - **Database Choice**: File-based SQLite (`pharmacy.db`) with 5 relational tables (`users`, `medicines`, `batches`, `dispense_records`, `dispense_items`).
> - **FEFO Core Engine**: Sequentially deduct stock from valid non-expired batches ordered by `expiry_date ASC`.
> - **REST APIs**: Auth, Medicines, Batches, FEFO Dispense Preview/Execute, Expiry Risk Alerts, and Telemetry.
> - **Frontend SPA**: React 18 + Vite with dark-mode glassmorphism design system, interactive FEFO live simulator, POS workbench, inventory catalog, batch registry, and 3 Phase 2 roadmap features.

---

### Turn 2: Full-Stack Project Execution & Database Seeding
> **User Prompt**:  
> "The implementation plan is approved. Proceed with full-stack project initialization, database schema creation, initial dataset seeding, API route development, FEFO algorithm test suite creation, and frontend view assembly."

> **AI Assistant Response**:  
> Executed complete full-stack implementation:
> 1. Initialized Node.js/Express + Vite React environment in unified repository structure.
> 2. Implemented `server/db/database.js` using SQLite with foreign keys and seed data (8 medicines, active near-expiry batches, expired batches, Pharmacist & Admin demo accounts).
> 3. Developed REST API modules: `auth.js`, `medicines.js`, `batches.js`, `dispense.js`, `alerts.js`, `dashboard.js`.
> 4. Built standalone test script `server/tests/fefo.test.js` (`npm run test:fefo`).
> 5. Built custom glassmorphism styling in `src/index.css` & `@tailwindcss/vite`.
> 6. Built React UI views: `Navbar.jsx`, `LandingPage.jsx`, `LoginPage.jsx`, `RegisterPage.jsx`, `DashboardPage.jsx`, `DispensePage.jsx`, `InventoryPage.jsx`, `BatchesPage.jsx`, `AlertsPage.jsx`.
> 7. Verified production build (`npm run build`) and generated root files (`README.md`, `REASONING.md`, `AI_LOGS.md`).

---

### Turn 3: Deployment Checklist & Submission Workflow
> **User Prompt**:  
> "Please outline the submission steps and version control workflow for submitting this project to the official Auriga IT recruitment evaluation form."

> **AI Assistant Response**:  
> Provided a 3-step submission guide:
> 1. Initialize local Git repository and commit all workspace files.
> 2. Add remote origin `https://github.com/RaghavGoyal6046/Auriga-SDE1-Builder.git` and push `main` branch.
> 3. Submit public GitHub repository URL via the official Google Form link (`https://forms.gle/AXK2WcMVNE8cU3SWA`).

---

### Turn 4: UI Design Engine & Tailwind Styling Pipeline
> **User Prompt**:  
> "Ensure all UI components, buttons, layout containers, and glassmorphism cards render with full responsive Tailwind CSS utility styles."

> **AI Assistant Response**:  
> Integrated `@tailwindcss/vite` (Tailwind CSS v4) into `vite.config.js` and `src/index.css`. Recompiled CSS asset bundle (42.8 kB), verified dark-mode layout rendering, and restarted the development server on `http://localhost:3000`.

---

### Turn 5: Version Control Remote Configuration & Initial Release
> **User Prompt**:  
> "Configure the Git remote origin to `https://github.com/RaghavGoyal6046/Auriga-SDE1-Builder.git` and push the initial release commit to the main branch."

> **AI Assistant Response**:  
> Added Git remote origin, set default branch to `main`, and pushed 32 project files (9,335 insertions) to the public GitHub repository.

---

### Turn 6: Form Input Icon Alignment & Padding Refinement
> **User Prompt**:  
> "Refine the input field icon positioning on the Sign In and Registration forms so that icons do not overlap with placeholder text."

> **AI Assistant Response**:  
> Added `.form-input.has-icon` class with `padding-left: 2.75rem !important` in `src/index.css` and aligned icons vertically (`top-1/2 -translate-y-1/2`) in `LoginPage.jsx` and `RegisterPage.jsx`. Verified compiled build and pushed update to GitHub.

---

### Turn 7: Pre-Configured Demo Credentials Reference
> **User Prompt**:  
> "Provide the pre-configured login email IDs and passwords for evaluating the application roles."

> **AI Assistant Response**:  
> Displayed demo credential reference table:
> - **Pharmacist**: `pharmacist@pharma.com` / `pharmacy123`
> - **Admin**: `admin@pharma.com` / `admin123`  
> Highlighted the 1-click demo login buttons on `LoginPage.jsx`.

---

### Turn 8: Authentication Route Async Driver Fix
> **User Prompt**:  
> "Investigate and resolve the authentication login route error."

> **AI Assistant Response**:  
> Identified synchronous driver call mismatch in `server/routes/auth.js`. Rewrote route handlers to use async `queryOne` and `execute` helpers from `server/db/database.js`. Verified live authentication (`HTTP 200 OK` with JWT token) and pushed fix to GitHub.

---

### Turn 9: Demo Login Form Input Filling UX
> **User Prompt**:  
> "Update the demo credential buttons on the Sign In page so that clicking a button populates the email and password input fields on screen before manual submission."

> **AI Assistant Response**:  
> Updated `handleFillDemo` in `LoginPage.jsx` to populate input state (`setEmail` & `setPassword`) cleanly without triggering immediate auto-submission. Compiled build and pushed update to GitHub.

---

### Turn 10: Dashboard Today's Sales Telemetry Query Correction
> **User Prompt**:  
> "Investigate and correct the Today's Sales revenue telemetry calculation on the Dashboard page."

> **AI Assistant Response**:  
> Identified SQL query alias mismatch in `server/routes/dashboard.js` (`total_revenue` vs `revenue`). Corrected column alias mapping, updated SQLite date filter to support local and UTC ISO date strings, added fallback formatting `(stats?.todaySales?.revenue || 0).toFixed(2)` in `DashboardPage.jsx`, verified live API response ($45.00 revenue), and pushed fix to GitHub.

---

### Turn 11: Comprehensive System Audit & Feature Optimization
> **User Prompt**:  
> "Conduct an exhaustive end-to-end audit of every feature in the application and implement any performance or functional optimizations."

> **AI Assistant Response**:  
> Built and executed a 7-step automated E2E audit test suite (`server/tests/fefo.test.js`) verifying API health, JWT auth, in-date stock inspection, catalog pagination, FEFO allocation preview, stock deduction, and dashboard metrics (100% PASS). Added **CSV Export** functionality to `InventoryPage.jsx`, verified production build (`npm run build`), and pushed final release to GitHub.

---

### Turn 12: Admin Authorization & First-User Owner Policy Enforcement
> **User Prompt**:  
> "Enforce role security policy: The very first registered user in the system automatically becomes the Primary Pharmacy Owner (Admin). Creating subsequent Pharmacist or Owner accounts requires authorization from an authenticated Admin."

> **AI Assistant Response**:  
> Implemented Role-Based Access Control (RBAC) in `server/routes/auth.js` and `RegisterPage.jsx`:
> - Added `/api/auth/system-status` to inspect system initialization state.
> - **First Setup**: The first registration automatically forces `role = 'Admin'` (Primary Pharmacy Owner).
> - **Subsequent Registrations**: Creating new staff accounts (Pharmacist/Admin) validates the requesting user's Bearer JWT token and requires `req.user.role === 'Admin'`.
> - **UI Security Shield**: `RegisterPage.jsx` displays authorization status and blocks unauthorized public staff creation attempts. Pushed changes to GitHub.

---

### Turn 13: Admin Staff Account Deletion Feature
> **User Prompt**:  
> "Implement staff account deletion functionality allowing an Admin to remove staff accounts with active session protection."

> **AI Assistant Response**:  
> Implemented staff deletion backend and UI:
> - Added `DELETE /api/auth/users/:id` endpoint requiring Admin authorization with self-deletion safeguard (`targetId === req.user.id`).
> - Added interactive **Delete** button with confirmation modal to the **`Manage Staff IDs`** table in `DashboardPage.jsx`. Verified live API deletion (`HTTP 200 OK`) and pushed changes to GitHub.

---

### Turn 14: Relational Foreign Key Integrity for Staff Account Deletion
> **User Prompt**:  
> "Investigate and resolve staff ID deletion failures when deleting accounts associated with historical dispense records."

> **AI Assistant Response**:  
> Identified SQLite `FOREIGN KEY constraint failed` error caused by `dispense_records` referencing deleted user IDs. Updated `DELETE /api/auth/users/:id` in `server/routes/auth.js` to automatically reassign historical dispense audit logs to the active Admin (`UPDATE dispense_records SET user_id = ? WHERE user_id = ?`) prior to deletion. This preserves historical sales audit logs and enables seamless staff account deletion. Verified with live API test (`HTTP 200 OK`) and pushed update to GitHub.

---

### Turn 15: PharmaCompanion Enterprise Clinical UI & Medical Aesthetic Elevation
> **User Prompt**:  
> "Enhance the application user interface to feature a dedicated PharmaCompanion clinical theme with professional pharmaceutical branding, clinical color tokens, typography, and glowing medical pulse badges."

> **AI Assistant Response**:  
> Upgraded application visual design system across all pages:
> - **Brand Identity**: Updated global header branding to **PharmaCompanion | Clinical FEFO ERP** featuring an animated glowing medical status pulse pill and `Plus Jakarta Sans` typography.
> - **Clinical Design System (`src/index.css`)**: Implemented ambient medical background radial glows, emerald-teal clinical gradients, frosted glass panels, and Rx compliance badges.
> - **Medical Workbench & Telemetry**: Redesigned Landing, Dashboard, POS Workbench, and Catalog views to provide a premium enterprise pharmacy ERP aesthetic. Verified build (`npm run build`) and pushed updates to GitHub.

---

### Turn 16: Dynamic Admin Authentication & Google/Mobile OTP Password Recovery
> **User Prompt**:  
> "Remove hardcoded admin ID and password credentials to enforce proper dynamic authentication. Implement password recovery allowing Admins to reset passwords using Google Account and Mobile SMS OTP verification."

> **AI Assistant Response**:  
> Upgraded authentication infrastructure in `server/routes/auth.js`, `server/db/database.js`, and `LoginPage.jsx`:
> - **Dynamic Credentials**: Removed hardcoded seeds from `server/db/database.js` to ensure credentials are generated dynamically via secure bcrypt hashing. Added `phone`, `reset_otp`, and `reset_otp_expiry` columns to SQLite `users` table.
> - **OTP & Google Password Recovery Endpoints**:
>   - `POST /api/auth/request-otp`: Dispatches 6-digit verification code to Google Email or Mobile SMS.
>   - `POST /api/auth/verify-otp`: Validates 6-digit OTP code against expiry timestamp.
>   - `POST /api/auth/reset-password`: Updates user password in SQLite using bcrypt hashing.
>   - `POST /api/auth/google-auth`: Provides seamless Google Account authentication.
> - **Interactive Recovery UI**: Built a 3-step Password Recovery Modal on `LoginPage.jsx` supporting Google & Mobile SMS OTP verification. Verified E2E flow (`HTTP 200 OK`) and pushed updates to GitHub.

---

### Turn 17: Unblocked Seamless First-User Primary Admin Setup & Registration Policy
> **User Prompt**:  
> "Ensure the registration system is fully operational and unblocked so the very first user registering on the platform automatically becomes the Primary Pharmacy Owner (Admin)."

> **AI Assistant Response**:  
> Refined registration policy and unblocked public setup flow:
> - **Backend (`server/routes/auth.js`)**: Updated `POST /api/auth/register` to check for active Admin accounts (`adminCountRes.count === 0`). When no Admin exists, the first registration automatically assigns `role = 'Admin'` (Primary Pharmacy Owner) without requiring token authorization or blocking form fields.
> - **Frontend (`RegisterPage.jsx`)**: Unblocked public registration form view and added real-time status banner alerting the registrant that their account will automatically be created with Primary Admin privileges. Tested live API registration (`HTTP 201 Created`, `role: Admin`) and pushed updates to GitHub.

---

### Turn 18: Competition Evaluation Twists (Automation, Messy Import & Outbox Notification)
> **User Prompt**:  
> "Implement the competition evaluation twists:  
> 1. Level 1 — T2 (automation): A daily job flags batches expiring within 7 days and quarantines expired ones, graded via POST /clock.  
> 2. Level 2 — T4 (messy data): Import a messy batch list (nulls, '10 units', dd/mm/yyyy vs ISO dates, duplicate rows) into correct stock with an { imported, deduped, rejected } report.  
> 3. Level 3 — T1 (integrate): When in-date stock for a medicine drops below a threshold, send a re-order alert via the Notification Service, graded via /outbox."

> **AI Assistant Response**:  
> Implemented all 3 evaluation twists across backend endpoints and SQLite schema:
> - **Level 1 — T2 (`POST /clock` & `POST /api/clock`)**: Created `server/routes/clock.js` executing daily automated status checks: quarantines expired batches (`expiry_date < date`), flags 7-day expiry risk batches, and returns `{ date, quarantined_count, expiring_soon_count, healthy_count }`. Tested live with date simulation.
> - **Level 2 — T4 (`POST /api/batches/import-messy` & `POST /api/batches/import`)**: Built regex-based cleaning and deduplication parser in `server/routes/batches.js` parsing non-standard quantities (`'10 units'`), currency strings (`'$4.50'`), non-standard dates (`dd/mm/yyyy`), and payload/DB duplicates. Returns `{ imported, deduped, rejected, details }`. Tested live (`imported: 2, deduped: 1, rejected: 2`).
> - **Level 3 — T1 (`GET /outbox` & `POST /outbox`)**: Added persistent `outbox` table in SQLite and `server/routes/outbox.js`. Automatically generates `REORDER_ALERT` notification entries whenever sellable in-date stock drops below medicine reorder levels. Tested live API responses and pushed updates to GitHub.

---
*End of Conversation Log.*
