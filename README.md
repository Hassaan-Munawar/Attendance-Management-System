# 🏢 Apex Attendance - Enterprise Attendance Management System

A complete, modern, professional **Attendance Management System** built with **HTML5, Tailwind CSS, modular JavaScript (ES6+)**, and **Supabase Database**.

Designed with facial snapshot verification, live analytics, automated late tracking, leave approval workflow, monthly timesheet matrix, inline department/shift creation, and instant Excel/CSV reporting. **Location tracking has been completely excluded for organizational privacy.**

---

## 🌟 Highlights & Key Features

### ⏱️ 1. Digital Clock & Attendance Kiosk (Privacy-First)
- **Live Clock Terminal:** High-contrast digital clock with seconds, formatted date, and active terminal indicators.
- **Biometric Photo Verification:** Web camera integration via HTML5 `getUserMedia` to capture real-time employee photos during punch-in.
- **Privacy-First (No Location Tracking):** All GPS and location tracking functionalities have been removed to protect organizational and employee privacy.
- **PIN Authentication:** Employee 4-digit security PIN verification for kiosk anti-buddy punching.
- **Audio Feedback:** Synthesized sound effects using the Web Audio API (success chime, punch impact, error alerts) without external MP3 files.
- **Celebration Effects:** Confetti animations upon on-time punch-ins.

### 👥 2. Employee Directory with Inline Department & Shift Creation
- **Inline Department Creation:** Create new departments directly from within the Add Employee modal (`+ Add Dept`) or manage them via the dedicated **Departments** manager.
- **Inline Shift Creation:** Create custom shifts (`+ Add Shift`) directly when adding employees, with custom start/end times and grace periods.
- **Zero Default Departments:** No pre-seeded departments or dummy employees; you have full freedom to define your organization's exact structure.
- **Personnel Profiles:** Visual employee cards with photo avatars, job titles, departments, shifts, emails, phones, and IDs.
- **Full Employee Attendance Card:** Dedicated modal showing personal statistics (Present, Late, Absent, Total Hours Worked) and recent attendance history.

### 📊 3. Executive Analytics & Dashboard
- **Key Metrics (KPIs):** Total Staff, Present Today, Late Arrivals, Leaves Today, and Real-time Attendance Rate percentage bar.
- **10-Day Attendance Trends:** Interactive stacked bar chart (Chart.js) tracking Present vs. Late vs. Absent patterns.
- **Punctuality Distribution:** Ring donut chart illustrating today's workforce status breakdown.
- **Department Performance:** Comparative horizontal bar charts ranking departments by compliance rate.
- **Live Activity Feed:** Real-time stream of clock-in and clock-out events.

### 📋 4. Daily Attendance Master & Regularization
- **Flexible Filtering:** Filter by Date, Department, Status (Present, Late, Half Day, Absent, On Leave), and instant search.
- **Admin Regularization Modal:** Manually modify or correct punch-in/out timestamps, change status, and log audit notes for compliance.
- **Quick Exports:** One-click export to CSV and Excel (.xlsx).

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

### 📱 7. Mobile-Optimized Experience
- **Responsive Navigation Drawer:** Slide-over mobile drawer with dark backdrop overlay and auto-close on selection.
- **Touch-Friendly Controls:** Optimized touch targets (minimum 44px) and button sizing for phones and tablets.
- **Mobile-Adaptive Clock:** Scalable typography prevents text wrapping on compact screens (360px+).
- **Prevent Auto-Zoom:** Normalized mobile input font sizing to prevent iOS Safari auto-zoom on field focus.
- **Horizontally Scrollable Tables:** Master attendance and timesheets include smooth horizontal scrolling for touchscreens.

### ⚡ 8. Pure Supabase Database Architecture
- **In-App SQL Schema Display:** Complete SQL schema script is displayed directly in the **Database & Config** view with a 1-click **Copy SQL Schema** button.
- **Zero Mock Data:** All records are retrieved live from your Supabase project.

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
     - `departments`
     - `shifts`
     - `employees`
     - `attendance`
     - `leave_requests`
     - `organization_settings`

4. **Connect inside the System:**
   - In **Project Settings** -> **API** of your Supabase dashboard, copy your **Project URL** and **anon public Key**.
   - Paste them in **Database & Config** in the app, and click **Save & Connect Database**.
   - Add your organization's departments and shifts directly when registering your first employee!

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
│   ├── config.js            # Supabase credentials management, client init, and Web Audio FX
│   ├── db.js                # Direct Supabase database service layer (departments, shifts, employees, attendance)
│   ├── attendance.js        # Kiosk terminal, camera photo capture, and daily attendance logs
│   ├── employees.js         # Employee directory, inline department/shift creation, profile modals
│   ├── leaves.js            # Leave application form, approval/rejection pipeline, and status tabs
│   ├── analytics.js         # Chart.js visualization (trend chart, donut chart, department chart)
│   ├── reports.js           # Monthly timesheet matrix grid, CSV export, SheetJS XLSX export, print
│   └── app.js               # Main application coordinator, mobile drawer, copy schema, and view router
│
└── supabase/
    └── schema.sql           # Production PostgreSQL schema (no location, zero default departments)
```
