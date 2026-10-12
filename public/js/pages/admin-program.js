// Admin — program keahlian.
// Tabel master. Kompetensi dan kelas merujuk ke sini, jadi tidak ada
// program_keahlian yang diketik bebas (dan tidak ada typo yang memecah filter).

import { renderShell, esc } from '../core/shell.js';
import { api } from '../core/api.js';
import { toast } from '../core/toast.js';
import { modal, konfirmasi } from '../core/dialog.js';

const main = renderShell({
  active: 'program',
  title: 'Program keahlian',
  sub: 'Jurusan yang tersedia di sekolah ini.'
});

main.innerHTML = `
  <div class="row" style="margin-bottom: var(--sp-5);">
    <div class="spacer"></div>
    <button class="btn btn--primary" id="tambah">Tambah program</button>
  </div>
  <div id="body"></div>
`;

const body = document.getElementById('body');

document.getElementById('tambah').addEventListener('click', () => form());

muat();

async function muat() {
  body.innerHTML = `<div class="skeleton" style="height:220px; border-radius: var(--r-lg);"></div>`;

  try {
    const respon = await api.admin.listProgram();
    
    // REVISI DEFENSIVE: Mengamankan array dari variasi properti objek server (menggunakan ?. dan ?? [])
    const programList = respon?.program_list ?? respon?.data ?? respon?.program ?? [];
    
    render(programList);
  } catch (err) {
    console.error("[DSS Error] Gagal memproses data program:", err);
    toast.danger('Gagal memuat', err.message || 'Terjadi gangguan komunikasi dengan server.');
    
    if (body) {
      body.innerHTML = `
        <div class="card">
          <div class="text-center style="padding: var(--sp-5); color: var(--c-danger);">
            Gagal memuat data dari server. Silakan coba beberapa saat lagi.
          </div>
        </div>`;
    }
  }
}

function render(list) {
  // Memastikan 'list' diperlakukan aman sebagai array sebelum membaca properti .length
  const daftarAman = Array.isArray(list) ? list : [];

  if (!daftarAman.length) {
    body.innerHTML = `
      <div class="card">
        <div class="empty">
          <p class="empty__title">Belum ada program keahlian</p>
          <p class="empty__desc">
            Program keahlian adalah induk dari kompetensi dan kelas.
            Buat setidaknya satu sebelum menambah kompetensi.
          </p>
          <button class="btn btn--primary" id="tambah2">Tambah program</button>
        </div>
      </div>`;

    document.getElementById('tambah2').addEventListener('click', () => form());
    return;
  }

  body.innerHTML = `
    <div class="table-wrap">
      <div class="table-scroll">
        <table class="table">
          <thead>
            <tr>
              <th>Kode</th>
              <th>Nama program</th>
              <th style="text-align:center">Kompetensi</th>
              <th style="text-align:center">Kelas</th>
              <th>Status</th>
              <th style="text-align:right">Tindakan</th>
            </tr>
          </thead>
          <tbody>
            ${daftarAman.map(p => `
              <tr>
                <td>
                  <span class="badge badge--neutral"
                        style="font-family: var(--font-display);">
                    ${esc(p.kode)}
                  </span>
                </td>
                <td class="table__name">${esc(p.nama)}</td>
                <td style="text-align:center" class="num">${p.jumlah_kompetensi ?? 0}</td>
                <td style="text-align:center" class="num">${p.jumlah_kelas ?? 0}</td>
                <td>
                  <span class="badge badge--${p.aktif ? 'success' : 'neutral'}">
                    ${p.aktif ? 'Aktif' : 'Nonaktif'}
                  </span>
                </td>
                <td>
                  <div class="row row--end" style="gap: var(--sp-2);">
                    <button class="btn btn--secondary btn--sm"
                            data-ubah='${JSON.stringify(p)}'>Ubah</button>
                    <button class="btn btn--ghost btn--sm"
                            data-hapus="${p.id}" data-nama="${esc(p.nama)}">Hapus</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>`;

  body.querySelectorAll('[data-ubah]').forEach(b =>
    b.addEventListener('click', () => form(JSON.parse(b.dataset.ubah))));

  body.querySelectorAll('[data-hapus]').forEach(b =>
    b.addEventListener('click', () => hapus(Number(b.dataset.hapus), b.dataset.nama)));
}

function form(p = null) {
  const ubah = Boolean(p);

  const el = modal(`
    <div class="modal__head">
      <div>
        <h2 class="modal__title">${ubah ? 'Ubah program' : 'Tambah program'}</h2>
        <p class="modal__sub">Kode dipakai sebagai singkatan di seluruh sistem.</p>
      </div>
      <button class="modal__x" data-close aria-label="Tutup">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor"
             stroke-width="1.8" stroke-linecap="round"><path d="M5 5l10 10M15 5 5 15"/></svg>
      </button>
    </div>

    <div class="modal__body">
      <div class="field">
        <label class="field__label" for="p-nama">Nama program</label>
        <input class="input" type="text" id="p-nama" value="${esc(p?.nama ?? '')}"
               placeholder="Teknik Kendaraan Ringan">
      </div>

      <div class="field">
        <label class="field__label" for="p-kode">Kode</label>
        <input class="input" type="text" id="p-kode" value="${esc(p?.kode ?? '')}"
               placeholder="TKR" maxlength="10"
               style="text-transform: uppercase;">
        <p class="field__hint">Singkatan, maksimal 10 karakter. Contoh: TKR, TITL, RPL.</p>
      </div>

      ${ubah ? `
        <label class="check ${p.aktif ? 'check--on' : ''}" id="p-aktif-wrap"
               style="margin-bottom:0">
          <input type="checkbox" id="p-aktif" ${p.aktif ? 'checked' : ''}>
          <span class="check__box" aria-hidden="true">
            <svg width="11" height="11" viewBox="0 0 20 20" fill="none" stroke="currentColor"
                 stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
              <path d="M16.5 5.5 8 14 3.5 9.5"/></svg>
          </span>
          <span>Aktif — dapat dipilih saat membuat kompetensi dan kelas</span>
        </label>` : ''}
    </div>

    <div class="modal__foot">
      <button class="btn btn--secondary" data-close>Batal</button>
      <button class="btn btn--primary" id="p-save">
        <span id="p-label">${ubah ? 'Simpan' : 'Buat program'}</span>
      </button>
    </div>
  `);

  const aktif = el.querySelector('#p-aktif');
  aktif?.addEventListener('change', () =>
    el.querySelector('#p-aktif-wrap').classList.toggle('check--on', aktif.checked));

  el.querySelector('#p-save').addEventListener('click', async () => {
    const nama = el.querySelector('#p-nama').value.trim();
    const kode = el.querySelector('#p-kode').value.trim().toUpperCase();

    if (!nama || !kode) {
      toast.danger('Lengkapi dulu', 'Nama dan kode wajib diisi.');
      return;
    }

    const btn = el.querySelector('#p-save');
    const label = el.querySelector('#p-label');

    btn.disabled = true;
    label.textContent = 'Menyimpan';

    try {
      await api.admin.simpanProgram({
        id: p?.id,
        nama,
        kode,
        aktif: aktif?.checked ?? true
      });

      toast.success(ubah ? 'Program diperbarui' : 'Program dibuat');
      el.tutup();
      muat();

    } catch (err) {
      toast.danger('Gagal menyimpan', err.message);
      btn.disabled = false;
      label.textContent = ubah ? 'Simpan' : 'Buat program';
    }
  });
}

async function hapus(id, nama) {
  const ya = await konfirmasi({
    judul: `Hapus ${nama}?`,
    pesan: 'Program yang masih punya kompetensi atau kelas tidak dapat dihapus.',
    aksi: 'Hapus',
    nada: 'danger'
  });

  if (!ya) return;

  try {
    await api.admin.hapusProgram(id);
    toast.success('Program dihapus');
    muat();
  } catch (err) {
    toast.danger('Tidak dapat dihapus', err.message, { duration: 7000 });
  }
}