/**
 * Onboarding & Welcome Wizard Module
 * Guides new users through feature briefing, purpose of use selection,
 * tailored Supabase project & schema guide, and credential connection.
 * Provides instant login for existing project owners.
 */

const OnboardingModule = {
  currentStep: 1,
  selectedPurpose: "both", // 'both' | 'staff' | 'students'
  fromQuickLogin: false,

  // Tailored SQL Schemas
  SCHEMAS: {
    both: `-- ==============================================================================
-- Attendance Management System - Full Schema (Staff & Students Attendance)
-- Run this script in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. DEPARTMENTS TABLE (Faculties / Academic Departments)
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(20) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. SHIFTS TABLE (Staff / Teacher Work Schedules)
CREATE TABLE IF NOT EXISTS shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    grace_period_minutes INTEGER DEFAULT 15,
    half_day_hours NUMERIC(4,2) DEFAULT 4.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. EMPLOYEES TABLE (Staff, Instructors, Teachers)
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

-- 4. STAFF ATTENDANCE TABLE (No location tracking)
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

-- 5. CLASSES / GRADES TABLE (Classrooms, Grades, Sections)
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

-- 8. LEAVE REQUESTS TABLE (Staff Leave Applications)
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

-- INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_emp_date ON attendance(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_dept ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_student_att_date ON student_attendance(date);
CREATE INDEX IF NOT EXISTS idx_student_att_lookup ON student_attendance(class_id, date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_emp ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);

-- ROW LEVEL SECURITY (RLS) POLICIES
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

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE student_attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE leave_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE employees;
ALTER PUBLICATION supabase_realtime ADD TABLE students;`,

    staff: `-- ==============================================================================
-- Attendance Management System - Schema for "Only Staff Attendance"
-- Optimized for Corporate, Enterprise & Office Environments
-- Run this script in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

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

-- 4. STAFF ATTENDANCE TABLE (No location tracking)
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

-- 6. ORGANIZATION SETTINGS TABLE
CREATE TABLE IF NOT EXISTS organization_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name VARCHAR(150) DEFAULT 'Apex Enterprise',
    office_start_time TIME DEFAULT '09:00:00',
    office_end_time TIME DEFAULT '18:00:00',
    grace_period_minutes INTEGER DEFAULT 15,
    allow_camera_snapshot BOOLEAN DEFAULT TRUE,
    system_type VARCHAR(50) DEFAULT 'staff',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_emp_date ON attendance(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_dept ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_emp ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
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
CREATE POLICY "Allow anon read leave_requests" ON leave_requests FOR SELECT USING (true);
CREATE POLICY "Allow anon write leave_requests" ON leave_requests FOR ALL USING (true);
CREATE POLICY "Allow anon read settings" ON organization_settings FOR SELECT USING (true);
CREATE POLICY "Allow anon write settings" ON organization_settings FOR ALL USING (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE leave_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE employees;`,

    students: `-- ==============================================================================
-- Attendance Management System - Schema for "Only Students Attendance"
-- Optimized for Schools, Academies & Teachers Classroom Management
-- Run this script in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

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

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE student_attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE students;`
  },

  init() {
    this.selectedPurpose = CONFIG.getPurpose ? CONFIG.getPurpose() : (localStorage.getItem("ams_system_purpose") || "both");
    this.setupEventListeners();
  },

  setupEventListeners() {
    // Welcome Screen: Next Button
    const btnWelcomeNext = document.getElementById("btn-welcome-next");
    if (btnWelcomeNext) {
      btnWelcomeNext.addEventListener("click", () => {
        this.fromQuickLogin = false;
        this.setStep(2);
      });
    }

    // Welcome Screen: Quick Login Button (for users who already have project & schema)
    const btnWelcomeLogin = document.getElementById("btn-welcome-login");
    if (btnWelcomeLogin) {
      btnWelcomeLogin.addEventListener("click", () => {
        this.fromQuickLogin = true;
        this.setStep(4);
      });
    }

    // Step 2 Purpose: Purpose Options Click Handlers
    document.querySelectorAll(".purpose-card-option").forEach(card => {
      card.addEventListener("click", () => {
        const purpose = card.dataset.purpose;
        if (purpose) this.selectPurpose(purpose);
      });
    });

    // Step 2 Purpose: Back & Next Buttons
    const btnPurposeBack = document.getElementById("btn-purpose-back");
    if (btnPurposeBack) {
      btnPurposeBack.addEventListener("click", () => this.setStep(1));
    }

    const btnPurposeNext = document.getElementById("btn-purpose-next");
    if (btnPurposeNext) {
      btnPurposeNext.addEventListener("click", () => {
        this.setStep(3);
      });
    }

    // Step 3 Guide: Back & Next Buttons
    const btnGuideBack = document.getElementById("btn-guide-back");
    if (btnGuideBack) {
      btnGuideBack.addEventListener("click", () => this.setStep(2));
    }

    const btnGuideNext = document.getElementById("btn-guide-next");
    if (btnGuideNext) {
      btnGuideNext.addEventListener("click", () => this.setStep(4));
    }

    // Step 3 Guide: Copy Tailored SQL Schema Button
    const btnCopySchema = document.getElementById("btn-copy-tailored-schema");
    if (btnCopySchema) {
      btnCopySchema.addEventListener("click", () => this.copyTailoredSchema());
    }

    // Step 4 Connect: Back Button
    const btnConnectBack = document.getElementById("btn-connect-back");
    if (btnConnectBack) {
      btnConnectBack.addEventListener("click", () => {
        if (this.fromQuickLogin) {
          this.setStep(1);
        } else {
          this.setStep(3);
        }
      });
    }

    // Step 4 Connect: Eye Toggle for Wizard Key Input
    const btnToggleKey = document.getElementById("btn-wizard-toggle-key");
    const keyInput = document.getElementById("wizard-supabase-key");
    if (btnToggleKey && keyInput) {
      btnToggleKey.addEventListener("click", () => {
        const isPassword = keyInput.type === "password";
        keyInput.type = isPassword ? "text" : "password";
        btnToggleKey.innerHTML = isPassword
          ? `<i class="fa-solid fa-eye-slash text-xs"></i>`
          : `<i class="fa-solid fa-eye text-xs"></i>`;
      });
    }

    // Step 4 Connect: Test Connection Button
    const btnWizardTest = document.getElementById("btn-wizard-test-db");
    if (btnWizardTest) {
      btnWizardTest.addEventListener("click", () => this.testConnection());
    }

    // Step 4 Connect: Connect Database & Launch Dashboard Button
    const btnWizardConnect = document.getElementById("btn-wizard-connect-db");
    if (btnWizardConnect) {
      btnWizardConnect.addEventListener("click", () => this.connectDatabase());
    }

    // Close Wizard Button (Available when user is already configured / reviewing tour)
    const btnCloseWizard = document.getElementById("btn-close-wizard");
    if (btnCloseWizard) {
      btnCloseWizard.addEventListener("click", () => this.close());
    }

    // Header "Tour / Guide" Launch Button
    const btnOpenTour = document.getElementById("btn-open-tour");
    if (btnOpenTour) {
      btnOpenTour.addEventListener("click", () => this.open(1, false));
    }
  },

  open(step = 1, fromQuickLogin = false) {
    this.fromQuickLogin = fromQuickLogin;
    const modal = document.getElementById("onboarding-wizard-modal");
    if (modal) {
      modal.classList.remove("hidden");
      document.body.classList.add("overflow-hidden");
    }

    // Update close button visibility (only show X if already configured)
    const closeBtn = document.getElementById("btn-close-wizard");
    if (closeBtn) {
      if (CONFIG.isConfigured()) {
        closeBtn.classList.remove("hidden");
      } else {
        closeBtn.classList.add("hidden");
      }
    }

    this.selectPurpose(this.selectedPurpose);
    this.setStep(step);
  },

  close() {
    const modal = document.getElementById("onboarding-wizard-modal");
    if (modal) {
      modal.classList.add("hidden");
      document.body.classList.remove("overflow-hidden");
    }
  },

  setStep(stepNumber) {
    this.currentStep = stepNumber;

    // Toggle step container visibility
    for (let i = 1; i <= 4; i++) {
      const stepEl = document.getElementById(`wizard-step-${i}`);
      const indicatorEl = document.getElementById(`step-indicator-${i}`);

      if (stepEl) {
        if (i === stepNumber) {
          stepEl.classList.remove("hidden");
        } else {
          stepEl.classList.add("hidden");
        }
      }

      if (indicatorEl) {
        if (i === stepNumber) {
          indicatorEl.className = "step-item active flex items-center gap-2 text-xs font-bold text-indigo-400";
          indicatorEl.querySelector(".step-num").className = "step-num w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs shadow-md shadow-indigo-600/30";
        } else if (i < stepNumber) {
          indicatorEl.className = "step-item completed flex items-center gap-2 text-xs font-semibold text-emerald-400";
          indicatorEl.querySelector(".step-num").className = "step-num w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-xs";
        } else {
          indicatorEl.className = "step-item flex items-center gap-2 text-xs font-semibold text-slate-500";
          indicatorEl.querySelector(".step-num").className = "step-num w-6 h-6 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-xs";
        }
      }
    }

    // Step-specific updates
    if (stepNumber === 3) {
      this.updateTailoredSchemaUI();
    } else if (stepNumber === 4) {
      const urlInput = document.getElementById("wizard-supabase-url");
      const keyInput = document.getElementById("wizard-supabase-key");
      if (urlInput && !urlInput.value) urlInput.value = CONFIG.currentUrl || "";
      if (keyInput && !keyInput.value) keyInput.value = CONFIG.currentKey || "";
    }

    // Scroll top of modal container
    const modalScroll = document.getElementById("onboarding-wizard-container");
    if (modalScroll) modalScroll.scrollTop = 0;
  },

  selectPurpose(purpose) {
    this.selectedPurpose = purpose;
    if (CONFIG.setPurpose) {
      CONFIG.setPurpose(purpose);
    } else {
      localStorage.setItem("ams_system_purpose", purpose);
    }

    // Update purpose card highlight state
    document.querySelectorAll(".purpose-card-option").forEach(card => {
      const radio = card.querySelector(".purpose-radio-check");
      if (card.dataset.purpose === purpose) {
        card.classList.add("border-indigo-500", "bg-indigo-500/10", "shadow-lg", "shadow-indigo-500/10");
        card.classList.remove("border-slate-800", "bg-slate-900/50");
        if (radio) {
          radio.className = "purpose-radio-check w-5 h-5 rounded-full bg-indigo-600 border border-indigo-400 flex items-center justify-center text-white text-[10px]";
          radio.innerHTML = `<i class="fa-solid fa-check"></i>`;
        }
      } else {
        card.classList.remove("border-indigo-500", "bg-indigo-500/10", "shadow-lg", "shadow-indigo-500/10");
        card.classList.add("border-slate-800", "bg-slate-900/50");
        if (radio) {
          radio.className = "purpose-radio-check w-5 h-5 rounded-full border border-slate-700 bg-slate-950 flex items-center justify-center text-transparent text-[10px]";
          radio.innerHTML = ``;
        }
      }
    });

    this.updateTailoredSchemaUI();
  },

  updateTailoredSchemaUI() {
    const purpose = this.selectedPurpose || "both";
    const schemaText = this.SCHEMAS[purpose] || this.SCHEMAS.both;

    // Update code container in Step 3
    const codeEl = document.getElementById("wizard-schema-code-display");
    if (codeEl) {
      codeEl.textContent = schemaText;
    }

    // Update title badge
    const badgeEl = document.getElementById("wizard-schema-purpose-badge");
    if (badgeEl) {
      if (purpose === "staff") {
        badgeEl.textContent = "Only Staff Attendance";
        badgeEl.className = "px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30";
      } else if (purpose === "students") {
        badgeEl.textContent = "Only Students Attendance";
        badgeEl.className = "px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30";
      } else {
        badgeEl.textContent = "Staff & Students Attendance";
        badgeEl.className = "px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30";
      }
    }

    // Also update Settings Schema Display if present
    const settingsSchemaCode = document.getElementById("schema-code-display");
    if (settingsSchemaCode) {
      settingsSchemaCode.textContent = schemaText;
    }
  },

  copyTailoredSchema() {
    const purpose = this.selectedPurpose || "both";
    const schemaText = this.SCHEMAS[purpose] || this.SCHEMAS.both;
    const btn = document.getElementById("btn-copy-tailored-schema");

    navigator.clipboard.writeText(schemaText).then(() => {
      CONFIG.playSound("success");
      if (btn) {
        btn.innerHTML = `<i class="fa-solid fa-check text-emerald-400 mr-2"></i> Copied to Clipboard!`;
        setTimeout(() => {
          btn.innerHTML = `<i class="fa-regular fa-copy mr-2"></i> Copy Tailored SQL Schema`;
        }, 2500);
      }
      Swal.fire({
        icon: "success",
        title: "Schema Copied!",
        text: `The ${purpose === 'staff' ? 'Staff' : purpose === 'students' ? 'Students' : 'Full'} SQL Schema has been copied. Now paste it into the Supabase SQL Editor and click 'Run'.`,
        timer: 2200,
        showConfirmButton: false
      });
    }).catch(() => {
      Swal.fire({
        icon: "info",
        title: "Copy Schema",
        text: "Please manually select and copy the SQL code below."
      });
    });
  },

  async testConnection() {
    const url = document.getElementById("wizard-supabase-url")?.value.trim();
    const key = document.getElementById("wizard-supabase-key")?.value.trim();
    const btn = document.getElementById("btn-wizard-test-db");

    if (!url || !key) {
      Swal.fire({ icon: "warning", title: "Missing Information", text: "Please enter your Supabase Project URL and Anon API Key." });
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i> Testing...`;
    }

    const res = await CONFIG.testConnection(url, key);

    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i class="fa-solid fa-plug mr-2"></i> Test Connection`;
    }

    if (res.securityViolation) {
      CONFIG.playSound("error");
      Swal.fire({
        icon: "error",
        title: "Security Violation",
        html: `<div class="text-left text-xs space-y-2">
          <p><b>Never enter a service_role secret key in frontend applications!</b></p>
          <p>Service-role keys bypass Row Level Security. Please provide your public <b>anon</b> key from Supabase Dashboard -> Project Settings -> API.</p>
        </div>`,
        confirmButtonColor: "#ef4444"
      });
      return;
    }

    if (res.success) {
      if (res.warning) {
        Swal.fire({
          icon: "warning",
          title: "Connected with Warning",
          text: res.message,
          confirmButtonColor: "#4f46e5"
        });
      } else {
        CONFIG.playSound("success");
        Swal.fire({
          icon: "success",
          title: "Connection Successful!",
          text: "Verified communication with your Supabase database.",
          confirmButtonColor: "#10b981",
          timer: 2000,
          showConfirmButton: false
        });
      }
    } else {
      CONFIG.playSound("error");
      Swal.fire({
        icon: "error",
        title: "Connection Failed",
        text: res.message,
        confirmButtonColor: "#ef4444"
      });
    }
  },

  /**
   * Connects to Supabase, saves credentials, applies purpose, and redirects directly to Dashboard!
   */
  async connectDatabase() {
    const url = document.getElementById("wizard-supabase-url")?.value.trim();
    const key = document.getElementById("wizard-supabase-key")?.value.trim();
    const btn = document.getElementById("btn-wizard-connect-db");

    if (!url || !key) {
      Swal.fire({ icon: "warning", title: "Missing Credentials", text: "Both Supabase Project URL and Anon Key are required." });
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i> Connecting to Supabase...`;
    }

    const result = await CONFIG.saveCredentials(url, key);

    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i class="fa-solid fa-rocket mr-2"></i> Connect & Enter Dashboard`;
    }

    if (result.securityViolation) {
      CONFIG.playSound("error");
      Swal.fire({
        icon: "error",
        title: "Security Alert: service_role Blocked",
        html: `<div class="text-left text-xs space-y-2">
          <p><b>You entered a service_role admin secret key.</b></p>
          <p>To protect your database, frontend client applications are prohibited from using service_role credentials.</p>
          <p>Please enter your public <b>anon</b> key from Supabase Project Settings -> API.</p>
        </div>`,
        confirmButtonColor: "#ef4444"
      });
      return;
    }

    if (result.success) {
      // 1. Save and apply system purpose
      CONFIG.setPurpose(this.selectedPurpose);
      App.applySystemPurpose(this.selectedPurpose);

      // 2. Update UI badges & forms
      App.updateConnectionBadge();
      App.updateConnectionUI();
      App.hideSetupNotification();

      // 3. Play success feedback & trigger celebration confetti
      CONFIG.playSound("success");
      if (window.confetti) {
        window.confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
      }

      // 4. Close Onboarding Wizard
      this.close();

      // 5. Refresh all real-time data from Supabase
      await App.refreshAllData();

      // 6. Direct user immediately to Dashboard!
      App.switchView("dashboard");

      Swal.fire({
        icon: "success",
        title: "Connected Successfully!",
        text: `Welcome to Apex Attendance. Your ${this.selectedPurpose === 'staff' ? 'Staff' : this.selectedPurpose === 'students' ? 'Students' : 'Full'} workspace is ready.`,
        timer: 2300,
        showConfirmButton: false
      });
    } else {
      CONFIG.playSound("error");
      Swal.fire({
        icon: "error",
        title: "Configuration Error",
        text: result.message || "Could not initialize Supabase client with the provided credentials."
      });
    }
  }
};

window.OnboardingModule = OnboardingModule;
