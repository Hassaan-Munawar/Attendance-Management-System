-- ==============================================================================
-- Attendance Management System - Production Database Schema for Supabase
-- Supports both Institutional Staff/Teachers and Classroom Student Attendance
-- Run this script in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. DEPARTMENTS TABLE (Faculties / Academic Departments)
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(20) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. SHIFTS TABLE (Staff / Teacher Shifts)
CREATE TABLE IF NOT EXISTS shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    grace_period_minutes INTEGER DEFAULT 15,
    half_day_hours NUMERIC(4,2) DEFAULT 4.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. EMPLOYEES TABLE (Teachers, Instructors, and Staff)
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

-- 4. STAFF ATTENDANCE TABLE (Teachers & Staff)
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
    notes TEXT,
    is_regularized BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_employee_date UNIQUE (employee_id, date)
);

-- 5. CLASSES / GRADES TABLE (Classrooms, Grades, Sections for Teachers)
CREATE TABLE IF NOT EXISTS classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    section VARCHAR(50),
    teacher_name VARCHAR(100),
    room_number VARCHAR(50),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_class_section UNIQUE (name, section)
);

-- 6. STUDENTS TABLE
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    roll_number VARCHAR(50) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(150),
    guardian_phone VARCHAR(30),
    class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    avatar_url TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. STUDENT ATTENDANCE TABLE (Classroom Roll-Call Attendance)
CREATE TABLE IF NOT EXISTS student_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
    remarks TEXT,
    marked_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_student_class_date UNIQUE (student_id, class_id, date)
);

-- 8. LEAVE REQUESTS TABLE (Staff & Student Leave Requests)
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

-- 9. ORGANIZATION SETTINGS TABLE
CREATE TABLE IF NOT EXISTS organization_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name VARCHAR(150) DEFAULT 'Apex Academy & Enterprise',
    office_start_time TIME DEFAULT '09:00:00',
    office_end_time TIME DEFAULT '18:00:00',
    grace_period_minutes INTEGER DEFAULT 15,
    allow_camera_snapshot BOOLEAN DEFAULT TRUE,
    system_type VARCHAR(50) DEFAULT 'academic',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- INDEXES FOR PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_emp_date ON attendance(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_dept ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_student_att_date ON student_attendance(date);
CREATE INDEX IF NOT EXISTS idx_student_att_lookup ON student_attendance(class_id, date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_emp ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Enables client interaction with the public anon API key
-- ==============================================================================
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read departments" ON departments FOR SELECT USING (true);
CREATE POLICY "Allow anon write departments" ON departments FOR ALL USING (true);

CREATE POLICY "Allow anon read shifts" ON shifts FOR SELECT USING (true);
CREATE POLICY "Allow anon write shifts" ON shifts FOR ALL USING (true);

CREATE POLICY "Allow anon read employees" ON employees FOR SELECT USING (true);
CREATE POLICY "Allow anon write employees" ON employees FOR ALL USING (true);

CREATE POLICY "Allow anon read attendance" ON attendance FOR SELECT USING (true);
CREATE POLICY "Allow anon write attendance" ON attendance FOR ALL USING (true);

CREATE POLICY "Allow anon read classes" ON classes FOR SELECT USING (true);
CREATE POLICY "Allow anon write classes" ON classes FOR ALL USING (true);

CREATE POLICY "Allow anon read students" ON students FOR SELECT USING (true);
CREATE POLICY "Allow anon write students" ON students FOR ALL USING (true);

CREATE POLICY "Allow anon read student_attendance" ON student_attendance FOR SELECT USING (true);
CREATE POLICY "Allow anon write student_attendance" ON student_attendance FOR ALL USING (true);

CREATE POLICY "Allow anon read leave_requests" ON leave_requests FOR SELECT USING (true);
CREATE POLICY "Allow anon write leave_requests" ON leave_requests FOR ALL USING (true);

CREATE POLICY "Allow anon read settings" ON organization_settings FOR SELECT USING (true);
CREATE POLICY "Allow anon write settings" ON organization_settings FOR ALL USING (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE student_attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE leave_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE employees;
ALTER PUBLICATION supabase_realtime ADD TABLE students;
