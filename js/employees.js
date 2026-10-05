/**
 * Employee Management Module
 * Handles Employee Directory, Profiles, Creation, Updates, and Deletion
 */

const EmployeeModule = {
  allEmployees: [],
  currentFilterDept: "all",
  currentFilterStatus: "all",
  searchQuery: "",

  init() {
    this.setupEventListeners();
  },

  async loadEmployees() {
    this.allEmployees = await DB.getEmployees();
    this.renderEmployeeList();
    this.populateDepartmentFilters();
  },

  async populateDepartmentFilters() {
    const depts = await DB.getDepartments();
    const filterSelect = document.getElementById("filter-emp-dept");
    const modalDeptSelect = document.getElementById("emp-form-dept");

    if (filterSelect) {
      filterSelect.innerHTML = `<option value="all">All Departments</option>` +
        depts.map(d => `<option value="${d.id}">${d.name}</option>`).join("");
    }

    if (modalDeptSelect) {
      modalDeptSelect.innerHTML = depts.map(d => `<option value="${d.id}">${d.name}</option>`).join("");
    }

    // Also populate shifts in modal
    const shifts = await DB.getShifts();
    const modalShiftSelect = document.getElementById("emp-form-shift");
    if (modalShiftSelect) {
      modalShiftSelect.innerHTML = shifts.map(s => `<option value="${s.id}">${s.name} (${s.start_time.substring(0, 5)} - ${s.end_time.substring(0, 5)})</option>`).join("");
    }
  },

  renderEmployeeList() {
    const container = document.getElementById("employee-grid");
    const countBadge = document.getElementById("employee-total-count");
    if (!container) return;

    let filtered = [...this.allEmployees];

    if (this.currentFilterDept !== "all") {
      filtered = filtered.filter(e => e.department_id === this.currentFilterDept);
    }

    if (this.currentFilterStatus !== "all") {
      filtered = filtered.filter(e => e.status === this.currentFilterStatus);
    }

    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(e =>
        `${e.first_name} ${e.last_name}`.toLowerCase().includes(q) ||
        (e.employee_code || "").toLowerCase().includes(q) ||
        (e.email || "").toLowerCase().includes(q) ||
        (e.position || "").toLowerCase().includes(q)
      );
    }

    if (countBadge) {
      countBadge.textContent = `${filtered.length} Employees`;
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="col-span-full py-16 text-center text-slate-400">
          <i class="fa-solid fa-users-slash text-4xl mb-3 text-slate-500"></i>
          <p class="font-medium text-slate-300">No employees match your search criteria</p>
          <p class="text-xs text-slate-500 mt-1">Try clearing filters or search term</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(emp => {
      const statusBadge = this.getStatusBadge(emp.status);
      return `
        <div class="bg-slate-900/90 border border-slate-800 hover:border-indigo-500/40 rounded-2xl p-5 transition-all duration-200 hover:shadow-xl hover:shadow-indigo-500/5 group flex flex-col justify-between">
          <div>
            <div class="flex items-start justify-between mb-4">
              <div class="relative">
                <img src="${emp.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}"
                     alt="${emp.first_name}"
                     class="w-14 h-14 rounded-2xl object-cover border-2 border-slate-700 shadow-md group-hover:border-indigo-500 transition-colors" />
                <span class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-900 ${emp.status === 'active' ? 'bg-emerald-500' : emp.status === 'on_leave' ? 'bg-purple-500' : 'bg-slate-500'}"></span>
              </div>
              <div class="flex items-center gap-1.5">
                <button onclick="EmployeeModule.openProfileModal('${emp.id}')"
                        class="p-2 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition"
                        title="View Profile">
                  <i class="fa-regular fa-eye"></i>
                </button>
                <button onclick="EmployeeModule.openEditEmployeeModal('${emp.id}')"
                        class="p-2 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition"
                        title="Edit Employee">
                  <i class="fa-regular fa-pen-to-square"></i>
                </button>
                <button onclick="EmployeeModule.confirmDeleteEmployee('${emp.id}', '${emp.first_name} ${emp.last_name}')"
                        class="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                        title="Delete Employee">
                  <i class="fa-regular fa-trash-can"></i>
                </button>
              </div>
            </div>

            <div class="mb-3">
              <div class="flex items-center gap-2">
                <h3 class="font-bold text-slate-100 text-base leading-tight">${emp.first_name} ${emp.last_name}</h3>
                ${statusBadge}
              </div>
              <p class="text-xs font-medium text-indigo-400 mt-0.5">${emp.position}</p>
              <p class="text-[11px] text-slate-400">${emp.department_name}</p>
            </div>

            <div class="space-y-1.5 py-3 border-t border-slate-800/80 text-xs text-slate-300">
              <div class="flex items-center gap-2 truncate">
                <i class="fa-regular fa-id-badge text-slate-500 w-4"></i>
                <span class="font-mono text-slate-400">${emp.employee_code}</span>
              </div>
              <div class="flex items-center gap-2 truncate">
                <i class="fa-regular fa-envelope text-slate-500 w-4"></i>
                <span class="truncate text-slate-400">${emp.email}</span>
              </div>
              <div class="flex items-center gap-2 truncate">
                <i class="fa-solid fa-phone text-slate-500 w-4"></i>
                <span class="text-slate-400">${emp.phone || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div class="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs">
            <span class="text-slate-400">Shift: <b class="text-slate-300">${emp.shift_name ? emp.shift_name.split(' ')[0] : 'General'}</b></span>
            <button onclick="EmployeeModule.openProfileModal('${emp.id}')"
                    class="text-indigo-400 hover:text-indigo-300 font-semibold inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              Full Record <i class="fa-solid fa-arrow-right text-[10px]"></i>
            </button>
          </div>
        </div>
      `;
    }).join("");
  },

  getStatusBadge(status) {
    if (status === "active") {
      return `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Active</span>`;
    } else if (status === "on_leave") {
      return `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20">On Leave</span>`;
    }
    return `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700">Inactive</span>`;
  },

  // ==========================================
  // PROFILE & ATTENDANCE SUMMARY MODAL
  // ==========================================
  async openProfileModal(empId) {
    const emp = await DB.getEmployeeById(empId);
    if (!emp) return;

    // Get this employee's attendance logs
    const history = await DB.getAttendance({ employeeId: empId });
    const presentCount = history.filter(h => h.status === "present").length;
    const lateCount = history.filter(h => h.status === "late").length;
    const absentCount = history.filter(h => h.status === "absent").length;
    const leaveCount = history.filter(h => h.status === "on_leave").length;
    const totalHours = history.reduce((sum, h) => sum + (parseFloat(h.total_hours) || 0), 0).toFixed(1);

    const recentRecordsHtml = history.slice(0, 5).map(h => `
      <div class="flex items-center justify-between py-2 border-b border-slate-700/50 text-xs">
        <span class="font-mono text-slate-300">${h.date}</span>
        <span class="text-slate-400">${h.clock_in ? new Date(h.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'} to ${h.clock_out ? new Date(h.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
        <span class="px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${AttendanceModule.getStatusBadgeClass(h.status)}">${h.status.replace('_', ' ')}</span>
      </div>
    `).join("") || `<p class="text-xs text-slate-400 py-2">No past records yet.</p>`;

    Swal.fire({
      title: "",
      width: "600px",
      html: `
        <div class="text-left">
          <div class="flex items-center gap-4 pb-4 border-b border-slate-700/70">
            <img src="${emp.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}"
                 class="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-500 shadow-md">
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-lg font-bold text-slate-100">${emp.first_name} ${emp.last_name}</h3>
                <span class="text-xs font-mono bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30">${emp.employee_code}</span>
              </div>
              <p class="text-xs text-indigo-400 font-medium">${emp.position}</p>
              <p class="text-xs text-slate-400">${emp.department_name} • Hired: ${emp.hire_date || '2023-01-01'}</p>
            </div>
          </div>

          <div class="grid grid-cols-4 gap-2 my-4">
            <div class="bg-slate-800/80 p-2.5 rounded-xl text-center border border-slate-700">
              <div class="text-lg font-bold text-emerald-400">${presentCount}</div>
              <div class="text-[10px] uppercase font-semibold text-slate-400">Present</div>
            </div>
            <div class="bg-slate-800/80 p-2.5 rounded-xl text-center border border-slate-700">
              <div class="text-lg font-bold text-amber-400">${lateCount}</div>
              <div class="text-[10px] uppercase font-semibold text-slate-400">Late</div>
            </div>
            <div class="bg-slate-800/80 p-2.5 rounded-xl text-center border border-slate-700">
              <div class="text-lg font-bold text-rose-400">${absentCount}</div>
              <div class="text-[10px] uppercase font-semibold text-slate-400">Absent</div>
            </div>
            <div class="bg-slate-800/80 p-2.5 rounded-xl text-center border border-slate-700">
              <div class="text-lg font-bold text-indigo-400">${totalHours}h</div>
              <div class="text-[10px] uppercase font-semibold text-slate-400">Hours</div>
            </div>
          </div>

          <div class="space-y-1.5 text-xs text-slate-300 mb-4 bg-slate-800/50 p-3 rounded-xl border border-slate-700/60">
            <div><b class="text-slate-400">Email:</b> ${emp.email}</div>
            <div><b class="text-slate-400">Phone:</b> ${emp.phone || 'N/A'}</div>
            <div><b class="text-slate-400">Assigned Shift:</b> ${emp.shift_name}</div>
            <div><b class="text-slate-400">Kiosk PIN:</b> <span class="font-mono text-amber-400">${emp.pin_code || '1001'}</span></div>
          </div>

          <div>
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Recent Attendance Activity</h4>
            <div class="space-y-1">
              ${recentRecordsHtml}
            </div>
          </div>
        </div>
      `,
      showCloseButton: true,
      showConfirmButton: false,
      background: "#0f172a"
    });
  },

  // ==========================================
  // ADD / EDIT MODALS
  // ==========================================
  openAddEmployeeModal() {
    const modal = document.getElementById("employee-modal");
    const modalTitle = document.getElementById("employee-modal-title");
    const form = document.getElementById("employee-form");

    if (!modal || !form) return;

    form.reset();
    document.getElementById("emp-form-id").value = "";
    document.getElementById("emp-form-code").value = "EMP-" + (1000 + this.allEmployees.length + 1);
    modalTitle.textContent = "Register New Employee";
    modal.classList.remove("hidden");
  },

  async openEditEmployeeModal(empId) {
    const emp = await DB.getEmployeeById(empId);
    if (!emp) return;

    const modal = document.getElementById("employee-modal");
    const modalTitle = document.getElementById("employee-modal-title");
    if (!modal) return;

    modalTitle.textContent = "Edit Employee Details";
    document.getElementById("emp-form-id").value = emp.id;
    document.getElementById("emp-form-code").value = emp.employee_code;
    document.getElementById("emp-form-firstname").value = emp.first_name;
    document.getElementById("emp-form-lastname").value = emp.last_name;
    document.getElementById("emp-form-email").value = emp.email;
    document.getElementById("emp-form-phone").value = emp.phone || "";
    document.getElementById("emp-form-position").value = emp.position;
    document.getElementById("emp-form-dept").value = emp.department_id;
    document.getElementById("emp-form-shift").value = emp.shift_id;
    document.getElementById("emp-form-status").value = emp.status;
    document.getElementById("emp-form-pin").value = emp.pin_code || "1234";
    document.getElementById("emp-form-avatar").value = emp.avatar_url || "";

    modal.classList.remove("hidden");
  },

  closeEmployeeModal() {
    const modal = document.getElementById("employee-modal");
    if (modal) modal.classList.add("hidden");
  },

  async saveEmployeeForm(e) {
    e.preventDefault();
    const id = document.getElementById("emp-form-id").value;
    const employeeData = {
      employee_code: document.getElementById("emp-form-code").value.trim(),
      first_name: document.getElementById("emp-form-firstname").value.trim(),
      last_name: document.getElementById("emp-form-lastname").value.trim(),
      email: document.getElementById("emp-form-email").value.trim(),
      phone: document.getElementById("emp-form-phone").value.trim(),
      position: document.getElementById("emp-form-position").value.trim(),
      department_id: document.getElementById("emp-form-dept").value,
      shift_id: document.getElementById("emp-form-shift").value,
      status: document.getElementById("emp-form-status").value,
      pin_code: document.getElementById("emp-form-pin").value.trim() || "1234",
      avatar_url: document.getElementById("emp-form-avatar").value.trim() || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
    };

    try {
      if (id) {
        await DB.updateEmployee(id, employeeData);
        Swal.fire({ icon: "success", title: "Updated!", text: "Employee updated successfully.", timer: 1500, showConfirmButton: false });
      } else {
        await DB.addEmployee(employeeData);
        Swal.fire({ icon: "success", title: "Added!", text: "Employee registered successfully.", timer: 1500, showConfirmButton: false });
      }

      this.closeEmployeeModal();
      await this.loadEmployees();
      await AttendanceModule.populateEmployeeSelect();
      App.refreshDashboardStats();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Save Failed", text: err.message });
    }
  },

  async confirmDeleteEmployee(empId, name) {
    const confirm = await Swal.fire({
      title: "Remove Employee?",
      text: `Are you sure you want to delete ${name}? This will remove associated attendance records.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Delete",
      confirmButtonColor: "#ef4444"
    });

    if (!confirm.isConfirmed) return;

    await DB.deleteEmployee(empId);
    CONFIG.playSound("success");
    await this.loadEmployees();
    await AttendanceModule.populateEmployeeSelect();
    App.refreshDashboardStats();

    Swal.fire({ icon: "success", title: "Removed", text: `${name} has been removed.`, timer: 1500, showConfirmButton: false });
  },

  setupEventListeners() {
    const filterDept = document.getElementById("filter-emp-dept");
    if (filterDept) {
      filterDept.addEventListener("change", e => {
        this.currentFilterDept = e.target.value;
        this.renderEmployeeList();
      });
    }

    const filterStatus = document.getElementById("filter-emp-status");
    if (filterStatus) {
      filterStatus.addEventListener("change", e => {
        this.currentFilterStatus = e.target.value;
        this.renderEmployeeList();
      });
    }

    const searchInput = document.getElementById("filter-emp-search");
    if (searchInput) {
      searchInput.addEventListener("input", e => {
        this.searchQuery = e.target.value.trim();
        this.renderEmployeeList();
      });
    }

    const btnAdd = document.getElementById("btn-add-employee");
    if (btnAdd) {
      btnAdd.addEventListener("click", () => this.openAddEmployeeModal());
    }

    const modalClose = document.getElementById("btn-close-emp-modal");
    if (modalClose) {
      modalClose.addEventListener("click", () => this.closeEmployeeModal());
    }

    const form = document.getElementById("employee-form");
    if (form) {
      form.addEventListener("submit", e => this.saveEmployeeForm(e));
    }
  }
};

window.EmployeeModule = EmployeeModule;
