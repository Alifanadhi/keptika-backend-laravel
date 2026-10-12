// Guru — form tambah/ubah kompetensi (fitur baru: guru bisa input kompetensi sendiri).
// ?id=<n> → mode ubah, tanpa param → mode tambah.

import { renderShell, esc } from '../core/shell.js';
import { api } from '../core/api.js';
import { toast } from '../core/toast.js';
import { konfirmasi } from '../core/dialog.js';

const ID = new URLSearchParams(location.search).get('id');
const UBAH = Boolean(ID);

const main = renderShell({
  active: 'kompetensi',
  title: UBAH ? 'Ubah kompetensi' : 'Tambah kompetensi',
  sub: 'Tahapan job-sheet inilah yang nanti dicentang siswa saat melapor.'
});

let PROGRAM = [];
let tahapan = [];   // { id?, teks }
let dipakai = false;

main.innerHTML = `<div id="body">${skeleton()}</div>`;
const body = document.getElementById('body');

(async function init() {
  try {
    const p = await api.admin.listProgram();
    const programRaw = p?.program_list ?? p?.data ?? [];
    PROGRAM = programRaw.filter(x => x.aktif);

    if (!PROGRAM.length) {
      body.innerHTML = `
        <div class="card">
          <div class="empty">
            <p class="empty__title">Belum ada program keahlian</p>
            <p class="empty__desc">
              Kompetensi harus dimiliki satu program keahlian.
              Minta admin membuatkan program keahliannya dulu.
            </p>
            <a class="btn btn--secondary" href="kelas.html">Kembali</a>
          </div>
        </div>`;
      return;
    }

    let k = null;
    if (UBAH) {
      const res = await api.admin.detailKompetensi(ID);
      k = res?.kompetensi ?? res?.data ?? null;
      
      if (k) {
        dipakai = k.dipakai ?? false;
        const tahapanRaw = k.tahapan ?? k.tahapan_list ?? [];
        tahapan = tahapanRaw.map(t => ({ id: t.id, teks: t.teks ?? t.deskripsi_tahapan ?? '' }));
      }
    } else {
      tahapan = [{ teks: '' }];
    }

    render(k);

  } catch (err) {
    toast.danger('Gagal memuat', err.message);
    body.innerHTML = `
      <div class="card">
        <div class="empty">
          <p class="empty__title">Tidak dapat memuat</p>
          <p class="empty__desc">${esc(err.message)}</p>
          <a class="btn btn--secondary" href="kompetensi.html">Kembali</a>
        </div>
      </div>`;
  }
})();

function render(k) {
  const namaKomp = k?.nama ?? k?.nama_kompetensi ?? '';

  body.innerHTML = `
    <div class="grid grid--main">

      <div class="stack">

        <div class="card">
          <div class="card__header">
            <h2 class="card__title">Informasi kompetensi</h2>
          </div>

          <div class="field">
            <label class="field__label" for="nama">Nama kompetensi</label>
            <input class="input" type="text" id="nama" required
                   value="${esc(namaKomp)}"
                   placeholder="Servis Sistem Rem Cakram">
          </div>

          <div class="field">
            <label class="field__label" for="deskripsi">Deskripsi</label>
            <textarea class="textarea" id="deskripsi"
              placeholder="Ringkasan singkat isi kompetensi.">${esc(k?.deskripsi ?? '')}</textarea>
          </div>

          <div class="grid grid--2">
            <div class="field">
              <label class="field__label" for="program">Program keahlian</label>
              <select class="select" id="program" required>
                <option value="">Pilih program</option>
                ${PROGRAM.map(p => `
                  <option value="${p.id}" ${String(k?.program_id) === String(p.id) ? 'selected' : ''}>
                    ${esc(p.nama)}
                  </option>`).join('')}
              </select>
            </div>

            <div class="field">
              <label class="field__label" for="durasi">Waktu standar (menit)</label>
              <input class="input" type="number" id="durasi" min="5" max="600" step="5"
                     value="${k?.durasi_standar ?? 90}" required>
              <p class="field__hint">Dipakai menilai ketepatan waktu.</p>
            </div>
          </div>

          ${UBAH ? `
            <label class="check ${k?.aktif ? 'check--on' : ''}" id="aktif-wrap">
              <input type="checkbox" id="aktif" ${k?.aktif ? 'checked' : ''}>
              <span class="check__box" aria-hidden="true">${centang()}</span>
              <span>
                Aktif — tampil di daftar pilihan guru dan siswa
              </span>
            </label>` : ''}
        </div>

        <div class="card">
          <div class="card__header">
            <div>
              <h2 class="card__title">Tahapan job-sheet</h2>
              <p class="card__subtitle">
                Urutan langkah kerja yang dicentang siswa saat melapor.
              </p>
            </div>
            <span class="badge badge--neutral" id="jumlah-tahap">
              ${tahapan.length} tahapan
            </span>
          </div>

          ${dipakai ? `
            <div class="alert alert--info" style="margin-bottom: var(--sp-4);">
              <span class="alert__icon" aria-hidden="true">${infoIcon()}</span>
              <span>
                Kompetensi ini sudah punya laporan siswa. Mengubah tahapan
                aman — laporan lama tetap menampilkan progres yang benar.
              </span>
            </div>` : ''}

          <div id="tahapan"></div>

          <button type="button" class="btn btn--secondary btn--block" id="tambah-tahap"
                  style="margin-top: var(--sp-3);">
            Tambah tahapan
          </button>
        </div>

      </div>

      <div class="stack">
        <div class="card">
          <p class="section__title">Simpan</p>
          <div class="stack" style="gap: var(--sp-2);">
            <button class="btn btn--primary btn--block" id="simpan">
              <span id="simpan-label">
                ${UBAH ? 'Simpan perubahan' : 'Buat kompetensi'}
              </span>
            </button>
            <a class="btn btn--secondary btn--block" href="kompetensi.html">Batal</a>
          </div>
        </div>

        <div class="alert alert--warning">
          <span class="alert__icon" aria-hidden="true">${warnIcon()}</span>
          <span>
            Tahapan yang baik bersifat teramati — siswa harus bisa menjawab
            "sudah" atau "belum" tanpa ragu.
          </span>
        </div>
      </div>

    </div>
  `;

  renderTahapan();
  bind();
}

function renderTahapan() {
  const wrap = document.getElementById('tahapan');
  if (!wrap) return;

  wrap.innerHTML = tahapan.map((t, i) => `
    <div class="tahap" data-i="${i}">
      <span class="tahap__num num">${i + 1}</span>

      <input class="input tahap__input" type="text"
             value="${esc(t.teks)}"
             placeholder="Contoh: Pembongkaran kaliper"
             data-teks="${i}">

      <div class="tahap__aksi">
        <button type="button" class="tahap__btn" data-naik="${i}"
                ${i === 0 ? 'disabled' : ''} aria-label="Naikkan tahapan ${i + 1}">
          <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor"
               stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10 15.5V5M5.5 9 10 4.5 14.5 9"/>
          </svg>
        </button>
        <button type="button" class="tahap__btn" data-turun="${i}"
                ${i === tahapan.length - 1 ? 'disabled' : ''}
                aria-label="Turunkan tahapan ${i + 1}">
          <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor"
               stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10 4.5V15M14.5 11 10 15.5 5.5 11"/>
          </svg>
        </button>
        <button type="button" class="tahap__btn tahap__btn--x" data-hapus="${i}"
                ${tahapan.length === 1 ? 'disabled' : ''}
                aria-label="Hapus tahapan ${i + 1}">
          <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor"
               stroke-width="1.8" stroke-linecap="round">
            <path d="M5 5l10 10M15 5 5 15"/>
          </svg>
        </button>
      </div>
    </div>
  `).join('');

  const badgeJumlah = document.getElementById('jumlah-tahap');
  if (badgeJumlah) badgeJumlah.textContent = `${tahapan.length} tahapan`;

  wrap.querySelectorAll('[data-teks]').forEach(el =>
    el.addEventListener('input', () => {
      tahapan[Number(el.dataset.teks)].teks = el.value;
      el.classList.remove('input--error');
    }));

  wrap.querySelectorAll('[data-naik]').forEach(b =>
    b.addEventListener('click', () => geser(Number(b.dataset.naik), -1)));

  wrap.querySelectorAll('[data-turun]').forEach(b =>
    b.addEventListener('click', () => geser(Number(b.dataset.turun), 1)));

  wrap.querySelectorAll('[data-hapus]').forEach(b =>
    b.addEventListener('click', () => hapusTahap(Number(b.dataset.hapus))));
}

function geser(i, arah) {
  const j = i + arah;
  if (j < 0 || j >= tahapan.length) return;

  [tahapan[i], tahapan[j]] = [tahapan[j], tahapan[i]];
  renderTahapan();

  document.querySelector(`[data-${arah < 0 ? 'naik' : 'turun'}="${j}"]`)?.focus();
}

async function hapusTahap(i) {
  const t = tahapan[i];

  if (t.teks.trim() && dipakai && t.id) {
    const ya = await konfirmasi({
      judul: 'Hapus tahapan ini?',
      pesan: 'Laporan siswa yang sudah masuk tetap menampilkan progres yang benar.',
      aksi: 'Hapus',
      nada: 'danger'
    });
    if (!ya) return;
  }

  tahapan.splice(i, 1);
  renderTahapan();
}

function bind() {
  document.getElementById('tambah-tahap').addEventListener('click', () => {
    tahapan.push({ teks: '' });
    renderTahapan();

    const inputs = document.querySelectorAll('[data-teks]');
    inputs[inputs.length - 1]?.focus();
  });

  const aktif = document.getElementById('aktif');
  aktif?.addEventListener('change', () =>
    document.getElementById('aktif-wrap').classList.toggle('check--on', aktif.checked));

  document.getElementById('simpan').addEventListener('click', simpan);
}

async function simpan() {
  const nama = document.getElementById('nama');
  const prog = document.getElementById('program');
  const dur  = document.getElementById('durasi');

  const kurang = [];
  if (!nama.value.trim()) { kurang.push('nama'); nama.classList.add('input--error'); }
  if (!prog.value)        { kurang.push('program keahlian'); }
  if (!dur.value)         { kurang.push('waktu standar'); }

  let adaKosong = false;
  document.querySelectorAll('[data-teks]').forEach((el, i) => {
    if (!tahapan[i] || !tahapan[i].teks.trim()) {
      el.classList.add('input--error');
      adaKosong = true;
    }
  });

  if (adaKosong) kurang.push('teks tahapan');

  if (kurang.length) {
    toast.danger('Lengkapi dulu', `Belum diisi: ${kurang.join(', ')}.`);
    return;
  }

  const btn   = document.getElementById('simpan');
  const label = document.getElementById('simpan-label');

  btn.disabled = true;
  label.textContent = 'Menyimpan';
  btn.prepend(Object.assign(document.createElement('span'), { className: 'btn__spinner' }));

  try {
    // REVISI: Mengirimkan string asli ID kompetensi dan program_id agar sinkron dengan tipe data VARCHAR database
    await api.admin.simpanKompetensi({
      id: UBAH ? ID : undefined, 
      nama: nama.value.trim(),
      deskripsi: document.getElementById('deskripsi').value.trim(),
      program_id: prog.value, 
      durasi_standar: Number(dur.value),
      aktif: document.getElementById('aktif')?.checked ?? true,
      tahapan: tahapan
    });

    toast.success(
      UBAH ? 'Perubahan disimpan' : 'Kompetensi dibuat',
      `${nama.value.trim()} siap dipakai.`
    );

    setTimeout(() => { window.location.href = 'kompetensi.html'; }, 900);

  } catch (err) {
    toast.danger('Gagal menyimpan', err.message);
    btn.disabled = false;
    label.textContent = UBAH ? 'Simpan perubahan' : 'Buat kompetensi';
    btn.querySelector('.btn__spinner')?.remove();
  }
}

function centang() {
  return `<svg width="11" height="11" viewBox="0 0 20 20" fill="none" stroke="currentColor"
    stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M16.5 5.5 8 14 3.5 9.5"/></svg>`;
}

function infoIcon() {
  return `<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor"
    stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="10" cy="10" r="7.5"/><path d="M10 13.5v-4M10 6.5h.01"/></svg>`;
}

function warnIcon() {
  return `<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor"
    stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10 2.5 18 16H2Z"/><path d="M10 8v3.5M10 14h.01"/></svg>`;
}

function skeleton() {
  return `
    <div class="grid grid--main">
      <div class="skeleton" style="height:420px; border-radius: var(--r-lg);"></div>
      <div class="skeleton" style="height:160px; border-radius: var(--r-lg);"></div>
    </div>`;
}