# 🏢 Apex Attendance - Enterprise & Academic Attendance Management System

A complete, modern, professional **Attendance Management System** built with **HTML5, Tailwind CSS, modular JavaScript (ES6+)**, and **Supabase Database**.

Supports three tailored operational purposes:
1. **Managing Staff and Students Attendance (`both`):** Full academic & institutional suite for schools, universities, and training centers. Staff clock-in kiosk and teacher classroom roll-call.
2. **Only Staff Attendance (`staff`):** Corporate and enterprise mode focused on employee punctuality, work shifts, overtime, and leave management.
3. **Only Students Attendance (`students`):** Optimized for teachers, academies, and classrooms focused on student roll-call, class rosters, attendance rates, and parental contact logs.

Includes a **4-Step Interactive Welcome & Setup Wizard**, **Fast Login for returning users**, **Tailored Supabase SQL Schemas**, **strict credential security (AES-GCM encryption, `service_role` blocking)**, **zero mock data**, and **complete exclusion of GPS/location tracking** for organizational privacy.

---

## 🌟 Highlights & Key Features

### 🚀 1. Welcome & Onboarding Wizard with Tailored Setup
- **Welcome Page on Launch:** Greets new users with an interactive feature briefing (facial camera snapshots, privacy-first zero GPS tracking, flexible shifts, dual engine, SheetJS Excel export, Web Crypto AES-GCM encryption).
- **Fast Login for Existing Users:** Users who already created their Supabase project and executed their SQL schema can click **"Already have a project? Quick Log In"** on the Welcome screen to jump directly to the credential screen.
- **Purpose of Use Selection (Step 2):**
  - **Option 1: Staff & Students Attendance** (Full Suite)
  - **Option 2: Only Staff Attendance** (Corporate & Enterprise)
  - **Option 3: Only Students Attendance** (Academic Classrooms & Teachers)
- **Supabase Project Creation & Tailored SQL Schema Guide (Step 3):**
  - Detailed step-by-step instructions for creating a free project at supabase.com.
  - How to copy API credentials (Project URL and Anon public Key).
  - How to open the SQL Editor and run the SQL schema.
  - **Dynamic Schema Preview & 1-Click Copy:** The SQL schema dynamically adapts based on the purpose chosen in Step 2!
- **Connect & Direct to Dashboard (Step 4):**
  - Secure credential testing and connection.
  - Upon successful connection, credentials are encrypted, the wizard closes with celebration confetti, and the user is **directed straight to the live Dashboard**!

---

### 🔒 2. Credential Security & Dynamic Connection UI
- **Zero Exposure of Admin Keys (`service_role` Blocked):** Client-side inspection of JWT tokens prevents users from mistakenly entering their Supabase `service_role` admin key, guarding database integrity and enforcing Row Level Security.
- **Web Crypto AES-GCM Encryption:** Supabase Project URLs and Anon API keys are encrypted client-side using the browser's Web Crypto API (`AES-GCM` with PBKDF2 key derivation) before being saved in `localStorage`.
- **Dynamic Button Visibility:**
  - When the database is **connected**, the **"Test Connection"** and **"Save & Connect Database"** buttons **do NOT appear on screen**.
  - Instead, a sleek **Connected & Secured** status card displays the active project URL, masked Anon key (with an eye toggle to reveal), and a **Disconnect** option.
  - Only when disconnected do the credentials form and connection buttons appear.
- **Input Masking & Peek Toggle:** Sensitive API keys are masked by default (`type="password"`), with interactive eye-icon toggle buttons.

---

### 🎓 3. Teacher Classroom Roll-Call System (Student Attendance)
- **Classroom Roll-Call View (`#view-classroom`):**
  - Select class/grade and date (defaults to today, with 1-click previous/next day buttons).
  - Displays all students enrolled in the class with roll numbers and contact details.
  - **1-Click Batch Actions:** "Mark All Present" and "Mark All Absent" for rapid classroom roll call.
  - **Touch-Friendly Status Pills:** Present (Emerald), Absent (Rose), Late (Amber), Excused (Sky).
  - Individual student remarks field (e.g., doctor's note, late arrival reason).
  - **Live Roll-Call Summary:** Total enrolled, Present count, Absent count, Late count, and Attendance percentage.
  - **Single-Click Supabase Save:** Batch upserts all student records to the `student_attendance` table with audio feedback.
- **Students & Classes Directory (`#view-students`):**
  - Manage classes/grades with teacher assignments, room numbers, and enrolled student tallies.
  - Comprehensive student roster with roll number search and class filtering.
  - Modal to enroll, edit, and delete students.
  - Quick "+ Add Class" modal accessible from roll-call and directory views.
  - **SheetJS (.xlsx) Export:** Export student attendance logs to Excel with student names, classes, dates, and statuses.

---

### ⏱️ 4. Digital Clock & Staff Kiosk (Privacy-First)
- **Live Clock Terminal:** High-contrast digital clock with seconds, formatted date, and active terminal indicators.
- **Biometric Photo Verification:** Web camera integration via HTML5 `getUserMedia` to capture real-time employee photos during punch-in.
- **Privacy-First (No Location Tracking):** All GPS and location tracking functionalities have been removed to protect organizational and employee privacy.
- **PIN Authentication:** Employee 4-digit security PIN verification for kiosk anti-buddy punching.
- **Web Audio Feedback:** Synthesized audio chimes via Web Audio API (success chime, punch impact, error alerts) without external audio files.

---

### 👥 5. Employee Directory with Inline Department & Shift Creation
- **Inline Department Creation:** Create new departments directly from within the Add Employee modal (`+ Add Dept`) or manage them via the dedicated manager.
- **Inline Shift Creation:** Create custom shifts (`+ Add Shift`) directly when adding employees, with custom start/end times and grace periods.
- **Zero Default Departments:** No pre-seeded departments or dummy employees; you define your organization's exact structure.
- **Personnel Profiles:** Visual employee cards with photo avatars, job titles, departments, shifts, emails, phones, and IDs.
- **Full Employee Attendance Card:** Dedicated modal showing personal statistics (Present, Late, Absent, Total Hours Worked) and recent attendance history.

---

### 📊 6. Purpose-Adaptive Analytics & Dashboard
- **Key Metrics (KPIs):**
  - In **Staff Mode**: Total Staff, Present Today, Late Arrivals, Approved Leave, and Attendance Rate.
  - In **Students Mode**: Total Students, Present Today, Late Arrivals, Absent / Excused, and Classroom Attendance Rate.
- **10-Day Attendance Trends:** Interactive stacked bar chart (Chart.js) tracking Present vs. Late vs. Absent patterns.
- **Punctuality Distribution:** Ring donut chart illustrating today's workforce / student status breakdown.
- **Compliance Performance:** Horizontal bar charts ranking departments (in staff mode) or classes (in student mode) by attendance rate.
- **Live Activity Feed:** Real-time stream of clock-in and roll-call events.

---

### 📋 7. Daily Attendance Master & Regularization
- **Flexible Filtering:** Filter by Date, Department, Status (Present, Late, Half Day, Absent, On Leave), and instant search.
- **Admin Regularization Modal:** Manually modify or correct punch-in/out timestamps, change status, and log audit notes for compliance.
- **Quick Exports:** One-click export to CSV and Excel (.xlsx).

---

### 📅 8. Leave Management Workflow
- **Application Portal:** Apply for Annual Vacation, Sick Leave, Casual Leave, or Unpaid Leave with dynamic day calculation.
- **Manager Approval Pipeline:** Review pending leaves with dedicated **Approve** and **Reject** actions with feedback comments.
- **Automatic Attendance Sync:** Approved leaves automatically register as `On Leave` on the daily attendance roster.

---

### 📈 9. Monthly Timesheet Matrix & Reporting
- **Calendar Matrix View:** Full monthly grid (Days 1–31) with color-coded badges (`P`, `L`, `HD`, `A`, `LV`, `W` for weekend) per employee or student.
- **Total Hours & Punctuality Counter:** Automatically tallies worked hours and status counts.
- **Exporting Options:**
  - **Excel (.xlsx):** Formatted spreadsheets via SheetJS.
  - **CSV:** Standard raw dataset download.
  - **Print Layout:** Print-optimized stylesheet (`@media print`) hiding sidebars and controls for clean paper timesheets.

---

### 📱 10. Mobile-Optimized Experience
- **Responsive Navigation Drawer:** Slide-over mobile drawer with dark backdrop overlay and auto-close on selection.
- **Touch-Friendly Controls:** Optimized touch targets (minimum 44px) and button sizing for phones and tablets.
- **Mobile-Adaptive Clock:** Scalable typography prevents text wrapping on compact screens (360px+).
- **Prevent Auto-Zoom:** Normalized mobile input font sizing to prevent iOS Safari auto-zoom on field focus.
- **Horizontally Scrollable Tables:** Master attendance and timesheets include smooth horizontal scrolling for touchscreens.

---

## 🚀 Quick Start Guide

### Step 1: Open the Application
You can open `index.html` directly in any modern browser:
- Double click `index.html` in your file explorer, or
- Run a lightweight HTTP server:
  ```bash
  # Using Python:
  python -m http.server 8000

  # Or using Node.js:
  npx serve .
  ```
- Navigate to `http://localhost:8000` in your web browser.

### Step 2: Welcome & Setup
1. When opened, the **Welcome Screen** automatically appears:
   - Click **Get Started / Next** to choose your purpose and view your tailored Supabase setup guide.
   - Or click **Already have a project? Quick Log In** to jump straight to entering your credentials.
2. Select your Purpose:
   - **Managing Staff and Students Attendance**
   - **Only Staff Attendance**
   - **Only Students Attendance**
3. In Step 3, click **Copy Tailored SQL Schema**, paste it in your Supabase SQL Editor, and click **Run**.
4. In Step 4, enter your **Supabase URL** and **Anon public Key**, test the connection, and click **Connect & Enter Dashboard**.
5. You are immediately directed to your live, synchronized Dashboard!

---

## 🗄️ Tailored Supabase SQL Schemas

Three dedicated, clean SQL schemas are provided in the [`supabase/`](file:///e:/Javascript%20Projects/Attendance%20Management%20System/supabase/) folder:

1. **[`supabase/schema.sql`](file:///e:/Javascript%20Projects/Attendance%20Management%20System/supabase/schema.sql)** - Complete schema for **Staff & Students Attendance** (departments, shifts, employees, attendance, classes, students, student attendance, leave requests, settings).
2. **[`supabase/schema-staff.sql`](file:///e:/Javascript%20Projects/Attendance%20Management%20System/supabase/schema-staff.sql)** - Optimized schema for **Only Staff Attendance** (corporate departments, shifts, employees, staff attendance, leave requests, organization settings).
3. **[`supabase/schema-students.sql`](file:///e:/Javascript%20Projects/Attendance%20Management%20System/supabase/schema-students.sql)** - Clean schema for **Only Students Attendance** (classes/grades, students directory, student attendance roll-call, school settings).

All schemas include full Row Level Security (RLS) policies and real-time publication setup.

---

## 📁 Project Architecture & File Structure

```
Attendance Management System/
│
├── index.html                  # Main SPA container with multi-step onboarding wizard
├── README.md                   # Complete documentation and setup instructions
│
├── css/
│   └── styles.css              # Glassmorphism, dark palette, animations, mobile CSS, print rules
│
├── js/
│   ├── config.js               # Supabase credentials, Web Crypto AES-GCM, service_role guard, purpose state
│   ├── db.js                   # Direct Supabase database service layer (staff, classes, students, attendance)
│   ├── onboarding.js           # Multi-step Welcome & Setup Wizard, tailored schema guide, quick login
│   ├── attendance.js           # Staff kiosk terminal, camera photo capture, and daily attendance logs
│   ├── employees.js            # Employee directory, inline department/shift creation, profile modals
│   ├── students.js             # Teacher classroom roll-call, student directory, class management, Excel export
│   ├── leaves.js               # Leave application form, approval/rejection pipeline, and status tabs
│   ├── analytics.js            # Purpose-adaptive Chart.js visualizations (trends, distribution, compliance)
│   ├── reports.js              # Monthly timesheet matrix grid, CSV export, SheetJS XLSX export, print
│   └── app.js                  # Main coordinator, dynamic button visibility, drawer, and view router
│
└── supabase/
    ├── schema.sql              # Full Production PostgreSQL schema (staff & students)
    ├── schema-staff.sql        # Tailored schema for "Only Staff Attendance"
    └── schema-students.sql     # Tailored schema for "Only Students Attendance"
```
