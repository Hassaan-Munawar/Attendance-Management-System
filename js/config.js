/**
 * Supabase Configuration, Web Audio Layer, and Cryptographic Security
 * Manages secure Supabase client credentials, service_role protection, and connection state
 */

const CryptoSecurity = {
  // Web Crypto API Key derivation
  async getKey() {
    if (!window.crypto || !window.crypto.subtle) return null;
    try {
      const keyMaterial = await window.crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode("ams-supa-secure-app-2026-attendance-layer"),
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
      );
      return await window.crypto.subtle.deriveKey(
        {
          name: "PBKDF2",
          salt: new TextEncoder().encode("ams_enterprise_salt_salt_9981"),
          iterations: 10000,
          hash: "SHA-256"
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
      );
    } catch (e) {
      console.warn("Web Crypto Subtle key derivation failed, using fallback:", e);
      return null;
    }
  },

  async encrypt(text) {
    if (!text) return "";
    try {
      const key = await this.getKey();
      if (key && window.crypto && window.crypto.subtle) {
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const encoded = new TextEncoder().encode(text);
        const encrypted = await window.crypto.subtle.encrypt(
          { name: "AES-GCM", iv: iv },
          key,
          encoded
        );
        const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, "0")).join("");
        const ctBase64 = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
        return `enc_v2:${ivHex}:${ctBase64}`;
      }
    } catch (e) {
      console.warn("AES-GCM encryption failed, using obfuscation fallback:", e);
    }
    // Safe obfuscation fallback if Web Crypto is unavailable (e.g. non-HTTPS local setups)
    return "obf_v1:" + btoa(encodeURIComponent(text));
  },

  async decrypt(ciphertext) {
    if (!ciphertext) return "";
    if (ciphertext.startsWith("obf_v1:")) {
      try {
        return decodeURIComponent(atob(ciphertext.replace("obf_v1:", "")));
      } catch (e) {
        return "";
      }
    }
    if (ciphertext.startsWith("enc_v2:")) {
      try {
        const parts = ciphertext.split(":");
        const ivHex = parts[1];
        const ctBase64 = parts[2];
        const iv = new Uint8Array(ivHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
        const ctBytes = Uint8Array.from(atob(ctBase64), c => c.charCodeAt(0));
        const key = await this.getKey();
        if (key) {
          const decrypted = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv },
            key,
            ctBytes
          );
          return new TextDecoder().decode(decrypted);
        }
      } catch (e) {
        console.warn("AES-GCM decryption failed:", e);
        return "";
      }
    }
    // Backward compatibility for raw legacy stored values (migrates immediately)
    return ciphertext;
  }
};

const CONFIG = {
  STORAGE_KEYS: {
    SUPABASE_URL: "ams_supabase_url_sec",
    SUPABASE_ANON_KEY: "ams_supabase_anon_key_sec",
    LEGACY_URL: "ams_supabase_url",
    LEGACY_KEY: "ams_supabase_anon_key",
    SYSTEM_PURPOSE: "ams_system_purpose"
  },

  client: null,
  currentUrl: "",
  currentKey: "",

  getPurpose() {
    return localStorage.getItem(this.STORAGE_KEYS.SYSTEM_PURPOSE) || "both";
  },

  setPurpose(purpose) {
    if (["both", "staff", "students"].includes(purpose)) {
      localStorage.setItem(this.STORAGE_KEYS.SYSTEM_PURPOSE, purpose);
    }
  },

  /**
   * Inspects a JWT to check if it has the dangerous service_role claim
   */
  isServiceRoleKey(key) {
    if (!key || typeof key !== "string") return false;
    try {
      const parts = key.trim().split(".");
      if (parts.length === 3) {
        const payloadJson = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
        const payload = JSON.parse(payloadJson);
        if (payload && (payload.role === "service_role" || payload.role === "supabase_admin")) {
          return true;
        }
      }
    } catch (e) {
      // In case key format is not standard JWT or parsing fails
    }
    return false;
  },

  /**
   * Sanitizes and validates the Supabase URL
   */
  sanitizeUrl(url) {
    if (!url) return "";
    let clean = url.trim().replace(/\/+$/, "");
    if (!clean.startsWith("https://") && !clean.startsWith("http://")) {
      clean = "https://" + clean;
    }
    return clean;
  },

  /**
   * Masks sensitive anon key for safe UI display
   */
  maskKey(key) {
    if (!key) return "";
    if (key.length <= 16) return "••••••••••••••••";
    const start = key.slice(0, 10);
    const end = key.slice(-4);
    return `${start}••••••••••••••••${end}`;
  },

  /**
   * Initialize Supabase client from encrypted storage
   */
  async init() {
    let rawUrl = localStorage.getItem(this.STORAGE_KEYS.SUPABASE_URL);
    let rawKey = localStorage.getItem(this.STORAGE_KEYS.SUPABASE_ANON_KEY);

    // Check legacy storage if encrypted storage not yet created
    if (!rawUrl && !rawKey) {
      rawUrl = localStorage.getItem(this.STORAGE_KEYS.LEGACY_URL);
      rawKey = localStorage.getItem(this.STORAGE_KEYS.LEGACY_KEY);
      // Migrate immediately to encrypted storage
      if (rawUrl && rawKey) {
        await this.saveCredentials(rawUrl, rawKey);
        localStorage.removeItem(this.STORAGE_KEYS.LEGACY_URL);
        localStorage.removeItem(this.STORAGE_KEYS.LEGACY_KEY);
        return this.isConfigured();
      }
    }

    if (rawUrl && rawKey) {
      const url = await CryptoSecurity.decrypt(rawUrl);
      const key = await CryptoSecurity.decrypt(rawKey);

      // Verify no service_role key is used
      if (this.isServiceRoleKey(key)) {
        console.error("Security Alert: Stored key is service_role. Clearing immediately.");
        this.clearCredentials();
        return false;
      }

      if (url && key && window.supabase) {
        try {
          this.currentUrl = url.trim();
          this.currentKey = key.trim();
          this.client = window.supabase.createClient(this.currentUrl, this.currentKey);
          console.log("Supabase Client initialized securely.");
          return true;
        } catch (err) {
          console.error("Failed to initialize Supabase client:", err);
          this.client = null;
          return false;
        }
      }
    }

    this.client = null;
    this.currentUrl = "";
    this.currentKey = "";
    return false;
  },

  isConfigured() {
    return this.client !== null && !!this.currentUrl && !!this.currentKey;
  },

  getCredentials() {
    return {
      url: this.currentUrl || "",
      anonKey: this.currentKey || ""
    };
  },

  /**
   * Saves credentials with encryption and service_role security check
   */
  async saveCredentials(url, key) {
    const cleanUrl = this.sanitizeUrl(url);
    const cleanKey = key ? key.trim() : "";

    if (!cleanUrl || !cleanKey) {
      return { success: false, message: "Please provide both Supabase Project URL and Anon API Key." };
    }

    // Security check: Reject service_role admin secret key
    if (this.isServiceRoleKey(cleanKey)) {
      return {
        success: false,
        securityViolation: true,
        message: "SECURITY ALERT: You entered a 'service_role' secret key! Never use the service_role key in frontend browser code because it bypasses all Row Level Security and gives unrestricted administrative access. Please enter your project's public 'anon' key instead."
      };
    }

    try {
      const encryptedUrl = await CryptoSecurity.encrypt(cleanUrl);
      const encryptedKey = await CryptoSecurity.encrypt(cleanKey);

      localStorage.setItem(this.STORAGE_KEYS.SUPABASE_URL, encryptedUrl);
      localStorage.setItem(this.STORAGE_KEYS.SUPABASE_ANON_KEY, encryptedKey);

      this.currentUrl = cleanUrl;
      this.currentKey = cleanKey;

      if (window.supabase) {
        this.client = window.supabase.createClient(this.currentUrl, this.currentKey);
        return { success: true };
      } else {
        return { success: false, message: "Supabase JS library not loaded. Check internet connection." };
      }
    } catch (e) {
      return { success: false, message: e.message || "Failed to securely save credentials." };
    }
  },

  clearCredentials() {
    localStorage.removeItem(this.STORAGE_KEYS.SUPABASE_URL);
    localStorage.removeItem(this.STORAGE_KEYS.SUPABASE_ANON_KEY);
    localStorage.removeItem(this.STORAGE_KEYS.LEGACY_URL);
    localStorage.removeItem(this.STORAGE_KEYS.LEGACY_KEY);
    this.client = null;
    this.currentUrl = "";
    this.currentKey = "";
  },

  /**
   * Test Supabase connection with provided credentials and service_role guard
   */
  async testConnection(url, anonKey) {
    if (!window.supabase) {
      return { success: false, message: "Supabase JS client library not loaded. Check internet connection." };
    }

    const cleanUrl = this.sanitizeUrl(url);
    const cleanKey = anonKey ? anonKey.trim() : "";

    if (!cleanUrl || !cleanKey) {
      return { success: false, message: "Please provide both Supabase Project URL and Anon API Key." };
    }

    // Security check: Block service_role key
    if (this.isServiceRoleKey(cleanKey)) {
      return {
        success: false,
        securityViolation: true,
        message: "SECURITY ALERT: You entered a 'service_role' secret key! Do NOT test or use this key on the client side. Please provide your public 'anon' key."
      };
    }

    try {
      const testClient = window.supabase.createClient(cleanUrl, cleanKey);
      // Query settings table to check connectivity
      const { data, error } = await testClient.from("organization_settings").select("id").limit(1);

      if (error) {
        if (error.code === "42P01" || error.message.includes("does not exist") || error.code === "PGRST205") {
          return {
            success: true,
            warning: true,
            message: "Connected to Supabase, but schema tables are not yet created! Run schema.sql in your Supabase SQL Editor."
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
