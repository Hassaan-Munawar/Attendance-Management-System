/**
 * Analytics & Data Visualization Module
 * Directly visualizes live Supabase attendance logs with Chart.js
 * Intelligently adapts to purpose: Staff, Students, or Both
 */

const AnalyticsModule = {
  trendChartInstance: null,
  distributionChartInstance: null,
  departmentChartInstance: null,

  async initCharts() {
    await this.renderDashboardKPIs();
    await this.renderAttendanceTrendsChart();
    await this.renderDistributionChart();
    await this.renderDepartmentChart();
  },

  async renderDashboardKPIs() {
    const purpose = CONFIG.getPurpose ? CONFIG.getPurpose() : "both";
    const today = new Date().toISOString().split("T")[0];

    const elTotalStaff = document.getElementById("kpi-total-staff");
    const elPresent = document.getElementById("kpi-present-today");
    const elLate = document.getElementById("kpi-late-today");
    const elLeaves = document.getElementById("kpi-leaves-today");
    const elRate = document.getElementById("kpi-attendance-rate");
    const elRateBar = document.getElementById("kpi-attendance-bar");

    if (purpose === "students") {
      // ------------------------------------------
      // STUDENT ATTENDANCE DASHBOARD METRICS
      // ------------------------------------------
      const kpiStaffLabel = elTotalStaff?.closest(".glass-panel")?.querySelector("p");
      if (kpiStaffLabel) kpiStaffLabel.textContent = "Total Students";
      const kpiLeaveLabel = elLeaves?.closest(".glass-panel")?.querySelector("p");
      if (kpiLeaveLabel) kpiLeaveLabel.textContent = "Absent / Excused";

      const students = await DB.getStudents();
      const activeStudents = students.filter(s => s.status !== "inactive");
      const totalCount = activeStudents.length;

      const todayRecords = await DB.getStudentAttendanceReport({ startDate: today, endDate: today });

      const presentList = todayRecords.filter(a => a.status === "present" || a.status === "late");
      const lateList = todayRecords.filter(a => a.status === "late");
      const absentList = todayRecords.filter(a => a.status === "absent" || a.status === "excused");

      const rate = totalCount > 0 ? Math.round((presentList.length / totalCount) * 100) : 0;

      if (elTotalStaff) elTotalStaff.textContent = totalCount;
      if (elPresent) elPresent.textContent = presentList.length;
      if (elLate) elLate.textContent = lateList.length;
      if (elLeaves) elLeaves.textContent = absentList.length;
      if (elRate) elRate.textContent = `${rate}%`;
      if (elRateBar) elRateBar.style.width = `${rate}%`;

      this.renderStudentActivityFeed(todayRecords);
      return;
    }

    // ------------------------------------------
    // STAFF & ENTERPRISE DASHBOARD METRICS
    // ------------------------------------------
    const kpiStaffLabel = elTotalStaff?.closest(".glass-panel")?.querySelector("p");
    if (kpiStaffLabel) kpiStaffLabel.textContent = "Total Staff";
    const kpiLeaveLabel = elLeaves?.closest(".glass-panel")?.querySelector("p");
    if (kpiLeaveLabel) kpiLeaveLabel.textContent = "Approved Leave";

    const employees = await DB.getEmployees();
    const activeEmployees = employees.filter(e => e.status !== "inactive");
    const totalStaff = activeEmployees.length;

    const todayAttendance = await DB.getAttendance({ date: today });

    const presentList = todayAttendance.filter(a => a.status === "present" || a.status === "late" || a.status === "half_day");
    const lateList = todayAttendance.filter(a => a.status === "late");
    const leaveList = todayAttendance.filter(a => a.status === "on_leave");

    const rate = totalStaff > 0 ? Math.round((presentList.length / totalStaff) * 100) : 0;

    if (elTotalStaff) elTotalStaff.textContent = totalStaff;
    if (elPresent) elPresent.textContent = presentList.length;
    if (elLate) elLate.textContent = lateList.length;
    if (elLeaves) elLeaves.textContent = leaveList.length;
    if (elRate) elRate.textContent = `${rate}%`;
    if (elRateBar) elRateBar.style.width = `${rate}%`;

    this.renderActivityFeed(todayAttendance);
  },

  renderActivityFeed(todayRecords) {
    const feed = document.getElementById("dashboard-activity-feed");
    if (!feed) return;

    const recentPunches = todayRecords
      .filter(r => r.clock_in)
      .sort((a, b) => new Date(b.clock_in) - new Date(a.clock_in))
      .slice(0, 6);

    if (recentPunches.length === 0) {
      feed.innerHTML = `
        <div class="py-6 text-center text-slate-500 text-xs">
          <i class="fa-regular fa-clock text-2xl mb-1 opacity-40"></i>
          <p>No punches recorded yet today</p>
        </div>
      `;
      return;
    }

    feed.innerHTML = recentPunches.map(r => {
      const emp = r.employee || {};
      const timeStr = new Date(r.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const isLate = r.status === "late";

      return `
        <div class="flex items-center justify-between py-2 border-b border-slate-800/80 text-xs last:border-0">
          <div class="flex items-center gap-2.5">
            <img src="${emp.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}"
                 class="w-7 h-7 rounded-full object-cover border border-slate-700">
            <div>
              <div class="font-semibold text-slate-200">${emp.first_name || 'Staff'} ${emp.last_name || ''}</div>
              <div class="text-[10px] text-slate-400">${emp.department_name || 'Department'}</div>
            </div>
          </div>
          <div class="text-right">
            <span class="font-mono font-medium text-slate-300">${timeStr}</span>
            <span class="block text-[10px] uppercase font-bold ${isLate ? 'text-amber-400' : 'text-emerald-400'}">${r.status}</span>
          </div>
        </div>
      `;
    }).join("");
  },

  renderStudentActivityFeed(todayRecords) {
    const feed = document.getElementById("dashboard-activity-feed");
    if (!feed) return;

    const recent = [...todayRecords].slice(0, 6);

    if (recent.length === 0) {
      feed.innerHTML = `
        <div class="py-6 text-center text-slate-500 text-xs">
          <i class="fa-solid fa-chalkboard-user text-2xl mb-1 opacity-40"></i>
          <p>No student roll-calls recorded today</p>
        </div>
      `;
      return;
    }

    feed.innerHTML = recent.map(r => {
      const std = r.students || {};
      const cls = r.classes || {};
      const isLate = r.status === "late";
      const isAbsent = r.status === "absent";
      const isExcused = r.status === "excused";
      const statusColor = isLate ? 'text-amber-400' : (isAbsent || isExcused) ? 'text-rose-400' : 'text-emerald-400';

      return `
        <div class="flex items-center justify-between py-2 border-b border-slate-800/80 text-xs last:border-0">
          <div class="flex items-center gap-2.5">
            <div class="w-7 h-7 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs border border-indigo-500/30">
              ${(std.first_name || 'S').charAt(0)}
            </div>
            <div>
              <div class="font-semibold text-slate-200">${std.first_name || 'Student'} ${std.last_name || ''}</div>
              <div class="text-[10px] text-slate-400">${cls.name || 'Class'} • Roll ${std.roll_number || 'N/A'}</div>
            </div>
          </div>
          <div class="text-right">
            <span class="block text-[10px] uppercase font-bold ${statusColor}">${r.status}</span>
          </div>
        </div>
      `;
    }).join("");
  },

  // ==========================================
  // 10-DAY ATTENDANCE TREND CHART
  // ==========================================
  async renderAttendanceTrendsChart() {
    const ctx = document.getElementById("attendanceTrendChart");
    if (!ctx) return;

    if (this.trendChartInstance) {
      this.trendChartInstance.destroy();
    }

    const purpose = CONFIG.getPurpose ? CONFIG.getPurpose() : "both";

    // Group records by last 10 work days
    const daysMap = new Map();
    const today = new Date();

    for (let i = 9; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      if (d.getDay() !== 0 && d.getDay() !== 6) { // skip weekends
        const dStr = d.toISOString().split("T")[0];
        const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        daysMap.set(dStr, { label, present: 0, late: 0, absent: 0 });
      }
    }

    if (purpose === "students") {
      const startStr = Array.from(daysMap.keys())[0] || today.toISOString().split("T")[0];
      const endStr = today.toISOString().split("T")[0];
      const records = await DB.getStudentAttendanceReport({ startDate: startStr, endDate: endStr });

      records.forEach(r => {
        if (daysMap.has(r.date)) {
          const item = daysMap.get(r.date);
          if (r.status === "present") item.present++;
          else if (r.status === "late") item.late++;
          else if (r.status === "absent" || r.status === "excused") item.absent++;
        }
      });
    } else {
      const allRecords = await DB.getAttendance();
      allRecords.forEach(r => {
        if (daysMap.has(r.date)) {
          const item = daysMap.get(r.date);
          if (r.status === "present") item.present++;
          else if (r.status === "late") item.late++;
          else if (r.status === "absent") item.absent++;
        }
      });
    }

    const labels = Array.from(daysMap.values()).map(v => v.label);
    const presentData = Array.from(daysMap.values()).map(v => v.present);
    const lateData = Array.from(daysMap.values()).map(v => v.late);
    const absentData = Array.from(daysMap.values()).map(v => v.absent);

    this.trendChartInstance = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Present (On-Time)",
            data: presentData,
            backgroundColor: "#10b981",
            borderRadius: 6,
            barPercentage: 0.7,
            categoryPercentage: 0.7
          },
          {
            label: "Late Arrivals",
            data: lateData,
            backgroundColor: "#f59e0b",
            borderRadius: 6,
            barPercentage: 0.7,
            categoryPercentage: 0.7
          },
          {
            label: "Absent",
            data: absentData,
            backgroundColor: "#f43f5e",
            borderRadius: 6,
            barPercentage: 0.7,
            categoryPercentage: 0.7
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
            labels: { color: "#94a3b8", font: { size: 11, family: "Plus Jakarta Sans, sans-serif" }, usePointStyle: true, boxWidth: 8 }
          },
          tooltip: {
            backgroundColor: "#1e293b",
            titleColor: "#f1f5f9",
            bodyColor: "#cbd5e1",
            borderColor: "#334155",
            borderWidth: 1,
            padding: 10
          }
        },
        scales: {
          x: {
            stacked: true,
            grid: { display: false },
            ticks: { color: "#64748b", font: { size: 11 } }
          },
          y: {
            stacked: true,
            grid: { color: "#1e293b" },
            ticks: { color: "#64748b", stepSize: 1, font: { size: 11 } }
          }
        }
      }
    });
  },

  // ==========================================
  // STATUS DISTRIBUTION (DOUGHNUT)
  // ==========================================
  async renderDistributionChart() {
    const ctx = document.getElementById("attendanceDistributionChart");
    if (!ctx) return;

    if (this.distributionChartInstance) {
      this.distributionChartInstance.destroy();
    }

    const purpose = CONFIG.getPurpose ? CONFIG.getPurpose() : "both";
    const today = new Date().toISOString().split("T")[0];

    if (purpose === "students") {
      const todayRecords = await DB.getStudentAttendanceReport({ startDate: today, endDate: today });
      let present = 0, late = 0, absent = 0, excused = 0;

      todayRecords.forEach(r => {
        if (r.status === "present") present++;
        else if (r.status === "late") late++;
        else if (r.status === "absent") absent++;
        else if (r.status === "excused") excused++;
      });

      const totalPunches = present + late + absent + excused;

      this.distributionChartInstance = new Chart(ctx, {
        type: "doughnut",
        data: {
          labels: ["Present", "Late", "Absent", "Excused"],
          datasets: [{
            data: totalPunches > 0 ? [present, late, absent, excused] : [0, 0, 0, 0],
            backgroundColor: ["#10b981", "#f59e0b", "#ef4444", "#38bdf8"],
            borderColor: "#0f172a",
            borderWidth: 3,
            hoverOffset: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: "74%",
          plugins: {
            legend: {
              position: "bottom",
              labels: { color: "#94a3b8", font: { size: 11 }, usePointStyle: true, boxWidth: 8, padding: 12 }
            },
            tooltip: {
              backgroundColor: "#1e293b",
              titleColor: "#f1f5f9",
              bodyColor: "#cbd5e1"
            }
          }
        }
      });
      return;
    }

    // Staff or Both
    const todayRecords = await DB.getAttendance({ date: today });
    let present = 0, late = 0, halfDay = 0, absent = 0, leave = 0;

    todayRecords.forEach(r => {
      if (r.status === "present") present++;
      else if (r.status === "late") late++;
      else if (r.status === "half_day") halfDay++;
      else if (r.status === "absent") absent++;
      else if (r.status === "on_leave") leave++;
    });

    const totalPunches = present + late + halfDay + absent + leave;

    this.distributionChartInstance = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["On Time", "Late", "Half Day", "Absent", "Leave"],
        datasets: [{
          data: totalPunches > 0 ? [present, late, halfDay, absent, leave] : [0, 0, 0, 0, 0],
          backgroundColor: ["#10b981", "#f59e0b", "#f97316", "#ef4444", "#a855f7"],
          borderColor: "#0f172a",
          borderWidth: 3,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "74%",
        plugins: {
          legend: {
            position: "bottom",
            labels: { color: "#94a3b8", font: { size: 11 }, usePointStyle: true, boxWidth: 8, padding: 12 }
          },
          tooltip: {
            backgroundColor: "#1e293b",
            titleColor: "#f1f5f9",
            bodyColor: "#cbd5e1"
          }
        }
      }
    });
  },

  // ==========================================
  // DEPARTMENT / CLASS PERFORMANCE (HORIZONTAL BARS)
  // ==========================================
  async renderDepartmentChart() {
    const ctx = document.getElementById("departmentAttendanceChart");
    if (!ctx) return;

    if (this.departmentChartInstance) {
      this.departmentChartInstance.destroy();
    }

    const purpose = CONFIG.getPurpose ? CONFIG.getPurpose() : "both";

    if (purpose === "students") {
      const classes = await DB.getClasses();
      const allRecords = await DB.getStudentAttendanceReport();

      const classStats = classes.map(cls => {
        const clsRecords = allRecords.filter(r => r.class_id === cls.id);
        const total = clsRecords.length;
        const present = clsRecords.filter(r => r.status === "present" || r.status === "late").length;
        const rate = total > 0 ? Math.round((present / total) * 100) : 0;
        return { name: cls.name + (cls.section ? ` (${cls.section})` : ""), rate };
      });

      this.departmentChartInstance = new Chart(ctx, {
        type: "bar",
        data: {
          labels: classStats.map(c => c.name),
          datasets: [{
            label: "Classroom Attendance Rate %",
            data: classStats.map(c => c.rate),
            backgroundColor: "#10b981",
            borderRadius: 6,
            barPercentage: 0.6
          }]
        },
        options: {
          indexAxis: "y",
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (item) => ` ${item.raw}% attendance compliance`
              }
            }
          },
          scales: {
            x: {
              min: 0,
              max: 100,
              grid: { color: "#1e293b" },
              ticks: { color: "#64748b", callback: v => `${v}%` }
            },
            y: {
              grid: { display: false },
              ticks: { color: "#94a3b8" }
            }
          }
        }
      });
      return;
    }

    // Staff or Both
    const depts = await DB.getDepartments();
    const employees = await DB.getEmployees();
    const allAttendance = await DB.getAttendance();

    const deptStats = depts.map(dept => {
      const deptEmps = employees.filter(e => e.department_id === dept.id);
      const empIds = new Set(deptEmps.map(e => e.id));
      const deptRecords = allAttendance.filter(a => empIds.has(a.employee_id));

      const total = deptRecords.length;
      const present = deptRecords.filter(a => a.status === "present" || a.status === "late").length;
      const rate = total > 0 ? Math.round((present / total) * 100) : 0;

      return { name: dept.name, rate };
    });

    this.departmentChartInstance = new Chart(ctx, {
      type: "bar",
      data: {
        labels: deptStats.map(d => d.name),
        datasets: [{
          label: "Attendance Rate %",
          data: deptStats.map(d => d.rate),
          backgroundColor: "#6366f1",
          borderRadius: 6,
          barPercentage: 0.6
        }]
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (item) => ` ${item.raw}% attendance compliance`
            }
          }
        },
        scales: {
          x: {
            min: 0,
            max: 100,
            grid: { color: "#1e293b" },
            ticks: { color: "#64748b", callback: v => `${v}%` }
          },
          y: {
            grid: { display: false },
            ticks: { color: "#94a3b8" }
          }
        }
      }
    });
  }
};

window.AnalyticsModule = AnalyticsModule;
