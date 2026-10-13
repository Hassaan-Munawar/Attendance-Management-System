/**
 * Main Application Orchestrator
 * Controls navigation, Supabase connectivity, database initialization, teacher & student workflows, and view routing
 */

const App = {
  currentView: "dashboard",

  async init() {
    console.log("Initializing Attendance Management System...");

    // 1. Initialize Configuration & Database (Web Crypto AES-GCM)
    const isConnected = await CONFIG.init();
    await DB.init();

    // 2. Setup Top-bar Connection Badge, Dynamic UI Visibility, and Nav
    this.updateConnectionBadge();
    this.updateConnectionUI();
    this.setupNavigation();
    this.setupSettingsView();

    // 3. Initialize Child Modules
    AttendanceModule.init();
    EmployeeModule.init();
    await StudentModule.init();
    LeaveModule.init();
    ReportsModule.init();

    // 4. Check if Supabase credentials are configured
    if (!isConnected) {
      console.warn("Supabase credentials not found. Directing to setup.");
      this.showSetupNotification();
      this.switchView("settings");
    } else {
      // Load live Supabase data for staff and students
      await this.refreshAllData();

      // Route to requested hash or dashboard
      const hash = window.location.hash.replace("#", "");
      const validViews = ["dashboard", "kiosk", "attendance", "employees", "classroom", "students", "leaves", "reports", "settings"];
      if (hash && validViews.includes(hash)) {
        this.switchView(hash);
      } else {
        this.switchView("dashboard");
      }
    }

    console.log("Attendance Management System ready.");
  },

  async refreshAllData() {
    await EmployeeModule.loadEmployees();
    await StudentModule.refreshData();
    await AttendanceModule.populateEmployeeSelect();
    await AttendanceModule.refreshDailyAttendanceTable();
    await this.refreshDashboardStats();
  },

  showSetupNotification() {
    const banner = document.getElementById("unconfigured-alert-banner");
    if (banner) banner.classList.remove("hidden");
  },

  hideSetupNotification() {
    const banner = document.getElementById("unconfigured-alert-banner");
    if (banner) banner.classList.add("hidden");
  },

  // ==========================================
  // VIEW ROUTING
  // ==========================================
  switchView(viewName) {
    this.currentView = viewName;
    window.location.hash = viewName;

    // Toggle navigation buttons
    document.querySelectorAll(".nav-link").forEach(link => {
      if (link.dataset.view === viewName) {
        link.classList.add("bg-indigo-600", "text-white", "shadow-lg", "shadow-indigo-500/20");
        link.classList.remove("text-slate-400", "hover:bg-slate-800", "hover:text-slate-200");
      } else {
        link.classList.remove("bg-indigo-600", "text-white", "shadow-lg", "shadow-indigo-500/20");
        link.classList.add("text-slate-400", "hover:bg-slate-800", "hover:text-slate-200");
      }
    });

    // Toggle content panels
    document.querySelectorAll(".view-section").forEach(section => {
      if (section.id === `view-${viewName}`) {
        section.classList.remove("hidden");
      } else {
        section.classList.add("hidden");
      }
    });

    // View specific hooks
    if (viewName === "dashboard") {
      this.refreshDashboardStats();
    } else if (viewName === "kiosk") {
      AttendanceModule.populateEmployeeSelect();
    } else if (viewName === "attendance") {
      AttendanceModule.refreshDailyAttendanceTable();
    } else if (viewName === "employees") {
      EmployeeModule.loadEmployees();
    } else if (viewName === "classroom") {
      StudentModule.loadClassroomRoster();
    } else if (viewName === "students") {
      StudentModule.renderStudentDirectory();
      StudentModule.renderClassesList();
    } else if (viewName === "leaves") {
      LeaveModule.loadLeaves();
    } else if (viewName === "reports") {
      ReportsModule.loadReports();
    } else if (viewName === "settings") {
      this.populateSettingsForm();
      this.updateConnectionUI();
    }

    // Scroll to top of content
    window.scrollTo({ top: 0, behavior: "smooth" });
  },

  async refreshDashboardStats() {
    await AnalyticsModule.initCharts();
  },

  updateConnectionBadge() {
    const badge = document.getElementById("header-connection-badge");
    if (!badge) return;

    if (CONFIG.isConfigured()) {
      badge.className = "px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-2 cursor-pointer hover:bg-emerald-500/20 transition";
      badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Supabase Connected`;
    } else {
      badge.className = "px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-2 cursor-pointer hover:bg-amber-500/20 transition";
      badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-400"></span> Disconnected (Setup Required)`;
    }
  },

  /**
   * Toggles database credentials card vs setup inputs.
   * If database is connected, Test Connection & Save Database buttons MUST NOT appear.
   */
  updateConnectionUI() {
    const connectedCard = document.getElementById("db-connected-card");
    const setupForm = document.getElementById("db-setup-form");
    const displayUrl = document.getElementById("display-connected-url");
    const displayKey = document.getElementById("display-connected-key");

    if (CONFIG.isConfigured()) {
      // Connected State: Hide setup form & buttons; show secure status card
      if (setupForm) setupForm.classList.add("hidden");
      if (connectedCard) connectedCard.classList.remove("hidden");

      if (displayUrl) displayUrl.textContent = CONFIG.currentUrl;
      if (displayKey) {
        displayKey.textContent = CONFIG.maskKey(CONFIG.currentKey);
        displayKey.dataset.masked = "true";
      }
    } else {
      // Disconnected State: Show setup inputs, test button, and save button
      if (connectedCard) connectedCard.classList.add("hidden");
      if (setupForm) setupForm.classList.remove("hidden");

      const urlInput = document.getElementById("settings-supabase-url");
      const keyInput = document.getElementById("settings-supabase-key");
      if (urlInput) urlInput.value = CONFIG.currentUrl || "";
      if (keyInput) keyInput.value = CONFIG.currentKey || "";
    }
  },

  // ==========================================
  // SETTINGS & SUPABASE CONNECTIVITY
  // ==========================================
  populateSettingsForm() {
    this.updateConnectionUI();
    this.loadCompanySettings();
  },

  async loadCompanySettings() {
    const settings = await DB.getSettings();
    const nameInput = document.getElementById("settings-company-name");
    const startInput = document.getElementById("settings-work-start");
    const endInput = document.getElementById("settings-work-end");
    const graceInput = document.getElementById("settings-grace-period");

    if (nameInput) nameInput.value = settings.company_name || "Apex Enterprise";
    if (startInput) startInput.value = (settings.office_start_time || "09:00").substring(0, 5);
    if (endInput) endInput.value = (settings.office_end_time || "18:00").substring(0, 5);
    if (graceInput) graceInput.value = settings.grace_period_minutes ?? 15;
  },

  setupSettingsView() {
    // 1. Password input visibility toggler (Setup form)
    const toggleKeyBtn = document.getElementById("btn-toggle-key-visibility");
    const keyInput = document.getElementById("settings-supabase-key");
    if (toggleKeyBtn && keyInput) {
      toggleKeyBtn.addEventListener("click", () => {
        const isPassword = keyInput.type === "password";
        keyInput.type = isPassword ? "text" : "password";
        toggleKeyBtn.innerHTML = isPassword
          ? `<i class="fa-solid fa-eye-slash text-xs"></i>`
          : `<i class="fa-solid fa-eye text-xs"></i>`;
      });
    }

    // 2. Connected Key unmasking toggler (Connected card)
    const toggleConnectedKeyBtn = document.getElementById("btn-toggle-connected-key");
    const displayKey = document.getElementById("display-connected-key");
    if (toggleConnectedKeyBtn && displayKey) {
      toggleConnectedKeyBtn.addEventListener("click", () => {
        const isMasked = displayKey.dataset.masked === "true";
        if (isMasked) {
          displayKey.textContent = CONFIG.currentKey;
          displayKey.dataset.masked = "false";
          toggleConnectedKeyBtn.innerHTML = `<i class="fa-solid fa-eye-slash text-xs"></i>`;
        } else {
          displayKey.textContent = CONFIG.maskKey(CONFIG.currentKey);
          displayKey.dataset.masked = "true";
          toggleConnectedKeyBtn.innerHTML = `<i class="fa-solid fa-eye text-xs"></i>`;
        }
      });
    }

    // 3. Test Supabase Connection (Only visible when disconnected)
    const testBtn = document.getElementById("btn-test-supabase");
    if (testBtn) {
      testBtn.addEventListener("click", async () => {
        const url = document.getElementById("settings-supabase-url").value.trim();
        const key = document.getElementById("settings-supabase-key").value.trim();

        if (!url || !key) {
          Swal.fire({ icon: "warning", title: "Missing Information", text: "Please enter your Supabase Project URL and Anon API Key." });
          return;
        }

        testBtn.disabled = true;
        testBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i> Testing Connection...`;

        const res = await CONFIG.testConnection(url, key);

        testBtn.disabled = false;
        testBtn.innerHTML = `<i class="fa-solid fa-plug mr-2"></i> Test Connection`;

        if (res.securityViolation) {
          CONFIG.playSound("error");
          Swal.fire({
            icon: "error",
            title: "Security Violation",
            html: `<div class="text-left text-xs space-y-2">
              <p><b>Never enter a service_role secret key in frontend applications!</b></p>
              <p>Service-role keys bypass Row Level Security and expose full administrative rights. Please provide your public <b>anon</b> key from Supabase Dashboard -> Project Settings -> API.</p>
            </div>`,
            confirmButtonColor: "#ef4444"
          });
          return;
        }

        if (res.success) {
          if (res.warning) {
            Swal.fire({
              icon: "warning",
              title: "Connected with Warning",
              text: res.message,
              confirmButtonColor: "#4f46e5"
            });
          } else {
            CONFIG.playSound("success");
            Swal.fire({
              icon: "success",
              title: "Connection Successful!",
              text: "Successfully verified communication with your Supabase database.",
              confirmButtonColor: "#10b981"
            });
          }
        } else {
          CONFIG.playSound("error");
          Swal.fire({
            icon: "error",
            title: "Connection Failed",
            text: res.message,
            confirmButtonColor: "#ef4444"
          });
        }
      });
    }

    // 4. Save Supabase Credentials (Only visible when disconnected)
    const saveDbBtn = document.getElementById("btn-save-db-settings");
    if (saveDbBtn) {
      saveDbBtn.addEventListener("click", async () => {
        const url = document.getElementById("settings-supabase-url").value.trim();
        const key = document.getElementById("settings-supabase-key").value.trim();

        if (!url || !key) {
          Swal.fire({ icon: "warning", title: "Missing Credentials", text: "Both Supabase URL and Anon Key are required." });
          return;
        }

        saveDbBtn.disabled = true;
        saveDbBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i> Securing & Connecting...`;

        const result = await CONFIG.saveCredentials(url, key);

        saveDbBtn.disabled = false;
        saveDbBtn.innerHTML = `<i class="fa-solid fa-floppy-disk mr-2"></i> Save & Connect Database`;

        if (result.securityViolation) {
          CONFIG.playSound("error");
          Swal.fire({
            icon: "error",
            title: "Security Alert: service_role Blocked",
            html: `<div class="text-left text-xs space-y-2">
              <p><b>You entered a service_role admin secret key.</b></p>
              <p>To protect your database integrity, frontend client applications are prohibited from using service_role credentials. Row Level Security must be enforced via the public <b>anon</b> key.</p>
              <p>Please enter your public <b>anon</b> key from Supabase Project Settings -> API.</p>
            </div>`,
            confirmButtonColor: "#ef4444"
          });
          return;
        }

        if (result.success) {
          this.updateConnectionBadge();
          this.updateConnectionUI(); // Hides test & save buttons immediately!
          this.hideSetupNotification();
          CONFIG.playSound("success");

          await this.refreshAllData();

          Swal.fire({
            icon: "success",
            title: "Connected & Secured!",
            text: "Your database is now connected. All employee and student records are synchronized directly with Supabase.",
            timer: 2200,
            showConfirmButton: false
          });
        } else {
          CONFIG.playSound("error");
          Swal.fire({ icon: "error", title: "Configuration Error", text: result.message || "Could not initialize Supabase client." });
        }
      });
    }

    // 5. Copy Schema to Clipboard
    const copySchemaBtn = document.getElementById("btn-copy-schema");
    if (copySchemaBtn) {
      copySchemaBtn.addEventListener("click", () => {
        const schemaText = document.getElementById("schema-code-display")?.innerText;
        if (schemaText) {
          navigator.clipboard.writeText(schemaText).then(() => {
            CONFIG.playSound("success");
            copySchemaBtn.innerHTML = `<i class="fa-solid fa-check text-emerald-400 mr-1.5"></i> Copied to Clipboard!`;
            setTimeout(() => {
              copySchemaBtn.innerHTML = `<i class="fa-regular fa-copy mr-1.5"></i> Copy SQL Schema`;
            }, 2500);
            Swal.fire({
              icon: "success",
              title: "Schema Copied!",
              text: "Now paste it in Supabase SQL Editor and click 'Run'.",
              timer: 2000,
              showConfirmButton: false
            });
          }).catch(() => {
            Swal.fire({ icon: "info", title: "Copy Schema", text: "Please manually select and copy the SQL code below." });
          });
        }
      });
    }

    // 6. Disconnect / Clear Credentials (Re-enables setup form with Test & Save buttons)
    const clearBtn = document.getElementById("btn-disconnect-db");
    if (clearBtn) {
      clearBtn.addEventListener("click", async () => {
        const confirm = await Swal.fire({
          title: "Disconnect Supabase?",
          text: "This will remove encrypted credentials from this browser session. The setup buttons will reappear to enter new credentials.",
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: "Yes, Disconnect",
          confirmButtonColor: "#ef4444"
        });

        if (!confirm.isConfirmed) return;

        CONFIG.clearCredentials();
        this.updateConnectionBadge();
        this.updateConnectionUI(); // Re-displays setup form and test/save buttons!
        this.showSetupNotification();

        await this.refreshAllData();
        Swal.fire({ icon: "info", title: "Disconnected", text: "Supabase credentials cleared.", timer: 1500, showConfirmButton: false });
      });
    }

    // 7. Save General Company Settings
    const saveCompanyBtn = document.getElementById("btn-save-company-settings");
    if (saveCompanyBtn) {
      saveCompanyBtn.addEventListener("click", async () => {
        if (!CONFIG.isConfigured()) {
          Swal.fire({ icon: "warning", title: "Supabase Not Connected", text: "Please connect your Supabase database first." });
          return;
        }

        const name = document.getElementById("settings-company-name").value.trim();
        const start = document.getElementById("settings-work-start").value;
        const end = document.getElementById("settings-work-end").value;
        const grace = parseInt(document.getElementById("settings-grace-period").value, 10) || 15;

        try {
          await DB.updateSettings({
            company_name: name,
            office_start_time: start + ":00",
            office_end_time: end + ":00",
            grace_period_minutes: grace
          });

          document.querySelectorAll(".company-brand-name").forEach(el => el.textContent = name);

          CONFIG.playSound("success");
          Swal.fire({ icon: "success", title: "Saved!", text: "Organization rules updated in Supabase.", timer: 1500, showConfirmButton: false });
        } catch (err) {
          CONFIG.playSound("error");
          Swal.fire({ icon: "error", title: "Update Failed", text: err.message });
        }
      });
    }
  },

  setupNavigation() {
    const sidebar = document.getElementById("app-sidebar");
    const backdrop = document.getElementById("sidebar-backdrop");

    const closeMobileSidebar = () => {
      if (sidebar) sidebar.classList.add("-translate-x-full");
      if (backdrop) backdrop.classList.add("hidden");
    };

    const openMobileSidebar = () => {
      if (sidebar) sidebar.classList.remove("-translate-x-full");
      if (backdrop) backdrop.classList.remove("hidden");
    };

    document.querySelectorAll(".nav-link").forEach(link => {
      link.addEventListener("click", e => {
        e.preventDefault();
        const view = link.dataset.view;
        if (view) this.switchView(view);
        // Automatically close sidebar on mobile tap
        if (window.innerWidth < 768) {
          closeMobileSidebar();
        }
      });
    });

    const badge = document.getElementById("header-connection-badge");
    if (badge) {
      badge.addEventListener("click", () => this.switchView("settings"));
    }

    // Mobile sidebar toggle button
    const toggleBtn = document.getElementById("mobile-menu-btn");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", () => {
        if (sidebar && sidebar.classList.contains("-translate-x-full")) {
          openMobileSidebar();
        } else {
          closeMobileSidebar();
        }
      });
    }

    // Close button inside mobile sidebar
    const mobileCloseBtn = document.getElementById("mobile-menu-close");
    if (mobileCloseBtn) {
      mobileCloseBtn.addEventListener("click", closeMobileSidebar);
    }

    // Click backdrop to dismiss sidebar on mobile
    if (backdrop) {
      backdrop.addEventListener("click", closeMobileSidebar);
    }
  }
};

window.App = App;

document.addEventListener("DOMContentLoaded", () => {
  App.init();
});
