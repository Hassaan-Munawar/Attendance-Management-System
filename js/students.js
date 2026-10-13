/**
 * Teacher Classroom Roll-Call & Student Directory Management Module
 * Allows teachers to take daily classroom attendance, manage classes, and maintain student rosters.
 */

const StudentModule = {
  classes: [],
  students: [],
  selectedClassId: "",
  selectedDate: new Date().toISOString().split("T")[0],
  currentRosterState: {}, // studentId -> { status: 'present'|'absent'|'late'|'excused', remarks: '' }

  async init() {
    console.log("Initializing Student & Teacher Classroom Module...");
    this.setupEventListeners();
    this.setDefaultDate();
  },

  setDefaultDate() {
    const today = new Date().toISOString().split("T")[0];
    this.selectedDate = today;
    const dateInput = document.getElementById("classroom-date-picker");
    if (dateInput) dateInput.value = today;
  },

  setupEventListeners() {
    // Classroom Roll Call Class Selector
    const classSelect = document.getElementById("classroom-class-select");
    if (classSelect) {
      classSelect.addEventListener("change", (e) => {
        this.selectedClassId = e.target.value;
        this.loadClassroomRoster();
      });
    }

    // Classroom Date Picker
    const dateInput = document.getElementById("classroom-date-picker");
    if (dateInput) {
      dateInput.addEventListener("change", (e) => {
        this.selectedDate = e.target.value || new Date().toISOString().split("T")[0];
        this.loadClassroomRoster();
      });
    }

    // Classroom Date Previous / Next Buttons
    const prevDayBtn = document.getElementById("btn-classroom-prev-day");
    if (prevDayBtn) {
      prevDayBtn.addEventListener("click", () => {
        const cur = new Date(this.selectedDate);
        cur.setDate(cur.getDate() - 1);
        this.selectedDate = cur.toISOString().split("T")[0];
        if (dateInput) dateInput.value = this.selectedDate;
        this.loadClassroomRoster();
      });
    }

    const nextDayBtn = document.getElementById("btn-classroom-next-day");
    if (nextDayBtn) {
      nextDayBtn.addEventListener("click", () => {
        const cur = new Date(this.selectedDate);
        cur.setDate(cur.getDate() + 1);
        this.selectedDate = cur.toISOString().split("T")[0];
        if (dateInput) dateInput.value = this.selectedDate;
        this.loadClassroomRoster();
      });
    }

    // Batch Action: Mark All Present
    const markAllPresentBtn = document.getElementById("btn-mark-all-present");
    if (markAllPresentBtn) {
      markAllPresentBtn.addEventListener("click", () => this.batchSetStatus("present"));
    }

    // Batch Action: Mark All Absent
    const markAllAbsentBtn = document.getElementById("btn-mark-all-absent");
    if (markAllAbsentBtn) {
      markAllAbsentBtn.addEventListener("click", () => this.batchSetStatus("absent"));
    }

    // Save Classroom Attendance Button
    const saveAttendanceBtn = document.getElementById("btn-save-class-attendance");
    if (saveAttendanceBtn) {
      saveAttendanceBtn.addEventListener("click", () => this.saveClassroomAttendance());
    }

    // Student Filter by Class (in Student Directory)
    const stdClassFilter = document.getElementById("filter-student-class");
    if (stdClassFilter) {
      stdClassFilter.addEventListener("change", () => this.renderStudentDirectory());
    }

    // Student Search Input
    const stdSearch = document.getElementById("search-student-input");
    if (stdSearch) {
      stdSearch.addEventListener("input", () => this.renderStudentDirectory());
    }

    // Student Form Submit
    const stdForm = document.getElementById("student-form");
    if (stdForm) {
      stdForm.addEventListener("submit", (e) => this.handleStudentFormSubmit(e));
    }

    // Class Form Submit
    const classForm = document.getElementById("class-form");
    if (classForm) {
      classForm.addEventListener("submit", (e) => this.handleClassFormSubmit(e));
    }

    // Export Student Attendance to Excel
    const exportBtn = document.getElementById("btn-export-student-attendance");
    if (exportBtn) {
      exportBtn.addEventListener("click", () => this.exportStudentAttendanceExcel());
    }
  },

  // ==========================================
  // DATA LOADING
  // ==========================================
  async loadClasses() {
    this.classes = await DB.getClasses();
    this.populateClassDropdowns();
    return this.classes;
  },

  populateClassDropdowns() {
    const classSelect = document.getElementById("classroom-class-select");
    const stdClassFilter = document.getElementById("filter-student-class");
    const formClassSelect = document.getElementById("student-form-class");

    const options = this.classes.map(c => {
      const label = `${c.name}${c.section ? " - " + c.section : ""}${c.room_number ? " (" + c.room_number + ")" : ""}`;
      return `<option value="${c.id}">${label}</option>`;
    }).join("");

    if (classSelect) {
      if (this.classes.length === 0) {
        classSelect.innerHTML = `<option value="">No classes found. Click '+ Add Class'</option>`;
      } else {
        classSelect.innerHTML = options;
        if (!this.selectedClassId && this.classes.length > 0) {
          this.selectedClassId = this.classes[0].id;
        }
        classSelect.value = this.selectedClassId;
      }
    }

    if (stdClassFilter) {
      stdClassFilter.innerHTML = `<option value="all">All Classes / Grades</option>` + options;
    }

    if (formClassSelect) {
      formClassSelect.innerHTML = `<option value="">-- Select Class --</option>` + options;
    }
  },

  async loadStudents() {
    this.students = await DB.getStudents();
    return this.students;
  },

  async refreshData() {
    await this.loadClasses();
    await this.loadStudents();
    await this.loadClassroomRoster();
    this.renderStudentDirectory();
    this.renderClassesList();
  },

  // ==========================================
  // TEACHER CLASSROOM ROLL-CALL
  // ==========================================
  async loadClassroomRoster() {
    const container = document.getElementById("classroom-roster-container");
    const emptyState = document.getElementById("classroom-empty-state");
    const summaryBar = document.getElementById("classroom-summary-bar");

    if (!this.selectedClassId) {
      if (container) container.innerHTML = "";
      if (emptyState) {
        emptyState.classList.remove("hidden");
        emptyState.querySelector(".empty-msg").textContent = "Select or create a class above to begin classroom roll call.";
      }
      if (summaryBar) summaryBar.classList.add("hidden");
      return;
    }

    // Filter students belonging to this class
    const classStudents = this.students.filter(s => s.class_id === this.selectedClassId && s.status === "active");

    if (classStudents.length === 0) {
      if (container) container.innerHTML = "";
      if (emptyState) {
        emptyState.classList.remove("hidden");
        emptyState.querySelector(".empty-msg").textContent = "No active students enrolled in this class. Click '+ Add Student' to enroll students.";
      }
      if (summaryBar) summaryBar.classList.add("hidden");
      return;
    }

    if (emptyState) emptyState.classList.add("hidden");
    if (summaryBar) summaryBar.classList.remove("hidden");

    // Fetch existing attendance records from Supabase for this class & date
    const existingRecords = await DB.getStudentAttendance(this.selectedClassId, this.selectedDate);
    const existingMap = {};
    existingRecords.forEach(r => {
      existingMap[r.student_id] = r;
    });

    // Reset and initialize state
    this.currentRosterState = {};
    classStudents.forEach(std => {
      const record = existingMap[std.id];
      this.currentRosterState[std.id] = {
        status: record ? record.status : "present", // default to present for quick roll call
        remarks: record ? (record.remarks || "") : ""
      };
    });

    this.renderRosterCards(classStudents);
    this.updateClassroomSummary();
  },

  renderRosterCards(studentsList) {
    const container = document.getElementById("classroom-roster-container");
    if (!container) return;

    container.innerHTML = studentsList.map((std, idx) => {
      const state = this.currentRosterState[std.id] || { status: "present", remarks: "" };
      const curStatus = state.status;
      const initials = `${std.first_name[0] || ""}${std.last_name[0] || ""}`.toUpperCase();

      return `
        <div class="glass-panel p-4 rounded-2xl border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between gap-3 bg-slate-900/40">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600/30 to-violet-600/30 border border-indigo-500/20 text-indigo-300 font-bold flex items-center justify-center text-xs flex-shrink-0">
                ${initials}
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h4 class="font-bold text-sm text-white">${std.first_name} ${std.last_name}</h4>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-slate-800 text-slate-300 border border-slate-700">#${std.roll_number}</span>
                </div>
                <p class="text-xs text-slate-400 mt-0.5">${std.guardian_phone ? '<i class="fa-solid fa-phone text-[10px] text-slate-500 mr-1"></i>' + std.guardian_phone : "No phone"}</p>
              </div>
            </div>
          </div>

          <!-- Roll Call Status Selector Pills -->
          <div class="grid grid-cols-4 gap-1.5 pt-2 border-t border-slate-800/80">
            <button type="button" onclick="StudentModule.setStudentStatus('${std.id}', 'present')"
                    class="py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition ${curStatus === 'present' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 font-bold' : 'bg-slate-800/70 text-slate-400 hover:bg-slate-800 hover:text-slate-200'}">
              <i class="fa-solid fa-check text-[10px]"></i> <span>Present</span>
            </button>
            <button type="button" onclick="StudentModule.setStudentStatus('${std.id}', 'absent')"
                    class="py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition ${curStatus === 'absent' ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 font-bold' : 'bg-slate-800/70 text-slate-400 hover:bg-slate-800 hover:text-slate-200'}">
              <i class="fa-solid fa-xmark text-[10px]"></i> <span>Absent</span>
            </button>
            <button type="button" onclick="StudentModule.setStudentStatus('${std.id}', 'late')"
                    class="py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition ${curStatus === 'late' ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30 font-bold' : 'bg-slate-800/70 text-slate-400 hover:bg-slate-800 hover:text-slate-200'}">
              <i class="fa-solid fa-clock text-[10px]"></i> <span>Late</span>
            </button>
            <button type="button" onclick="StudentModule.setStudentStatus('${std.id}', 'excused')"
                    class="py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition ${curStatus === 'excused' ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30 font-bold' : 'bg-slate-800/70 text-slate-400 hover:bg-slate-800 hover:text-slate-200'}">
              <i class="fa-solid fa-note-sticky text-[10px]"></i> <span>Excused</span>
            </button>
          </div>

          <!-- Remarks input -->
          <div>
            <input type="text"
                   value="${state.remarks || ""}"
                   onchange="StudentModule.setStudentRemarks('${std.id}', this.value)"
                   placeholder="Add optional remarks (e.g. sick note, parent called)..."
                   class="w-full bg-slate-950/70 border border-slate-800/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500">
          </div>
        </div>
      `;
    }).join("");
  },

  setStudentStatus(studentId, status) {
    if (!this.currentRosterState[studentId]) {
      this.currentRosterState[studentId] = { status: status, remarks: "" };
    } else {
      this.currentRosterState[studentId].status = status;
    }

    const classStudents = this.students.filter(s => s.class_id === this.selectedClassId && s.status === "active");
    this.renderRosterCards(classStudents);
    this.updateClassroomSummary();
  },

  setStudentRemarks(studentId, remarks) {
    if (!this.currentRosterState[studentId]) {
      this.currentRosterState[studentId] = { status: "present", remarks: remarks };
    } else {
      this.currentRosterState[studentId].remarks = remarks;
    }
  },

  batchSetStatus(status) {
    const classStudents = this.students.filter(s => s.class_id === this.selectedClassId && s.status === "active");
    classStudents.forEach(std => {
      if (!this.currentRosterState[std.id]) {
        this.currentRosterState[std.id] = { status: status, remarks: "" };
      } else {
        this.currentRosterState[std.id].status = status;
      }
    });

    this.renderRosterCards(classStudents);
    this.updateClassroomSummary();
    CONFIG.playSound("punch");
  },

  updateClassroomSummary() {
    const totalEl = document.getElementById("classroom-stat-total");
    const presentEl = document.getElementById("classroom-stat-present");
    const absentEl = document.getElementById("classroom-stat-absent");
    const lateEl = document.getElementById("classroom-stat-late");
    const rateEl = document.getElementById("classroom-stat-rate");

    const states = Object.values(this.currentRosterState);
    const total = states.length;
    let present = 0;
    let absent = 0;
    let late = 0;
    let excused = 0;

    states.forEach(s => {
      if (s.status === "present") present++;
      else if (s.status === "absent") absent++;
      else if (s.status === "late") late++;
      else if (s.status === "excused") excused++;
    });

    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

    if (totalEl) totalEl.textContent = total;
    if (presentEl) presentEl.textContent = present;
    if (absentEl) absentEl.textContent = absent;
    if (lateEl) lateEl.textContent = late;
    if (rateEl) rateEl.textContent = `${rate}%`;
  },

  async saveClassroomAttendance() {
    if (!CONFIG.isConfigured()) {
      Swal.fire({ icon: "warning", title: "Supabase Disconnected", text: "Please connect your Supabase database in Settings." });
      return;
    }

    if (!this.selectedClassId) {
      Swal.fire({ icon: "info", title: "Select a Class", text: "Please select a classroom first." });
      return;
    }

    const saveBtn = document.getElementById("btn-save-class-attendance");
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1.5"></i> Saving to Supabase...`;
    }

    try {
      const recordsToUpsert = Object.entries(this.currentRosterState).map(([studentId, data]) => ({
        student_id: studentId,
        class_id: this.selectedClassId,
        date: this.selectedDate,
        status: data.status,
        remarks: data.remarks || null,
        marked_by: "Teacher"
      }));

      await DB.saveClassAttendance(recordsToUpsert);

      CONFIG.playSound("success");
      if (window.confetti) {
        window.confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
      }

      Swal.fire({
        icon: "success",
        title: "Class Attendance Saved!",
        text: `Successfully recorded attendance for ${recordsToUpsert.length} students on ${this.selectedDate}.`,
        timer: 2000,
        showConfirmButton: false
      });
    } catch (err) {
      CONFIG.playSound("error");
      Swal.fire({ icon: "error", title: "Failed to Save", text: err.message });
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = `<i class="fa-solid fa-cloud-arrow-up mr-1.5"></i> Save Attendance`;
      }
    }
  },

  // ==========================================
  // STUDENT DIRECTORY
  // ==========================================
  renderStudentDirectory() {
    const listContainer = document.getElementById("student-directory-body");
    const countEl = document.getElementById("student-directory-count");
    if (!listContainer) return;

    const classFilter = document.getElementById("filter-student-class")?.value || "all";
    const searchQuery = (document.getElementById("search-student-input")?.value || "").toLowerCase().trim();

    let filtered = this.students;

    if (classFilter !== "all") {
      filtered = filtered.filter(s => s.class_id === classFilter);
    }

    if (searchQuery) {
      filtered = filtered.filter(s => {
        const fullName = `${s.first_name} ${s.last_name}`.toLowerCase();
        const roll = (s.roll_number || "").toLowerCase();
        return fullName.includes(searchQuery) || roll.includes(searchQuery);
      });
    }

    if (countEl) countEl.textContent = `${filtered.length} Students`;

    if (filtered.length === 0) {
      listContainer.innerHTML = `
        <tr>
          <td colspan="6" class="p-8 text-center text-slate-500">
            <i class="fa-solid fa-graduation-cap text-3xl mb-2 text-slate-600 block"></i>
            No students found matching your criteria.
          </td>
        </tr>
      `;
      return;
    }

    listContainer.innerHTML = filtered.map(std => {
      const initials = `${std.first_name[0] || ""}${std.last_name[0] || ""}`.toUpperCase();
      const statusBadge = std.status === "active"
        ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Active</span>`
        : `<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">Inactive</span>`;

      return `
        <tr class="border-b border-slate-800/60 hover:bg-slate-800/30 transition">
          <td class="p-3 text-xs font-mono font-bold text-indigo-400">${std.roll_number}</td>
          <td class="p-3">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 font-bold text-xs flex items-center justify-center">
                ${initials}
              </div>
              <div>
                <p class="font-bold text-xs text-white">${std.first_name} ${std.last_name}</p>
                <p class="text-[11px] text-slate-400">${std.email || "No email"}</p>
              </div>
            </div>
          </td>
          <td class="p-3 text-xs text-slate-300">${std.class_name || "Unassigned"}</td>
          <td class="p-3 text-xs text-slate-300">${std.guardian_phone || "—"}</td>
          <td class="p-3">${statusBadge}</td>
          <td class="p-3 text-right">
            <div class="flex items-center justify-end gap-1.5">
              <button onclick="StudentModule.openEditStudentModal('${std.id}')" class="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition" title="Edit Student">
                <i class="fa-solid fa-pen-to-square text-xs"></i>
              </button>
              <button onclick="StudentModule.deleteStudent('${std.id}', '${std.first_name} ${std.last_name}')" class="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition" title="Delete Student">
                <i class="fa-solid fa-trash-can text-xs"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  },

  // ==========================================
  // STUDENT MODAL & CRUD
  // ==========================================
  openAddStudentModal() {
    const modal = document.getElementById("student-modal");
    const form = document.getElementById("student-form");
    const title = document.getElementById("student-modal-title");

    if (form) form.reset();
    document.getElementById("student-form-id").value = "";
    if (title) title.textContent = "Enroll New Student";

    // Set default class if current class is selected
    if (this.selectedClassId) {
      const classSelect = document.getElementById("student-form-class");
      if (classSelect) classSelect.value = this.selectedClassId;
    }

    if (modal) modal.classList.remove("hidden");
  },

  openEditStudentModal(id) {
    const std = this.students.find(s => s.id === id);
    if (!std) return;

    const modal = document.getElementById("student-modal");
    const title = document.getElementById("student-modal-title");

    document.getElementById("student-form-id").value = std.id;
    document.getElementById("student-form-roll").value = std.roll_number || "";
    document.getElementById("student-form-firstname").value = std.first_name || "";
    document.getElementById("student-form-lastname").value = std.last_name || "";
    document.getElementById("student-form-class").value = std.class_id || "";
    document.getElementById("student-form-guardian").value = std.guardian_phone || "";
    document.getElementById("student-form-email").value = std.email || "";
    document.getElementById("student-form-status").value = std.status || "active";

    if (title) title.textContent = "Edit Student Information";
    if (modal) modal.classList.remove("hidden");
  },

  closeStudentModal() {
    const modal = document.getElementById("student-modal");
    if (modal) modal.classList.add("hidden");
  },

  async handleStudentFormSubmit(e) {
    e.preventDefault();
    if (!CONFIG.isConfigured()) {
      Swal.fire({ icon: "warning", title: "Supabase Disconnected", text: "Please connect your Supabase database in Settings." });
      return;
    }

    const id = document.getElementById("student-form-id").value;
    const studentData = {
      roll_number: document.getElementById("student-form-roll").value.trim(),
      first_name: document.getElementById("student-form-firstname").value.trim(),
      last_name: document.getElementById("student-form-lastname").value.trim(),
      class_id: document.getElementById("student-form-class").value || null,
      guardian_phone: document.getElementById("student-form-guardian").value.trim() || null,
      email: document.getElementById("student-form-email").value.trim() || null,
      status: document.getElementById("student-form-status").value || "active"
    };

    try {
      if (id) {
        await DB.updateStudent(id, studentData);
        Swal.fire({ icon: "success", title: "Updated!", text: "Student updated successfully.", timer: 1500, showConfirmButton: false });
      } else {
        await DB.addStudent(studentData);
        Swal.fire({ icon: "success", title: "Enrolled!", text: "Student enrolled successfully.", timer: 1500, showConfirmButton: false });
      }

      CONFIG.playSound("success");
      this.closeStudentModal();
      await this.loadStudents();
      this.renderStudentDirectory();
      this.loadClassroomRoster();
    } catch (err) {
      CONFIG.playSound("error");
      Swal.fire({ icon: "error", title: "Error Saving Student", text: err.message });
    }
  },

  async deleteStudent(id, name) {
    const confirm = await Swal.fire({
      title: `Delete ${name}?`,
      text: "This student and all their classroom attendance records will be removed.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Delete",
      confirmButtonColor: "#ef4444"
    });

    if (!confirm.isConfirmed) return;

    try {
      await DB.deleteStudent(id);
      CONFIG.playSound("success");
      Swal.fire({ icon: "success", title: "Deleted", text: `${name} has been removed.`, timer: 1500, showConfirmButton: false });
      await this.loadStudents();
      this.renderStudentDirectory();
      this.loadClassroomRoster();
    } catch (err) {
      CONFIG.playSound("error");
      Swal.fire({ icon: "error", title: "Delete Failed", text: err.message });
    }
  },

  // ==========================================
  // CLASSES MANAGEMENT
  // ==========================================
  renderClassesList() {
    const container = document.getElementById("classes-list-container");
    if (!container) return;

    if (this.classes.length === 0) {
      container.innerHTML = `
        <div class="col-span-full p-8 text-center text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800">
          <i class="fa-solid fa-chalkboard-user text-3xl mb-2 text-slate-600 block"></i>
          No classes registered yet. Create your first class above!
        </div>
      `;
      return;
    }

    container.innerHTML = this.classes.map(c => {
      const enrolledCount = this.students.filter(s => s.class_id === c.id).length;
      return `
        <div class="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between gap-3 bg-slate-900/40">
          <div>
            <div class="flex items-center gap-2">
              <h4 class="font-bold text-sm text-white">${c.name}</h4>
              ${c.section ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">${c.section}</span>` : ""}
            </div>
            <p class="text-xs text-slate-400 mt-1">
              <i class="fa-solid fa-user-tie text-[10px] text-slate-500 mr-1"></i> ${c.teacher_name || "No teacher assigned"}
              ${c.room_number ? `<span class="mx-1 text-slate-600">•</span> <i class="fa-solid fa-door-open text-[10px] text-slate-500 mr-1"></i> ${c.room_number}` : ""}
            </p>
            <p class="text-[11px] text-slate-500 mt-1 font-mono">${enrolledCount} Students Enrolled</p>
          </div>
          <div class="flex items-center gap-1">
            <button onclick="StudentModule.selectClassAndRollCall('${c.id}')" class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white transition" title="Start Roll Call">
              Roll Call
            </button>
            <button onclick="StudentModule.deleteClass('${c.id}', '${c.name}')" class="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition" title="Delete Class">
              <i class="fa-solid fa-trash-can text-xs"></i>
            </button>
          </div>
        </div>
      `;
    }).join("");
  },

  selectClassAndRollCall(classId) {
    this.selectedClassId = classId;
    const classSelect = document.getElementById("classroom-class-select");
    if (classSelect) classSelect.value = classId;
    App.switchView("classroom");
    this.loadClassroomRoster();
  },

  openAddClassModal() {
    const modal = document.getElementById("class-modal");
    const form = document.getElementById("class-form");
    if (form) form.reset();
    if (modal) modal.classList.remove("hidden");
  },

  closeClassModal() {
    const modal = document.getElementById("class-modal");
    if (modal) modal.classList.add("hidden");
  },

  async handleClassFormSubmit(e) {
    e.preventDefault();
    if (!CONFIG.isConfigured()) {
      Swal.fire({ icon: "warning", title: "Supabase Disconnected", text: "Please connect your Supabase database in Settings." });
      return;
    }

    const classData = {
      name: document.getElementById("class-form-name").value.trim(),
      section: document.getElementById("class-form-section").value.trim() || null,
      teacher_name: document.getElementById("class-form-teacher").value.trim() || null,
      room_number: document.getElementById("class-form-room").value.trim() || null,
      description: document.getElementById("class-form-desc").value.trim() || null
    };

    try {
      const newClass = await DB.addClass(classData);
      CONFIG.playSound("success");
      Swal.fire({ icon: "success", title: "Class Created!", text: `${classData.name} has been added.`, timer: 1500, showConfirmButton: false });
      this.closeClassModal();
      await this.loadClasses();
      if (newClass) {
        this.selectedClassId = newClass.id;
        const classSelect = document.getElementById("classroom-class-select");
        if (classSelect) classSelect.value = newClass.id;
      }
      this.renderClassesList();
      this.loadClassroomRoster();
    } catch (err) {
      CONFIG.playSound("error");
      Swal.fire({ icon: "error", title: "Error Creating Class", text: err.message });
    }
  },

  async deleteClass(id, name) {
    const confirm = await Swal.fire({
      title: `Delete ${name}?`,
      text: "Deleting this class will unassign all its enrolled students.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Delete",
      confirmButtonColor: "#ef4444"
    });

    if (!confirm.isConfirmed) return;

    try {
      await DB.deleteClass(id);
      CONFIG.playSound("success");
      Swal.fire({ icon: "success", title: "Class Removed", text: `${name} was deleted.`, timer: 1500, showConfirmButton: false });
      await this.refreshData();
    } catch (err) {
      CONFIG.playSound("error");
      Swal.fire({ icon: "error", title: "Delete Failed", text: err.message });
    }
  },

  // ==========================================
  // EXCEL EXPORT
  // ==========================================
  async exportStudentAttendanceExcel() {
    if (!window.XLSX) {
      Swal.fire({ icon: "error", title: "Library Missing", text: "Excel export library (SheetJS) is not loaded." });
      return;
    }

    try {
      const records = await DB.getStudentAttendanceReport({
        classId: this.selectedClassId || "all"
      });

      if (!records || records.length === 0) {
        Swal.fire({ icon: "info", title: "No Records Found", text: "There are no student attendance records to export." });
        return;
      }

      const rows = records.map(r => ({
        Date: r.date,
        "Roll Number": r.students?.roll_number || "",
        "Student Name": r.students ? `${r.students.first_name} ${r.students.last_name}` : "",
        "Class": r.classes ? `${r.classes.name}${r.classes.section ? " - " + r.classes.section : ""}` : "",
        Status: (r.status || "").toUpperCase(),
        Remarks: r.remarks || "",
        "Marked By": r.marked_by || "Teacher"
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Student Attendance");
      const filename = `Student_Attendance_${this.selectedDate}.xlsx`;
      XLSX.writeFile(wb, filename);

      CONFIG.playSound("success");
      Swal.fire({ icon: "success", title: "Export Complete!", text: `Downloaded ${filename}`, timer: 1800, showConfirmButton: false });
    } catch (err) {
      CONFIG.playSound("error");
      Swal.fire({ icon: "error", title: "Export Failed", text: err.message });
    }
  }
};

window.StudentModule = StudentModule;
