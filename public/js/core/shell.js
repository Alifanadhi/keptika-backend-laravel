import { auth } from './auth.js';
import { api } from './api.js';
import { konfirmasi } from './dialog.js';

const I = {
  input:   '<path d="M8 2.5h8a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5H4A1.5 1.5 0 0 1 2.5 16V4A1.5 1.5 0 0 1 4 2.5h4Z"/><path d="M6 7.5h6M6 10.5h6M6 13.5h3.5"/>',
  user:    '<circle cx="10" cy="6.8" r="3.3"/><path d="M3.8 17a6.2 6.2 0 0 1 12.4 0"/>',
  grid:    '<rect x="2.6" y="2.6" width="6" height="6" rx="1.2"/><rect x="11.4" y="2.6" width="6" height="6" rx="1.2"/><rect x="2.6" y="11.4" width="6" height="6" rx="1.2"/><rect x="11.4" y="11.4" width="6" height="6" rx="1.2"/>',
  chart:   '<path d="M3 17V8.5M8.3 17V3.5M13.6 17v-6M18 17H2"/>',
  clip:    '<path d="M7.5 3.5H6A1.5 1.5 0 0 0 4.5 5v11A1.5 1.5 0 0 0 6 17.5h8a1.5 1.5 0 0 0 1.5-1.5V5A1.5 1.5 0 0 0 14 3.5h-1.5"/><rect x="7.5" y="2" width="5" height="3" rx="1"/><path d="M7.5 9.5h5M7.5 12.5h3"/>',
  history: '<path d="M2.8 10a7.2 7.2 0 1 0 2.1-5.1"/><path d="M2.5 3v3.5H6"/><path d="M10 6v4.2l2.8 1.6"/>',
  book:    '<path d="M3 4.2A1.7 1.7 0 0 1 4.7 2.5H16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4.7A1.7 1.7 0 0 0 3 16.2Z"/><path d="M3 16.2a1.7 1.7 0 0 1 1.7-1.7H17"/>',
  door:    '<path d="M12 2.5H4.5A1 1 0 0 0 3.5 3.5v13a1 1 0 0 0 1 1H12"/><path d="M14 13.5 17.5 10 14 6.5M17.5 10h-9"/>',
  cog:     '<circle cx="10" cy="10" r="2.6"/><path d="M16.2 12.3a1.4 1.4 0 0 0 .28 1.55l.05.05a1.7 1.7 0 1 1-2.4 2.4l-.05-.05a1.4 1.4 0 0 0-1.55-.28 1.4 1.4 0 0 0-.85 1.29V17.5a1.7 1.7 0 0 1-3.4 0v-.08a1.4 1.4 0 0 0-.92-1.29 1.4 1.4 0 0 0-1.55.28l-.05.05a1.7 1.7 0 1 1-2.4-2.4l.05-.05a1.4 1.4 0 0 0 .28-1.55 1.4 1.4 0 0 0-1.29-.85H2.5a1.7 1.7 0 0 1 0-3.4h.08a1.4 1.4 0 0 0 1.29-.92 1.4 1.4 0 0 0-.28-1.55l-.05-.05a1.7 1.7 0 1 1 2.4-2.4l.05.05a1.4 1.4 0 0 0 1.55.28h.07a1.4 1.4 0 0 0 .85-1.29V2.5a1.7 1.7 0 0 1 3.4 0v.08a1.4 1.4 0 0 0 .85 1.29 1.4 1.4 0 0 0 1.55-.28l.05-.05a1.7 1.7 0 1 1 2.4 2.4l-.05.05a1.4 1.4 0 0 0-.28 1.55v.07a1.4 1.4 0 0 0 1.29.85h.08a1.7 1.7 0 0 1 0 3.4h-.08a1.4 1.4 0 0 0-1.29.85Z"/>',
  shield:  '<path d="M10 2.5 3.8 5v4c0 3.6 2.5 6.9 6.2 8 3.7-1.1 6.2-4.4 6.2-8V5Z"/><path d="M7.6 10 9.3 11.7 12.7 8.3"/>',
  bell:    '<path d="M15 7.5a5 5 0 0 0-10 0c0 5.8-2.5 7.5-2.5 7.5h15S15 13.3 15 7.5Z"/><path d="M11.4 17.5a1.6 1.6 0 0 1-2.8 0"/>',
  layers:  '<path d="M10 2.5 2.5 6.4 10 10.3l7.5-3.9Z"/><path d="M2.5 10.3 10 14.2l7.5-3.9"/><path d="M2.5 14.2 10 18.1l7.5-3.9"/>'
};

function icon(name) {
  return `<svg class="nav-item__icon" width="17" height="17" viewBox="0 0 20 20" fill="none"
    stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
    aria-hidden="true">${I[name]}</svg>`;
}

/* Tambah halaman baru? Cukup tambah satu baris di sini. */
const MENU = {
  guru: [
    { grup: 'Pengelolaan' },
    { id: 'input',  label: 'Input aktivitas',  href: 'input.html',  icon: 'input' },
    { id: 'siswa',  label: 'Dashboard siswa',  href: 'siswa.html',  icon: 'user' },
    { id: 'kelas',  label: 'Dashboard kelas',  href: 'kelas.html',  icon: 'chart' },
    { id: 'kompetensi', label: 'Kompetensi', href: 'kompetensi.html', icon: 'book' },
    { grup: 'Akun' },
    { id: 'pengaturan', label: 'Pengaturan', href: 'pengaturan.html', icon: 'cog' }
  ],
  siswa: [
    { grup: 'Praktik' },
    { id: 'lapor',   label: 'Lapor hari ini',     href: 'lapor.html',   icon: 'clip' },
    { id: 'riwayat', label: 'Riwayat & feedback', href: 'riwayat.html', icon: 'history' },
    { grup: 'Akun' },
    { id: 'pengaturan', label: 'Pengaturan', href: 'pengaturan.html', icon: 'cog' }
  ],
  admin: [
    { grup: 'Sistem' },
    { id: 'dashboard',  label: 'Ringkasan',     href: 'dashboard.html',  icon: 'grid' },
    { grup: 'Data master' },
    { id: 'user',       label: 'Akun pengguna',     href: 'user.html',       icon: 'user' },
    { id: 'program',    label: 'Program keahlian',  href: 'program.html',    icon: 'layers' },
    { id: 'kompetensi', label: 'Kompetensi',        href: 'kompetensi.html', icon: 'book' },
    { id: 'kelas',      label: 'Kelas',             href: 'kelas.html',      icon: 'chart' },
    { grup: 'Keamanan' },
    { id: 'audit',      label: 'Jejak audit',   href: 'audit.html',      icon: 'shield' }
  ]
};

const ROLE_LABEL = { admin: 'Administrator', guru: 'Guru praktik', siswa: 'Siswa' };

export function renderShell({ active, title, sub = '' }) {
  const user = auth.user();
  const role = auth.role();
  if (!user) return;

  document.body.insertAdjacentHTML('afterbegin', `
    <div class="app">
      ${sidebar(role, user, active)}
      ${header(title, sub)}
      <main class="main" id="main"></main>
      ${credit()}
    </div>
  `);

  bindMenu();
  bindLogout();
  loadNotif();

  return document.getElementById('main');
}

function sidebar(role, user, active) {
  const items = MENU[role].map(m => {
    if (m.grup) return `<p class="sidebar__label">${esc(m.grup)}</p>`;
    const on = m.id === active;
    return `
      <a class="nav-item ${on ? 'nav-item--active' : ''}"
         href="${m.href}" ${on ? 'aria-current="page"' : ''}>
        ${icon(m.icon)}
        <span>${esc(m.label)}</span>
      </a>`;
  }).join('');

  return `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar__brand">
        <img class="sidebar__logo" src="../../assets/images/logo-dss.svg" alt="">
        <div>
          <div class="sidebar__name">Keptika</div>
          <div class="sidebar__role">${esc(ROLE_LABEL[role])}</div>
        </div>
      </div>

      <nav class="sidebar__nav" aria-label="Menu utama">${items}</nav>

      <div class="sidebar__user">
        <button class="user-chip" id="logout-btn" type="button">
          <span class="user-chip__avatar" aria-hidden="true">${initials(user.nama)}</span>
          <span class="user-chip__meta">
            <span class="user-chip__name">${esc(user.nama)}</span>
            <span class="user-chip__sub">Keluar dari sistem</span>
          </span>
          ${icon('door')}
        </button>
      </div>
    </aside>
  `;
}

function header(title, sub) {
  return `
    <header class="header">
      <div class="header__left">
        <button class="header__menu" id="menu-btn" type="button" aria-label="Buka menu">
          <svg width="19" height="19" viewBox="0 0 20 20" fill="none" stroke="currentColor"
               stroke-width="1.6" stroke-linecap="round">
            <path d="M3 5.5h14M3 10h14M3 14.5h14"/>
          </svg>
        </button>
        <div>
          <h1 class="header__title">${esc(title)}</h1>
          ${sub ? `<p class="header__sub">${esc(sub)}</p>` : ''}
        </div>
      </div>

      <div class="header__actions">
        <div class="header__notif-wrap">
          <button class="bell" id="bell-btn" type="button"
                  aria-label="Notifikasi" aria-expanded="false">
            <svg width="19" height="19" viewBox="0 0 20 20" fill="none" stroke="currentColor"
                 stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${I.bell}</svg>
            <span class="bell__dot hidden" id="bell-dot"></span>
          </button>
          <div id="notif-panel"></div>
        </div>
      </div>
    </header>
  `;
}

function credit() {
  return `
    <footer class="credit">
      <img class="credit__logo" src="../../assets/images/logo-upi.svg"
           alt="Logo Universitas Pendidikan Indonesia">
      <div class="credit__body">
        <p class="credit__inst">Universitas Pendidikan Indonesia</p>
        <p class="credit__line">
          AI-Driven Decision Support System Berbasis Learning Analytics
          untuk Pengelolaan Kelas Praktik di SMK · Skema Penelitian Hibah UPI
        </p>
      </div>
      <div class="credit__meta">
        Sri Lestari Harja · Prof. Dr. Tuti Suartini<br>
        Dr. Saripudin · Irsyad Fauzan Prasetia<br>
        © 2026 · Versi 1.0
      </div>
    </footer>
  `;
}

function bindMenu() {
  const btn = document.getElementById('menu-btn');
  const bar = document.getElementById('sidebar');
  let scrim = null;

  const close = () => {
    bar.classList.remove('sidebar--open');
    scrim?.remove();
    scrim = null;
  };

  btn?.addEventListener('click', () => {
    if (bar.classList.toggle('sidebar--open')) {
      scrim = document.createElement('div');
      scrim.className = 'scrim';
      scrim.addEventListener('click', close);
      document.body.appendChild(scrim);
    } else {
      close();
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') close();
  });
}

function bindLogout() {
  document.getElementById('logout-btn')?.addEventListener('click', async () => {
    const ya = await konfirmasi({
      judul: 'Keluar dari sistem?',
      pesan: 'Sesi berakhir dan data yang belum disimpan akan hilang.',
      aksi: 'Keluar',
      batal: 'Tetap di sini',
      nada: 'danger'
    });

    if (ya) await auth.logout();
  });
}

/* ---- Notifikasi ---- */

let NOTIF = [];

async function loadNotif() {
  const role = auth.role();

  // Admin belum punya feed notifikasi.
  if (role === 'admin') {
    document.getElementById('bell-btn')?.classList.add('hidden');
    return;
  }

  try {
    const res = role === 'guru'
      ? await api.guru.notifikasi()
      : await api.siswa.notifikasi();
    NOTIF = res.notifikasi_list ?? [];
  } catch {
    return;
  }

  updateBadge();

  const bell  = document.getElementById('bell-btn');
  const panel = document.getElementById('notif-panel');

  bell?.addEventListener('click', e => {
    e.stopPropagation();
    const buka = panel.innerHTML === '';

    panel.innerHTML = buka ? notifPanel() : '';
    bell.classList.toggle('bell--on', buka);
    bell.setAttribute('aria-expanded', String(buka));

    if (buka) bindPanel(panel);
  });

  document.addEventListener('click', e => {
    if (!panel.contains(e.target) && !bell.contains(e.target)) {
      panel.innerHTML = '';
      bell?.classList.remove('bell--on');
      bell?.setAttribute('aria-expanded', 'false');
    }
  });
}

/* Angka badge = jumlah yang belum dibaca. Dipanggil ulang
   setiap kali status baca berubah. */
function updateBadge() {
  const dot  = document.getElementById('bell-dot');
  const bell = document.getElementById('bell-btn');
  if (!dot) return;

  const n = NOTIF.filter(x => !x.dibaca).length;

  if (n === 0) {
    dot.classList.add('hidden');
    bell?.setAttribute('aria-label', 'Notifikasi');
    return;
  }

  dot.textContent = n > 9 ? '9+' : String(n);
  dot.classList.remove('hidden');
  bell?.setAttribute('aria-label', `Notifikasi, ${n} belum dibaca`);
}

function notifPanel() {
  if (!NOTIF.length) {
    return `
      <div class="notif-panel">
        <div class="notif-panel__head">
          <span class="notif-panel__title">Notifikasi</span>
        </div>
        <p class="notif-panel__kosong">Belum ada notifikasi.</p>
      </div>`;
  }

  const belum = NOTIF.filter(n => !n.dibaca).length;

  return `
    <div class="notif-panel">
      <div class="notif-panel__head">
        <span class="notif-panel__title">Notifikasi</span>
        ${belum ? `
          <button class="notif-panel__all" id="baca-semua" type="button">
            Tandai semua dibaca
          </button>` : ''}
      </div>
      ${NOTIF.map(n => `
        <a class="notif-item ${n.dibaca ? '' : 'notif-item--unread'}"
           href="${n.link || '#'}" data-id="${n.id}">
          <span class="notif-item__mark" aria-hidden="true"></span>
          <span class="notif-item__body">
            <span class="notif-item__title">${esc(n.judul)}</span>
            <span class="notif-item__msg">${esc(n.pesan)}</span>
            <span class="notif-item__time">${waktu(n.created_at)}</span>
          </span>
        </a>
      `).join('')}
    </div>`;
}

function bindPanel(panel) {
  panel.querySelector('#baca-semua')?.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();

    NOTIF.forEach(n => { n.dibaca = true; });
    updateBadge();
    panel.innerHTML = notifPanel();
    bindPanel(panel);

    // TODO(backend): PUT /notifikasi/baca-semua
  });

  // Membuka notifikasi menandainya terbaca.
  panel.querySelectorAll('.notif-item').forEach(a => {
    a.addEventListener('click', () => {
      const n = NOTIF.find(x => String(x.id) === a.dataset.id);
      if (n && !n.dibaca) {
        n.dibaca = true;
        updateBadge();
        // TODO(backend): PUT /notifikasi/:id/baca
      }
    });
  });
}

/* ---- Utilitas ---- */

export function esc(s) {
  const d = document.createElement('div');
  d.textContent = String(s ?? '');
  return d.innerHTML;
}

function initials(nama) {
  return String(nama)
    .split(' ').filter(Boolean).slice(0, 2)
    .map(w => w[0]).join('').toUpperCase();
}

export function waktu(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return '—';

  const detik = Math.floor((Date.now() - d) / 1000);

  if (detik < 60)     return 'Baru saja';
  if (detik < 3600)   return `${Math.floor(detik / 60)} menit lalu`;
  if (detik < 86400)  return `${Math.floor(detik / 3600)} jam lalu`;
  if (detik < 604800) return `${Math.floor(detik / 86400)} hari lalu`;

  return d.toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
}
