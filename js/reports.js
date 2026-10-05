/**
 * Monthly Timesheet & Export Reports Module
 * Generates matrix timesheet, CSV exports, Excel spreadsheets, and print views
 */

const ReportsModule = {
  currentMonth: new Date().getMonth(), // 0-indexed
  currentYear: new Date().getFullYear(),

  init() {
    this.setupEventListeners();
  },

  async loadReports() {
    this.populateMonthYearSelectors();
    await this.renderMonthlyTimesheet();
  },

  populateMonthYearSelectors() {
    const monthSelect = document.getElementById("report-month-select");
    const yearSelect = document.getElementById("report-year-select");

    if (monthSelect) {
      const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      monthSelect.innerHTML = months.map((m, idx) => `<option value="${idx}" ${idx === this.currentMonth ? "selected" : ""}>${m}</option>`).join("");
    }

    if (yearSelect) {
      const curY = new Date().getFullYear();
      yearSelect.innerHTML = `
        <option value="${curY}" selected>${curY}</option>
        <option value="${curY - 1}">${curY - 1}</option>
      `;
    }
  },

  async renderMonthlyTimesheet() {
    const tableHead = document.getElementById("matrix-timesheet-head");
    const tableBody = document.getElementById("matrix-timesheet-body");
    if (!tableHead || !tableBody) return;

    tableBody.innerHTML = `<tr><td colspan="35" class="py-10 text-center text-slate-400"><i class="fa-solid fa-spinner fa-spin text-2xl text-indigo-500 mb-2"></i><p>Building monthly timesheet...</p></td></tr>`;

    const employees = await DB.getEmployees();
    const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();

    // Query records for this month
    const startStr = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, "0")}-01`;
    const endStr = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;
    const monthRecords = await DB.getAttendance({ startDate: startStr, endDate: endStr });

    // Map: employeeId -> (dateStr -> record)
    const empRecordMap = new Map();
    monthRecords.forEach(r => {
      if (!empRecordMap.has(r.employee_id)) {
        empRecordMap.set(r.employee_id, new Map());
      }
      empRecordMap.get(r.employee_id).set(r.date, r);
    });

    // 1. Build Table Header
    let headHtml = `
      <tr class="bg-slate-900 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
        <th class="py-3 px-3 text-left sticky left-0 bg-slate-900 z-10 min-w-[180px]">Employee</th>
    `;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(this.currentYear, this.currentMonth, day);
      const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
      headHtml += `
        <th class="py-2 px-1 text-center min-w-[28px] ${isWeekend ? 'bg-slate-800/60 text-slate-500' : 'text-slate-300'}">
          <div>${day}</div>
          <div class="text-[9px] font-normal opacity-70">${['S','M','T','W','T','F','S'][dateObj.getDay()]}</div>
        </th>
      `;
    }

    headHtml += `
        <th class="py-3 px-2 text-center text-emerald-400 bg-emerald-500/10 min-w-[40px]" title="Present">P</th>
        <th class="py-3 px-2 text-center text-amber-400 bg-amber-500/10 min-w-[40px]" title="Late">L</th>
        <th class="py-3 px-2 text-center text-rose-400 bg-rose-500/10 min-w-[40px]" title="Absent">A</th>
        <th class="py-3 px-2 text-center text-purple-400 bg-purple-500/10 min-w-[40px]" title="Leave">LV</th>
        <th class="py-3 px-2 text-center text-indigo-400 min-w-[50px]">Hours</th>
      </tr>
    `;
    tableHead.innerHTML = headHtml;

    // 2. Build Table Rows
    let bodyHtml = "";

    employees.forEach(emp => {
      let pCount = 0, lCount = 0, aCount = 0, lvCount = 0, hoursTotal = 0;
      const empLogs = empRecordMap.get(emp.id) || new Map();

      let rowCells = `
        <tr class="border-b border-slate-800/80 hover:bg-slate-800/30 transition-colors text-xs">
          <td class="py-2.5 px-3 sticky left-0 bg-slate-900 z-10 border-r border-slate-800">
            <div class="flex items-center gap-2">
              <img src="${emp.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}" class="w-6 h-6 rounded-full object-cover">
              <div class="truncate">
                <div class="font-semibold text-slate-200 truncate">${emp.first_name} ${emp.last_name[0]}.</div>
                <div class="text-[10px] text-slate-400 font-mono">${emp.employee_code}</div>
              </div>
            </div>
          </td>
      `;

      for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(this.currentYear, this.currentMonth, day);
        const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
        const dateStr = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

        if (isWeekend) {
          rowCells += `<td class="py-2 px-1 text-center bg-slate-800/40 text-slate-600 font-mono text-[10px]">W</td>`;
          continue;
        }

        const log = empLogs.get(dateStr);
        if (log) {
          hoursTotal += parseFloat(log.total_hours) || 0;
          if (log.status === "present") {
            pCount++;
            rowCells += `<td class="py-2 px-1 text-center bg-emerald-500/10 text-emerald-400 font-bold text-[11px]" title="${dateStr}: Present">P</td>`;
          } else if (log.status === "late") {
            lCount++;
            rowCells += `<td class="py-2 px-1 text-center bg-amber-500/15 text-amber-400 font-bold text-[11px]" title="${dateStr}: Late">L</td>`;
          } else if (log.status === "half_day") {
            pCount++;
            rowCells += `<td class="py-2 px-1 text-center bg-orange-500/15 text-orange-400 font-bold text-[11px]" title="${dateStr}: Half Day">HD</td>`;
          } else if (log.status === "on_leave") {
            lvCount++;
            rowCells += `<td class="py-2 px-1 text-center bg-purple-500/15 text-purple-400 font-bold text-[11px]" title="${dateStr}: Leave">LV</td>`;
          } else {
            aCount++;
            rowCells += `<td class="py-2 px-1 text-center bg-rose-500/15 text-rose-400 font-bold text-[11px]" title="${dateStr}: Absent">A</td>`;
          }
        } else {
          // Future dates or unrecorded past day
          const isPast = dateObj < new Date();
          if (isPast) {
            rowCells += `<td class="py-2 px-1 text-center text-slate-600 font-mono text-[10px]">—</td>`;
          } else {
            rowCells += `<td class="py-2 px-1 text-center text-slate-700 font-mono text-[10px]">·</td>`;
          }
        }
      }

      rowCells += `
        <td class="py-2 px-2 text-center font-bold text-emerald-400 bg-emerald-500/5 font-mono">${pCount}</td>
        <td class="py-2 px-2 text-center font-bold text-amber-400 bg-amber-500/5 font-mono">${lCount}</td>
        <td class="py-2 px-2 text-center font-bold text-rose-400 bg-rose-500/5 font-mono">${aCount}</td>
        <td class="py-2 px-2 text-center font-bold text-purple-400 bg-purple-500/5 font-mono">${lvCount}</td>
        <td class="py-2 px-2 text-center font-bold text-indigo-400 font-mono">${hoursTotal.toFixed(0)}h</td>
      </tr>
      `;

      bodyHtml += rowCells;
    });

    tableBody.innerHTML = bodyHtml;
  },

  // ==========================================
  // EXPORT TO CSV
  // ==========================================
  async exportToCSV() {
    const records = await DB.getAttendance();
    if (records.length === 0) {
      Swal.fire({ icon: "info", title: "No Data", text: "There are no attendance records to export." });
      return;
    }

    const headers = ["Employee Code", "Employee Name", "Department", "Date", "Clock In", "Clock Out", "Total Hours", "Status", "Notes"];
    const rows = records.map(r => {
      const emp = r.employee || {};
      const clockIn = r.clock_in ? new Date(r.clock_in).toLocaleTimeString() : "";
      const clockOut = r.clock_out ? new Date(r.clock_out).toLocaleTimeString() : "";
      return [
        `"${emp.employee_code || ''}"`,
        `"${emp.first_name || ''} ${emp.last_name || ''}"`,
        `"${emp.department_name || ''}"`,
        `"${r.date}"`,
        `"${clockIn}"`,
        `"${clockOut}"`,
        `"${r.total_hours || 0}"`,
        `"${r.status}"`,
        `"${(r.notes || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `attendance_report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    CONFIG.playSound("success");
    Swal.fire({ icon: "success", title: "Export Complete", text: "CSV file downloaded successfully.", timer: 1500, showConfirmButton: false });
  },

  // ==========================================
  // EXPORT TO EXCEL (.XLSX via SheetJS)
  // ==========================================
  async exportToExcel() {
    if (!window.XLSX) {
      // Fallback to CSV if XLSX library is not accessible
      return this.exportToCSV();
    }

    const records = await DB.getAttendance();
    const data = records.map(r => ({
      "Employee ID": r.employee?.employee_code || "N/A",
      "Full Name": `${r.employee?.first_name || ""} ${r.employee?.last_name || ""}`.trim(),
      "Department": r.employee?.department_name || "General",
      "Date": r.date,
      "Clock In": r.clock_in ? new Date(r.clock_in).toLocaleTimeString() : "",
      "Clock Out": r.clock_out ? new Date(r.clock_out).toLocaleTimeString() : "",
      "Total Hours": r.total_hours || 0,
      "Status": (r.status || "").toUpperCase(),
      "Notes": r.notes || ""
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance Report");
    XLSX.writeFile(workbook, `Attendance_Master_Report_${new Date().toISOString().split("T")[0]}.xlsx`);

    CONFIG.playSound("success");
    Swal.fire({ icon: "success", title: "Export Complete", text: "Excel workbook (.xlsx) downloaded successfully.", timer: 1500, showConfirmButton: false });
  },

  setupEventListeners() {
    const monthSelect = document.getElementById("report-month-select");
    const yearSelect = document.getElementById("report-year-select");

    if (monthSelect) {
      monthSelect.addEventListener("change", e => {
        this.currentMonth = parseInt(e.target.value, 10);
        this.renderMonthlyTimesheet();
      });
    }

    if (yearSelect) {
      yearSelect.addEventListener("change", e => {
        this.currentYear = parseInt(e.target.value, 10);
        this.renderMonthlyTimesheet();
      });
    }

    const btnCsv = document.getElementById("btn-export-csv");
    if (btnCsv) {
      btnCsv.addEventListener("click", () => this.exportToCSV());
    }

    const btnXlsx = document.getElementById("btn-export-xlsx");
    if (btnXlsx) {
      btnXlsx.addEventListener("click", () => this.exportToExcel());
    }

    const btnPrint = document.getElementById("btn-print-timesheet");
    if (btnPrint) {
      btnPrint.addEventListener("click", () => window.print());
    }
  }
};

window.ReportsModule = ReportsModule;
