// Admin — daftar kompetensi.

import { renderShell, esc } from '../core/shell.js';
import { api } from '../core/api.js';
import { toast } from '../core/toast.js';
import { konfirmasi } from '../core/dialog.js';

const main = renderShell({
  active: 'kompetensi',
  title: 'Kompetensi',
  sub: 'Kompetensi praktik dan tahapan job-sheet-nya.'
});

let PROGRAM = [];

main.innerHTML = `
  <div class="row row--wrap" style="margin-bottom: var(--sp-5);">
    <div class="field" style="margin:0; flex:1; min-width:220px; max-width:300px;">
      <label class="field__label" for="cari">Cari</label>
      <input class="input" type="search" id="cari" placeholder="Nama kompetensi">
    </div>
    <div class="field" style="margin:0; min-width:200px;">
      <label class="field__label" for="fprog">Program keahlian</label>
      <select class="select" id="fprog"><option value="">Semua</option></select>
    </div>
    <div class="spacer"></div>
    <a class="btn btn--primary" href="kompetensi-form.html" style="align-self:flex-end;">
      Tambah kompetensi
    </a>
  </div>

  <div id="body">${skeleton()}</div>
`;

const body  = document.getElementById('body');
const cari  = document.getElementById('cari');
const fprog = document.getElementById('fprog');

(async function init() {
  try {
    const p = await api.admin.listProgram();
    PROGRAM = p?.program_list ?? p?.data ?? [];

    fprog.innerHTML = '<option value="">Semua</option>' +
      PROGRAM.map(x => `<option value="${x.id}">${esc(x.nama)}</option>`).join('');

    cari.addEventListener('input', debounce(muat, 250));
    fprog.addEventListener('change', muat);

    muat();
  } catch (err) {
    toast.danger('Gagal memuat', err.message);
  }
})();

async function muat() {
  body.innerHTML = skeleton();

  try {
    const respon = await api.admin.listKompetensi({
      q: cari.value ? cari.value.trim() : "",
      program_id: fprog.value ? fprog.value : ""
    });
    
    const daftarKompetensi = respon?.kompetensi_list ?? respon?.data ?? respon?.kompetensi ?? [];
    
    render(daftarKompetensi);
  } catch (err) {
    toast.danger('Gagal memuat', err.message);
  }
}

function render(list) {
  const daftarAman = Array.isArray(list) ? list : [];

  if (!daftarAman.length) {
    const nyaring = cari.value || fprog.value;

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
          <p class="empty__title">
            ${nyaring ? 'Tidak ada yang cocok' : 'Belum ada kompetensi'}
          </p>
          <p class="empty__desc">
            ${nyaring
              ? 'Ubah kata kunci atau filter program keahlian.'
              : 'Tambahkan kompetensi agar guru dapat menilai dan siswa dapat melaporkan progres.'}
          </p>
          ${nyaring ? '' :
            '<a class="btn btn--primary" href="kompetensi-form.html">Tambah kompetensi</a>'}
        </div>
      </div>`;
    return;
  }

  body.innerHTML = `<div class="grid grid--2">${daftarAman.map(kartu).join('')}</div>`;

  // REVISI METODE BINDING: Menggunakan data-status murni yang dikonversi secara aman menggunakan parseInt
  body.querySelectorAll('[data-toggle-status]').forEach(b =>
    b.addEventListener('click', () => {
      const id = b.dataset.toggleStatus;
      const statusSaatIni = parseInt(b.dataset.status, 10);
      toggleStatus(id, statusSaatIni, b);
    })
  );

  body.querySelectorAll('[data-hapus]').forEach(b =>
    b.addEventListener('click', () => hapus(b.dataset.hapus, b.dataset.nama)));
}

function kartu(k) {
  const listTahapan = k?.tahapan ?? [];
  const namaTampil = k?.nama ?? k?.nama_kompetensi ?? "Tanpa Nama";
  const namaProg = k?.program_keahlian ?? "Umum";
  const nilaiStatus = k?.aktif ? 1 : 0;

  return `
    <div class="card">
      <div class="card__header">
        <div style="min-width:0">
          <h3 class="card__title" style="font-size: var(--fs-body);">${esc(namaTampil)}</h3>
          <p class="card__subtitle">${esc(namaProg)}</p>
        </div>
        <div class="row" style="gap: var(--sp-2); flex-shrink:0;">
          <!-- REVISI INTERAKTIF: Menggunakan data-status tunggal tanpa strip agar kebal dari bug camelCase DOM -->
          <button class="badge ${k.aktif ? 'badge--success' : 'badge--neutral'}" 
                  style="cursor: pointer; border: none; font-family: inherit; padding: 4px 8px; border-radius: var(--r-md);"
                  data-toggle-status="${k.id}" 
                  data-status="${nilaiStatus}"
                  title="Klik untuk mengubah status keaktifan">
            ${k.aktif ? 'Aktif' : 'Nonaktif'}
          </button>
        </div>
      </div>

      <p style="font-size: var(--fs-small); color: var(--text-muted);
                line-height: var(--lh-relaxed); margin-bottom: var(--sp-4); min-height: 40px;">
        ${esc(k.deskripsi || '')}
      </p>

      <div class="row" style="gap: var(--sp-4); margin-bottom: var(--sp-4);
           padding-bottom: var(--sp-4); border-bottom: 1px solid var(--slate-100);">
        <span style="font-size: var(--fs-caption); color: var(--text-muted);">
          <span class="num" style="color: var(--text-title); font-weight: 600;">${listTahapan.length}</span> tahapan
        </span>
        <span style="font-size: var(--fs-caption); color: var(--text-muted);">
          <span class="num" style="color: var(--text-title); font-weight: 600;">${k.durasi_standar ?? 90}</span> menit
        </span>
        ${k.dipakai ? '<span class="badge badge--info">Sudah dipakai</span>' : ''}
      </div>

      <ol style="list-style:none; margin-bottom: var(--sp-4); padding: 0;">
        ${listTahapan.slice(0, 3).map((t, i) => `
          <li style="display:flex; gap: var(--sp-3); padding: 5px 0;">
            <span class="num" style="font-size: var(--fs-caption);
                  color: var(--text-hint); min-width:14px;">${i + 1}</span>
            <span style="font-size: var(--fs-small); color: var(--text-body);">
              ${esc(t.teks || t.deskripsi_tahapan)}
            </span>
          </li>
        `).join('')}
        ${listTahapan.length > 3 ? `
          <li style="padding: 5px 0 0 26px; font-size: var(--fs-caption);
              color: var(--text-hint);">
            +${listTahapan.length - 3} tahapan lagi
          </li>` : ''}
      </ol>

      <div class="row" style="gap: var(--sp-2);">
        <a class="btn btn--secondary btn--sm" href="kompetensi-form.html?id=${k.id}">
          Ubah
        </a>
        <button class="btn btn--ghost btn--sm" data-hapus="${k.id}"
                data-nama="${esc(namaTampil)}">
          Hapus
        </button>
      </div>
    </div>`;
}

/**
 * IMPLEMENTASI TOGGLE STATUS FIXED:
 * Mengirimkan data parsial ke rute POST utama dengan indikator loading text (...)
 */
/**
 * IMPLEMENTASI TOGGLE STATUS RESMI:
 * Memanfaatkan modul ekspor tunggal api.admin untuk mengirim 
 * data mutasi parsial ter-otorisasi token Bearer.
 */
async function toggleStatus(idTarget, statusSaatIni, elemenTombol) {
  try {
    if (elemenTombol) {
      elemenTombol.disabled = true;
      elemenTombol.style.opacity = "0.6";
      elemenTombol.textContent = "...";
    }

    // Balikkan status keaktifan: jika 1 jadi 0, jika 0 jadi 1
    const statusBaru = statusSaatIni === 1 ? 0 : 1;

    // REVISI TOTAL: Mengganti raw fetch dengan wrapper resmi api agar token Bearer lolos ke database
    const hasil = await api.admin.simpanKompetensi({
      id: idTarget,
      aktif: statusBaru
    });

    toast.success('Status diperbarui', `Kompetensi kini ${statusBaru === 1 ? 'Aktif' : 'Nonaktif'}.`);
    
    // Refresh list reaktif setelah mutasi di MySQL sukses
    muat();

  } catch (err) {
    console.error("[DSS Status Update Error]:", err);
    toast.danger('Gagal memperbarui status', err.message);
    
    // Kembalikan ke keadaan semula jika proses simpan gagal
    if (elemenTombol) {
      elemenTombol.disabled = false;
      elemenTombol.style.opacity = "1";
      elemenTombol.textContent = statusSaatIni === 1 ? 'Aktif' : 'Nonaktif';
    }
  }
}

async function hapus(id, nama) {
  const ya = await konfirmasi({
    judul: `Hapus ${nama}?`,
    pesan: 'Tindakan ini tidak dapat dibatalkan.',
    aksi: 'Hapus',
    nada: 'danger'
  });

  if (!ya) return;

  try {
    await api.admin.hapusKompetensi(id);
    toast.success('Kompetensi dihapus');
    muat();
  } catch (err) {
    toast.danger('Tidak dapat dihapus', err.message, { duration: 7000 });
  }
}

function debounce(fn, ms) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}

function skeleton() {
  return `
    <div class="grid grid--2">
      ${[1, 2].map(() =>
        `<div class="skeleton" style="height:300px; border-radius: var(--r-lg);"></div>`
      ).join('')}
    </div>`;
}