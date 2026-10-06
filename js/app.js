/**
 * Main Application Orchestrator
 * Controls navigation, Supabase connectivity, database initialization, and view routing
 */

const App = {
  currentView: "dashboard",

  async init() {
    console.log("Initializing Attendance Management System...");

    // 1. Initialize Configuration & Database
    const isConnected = CONFIG.init();
    DB.init();

    // 2. Setup Top-bar Connection Badge & Nav
    this.updateConnectionBadge();
    this.setupNavigation();
    this.setupSettingsView();

    // 3. Initialize Child Modules
    AttendanceModule.init();
    EmployeeModule.init();
    LeaveModule.init();
    ReportsModule.init();

    // 4. Check if Supabase credentials are configured
    if (!isConnected) {
      console.warn("Supabase credentials not found. Directing to setup.");
      this.showSetupNotification();
      this.switchView("settings");
    } else {
      // Load real Supabase data
      await this.refreshAllData();

      // Route to requested hash or dashboard
      const hash = window.location.hash.replace("#", "");
      if (hash && ["dashboard", "kiosk", "attendance", "employees", "leaves", "reports", "settings"].includes(hash)) {
        this.switchView(hash);
      } else {
        this.switchView("dashboard");
      }
    }

    console.log("Attendance Management System ready.");
  },

  async refreshAllData() {
    await EmployeeModule.loadEmployees();
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
    } else if (viewName === "leaves") {
      LeaveModule.loadLeaves();
    } else if (viewName === "reports") {
      ReportsModule.loadReports();
    } else if (viewName === "settings") {
      this.populateSettingsForm();
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

  // ==========================================
  // SETTINGS & SUPABASE CONNECTIVITY
  // ==========================================
  populateSettingsForm() {
    const creds = CONFIG.getCredentials();
    const urlInput = document.getElementById("settings-supabase-url");
    const keyInput = document.getElementById("settings-supabase-key");

    if (urlInput) urlInput.value = creds.url;
    if (keyInput) keyInput.value = creds.anonKey;

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
    // Test Supabase Connection
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

    // Save Supabase Credentials
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
        saveDbBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i> Connecting...`;

        const connected = CONFIG.saveCredentials(url, key);
        this.updateConnectionBadge();

        if (connected) {
          this.hideSetupNotification();
          CONFIG.playSound("success");
          await this.refreshAllData();

          Swal.fire({
            icon: "success",
            title: "Connected to Supabase!",
            text: "All personnel, attendance records, and leave requests will now be retrieved directly from your Supabase database.",
            timer: 2200,
            showConfirmButton: false
          });
        } else {
          CONFIG.playSound("error");
          Swal.fire({ icon: "error", title: "Configuration Error", text: "Could not initialize Supabase client with provided credentials." });
        }

        saveDbBtn.disabled = false;
        saveDbBtn.innerHTML = `<i class="fa-solid fa-floppy-disk mr-2"></i> Save & Connect Database`;
      });
    }

    // Copy Schema to Clipboard
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

    // Disconnect / Clear Credentials
    const clearBtn = document.getElementById("btn-disconnect-db");
    if (clearBtn) {
      clearBtn.addEventListener("click", async () => {
        const confirm = await Swal.fire({
          title: "Disconnect Supabase?",
          text: "This will remove stored credentials from this browser session.",
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: "Yes, Disconnect",
          confirmButtonColor: "#ef4444"
        });

        if (!confirm.isConfirmed) return;

        CONFIG.clearCredentials();
        this.updateConnectionBadge();
        this.showSetupNotification();
        document.getElementById("settings-supabase-url").value = "";
        document.getElementById("settings-supabase-key").value = "";

        await this.refreshAllData();
        Swal.fire({ icon: "info", title: "Disconnected", text: "Supabase credentials cleared.", timer: 1500, showConfirmButton: false });
      });
    }

    // Save General Company Settings
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
