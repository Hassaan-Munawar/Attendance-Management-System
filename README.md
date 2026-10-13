# 🏢 Apex Attendance - Enterprise & Academic Attendance Management System

A complete, modern, professional **Attendance Management System** built with **HTML5, Tailwind CSS, modular JavaScript (ES6+)**, and **Supabase Database**.

Supports dual operational workflows:
1. **Institutional Staff & Teacher Attendance:** Self-service clock-in kiosk, facial snapshot verification, shift tracking, and leave management.
2. **Teacher Classroom Student Attendance:** Rapid roll-call roster, 1-click batch attendance marking, student directory, class management, and Excel reporting.

Includes strict **credential security safeguards (service_role blocking, Web Crypto AES-GCM encryption, masked password fields)**, zero mock data, and **complete exclusion of GPS/location tracking** for organizational privacy.

---

## 🌟 Highlights & Key Features

### 🔒 1. Credential Security & Dynamic Connection UI
- **Zero Exposure of Admin Keys (`service_role` Blocked):** Client-side inspection of JWT tokens prevents users from mistakenly entering their Supabase `service_role` admin key, guarding database integrity and enforcing Row Level Security.
- **Web Crypto AES-GCM Encryption:** Supabase Project URLs and Anon API keys are encrypted client-side using the browser's Web Crypto API (`AES-GCM` with PBKDF2 key derivation) before being saved in `localStorage`.
- **Dynamic Button Visibility:**
  - When the database is **connected**, the **"Test Connection"** and **"Save & Connect Database"** buttons **do NOT appear on screen**.
  - Instead, a sleek **Connected & Secured** status card displays the active project URL, masked Anon key (with an eye toggle to reveal), and a **Disconnect** option.
  - Only when disconnected do the credentials form and connection buttons appear.
- **Input Masking & Peek Toggle:** Sensitive API keys are masked by default (`type="password"`), with interactive eye-icon toggle buttons.

### 🎓 2. Teacher Classroom Roll-Call System (Student Attendance)
- **Classroom Roll-Call View (`#view-classroom`):**
  - Select class/grade and date (defaults to today, with 1-click previous/next day buttons).
  - Displays all students enrolled in the class with roll numbers and contact details.
  - **1-Click Batch Actions:** "Mark All Present" and "Mark All Absent" for rapid classroom roll call.
  - **Touch-Friendly Status Pills:** Present (Emerald), Absent (Rose), Late (Amber), Excused (Sky).
  - Individual student remarks field (e.g., doctor's note, late arrival reason).
  - **Live Roll-Call Summary:** Total enrolled, Present count, Absent count, Late count, and Attendance percentage.
  - **Single-Click Supabase Save:** Batch upserts all student records to the `student_attendance` table with audio feedback and confetti effects.
- **Students & Classes Directory (`#view-students`):**
  - Manage classes/grades with teacher assignments, room numbers, and enrolled student tallies.
  - Comprehensive student roster with roll number search and class filtering.
  - Modal to enroll, edit, and delete students.
  - Quick "+ Add Class" modal accessible from roll-call and directory views.
  - **SheetJS (.xlsx) Export:** Export student attendance logs to Excel with student names, classes, dates, and statuses.

### ⏱️ 3. Digital Clock & Staff Kiosk (Privacy-First)
- **Live Clock Terminal:** High-contrast digital clock with seconds, formatted date, and active terminal indicators.
- **Biometric Photo Verification:** Web camera integration via HTML5 `getUserMedia` to capture real-time employee photos during punch-in.
- **Privacy-First (No Location Tracking):** All GPS and location tracking functionalities have been removed to protect organizational and employee privacy.
- **PIN Authentication:** Employee 4-digit security PIN verification for kiosk anti-buddy punching.
- **Web Audio Feedback:** Synthesized audio chimes via Web Audio API (success chime, punch impact, error alerts) without external audio files.

### 👥 4. Employee Directory with Inline Department & Shift Creation
- **Inline Department Creation:** Create new departments directly from within the Add Employee modal (`+ Add Dept`) or manage them via the dedicated manager.
- **Inline Shift Creation:** Create custom shifts (`+ Add Shift`) directly when adding employees, with custom start/end times and grace periods.
- **Zero Default Departments:** No pre-seeded departments or dummy employees; you define your organization's exact structure.
- **Personnel Profiles:** Visual employee cards with photo avatars, job titles, departments, shifts, emails, phones, and IDs.
- **Full Employee Attendance Card:** Dedicated modal showing personal statistics (Present, Late, Absent, Total Hours Worked) and recent attendance history.

### 📊 5. Executive Analytics & Dashboard
- **Key Metrics (KPIs):** Total Staff, Present Today, Late Arrivals, Leaves Today, and Real-time Attendance Rate percentage bar.
- **10-Day Attendance Trends:** Interactive stacked bar chart (Chart.js) tracking Present vs. Late vs. Absent patterns.
- **Punctuality Distribution:** Ring donut chart illustrating today's workforce status breakdown.
- **Department Performance:** Comparative horizontal bar charts ranking departments by compliance rate.
- **Live Activity Feed:** Real-time stream of clock-in and clock-out events.

### 📋 6. Daily Staff Attendance Master & Regularization
- **Flexible Filtering:** Filter by Date, Department, Status (Present, Late, Half Day, Absent, On Leave), and instant search.
- **Admin Regularization Modal:** Manually modify or correct punch-in/out timestamps, change status, and log audit notes for compliance.
- **Quick Exports:** One-click export to CSV and Excel (.xlsx).

### 📅 7. Leave Management Workflow
- **Application Portal:** Apply for Annual Vacation, Sick Leave, Casual Leave, or Unpaid Leave with dynamic day calculation.
- **Manager Approval Pipeline:** Review pending leaves with dedicated **Approve** and **Reject** actions with feedback comments.
- **Automatic Attendance Sync:** Approved leaves automatically register as `On Leave` on the daily attendance roster.

### 📈 8. Monthly Timesheet Matrix & Reporting
- **Calendar Matrix View:** Full monthly grid (Days 1–31) with color-coded badges (`P`, `L`, `HD`, `A`, `LV`, `W` for weekend) per employee.
- **Total Hours & Punctuality Counter:** Automatically tallies worked hours and status counts.
- **Exporting Options:**
  - **Excel (.xlsx):** Formatted spreadsheets via SheetJS.
  - **CSV:** Standard raw dataset download.
  - **Print Layout:** Print-optimized stylesheet (`@media print`) hiding sidebars and controls for clean paper timesheets.

### 📱 9. Mobile-Optimized Experience
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

---

## 🗄️ Setting Up Your Supabase Database

1. **Create a Supabase Project:**
   - Go to [supabase.com](https://supabase.com) and create a free project.

2. **Copy the Schema Script:**
   - In the web app, open **Database & Config** (`view-settings`).
   - Click **Copy SQL Schema** (or copy from [`supabase/schema.sql`](file:///e:/Javascript%20Projects/Attendance%20Management%20System/supabase/schema.sql)).

3. **Run in Supabase SQL Editor:**
   - In your Supabase dashboard, navigate to **SQL Editor** -> **New Query**.
   - Paste the copied SQL schema and click **Run**. This will create the required tables:
     - `departments` (Faculties / Academic Departments)
     - `shifts` (Staff / Teacher Work Schedules)
     - `employees` (Staff, Instructors, Teachers)
     - `attendance` (Staff Clock-In/Out Attendance)
     - `classes` (Classrooms, Grades, Sections for Teachers)
     - `students` (Enrolled Students Directory)
     - `student_attendance` (Classroom Roll-Call Records)
     - `leave_requests` (Staff Leave Applications)
     - `organization_settings` (Institutional Rules & Grace Periods)

4. **Connect inside the System:**
   - In **Project Settings** -> **API** of your Supabase dashboard, copy your **Project URL** and **anon public Key**.
   - Paste them in **Database & Config** in the app, and click **Save & Connect Database**.
   - Once connected, the connection buttons disappear and are replaced by the secured status card!

---

## 📁 Project Architecture & File Structure

```
Attendance Management System/
│
├── index.html               # Main Single-Page Application (SPA) container
├── README.md                # Documentation and setup instructions
│
├── css/
│   └── styles.css           # Glassmorphism, dark palette, animations, mobile CSS, print rules
│
├── js/
│   ├── config.js            # Supabase credentials, Web Crypto AES-GCM, service_role guard, Web Audio FX
│   ├── db.js                # Direct Supabase database service layer (staff, classes, students, attendance)
│   ├── attendance.js        # Staff kiosk terminal, camera photo capture, and daily attendance logs
│   ├── employees.js         # Employee directory, inline department/shift creation, profile modals
│   ├── students.js          # Teacher classroom roll-call, student directory, class management, Excel export
│   ├── leaves.js            # Leave application form, approval/rejection pipeline, and status tabs
│   ├── analytics.js         # Chart.js visualization (trend chart, donut chart, department chart)
│   ├── reports.js           # Monthly timesheet matrix grid, CSV export, SheetJS XLSX export, print
│   └── app.js               # Main coordinator, dynamic button visibility, drawer, and view router
│
└── supabase/
    └── schema.sql           # Production PostgreSQL schema (classes, students, staff, zero default seeds)
```
