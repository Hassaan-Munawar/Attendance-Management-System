-- ==============================================================================
-- Attendance Management System - Schema for "Only Students Attendance"
-- Optimized for Schools, Academies & Teachers Classroom Management
-- Run this script in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CLASSES / GRADES TABLE (Classrooms, Grades, Sections)
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

-- 2. STUDENTS TABLE
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

-- 3. STUDENT ATTENDANCE TABLE (Classroom Roll-Call Attendance)
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

-- 4. ORGANIZATION / SCHOOL SETTINGS TABLE
CREATE TABLE IF NOT EXISTS organization_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name VARCHAR(150) DEFAULT 'Apex Academy',
    office_start_time TIME DEFAULT '08:30:00',
    office_end_time TIME DEFAULT '15:30:00',
    grace_period_minutes INTEGER DEFAULT 15,
    allow_camera_snapshot BOOLEAN DEFAULT FALSE,
    system_type VARCHAR(50) DEFAULT 'students',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_student_att_date ON student_attendance(date);
CREATE INDEX IF NOT EXISTS idx_student_att_lookup ON student_attendance(class_id, date);

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read classes" ON classes FOR SELECT USING (true);
CREATE POLICY "Allow anon write classes" ON classes FOR ALL USING (true);

CREATE POLICY "Allow anon read students" ON students FOR SELECT USING (true);
CREATE POLICY "Allow anon write students" ON students FOR ALL USING (true);

CREATE POLICY "Allow anon read student_attendance" ON student_attendance FOR SELECT USING (true);
CREATE POLICY "Allow anon write student_attendance" ON student_attendance FOR ALL USING (true);

CREATE POLICY "Allow anon read settings" ON organization_settings FOR SELECT USING (true);
CREATE POLICY "Allow anon write settings" ON organization_settings FOR ALL USING (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE student_attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE students;
