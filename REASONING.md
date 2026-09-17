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
| **Backend Runtime** | Node.js + Express | Highly responsive REST API server with quick JSON serialization and asynchronous I/O. |
| **Database** | File-based SQLite (`pharmacy.db`) | Zero-configuration file database ensuring 100% immediate persistence without requiring external database server setup in GitHub Codespaces. |
| **Database Driver** | Standard `sqlite3` + Async Promise Wrappers | Replaced native C++ compiled drivers (which break on cutting-edge Node versions like Node 26) with standard Promise-wrapped `sqlite3`, guaranteeing universal cross-environment compatibility. |
| **Frontend Framework** | React 18 + Vite | Lightning-fast Single Page Application (SPA) render pipeline with hot module replacement (HMR). |
| **Design System** | Custom HSL Glassmorphism + CSS Utility Classes | Crafted dark mode aesthetic with HSL color tokens, micro-animations, and modern Google Fonts (`Inter` & `Outfit`), avoiding generic framework look. |
| **Authentication** | JWT (JSON Web Tokens) + `bcryptjs` | Stateless, secure authentication with role-based access control (`Pharmacist` vs `Admin`). |

---

## 3. Detailed FEFO Engine Algorithm & Edge Cases

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
- **Expired Batches in Stock**: Completely ignored by the `expiry_date > CURRENT_DATE` filter. Even if a batch has 500 units, if its expiry date was yesterday, it will never be picked or sold.
- **Split Batch Allocation**: If a customer requests 60 units of Paracetamol, and Batch 1 (expiring in 12 days) has 45 units while Batch 2 (expiring in 90 days) has 150 units, the system automatically takes 45 units from Batch 1 and 15 units from Batch 2.
- **Quarantined Stock**: Batches flagged with `status = 'QUARANTINED'` are excluded regardless of their expiry date.

---

## 4. "Do We Have X In Date?" Inquiry Engine

To fulfill the specific user requirement *"gets asked 'do we have paracetamol in date?'"*, we implemented the `/api/medicines/check-indate?name=Paracetamol` endpoint and an interactive navbar search modal.

### Logic:
1. Matches medicine by fuzzy search (`name LIKE '%Paracetamol%' OR generic_name LIKE '%Paracetamol%'`).
2. Calculates `sellableStock` by summing `available_quantity` of active batches expiring in the future.
3. Returns:
   - `inDateAvailable`: `true` if `sellableStock > 0`, else `false`.
   - `sellableStock`: exact number of sellable in-date units.
   - `earliestExpiryDate`: expiry date of the next batch that FEFO will pick.
   - Clear natural language response message suitable for instant customer reassurance.

---

## 5. Testing & Issue Resolution Log

During development, we followed a test-driven approach:

### Bug / Issue #1: Node 26 Native Module Compilation Failure
- **Symptom**: Initial build using `better-sqlite3` failed during `npm install` because Node 26 altered V8 internal headers (`v8::PropertyCallbackInfo<v8::Value>::This()`), breaking `node-gyp` native C++ compilation.
- **Diagnosis**: Inspected npm error log (`task-19.log`) and identified V8 API deprecation mismatch in native C++ bindings.
- **Fix**: Replaced `better-sqlite3` with standard `sqlite3` driver wrapped in clean async/await helper functions (`queryAll`, `queryOne`, `execute`) in `server/db/database.js`. This resolved all native compilation errors while maintaining asynchronous speed.

### Test Validation #2: FEFO Algorithm Verification
- Created a dedicated test script (`server/tests/fefo.test.js`) executed via `npm run test:fefo`.
- Tested Paracetamol stock allocation:
  - Seeded Batch 1 (`PCM-2024-B1`, expiring in 12 days).
  - Seeded Batch 2 (`PCM-2024-B2`, expiring in 90 days).
  - Seeded Batch 3 (`PCM-2023-EX1`, expired 10 days ago).
- **Result**: Test suite confirmed that Batch 1 was selected as Priority #1, Batch 2 as Priority #2, and Batch 3 was 100% excluded. All 3 assertions passed successfully.

---

## 6. Mandatory Deliverables Compliance Checklist

- [x] **Real Persistence**: SQLite database `pharmacy.db` with relational schema (`users`, `medicines`, `batches`, `dispense_records`, `dispense_items`).
- [x] **REST APIs**: Full CRUD and FEFO operation endpoints listed in `README.md`.
- [x] **Usable UI over APIs**: Modern React SPA with HSL glassmorphism design system.
- [x] **User Auth**: JWT-based login & registration with 1-click evaluator login presets.
- [x] **Search**: Global In-Date stock checker and medicine/batch search bars.
- [x] **Landing Page**: Dedicated product page with problem summary, key features, target audience, interactive FEFO demo, and 3 future roadmap features.
- [x] **Pagination & Sorting**: Implemented on inventory, batches, and dispense audit history.
- [x] **Root Files**: `README.md`, `REASONING.md`, and `AI_LOGS.md` present in root folder.
