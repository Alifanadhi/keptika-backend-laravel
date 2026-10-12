import { CONFIG } from './config.js';
import { api } from './api.js';

const ROLES = ['admin', 'guru', 'siswa'];

const HOME_ROUTES = {
  admin: '/dss-project/dss-frontend/pages/admin/dashboard.html',
  guru: '/dss-project/dss-frontend/pages/guru/input.html',
  siswa: '/dss-project/dss-frontend/pages/siswa/lapor.html'
};

function read() {
  try {
    const raw = sessionStorage.getItem(CONFIG.STORAGE_KEY);
    if (!raw) return null;

    const s = JSON.parse(raw);

    // REVISI: Normalisasi role menjadi lowercase sebelum divalidasi array ROLES
    const cleanRole = s.role ? s.role.toLowerCase() : '';

    if (!s.token || !ROLES.includes(cleanRole) || !s.expiresAt) {
      clear();
      return null;
    }

    if (Date.now() > s.expiresAt) {
      clear();
      return null;
    }

    // Pastikan data role yang dikembalikan sudah seragam huruf kecil
    s.role = cleanRole;
    return s;
  } catch {
    clear();
    return null;
  }
}

function write(session) {
  sessionStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(session));
}

function clear() {
  sessionStorage.removeItem(CONFIG.STORAGE_KEY);
}

export const auth = {
  session() {
    return read();
  },

  touch() {
    const s = read();
    if (!s) return;
    const timeout = CONFIG.SESSION_TIMEOUT_MS || (30 * 60 * 1000);
    s.expiresAt = Date.now() + timeout;
    write(s);
  },

  timeLeft() {
    const s = read();
    return s ? Math.max(0, s.expiresAt - Date.now()) : 0;
  },

  user() {
    const s = read();
    if (!s) return null;
    return {
      id: s.id,
      username: s.username,
      nama: s.nama || s.username 
    };
  },

  role() {
    return read()?.role ?? null;
  },

  token() { 
    return read()?.token ?? null; 
  },

  isLoggedIn() {
    return read() !== null;
  },

  async login(username, password) {
    // REVISI: Aktifkan tameng pembatasan login jika terdeteksi sedang kena hukuman lockout 5 menit
    const sisaWaktuKunci = this.lockoutRemaining();
    if (sisaWaktuKunci > 0) {
      const menit = Math.ceil(sisaWaktuKunci / 60000);
      throw new Error(`Terlalu banyak percobaan gagal. Akses terkunci, silakan tunggu ${menit} menit lagi.`);
    }

    const result = await api.login(username, password);
    
    // Gunakan optional chaining untuk memastikan response data valid
    if (result && result.user && result.token) {
      const timeout = CONFIG.SESSION_TIMEOUT_MS || (30 * 60 * 1000);
      
      const sessionData = {
        token: result.token,
        id: result.user.id,
        username: result.user.username,
        role: result.user.role.toLowerCase(), // REVISI UTAMA: Paksa role hasil API menjadi lowercase murni
        nama: result.user.nama || result.user.username,
        expiresAt: Date.now() + timeout 
      };
      
      write(sessionData);
      this._clearFailures();
      return result.user; 
    }
    
    // Catat kegagalan jika format tidak cocok atau user/password keliru
    this._recordFailure();
    throw new Error("Format data login tidak valid atau password salah.");
  },

  async logout() {
    try {
      await api.logout();
    } catch { /* diabaikan */ }
    clear();
    window.location.href = CONFIG.LOGIN_URL;
  },

  homeFor(role) {
    if (!role) return '/dss-project/dss-frontend/pages/login/index.html';
    const cleanRole = role.toLowerCase(); // Amankan parameter dari kapital huruf
    const target = HOME_ROUTES[cleanRole];
    if (!target) {
      console.error(`Role tidak dikenali: ${role}`);
      return '/dss-project/dss-frontend/pages/login/index.html';
    }
    return target;
  },

  // --- Rate limit login (UI saja) ---
  _failKey: 'dss.login.fail',

  _recordFailure() {
    const f = this._failures();
    f.count += 1;
    f.last = Date.now();
    localStorage.setItem(this._failKey, JSON.stringify(f));
  },

  _clearFailures() {
    localStorage.removeItem(this._failKey);
  },

  _failures() {
    try {
      return JSON.parse(localStorage.getItem(this._failKey)) || { count: 0, last: 0 };
    } catch {
      return { count: 0, last: 0 };
    }
  },

  lockoutRemaining() {
    const f = this._failures();
    const limit = CONFIG.LOGIN_LOCKOUT_MS || 300000; // 5 menit default
    if (f.count < (CONFIG.LOGIN_MAX_ATTEMPTS || 5)) return 0;
    const diff = Date.now() - f.last;
    
    // Jika waktu hukuman 5 menit sudah lewat, bersihkan otomatis counter kegagalannya
    if (diff >= limit) {
      this._clearFailures();
      return 0;
    }
    return limit - diff;
  },

  attemptsLeft() {
    const max = CONFIG.LOGIN_MAX_ATTEMPTS || 5;
    return Math.max(0, max - this._failures().count);
  }
};