// Guru — dashboard kelas.

import { renderShell, esc } from '../core/shell.js';
import { api } from '../core/api.js';
import { toast } from '../core/toast.js';
import { auth } from '../core/auth.js';
import { tone, severity } from '../core/rules.js';

const main = renderShell({
  active: 'kelas',
  title: 'Dashboard kelas',
  sub: 'Prioritas intervensi untuk satu kompetensi.'
});

/* Urutan mendesak. Bukan abjad — abjad tidak
   memberi tahu guru harus mulai dari siapa. */
const URGENSI = { R1: 0, R2: 1, R4: 2, R3: 3, S0: 4, R5: 5 };

main.innerHTML = `
  <div class="row row--wrap" style="margin-bottom: var(--sp-5);">
    <div class="field" style="margin:0; min-width: 220px;">
      <label class="field__label" for="kelas">Kelas</label>
      <select class="select" id="kelas"><option value="">Memuat…</option></select>
    </div>
    <div class="field" style="margin:0; min-width: 260px;">
      <label class="field__label" for="komp">Kompetensi</label>
      <select class="select" id="komp"><option value="">Memuat…</option></select>
    </div>
    <div class="field" style="margin:0; min-width: 220px;">
      <label class="field__label" for="siswa-jump">Nama siswa</label>
      <select class="select" id="siswa-jump" disabled>
        <option value="">Pilih kelas dahulu</option>
      </select>
    </div>
  </div>

  <div id="body"></div>
`;

const selKelas = document.getElementById('kelas');
const selKomp  = document.getElementById('komp');
const selSiswa = document.getElementById('siswa-jump');
const body     = document.getElementById('body');

let DAFTAR_KELAS = [];
let SISWA_SEMUA  = [];

(async function init() {
  try {
    const user = auth.user();
    
    // 1. MUAT DAFTAR KELAS & KOMPETENSI SECARA PARALEL
    const [resKelas, resKomp, resSiswa] = await Promise.all([
      api.admin.listKelas(),
      api.admin.listKompetensi(),
      // FITUR BARU: seluruh siswa yang diampu guru ini, dipakai untuk
      // dropdown "Nama siswa" — memudahkan guru yang megang lebih dari
      // satu kelas untuk langsung lompat ke siswa tertentu.
      user?.role === 'guru' ? api.guru.listSiswa() : Promise.resolve(null)
    ]);

    // Ekstraksi Defensif Array Kelas
    const rawKelas = resKelas?.kelas_list ?? resKelas?.data ?? resKelas?.kelas ?? [];
    const daftarKelas = rawKelas.filter(k => {
      if (user?.role === 'admin') return true;
      return !k.guru_wali_id || String(k.guru_wali_id) === String(user?.id);
    });
    DAFTAR_KELAS = daftarKelas;

    SISWA_SEMUA = resSiswa?.siswa_list ?? resSiswa?.data ?? [];

    // Ekstraksi Defensif Array Kompetensi
    const rawKomp = resKomp?.kompetensi_list ?? resKomp?.data ?? resKomp?.kompetensi ?? [];
    const daftarKomp = rawKomp.filter(k => Boolean(k.aktif));

    // 2. RENDERING DROPDOWN KELAS
    if (daftarKelas.length > 0) {
      selKelas.innerHTML = daftarKelas.map(k => `
        <option value="${k.id}">${esc(k.nama_kelas || k.kelas)} (${esc(k.nama_program || k.program || 'Umum')})</option>
      `).join('');
    } else {
      selKelas.innerHTML = '<option value="">Tidak ada kelas diampu</option>';
    }

    // 3. RENDERING DROPDOWN KOMPETENSI
    if (daftarKomp.length > 0) {
      selKomp.innerHTML = daftarKomp.map(k => `
        <option value="${k.id}">${esc(k.nama || k.nama_kompetensi)}</option>
      `).join('');
    } else {
      selKomp.innerHTML = '<option value="">Tidak ada kompetensi aktif</option>';
    }

    // 4. BIND EVENT LISTENER UNTUK REAKSI PERUBAHAN DROPDOWN
    selKelas.addEventListener('change', () => { load(); muatDropdownSiswa(); });
    selKomp.addEventListener('change', load);
    selSiswa.addEventListener('change', () => {
      if (selSiswa.value) window.location.href = `siswa.html?id=${encodeURIComponent(selSiswa.value)}`;
    });

    // 5. JALANKAN PEMUATAN DASHBOARD AWAL JIKA PILIHAN VALID
    if (selKelas.value && selKomp.value) {
      load();
    } else {
      body.innerHTML = kosong('Pilih Kelas & Kompetensi', 'Silakan pilih kelas dan kompetensi di atas untuk melihat dashboard.');
    }
    muatDropdownSiswa();

  } catch (err) {
    toast.danger('Gagal memuat data awal', err.message);
  }
})(); 

/* Isi dropdown "Nama siswa" berdasarkan kelas yang sedang dipilih —
   supaya guru dengan beberapa kelas bisa langsung memilih siswa
   tanpa menyisir seluruh tabel. */
function muatDropdownSiswa() {
  const kelasTerpilih = DAFTAR_KELAS.find(k => String(k.id) === String(selKelas.value));
  const namaKelasTerpilih = kelasTerpilih?.nama_kelas || kelasTerpilih?.kelas;

  if (!namaKelasTerpilih) {
    selSiswa.disabled = true;
    selSiswa.innerHTML = '<option value="">Pilih kelas dahulu</option>';
    return;
  }

  const siswaKelasIni = SISWA_SEMUA.filter(s => s.kelas === namaKelasTerpilih);

  if (!siswaKelasIni.length) {
    selSiswa.disabled = true;
    selSiswa.innerHTML = '<option value="">Belum ada siswa di kelas ini</option>';
    return;
  }

  selSiswa.disabled = false;
  selSiswa.innerHTML = '<option value="">Lompat ke siswa…</option>' +
    siswaKelasIni.map(s => `<option value="${s.id}">${esc(s.nama || s.nama_lengkap)}</option>`).join('');
}

async function load() {
  if (!selKelas.value || !selKomp.value) {
    body.innerHTML = kosong('Data tidak lengkap', 'Pilih kelas dan kompetensi terlebih dahulu.');
    return;
  }

  body.innerHTML = skeleton();

  try {
    const res = await api.guru.dashboardKelas(selKelas.value, selKomp.value);
    render(res || {});
  } catch (err) {
    toast.danger('Gagal memuat kelas', err.message);
    body.innerHTML = kosong('Tidak dapat memuat data', err.message);
  }
}

function render(data) {
  // PENGAMAN DEFENTIF SINKRONISASI DATA DASHBOARD
  const siswa_list = data?.siswa_list ?? data?.siswa ?? [];
  const rekomendasi_kelas = data?.rekomendasi_kelas ?? data?.rekomendasi ?? [];
  const ringkasan = data?.ringkasan ?? {
    perlu_intervensi: 0,
    perlu_dorongan: 0,
    penguatan: 0,
    pantau: 0
  };

  if (!siswa_list || !siswa_list.length) {
    body.innerHTML = kosong(
      'Belum ada siswa',
      'Kelas ini belum punya siswa aktif atau belum ada aktivitas praktik pada kompetensi ini.'
    );
    return;
  }

  /* Urutkan: paling mendesak di atas.
     Yang belum dinilai ditaruh paling bawah — guru
     tidak bisa bertindak atas data yang belum ada. */
  const rows = [...siswa_list].sort((a, b) => {
    const ua = a.penilaian ? URGENSI[a.penilaian.rekomendasi_code] ?? 9 : 9;
    const ub = b.penilaian ? URGENSI[b.penilaian.rekomendasi_code] ?? 9 : 9;
    return ua - ub;
  });

  const belum = siswa_list.filter(s => !s.penilaian).length;

  body.innerHTML = `
    ${rekomendasi_kelas.length ? blokKelas(rekomendasi_kelas) : ''}

    <div class="chips" style="margin-bottom: var(--sp-4);">
      ${chip('danger',  ringkasan.perlu_intervensi || 0, 'perlu intervensi')}
      ${chip('warning', ringkasan.perlu_dorongan || 0,   'perlu dorongan')}
      ${chip('success', ringkasan.penguatan || 0,        'siap pengayaan')}
      ${chip('neutral', ringkasan.pantau || 0,           'pantau berkala')}
      ${belum ? chip('neutral', belum, 'belum dinilai') : ''}
    </div>

    <div class="table-wrap">
      <div class="table-scroll">
        <table class="table">
          <thead>
            <tr>
              <th>Siswa</th>
              <th style="text-align:center">P</th>
              <th style="text-align:center">E</th>
              <th style="text-align:center">K</th>
              <th style="min-width:120px">Progres</th>
              <th>Rekomendasi</th>
              <th>Laporan siswa</th>
              <th>Tindak lanjut</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(baris).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  /* Klik baris → detail siswa */
  body.querySelectorAll('tr[data-id]').forEach(tr => {
    tr.addEventListener('click', () => {
      window.location.href = `siswa.html?id=${tr.dataset.id}`;
    });
  });
}

function blokKelas(list) {
  return `
    <div class="stack" style="margin-bottom: var(--sp-5);">
      ${list.map(r => `
        <div class="rekom rekom--${severity(r.code)}">
          <div class="rekom__head">
            <span class="rekom__code">${esc(r.code)}</span>
            <span class="rekom__label">${esc(r.label)}</span>
          </div>
          <p class="rekom__why">${esc(r.alasan)}</p>
        </div>
      `).join('')}
    </div>
  `;
}

function baris({ siswa, penilaian, laporan }) {
  if (!siswa) return '';

  if (!penilaian) {
    return `
      <tr class="is-clickable" data-id="${siswa.id}">
        <td>
          <div class="table__name">${esc(siswa.nama)}</div>
          <div class="table__sub">${esc(siswa.nis ?? '')}</div>
        </td>
        <td colspan="4" style="color: var(--text-hint); font-style: italic;">
          Belum dinilai
        </td>
        <td><span class="badge badge--neutral">—</span></td>
        <td>${selLaporan(laporan)}</td>
        <td><span style="color: var(--text-hint);">—</span></td>
      </tr>`;
  }

  const sev = severity(penilaian.rekomendasi_code);

  return `
    <tr class="is-clickable" data-id="${siswa.id}">
      <td>
        <div class="table__name">${esc(siswa.nama)}</div>
        <div class="table__sub">${esc(siswa.nis ?? '')}</div>
      </td>
      ${sel('P', penilaian.P)}
      ${sel('E', penilaian.E)}
      ${sel('K', penilaian.K)}
      <td>
        <div class="bar-row">
          <div class="bar">
            <div class="bar__fill" style="width:${penilaian.G}%"></div>
          </div>
          <span class="bar-row__num">${penilaian.G}%</span>
        </div>
      </td>
      <td>
        <span class="badge badge--${sev}">
          ${esc(penilaian.rekomendasi_code)} · ${esc(penilaian.rekomendasi_label)}
        </span>
      </td>
      <td>${selLaporan(laporan)}</td>
      <td>${selStatus(penilaian.status_guru)}</td>
    </tr>
  `;
}

function sel(kunci, nilai) {
  return `
    <td style="text-align:center">
      <span class="pill pill--${tone(kunci, nilai)}">${nilai}</span>
    </td>`;
}

function selLaporan(l) {
  if (!l) {
    return `<span style="color: var(--text-hint); font-size: var(--fs-caption);">
              Belum lapor
            </span>`;
  }

  if (l.kendala?.length) {
    return `<span class="badge badge--warning">
              ${l.kendala.length} kendala
            </span>`;
  }

  return `<span class="badge badge--success">Lancar</span>`;
}

function selStatus(st) {
  if (!st) {
    return `<span class="badge badge--neutral">Menunggu</span>`;
  }
  const map = {
    diterima: 'success',
    diubah:   'info',
    ditolak:  'neutral'
  };
  return `<span class="badge badge--${map[st] || 'neutral'}">${esc(st)}</span>`;
}

function chip(tone, n, label) {
  return `
    <span class="chip chip--${tone}">
      <span class="chip__n">${n}</span> ${label}
    </span>`;
}

function kosong(judul, desc) {
  return `
    <div class="card">
      <div class="empty">
        <span class="empty__icon" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor"
               stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="10" cy="10" r="7.5"/><path d="M10 6.5v4M10 13.5h.01"/>
          </svg>
        </span>
        <p class="empty__title">${esc(judul)}</p>
        <p class="empty__desc">${esc(desc)}</p>
      </div>
    </div>`;
}

function skeleton() {
  return `
    <div class="table-wrap" style="padding: var(--sp-5);">
      ${[1,2,3,4].map(() => `
        <div class="row" style="margin-bottom: var(--sp-4);">
          <div class="skeleton" style="width:160px; height:16px;"></div>
          <div class="spacer"></div>
          <div class="skeleton" style="width:32px; height:24px;"></div>
          <div class="skeleton" style="width:32px; height:24px;"></div>
          <div class="skeleton" style="width:32px; height:24px;"></div>
          <div class="skeleton" style="width:110px; height:16px;"></div>
          <div class="skeleton" style="width:130px; height:22px;"></div>
        </div>
      `).join('')}
    </div>`;
}