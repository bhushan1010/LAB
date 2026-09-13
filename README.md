# Lab Report Management System — Phase 1 (Database + Backend API)

> 📘 **Full Architecture Specification**: See [`MASTER_SPEC.md`](./MASTER_SPEC.md) for the living master spec covering deployment, multi-device sync, security rules, and all 5 project phases.

A production-grade backend API and PostgreSQL database engine designed for multi-device diagnostic pathology laboratories (5 LAN workstations + 2 remote devices + cloud VPS).


---

## Architecture Overview

* **Runtime**: Node.js (v18+) + Express
* **Database**: PostgreSQL 13+ (using parameterized queries via `pg` connection pool)
* **Authentication**: JWT with Role-Based Access Control (`admin`, `lab-tech`, `front-desk`)
* **Security**:
  * Passwords hashed via `bcryptjs`
  * Helmet security headers & CORS configured for LAN/WAN devices
  * Public QR report viewing secured via **64-character unguessable cryptographic tokens** (256-bit entropy)
* **Offline-First Resilience**:
  * Client devices can create patients, visits, test results, and reports offline using client-generated **UUIDs**
  * Dedicated `/api/sync/push` endpoint performs atomic upsert transactions (`ON CONFLICT DO UPDATE`)
  * Sync status tracking (`pending`, `synced`, `conflict`)
* **Physical Doctor Sign-Off**:
  * Designed for physical printing and manual signing by pathologists.

---

## Directory Structure

```
d:\Projects\LAB/
├── migrations/
│   ├── 001_initial_schema.sql    # PostgreSQL DDL schema & indexes
│   ├── run-migrations.js         # Automated migration runner with tracking
│   └── seed-admin.js             # Seeds default staff accounts
├── src/
│   ├── config/
│   │   └── env.js                # Environment variables with fallbacks
│   ├── db/
│   │   └── index.js              # pg Pool & transaction helpers
│   ├── middleware/
│   │   ├── auth.js               # JWT verification & RBAC authorize()
│   │   ├── validation.js         # Request body validation
│   │   └── errorHandler.js       # Centralized error & PG code handler
│   ├── utils/
│   │   ├── tokens.js             # Crypto QR token, barcode & code generators
│   │   └── audit.js              # Audit logger (audit_logs table)
│   ├── controllers/
│   │   ├── authController.js     # Staff login, profile, user management
│   │   ├── patientController.js  # Patient CRUD with UHID & search
│   │   ├── visitController.js    # Visit & sample intake management
│   │   ├── testResultController.js # Freeform test parameters & bulk entry
│   │   ├── reportController.js   # Barcode + QR generation & print tracking
│   │   ├── publicController.js   # Public unauthenticated QR report view
│   │   └── syncController.js     # Offline-first sync push & status
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── patientRoutes.js
│   │   ├── visitRoutes.js
│   │   ├── testResultRoutes.js
│   │   ├── reportRoutes.js
│   │   ├── publicRoutes.js
│   │   ├── syncRoutes.js
│   │   └── index.js
│   ├── server.js                 # Express app bootstrap
│   └── index.js                  # Server entry point
├── test/
│   └── unit-test.js              # Security tokens & validation unit tests
├── .env.example
├── .env
└── package.json
```

---

## Setup & Deployment Guide

### 1. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your PostgreSQL credentials:

```bash
cp .env.example .env
```

Key environment variables:
```ini
PORT=5000
NODE_ENV=production

# PostgreSQL Database Configuration
DB_HOST=your-vps-postgres-host
DB_PORT=5432
DB_NAME=lab_management
DB_USER=postgres
DB_PASSWORD=your-secure-db-password
DB_SSL=false
# Or use full connection URL:
# DATABASE_URL=postgresql://user:pass@host:5432/lab_management

# Security & JWT
JWT_SECRET=your-random-32-char-jwt-secret
JWT_EXPIRES_IN=7d

# Public QR Link Base URL (Where clients land when scanning QR)
CLIENT_BASE_URL=https://reports.yourlabdomain.com
```

### 2. Run Database Migrations
Executes `001_initial_schema.sql` and creates the `schema_migrations` audit table:
```bash
npm run migrate
```

### 3. Seed Default Staff Accounts
Creates pre-configured staff users:
```bash
npm run seed
```

**Default Credentials:**
| Username | Password | Role | Access Scope |
| :--- | :--- | :--- | :--- |
| `admin` | `AdminPassword123!` | `admin` | Full system access & user management |
| `labtech1` | `TechPassword123!` | `lab-tech` | Enter test results, generate reports |
| `reception1` | `DeskPassword123!` | `front-desk` | Register patients, book visits, print |

### 4. Start the Server
```bash
# Development mode with watch:
npm run dev

# Production mode:
npm start
```

---

## API Endpoints Reference

### 1. Authentication (`/api/auth`)
* `POST /api/auth/login` — Staff login (returns JWT token and user info).
* `GET /api/auth/me` — Get current logged-in user profile (Bearer token required).
* `POST /api/auth/users` — Create new staff account (`admin` only).
* `GET /api/auth/users` — List all staff accounts (`admin` only).

### 2. Patients (`/api/patients`)
* `POST /api/patients` — Register a patient (UUID can be client-supplied for offline creation).
* `GET /api/patients` — List patients with `search`, `limit`, `offset`.
* `GET /api/patients/:id` — Get patient by ID along with their historical visit list.
* `PUT /api/patients/:id` — Update patient demographics.
* `DELETE /api/patients/:id` — Delete patient (`admin` only).

### 3. Visits & Encounters (`/api/visits`)
* `POST /api/visits` — Create visit / sample intake (auto-generates `visit_code` e.g. `DEMO000001`).
* `GET /api/visits` — List visits (filter by `patient_id`, `status`, `search`).
* `GET /api/visits/:id` — Get visit with patient demographics, test results, and report.
* `PUT /api/visits/:id` — Update visit status, sample details, referring doctor.
* `DELETE /api/visits/:id` — Delete visit (`admin` only).

### 4. Freeform Test Results (`/api/test-results`)
* `POST /api/test-results` — Enter a single freeform test parameter:
  ```json
  {
    "visit_id": "UUID",
    "department": "DEPARTMENT OF BIOCHEMISTRY",
    "test_name": "Plasma Glucose - Random",
    "result_value": "114",
    "unit": "mg/dl",
    "reference_range": "60-140",
    "method": "Glucose Oxidase/Peroxidase",
    "flag": "NORMAL",
    "display_order": 1
  }
  ```
* `POST /api/test-results/bulk` — Enter an entire panel/array of tests in a single transaction.
* `GET /api/test-results?visit_id=UUID` — Get all test results for a visit ordered by department and row sequence.
* `PUT /api/test-results/:id` — Edit an existing test result.
* `DELETE /api/test-results/:id` — Delete a test result.

### 5. Reports & Barcode/QR Generation (`/api/reports`)
* `POST /api/reports/generate` — Generate report:
  * Generates physical barcode string (`barcode_value`, e.g., `F00000001`).
  * Generates 64-char unguessable `qr_token`.
  * Generates formatted `report_code` (e.g. `REP-202609-1234`).
  * Marks visit status as `completed`.
  * Returns `public_view_url` (`${CLIENT_BASE_URL}/reports/view/${qr_token}`).
* `GET /api/reports/:id` — Fetch complete report data (staff only).
* `POST /api/reports/:id/print` — Record physical print timestamp (`printed_at = NOW()`).
* `GET /api/reports` — List all reports with filters.

### 6. Public QR Code Verification (`/api/public`)
* **`GET /api/public/reports/:qr_token`** — **No authentication required.**
  * Securely looks up the report using the unguessable crypto token.
  * Ensures report is finalized (draft reports cannot be viewed).
  * Returns patient, visit, and test results grouped by department for online viewing.
  * Records an audit log entry (`PUBLIC_QR_VIEW`) with client IP and user agent.

### 7. Offline-First Sync (`/api/sync`)
* `POST /api/sync/push` — Clients push batches of locally created records:
  ```json
  {
    "client_device_id": "LAN-PC-02",
    "patients": [ ... ],
    "visits": [ ... ],
    "test_results": [ ... ],
    "reports": [ ... ]
  }
  ```
  * Idempotently upserts all records in a single database transaction.
  * Sets `sync_status = 'synced'` and updates `synced_at`.
* `GET /api/sync/status` — Returns sync status metrics and server time.

---

## RBAC Matrix

| Feature | `front-desk` | `lab-tech` | `admin` | Public (No Auth) |
| :--- | :---: | :---: | :---: | :---: |
| Login / Profile | Yes | Yes | Yes | N/A |
| Manage Staff Users | No | No | **Yes** | No |
| Patient Intake / Edit | **Yes** | Read-Only | **Yes** | No |
| Visit Booking | **Yes** | Read-Only | **Yes** | No |
| Enter Test Results | No | **Yes** | **Yes** | No |
| Generate Report & Barcode | Read-Only | **Yes** | **Yes** | No |
| Mark Report Printed | Yes | Yes | Yes | No |
| Offline Sync Push | Yes | Yes | Yes | No |
| Public QR View | N/A | N/A | N/A | **Yes** |
