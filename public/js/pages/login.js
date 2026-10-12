// Halaman login.

import { auth } from '../core/auth.js';
import { CONFIG } from '../core/config.js';

const form     = document.getElementById('login-form');
const username = document.getElementById('username');
const password = document.getElementById('password');
const btn      = document.getElementById('submit-btn');
const btnLabel = document.getElementById('submit-label');
const slot     = document.getElementById('alert-slot');

// Sudah login? Jangan tampilkan form
/* Kalau tidak dicegat, user yang sudah masuk lalu
   menekan Back akan melihat form login lagi —
   membingungkan, dan mengundang mereka login ulang
   tanpa perlu. */

if (auth.isLoggedIn()) {
  window.location.replace(auth.homeFor(auth.role()));
}

// Pesan dari halaman lain
/* Sesi habis di halaman guru → guard.js menaruh
   penanda → kita jelaskan di sini kenapa mereka
   tiba-tiba ada di layar login. */

if (sessionStorage.getItem('dss.expired')) {
  sessionStorage.removeItem('dss.expired');
  showAlert('warning', 'Sesi Anda berakhir karena tidak ada aktivitas. Masuk kembali untuk melanjutkan.');
}

// Kunci akibat terlalu banyak percobaan

checkLockout();

function checkLockout() {
  const ms = auth.lockoutRemaining();
  if (ms <= 0) return false;

  const menit = Math.ceil(ms / 60000);
  showAlert('danger', `Terlalu banyak percobaan gagal. Coba lagi dalam ${menit} menit.`);
  setBusy(true, 'Terkunci');
  btn.disabled = true;

  /* Hitung mundur. Saat habis, buka sendiri —
     user tidak perlu me-refresh halaman. */
  const t = setInterval(() => {
    if (auth.lockoutRemaining() <= 0) {
      clearInterval(t);
      clearAlert();
      setBusy(false);
    }
  }, 1000);

  return true;
}

// Toggle tampil/sembunyi sandi

const toggle = document.getElementById('toggle-password');
const eyeOn  = document.getElementById('eye-open');
const eyeOff = document.getElementById('eye-off');

toggle.addEventListener('click', () => {
  const show = password.type === 'password';
  password.type = show ? 'text' : 'password';
  eyeOn.classList.toggle('hidden', show);
  eyeOff.classList.toggle('hidden', !show);
  toggle.setAttribute(
    'aria-label',
    show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'
  );
  password.focus();
});

// Submit

form.addEventListener('submit', async e => {
  e.preventDefault();

  if (checkLockout()) return;

  clearAlert();
  clearFieldErrors();

  const u = username.value.trim();
  const p = password.value;

  /* Validasi klien hanya menangkap kolom kosong.
     Verifikasi sebenarnya milik server. */
  if (!u || !p) {
    if (!u) markError(username);
    if (!p) markError(password);
    showAlert('danger', 'Isi username dan kata sandi.');
    (!u ? username : password).focus();
    return;
  }

  setBusy(true, 'Memeriksa');

  try {
    const user = await auth.login(u, p);

    /* Jangan lepas state loading. Halaman akan
       berpindah — kalau tombol kembali normal
       sekejap, terasa seperti gagal lalu berhasil. */
    btnLabel.textContent = 'Masuk';

    /* Kembalikan ke halaman yang tadi dituju, kalau ada.
       Tapi hanya jika tujuan itu memang milik peran
       mereka — kalau tidak, siswa bisa diarahkan ke
       halaman admin. */
    const intended = sessionStorage.getItem('dss.redirect');
    sessionStorage.removeItem('dss.redirect');

    // MENGUNCI LOGIKA REDIREKSI DI SINI
    const target = safeRedirect(intended, user.role)
      ?? auth.homeFor(user.role);

    console.log({
      message: "Autentikasi sukses, mengalihkan...",
      intendedPath: intended,
      userRole: user.role,
      calculatedTarget: target
    });

    window.location.replace(target);

  } catch (err) {
    setBusy(false);

    const sisa = auth.attemptsLeft();
    const catatan = sisa > 0 && sisa <= 2
      ? ` Sisa ${sisa} percobaan sebelum akun terkunci sementara.`
      : '';

    showAlert('danger', err.message + catatan);

    markError(username);
    markError(password);
    password.value = '';
    password.focus();

    checkLockout();
  }
});

/**
 * REVISI TOTAL: Mengubah logika verifikasi agar fleksibel
 * terhadap kedalaman subfolder server lokal (/dss-project/dss-frontend/)
 * sekaligus mengamankan open-redirect.
 */
/**
 * REVISI SAFE REDIRECT:
 * Lebih fleksibel membaca URL tujuan siswa baik yang berada di subfolder
 * maupun yang menggunakan prefix nama file (seperti siswa-lapor.html).
 */
function safeRedirect(pathname, role) {
  if (!pathname || typeof pathname !== 'string') return null;

  const cleanPath = pathname.toLowerCase();
  const cleanRole = role.toLowerCase();

  // Validasi format file harus berakhiran .html
  if (!cleanPath.endsWith('.html')) return null;

  // 1. Cek jika path mengandung subfolder role, misal: /pages/siswa/dashboard.html
  const matchFolder = cleanPath.includes(`/pages/${cleanRole}/`);

  // 2. Cek jika path menggunakan prefix file role, misal: siswa-lapor.html atau pages/siswa-lapor.html
  const matchPrefix = cleanPath.includes(`${cleanRole}-`) || cleanPath.includes(`/${cleanRole}`);

  if (matchFolder || matchPrefix) {
    return pathname;
  }

  return null;
}

// Helper UI

function setBusy(busy, label = 'Masuk') {
  btn.disabled = busy;
  username.disabled = busy;
  password.disabled = busy;

  btnLabel.textContent = busy ? label : 'Masuk';

  const old = btn.querySelector('.btn__spinner');
  if (busy && !old) {
    const s = document.createElement('span');
    s.className = 'btn__spinner';
    btn.prepend(s);
  } else if (!busy && old) {
    old.remove();
  }
}

function showAlert(type, msg) {
  slot.innerHTML = `
    <div class="alert alert--${type} alert--enter">
      <span class="alert__icon" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="10" cy="10" r="7.5"/>
          <path d="M10 6.3v4.2M10 13.6h.01"/>
        </svg>
      </span>
      <span>${escape(msg)}</span>
    </div>
  `;
}

function clearAlert() { slot.innerHTML = ''; }

function markError(el) { el.classList.add('input--error'); }

function clearFieldErrors() {
  username.classList.remove('input--error');
  password.classList.remove('input--error');
}

/* Hapus tanda error begitu user mulai memperbaiki.
   Membiarkan border merah sementara mereka mengetik
   terasa menghakimi. */
[username, password].forEach(el => {
  el.addEventListener('input', () => {
    el.classList.remove('input--error');
  });
});

function escape(s) {
  const d = document.createElement('div');
  d.textContent = String(s);
  return d.innerHTML;
}

// Kredensial demo — hapus sebelum deploy.