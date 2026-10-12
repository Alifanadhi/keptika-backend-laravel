// Admin — daftar kelas.

import { renderShell, esc } from '../core/shell.js';
import { api } from '../core/api.js';
import { toast } from '../core/toast.js';
import { modal, konfirmasi } from '../core/dialog.js';

const main = renderShell({
  active: 'kelas',
  title: 'Kelas',
  sub: 'Manajemen data kelas, program keahlian, dan guru wali pengampu.'
});

window.DATA_KELAS_MASTER = [];
let PROGRAM = [];
let GURU = [];

main.innerHTML = `
  <div class="row row--wrap" style="margin-bottom: var(--sp-5);">
    <div class="spacer"></div>
    <button class="btn btn--primary" id="tambah" style="align-self:flex-end;">
      Tambah kelas
    </button>
  </div>

  <div id="body">${skeleton()}</div>
`;

const body = document.getElementById('body');

document.getElementById('tambah').addEventListener('click', () => bukaForm());

(async function init() {
  try {
    const p = await api.admin.listProgram();
    PROGRAM = p?.program_list ?? p?.data ?? [];

    const u = await api.admin.listUser({ role: 'guru' });
    GURU = u?.data ?? u?.user_list ?? [];

    muat();
  } catch (err) {
    toast.danger('Gagal memuat data master', err.message);
  }
})();

async function muat() {
  body.innerHTML = skeleton();

  try {
    const respon = await api.admin.listKelas();
    window.DATA_KELAS_MASTER = respon?.data ?? respon?.kelas_list ?? respon?.kelas ?? [];
    render(window.DATA_KELAS_MASTER);
  } catch (err) {
    console.error("[DSS Kelas] Error muat:", err);
    toast.danger('Gagal memuat', err.message);
  }
}

function render(arrayData) {
  const daftarAman = Array.isArray(arrayData) ? arrayData : [];

  if (!daftarAman.length) {
    body.innerHTML = `
      <div class="card">
        <div class="empty">
          <span class="empty__icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor"
                 stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 4.2A1.7 1.7 0 0 1 4.7 2.5H16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4.7A1.7 1.7 0 0 0 3 16.2Z"/>
              <path d="M3 16.2a1.7 1.7 0 0 1 1.7-1.7H17"/>
            </svg>
          </span>
          <p class="empty__title">Belum ada kelas</p>
          <p class="empty__desc">Tambahkan data kelas baru agar siswa dapat didaftarkan ke dalam sistem.</p>
          <button class="btn btn--primary" id="tambah2">Tambah kelas</button>
        </div>
      </div>`;
    
    document.getElementById('tambah2').addEventListener('click', () => bukaForm());
    return;
  }

  body.innerHTML = `<div class="grid grid--2">${daftarAman.map(kartu).join('')}</div>`;

  body.querySelectorAll('[data-ubah]').forEach(b =>
    b.addEventListener('click', () => bukaForm(JSON.parse(b.dataset.ubah))));

  body.querySelectorAll('[data-hapus]').forEach(b =>
    b.addEventListener('click', () => hapus(b.dataset.hapus, b.dataset.nama)));
}

function kartu(k) {
  const namaKelas       = k.kelas || (k.nama_kelas || 'Tanpa Nama');
  const programKeahlian = k.program || (k.program_keahlian || (k.nama_program || 'Umum'));
  const guruPengampu    = k.guru_pengampu || (k.guru_wali || (k.nama_guru || 'Belum ditentukan'));
  const totalSiswa      = typeof k.jumlah_siswa !== 'undefined' ? k.jumlah_siswa : 0;

  return `
    <div class="card">
      <div class="card__header">
        <div style="min-width:0">
          <h3 class="card__title" style="font-size: var(--fs-body);">${esc(namaKelas)}</h3>
          <p class="card__subtitle">${esc(programKeahlian)}</p>
        </div>
      </div>

      <div class="stack" style="gap: var(--sp-2); margin-bottom: var(--sp-4); padding-bottom: var(--sp-4); border-bottom: 1px solid var(--slate-100);">
        <div class="row" style="gap: var(--sp-2); font-size: var(--fs-small); color: var(--text-body);">
          <span style="color: var(--text-muted); min-width: 100px;">Wali / Pengampu:</span>
          <span style="font-weight: 500;">${esc(guruPengampu)}</span>
        </div>
        <div class="row" style="gap: var(--sp-2); font-size: var(--fs-small); color: var(--text-body);">
          <span style="color: var(--text-muted); min-width: 100px;">Tahun Ajaran:</span>
          <span>${esc(k.tahun_ajaran || '2025/2026')}</span>
        </div>
      </div>

      <div class="row" style="gap: var(--sp-4); margin-bottom: var(--sp-4);">
        <span style="font-size: var(--fs-caption); color: var(--text-muted);">
          <span class="num" style="color: var(--text-title); font-weight: bold;">${totalSiswa}</span> Siswa terdaftar
        </span>
      </div>

      <div class="row" style="gap: var(--sp-2);">
        <button class="btn btn--secondary btn--sm" data-ubah='${JSON.stringify(k)}'>
          Ubah
        </button>
        <button class="btn btn--ghost btn--sm" data-hapus="${k.id}" data-nama="${esc(namaKelas)}">
          Hapus
        </button>
      </div>
    </div>`;
}

async function bukaForm(k = null) {
  const ubah = Boolean(k);
  let siswaTanpaKelas = [];

  // Tarik daftar siswa yang belum memiliki kelas
  try {
    const res = await api.admin.listSiswaTanpaKelas();
    siswaTanpaKelas = res?.siswa_list ?? res?.data ?? (Array.isArray(res) ? res : []);
  } catch (err) {
    console.warn("Gagal menarik daftar siswa tanpa kelas:", err);
  }

  const el = modal(`
    <div class="modal__head">
      <div>
        <h2 class="modal__title">${ubah ? 'Ubah data kelas' : 'Tambah kelas baru'}</h2>
        <p class="modal__sub">Tentukan nama ruang kelas master beserta guru pengampunya.</p>
      </div>
      <button class="modal__x" data-close aria-label="Tutup">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor"
             stroke-width="1.8" stroke-linecap="round"><path d="M5 5l10 10M15 5 5 15"/></svg>
      </button>
    </div>

    <div class="modal__body">
      <div class="field">
        <label class="field__label" for="k-nama">Nama kelas</label>
        <input class="input" type="text" id="k-nama" value="${esc(k?.nama_kelas ?? k?.kelas ?? '')}"
               placeholder="Contoh: XII RPL 1">
      </div>

      <div class="field">
        <label class="field__label" for="k-program">Program keahlian</label>
        <select class="select" id="k-program">
          <option value="">Pilih program keahlian</option>
          ${PROGRAM.map(p => `
            <option value="${p.id}" ${String(k?.program_id) === String(p.id) ? 'selected' : ''}>
              ${esc(p.nama)} (${esc(p.kode)})
            </option>
          `).join('')}
        </select>
      </div>

      <div class="field">
        <label class="field__label" for="k-guru">Guru wali kelas</label>
        <select class="select" id="k-guru">
          <option value="">Pilih guru pengampu</option>
          ${GURU.map(g => `
            <option value="${g.id}" ${String(k?.guru_wali_id) === String(g.id) ? 'selected' : ''}>
              ${esc(g.nama)}
            </option>
          `).join('')}
        </select>
      </div>

      <!-- AREA PILIH SISWA TANPA KELAS -->
      <div class="field" style="margin-top: var(--sp-4);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--sp-1);">
          <label class="field__label" style="margin: 0;">Tambahkan Siswa Tanpa Kelas</label>
          ${siswaTanpaKelas.length ? `
            <button type="button" class="btn btn--ghost btn--sm" id="pilih-semua-siswa" style="padding: 0; font-size: var(--fs-caption); color: var(--primary);">
              Pilih Semua
            </button>` : ''}
        </div>
        <p class="field__hint" style="margin-bottom: var(--sp-2);">
          Centang siswa di bawah ini untuk memasukkannya ke dalam kelas ini.
        </p>

        ${siswaTanpaKelas.length > 3 ? `
          <input class="input input--sm" type="text" id="cari-siswa" placeholder="Cari nama/NIS siswa..." style="margin-bottom: var(--sp-2);">
        ` : ''}

        <div id="wrapper-siswa" style="max-height: 180px; overflow-y: auto; border: 1px solid var(--slate-200); border-radius: var(--r-md); padding: var(--sp-2); background: #fafafa;">
          ${siswaTanpaKelas.length ? siswaTanpaKelas.map(s => `
            <label class="item-siswa-row" data-search="${esc((s.nama + ' ' + (s.nis || s.username || '')).toLowerCase())}" style="display: flex; align-items: center; gap: var(--sp-2); padding: var(--sp-2); border-bottom: 1px solid var(--slate-100); cursor: pointer;">
              <input type="checkbox" name="siswa_id_list" value="${s.id}" style="width: 16px; height: 16px; cursor: pointer;">
              <span style="font-size: var(--fs-small); color: var(--text-title); font-weight: 500;">
                ${esc(s.nama)} <span style="color: var(--text-muted); font-weight: 400;">(${esc(s.nis || s.username || '-')})</span>
              </span>
            </label>
          `).join('') : `
            <p style="font-size: var(--fs-small); color: var(--text-muted); margin: var(--sp-2) 0; text-align: center;">
              Semua siswa sudah terdaftar di kelas.
            </p>
          `}
        </div>
      </div>
    </div>

    <div class="modal__foot">
      <button class="btn btn--secondary" data-close>Batal</button>
      <button class="btn btn--primary" id="k-save">
        <span id="k-label">${ubah ? 'Simpan perubahan' : 'Buat kelas'}</span>
      </button>
    </div>
  `);

  // Event listener: Filter pencarian nama siswa
  const inputCari = el.querySelector('#cari-siswa');
  if (inputCari) {
    inputCari.addEventListener('input', () => {
      const q = inputCari.value.toLowerCase().trim();
      el.querySelectorAll('.item-siswa-row').forEach(row => {
        const match = row.dataset.search.includes(q);
        row.style.display = match ? 'flex' : 'none';
      });
    });
  }

  // Event listener: Tombol Pilih Semua / Batal Pilih
  const btnPilihSemua = el.querySelector('#pilih-semua-siswa');
  if (btnPilihSemua) {
    btnPilihSemua.addEventListener('click', () => {
      const checkboxes = el.querySelectorAll('input[name="siswa_id_list"]');
      const allChecked = Array.from(checkboxes).every(cb => cb.checked);
      checkboxes.forEach(cb => cb.checked = !allChecked);
      btnPilihSemua.textContent = allChecked ? 'Pilih Semua' : 'Batal Pilih';
    });
  }

  // Event listener: Simpan Kelas
  el.querySelector('#k-save').addEventListener('click', async () => {
    const namaKelas = el.querySelector('#k-nama').value.trim();
    const programId = el.querySelector('#k-program').value;
    const guruWaliId = el.querySelector('#k-guru').value;

    if (!namaKelas || !programId || !guruWaliId) {
      toast.danger('Lengkapi dulu', 'Semua kolom nama kelas, program, dan guru wali wajib diisi.');
      return;
    }

    // Ambil array ID siswa yang dicentang
    const siswaChecked = Array.from(el.querySelectorAll('input[name="siswa_id_list"]:checked')).map(cb => cb.value);

    const btn = el.querySelector('#k-save');
    const label = el.querySelector('#k-label');

    btn.disabled = true;
    label.textContent = 'Menyimpan...';

    try {
      await api.admin.simpanKelas({
        id: k?.id,
        nama_kelas: namaKelas,
        program_id: programId,
        guru_wali_id: guruWaliId,
        siswa_ids: siswaChecked // Payload dikirim ke backend
      });

      toast.success(ubah ? 'Data kelas diperbarui' : 'Kelas berhasil dibuat');
      el.tutup();
      muat();

    } catch (err) {
      toast.danger('Gagal menyimpan', err.message);
      btn.disabled = false;
      label.textContent = ubah ? 'Simpan perubahan' : 'Buat kelas';
    }
  });
}

async function hapus(id, nama) {
  const ya = await konfirmasi({
    judul: `Hapus ${nama}?`,
    pesan: 'Seluruh relasi data siswa di dalam kelas ini akan terlepas.',
    aksi: 'Hapus',
    nada: 'danger'
  });

  if (!ya) return;

  try {
    await api.admin.hapusKelas(id);
    toast.success('Kelas berhasil dihapus');
    muat();
  } catch (err) {
    toast.danger('Gagal menghapus', err.message);
  }
}

function skeleton() {
  return `
    <div class="grid grid--2">
      ${[1, 2].map(() =>
        `<div class="skeleton" style="height:220px; border-radius: var(--r-lg);"></div>`
      ).join('')}
    </div>`;
}