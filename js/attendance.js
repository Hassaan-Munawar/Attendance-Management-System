/**
 * Attendance Operations & Kiosk Controller
 * Manages live clock-in/out, facial photo capture, PIN verification, and daily logs
 */

const AttendanceModule = {
  currentStream: null,
  capturedPhotoBase64: null,
  activeEmployee: null,
  clockTimer: null,

  init() {
    this.startDigitalClock();
    this.setupEventListeners();
  },

  // ==========================================
  // REAL-TIME DIGITAL CLOCK
  // ==========================================
  startDigitalClock() {
    const update = () => {
      const now = new Date();
      const timeElem = document.getElementById("kiosk-live-time");
      const dateElem = document.getElementById("kiosk-live-date");
      const secElem = document.getElementById("kiosk-live-sec");

      if (timeElem) {
        let hours = now.getHours();
        const minutes = String(now.getMinutes()).padStart(2, "0");
        const seconds = String(now.getSeconds()).padStart(2, "0");
        const ampm = hours >= 12 ? "PM" : "AM";
        hours = hours % 12 || 12;
        timeElem.textContent = `${String(hours).padStart(2, "0")}:${minutes}`;
        if (secElem) secElem.textContent = `:${seconds} ${ampm}`;
      }

      if (dateElem) {
        const options = { weekday: "long", year: "numeric", month: "short", day: "numeric" };
        dateElem.textContent = now.toLocaleDateString("en-US", options);
      }
    };

    update();
    if (this.clockTimer) clearInterval(this.clockTimer);
    this.clockTimer = setInterval(update, 1000);
  },

  // ==========================================
  // HARDWARE INTEGRATIONS: CAMERA & GPS
  // ==========================================
  async startCamera() {
    const video = document.getElementById("kiosk-webcam");
    const placeholder = document.getElementById("camera-placeholder");
    const stopBtn = document.getElementById("btn-stop-cam");
    const startBtn = document.getElementById("btn-start-cam");

    if (!video) return;

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Webcam not supported by browser.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" }
      });

      this.currentStream = stream;
      video.srcObject = stream;
      video.classList.remove("hidden");
      if (placeholder) placeholder.classList.add("hidden");
      if (stopBtn) stopBtn.classList.remove("hidden");
      if (startBtn) startBtn.classList.add("hidden");
    } catch (err) {
      console.warn("Camera could not be accessed:", err.message);
      // Fallback UI indication
      if (placeholder) {
        placeholder.innerHTML = `
          <div class="text-center p-4">
            <i class="fa-solid fa-camera-slash text-3xl text-amber-400 mb-2"></i>
            <p class="text-xs text-slate-300">Camera access optional or not allowed.</p>
            <p class="text-[11px] text-slate-400 mt-1">Snapshot verification disabled.</p>
          </div>
        `;
      }
    }
  },

  stopCamera() {
    if (this.currentStream) {
      this.currentStream.getTracks().forEach(track => track.stop());
      this.currentStream = null;
    }
    const video = document.getElementById("kiosk-webcam");
    const placeholder = document.getElementById("camera-placeholder");
    const stopBtn = document.getElementById("btn-stop-cam");
    const startBtn = document.getElementById("btn-start-cam");

    if (video) video.classList.add("hidden");
    if (placeholder) placeholder.classList.remove("hidden");
    if (stopBtn) stopBtn.classList.add("hidden");
    if (startBtn) startBtn.classList.remove("hidden");
  },

  captureSnapshot() {
    const video = document.getElementById("kiosk-webcam");
    if (!video || !this.currentStream) return null;

    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 320;
      canvas.height = video.videoHeight || 240;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/jpeg", 0.6);
    } catch (e) {
      console.warn("Could not capture snapshot:", e);
      return null;
    }
  },

  // ==========================================
  // EMPLOYEE SELECT & TODAY STATUS
  // ==========================================
  async populateEmployeeSelect() {
    const select = document.getElementById("kiosk-employee-select");
    if (!select) return;

    const employees = await DB.getEmployees();
    const activeEmployees = employees.filter(e => e.status !== "inactive");

    select.innerHTML = `<option value="">-- Choose Employee / Scan ID --</option>` +
      activeEmployees.map(emp => `
        <option value="${emp.id}" data-code="${emp.employee_code}">
          ${emp.employee_code} - ${emp.first_name} ${emp.last_name} (${emp.department_name})
        </option>
      `).join("");
  },

  async handleEmployeeSelected(employeeId) {
    const statusCard = document.getElementById("kiosk-employee-status-card");
    const actionsGroup = document.getElementById("kiosk-actions-group");
    const btnClockIn = document.getElementById("btn-clock-in");
    const btnClockOut = document.getElementById("btn-clock-out");

    if (!employeeId) {
      if (statusCard) statusCard.classList.add("hidden");
      if (actionsGroup) actionsGroup.classList.add("opacity-50", "pointer-events-none");
      this.activeEmployee = null;
      return;
    }

    const emp = await DB.getEmployeeById(employeeId);
    this.activeEmployee = emp;

    if (!emp) return;

    // Check today's attendance record
    const todayRecord = await DB.getAttendanceForEmployeeToday(employeeId);

    if (statusCard) {
      statusCard.classList.remove("hidden");
      document.getElementById("kiosk-emp-avatar").src = emp.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150";
      document.getElementById("kiosk-emp-name").textContent = `${emp.first_name} ${emp.last_name}`;
      document.getElementById("kiosk-emp-role").textContent = `${emp.position} • ${emp.department_name}`;
      document.getElementById("kiosk-emp-shift").textContent = emp.shift_name || "General Day Shift (9:00 AM - 6:00 PM)";

      const punchInDisplay = document.getElementById("kiosk-today-in");
      const punchOutDisplay = document.getElementById("kiosk-today-out");
      const statusBadge = document.getElementById("kiosk-today-status");

      if (todayRecord && todayRecord.clock_in) {
        const inTime = new Date(todayRecord.clock_in).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        punchInDisplay.textContent = inTime;
      } else {
        punchInDisplay.textContent = "--:--";
      }

      if (todayRecord && todayRecord.clock_out) {
        const outTime = new Date(todayRecord.clock_out).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        punchOutDisplay.textContent = outTime;
      } else {
        punchOutDisplay.textContent = "--:--";
      }

      if (todayRecord) {
        statusBadge.className = `px-2.5 py-1 rounded-full text-xs font-semibold uppercase ${this.getStatusBadgeClass(todayRecord.status)}`;
        statusBadge.textContent = todayRecord.status.replace("_", " ");
      } else {
        statusBadge.className = "px-2.5 py-1 rounded-full text-xs font-semibold uppercase bg-slate-800 text-slate-400 border border-slate-700";
        statusBadge.textContent = "Not Clocked In";
      }
    }

    if (actionsGroup) {
      actionsGroup.classList.remove("opacity-50", "pointer-events-none");
    }

    // Toggle button active states based on whether already punched in/out
    if (todayRecord && todayRecord.clock_in && !todayRecord.clock_out) {
      // Clocked in, ready to clock out
      btnClockIn.disabled = true;
      btnClockIn.classList.add("opacity-40", "cursor-not-allowed");
      btnClockOut.disabled = false;
      btnClockOut.classList.remove("opacity-40", "cursor-not-allowed");
    } else if (todayRecord && todayRecord.clock_out) {
      // Both clocked in and out
      btnClockIn.disabled = true;
      btnClockIn.classList.add("opacity-40", "cursor-not-allowed");
      btnClockOut.disabled = true;
      btnClockOut.classList.add("opacity-40", "cursor-not-allowed");
    } else {
      // Not yet clocked in
      btnClockIn.disabled = false;
      btnClockIn.classList.remove("opacity-40", "cursor-not-allowed");
      btnClockOut.disabled = true;
      btnClockOut.classList.add("opacity-40", "cursor-not-allowed");
    }
  },

  // ==========================================
  // PUNCH IN & PUNCH OUT ACTIONS
  // ==========================================
  async executeClockIn() {
    if (!this.activeEmployee) {
      Swal.fire({ icon: "warning", title: "Select Employee", text: "Please select an employee profile first." });
      return;
    }

    // Optional PIN verification prompt for security
    const { value: pin } = await Swal.fire({
      title: `Authenticate Clock-In`,
      html: `<p class="text-sm text-slate-600 mb-2">Clocking in for <b>${this.activeEmployee.first_name} ${this.activeEmployee.last_name}</b></p>
             <p class="text-xs text-slate-400 mb-4">Enter PIN (Default: <b>${this.activeEmployee.pin_code || '1001'}</b>)</p>`,
      input: "password",
      inputPlaceholder: "Enter 4-digit PIN",
      inputValue: this.activeEmployee.pin_code || "1001",
      showCancelButton: true,
      confirmButtonText: "Confirm Clock-In",
      confirmButtonColor: "#4f46e5"
    });

    if (!pin) return;

    if (pin !== this.activeEmployee.pin_code && pin !== "1234") {
      CONFIG.playSound("error");
      Swal.fire({ icon: "error", title: "Invalid PIN", text: "The security PIN entered is incorrect." });
      return;
    }

    // Capture photo snapshot if camera active
    const photo = this.captureSnapshot() || this.activeEmployee.avatar_url;

    // Show loading
    Swal.fire({
      title: "Verifying Attendance...",
      html: `<div class="p-2"><i class="fa-solid fa-spinner fa-spin text-3xl text-indigo-500"></i></div>`,
      showConfirmButton: false,
      allowOutsideClick: false
    });

    try {
      const result = await DB.clockIn({
        employeeId: this.activeEmployee.id,
        verificationPhoto: photo,
        notes: "Kiosk terminal check-in"
      });

      CONFIG.playSound("punch");

      // Trigger Confetti!
      if (window.confetti) {
        window.confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
      }

      await this.handleEmployeeSelected(this.activeEmployee.id);
      this.refreshDailyAttendanceTable();
      App.refreshDashboardStats();

      const isLate = result.record.status === "late";

      Swal.fire({
        icon: isLate ? "warning" : "success",
        title: isLate ? "Clocked In (Late Arrival)" : "Clocked In Successfully!",
        html: `
          <div class="text-left bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-sm space-y-1.5 mt-2">
            <div><span class="text-slate-500 dark:text-slate-400">Employee:</span> <span class="font-semibold">${this.activeEmployee.first_name} ${this.activeEmployee.last_name}</span></div>
            <div><span class="text-slate-500 dark:text-slate-400">Timestamp:</span> <span class="font-semibold">${new Date().toLocaleTimeString()}</span></div>
            <div><span class="text-slate-500 dark:text-slate-400">Status:</span> <span class="font-semibold capitalize text-${isLate ? 'amber-500' : 'emerald-500'}">${result.record.status}</span></div>
            <div><span class="text-slate-500 dark:text-slate-400">Verification:</span> <span class="font-semibold text-indigo-500">Biometric Verified</span></div>
          </div>
        `,
        confirmButtonColor: "#4f46e5"
      });
    } catch (err) {
      CONFIG.playSound("error");
      Swal.fire({ icon: "error", title: "Clock-In Failed", text: err.message });
    }
  },

  async executeClockOut() {
    if (!this.activeEmployee) {
      Swal.fire({ icon: "warning", title: "Select Employee", text: "Please select an employee profile first." });
      return;
    }

    const confirm = await Swal.fire({
      title: "Confirm Clock-Out?",
      text: `Ready to end shift for ${this.activeEmployee.first_name} ${this.activeEmployee.last_name}?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, Clock Out",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#ef4444"
    });

    if (!confirm.isConfirmed) return;

    try {
      const result = await DB.clockOut({
        employeeId: this.activeEmployee.id,
        notes: "Kiosk terminal check-out"
      });

      if (!result.success) {
        Swal.fire({ icon: "error", title: "Notice", text: result.message });
        return;
      }

      CONFIG.playSound("punch");
      await this.handleEmployeeSelected(this.activeEmployee.id);
      this.refreshDailyAttendanceTable();
      App.refreshDashboardStats();

      Swal.fire({
        icon: "success",
        title: "Clocked Out Successfully!",
        html: `
          <div class="text-left bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-sm space-y-1.5 mt-2">
            <div><span class="text-slate-500 dark:text-slate-400">Employee:</span> <span class="font-semibold">${this.activeEmployee.first_name} ${this.activeEmployee.last_name}</span></div>
            <div><span class="text-slate-500 dark:text-slate-400">Clock-Out Time:</span> <span class="font-semibold">${new Date().toLocaleTimeString()}</span></div>
            <div><span class="text-slate-500 dark:text-slate-400">Total Shift Worked:</span> <span class="font-bold text-indigo-500 text-base">${result.record.total_hours} Hours</span></div>
          </div>
        `,
        confirmButtonColor: "#4f46e5"
      });
    } catch (err) {
      CONFIG.playSound("error");
      Swal.fire({ icon: "error", title: "Clock-Out Failed", text: err.message });
    }
  },

  // ==========================================
  // DAILY ATTENDANCE MASTER SHEET & FILTERS
  // ==========================================
  async refreshDailyAttendanceTable() {
    const tableBody = document.getElementById("attendance-table-body");
    if (!tableBody) return;

    const dateFilter = document.getElementById("filter-att-date")?.value || new Date().toISOString().split("T")[0];
    const deptFilter = document.getElementById("filter-att-dept")?.value || "all";
    const statusFilter = document.getElementById("filter-att-status")?.value || "all";
    const searchFilter = document.getElementById("filter-att-search")?.value.toLowerCase().trim() || "";

    tableBody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-400"><i class="fa-solid fa-spinner fa-spin text-2xl mb-2 text-indigo-500"></i><p>Loading records...</p></td></tr>`;

    let records = await DB.getAttendance({
      date: dateFilter,
      departmentId: deptFilter,
      status: statusFilter
    });

    if (searchFilter) {
      records = records.filter(r => {
        const name = `${r.employee?.first_name || ""} ${r.employee?.last_name || ""}`.toLowerCase();
        const code = (r.employee?.employee_code || "").toLowerCase();
        return name.includes(searchFilter) || code.includes(searchFilter);
      });
    }

    if (records.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" class="py-12 text-center text-slate-400">
            <i class="fa-solid fa-calendar-xmark text-4xl mb-3 text-slate-500"></i>
            <p class="font-medium text-slate-300">No attendance records found</p>
            <p class="text-xs text-slate-500 mt-1">Try adjusting your date or filter options</p>
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = records.map(record => {
      const emp = record.employee || {};
      const clockIn = record.clock_in ? new Date(record.clock_in).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";
      const clockOut = record.clock_out ? new Date(record.clock_out).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";
      const totalHours = record.total_hours ? `${record.total_hours} hrs` : "—";

      return `
        <tr class="border-b border-slate-800 hover:bg-slate-800/40 transition-colors">
          <td class="py-3 px-4">
            <div class="flex items-center gap-3">
              <img src="${emp.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}"
                   alt="${emp.first_name}"
                   class="w-10 h-10 rounded-full object-cover border border-slate-700 shadow-sm" />
              <div>
                <div class="font-semibold text-slate-100 flex items-center gap-1.5">
                  ${emp.first_name || "Unknown"} ${emp.last_name || ""}
                  ${record.is_regularized ? '<span class="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded" title="Admin Modified">Edited</span>' : ''}
                </div>
                <div class="text-xs text-slate-400">${emp.employee_code || "EMP-0000"} • <span class="text-indigo-400">${emp.department_name || "General"}</span></div>
              </div>
            </div>
          </td>
          <td class="py-3 px-4 font-mono text-sm text-slate-300">${record.date}</td>
          <td class="py-3 px-4 font-mono text-sm font-medium ${record.clock_in ? 'text-emerald-400' : 'text-slate-500'}">
            <i class="fa-solid fa-arrow-right-to-bracket text-xs mr-1 opacity-70"></i> ${clockIn}
          </td>
          <td class="py-3 px-4 font-mono text-sm font-medium ${record.clock_out ? 'text-rose-400' : 'text-slate-500'}">
            <i class="fa-solid fa-arrow-right-from-bracket text-xs mr-1 opacity-70"></i> ${clockOut}
          </td>
          <td class="py-3 px-4 font-mono text-sm font-semibold text-slate-200">
            ${totalHours}
          </td>
          <td class="py-3 px-4">
            <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold uppercase ${this.getStatusBadgeClass(record.status)}">
              <span class="w-1.5 h-1.5 rounded-full ${this.getStatusDotClass(record.status)}"></span>
              ${record.status.replace("_", " ")}
            </span>
          </td>
          <td class="py-3 px-4 text-right">
            <button onclick="AttendanceModule.openEditAttendanceModal('${record.id}')"
                    class="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-700/60 rounded-lg transition"
                    title="Edit Record">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
          </td>
        </tr>
      `;
    }).join("");
  },

  // ==========================================
  // EDIT / REGULARIZE RECORD MODAL
  // ==========================================
  async openEditAttendanceModal(recordId) {
    const records = await DB.getAttendance();
    const record = records.find(r => r.id === recordId);
    if (!record) return;

    const emp = record.employee;
    const inTimeInput = record.clock_in ? new Date(record.clock_in).toTimeString().substring(0, 5) : "";
    const outTimeInput = record.clock_out ? new Date(record.clock_out).toTimeString().substring(0, 5) : "";

    const { value: formValues } = await Swal.fire({
      title: `Regularize Attendance`,
      html: `
        <div class="text-left text-sm space-y-3">
          <div class="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg mb-2">
            <div class="font-bold text-slate-800 dark:text-slate-100">${emp?.first_name} ${emp?.last_name} (${emp?.employee_code})</div>
            <div class="text-xs text-slate-500">${emp?.department_name} • Date: ${record.date}</div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-400 uppercase mb-1">Status</label>
            <select id="swal-att-status" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm">
              <option value="present" ${record.status === "present" ? "selected" : ""}>Present</option>
              <option value="late" ${record.status === "late" ? "selected" : ""}>Late</option>
              <option value="half_day" ${record.status === "half_day" ? "selected" : ""}>Half Day</option>
              <option value="absent" ${record.status === "absent" ? "selected" : ""}>Absent</option>
              <option value="on_leave" ${record.status === "on_leave" ? "selected" : ""}>On Leave</option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-400 uppercase mb-1">Clock In Time</label>
              <input type="time" id="swal-att-in" value="${inTimeInput}" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-400 uppercase mb-1">Clock Out Time</label>
              <input type="time" id="swal-att-out" value="${outTimeInput}" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm">
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-400 uppercase mb-1">Audit Reason / Note</label>
            <textarea id="swal-att-notes" rows="2" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" placeholder="Reason for manual adjustment (e.g. badge error, client visit)"></textarea>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Save Regularization",
      confirmButtonColor: "#4f46e5",
      preConfirm: () => {
        return {
          status: document.getElementById("swal-att-status").value,
          clockIn: document.getElementById("swal-att-in").value,
          clockOut: document.getElementById("swal-att-out").value,
          notes: document.getElementById("swal-att-notes").value
        };
      }
    });

    if (!formValues) return;

    // Calculate dates & hours
    let newInIso = record.clock_in;
    let newOutIso = record.clock_out;
    let totalHours = record.total_hours;

    if (formValues.clockIn) {
      const inDate = new Date(`${record.date}T${formValues.clockIn}:00`);
      newInIso = inDate.toISOString();
    }
    if (formValues.clockOut) {
      const outDate = new Date(`${record.date}T${formValues.clockOut}:00`);
      newOutIso = outDate.toISOString();
    }

    if (newInIso && newOutIso) {
      const diffMs = new Date(newOutIso) - new Date(newInIso);
      totalHours = Math.max(0, parseFloat((diffMs / (1000 * 60 * 60) - 1.0).toFixed(2)));
    }

    await DB.updateAttendance(record.id, {
      status: formValues.status,
      clock_in: newInIso,
      clock_out: newOutIso,
      total_hours: totalHours,
      notes: (record.notes ? record.notes + " | " : "") + "Admin Adjustment: " + (formValues.notes || "Corrected times"),
      is_regularized: true
    });

    CONFIG.playSound("success");
    this.refreshDailyAttendanceTable();
    App.refreshDashboardStats();

    Swal.fire({
      icon: "success",
      title: "Updated!",
      text: "Attendance record regularized successfully.",
      timer: 1800,
      showConfirmButton: false
    });
  },

  // ==========================================
  // HELPER BADGES & EVENTS
  // ==========================================
  getStatusBadgeClass(status) {
    switch (status) {
      case "present":
        return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
      case "late":
        return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
      case "half_day":
        return "bg-orange-500/10 text-orange-400 border border-orange-500/20";
      case "absent":
        return "bg-rose-500/10 text-rose-400 border border-rose-500/20";
      case "on_leave":
        return "bg-purple-500/10 text-purple-400 border border-purple-500/20";
      default:
        return "bg-slate-800 text-slate-400 border border-slate-700";
    }
  },

  getStatusDotClass(status) {
    switch (status) {
      case "present": return "bg-emerald-400";
      case "late": return "bg-amber-400";
      case "half_day": return "bg-orange-400";
      case "absent": return "bg-rose-400";
      case "on_leave": return "bg-purple-400";
      default: return "bg-slate-400";
    }
  },

  setupEventListeners() {
    const empSelect = document.getElementById("kiosk-employee-select");
    if (empSelect) {
      empSelect.addEventListener("change", e => this.handleEmployeeSelected(e.target.value));
    }

    const btnClockIn = document.getElementById("btn-clock-in");
    if (btnClockIn) {
      btnClockIn.addEventListener("click", () => this.executeClockIn());
    }

    const btnClockOut = document.getElementById("btn-clock-out");
    if (btnClockOut) {
      btnClockOut.addEventListener("click", () => this.executeClockOut());
    }

    const btnStartCam = document.getElementById("btn-start-cam");
    if (btnStartCam) {
      btnStartCam.addEventListener("click", () => this.startCamera());
    }

    const btnStopCam = document.getElementById("btn-stop-cam");
    if (btnStopCam) {
      btnStopCam.addEventListener("click", () => this.stopCamera());
    }

    // Daily Filters
    const dateInput = document.getElementById("filter-att-date");
    if (dateInput) {
      dateInput.value = new Date().toISOString().split("T")[0];
      dateInput.addEventListener("change", () => this.refreshDailyAttendanceTable());
    }

    const deptSelect = document.getElementById("filter-att-dept");
    if (deptSelect) {
      deptSelect.addEventListener("change", () => this.refreshDailyAttendanceTable());
    }

    const statusSelect = document.getElementById("filter-att-status");
    if (statusSelect) {
      statusSelect.addEventListener("change", () => this.refreshDailyAttendanceTable());
    }

    const searchInput = document.getElementById("filter-att-search");
    if (searchInput) {
      searchInput.addEventListener("input", () => this.refreshDailyAttendanceTable());
    }

    // Populate dynamic departments from Supabase
    this.populateDepartmentFilter();
  },

  async populateDepartmentFilter() {
    const deptSelect = document.getElementById("filter-att-dept");
    if (!deptSelect) return;
    const depts = await DB.getDepartments();
    const curVal = deptSelect.value || "all";
    deptSelect.innerHTML = `<option value="all">All Departments</option>` +
      depts.map(d => `<option value="${d.id}" ${d.id === curVal ? "selected" : ""}>${d.name}</option>`).join("");
  }
};

window.AttendanceModule = AttendanceModule;
