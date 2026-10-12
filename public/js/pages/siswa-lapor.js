// Siswa — lapor progres praktik.

import { renderShell, esc } from '../core/shell.js';
import { api } from '../core/api.js';
import { toast } from '../core/toast.js';
import { auth } from '../core/auth.js';

const main = renderShell({
  active: 'lapor',
  title: 'Lapor praktik hari ini',
  sub: 'Ceritakan progres Anda. Guru akan membacanya.'
});

const KENDALA = [
  'Menunggu giliran alat',
  'Alat rusak atau tidak lengkap',
  'Belum paham langkah kerja',
  'Waktu praktik tidak cukup'
];

let KOMPETENSI = [];
let tahapan = [];      // { id, teks }
let dicentang = new Set();  // ID tahapan yang selesai

main.innerHTML = `
  <div class="grid grid--main">
    <div class="card" id="form-card">
      <div class="skeleton" style="height:20px; width:200px; margin-bottom: var(--sp-5);"></div>
      <div class="skeleton" style="height:180px;"></div>
    </div>
    <div class="stack" id="side"></div>
  </div>
`;

(async function init() {
  try {
    const k = await api.admin.listKompetensi();
    const user = auth.user();

    // EKSTRAKSI DEFENTIF: Ambil array daftar kompetensi secara fleksibel
    const rawList = k?.kompetensi_list ?? k?.data ?? k?.kompetensi ?? [];

    // REVISI FILTER SINKRON:
    // Gunakan == (bukan ===) agar mencocokkan string "2" dengan angka 2
    // Serta berikan fallback jika siswa belum memiliki program_id terikat
    KOMPETENSI = rawList.filter(x => {
      const isAktif = Boolean(x.aktif);
      const matchProgram = !user?.program_id || String(x.program_id) === String(user.program_id);
      
      return isAktif && matchProgram;
    });

    // FALLBACK SAFETY: Jika setelah terfilter hasilnya 0 (misal jurusan tidak cocok),
    // tampilkan seluruh kompetensi aktif agar siswa tidak mengalami kendala form kosong
    if (KOMPETENSI.length === 0) {
      KOMPETENSI = rawList.filter(x => Boolean(x.aktif));
    }

    renderForm();
  } catch (err) {
    toast.danger('Data gagal dimuat', err.message);
  }
})();

function renderForm() {
  document.getElementById('form-card').innerHTML = `
    <div class="card__header">
      <div>
        <h2 class="card__title">Laporan praktik</h2>
        <p class="card__subtitle">Isi sejujurnya — ini membantu guru membantu Anda.</p>
      </div>
    </div>

    <form id="form">

      <div class="field">
        <label class="field__label" for="komp">Kompetensi hari ini</label>
        <select class="select" id="komp" required>
          <option value="">Pilih kompetensi</option>
          ${KOMPETENSI.map(k =>
            `<option value="${k.id}">${esc(k.nama)}</option>`
          ).join('')}
        </select>
      </div>

      <div id="tahap-slot"></div>

      <div id="rest" class="hidden">

        <div class="divider"></div>

        <div class="field">
          <label class="field__label">Status penyelesaian</label>
          <div class="row" style="gap: var(--sp-2); align-items:stretch;">
            <button type="button" class="btn btn--secondary" style="flex:1"
                    data-st="belum_selesai">Belum selesai</button>
            <span class="badge badge--neutral" id="status-auto"
                  style="flex:1; display:flex; align-items:center; justify-content:center; text-align:center;">
              Selesaikan semua tahapan
            </span>
          </div>
          <p class="field__hint">
            "Selesai" tercentang otomatis begitu semua tahapan di atas sudah dicentang —
            tidak perlu menekan tombol apa pun lagi.
          </p>
        </div>

        <div class="field hidden" id="waktu-field">
          <label class="field__label" for="waktu">Jam selesai</label>
          <input class="input" type="time" id="waktu">
          <p class="field__hint">Terisi otomatis sesuai jam di perangkat Anda. Bisa diubah bila perlu.</p>
        </div>

        <div class="field">
          <label class="field__label">
            Seberapa aktif Anda terlibat hari ini?
          </label>
          <div class="rating" id="rate-K">
            ${[1,2,3,4,5].map(n =>
              `<button type="button" class="rating__opt" data-v="${n}">${n}</button>`
            ).join('')}
          </div>
          <p class="field__hint">1 = banyak menganggur · 5 = terus bekerja</p>
        </div>

        <div class="field">
          <label class="field__label">Kendala yang Anda alami</label>
          <div class="stack" style="gap: var(--sp-2);">
            ${KENDALA.map((k, i) => `
              <label class="check" data-k="${i}">
                <input type="checkbox" value="${esc(k)}">
                <span class="check__box" aria-hidden="true">
                  <svg width="11" height="11" viewBox="0 0 20 20" fill="none"
                       stroke="currentColor" stroke-width="2.6"
                       stroke-linecap="round" stroke-linejoin="round">
                    <path d="M16.5 5.5 8 14 3.5 9.5"/>
                  </svg>
                </span>
                <span>${esc(k)}</span>
              </label>
            `).join('')}
          </div>
          <p class="field__hint">Kosongkan kalau tidak ada kendala.</p>
        </div>

        <div class="field">
          <label class="field__label" for="catatan">
            Catatan atau pertanyaan untuk guru
          </label>
          <textarea class="textarea" id="catatan"
            placeholder="Contoh: Bingung urutan pemasangan seal kaliper. Boleh minta didemokan lagi?"></textarea>
        </div>

        <button type="submit" class="btn btn--primary btn--block" id="submit">
          <span id="submit-label">Kirim laporan</span>
        </button>

      </div>
    </form>
  `;

  bind();
}

// Interaksi

let status = null;
let keterlibatan = null;

function bind() {
  const komp = document.getElementById('komp');
  const slot = document.getElementById('tahap-slot');
  const rest = document.getElementById('rest');

  /* Tahapan job-sheet baru muncul setelah kompetensi
     dipilih. Tanpa itu, checklist tidak punya arti. */
  komp.addEventListener('change', () => {
    // REVISI STRUKTUR ID: ID berupa string "kmp_xxx", bandingkan secara string murni (jangan dikonversi ke Number)
    const k = KOMPETENSI.find(x => String(x.id) === String(komp.value));

    if (!k) {
      slot.innerHTML = '';
      rest.classList.add('hidden');
      document.getElementById('side').innerHTML = '';
      return;
    }

    tahapan = k.tahapan || [];
    dicentang = new Set();
    renderTahapan(k);
    rest.classList.remove('hidden');
    renderSide(k);
  });

  /* Tombol "Belum selesai" — satu-satunya status yang masih perlu ditekan manual.
     "Selesai" sekarang ditandai otomatis lewat updateProgres() saat tahapan 100%. */
  document.querySelector('[data-st="belum_selesai"]')?.addEventListener('click', () => {
    setStatus('belum_selesai');
  });

  /* Rating keterlibatan */
  const rate = document.getElementById('rate-K');
  rate.addEventListener('click', e => {
    const b = e.target.closest('.rating__opt');
    if (!b) return;
    keterlibatan = Number(b.dataset.v);
    rate.querySelectorAll('.rating__opt').forEach(x =>
      x.classList.toggle('rating__opt--on', x === b)
    );
  });

  /* Kendala */
  document.querySelectorAll('.check[data-k]').forEach(l => {
    const cb = l.querySelector('input');
    cb.addEventListener('change', () => {
      l.classList.toggle('check--on', cb.checked);
    });
  });

  document.getElementById('form').addEventListener('submit', submit);
}

function renderTahapan(k) {
  document.getElementById('tahap-slot').innerHTML = `
    <div class="divider"></div>
    <p class="section__title">Tahapan yang sudah Anda selesaikan</p>

    <div id="steps">
      ${k.tahapan.map((t, i) => `
        <label class="step" data-id="${t.id}">
          <input type="checkbox">
          <span class="step__box" aria-hidden="true">
            <svg width="11" height="11" viewBox="0 0 20 20" fill="none"
                 stroke="currentColor" stroke-width="2.6"
                 stroke-linecap="round" stroke-linejoin="round">
              <path d="M16.5 5.5 8 14 3.5 9.5"/>
            </svg>
          </span>
          <span class="step__num">${i + 1}</span>
          <span class="step__text">${esc(t.teks)}</span>
        </label>
      `).join('')}
    </div>

    <div class="bar-row" style="margin-top: var(--sp-4);">
      <div class="bar">
        <div class="bar__fill" id="prog-bar" style="width:0%"></div>
      </div>
      <span class="bar-row__num" id="prog-num">0%</span>
    </div>
  `;

  document.querySelectorAll('.step').forEach(s => {
    const cb = s.querySelector('input');
    cb.addEventListener('change', () => {
      const id = s.dataset.id;
      if (cb.checked) dicentang.add(id);
      else dicentang.delete(id);

      s.classList.toggle('step--done', cb.checked);
      updateProgres();
    });
  });
}

function updateProgres() {
  const pct = tahapan.length ? Math.round((dicentang.size / tahapan.length) * 100) : 0;
  document.getElementById('prog-bar').style.width = `${pct}%`;
  document.getElementById('prog-num').textContent = `${pct}%`;
  renderSideProgres(pct);

  // FITUR BARU: begitu semua tahapan tercentang (100%), status otomatis
  // ditandai "selesai" — siswa tidak perlu lagi menekan tombol "Selesai".
  if (pct >= 100) {
    setStatus('selesai', { auto: true });
  } else if (status === 'selesai' && statusOtomatis) {
    // Siswa membatalkan salah satu centang setelah sempat 100% —
    // lepas status otomatis supaya tidak melaporkan "selesai" yang keliru.
    setStatus(null);
  }

  const badge = document.getElementById('status-auto');
  if (badge && status !== 'belum_selesai') {
    if (pct >= 100) {
      badge.textContent = '✓ Selesai (otomatis)';
      badge.className = 'badge badge--success';
    } else {
      badge.textContent = `Menunggu tahapan 100% (${pct}%)`;
      badge.className = 'badge badge--neutral';
    }
  }
}

/* Status "selesai" mengisi & menampilkan jam otomatis sesuai jam perangkat.
   Status "belum_selesai" tetap bisa dipilih manual kapan pun oleh siswa. */
let statusOtomatis = false;

function setStatus(st, { auto = false } = {}) {
  status = st;
  statusOtomatis = auto;

  const btnBelum = document.querySelector('[data-st="belum_selesai"]');
  btnBelum?.classList.toggle('btn--primary', st === 'belum_selesai');
  btnBelum?.classList.toggle('btn--secondary', st !== 'belum_selesai');

  const waktuField = document.getElementById('waktu-field');
  const waktuInput = document.getElementById('waktu');
  const tampilkanJam = st === 'selesai';

  waktuField?.classList.toggle('hidden', !tampilkanJam);

  if (tampilkanJam && waktuInput && !waktuInput.value) {
    // Jam otomatis sesuai jam di perangkat siswa saat ini.
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    waktuInput.value = `${hh}:${mm}`;
  }
}

// Panel samping

function renderSide(k) {
  document.getElementById('side').innerHTML = `
    <div class="card">
      <p class="section__title">Kompetensi</p>
      <h3 style="font-size: var(--fs-h3); margin-bottom: var(--sp-2);">
        ${esc(k.nama)}
      </h3>
      <p style="font-size: var(--fs-small); color: var(--text-muted);
                line-height: var(--lh-relaxed); margin-bottom: var(--sp-4);">
        ${esc(k.deskripsi)}
      </p>

      <div class="row" style="padding-top: var(--sp-3);
           border-top: 1px solid var(--slate-100);">
        <span style="font-size: var(--fs-caption); color: var(--text-muted);">
          Waktu standar
        </span>
        <span class="spacer"></span>
        <span class="num" style="font-size: var(--fs-body); color: var(--text-title);">
          ${k.durasi_standar} menit
        </span>
      </div>
    </div>

    <div class="metric" id="side-prog">
      <p class="metric__label">Progres Anda</p>
      <p class="metric__value">0%</p>
      <p class="metric__foot">0 dari ${k.tahapan.length} tahapan selesai</p>
    </div>
  `;
}

function renderSideProgres(pct) {
  const card = document.getElementById('side-prog');
  if (!card) return;

  card.querySelector('.metric__value').textContent = `${pct}%`;
  card.querySelector('.metric__foot').textContent =
    `${dicentang.size} dari ${tahapan.length} tahapan selesai`;
}

// Kirim

async function submit(e) {
  e.preventDefault();

  const komp = document.getElementById('komp').value;

  const kurang = [];
  if (!komp)              kurang.push('kompetensi');
  if (!status)            kurang.push('status penyelesaian');
  if (keterlibatan === null) kurang.push('tingkat keterlibatan');

  if (kurang.length) {
    toast.danger('Lengkapi dulu', `Belum diisi: ${kurang.join(', ')}.`);
    return;
  }

  const kendala = [...document.querySelectorAll('.check[data-k] input:checked')]
    .map(c => c.value);

  const btn   = document.getElementById('submit');
  const label = document.getElementById('submit-label');

  btn.disabled = true;
  label.textContent = 'Mengirim';
  btn.prepend(Object.assign(document.createElement('span'), {
    className: 'btn__spinner'
  }));

  try {
    await api.siswa.kirimLaporan({
      kompetensi_id:   komp, // Gunakan string ID mentah "kmp_xxx" dari <select>
      tahapan_selesai: [...dicentang],
      status,
      waktu_selesai:   status === 'selesai' ? (document.getElementById('waktu').value || null) : null,
      keterlibatan_self: keterlibatan,
      kendala,
      catatan:         document.getElementById('catatan').value.trim()
    });

    toast.success(
      'Laporan terkirim',
      'Guru Anda sudah menerima notifikasi.'
    );

    /* Alihkan ke riwayat. Siswa yang baru mengirim
       ingin melihat bukti bahwa laporannya masuk —
       bukan form kosong yang sama. */
    setTimeout(() => {
      window.location.href = 'riwayat.html';
    }, 1200);

  } catch (err) {
    toast.danger('Gagal mengirim', err.message);
    btn.disabled = false;
    label.textContent = 'Kirim laporan';
    btn.querySelector('.btn__spinner')?.remove();
  }
}
