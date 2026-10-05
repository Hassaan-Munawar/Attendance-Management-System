# 🏢 Apex Attendance - Enterprise Attendance Management System

A complete, modern, professional **Attendance Management System** built with **HTML5, Tailwind CSS, modular JavaScript (ES6+)**, and **Supabase Database**.

Designed with facial snapshot verification, geolocation tracking, live analytics, automatic late tracking, leave approval workflow, monthly timesheet matrix, and instant Excel/CSV reporting.

---

## 🌟 Highlights & Key Features

### ⏱️ 1. Digital Clock & Attendance Kiosk
- **Live Clock Terminal:** High-contrast digital clock with seconds, formatted date, and pulsing status badges.
- **Biometric Photo Verification:** Web camera integration via HTML5 `getUserMedia` to capture real-time employee photos during punch-in.
- **Geolocation Geofencing:** HTML5 `geolocation` coordinates detection with accuracy meter for GPS verification.
- **PIN Authentication:** Employee 4-digit security PIN verification for kiosk anti-buddy punching.
- **Audio Feedback:** Synthesized sound effects using the Web Audio API (success chime, punch impact, error alerts) without external MP3 files.
- **Celebration Effects:** Confetti animations upon on-time punch-ins.

### 📊 2. Executive Analytics & Dashboard
- **Key Metrics (KPIs):** Total Staff, Present Today, Late Arrivals, Leaves Today, and Real-time Attendance Rate percentage bar.
- **10-Day Attendance Trends:** Interactive stacked bar chart (Chart.js) tracking Present vs. Late vs. Absent patterns.
- **Punctuality Distribution:** Ring donut chart illustrating today's workforce status breakdown.
- **Department Performance:** Comparative horizontal bar charts ranking departments by compliance rate.
- **Live Activity Feed:** Real-time stream of clock-in and clock-out events.

### 📋 3. Daily Attendance Master & Regularization
- **Flexible Filtering:** Filter by Date, Department, Status (Present, Late, Half Day, Absent, On Leave), and instant search.
- **Admin Regularization Modal:** Manually modify or correct punch-in/out timestamps, change status, and log audit notes for compliance.
- **Quick Exports:** One-click export to CSV and Excel (.xlsx).

### 👥 4. Employee Directory
- **Personnel Profiles:** Visual employee cards with photo avatar, job title, department, shift, email, phone, and employee ID.
- **Full Employee Attendance Card:** Dedicated modal showing personal statistics (Present, Late, Absent, Total Hours Worked) and recent attendance history.
- **CRUD Management:** Add new employees, edit details, or soft-deactivate/delete profiles directly in Supabase.

### 📅 5. Leave Management Workflow
- **Application Portal:** Apply for Annual Vacation, Sick Leave, Casual Leave, or Unpaid Leave with dynamic day calculation.
- **Manager Approval Pipeline:** Review pending leaves with dedicated **Approve** and **Reject** actions with feedback comments.
- **Automatic Attendance Sync:** Approved leaves automatically register as `On Leave` on the daily attendance roster.

### 📈 6. Monthly Timesheet Matrix & Reporting
- **Calendar Matrix View:** Full monthly grid (Days 1–31) with color-coded badges (`P`, `L`, `HD`, `A`, `LV`, `W` for weekend) per employee.
- **Total Hours & Punctuality Counter:** Automatically tallies worked hours and status counts.
- **Exporting Options:**
  - **Excel (.xlsx):** Formatted spreadsheets via SheetJS.
  - **CSV:** Standard raw dataset download.
  - **Print Layout:** Print-optimized stylesheet (`@media print`) hiding sidebars and controls for clean paper timesheets.

### ⚡ 7. Pure Supabase Database Architecture
- **Direct Cloud Integration:** Connects directly via `@supabase/supabase-js`.
- **Zero Mock Data:** All departments, shifts, employees, attendance logs, and leave applications are retrieved live from your Supabase project.
- **New Database Bootstrapping:** One-click initialization to bootstrap standard organizational departments and shifts if connected to a fresh database.
- **Production SQL Schema:** Ready-to-run schema script in `supabase/schema.sql` with tables, Row Level Security (RLS) policies, and performance indexes.

---

## 🚀 Quick Start Guide

### Step 1: Open the Application
You can open `index.html` directly in any modern browser:
- Double click `index.html` in your file explorer, or
- Run a lightweight HTTP server (recommended for camera and geolocation permissions):
  ```bash
  # Using Python:
  python -m http.server 8000

  # Or using Node.js:
  npx serve .
  ```
- Navigate to `http://localhost:8000` in your web browser.

---

## 🗄️ Setting Up Supabase Database

1. **Create a Supabase Project:**
   - Go to [supabase.com](https://supabase.com) and create a free project.

2. **Run the Database Schema:**
   - In your Supabase dashboard, navigate to **SQL Editor** -> **New Query**.
   - Copy the entire contents of [supabase/schema.sql](file:///e:/Javascript%20Projects/Attendance%20Management%20System/supabase/schema.sql) and paste it into the editor.
   - Click **Run**. This will create the required tables:
     - `departments`
     - `shifts`
     - `employees`
     - `attendance`
     - `leave_requests`
     - `organization_settings`

3. **Obtain Project Credentials:**
   - Go to **Project Settings** -> **API**.
   - Copy your **Project URL** (e.g., `https://xyzproject.supabase.co`).
   - Copy your **anon public API Key**.

4. **Connect inside the System:**
   - In the web app, navigate to **Database & Config** (`view-settings`).
   - Paste your **Supabase Project URL** and **Anon API Key**.
   - Click **Test Connection** to verify database communication.
   - Click **Save & Connect Database**.
   - If setting up a fresh database, click **Initialize Default Departments & Shifts** to ensure default departments (Engineering, HR, Product, Sales, Finance) and shifts are ready!

---

## 📁 Project Architecture & File Structure

```
Attendance Management System/
│
├── index.html               # Main Single-Page Application (SPA) container
├── README.md                # Documentation and setup instructions
│
├── css/
│   └── styles.css           # Custom styles, glassmorphism effects, scrollbars, and print CSS
│
├── js/
│   ├── config.js            # Supabase credentials management, client init, and Web Audio FX
│   ├── db.js                # Direct Supabase database service layer & bootstrap logic
│   ├── attendance.js        # Kiosk terminal, camera capture, GPS check, and daily attendance logs
│   ├── employees.js         # Staff directory, employee profile modal, add/edit forms, and filters
│   ├── leaves.js            # Leave application form, approval/rejection pipeline, and status tabs
│   ├── analytics.js         # Chart.js visualization (trend chart, donut chart, department chart)
│   ├── reports.js           # Monthly timesheet matrix grid, CSV export, SheetJS XLSX export, print
│   └── app.js               # Main application coordinator, setup alerts, and view router
│
└── supabase/
    └── schema.sql           # Production PostgreSQL schema, RLS policies, indexes, and setup
```
