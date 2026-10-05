/**
 * Leave Management Module
 * Manages leave requests, approvals, balance quotas, and automated attendance sync
 */

const LeaveModule = {
  currentTab: "all",

  init() {
    this.setupEventListeners();
  },

  async loadLeaves() {
    await this.renderLeaveStats();
    await this.renderLeaveRequestsTable();
    await this.populateLeaveEmployeeSelect();
  },

  async populateLeaveEmployeeSelect() {
    const select = document.getElementById("leave-form-employee");
    if (!select) return;

    const employees = await DB.getEmployees();
    select.innerHTML = employees
      .filter(e => e.status !== "inactive")
      .map(e => `<option value="${e.id}">${e.employee_code} - ${e.first_name} ${e.last_name}</option>`)
      .join("");
  },

  async renderLeaveStats() {
    const leaves = await DB.getLeaveRequests();
    const pending = leaves.filter(l => l.status === "pending").length;
    const approved = leaves.filter(l => l.status === "approved").length;
    const rejected = leaves.filter(l => l.status === "rejected").length;

    const elPending = document.getElementById("kpi-leaves-pending");
    const elApproved = document.getElementById("kpi-leaves-approved");
    const elRejected = document.getElementById("kpi-leaves-rejected");

    if (elPending) elPending.textContent = pending;
    if (elApproved) elApproved.textContent = approved;
    if (elRejected) elRejected.textContent = rejected;
  },

  async renderLeaveRequestsTable() {
    const tableBody = document.getElementById("leave-table-body");
    if (!tableBody) return;

    tableBody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-400"><i class="fa-solid fa-spinner fa-spin text-2xl text-indigo-500 mb-2"></i><p>Loading requests...</p></td></tr>`;

    const filter = this.currentTab === "all" ? {} : { status: this.currentTab };
    const leaves = await DB.getLeaveRequests(filter);

    if (leaves.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" class="py-12 text-center text-slate-400">
            <i class="fa-regular fa-calendar-check text-4xl mb-3 text-slate-500"></i>
            <p class="font-medium text-slate-300">No leave applications found</p>
            <p class="text-xs text-slate-500 mt-1">Leave applications in this status will appear here</p>
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = leaves.map(leave => {
      const emp = leave.employee || {};
      const statusBadge = this.getLeaveStatusBadge(leave.status);
      const typeBadge = this.getLeaveTypeBadge(leave.leave_type);

      return `
        <tr class="border-b border-slate-800 hover:bg-slate-800/40 transition-colors">
          <td class="py-3 px-4">
            <div class="flex items-center gap-3">
              <img src="${emp.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}"
                   alt="${emp.first_name}"
                   class="w-9 h-9 rounded-full object-cover border border-slate-700" />
              <div>
                <div class="font-semibold text-slate-100">${emp.first_name || 'Staff'} ${emp.last_name || ''}</div>
                <div class="text-xs text-slate-400">${emp.employee_code || 'EMP'} • ${emp.department_name || 'Dept'}</div>
              </div>
            </div>
          </td>
          <td class="py-3 px-4">${typeBadge}</td>
          <td class="py-3 px-4 font-mono text-xs text-slate-300">
            <div>${leave.start_date} <span class="text-slate-500">to</span> ${leave.end_date}</div>
            <div class="text-[11px] text-slate-400 font-sans mt-0.5">Duration: <b>${leave.total_days} ${leave.total_days === 1 ? 'day' : 'days'}</b></div>
          </td>
          <td class="py-3 px-4 text-xs text-slate-300 max-w-xs truncate" title="${leave.reason}">
            ${leave.reason}
          </td>
          <td class="py-3 px-4 font-mono text-xs text-slate-400">
            ${new Date(leave.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
          </td>
          <td class="py-3 px-4">${statusBadge}</td>
          <td class="py-3 px-4 text-right">
            ${leave.status === "pending" ? `
              <div class="flex items-center justify-end gap-1.5">
                <button onclick="LeaveModule.approveLeave('${leave.id}')"
                        class="px-2.5 py-1 text-xs font-semibold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg transition"
                        title="Approve">
                  <i class="fa-solid fa-check mr-1"></i> Approve
                </button>
                <button onclick="LeaveModule.rejectLeave('${leave.id}')"
                        class="px-2.5 py-1 text-xs font-semibold bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg transition"
                        title="Reject">
                  <i class="fa-solid fa-xmark mr-1"></i> Reject
                </button>
              </div>
            ` : `
              <span class="text-xs text-slate-500 italic">${leave.admin_comment ? leave.admin_comment : 'Processed'}</span>
            `}
          </td>
        </tr>
      `;
    }).join("");
  },

  getLeaveStatusBadge(status) {
    switch (status) {
      case "approved":
        return `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>Approved</span>`;
      case "pending":
        return `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20"><span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>Pending</span>`;
      case "rejected":
        return `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold uppercase bg-rose-500/10 text-rose-400 border border-rose-500/20"><span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span>Rejected</span>`;
      default:
        return `<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400">${status}</span>`;
    }
  },

  getLeaveTypeBadge(type) {
    switch (type) {
      case "annual":
        return `<span class="px-2.5 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">Annual Vacation</span>`;
      case "sick":
        return `<span class="px-2.5 py-0.5 rounded text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">Medical / Sick</span>`;
      case "casual":
        return `<span class="px-2.5 py-0.5 rounded text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">Casual Leave</span>`;
      case "unpaid":
        return `<span class="px-2.5 py-0.5 rounded text-xs font-medium bg-slate-700 text-slate-300 border border-slate-600">Unpaid Leave</span>`;
      default:
        return `<span class="px-2.5 py-0.5 rounded text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">${type}</span>`;
    }
  },

  async approveLeave(leaveId) {
    const { value: comment } = await Swal.fire({
      title: "Approve Leave Request",
      input: "text",
      inputLabel: "Optional Manager Comments",
      inputValue: "Approved as requested.",
      showCancelButton: true,
      confirmButtonText: "Approve Leave",
      confirmButtonColor: "#10b981"
    });

    if (comment === undefined) return;

    await DB.updateLeaveStatus(leaveId, "approved", comment || "Approved");
    CONFIG.playSound("success");

    await this.loadLeaves();
    AttendanceModule.refreshDailyAttendanceTable();
    App.refreshDashboardStats();

    Swal.fire({
      icon: "success",
      title: "Approved!",
      text: "Leave application has been approved.",
      timer: 1500,
      showConfirmButton: false
    });
  },

  async rejectLeave(leaveId) {
    const { value: comment } = await Swal.fire({
      title: "Reject Leave Request",
      input: "textarea",
      inputLabel: "Reason for Rejection (Required)",
      inputPlaceholder: "Explain why this leave cannot be granted at this time...",
      showCancelButton: true,
      confirmButtonText: "Reject Request",
      confirmButtonColor: "#ef4444",
      inputValidator: (val) => {
        if (!val) return "You must provide a rejection reason for the employee.";
      }
    });

    if (!comment) return;

    await DB.updateLeaveStatus(leaveId, "rejected", comment);
    CONFIG.playSound("error");

    await this.loadLeaves();

    Swal.fire({
      icon: "info",
      title: "Rejected",
      text: "Leave application has been marked rejected.",
      timer: 1500,
      showConfirmButton: false
    });
  },

  openApplyLeaveModal() {
    const modal = document.getElementById("apply-leave-modal");
    const form = document.getElementById("apply-leave-form");
    if (!modal || !form) return;

    form.reset();
    const today = new Date().toISOString().split("T")[0];
    document.getElementById("leave-form-start").value = today;
    document.getElementById("leave-form-end").value = today;
    document.getElementById("leave-form-days").value = "1";

    modal.classList.remove("hidden");
  },

  closeApplyLeaveModal() {
    const modal = document.getElementById("apply-leave-modal");
    if (modal) modal.classList.add("hidden");
  },

  async handleApplyLeaveSubmit(e) {
    e.preventDefault();
    const empId = document.getElementById("leave-form-employee").value;
    const leaveType = document.getElementById("leave-form-type").value;
    const startDate = document.getElementById("leave-form-start").value;
    const endDate = document.getElementById("leave-form-end").value;
    const totalDays = parseFloat(document.getElementById("leave-form-days").value) || 1;
    const reason = document.getElementById("leave-form-reason").value.trim();

    if (new Date(endDate) < new Date(startDate)) {
      Swal.fire({ icon: "error", title: "Invalid Dates", text: "End date cannot be prior to start date." });
      return;
    }

    try {
      await DB.submitLeaveRequest({
        employee_id: empId,
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        total_days: totalDays,
        reason: reason
      });

      CONFIG.playSound("success");
      this.closeApplyLeaveModal();
      await this.loadLeaves();

      Swal.fire({
        icon: "success",
        title: "Leave Application Submitted",
        text: "The request is pending management review.",
        timer: 1800,
        showConfirmButton: false
      });
    } catch (err) {
      Swal.fire({ icon: "error", title: "Submission Failed", text: err.message });
    }
  },

  calculateDays() {
    const startInput = document.getElementById("leave-form-start");
    const endInput = document.getElementById("leave-form-end");
    const daysInput = document.getElementById("leave-form-days");

    if (!startInput || !endInput || !daysInput) return;

    if (startInput.value && endInput.value) {
      const s = new Date(startInput.value);
      const e = new Date(endInput.value);
      const diffTime = e - s;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      daysInput.value = diffDays > 0 ? diffDays : 1;
    }
  },

  setupEventListeners() {
    const btnOpen = document.getElementById("btn-open-apply-leave");
    if (btnOpen) {
      btnOpen.addEventListener("click", () => this.openApplyLeaveModal());
    }

    const btnClose = document.getElementById("btn-close-leave-modal");
    if (btnClose) {
      btnClose.addEventListener("click", () => this.closeApplyLeaveModal());
    }

    const form = document.getElementById("apply-leave-form");
    if (form) {
      form.addEventListener("submit", e => this.handleApplyLeaveSubmit(e));
    }

    const startInput = document.getElementById("leave-form-start");
    const endInput = document.getElementById("leave-form-end");
    if (startInput && endInput) {
      startInput.addEventListener("change", () => this.calculateDays());
      endInput.addEventListener("change", () => this.calculateDays());
    }

    // Leave tab buttons (All, Pending, Approved, Rejected)
    const tabs = document.querySelectorAll(".leave-tab-btn");
    tabs.forEach(tab => {
      tab.addEventListener("click", () => {
        tabs.forEach(t => {
          t.classList.remove("text-indigo-400", "border-indigo-500", "bg-slate-800/80");
          t.classList.add("text-slate-400", "border-transparent");
        });
        tab.classList.add("text-indigo-400", "border-indigo-500", "bg-slate-800/80");
        this.currentTab = tab.dataset.status;
        this.renderLeaveRequestsTable();
      });
    });
  }
};

window.LeaveModule = LeaveModule;
