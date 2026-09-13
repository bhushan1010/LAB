# Lab Report Management System — Master Specification

> **Living Reference Document**  
> *This document defines the comprehensive architecture, non-negotiable security requirements, role boundaries, data flow, and phase breakdown across the entire project.*

---

## 1. Overview

A multi-device system for generating, printing, and remotely accessing diagnostic pathology lab reports. It replaces manual and one-off report generation with a shared cloud backend, offline-tolerant client workstations, automated physical print workflows, and an online patient-facing report view accessed via a secure QR code.

---

## 2. Deployment & Operational Context

* **Client Workstations (7 devices total)**:
  * **5 workstations on local LAN** (Reception, Sample Collection, Biochemistry Desk, Hematology Desk, Doctor Review).
  * **2 remote client devices** (Laptops / Tablets connecting over the internet from branch collection centers or remote locations).
* **Backend Infrastructure**:
  * Hosted on a cloud VPS (accessible anywhere with internet access, not self-hosted on a physical lab machine).
* **Physical Doctor Sign-Off (Strict Clinical Policy)**:
  * Reports are printed and **physically signed & stamped by a pathologist** after printing.
  * **The system never stores, renders, or reuses digital doctor signatures.**
* **Offline-Tolerant Operation**:
  * Internet or LAN connection drops must never block lab staff from registering patients, entering test parameters, generating reports, or printing locally.
  * Data and generated PDFs are saved to persistent client storage (`IndexedDB`) first, then queued and synchronized with the cloud VPS when connectivity is available.

---

## 3. Role-Based Access Control (RBAC)

Every staff member logs in with an individual account. Permissions are enforced on the backend via JWT middleware:

| Role | Scope & Permissions |
| :--- | :--- |
| **`front-desk`** | • Register patients & search existing demographics.<br>• Book visits & intake sample details.<br>• View and print recent reports created at their station.<br>• Monitor the print queue. |
| **`lab-tech`** | • All `front-desk` permissions.<br>• Enter & update freeform test results (names, values, units, reference intervals, methods).<br>• Generate finalized reports with barcodes and secure QR tokens. |
| **`admin`** | • Full system-wide visibility across all 7 devices.<br>• Monitor cloud sync status and resolve sync failures.<br>• Manage staff user accounts (create, deactivate, assign roles, reset passwords).<br>• Inspect immutable audit logs. |

---

## 4. Core Data Flow

```
[ Staff Login (JWT) ]
         │
         ▼
[ Patient / Visit Lookup ] ◄── Search by Name/UHID or scan vial barcode
         │
         ▼
[ Freeform Test Entry ] ────── Type test name, result, unit, range, method
         │
         ▼
[ Generate Report ] ────────── Compiles PDF with:
                               • Code128 Barcode (Sample / Visit ID)
                               • 64-char unguessable QR Token
         │
         ▼
[ Local-First Persistence ] ── Saves PDF Blob + Metadata to IndexedDB (Offline-safe)
         │
         ├──► [ Prompt User to Print Now ] (Physical paper output)
         │
         ▼
[ Background Sync Queue ] ─── Pushes payload to Cloud VPS via /api/sync/push
         │                    (Tracks status: unsynced ➔ syncing ➔ synced / failed)
         ▼
[ Public Online View ] ────── Scanning printed QR loads:
                              https://yourdomain.com/report/<token>
                              (Public, read-only, mobile-friendly, no login required)
```

---

## 5. Non-Negotiable Security Requirements

1. **Unguessable QR / Online Report Tokens**:
   * Must use a long, cryptographically random, unguessable token (e.g. 64-character hex string with 256 bits of entropy via `crypto.randomBytes(32)`).
   * **Never use sequential integer IDs** (`/report/1024`), dates, or guessable combinations.
2. **Strict Public Route Scoping**:
   * The public route (`GET /api/public/reports/:qr_token`) exposes **only that single specific report**.
   * It provides **zero ability to list, search, browse, or enumerate** any other patient or report record.
   * Draft reports are rejected with a `403 Forbidden` until marked `final` by lab staff.
   * Every access to the public view logs an audit record (`PUBLIC_QR_VIEW`) with IP address and User-Agent.
3. **Server-Side Role Enforcement**:
   * RBAC must be verified cryptographically on every protected API request using JWT middleware, never relying solely on frontend UI hiding.
4. **No Digital Signatures**:
   * To maintain legal and NABL compliance with physical sign-off policies, no doctor signature image assets or signatures are stored in the database.

---

## 6. Technical Stack Summary

| Layer | Technology |
| :--- | :--- |
| **Backend API** | Node.js (v18+) + Express |
| **Database** | PostgreSQL 13+ with parameterized queries (`pg` pool) |
| **Authentication** | JWT (`jsonwebtoken`) + Password Hashing (`bcryptjs`) |
| **Frontend App** | React (Vite) + Tailwind CSS + Lucide Icons |
| **Client Storage** | `IndexedDB` (survives page refresh and browser restart) |
| **Barcode Format** | Code128 (`jsbarcode`) |
| **QR Code Format** | Standard high-density QR (`qrcode`) |
| **PDF Generation** | Direct A4 print rendering + `html2pdf.js` vector/canvas export |

---

## 7. Phase Breakdown & Progress Tracker

- [x] **Phase 1: Database Schema & Backend API**
  - PostgreSQL schema with UUIDv4 primary keys for offline sync.
  - Tables: `users`, `patients`, `visits`, `test_results`, `reports`, `audit_logs`.
  - JWT auth & RBAC middleware.
  - CRUD for patients, visits, test results (freeform).
  - Report generation (barcode + unguessable QR token).
  - Public no-auth endpoint (`/api/public/reports/:qr_token`).
  - Offline sync push endpoint (`/api/sync/push`).
  - Unit tests & migration runner.

- [x] **Phase 2: Frontend Data Entry & Live Report Preview**
  - Role-based login screen wired to Phase 1 JWT auth endpoint.
  - Patient search/intake & visit management form.
  - Dynamic freeform test results table (add/remove/reorder rows, flags).
  - Pixel-perfect A4 live report preview component matching standard pathology format.
  - Embedded dynamic QR code and Code128 barcode rendering.
  - One-click native A4 print engine (matching 210mm x 297mm).
  - Public mobile-first online report view page.

- [ ] **Phase 3: PDF Generation + Local-First Save & Sync Queue**
  - Client-side A4 PDF compilation matching preview exactly.
  - Persistent local storage (`IndexedDB`) for reports & PDFs.
  - Background sync queue with exponential backoff & failure alerts.
  - Print trigger workflow.
  - Sync status indicator badge.

- [ ] **Phase 4: Barcode Scan-to-Lookup & Public QR View**
  - Rapid keyboard input scanner detection (sub-40ms keypresses + Enter).
  - Instant sample/visit lookup on scan.
  - Public, read-only, mobile-friendly report viewer page.
  - Direct PDF download on public view.

- [ ] **Phase 5: Print Workflow & Admin/Role Dashboards**
  - Print queue & reprint history table.
  - Scoped dashboards: Front-Desk, Lab-Tech, and Admin.
  - Admin staff account management (create, deactivate, assign roles).
  - System-wide multi-device monitor & searchable audit logs.
  - Frontend role-based route guards.

---

## 8. Open Deployment Configuration Items

| Item | Status / Placeholder | Production Target |
| :--- | :--- | :--- |
| **Lab Name & Logo** | `SUNRISE Diagnostic & Research Centre (Demo)` | Replace with official lab logo and letterhead |
| **Domain Name** | `http://localhost:5000` / `localhost:3000` | E.g. `https://api.labdomain.com` / `https://reports.labdomain.com` |
| **Cloud VPS Provider** | Development environment | DigitalOcean / Hetzner / AWS EC2 Ubuntu LTS |
| **PostgreSQL Host** | `localhost:5432` | Managed PostgreSQL or VPS PostgreSQL cluster |
