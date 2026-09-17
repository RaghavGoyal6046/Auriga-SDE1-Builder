# PharmaExpiry — FEFO Pharmacy & Stock Management System

PharmaExpiry is an intelligent, full-stack web application built for retail and hospital pharmacies to strictly enforce **First-Expiry-First-Out (FEFO)** inventory management. It guarantees that medicines with the earliest expiry dates are dispensed first, prevents expired stock from being dispensed, calculates real-time sellable inventory, and provides an instant "In-Date Stock Inspector".

---

## 🚀 Quick Setup & Running Instructions

### Prerequisites
- **Node.js**: v18.x or higher (tested on Node 20 & Node 26)
- **npm**: v9.x or higher

### 1. Installation
Clone the repository and install all dependencies:
```bash
git clone <repository-url>
cd Auriga
npm install
```

### 2. Run FEFO Engine Test Suite
Run the automated FEFO algorithm validation test suite to verify database seeding, batch sorting by earliest expiry, and expired stock exclusion:
```bash
npm run test:fefo
```

### 3. Run Application in Development Mode
Launch both the Express API server (port 5000) and Vite React frontend (port 3000) concurrently:
```bash
npm run dev
```
Open **`http://localhost:3000`** in your browser.

### 4. Build for Production
To create an optimized production build:
```bash
npm run build
npm run server
```

---

## 🔑 Pre-Configured Demo Credentials

For instant evaluator testing, use the following pre-loaded accounts (or click the **Quick Evaluator Login** buttons on the Sign In page):

| Role | Email | Password |
| :--- | :--- | :--- |
| **Pharmacist** | `pharmacist@pharma.com` | `pharmacy123` |
| **Admin** | `admin@pharma.com` | `admin123` |

---

## 📡 Complete REST API Catalog

All API endpoints are hosted at `/api/*`. Below is the complete catalog of endpoints implemented in the system:

### 1. Authentication APIs (`/api/auth`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register a new user (`name`, `email`, `password`, `role`) | No |
| `POST` | `/api/auth/login` | Authenticate user and receive Bearer JWT token | No |
| `GET` | `/api/auth/me` | Fetch currently authenticated user profile | Yes |

### 2. Medicine Catalog APIs (`/api/medicines`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/medicines` | Fetch medicines list with search, category filter, pagination (`page`, `limit`), and sorting (`name`, `category`, `created_at`) | No |
| `GET` | `/api/medicines/check-indate?name=Paracetamol` | Quick inquiry: *"Do we have X in date?"* Returns sellable stock quantity, earliest expiry date, and priority batch | No |
| `GET` | `/api/medicines/:id` | Get medicine details along with all active and expired batches | No |
| `POST` | `/api/medicines` | Add a new medicine to catalog (`name`, `generic_name`, `category`, `unit`, `reorder_level`) | Yes |

### 3. Batch Registry APIs (`/api/batches`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/batches` | List batches with status filter (`ALL`, `ACTIVE`, `EXPIRING_SOON`, `EXPIRED`), search, pagination, and sorting (`expiry_date`, `available_quantity`) | No |
| `POST` | `/api/batches` | Add a new batch entry (`medicine_id`, `batch_number`, `initial_quantity`, `mfg_date`, `expiry_date`, `unit_price`, `shelf_location`) | Yes |
| `PUT` | `/api/batches/:id/quarantine` | Move batch to quarantine status and shelf | Yes |

### 4. FEFO Dispense APIs (`/api/dispense`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/dispense/preview` | **FEFO Engine Simulation**: Returns visual batch breakdown plan sorted strictly by earliest expiry date before confirming sale | Yes |
| `POST` | `/api/dispense` | **Execute Dispense**: Atomically deducts stock in FEFO order, creates invoice record, and returns printable receipt | Yes |
| `GET` | `/api/dispense/history` | Audit log of past sales with pagination, search, patient name, and batch breakdown | No |

### 5. Risk & Telemetry APIs (`/api/alerts`, `/api/dashboard`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/alerts/expiring` | Get categorized risk feeds: `expiredBatches`, `expiring30Batches` (&lt; 30 days), `expiring60Batches`, and `lowStockMedicines` | No |
| `GET` | `/api/dashboard/stats` | High-level telemetry: total sellable stock value, expired quarantined stock, today's sales, and recent sales | No |

---

## 🛠️ Debugging & Troubleshooting

- **Database Inspection**: The SQLite database file is located at `pharmacy.db` in the project root. You can inspect or reset it at any time by running `npm run test:fefo`.
- **Backend Logs**: Backend server logs all incoming API calls and DB queries to `stdout`.
- **Frontend State**: Inspect React state using standard React Developer Tools.

---

## 🗂️ Project Structure

```
Auriga/
├── package.json               # Dependency definitions and scripts
├── vite.config.js             # Vite configuration with API proxy
├── index.html                 # Main HTML entry with Google Fonts
├── pharmacy.db                # SQLite file database
├── README.md                  # Project overview, setup, and REST API catalog
├── REASONING.md               # Architectural thought process & FEFO analysis
├── AI_LOGS.md                 # Evaluation AI transcript logs
├── server/                    # Node.js & Express REST Backend
│   ├── index.js               # Server entry point
│   ├── db/database.js         # SQLite database connection & initial seeder
│   ├── middleware/auth.js     # JWT authentication middleware
│   ├── routes/                # REST API Route Modules
│   │   ├── auth.js            # User authentication routes
│   │   ├── medicines.js       # Medicine catalog & quick check routes
│   │   ├── batches.js         # Batch management routes
│   │   ├── dispense.js        # FEFO engine & invoice routes
│   │   ├── alerts.js          # Expiry risk alerts routes
│   │   └── dashboard.js       # Telemetry metrics routes
│   └── tests/
│       └── fefo.test.js       # Standalone FEFO algorithm test suite
└── src/                       # React Frontend SPA
    ├── index.css              # Custom HSL design tokens & glassmorphic styles
    ├── main.jsx               # React entry point
    ├── App.jsx                # Router & layout provider
    ├── context/
    │   └── AuthContext.jsx    # Authentication state context
    ├── components/
    │   └── Navbar.jsx         # Responsive navigation & quick stock checker
    └── pages/                 # Full-Stack Application Views
        ├── LandingPage.jsx    # Interactive product showcase & FEFO demo
        ├── LoginPage.jsx      # Login page with 1-click evaluator presets
        ├── RegisterPage.jsx   # User registration page
        ├── DashboardPage.jsx  # Inventory telemetry & sales metrics
        ├── DispensePage.jsx   # FEFO POS workbench & printable receipt modal
        ├── InventoryPage.jsx  # Medicine catalog with search & pagination
        ├── BatchesPage.jsx    # Granular batch registry & risk indicators
        └── AlertsPage.jsx     # Expiry risk board & quarantine manager
```
