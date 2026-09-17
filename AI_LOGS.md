# AI Collaboration & Interactive Log — Auriga IT Builder Round

**Project**: PharmaExpiry — First-Expiry-First-Out (FEFO) Pharmacy & Inventory Management System  
**Candidate Name**: Candidate / Student Developer  
**Institution**: Swami Keshvanand Institute of Technology (SKIT)  
**Track**: Auriga IT Campus Recruitment Drive — SDE I (Builder Round)  
**Date**: September 17, 2026  

---

## Executive Summary

This log documents the interactive collaboration between the candidate developer and the AI Assistant (Google DeepMind Antigravity / Gemini) during the 2.5-hour SDE I Builder Round. The session focused on interpreting an open-ended pharmacy management storyline, architecting a full-stack solution, implementing a strict **First-Expiry-First-Out (FEFO)** stock allocation engine, building a modern React glassmorphism user interface, executing automated integration tests, and pushing the final solution to a public GitHub repository.

---

## Detailed Log of Interaction & Thought Process

### Phase 1: Problem Interpretation & System Blueprinting
- **Context & Objective**: Analyzed the Auriga IT problem brief regarding retail pharmacy inventory challenges — specifically ensuring stock is dispensed oldest-first (`expiry_date ASC`), preventing expired stock from leaving the pharmacy, tracking true sellable inventory, answering *"do we have Paracetamol in date?"*, and generating expiry risk alerts.
- **Key Technical Decisions**:
  - Selected a single-repository **Node.js/Express + Vite React** stack using file-based **SQLite (`pharmacy.db`)** for zero-config, immediate persistence in Codespaces environments.
  - Defined relational database schema with 5 primary tables: `users`, `medicines`, `batches`, `dispense_records`, and `dispense_items`.
  - Established 3 mandatory evaluation files in root: `README.md`, `REASONING.md`, and `AI_LOGS.md`.

---

### Phase 2: Database Layer & FEFO Engine Engineering
- **Database Connection & Schema Seeding**:
  - Implemented `server/db/database.js` with foreign key enforcement and Promise-based query helpers (`queryAll`, `queryOne`, `execute`).
  - *Engineering Note*: Resolved native C++ build deprecation issues on Node 26 by wrapping standard `sqlite3` driver in clean async/await helper primitives.
  - Seeded sample dataset with 8 medicines, active near-expiry batches (e.g. expiring in 12 days, 25 days), expired batches (e.g. expired 10 days ago), and pre-loaded Pharmacist/Admin credentials.
- **FEFO Allocation Logic**:
  - Structured the FEFO engine query:
    ```sql
    SELECT * FROM batches 
    WHERE medicine_id = ? AND status = 'ACTIVE' AND expiry_date > CURRENT_DATE AND available_quantity > 0
    ORDER BY expiry_date ASC, id ASC
    ```
  - Implemented logic to fulfill order quantities sequentially across chronological batches while strictly ignoring expired inventory.

---

### Phase 3: REST API Service Layer Development
- **Authentication Routes (`server/routes/auth.js`)**:
  - Implemented `/api/auth/register`, `/api/auth/login`, and `/api/auth/me` using JWT token signing and `bcryptjs` password hashing.
- **Medicine Catalog & In-Date Check Routes (`server/routes/medicines.js`)**:
  - Implemented `/api/medicines` with fuzzy name/generic search, category filtering, pagination (`page`, `limit`), and sorting (`name`, `category`, `created_at`).
  - Created `/api/medicines/check-indate?name=Paracetamol` to calculate true sellable stock (excluding expired batches) and return the earliest valid expiry date.
- **Batch Registry Routes (`server/routes/batches.js`)**:
  - Implemented `/api/batches` with status filtering (`ALL`, `ACTIVE`, `EXPIRING_SOON`, `EXPIRED`), batch addition, and `/api/batches/:id/quarantine` status updates.
- **FEFO Dispense & Audit Routes (`server/routes/dispense.js`)**:
  - Implemented `/api/dispense/preview` (FEFO visual simulation before confirming) and `/api/dispense` (atomic stock deduction, invoice reference generation, itemized audit logging).
- **Risk Feeds & Dashboard Telemetry (`server/routes/alerts.js`, `server/routes/dashboard.js`)**:
  - Created categorized expiry risk feeds (`expiredBatches`, `expiring30Batches`, `expiring60Batches`, `lowStockMedicines`) and aggregated sales/stock metrics.

---

### Phase 4: Frontend Development & UI Design System
- **Styling Architecture**:
  - Implemented custom HSL color tokens, dark mode glassmorphism panels, and gradient typography in `src/index.css`.
  - Configured `@tailwindcss/vite` (Tailwind CSS v4) build pipeline for responsive utility classes.
- **Component & View Suite**:
  - **`Navbar.jsx`**: Responsive brand bar with an integrated *"Ask: Do we have X in date?"* search modal.
  - **`LandingPage.jsx`**: Value proposition, key features, target audience breakdown, interactive live FEFO simulator widget, and 3 Phase 2 roadmap features.
  - **`LoginPage.jsx` & `RegisterPage.jsx`**: Auth forms with 1-click evaluator login preset buttons (`Pharmacist` & `Admin`).
  - **`DashboardPage.jsx`**: Telemetry metric cards (Sellable Stock, Expiring Stock, Expired Quarantined Stock, Today's Sales), quick stock checker, and recent transaction audit log.
  - **`DispensePage.jsx`**: FEFO POS workbench featuring visual batch picking timeline breakdowns and a printable receipt modal.
  - **`InventoryPage.jsx`**: Master catalog with search, category filtering, sorting, pagination, CSV export, and batch detail drawer.
  - **`BatchesPage.jsx`**: Granular batch registry with risk indicators (`HEALTHY`, `EXPIRING_SOON`, `EXPIRED`) and new batch creation modal.
  - **`AlertsPage.jsx`**: Expiry risk board with instant quarantine action controls.

---

### Phase 5: Verification, Auditing & Optimization
- **Automated E2E Test Suite (`server/tests/fefo.test.js`)**:
  - Executed a 7-step automated system test covering API health, JWT authentication, in-date availability search, catalog pagination, FEFO batch prioritization preview, stock deduction, and dashboard metrics.
  - Result: **All 7 audit test suites passed with 100% success**.
- **Refinement & UX Fixes**:
  - Fixed input icon padding alignment in auth forms.
  - Corrected SQL date aggregation mapping for Today's Sales revenue telemetry.
  - Added CSV Export functionality to the Medicine Catalog.
- **Production Build Verification**:
  - Executed `npm run build` — successfully transformed 1,610 modules into a production bundle with zero compilation errors.

---

### Phase 6: Version Control & Project Finalization
- Initialized local Git repository, configured `.gitignore`, and committed all source files.
- Added remote origin `https://github.com/RaghavGoyal6046/Auriga-SDE1-Builder.git` and pushed the `main` branch.
- Prepared submission links and root evaluation artifacts (`README.md`, `REASONING.md`, `AI_LOGS.md`).

---
*End of Collaboration Log.*
