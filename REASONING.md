# Architectural Reasoning & System Design Document — PharmaExpiry

This document details the engineering thought process, algorithm design, architectural decisions, and testing rationale behind **PharmaExpiry**, built for the Auriga IT Campus Recruitment Drive (Builder Round).

---

## 1. Problem Analysis & Core Philosophy

Retail and hospital pharmacies face a critical challenge: **stock expiry management**. Traditional retail Point of Sale (POS) and inventory systems treat inventory items as homogenous quantities. However, in pharmaceuticals, every unit belongs to a specific manufacturing batch with a distinct expiry date.

### Key Pain Points Solved:
1. **Accidental Dispensing of Expired Stock**: Human error often leads pharmacists to pick boxes from the front of shelves without checking expiry dates.
2. **False Inventory Confidence**: Systems that count expired stock as part of "total available inventory" misinform pharmacists when patients ask *"Do we have Paracetamol in date?"*.
3. **Financial Stock Loss**: Batches with shorter shelf lives rot at the back of shelves while newer batches are sold first.

### Solution Principles:
- **Strict FEFO Enforcement**: Stock is ordered and allocated strictly by earliest expiry date (`expiry_date ASC`).
- **Expired Stock Isolation**: Expired batches (`expiry_date <= CURRENT_DATE`) are automatically excluded from all sellable stock queries and FEFO dispense logic.
- **Granular Batch Audit**: Every transaction records the exact batch code, expiry date, and shelf location used to fulfill the sale.

---

## 2. Technical Stack & Architectural Rationale

| Component | Choice | Rationale |
| :--- | :--- | :--- |
| **Backend Runtime** | Node.js + Express | Highly responsive REST API and web server with quick JSON serialization, asynchronous non-blocking I/O, and low memory footprint. |
| **Database** | MySQL (`mysql2/promise`) | Enterprise relational database providing strict schema enforcement, ACID transactions, foreign keys, and indexes on expiry dates. Supported by an embedded engine fallback for instant zero-configuration testing. |
| **Frontend Architecture** | Native Vanilla Web UI (HTML5, CSS3, JS) | Removed React and Vite bundler dependencies to eliminate build-step overhead, eliminate client-side bundle bloat, and serve pages instantly directly from Express (`public/`). |
| **Design System** | Dark Clinical Glassmorphism | Custom CSS3 theme with CSS variables, responsive CSS grid, glassmorphism cards, badges, modals, and printable receipt stylesheets. |
| **Authentication** | JWT (JSON Web Tokens) + `bcryptjs` | Stateless, secure authentication with backend-enforced role-based access control (`ADMIN` vs `PHARMACIST`). |

---

## 3. Removal of React in Favor of Lean Native Architecture

### Architectural Decision:
The application was migrated from a React SPA to a pure Node.js + Express + MySQL stack:
1. **Zero Bundling & Compilation Step**: Removed Vite, `@vitejs/plugin-react`, and 100+ npm frontend dependencies. The server now runs directly with `node server/index.js` without requiring build artifacts.
2. **Instant Delivery**: Static HTML/CSS/JS assets in `public/` are served with gzip/deflate compression directly by Express, achieving instant page loads and zero hydration delay.
3. **Identical Functional Parity**: All views previously in React were re-engineered in clean, modular vanilla HTML5/JS:
   - **Executive Dashboard** (`/dashboard`): 6 real-time telemetry cards, quick search, recent dispenses.
   - **FEFO POS Dispenser** (`/dispense`): Real-time sequential batch preview, atomic stock deduction, and modal invoice receipt.
   - **Inventory Catalog** (`/inventory`): Search, category filters, and product creation modal.
   - **Batch Registry** (`/batches`): Lot risk level indicators, shelf location tracking, and batch registration.
   - **Expiry Alerts** (`/alerts`): Expired lots quarantine view, 30/60 day expiry projections, and low-stock re-order monitor.
   - **Authentication & Setup** (`/login`, `/register`): First-user Admin bootstrap and secure login.

---

## 4. Detailed FEFO Engine Algorithm & Edge Cases

The core engine resides in `server/routes/dispense.js`. When a dispense request for quantity $Q$ of medicine $M$ arrives, the following algorithm executes:

### Algorithm Breakdown:
1. **Query Active Valid Batches**:
   ```sql
   SELECT * FROM batches 
   WHERE medicine_id = M 
     AND status = 'ACTIVE' 
     AND expiry_date > CURRENT_DATE 
     AND available_quantity > 0
   ORDER BY expiry_date ASC, id ASC
   ```
2. **Sequential Batch Allocation**:
   - Initialize `remainingToFulfill = Q`.
   - Iterate through the sorted list of valid batches.
   - For each batch $B$, calculate `takeQty = min(B.available_quantity, remainingToFulfill)`.
   - Deduct `takeQty` from $B$ and log the allocation breakdown.
   - Subtract `takeQty` from `remainingToFulfill`.
   - If `remainingToFulfill == 0`, break loop.
3. **Atomic Validation & Commitment**:
   - If total allocated across all valid batches $< Q$, abort the transaction and return an explicit error displaying available vs required quantity.
   - Otherwise, execute atomic database updates to decrement batch `available_quantity` and insert records into `dispense_records` and `dispense_items`.

### Key Edge Cases Handled:
- **Expired Batches in Stock**: Completely ignored by the `expiry_date > CURRENT_DATE` filter. Even if an expired batch has 500 units, it will never be picked or sold.
- **Split Batch Allocation**: If a customer requests 60 units of Paracetamol, and Batch 1 (expiring in 12 days) has 45 units while Batch 2 (expiring in 90 days) has 150 units, the system automatically takes 45 units from Batch 1 and 15 units from Batch 2.
- **Quarantined Stock**: Batches flagged with `status = 'EXPIRED'` or `status = 'QUARANTINED'` are isolated from the POS.

---

## 5. "Do We Have X In Date?" Inquiry Engine

To fulfill the specific user requirement *"gets asked 'do we have paracetamol in date?'"*, we implemented the `/api/medicines/check-indate?name=Paracetamol` endpoint and an interactive live search widget on both the landing page and dashboard.

### Logic:
1. Matches medicine by search query (`name LIKE ? OR generic_name LIKE ?`).
2. Calculates `sellableStock` by summing `available_quantity` of active batches expiring in the future.
3. Returns:
   - `inDateAvailable`: `true` if `sellableStock > 0`, else `false`.
   - `sellableStock`: exact number of sellable in-date units.
   - `earliestExpiryDate`: expiry date of the next batch that FEFO will pick.
   - `nextBatchToDispense`: batch lot number and physical shelf rack.
   - Natural language response message suitable for instant customer reassurance.

---

## 6. Testing & Audit Verification Log

All 7 test suites pass with 100% success (`npm run test:fefo`):
1. **Schema & Data Integrity**: Verified medicines, batches, and users tables.
2. **Authentication & Password Verification**: Validated bcrypt salt hashing and JWT token issuance.
3. **In-Date Stock Inquiry**: Confirmed in-date sellable stock is returned while expired lots are excluded.
4. **Catalog Search & Querying**: Verified fuzzy search and pagination.
5. **FEFO Allocation Engine**: Validated sequential batch allocation strictly by earliest expiry date.
6. **Dispense Execution & Receipt Generation**: Verified atomic stock deduction and invoice generation.
7. **Telemetry & Expiry Risk Feeds**: Confirmed quarantine and 30-day expiry counts.
