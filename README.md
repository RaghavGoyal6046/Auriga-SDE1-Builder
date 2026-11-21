# PharmaExpiry — FEFO Pharmacy & Stock Management System

PharmaExpiry is an intelligent, production-grade full-stack web application built for retail and hospital pharmacies to strictly enforce **First-Expiry-First-Out (FEFO)** inventory management while maintaining role-based authorization for **ADMIN** (Pharmacy Owner) and **PHARMACIST** (Staff) users.

The system is built purely with **Node.js, Express.js, and MySQL** — with zero React or frontend bundler dependencies.

---

## 🛠️ Technology Stack & Architecture

- **Backend Runtime**: Node.js & Express.js
- **Database Engine**: **MySQL** (via `mysql2/promise` with connection pooling) + embedded database fallback for zero-configuration testing
- **Schema & Tables**: Relational schema (`schema.sql`) with foreign key constraints, cascading deletes, and indexing on expiry dates
- **Frontend Web UI**: Pure HTML5, Modern CSS3 (Dark Clinical Glassmorphism), and Vanilla JavaScript served directly by Express (`public/`)
- **Authentication**: Bearer JWT (JSON Web Tokens) with Email OTP Password Recovery
- **Password Hashing**: `bcryptjs` (10 salt rounds)
- **Email Verification**: 6-digit numeric OTP via Nodemailer SMTP Service
- **Security**: Helmet HTTP headers, Rate limiting (`express-rate-limit`), CORS, Input sanitization

---

## 🚀 Quick Setup & Running Instructions

### Prerequisites
- **Node.js**: v18.x or higher (tested on Node 20 & Node 26)
- **npm**: v9.x or higher
- **MySQL Server** (Optional/Recommended): MySQL 8.x / MariaDB 10.x running on port 3306

### 1. Installation & Environment Configuration
```bash
git clone <repository-url>
cd Auriga
npm install
cp .env.example .env
```

### 2. Configure Environment Variables (`.env`)
```env
PORT=5001

# MySQL Database Connection
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=pharmaexpiry

# JWT Secret & Token Expiry
JWT_SECRET=super_secret_pharmacy_jwt_key_change_in_production_2026
JWT_EXPIRES_IN=24h

# SMTP Email Service Credentials for OTP Verification
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=pharmacy.alerts.service@gmail.com
SMTP_PASSWORD=your_app_specific_password_here
SMTP_FROM="PharmaExpiry Auth System <pharmacy.alerts.service@gmail.com>"
```

### 3. Run FEFO & System Audit Test Suite
Validate the complete FEFO algorithm, database integrity, and API endpoints:
```bash
npm run test:fefo
```

### 4. Launch Application Server
Launch the unified Node.js + Express web server:
```bash
npm start
# or for auto-reloading during development:
npm run dev
```

Open **`http://localhost:5001`** in your browser to access the complete application!

---

## 🐬 MySQL Database Schema

The database schema is defined in **`schema.sql`** and is automatically executed upon startup. It creates the following 7 relational tables:

1. **`users`**: User accounts with roles (`ADMIN`, `PHARMACIST`), password hashes, and active/verified flags.
2. **`medicines`**: Product catalog with generic formula, therapeutic category, packaging unit, and reorder thresholds.
3. **`batches`**: Individual manufacturing lot codes with manufacturing date, expiry date, unit price, available quantity, shelf rack location, and status (`ACTIVE`, `EXPIRED`).
4. **`dispense_records`**: Outbound sales invoices tracking invoice reference number, patient name, dispensing user ID, total bill amount, and timestamp.
5. **`dispense_items`**: Granular transaction line items recording the specific batch ID, quantity deducted, unit price, and subtotal.
6. **`outbox`**: Notification message queue for stock drops below re-order thresholds.
7. **`otps`**: Single-use 6-digit verification codes with bcrypt hashes and expiration timestamps.

---

## 🔐 User Roles & Admin Staff Management Architecture

### 1. Backend-Enforced Roles
There are only two strictly controlled backend roles:
- `ADMIN`: Pharmacy Owner / System Administrator. Can manage staff, view comprehensive telemetry, and configure inventory.
- `PHARMACIST`: Staff Pharmacist. Can view inventory, add batches, inspect stock, and dispense medicines via FEFO POS.

### 2. First-User Bootstrapping
1. When **ZERO users** exist in the database:
   - Public registration is allowed (`POST /api/auth/register`).
   - The first registered user automatically receives `role: "ADMIN"` (Primary Owner).
2. Once an `ADMIN` exists:
   - Public registration is automatically disabled.
   - Any attempt to register publicly returns 403 Forbidden: `"Public registration is disabled. Please contact the administrator."`
   - Only an authenticated `ADMIN` can create new pharmacist staff accounts via `POST /api/admin/pharmacists`.

---

## 🔑 Endpoints Catalog

### 1. Authentication APIs (`/api/auth`)
| Method | Endpoint | Description | Public / Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/auth/setup-status` | Check if 0 users exist and initial Admin setup is required | Public |
| `POST` | `/api/auth/register` | Register first user as ADMIN (disabled after 1st user) | Public (First user only) |
| `POST` | `/api/auth/login` | Authenticate with email/password and obtain Bearer JWT | Public |
| `GET` | `/api/auth/me` | Fetch authenticated user profile | Bearer Token |
| `POST` | `/api/auth/request-otp` | Generate & send 6-digit numeric email OTP code | Public (Rate Limited) |
| `POST` | `/api/auth/verify-otp` | Verify OTP code and activate pharmacist account / reset password | Public |

### 2. Inventory & FEFO Dispensing APIs
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/medicines/check-indate` | Instant in-date stock inquiry ("Do we have Paracetamol in date?") | Public |
| `GET` | `/api/medicines` | Search, filter, and paginate medicine catalog with sellable stock | Public |
| `POST` | `/api/medicines` | Add a new medicine formulation to catalog | Auth Required |
| `GET` | `/api/batches` | List batches ordered by expiry date with risk level badges | Public |
| `POST` | `/api/batches` | Register new batch into inventory | Auth Required |
| `POST` | `/api/dispense/preview` | Simulate FEFO sequential batch allocation without mutating DB | Auth Required |
| `POST` | `/api/dispense` | Execute FEFO stock deduction and generate official receipt | Auth Required |
| `GET` | `/api/dispense/history` | Audit log of previous dispensing transactions | Auth Required |
| `GET` | `/api/alerts/expiring` | Telemetry breakdown: Expired, Expiring in 30/60 Days, Low Stock | Public |
| `GET` | `/api/dashboard/stats` | High-level metrics for executive operations dashboard | Public |
| `POST` | `/api/clock` | Daily job to quarantine expired stock and sync outbox alerts | Public |
| `GET` | `/api/outbox` | Low-stock notification outbox queue | Public |

---

## 🧪 FEFO Business Logic Verification

- **Strict FEFO Order**: Stock is always allocated sequentially starting from the batch with the **earliest expiry date** (`ORDER BY expiry_date ASC`).
- **Expired Stock Isolation**: Any batch where `expiry_date <= CURRENT_DATE` is automatically flagged as `EXPIRED` and 100% excluded from sellable stock.
- **Atomic Stock Deduction**: Each dispense transaction atomically decrements the batch's `available_quantity` and creates an immutable invoice audit trail.

---

## 📄 License & Compatibility

Compatible with Linux, macOS, and Windows environments.
