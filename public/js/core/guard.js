// js/core/guard.js
// Skrip ini di-import di setiap halaman aplikasi (dashboard, input, lapor) untuk membatasi hak akses.

import { auth } from './auth.js';
import { CONFIG } from './config.js';

/**
 * REVISI: Mengubah IIFE menjadi Named Export agar memenuhi syntax
 * import { guard } dari file HTML/JS frontend Anda.
 */
export function guard() {
  // 1. Ambil pathname halaman saat ini untuk menentukan proteksi area
  const pathname = window.location.pathname.toLowerCase();
  
  // 2. Jika user sama sekali belum login, langsung amankan balik ke halaman login
  if (!auth.isLoggedIn()) {
    console.warn("Akses ditolak: User belum terautentikasi.");
    // Simpan jalur asal agar setelah login bisa kembali ke sini
    sessionStorage.setItem('dss.redirect', window.location.pathname);
    window.location.replace(CONFIG.LOGIN_URL || '/dss-project/dss-frontend/pages/login/index.html');
    return false;
  }

  // 3. Ambil data role aktif dan paksa menjadi lowercase untuk menghindari casing mismatch
  const currentRole = auth.role() ? auth.role().toLowerCase() : '';

  // OPTIMASI FRONTEND: Mengomentari log debug untuk menjaga konsol DevTools tetap bersih
  /*
  console.log({
    debugGuard: "Memeriksa otoritas halaman...",
    path: pathname,
    roleAktif: currentRole,
    statusLogin: auth.isLoggedIn()
  });
  */

  // 4. PROTEKSI AREA: Validasi apakah role user berhak mengakses folder halaman ini
  if (pathname.includes('/pages/admin/') && currentRole !== 'admin') {
    handleUnauthorized("Akses area admin ditolak untuk role: " + currentRole);
    return false;
  } 
  
  else if (pathname.includes('/pages/guru/') && currentRole !== 'guru') {
    handleUnauthorized("Akses area guru ditolak untuk role: " + currentRole);
    return false;
  } 
  
  else if (pathname.includes('/pages/siswa/') && currentRole !== 'siswa') {
    handleUnauthorized("Akses area siswa ditolak untuk role: " + currentRole);
    return false;
  }

  return true;
}

/**
 * Helper untuk menolak akses secara aman tanpa merusak session login utama
 */
function handleUnauthorized(reason) {
  console.warn(reason);
  
  // Ambil rute default bawaan dari auth.js core berdasarkan role riilnya
  const currentRole = auth.role() ? auth.role().toLowerCase() : '';
  const safeHome = auth.homeFor(currentRole);
  
  // Jalankan penanda session expired jika memang benar-benar salah halaman
  sessionStorage.setItem('dss.redirect', safeHome);
  
  // Alihkan user ke rumahnya yang sah, alih-alih melempar paksa ke login
  window.location.replace(safeHome);
}

/**
 * PENGAMAN OTOMATIS: Tetap menjalankan guard secara langsung saat file 
 * pertama kali di-load (menjaga kecocokan dengan script tipe module di HTML).
 */
(function autoCheck() {
  guard();
})();