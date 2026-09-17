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
*End of Conversation Log.*
