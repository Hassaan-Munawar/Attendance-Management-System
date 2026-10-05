-- ==============================================================================
-- Attendance Management System - Production Database Schema for Supabase
-- Run this script in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. DEPARTMENTS TABLE
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(20) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. SHIFTS TABLE
CREATE TABLE IF NOT EXISTS shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    grace_period_minutes INTEGER DEFAULT 15,
    half_day_hours NUMERIC(4,2) DEFAULT 4.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. EMPLOYEES TABLE
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_code VARCHAR(50) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(30),
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    position VARCHAR(100) NOT NULL,
    shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
    avatar_url TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave')),
    pin_code VARCHAR(10) DEFAULT '1234',
    hire_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. ATTENDANCE TABLE
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    clock_in TIMESTAMP WITH TIME ZONE,
    clock_out TIMESTAMP WITH TIME ZONE,
    break_minutes INTEGER DEFAULT 0,
    total_hours NUMERIC(5, 2) DEFAULT 0.00,
    status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'late', 'half_day', 'absent', 'on_leave')),
    verification_photo TEXT,
    location_lat NUMERIC(10, 7),
    location_lng NUMERIC(10, 7),
    location_address TEXT,
    notes TEXT,
    is_regularized BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_employee_date UNIQUE (employee_id, date)
);

-- 5. LEAVE REQUESTS TABLE
CREATE TABLE IF NOT EXISTS leave_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type VARCHAR(50) NOT NULL CHECK (leave_type IN ('casual', 'sick', 'annual', 'unpaid', 'maternity', 'paternity')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days NUMERIC(4, 1) NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_comment TEXT,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. COMPANY SETTINGS TABLE
CREATE TABLE IF NOT EXISTS organization_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name VARCHAR(150) DEFAULT 'Apex Enterprise',
    office_start_time TIME DEFAULT '09:00:00',
    office_end_time TIME DEFAULT '18:00:00',
    grace_period_minutes INTEGER DEFAULT 15,
    allow_camera_snapshot BOOLEAN DEFAULT TRUE,
    allow_geolocation BOOLEAN DEFAULT TRUE,
    office_lat NUMERIC(10, 7) DEFAULT 40.7128000,
    office_lng NUMERIC(10, 7) DEFAULT -74.0060000,
    geofence_radius_meters INTEGER DEFAULT 500,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- INDEXES FOR PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_emp_date ON attendance(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_dept ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_emp ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Enables anonymous client interaction with the public API key
-- ==============================================================================
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;

-- Allow anon read/write
CREATE POLICY "Allow anon read departments" ON departments FOR SELECT USING (true);
CREATE POLICY "Allow anon write departments" ON departments FOR ALL USING (true);

CREATE POLICY "Allow anon read shifts" ON shifts FOR SELECT USING (true);
CREATE POLICY "Allow anon write shifts" ON shifts FOR ALL USING (true);

CREATE POLICY "Allow anon read employees" ON employees FOR SELECT USING (true);
CREATE POLICY "Allow anon write employees" ON employees FOR ALL USING (true);

CREATE POLICY "Allow anon read attendance" ON attendance FOR SELECT USING (true);
CREATE POLICY "Allow anon write attendance" ON attendance FOR ALL USING (true);

CREATE POLICY "Allow anon read leave_requests" ON leave_requests FOR SELECT USING (true);
CREATE POLICY "Allow anon write leave_requests" ON leave_requests FOR ALL USING (true);

CREATE POLICY "Allow anon read settings" ON organization_settings FOR SELECT USING (true);
CREATE POLICY "Allow anon write settings" ON organization_settings FOR ALL USING (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE leave_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE employees;

-- ==============================================================================
-- DEFAULT INITIAL SETUP (SETTINGS, STANDARD DEPARTMENTS & SHIFT)
-- ==============================================================================
INSERT INTO organization_settings (company_name, office_start_time, office_end_time, grace_period_minutes)
VALUES ('Apex Enterprise', '09:00:00', '18:00:00', 15)
ON CONFLICT DO NOTHING;

INSERT INTO departments (name, code, description) VALUES
('Engineering & Tech', 'ENG', 'Software engineering, DevOps, QA'),
('Human Resources', 'HR', 'People operations and talent acquisition'),
('Product & Design', 'PRD', 'Product management and UI/UX design'),
('Sales & Marketing', 'MKT', 'Client development and marketing'),
('Finance & Operations', 'FIN', 'Finance, accounting, and legal')
ON CONFLICT (code) DO NOTHING;

INSERT INTO shifts (name, start_time, end_time, grace_period_minutes, half_day_hours) VALUES
('General Day Shift', '09:00:00', '18:00:00', 15, 4.0),
('Morning Shift', '07:30:00', '16:30:00', 10, 4.0),
('Evening Shift', '13:00:00', '22:00:00', 15, 4.0)
ON CONFLICT DO NOTHING;
