// Admin — kelola akun pengguna.

import { renderShell, esc } from '../core/shell.js';
import { api } from '../core/api.js';
import { toast } from '../core/toast.js';
import { auth } from '../core/auth.js';
import { modal, konfirmasi } from '../core/dialog.js';

const main = renderShell({
  active: 'user',
  title: 'Akun pengguna',
  sub: 'Buat, ubah, nonaktifkan akun, dan reset kata sandi.'
});

const ROLE_LABEL = { admin: 'Admin', guru: 'Guru', siswa: 'Siswa' };

let SEMUA = [];

main.innerHTML = `
  <div class="row row--wrap" style="margin-bottom: var(--sp-5);">
    <div class="field" style="margin:0; min-width: 240px; flex:1; max-width: 320px;">
      <label class="field__label" for="cari">Cari</label>
      <input class="input" type="search" id="cari" placeholder="Nama atau username">
    </div>
    <div class="field" style="margin:0; min-width: 150px;">
      <label class="field__label" for="frole">Peran</label>
      <select class="select" id="frole">
        <option value="">Semua</option>
        <option value="admin">Admin</option>
        <option value="guru">Guru</option>
        <option value="siswa">Siswa</option>
      </select>
    </div>
    <div class="spacer"></div>
    <button class="btn btn--secondary" id="import-massal" style="align-self: flex-end;">
      Import massal (Excel)
    </button>
    <button class="btn btn--primary" id="tambah" style="align-self: flex-end;">
      Tambah akun
    </button>
  </div>

  <div id="body"></div>
`;

const body  = document.getElementById('body');
const cari  = document.getElementById('cari');
const frole = document.getElementById('frole');

(async function init() {
  await muat();

  cari.addEventListener('input', tampil);
  frole.addEventListener('change', tampil);
  document.getElementById('tambah').addEventListener('click', () => modalTambah());
  document.getElementById('import-massal').addEventListener('click', () => modalImportMassal());
})();

async function muat() {
  body.innerHTML = skeleton();
  try {
    const res = await api.admin.listUser();
    // Pastikan mengambil properti array 'users' dari respons objek backend PHP yang baru
    SEMUA = Array.isArray(res) ? res : (res.users || res.data || res.user_list || []);
    tampil();
  } catch (err) {
    toast.danger('Gagal memuat', err.message);
  }
}

function tampil() {
  const q = cari.value.trim().toLowerCase();
  const r = frole.value;

  const list = SEMUA.filter(u => {
    if (r && u.role !== r) return false;
    if (!q) return true;
    return (u.nama || '').toLowerCase().includes(q) ||
           (u.username || '').toLowerCase().includes(q);
  });

  if (!list.length) {
    body.innerHTML = `
      <div class="card">
        <div class="empty">
          <p class="empty__title">Tidak ada yang cocok</p>
          <p class="empty__desc">
            Ubah kata kunci atau filter peran.
          </p>
        </div>
      </div>`;
    return;
  }

  body.innerHTML = `
    <div class="table-wrap">
      <div class="table-scroll">
        <table class="table">
          <thead>
            <tr>
              <th>Nama</th>
              <th>Username</th>
              <th>Peran</th>
              <th>Keterangan</th>
              <th>Status</th>
              <th style="text-align:right">Tindakan</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(baris).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Perbaikan utama: Mengambil b.dataset langsung sebagai String murni tanpa fungsi Number()
  body.querySelectorAll('[data-reset]').forEach(b =>
    b.addEventListener('click', () => modalReset(b.dataset.reset))
  );

  body.querySelectorAll('[data-toggle]').forEach(b =>
    b.addEventListener('click', () => toggleStatus(b.dataset.toggle))
  );
}

function baris(u) {
  const aktif = u.status === 'aktif';
  const sendiri = u.id === auth.user().id;

  /* Keterangan berbeda per peran. Kolom kosong
     tidak membantu siapa pun. */
  const ket = u.role === 'siswa'
    ? `${esc(u.nis ?? '')} · ${esc(u.kelas ?? '')}`
    : esc(u.keterangan || u.jabatan || '—');

  return `
    <tr>
      <td>
        <div class="table__name">${esc(u.nama)}</div>
        ${sendiri ? `<div class="table__sub">Akun Anda</div>` : ''}
      </td>
      <td style="font-family: var(--font-mono); font-size: var(--fs-caption);">
        ${esc(u.username)}
      </td>
      <td>
        <span class="badge badge--${u.role === 'admin' ? 'info' : 'neutral'}">
          ${ROLE_LABEL[u.role]}
        </span>
      </td>
      <td style="color: var(--text-muted);">${ket}</td>
      <td>
        <span class="badge badge--${aktif ? 'success' : 'neutral'}">
          ${aktif ? 'Aktif' : 'Nonaktif'}
        </span>
      </td>
      <td>
        <div class="row row--end" style="gap: var(--sp-2);">
          <button class="btn btn--secondary btn--sm" data-reset="${u.id}">
            Reset sandi
          </button>
          ${sendiri ? '' : `
            <button class="btn btn--ghost btn--sm" data-toggle="${u.id}">
              ${aktif ? 'Nonaktifkan' : 'Aktifkan'}
            </button>`}
        </div>
      </td>
    </tr>`;
}

// Tambah akun

function modalTambah() {
  const el = modal(`
    <div class="modal__head">
      <div>
        <h2 class="modal__title">Tambah akun</h2>
        <p class="modal__sub">Kata sandi awal ditentukan oleh Anda.</p>
      </div>
      <button class="modal__x" data-close aria-label="Tutup">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor"
             stroke-width="1.8" stroke-linecap="round">
          <path d="M5 5l10 10M15 5 5 15"/>
        </svg>
      </button>
    </div>

    <div class="modal__body">
      <form id="add-form">
        <div class="field">
          <label class="field__label" for="a-nama">Nama lengkap</label>
          <input class="input" type="text" id="a-nama" required>
        </div>

        <div class="field">
          <label class="field__label" for="a-role">Peran</label>
          <select class="select" id="a-role" required>
            <option value="siswa">Siswa</option>
            <option value="guru">Guru</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div class="field">
          <label class="field__label" for="a-user">Username</label>
          <input class="input" type="text" id="a-user" required
                 autocapitalize="none" spellcheck="false"
                 placeholder="siswa.budi">
          <p class="field__hint">
            Tanpa spasi. Gunakan pola <code>peran.nama</code>.
          </p>
        </div>

        <div class="field" style="margin-bottom:0">
          <label class="field__label" for="a-pass">Kata sandi awal</label>
          <input class="input" type="text" id="a-pass" required
                 autocomplete="off" placeholder="Minimal 8 karakter">
          <p class="field__hint">
            Tampil terbuka agar Anda dapat menyalinnya untuk pengguna.
            Minta mereka menggantinya setelah masuk pertama kali.
          </p>
        </div>
      </form>
    </div>

    <div class="modal__foot">
      <button class="btn btn--secondary" data-close>Batal</button>
      <button class="btn btn--primary" id="add-save">
        <span id="add-label">Buat akun</span>
      </button>
    </div>
  `);

  const nama = el.querySelector('#a-nama');
  const role = el.querySelector('#a-role');
  const user = el.querySelector('#a-user');
  let manual = false;

  user.addEventListener('input', () => { manual = true; });

  const isi = () => {
    if (manual) return;
    const depan = nama.value.trim().split(' ')[0].toLowerCase();
    user.value = depan ? `${role.value}.${depan}` : '';
  };

  nama.addEventListener('input', isi);
  role.addEventListener('change', isi);

  el.querySelector('#add-save').addEventListener('click', async () => {
    const btn   = el.querySelector('#add-save');
    const label = el.querySelector('#add-label');
    const pass  = el.querySelector('#a-pass').value;

    if (!nama.value.trim() || !user.value.trim() || !pass) {
      toast.danger('Lengkapi dulu', 'Nama, username, dan kata sandi wajib diisi.');
      return;
    }

    if (pass.length < 8) {
      toast.danger('Kata sandi terlalu pendek', 'Gunakan minimal 8 karakter.');
      return;
    }

    if (/\s/.test(user.value)) {
      toast.danger('Username tidak valid', 'Username tidak boleh mengandung spasi.');
      return;
    }

    btn.disabled = true;
    label.textContent = 'Menyimpan';

    try {
      await api.admin.createUser({
        nama:     nama.value.trim(),
        username: user.value.trim().toLowerCase(),
        password: pass,
        role:     role.value
      });

      toast.success('Akun dibuat', `${nama.value.trim()} dapat masuk sekarang.`);
      el.tutup();
      await muat();

    } catch (err) {
      toast.danger('Gagal membuat akun', err.message);
      btn.disabled = false;
      label.textContent = 'Buat akun';
    }
  });
}

// Reset sandi

function modalReset(id) {
  const u = SEMUA.find(x => x.id === id);

  const el = modal(`
    <div class="modal__head">
      <div>
        <h2 class="modal__title">Reset kata sandi</h2>
        <p class="modal__sub">${esc(u.nama)} · ${esc(u.username)}</p>
      </div>
      <button class="modal__x" data-close aria-label="Tutup">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor"
             stroke-width="1.8" stroke-linecap="round">
          <path d="M5 5l10 10M15 5 5 15"/>
        </svg>
      </button>
    </div>

    <div class="modal__body">
      <div class="alert alert--warning" style="margin-bottom: var(--sp-4);">
        <span class="alert__icon" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor"
               stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10 2.5 18 16H2Z"/><path d="M10 8v3.5M10 14h.01"/>
          </svg>
        </span>
        <span>
          Kata sandi lama langsung tidak berlaku. Sampaikan sandi baru
          kepada pengguna secara langsung.
        </span>
      </div>

      <div class="field" style="margin-bottom:0">
        <label class="field__label" for="r-pass">Kata sandi baru</label>
        <input class="input" type="text" id="r-pass" autocomplete="off"
               placeholder="Minimal 8 karakter">
        <p class="field__hint">Minimal 8 karakter.</p>
      </div>
    </div>

    <div class="modal__foot">
      <button class="btn btn--secondary" data-close>Batal</button>
      <button class="btn btn--danger" id="r-save">
        <span id="r-label">Reset kata sandi</span>
      </button>
    </div>
  `);

  el.querySelector('#r-save').addEventListener('click', async () => {
    const pass  = el.querySelector('#r-pass').value;
    const btn   = el.querySelector('#r-save');
    const label = el.querySelector('#r-label');

    if (pass.length < 8) {
      toast.danger('Kata sandi terlalu pendek', 'Gunakan minimal 8 karakter.');
      return;
    }

    btn.disabled = true;
    label.textContent = 'Menyimpan';

    try {
      await api.admin.resetPassword(id, pass);
      toast.success('Kata sandi direset', `Sampaikan sandi baru kepada ${u.nama}.`);
      el.tutup();
    } catch (err) {
      toast.danger('Gagal mereset', err.message);
      btn.disabled = false;
      label.textContent = 'Reset kata sandi';
    }
  });
}

// Aktif / nonaktif

async function toggleStatus(id) {
  const u = SEMUA.find(x => x.id === id);
  const aktif = u.status === 'aktif';

  const ya = await konfirmasi(aktif
    ? {
        judul: `Nonaktifkan ${u.nama}?`,
        pesan: 'Mereka tidak dapat masuk lagi. Data penilaian tetap tersimpan dan akun bisa diaktifkan kembali.',
        aksi: 'Nonaktifkan',
        nada: 'danger'
      }
    : {
        judul: `Aktifkan kembali ${u.nama}?`,
        pesan: 'Mereka dapat masuk lagi dengan kata sandi terakhir.',
        aksi: 'Aktifkan',
        nada: 'info'
      });

  if (!ya) return;

  try {
    await api.admin.updateUser(id, {
      status: aktif ? 'nonaktif' : 'aktif'
    });

    u.status = aktif ? 'nonaktif' : 'aktif';
    tampil();

    toast.success(
      aktif ? 'Akun dinonaktifkan' : 'Akun diaktifkan',
      `${u.nama} ${aktif ? 'tidak dapat masuk lagi' : 'dapat masuk kembali'}.`
    );
  } catch (err) {
    toast.danger('Gagal mengubah status', err.message);
  }
}

function skeleton() {
  return `
    <div class="table-wrap" style="padding: var(--sp-5);">
      ${[1,2,3,4,5].map(() => `
        <div class="row" style="margin-bottom: var(--sp-4);">
          <div class="skeleton" style="width:150px; height:16px;"></div>
          <div class="skeleton" style="width:110px; height:16px;"></div>
          <div class="spacer"></div>
          <div class="skeleton" style="width:60px; height:22px;"></div>
          <div class="skeleton" style="width:100px; height:30px;"></div>
        </div>
      `).join('')}
    </div>`;
}

// FITUR BARU: registrasi siswa massal lewat upload file Excel —
// supaya admin tidak perlu input satu per satu (misalnya 50 akun untuk 1 kelas).

function modalImportMassal() {
  const el = modal(`
    <div class="modal__head">
      <div>
        <h2 class="modal__title">Import massal akun siswa</h2>
        <p class="modal__sub">Unggah file Excel (.xlsx/.xls/.csv) berisi banyak siswa sekaligus.</p>
      </div>
      <button class="modal__x" data-close aria-label="Tutup">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor"
             stroke-width="1.8" stroke-linecap="round">
          <path d="M5 5l10 10M15 5 5 15"/>
        </svg>
      </button>
    </div>

    <div class="modal__body">
      <div class="alert alert--info" style="margin-bottom: var(--sp-4);">
        <span class="alert__icon" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor"
               stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="10" cy="10" r="7.5"/><path d="M10 9v4.5M10 6.5h.01"/>
          </svg>
        </span>
        <span>
          Baris pertama file harus judul kolom: <b>nama</b>, <b>username</b>,
          <b>password</b> (opsional, default <code>siswa123</code>), <b>nis</b> (opsional).
        </span>
      </div>

      <div class="field">
        <label class="field__label" for="im-kelas">Masukkan ke kelas</label>
        <select class="select" id="im-kelas"><option value="">Memuat kelas…</option></select>
        <p class="field__hint">Semua siswa dalam file akan didaftarkan ke kelas ini.</p>
      </div>

      <div class="field" style="margin-bottom:0">
        <label class="field__label" for="im-file">File Excel</label>
        <input class="input" type="file" id="im-file" accept=".xlsx,.xls,.csv">
      </div>

      <div id="im-preview" style="margin-top: var(--sp-4);"></div>
    </div>

    <div class="modal__foot">
      <button class="btn btn--secondary" data-close>Batal</button>
      <button class="btn btn--primary" id="im-save" disabled>
        <span id="im-label">Pilih file dahulu</span>
      </button>
    </div>
  `);

  const selKelas = el.querySelector('#im-kelas');
  const fileInput = el.querySelector('#im-file');
  const preview = el.querySelector('#im-preview');
  const btnSave = el.querySelector('#im-save');
  const labelSave = el.querySelector('#im-label');

  let barisSiswa = [];

  // Muat daftar kelas untuk dropdown tujuan
  (async () => {
    try {
      const res = await api.admin.listKelas();
      const daftar = res?.kelas_list ?? res?.data ?? res?.kelas ?? [];
      if (!daftar.length) {
        selKelas.innerHTML = '<option value="">Belum ada kelas — buat kelas dulu</option>';
        return;
      }
      selKelas.innerHTML = daftar.map(k =>
        `<option value="${k.id}">${esc(k.nama_kelas || k.kelas)} (${esc(k.nama_program || k.program || 'Umum')})</option>`
      ).join('');
    } catch (err) {
      selKelas.innerHTML = '<option value="">Gagal memuat kelas</option>';
      toast.danger('Gagal memuat kelas', err.message);
    }
  })();

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    barisSiswa = [];
    btnSave.disabled = true;
    labelSave.textContent = 'Pilih file dahulu';

    if (!file) {
      preview.innerHTML = '';
      return;
    }

    if (typeof XLSX === 'undefined') {
      preview.innerHTML = `<p style="color: var(--red-600, #b42318);">
        Pembaca Excel gagal dimuat. Periksa koneksi internet lalu coba lagi.</p>`;
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        // Normalisasi nama kolom (huruf kecil, tanpa spasi berlebih)
        barisSiswa = rows.map(r => {
          const cari = (kunciTarget) => {
            const kunciAsli = Object.keys(r).find(k => k.trim().toLowerCase() === kunciTarget);
            return kunciAsli ? String(r[kunciAsli]).trim() : '';
          };
          return {
            nama: cari('nama'),
            username: cari('username'),
            password: cari('password'),
            nis: cari('nis')
          };
        }).filter(r => r.nama || r.username);

        if (!barisSiswa.length) {
          preview.innerHTML = `<p style="color: var(--red-600, #b42318);">
            Tidak ada baris siswa yang terbaca. Pastikan ada kolom "nama" dan "username".</p>`;
          return;
        }

        preview.innerHTML = `
          <div class="alert alert--success">
            <span>${barisSiswa.length} siswa terdeteksi dari file — contoh 3 baris pertama:</span>
          </div>
          <div class="table-wrap" style="margin-top: var(--sp-3);">
            <table class="table">
              <thead><tr><th>Nama</th><th>Username</th><th>Password</th></tr></thead>
              <tbody>
                ${barisSiswa.slice(0, 3).map(r => `
                  <tr>
                    <td>${esc(r.nama)}</td>
                    <td>${esc(r.username)}</td>
                    <td>${esc(r.password || '(default: siswa123)')}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>`;

        btnSave.disabled = false;
        labelSave.textContent = `Import ${barisSiswa.length} akun siswa`;
      } catch (err) {
        preview.innerHTML = `<p style="color: var(--red-600, #b42318);">
          Gagal membaca file: ${esc(err.message)}</p>`;
      }
    };
    reader.readAsArrayBuffer(file);
  });

  btnSave.addEventListener('click', async () => {
    if (!barisSiswa.length) return;

    if (!selKelas.value) {
      toast.danger('Pilih kelas dahulu', 'Tentukan kelas tujuan sebelum mengimpor.');
      return;
    }

    btnSave.disabled = true;
    labelSave.textContent = 'Mengimpor…';

    try {
      const res = await api.admin.importSiswaMassal({
        kelas_id: selKelas.value,
        siswa_list: barisSiswa
      });

      const gagal = res?.gagal ?? [];
      const berhasil = res?.berhasil ?? 0;

      if (gagal.length) {
        toast.danger(
          `${berhasil} berhasil, ${gagal.length} gagal`,
          gagal.slice(0, 3).map(g => `Baris ${g.baris} (${g.nama || '-'}): ${g.alasan}`).join(' · ')
        );
      } else {
        toast.success('Import massal berhasil', `${berhasil} akun siswa berhasil dibuat.`);
      }

      el.tutup();
      await muat();

    } catch (err) {
      toast.danger('Gagal mengimpor', err.message);
      btnSave.disabled = false;
      labelSave.textContent = `Import ${barisSiswa.length} akun siswa`;
    }
  });
}