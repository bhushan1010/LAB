-- Migration 003: Sample Cancellation (Soft Delete, Per-Test)
-- Adds 'cancelled' status, cancellation reasons, timestamps, and audit metadata to reports and test_results

-- 1. Reports status constraint & cancellation metadata
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_status_check;
ALTER TABLE reports ADD CONSTRAINT reports_status_check CHECK (status IN ('draft', 'final', 'amended', 'cancelled'));

ALTER TABLE reports ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

-- 2. Test Results status & cancellation metadata
ALTER TABLE test_results ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'pending', 'completed', 'cancelled'));
ALTER TABLE test_results ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE test_results ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE test_results ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_test_results_status ON test_results(status);

-- 3. Client-facing cancellation metadata & visit-level cancellation support
ALTER TABLE reports ADD COLUMN IF NOT EXISTS client_facing_reason VARCHAR(100);
ALTER TABLE test_results ADD COLUMN IF NOT EXISTS client_facing_reason VARCHAR(100);

ALTER TABLE visits ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS client_facing_reason VARCHAR(100);
ALTER TABLE visits ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES users(id) ON DELETE SET NULL;

