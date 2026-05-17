-- ─── Gratitude School — Supabase Schema ───────────────────────────────────────
-- Run this entire file in Supabase → SQL Editor → New Query → Run

-- Sequences for human-readable IDs
CREATE SEQUENCE IF NOT EXISTS student_code_seq START 1;
CREATE SEQUENCE IF NOT EXISTS receipt_number_seq START 1;

-- ─── Students ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS students (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_code  TEXT UNIQUE DEFAULT 'GS-' || LPAD(nextval('student_code_seq')::TEXT, 3, '0'),
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  date_of_birth DATE,
  gender        TEXT CHECK (gender IN ('Male','Female','')),
  grade         TEXT NOT NULL,
  parent_name   TEXT,
  phone         TEXT,
  enrolled_at   DATE DEFAULT CURRENT_DATE,
  status        TEXT DEFAULT 'active' CHECK (status IN ('active','inactive')),
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Fees ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fees (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  category      TEXT NOT NULL CHECK (category IN ('tuition','activity','transport','meals','uniform','other')),
  term          TEXT NOT NULL,
  grades        TEXT DEFAULT 'all',
  amount        DECIMAL(10,3) NOT NULL CHECK (amount > 0),
  academic_year TEXT DEFAULT '2025-2026',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Payments ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number TEXT UNIQUE DEFAULT 'RCP-' || LPAD(nextval('receipt_number_seq')::TEXT, 4, '0'),
  student_id     UUID REFERENCES students(id) ON DELETE RESTRICT,
  fee_id         UUID REFERENCES fees(id) ON DELETE SET NULL,
  fee_name       TEXT,
  amount_paid    DECIMAL(10,3) NOT NULL CHECK (amount_paid > 0),
  payment_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  method         TEXT DEFAULT 'cash' CHECK (method IN ('cash','bank','mobile')),
  received_by    TEXT DEFAULT 'Admin',
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Row Level Security (open for now — add auth later) ───────────────────────
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE fees     ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all students" ON students;
DROP POLICY IF EXISTS "Allow all fees"     ON fees;
DROP POLICY IF EXISTS "Allow all payments" ON payments;

CREATE POLICY "Allow all students" ON students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all fees"     ON fees     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all payments" ON payments FOR ALL USING (true) WITH CHECK (true);

-- ─── Sample data (delete before going live) ───────────────────────────────────
INSERT INTO fees (name, category, term, grades, amount) VALUES
  ('Tuition Fee',  'tuition',  'Term 1', 'all', 150.000),
  ('Tuition Fee',  'tuition',  'Term 2', 'all', 150.000),
  ('Activity Fee', 'activity', 'Annual', 'all',  30.000),
  ('Meals',        'meals',    'Term 1', 'all',  50.000),
  ('Meals',        'meals',    'Term 2', 'all',  50.000)
ON CONFLICT DO NOTHING;
