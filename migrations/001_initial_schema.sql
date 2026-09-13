-- Lab Report Management System — Phase 1 Initial Schema
-- Supports multi-device offline-first sync, RBAC, freeform tests, barcodes, and unguessable QR tokens.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. USERS TABLE (Staff accounts & RBAC)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('front-desk', 'lab-tech', 'doctor', 'admin', 'client')),
    assigned_workstation VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. PATIENTS TABLE
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uhid VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(10),
    full_name VARCHAR(100) NOT NULL,
    age_years INTEGER,
    age_months INTEGER DEFAULT 0,
    age_days INTEGER DEFAULT 0,
    gender VARCHAR(10) NOT NULL CHECK (gender IN ('M', 'F', 'Other')),
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. VISITS TABLE (Encounters / Sample Collection)
CREATE TABLE IF NOT EXISTS visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    visit_code VARCHAR(50) NOT NULL UNIQUE,
    ref_doctor VARCHAR(100),
    client_name VARCHAR(100),
    client_code VARCHAR(50),
    rch_id_mcts_id VARCHAR(50),
    sample_type VARCHAR(100),
    collected_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'collected', 'in-testing', 'completed', 'cancelled')),
    doctor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. TEST_RESULTS TABLE (Freeform test parameters)
CREATE TABLE IF NOT EXISTS test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    department VARCHAR(100) NOT NULL,
    test_name VARCHAR(150) NOT NULL,
    result_value TEXT NOT NULL,
    unit VARCHAR(50),
    reference_range VARCHAR(100),
    method VARCHAR(150),
    flag VARCHAR(20) CHECK (flag IS NULL OR flag IN ('NORMAL', 'HIGH', 'LOW', 'CRITICAL')),
    display_order INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) DEFAULT NULL,
    cancellation_reason TEXT DEFAULT NULL,
    cancelled_at TIMESTAMPTZ DEFAULT NULL,
    cancelled_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. REPORTS TABLE (Generated documents, barcode, QR token, offline sync)
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    report_code VARCHAR(50) NOT NULL UNIQUE,
    barcode_value VARCHAR(50) NOT NULL,
    qr_token VARCHAR(100) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'final', 'amended', 'cancelled')),
    sync_status VARCHAR(20) NOT NULL DEFAULT 'synced' CHECK (sync_status IN ('pending', 'synced', 'conflict')),
    client_device_id VARCHAR(50),
    client_updated_at TIMESTAMPTZ,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    interpretation TEXT,
    pdf_storage_path VARCHAR(255),
    reported_at TIMESTAMPTZ,
    printed_at TIMESTAMPTZ,
    total_amount NUMERIC(10,2) DEFAULT 0,
    billing_breakdown JSONB DEFAULT '[]',
    doctor_approval_status VARCHAR(50) DEFAULT NULL,
    approved_by_doctor_name VARCHAR(255) DEFAULT NULL,
    approved_at TIMESTAMPTZ DEFAULT NULL,
    approval_note TEXT DEFAULT NULL,
    cancellation_reason TEXT DEFAULT NULL,
    cancelled_at TIMESTAMPTZ DEFAULT NULL,
    cancelled_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. AUDIT_LOGS TABLE (Security, compliance, and device activity tracking)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    client_device_id VARCHAR(50),
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(30) NOT NULL,
    entity_id VARCHAR(100),
    details JSONB,
    ip_address VARCHAR(45),
    user_agent VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEXES FOR PERFORMANCE & FAST LOOKUPS
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE INDEX IF NOT EXISTS idx_patients_uhid ON patients(uhid);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
CREATE INDEX IF NOT EXISTS idx_patients_full_name ON patients(full_name);

CREATE INDEX IF NOT EXISTS idx_visits_visit_code ON visits(visit_code);
CREATE INDEX IF NOT EXISTS idx_visits_patient_id ON visits(patient_id);
CREATE INDEX IF NOT EXISTS idx_visits_status ON visits(status);

CREATE INDEX IF NOT EXISTS idx_test_results_visit_id ON test_results(visit_id);
CREATE INDEX IF NOT EXISTS idx_test_results_department ON test_results(department);
CREATE INDEX IF NOT EXISTS idx_test_results_display_order ON test_results(visit_id, display_order);

CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_qr_token ON reports(qr_token);
CREATE INDEX IF NOT EXISTS idx_reports_visit_id ON reports(visit_id);
CREATE INDEX IF NOT EXISTS idx_reports_barcode_value ON reports(barcode_value);
CREATE INDEX IF NOT EXISTS idx_reports_sync_status ON reports(sync_status);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
