/**
 * Supabase Database Service Layer
 * All operations communicate directly and exclusively with Supabase Cloud Database.
 */

const DB = {
  init() {
    CONFIG.init();
  },

  checkClient() {
    if (!CONFIG.client) {
      throw new Error("Supabase is not connected. Please enter your Supabase URL and Anon Key in Settings.");
    }
  },

  // ==========================================
  // DEPARTMENTS & SHIFTS
  // ==========================================
  async getDepartments() {
    if (!CONFIG.client) return [];
    try {
      const { data, error } = await CONFIG.client
        .from("departments")
        .select("*")
        .order("name", { ascending: true });

      if (error) {
        console.error("Supabase getDepartments error:", error.message);
        return [];
      }
      return data || [];
    } catch (e) {
      console.error("Failed to fetch departments:", e);
      return [];
    }
  },

  async getShifts() {
    if (!CONFIG.client) return [];
    try {
      const { data, error } = await CONFIG.client
        .from("shifts")
        .select("*")
        .order("name", { ascending: true });

      if (error) {
        console.error("Supabase getShifts error:", error.message);
        return [];
      }
      return data || [];
    } catch (e) {
      console.error("Failed to fetch shifts:", e);
      return [];
    }
  },

  // ==========================================
  // EMPLOYEES
  // ==========================================
  async getEmployees() {
    if (!CONFIG.client) return [];
    try {
      const { data, error } = await CONFIG.client
        .from("employees")
        .select("*, departments(name, code), shifts(name, start_time, end_time)")
        .order("first_name", { ascending: true });

      if (error) {
        console.error("Supabase getEmployees error:", error.message);
        return [];
      }

      return (data || []).map(emp => ({
        ...emp,
        department_name: emp.departments?.name || "Unassigned",
        department_code: emp.departments?.code || "GEN",
        shift_name: emp.shifts?.name || "General Day Shift",
        shift_start: emp.shifts?.start_time || "09:00:00",
        shift_end: emp.shifts?.end_time || "18:00:00"
      }));
    } catch (e) {
      console.error("Failed to fetch employees:", e);
      return [];
    }
  },

  async getEmployeeById(id) {
    if (!CONFIG.client) return null;
    try {
      const { data, error } = await CONFIG.client
        .from("employees")
        .select("*, departments(name, code), shifts(name, start_time, end_time)")
        .or(`id.eq.${id},employee_code.ilike.${id}`)
        .limit(1);

      if (error || !data || data.length === 0) return null;

      const emp = data[0];
      return {
        ...emp,
        department_name: emp.departments?.name || "Unassigned",
        department_code: emp.departments?.code || "GEN",
        shift_name: emp.shifts?.name || "General Day Shift",
        shift_start: emp.shifts?.start_time || "09:00:00",
        shift_end: emp.shifts?.end_time || "18:00:00"
      };
    } catch (e) {
      console.error("Failed to fetch employee by id:", e);
      return null;
    }
  },

  async addEmployee(employeeData) {
    this.checkClient();
    const supaData = { ...employeeData };
    delete supaData.id;

    const { data, error } = await CONFIG.client
      .from("employees")
      .insert([supaData])
      .select("*, departments(name, code), shifts(name, start_time, end_time)");

    if (error) throw new Error(error.message);
    return data && data[0] ? data[0] : null;
  },

  async updateEmployee(id, updates) {
    this.checkClient();
    const supaData = { ...updates };
    delete supaData.id;

    const { data, error } = await CONFIG.client
      .from("employees")
      .update(supaData)
      .eq("id", id)
      .select("*, departments(name, code), shifts(name, start_time, end_time)");

    if (error) throw new Error(error.message);
    return data && data[0] ? data[0] : null;
  },

  async deleteEmployee(id) {
    this.checkClient();
    const { error } = await CONFIG.client
      .from("employees")
      .delete()
      .eq("id", id);

    if (error) throw new Error(error.message);
    return true;
  },

  // ==========================================
  // ATTENDANCE
  // ==========================================
  async getAttendance(filters = {}) {
    if (!CONFIG.client) return [];
    try {
      let query = CONFIG.client
        .from("attendance")
        .select("*, employees(*, departments(name, code))")
        .order("date", { ascending: false });

      if (filters.date) query = query.eq("date", filters.date);
      if (filters.startDate) query = query.gte("date", filters.startDate);
      if (filters.endDate) query = query.lte("date", filters.endDate);
      if (filters.employeeId) query = query.eq("employee_id", filters.employeeId);
      if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);

      const { data, error } = await query;
      if (error) {
        console.error("Supabase getAttendance error:", error.message);
        return [];
      }

      let records = (data || []).map(r => ({
        ...r,
        employee: r.employees ? {
          ...r.employees,
          department_name: r.employees.departments?.name || "Unassigned"
        } : null
      }));

      if (filters.departmentId && filters.departmentId !== "all") {
        records = records.filter(r => r.employee && r.employee.department_id === filters.departmentId);
      }

      return records;
    } catch (e) {
      console.error("Failed to fetch attendance:", e);
      return [];
    }
  },

  async getTodayAttendance() {
    const today = new Date().toISOString().split("T")[0];
    return this.getAttendance({ date: today });
  },

  async getAttendanceForEmployeeToday(employeeId) {
    if (!CONFIG.client) return null;
    const today = new Date().toISOString().split("T")[0];
    try {
      const { data, error } = await CONFIG.client
        .from("attendance")
        .select("*")
        .eq("employee_id", employeeId)
        .eq("date", today)
        .limit(1);

      if (error || !data || data.length === 0) return null;
      return data[0];
    } catch (e) {
      return null;
    }
  },

  async clockIn({ employeeId, verificationPhoto, locationLat, locationLng, notes = "" }) {
    this.checkClient();
    const today = new Date().toISOString().split("T")[0];
    const now = new Date();

    // Check organization settings for grace period and start time
    const settings = await this.getSettings();
    let graceMinutes = settings?.grace_period_minutes ?? 15;
    let workStartHour = 9;
    let workStartMinute = 0;

    if (settings?.office_start_time) {
      const parts = settings.office_start_time.split(":");
      workStartHour = parseInt(parts[0], 10) || 9;
      workStartMinute = parseInt(parts[1], 10) || 0;
    }

    const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();
    const thresholdMinutes = (workStartHour * 60 + workStartMinute) + graceMinutes;

    let status = "present";
    if (currentTotalMinutes > thresholdMinutes) {
      status = "late";
    }

    const attendanceRecord = {
      employee_id: employeeId,
      date: today,
      clock_in: now.toISOString(),
      clock_out: null,
      break_minutes: 0,
      total_hours: 0,
      status: status,
      verification_photo: verificationPhoto || null,
      location_lat: locationLat || null,
      location_lng: locationLng || null,
      notes: notes || (status === "late" ? "Late clock-in recorded" : "Kiosk verified punch-in"),
      is_regularized: false
    };

    const { data, error } = await CONFIG.client
      .from("attendance")
      .upsert([attendanceRecord], { onConflict: "employee_id,date" })
      .select();

    if (error) throw new Error(error.message);
    return { success: true, record: data[0] };
  },

  async clockOut({ employeeId, notes = "" }) {
    this.checkClient();
    const today = new Date().toISOString().split("T")[0];
    const now = new Date();

    // Query today's existing record for this employee
    const { data: existingList, error: fetchErr } = await CONFIG.client
      .from("attendance")
      .select("*")
      .eq("employee_id", employeeId)
      .eq("date", today);

    if (fetchErr || !existingList || existingList.length === 0) {
      return { success: false, message: "No Clock-In record found for today. Please clock in first!" };
    }

    const existing = existingList[0];
    if (!existing.clock_in) {
      return { success: false, message: "Clock-In timestamp missing. Cannot calculate shift duration." };
    }

    const clockIn = new Date(existing.clock_in);
    const diffMs = now - clockIn;
    const totalHours = Math.max(0, parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2)));

    const updatedNotes = notes ? (existing.notes ? existing.notes + " | " + notes : notes) : existing.notes;

    const { data, error } = await CONFIG.client
      .from("attendance")
      .update({
        clock_out: now.toISOString(),
        total_hours: totalHours,
        notes: updatedNotes
      })
      .eq("id", existing.id)
      .select();

    if (error) throw new Error(error.message);
    return { success: true, record: data[0] };
  },

  async updateAttendance(id, updates) {
    this.checkClient();
    const { data, error } = await CONFIG.client
      .from("attendance")
      .update({ ...updates, is_regularized: true })
      .eq("id", id)
      .select();

    if (error) throw new Error(error.message);
    return data && data[0] ? data[0] : null;
  },

  // ==========================================
  // LEAVE REQUESTS
  // ==========================================
  async getLeaveRequests(filters = {}) {
    if (!CONFIG.client) return [];
    try {
      let query = CONFIG.client
        .from("leave_requests")
        .select("*, employees(*, departments(name, code))")
        .order("created_at", { ascending: false });

      if (filters.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }
      if (filters.employeeId) {
        query = query.eq("employee_id", filters.employeeId);
      }

      const { data, error } = await query;
      if (error) {
        console.error("Supabase getLeaveRequests error:", error.message);
        return [];
      }

      return (data || []).map(r => ({
        ...r,
        employee: r.employees ? {
          ...r.employees,
          department_name: r.employees.departments?.name || "Unassigned"
        } : null
      }));
    } catch (e) {
      console.error("Failed to fetch leave requests:", e);
      return [];
    }
  },

  async submitLeaveRequest(request) {
    this.checkClient();
    const supaData = { ...request, status: "pending" };
    delete supaData.id;

    const { data, error } = await CONFIG.client
      .from("leave_requests")
      .insert([supaData])
      .select();

    if (error) throw new Error(error.message);
    return data && data[0] ? data[0] : null;
  },

  async updateLeaveStatus(id, status, adminComment = "") {
    this.checkClient();
    const { data, error } = await CONFIG.client
      .from("leave_requests")
      .update({
        status,
        admin_comment: adminComment,
        reviewed_at: new Date().toISOString()
      })
      .eq("id", id)
      .select();

    if (error) throw new Error(error.message);
    const leave = data && data[0] ? data[0] : null;

    // If approved, create corresponding attendance records marked as on_leave
    if (leave && status === "approved") {
      try {
        const start = new Date(leave.start_date);
        const end = new Date(leave.end_date);
        const cur = new Date(start);

        while (cur <= end) {
          const dateStr = cur.toISOString().split("T")[0];
          // Check day of week (skip weekends)
          const day = cur.getDay();
          if (day !== 0 && day !== 6) {
            await CONFIG.client.from("attendance").upsert([{
              employee_id: leave.employee_id,
              date: dateStr,
              clock_in: null,
              clock_out: null,
              break_minutes: 0,
              total_hours: 0,
              status: "on_leave",
              notes: `Approved Leave (${leave.leave_type})`
            }], { onConflict: "employee_id,date" });
          }
          cur.setDate(cur.getDate() + 1);
        }
      } catch (leaveSyncErr) {
        console.warn("Could not auto-generate attendance on leave approval:", leaveSyncErr);
      }
    }

    return leave;
  },

  // ==========================================
  // SETTINGS & BOOTSTRAP
  // ==========================================
  async getSettings() {
    if (!CONFIG.client) {
      return {
        company_name: "Apex Enterprise",
        office_start_time: "09:00:00",
        office_end_time: "18:00:00",
        grace_period_minutes: 15
      };
    }

    try {
      const { data, error } = await CONFIG.client
        .from("organization_settings")
        .select("*")
        .limit(1);

      if (!error && data && data.length > 0) return data[0];
      return {
        company_name: "Apex Enterprise",
        office_start_time: "09:00:00",
        office_end_time: "18:00:00",
        grace_period_minutes: 15
      };
    } catch (e) {
      return {
        company_name: "Apex Enterprise",
        office_start_time: "09:00:00",
        office_end_time: "18:00:00",
        grace_period_minutes: 15
      };
    }
  },

  async updateSettings(newSettings) {
    this.checkClient();
    const { data: existing } = await CONFIG.client.from("organization_settings").select("id").limit(1);

    let error;
    if (existing && existing.length > 0) {
      const res = await CONFIG.client
        .from("organization_settings")
        .update({ ...newSettings, updated_at: new Date().toISOString() })
        .eq("id", existing[0].id);
      error = res.error;
    } else {
      const res = await CONFIG.client
        .from("organization_settings")
        .insert([{ ...newSettings, updated_at: new Date().toISOString() }]);
      error = res.error;
    }

    if (error) throw new Error(error.message);
    return newSettings;
  },

  /**
   * Bootstrap / Initialize New Database Structure
   * Creates default organization settings, standard departments, and shifts
   * if connected to a newly created database.
   */
  async bootstrapDatabase() {
    this.checkClient();

    const results = { departments: 0, shifts: 0, settings: false };

    // 1. Ensure Organization Settings
    const { data: settingsCheck } = await CONFIG.client.from("organization_settings").select("id").limit(1);
    if (!settingsCheck || settingsCheck.length === 0) {
      const { error: setErr } = await CONFIG.client.from("organization_settings").insert([{
        company_name: "Apex Enterprise",
        office_start_time: "09:00:00",
        office_end_time: "18:00:00",
        grace_period_minutes: 15
      }]);
      if (!setErr) results.settings = true;
    }

    // 2. Ensure Default Departments
    const { data: deptCheck } = await CONFIG.client.from("departments").select("id").limit(1);
    if (!deptCheck || deptCheck.length === 0) {
      const defaultDepts = [
        { name: "Engineering & Tech", code: "ENG", description: "Software development and infrastructure" },
        { name: "Human Resources", code: "HR", description: "People operations and payroll" },
        { name: "Product & Design", code: "PRD", description: "Product strategy and UI/UX design" },
        { name: "Sales & Marketing", code: "MKT", description: "Business growth and client acquisition" },
        { name: "Finance & Operations", code: "FIN", description: "Accounting and financial planning" }
      ];
      const { data: insertedDepts, error: dErr } = await CONFIG.client.from("departments").insert(defaultDepts).select();
      if (!dErr && insertedDepts) results.departments = insertedDepts.length;
    }

    // 3. Ensure Default Shifts
    const { data: shiftCheck } = await CONFIG.client.from("shifts").select("id").limit(1);
    if (!shiftCheck || shiftCheck.length === 0) {
      const defaultShifts = [
        { name: "General Day Shift", start_time: "09:00:00", end_time: "18:00:00", grace_period_minutes: 15, half_day_hours: 4.0 },
        { name: "Morning Shift", start_time: "07:30:00", end_time: "16:30:00", grace_period_minutes: 10, half_day_hours: 4.0 },
        { name: "Evening Shift", start_time: "13:00:00", end_time: "22:00:00", grace_period_minutes: 15, half_day_hours: 4.0 }
      ];
      const { data: insertedShifts, error: sErr } = await CONFIG.client.from("shifts").insert(defaultShifts).select();
      if (!sErr && insertedShifts) results.shifts = insertedShifts.length;
    }

    return results;
  }
};

window.DB = DB;
DB.init();
