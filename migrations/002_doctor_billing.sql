-- Lab Report Management System — Phase 6: Doctor-Specific Test Rates & Report Billing

-- 1. DOCTORS TABLE
CREATE TABLE IF NOT EXISTS doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    clinic_name VARCHAR(150),
    phone VARCHAR(20),
    email VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. DEFAULT / STANDARD TEST RATES
CREATE TABLE IF NOT EXISTS default_test_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_name VARCHAR(150) NOT NULL UNIQUE,
    rate NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. PER-DOCTOR TEST RATES
CREATE TABLE IF NOT EXISTS doctor_test_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    test_name VARCHAR(150) NOT NULL,
    rate NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_doctor_test_rate UNIQUE (doctor_id, test_name)
);

-- 4. VISITS TABLE UPDATES (Backward Compatible)
-- Existing 'ref_doctor VARCHAR(100)' is retained so legacy records never break.
ALTER TABLE visits 
ADD COLUMN IF NOT EXISTS doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL;

-- 5. REPORTS TABLE BILLING FIELDS
-- total_amount: Calculated sum of all tests for the report
-- billing_breakdown: JSONB snapshot [{ test_name, rate, rate_source: 'doctor' | 'default' }]
ALTER TABLE reports 
ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS billing_breakdown JSONB DEFAULT '[]'::jsonb;

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_doctors_name ON doctors(name);
CREATE INDEX IF NOT EXISTS idx_doctors_clinic_name ON doctors(clinic_name);
CREATE INDEX IF NOT EXISTS idx_doctor_test_rates_doc ON doctor_test_rates(doctor_id);
CREATE INDEX IF NOT EXISTS idx_visits_doctor_id ON visits(doctor_id);
