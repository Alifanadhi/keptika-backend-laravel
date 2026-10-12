/**
 * Satu-satunya tempat frontend menyentuh backend.
 * Tidak ada fetch() di file lain.
 *
 * Endpoint mengikuti docs/api-contract.md (Disesuaikan langsung ke PHP Native).
 */

import { CONFIG } from './config.js';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * CORE FETCH UTILITY: Mengamankan pemanggilan AJAX ter-otorisasi
 * Diubah namanya menjadi kirimRequest untuk menghindari bentrokan identifier (SyntaxError)
 */
async function kirimRequest(method, path, body = null) {
  const baseUrl = '/dss-project/dss-backend/api'; // Mengunci absolute path backend proyek lokal Apache

  // Ambil token session secara konsisten dari sessionStorage sesuai dengan auth.js
  const raw = sessionStorage.getItem(CONFIG.STORAGE_KEY || 'dss.session');
  const token = raw ? JSON.parse(raw).token : null;

  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  let responsFetch;
  try {
    responsFetch = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new ApiError('Tidak dapat terhubung ke server. Periksa koneksi Anda.', 0);
  }

  // Intersepsi Global: 401 dari endpoint mana pun = sesi tidak lagi sah
  if (responsFetch.status === 401) {
    sessionStorage.removeItem(CONFIG.STORAGE_KEY || 'dss.session');
    sessionStorage.setItem('dss.expired', '1');
    window.location.replace(CONFIG.LOGIN_URL);
    throw new ApiError('Sesi Anda berakhir.', 401);
  }

  // Cegah JSON Parsing Failure jika endpoint merespons teks HTML error
  const data = await responsFetch.json().catch(() => ({}));

  console.log('Respons dari Backend:', JSON.stringify(data, null, 2));

  if (!responsFetch.ok) {
    throw new ApiError(data.message || 'Terjadi kesalahan pada server.', responsFetch.status);
  }

  return data;
}

// Shortcuts HTTP Method
const get  = (p)    => kirimRequest('GET', p);
const post = (p, b) => kirimRequest('POST', p, b);
const put  = (p, b) => kirimRequest('PUT', p, b);
const del  = (p)    => kirimRequest('DELETE', p);

// Ekspor tunggal modul API terpusat untuk seluruh halaman frontend
export const api = {

  // ---- Auth Modules ----
  login(username, password) {
    return post('/auth.php?request=login', { username, password });
  },

  logout() {
    return post('/auth.php?request=logout');
  },

  me() {
    return get('/auth.php?request=me');
  },

  changePassword(passwordLama, passwordBaru) {
    return put('/auth.php?request=password', {
      password_lama: passwordLama,
      password_baru: passwordBaru
    });
  },

  // ---- Guru Modules ----
 guru: {
    listSiswa() {
      return get('/guru.php?request=siswa');
    },

    // TAMBAHKAN ENDPOINT INI
    listKompetensi(programId = '') {
      const q = programId ? `&program_id=${programId}` : '';
      return get(`/guru.php?request=kompetensi${q}`);
    },

    listLaporanAktif() {
      return get('/guru.php?request=laporan-aktif');
    },

    simpanPenilaian(payload) {
      return post('/guru.php?request=penilaian', payload);
    },

    detailSiswa(siswaId) {
      return get(`/guru.php?request=siswa/${siswaId}`);
    },

    dashboardKelas(kelasId, kompetensiId) {
      return get(`/guru.php?request=kelas/${kelasId}/dashboard&kompetensi_id=${kompetensiId}`);
    },

    updateStatus(penilaianId, status) {
      return put(`/guru.php?request=penilaian/${penilaianId}/status`, { status });
    },

    notifikasi() {
      return get('/guru.php?request=notifikasi');
    }
  },

  // ---- Siswa Modules ----
  siswa: {
    kirimLaporan(payload) {
      return post('/siswa.php?request=laporan', payload);
    },

    riwayat() {
      return get('/siswa.php?request=riwayat');
    },

    notifikasi() {
      return get('/siswa.php?request=notifikasi');
    },

    profil() {
      return get('/siswa.php?request=profil');
    }
  },

  // ---- Admin Modules ----
  admin: {
    listUser(params = {}) {
      const q = new URLSearchParams(params).toString();
      return get(`/admin.php?request=user&${q}`);
    },

    createUser(payload) {
      return post('/admin.php?request=user', payload);
    },

    updateUser(id, payload) {
      return put(`/admin.php?request=user/${id}`, payload);
    },

    deleteUser(id) {
      return del(`/admin.php?request=user/${id}`);
    },

    resetPassword(id, passwordBaru) {
      return put(`/admin.php?request=user/${id}/password`, { password_baru: passwordBaru });
    },

    // --- Program Keahlian ---
    listProgram() {
      return get('/admin.php?request=program');
    },

    simpanProgram(payload) {
      return post('/admin.php?request=program', payload);
    },

    hapusProgram(id) {
      return del(`/admin.php?request=program/${id}`);
    },

    // --- Kompetensi ---
    listKompetensi(params = {}) {
      const q = new URLSearchParams(params).toString();
      return get(`/admin.php?request=kompetensi&${q}`);
    },

    detailKompetensi(id) {
      return get(`/admin.php?request=kompetensi/${id}`);
    },

    simpanKompetensi(payload) {
      if (payload.id) {
        return post(`/admin.php?request=kompetensi/${payload.id}`, payload);
      }
      return post('/admin.php?request=kompetensi', payload);
    },

    hapusKompetensi(id) {
      return del(`/admin.php?request=kompetensi/${id}`);
    },

    // --- Kelas ---
    listKelas(params = {}) {
      const q = new URLSearchParams(params).toString();
      return get(`/admin.php?request=kelas&${q}`);
    },

    simpanKelas(payload) {
      return payload.id
        ? put(`/admin.php?request=kelas/${payload.id}`, payload)
        : post('/admin.php?request=kelas', payload);
    },

    hapusKelas(id) {
      return del(`/admin.php?request=kelas/${id}`);
    },

    siswaKelas(kelasId) {
      return get(`/admin.php?request=kelas/${kelasId}/siswa`);
    },

    assignSiswa(kelasId, siswaIds) {
      return post(`/admin.php?request=kelas/${kelasId}/siswa`, { siswa_id_list: siswaIds });
    },

    keluarkanSiswa(siswaId) {
      return del(`/admin.php?request=kelas/siswa/${siswaId}`);
    },

    listSiswaTanpaKelas() {
      return get('/admin.php?request=siswa-tanpa-kelas');
    },

    // --- Registrasi massal (upload Excel) ---
    importSiswaMassal(payload) {
      return post('/admin.php?request=user-bulk', payload);
    },

    // --- Dashboard & Audit ---
    dashboard() {
      return get('/admin.php?request=dashboard');
    },

    auditLog(params = {}) {
      const q = new URLSearchParams(params).toString();
      return get(`/admin.php?request=audit-log&${q}`);
    }
  }
};