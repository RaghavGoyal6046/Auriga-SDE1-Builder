# PharmaExpiry — FEFO Pharmacy & Stock Management System with Complete Auth & Authorization

PharmaExpiry is an intelligent, production-grade full-stack web application built for retail and hospital pharmacies to strictly enforce **First-Expiry-First-Out (FEFO)** inventory management while maintaining role-based authorization for **ADMIN** and **PHARMACIST** users.

---

## 🛠️ Technology Stack & Architecture

- **Frontend**: React, React Router, TailwindCSS (v4), Lucide Icons
- **Backend**: Node.js & Express.js
- **Database**: MongoDB (Mongoose Schema) with dual SQLite3 fallback for local dev
- **Authentication**: Bearer JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs (10 salt rounds)
- **Google Authentication**: Google OAuth 2.0 / OpenID Connect (`google-auth-library`)
- **Email Verification**: 6-digit numeric OTP via Nodemailer SMTP Service
- **Security**: Helmet headers, Rate limiting (`express-rate-limit`), CORS, Input sanitization

---

## 🚀 Quick Setup & Running Instructions

### Prerequisites
- **Node.js**: v18.x or higher (tested on Node 20 & Node 26)
- **npm**: v9.x or higher
- **MongoDB**: Local MongoDB daemon or MongoDB Atlas connection URI

### 1. Installation & Environment Configuration
Clone the repository, install dependencies, and create your `.env` file:
```bash
git clone <repository-url>
cd Auriga
npm install
cp .env.example .env
```

### 2. Configure Environment Variables (`.env`)
```env
PORT=5001
MONGODB_URI=mongodb://127.0.0.1:27017/pharmaexpiry
JWT_SECRET=super_secret_pharmacy_jwt_key_change_in_production_2026
JWT_EXPIRES_IN=24h

# SMTP Email Service Credentials for OTP Verification
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=pharmacy.alerts.service@gmail.com
SMTP_PASSWORD=your_app_specific_password_here
SMTP_FROM="PharmaExpiry Auth System <pharmacy.alerts.service@gmail.com>"

# Google OAuth 2.0 / OpenID Connect Credentials
GOOGLE_CLIENT_ID=your_google_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:5001/api/auth/google/callback
```

### 3. Run FEFO & Authentication Test Suite
Validate the complete FEFO algorithm and API endpoints:
```bash
npm run test:fefo
```

### 4. Launch Development Environment
Launch both the Express API server (port 5001) and Vite React frontend (port 3000) concurrently:
```bash
npm run dev
```
Open **`http://localhost:3000`** in your browser.

---

## 🔐 User Roles & First-User Bootstrapping Architecture

### 1. Backend-Enforced Roles
There are only two strictly controlled backend roles:
- `ADMIN`: Pharmacy Owner / System Administrator. Can manage pharmacists, activate/deactivate accounts, and inspect full telemetry.
- `PHARMACIST`: Staff Pharmacist. Can view inventory, add batches, inspect stock, and dispense medicines via FEFO POS.
*The backend never trusts a role sent from the React frontend.*

### 2. First-User Bootstrapping
1. When **ZERO users** exist in MongoDB:
   - Public registration is allowed (`POST /api/auth/register`).
   - The first registered user automatically receives `role: "ADMIN"`.
   - The registration form hides role selection.
2. Once an `ADMIN` exists:
   - Public registration is automatically disabled.
   - Any attempt to register publicly returns 403 Forbidden: `"Public registration is disabled. Please contact the administrator."`
   - Only an authenticated `ADMIN` can create new pharmacist accounts via `POST /api/admin/pharmacists`.

---

## 🔑 Authentication & Authorization Endpoints Catalog

### 1. Authentication APIs (`/api/auth`)
| Method | Endpoint | Description | Public / Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/auth/setup-status` | Check if 0 users exist and initial Admin setup is required | Public |
| `POST` | `/api/auth/register` | Register first user as ADMIN (disabled after 1st user) | Public (First user only) |
| `POST` | `/api/auth/login` | Authenticate with email/password and obtain Bearer JWT | Public |
| `GET` | `/api/auth/me` | Fetch authenticated user profile (excludes passwordHash & OTP) | Bearer Token |
| `POST` | `/api/auth/request-otp` | Generate & send 6-digit numeric email OTP code | Public (Rate Limited) |
| `POST` | `/api/auth/verify-otp` | Verify OTP code and activate pharmacist account / reset password | Public |
| `POST` | `/api/auth/google` | Sign in with Google OAuth ID Token (Links Google account or bootstraps 1st Admin) | Public |

### 2. Admin Pharmacist Management APIs (`/api/admin/pharmacists`)
*All `/api/admin/*` endpoints require Bearer JWT token with `ADMIN` role.*

| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/admin/pharmacists` | Admin creates pharmacist account (Backend forces `role = "PHARMACIST"`) | Admin Only |
| `GET` | `/api/admin/pharmacists` | List all pharmacists with search & pagination (`search`, `page`, `limit`) | Admin Only |
| `GET` | `/api/admin/pharmacists/:id` | Get details for specific pharmacist | Admin Only |
| `PATCH` | `/api/admin/pharmacists/:id` | Update pharmacist profile details (`name`, `email`, `phone`) | Admin Only |
| `PATCH` | `/api/admin/pharmacists/:id/status` | Activate/Deactivate pharmacist account (`isActive: boolean`) | Admin Only |

---

## 📧 Email Service & OTP Verification Flow

1. When an Admin creates a pharmacist account via `POST /api/admin/pharmacists`, the system:
   - Sets `isVerified = false` initially.
   - Generates a secure random 6-digit numeric OTP.
   - Hashes the OTP using bcrypt before storing it in MongoDB `otps` collection with a 5-minute expiration timestamp.
   - Dispatches a formatted HTML email via Nodemailer SMTP containing the pharmacy name, OTP code, expiration time, and security notice.
2. Pharmacist verifies email via `POST /api/auth/verify-otp` with their email, OTP code, and chosen password to activate account (`isVerified = true`).

---

## 🌐 Google OAuth 2.0 / OpenID Connect Setup

1. Obtain Google OAuth Client Credentials from the [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_CALLBACK_URL` in `.env`.
3. Behavior:
   - If user exists with matching verified email: Google account is safely linked (`googleId`), preserving existing role (`ADMIN` or `PHARMACIST`).
   - If 0 users exist: First Google sign-in automatically creates the primary `ADMIN` account.
   - If users exist and Google email is not pre-invited by Admin: Login is rejected with `"Your Google account has not been invited by the pharmacy administrator."`

---

## 🧪 FEFO Business Logic & Competition Evaluation Twists

- **Expired Stock Safeguard**: Expired batches are automatically moved to `EXPIRED` status and excluded from all sales calculations.
- **FEFO Allocation**: Items sold are strictly allocated from batches with the **earliest expiry date first**.
- **`/clock` Endpoint**: Daily job flags batches expiring within 7 days and quarantines expired stock.
- **`/api/batches/import-messy` Endpoint**: Cleans, parses, and deduplicates messy batch datasets into valid inventory.
- **`/outbox` Endpoint**: Low-stock outbox notification service triggered when sellable in-date inventory drops below reorder levels.

---

## 📄 License & Compatibility

Compatible with GitHub Codespaces, Linux, macOS, and Windows environments.
