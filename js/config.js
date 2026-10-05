/**
 * Supabase Configuration & Web Audio Layer
 * Manages Supabase client credentials and connection state
 */

const CONFIG = {
  STORAGE_KEYS: {
    SUPABASE_URL: "ams_supabase_url",
    SUPABASE_ANON_KEY: "ams_supabase_anon_key"
  },

  client: null,

  init() {
    const url = localStorage.getItem(this.STORAGE_KEYS.SUPABASE_URL);
    const key = localStorage.getItem(this.STORAGE_KEYS.SUPABASE_ANON_KEY);

    if (url && key && window.supabase) {
      try {
        this.client = window.supabase.createClient(url.trim(), key.trim());
        console.log("Supabase Client initialized successfully.");
        return true;
      } catch (err) {
        console.error("Failed to initialize Supabase client:", err);
        this.client = null;
        return false;
      }
    } else {
      this.client = null;
      console.log("Supabase credentials not configured.");
      return false;
    }
  },

  isConfigured() {
    return this.client !== null;
  },

  getCredentials() {
    return {
      url: localStorage.getItem(this.STORAGE_KEYS.SUPABASE_URL) || "",
      anonKey: localStorage.getItem(this.STORAGE_KEYS.SUPABASE_ANON_KEY) || ""
    };
  },

  saveCredentials(url, key) {
    if (url) localStorage.setItem(this.STORAGE_KEYS.SUPABASE_URL, url.trim());
    if (key) localStorage.setItem(this.STORAGE_KEYS.SUPABASE_ANON_KEY, key.trim());
    return this.init();
  },

  clearCredentials() {
    localStorage.removeItem(this.STORAGE_KEYS.SUPABASE_URL);
    localStorage.removeItem(this.STORAGE_KEYS.SUPABASE_ANON_KEY);
    this.client = null;
  },

  /**
   * Test Supabase connection with provided credentials
   */
  async testConnection(url, anonKey) {
    if (!window.supabase) {
      return { success: false, message: "Supabase JS client library not loaded. Check internet connection." };
    }
    if (!url || !anonKey) {
      return { success: false, message: "Please provide both Supabase Project URL and Anon API Key." };
    }

    try {
      const testClient = window.supabase.createClient(url.trim(), anonKey.trim());
      // Test query to check if database tables exist
      const { data, error } = await testClient.from("organization_settings").select("id").limit(1);

      if (error) {
        if (error.code === "42P01" || error.message.includes("does not exist") || error.code === "PGRST205") {
          return {
            success: true,
            warning: true,
            message: "Connected to Supabase, but schema tables are not yet created! Run schema.sql in Supabase SQL Editor or click 'Bootstrap New Database Tables'."
          };
        }
        return { success: false, message: error.message };
      }

      return { success: true, message: "Successfully connected to Supabase database!" };
    } catch (err) {
      return { success: false, message: err.message || "Failed to reach Supabase server." };
    }
  },

  /**
   * Synthesize real-time audio chimes with Web Audio API (zero external MP3 files)
   */
  playSound(type = "success") {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (type === "success") {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.exponentialRampToValueAtTime(880.00, now + 0.15); // A5
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === "error") {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.setValueAtTime(160, now + 0.1);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === "punch") {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.12);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
      }
    } catch (e) {
      // Audio autoplay policy catch
    }
  }
};

window.CONFIG = CONFIG;
