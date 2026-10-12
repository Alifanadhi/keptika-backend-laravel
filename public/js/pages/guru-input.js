// Guru — input penilaian aktivitas praktik.

import { renderShell, esc } from '../core/shell.js';
import { api } from '../core/api.js';
import { toast } from '../core/toast.js';
import { auth } from '../core/auth.js';
import { klasifikasi, tone, severity } from '../core/rules.js';

const main = renderShell({
  active: 'input',
  title: 'Input aktivitas praktik',
  sub: 'Catat pengamatan Anda. Sistem mengusulkan langkah berikutnya.'
});

let SISWA = [];
let KOMPETENSI = [];

/* Kerangka halaman. Dirender lebih dulu supaya
   ada sesuatu di layar sementara data dimuat. */
main.innerHTML = `
  <div class="grid grid--main">

    <div class="card">
      <div class="card__header">
        <div>
          <h2 class="card__title">Penilaian aktivitas</h2>
          <p class="card__subtitle">Empat indikator dari kerangka learning analytics.</p>
        </div>
      </div>

      <form id="form">

        <div class="grid grid--3" style="margin-bottom: var(--sp-4);">
          <div class="field" style="margin:0">
            <label class="field__label" for="kelas_select">Kelas</label>
            <select class="select" id="kelas_select" required>
              <option value="">Memuat kelas…</option>
            </select>
          </div>
          <div class="field" style="margin:0">
            <label class="field__label" for="siswa_select">Nama Siswa</label>
            <select class="select" id="siswa_select" required disabled>
              <option value="">Pilih kelas terlebih dahulu</option>
            </select>
          </div>
          <div class="field" style="margin:0">
            <label class="field__label" for="kompetensi">Kompetensi / Jobsheet</label>
            <select class="select" id="kompetensi" required disabled>
              <option value="">Pilih siswa terlebih dahulu</option>
            </select>
          </div>
        </div>

        <!-- 1. TAMBAHKAN SLOT INI UNTUK MENAMPUNG LAPORAN SISWA -->
        <div id="acuan-laporan-slot"></div>

        <div id="tahapan-slot"></div>

        <div class="divider"></div>

        <p class="section__title">Indikator pengamatan</p>

        <div class="field">
          <label class="field__label" for="P">
            P · Pemahaman langkah kerja
          </label>
          <div class="rating" id="rate-P">
            ${[1,2,3,4,5].map(n => `
              <button type="button" class="rating__opt" data-v="${n}">${n}</button>
            `).join('')}
          </div>
          <p class="field__hint">1 = tidak paham · 5 = paham penuh</p>
        </div>

        <div class="field">
          <label class="field__label" for="K">
            K · Keterlibatan selama praktik
          </label>
          <div class="rating" id="rate-K">
            ${[1,2,3,4,5].map(n => `
              <button type="button" class="rating__opt" data-v="${n}">${n}</button>
            `).join('')}
          </div>
          <p class="field__hint">1 = pasif · 5 = sangat aktif</p>
        </div>

        <div class="grid grid--2">
          <div class="field">
            <label class="field__label" for="E">E · Jumlah kesalahan</label>
            <input class="input" type="number" id="E" min="0" max="30" value="0" required>
            <p class="field__hint">Kesalahan prosedur yang teramati</p>
          </div>
          <div class="field">
            <label class="field__label" for="G">G · Progres penyelesaian</label>
            <div class="row">
              <input type="range" id="G" min="0" max="100" step="5" value="50"
                     style="flex:1" aria-describedby="g-out">
              <span class="num" id="g-out" style="min-width:44px; text-align:right;
                    font-size: var(--fs-body); color: var(--text-title);">50%</span>
            </div>
            <div class="bar bar--sm" style="margin-top: var(--sp-2);">
              <div class="bar__fill" id="g-bar" style="width:50%"></div>
            </div>
            <p class="field__hint" id="g-auto-hint" style="display:none; color: var(--petrol, #0E4C5A); font-weight: 500;">
              ✓ Progres 100% — otomatis ditandai selesai, tidak perlu tombol tambahan.
            </p>
          </div>
        </div>

        <div class="divider"></div>

        <div class="field">
          <label class="field__label" for="waktu">Ketepatan waktu</label>
          <select class="select" id="waktu">
            <option value="tepat">Tepat waktu</option>
            <option value="terlambat_ringan">Terlambat ringan</option>
            <option value="terlambat_berat">Terlambat berat</option>
          </select>
        </div>

        <label class="check" id="riwayat-wrap">
          <input type="checkbox" id="riwayat">
          <span class="check__box" aria-hidden="true">
            <svg width="11" height="11" viewBox="0 0 20 20" fill="none" stroke="currentColor"
                 stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
              <path d="M16.5 5.5 8 14 3.5 9.5"/>
            </svg>
          </span>
          <span>Siswa ini sudah pernah menerima intervensi sebelumnya</span>
        </label>

        <button type="submit" class="btn btn--primary btn--block" id="submit"
                style="margin-top: var(--sp-6);">
          <span id="submit-label">Simpan dan proses</span>
        </button>

      </form>
    </div>

    <div class="stack" id="side">
      <div class="card">
        <p class="section__title">Hasil</p>
        <div class="empty" style="padding: var(--sp-8) var(--sp-3);">
          <span class="empty__icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor"
                 stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 17V8.5M8.3 17V3.5M13.6 17v-6M18 17H2"/>
            </svg>
          </span>
          <p class="empty__title">Belum ada penilaian</p>
          <p class="empty__desc">
            Isi form di sebelah kiri. Rekomendasi akan muncul di sini setelah data disimpan.
          </p>
        </div>
      </div>
    </div>

  </div>
`;

// DOM Cache Elements
const form   = document.getElementById('form');
const submit = document.getElementById('submit');
const label  = document.getElementById('submit-label');

// Muat data Siswa dan atur event handler
(async function init() {
  const selectKelas = document.getElementById('kelas_select');
  const selectSiswa = document.getElementById('siswa_select');
  const selectKomp  = document.getElementById('kompetensi');

  try {
    // 1. Tarik Siswa yang Diampu Guru
    const resSiswa = await api.guru.listSiswa();
    SISWA = resSiswa?.siswa_list ?? resSiswa?.data ?? [];

    if (SISWA.length === 0) {
      selectKelas.innerHTML = '<option value="">Tidak ada siswa diampu</option>';
    } else {
      // FITUR BARU: kelas diambil lebih dulu supaya guru yang megang
      // beberapa kelas bisa mempersempit daftar siswa sebelum memilih.
      const daftarKelas = [...new Set(SISWA.map(s => s.kelas || 'Umum'))].sort();

      selectKelas.innerHTML = '<option value="">Pilih kelas</option>' +
        daftarKelas.map(k => `<option value="${esc(k)}">${esc(k)}</option>`).join('');
    }

  } catch (err) {
    toast.danger('Gagal memuat data siswa', err.message);
  }

  // Event Listener: Ketika Kelas Dipilih -> Isi Dropdown Nama Siswa Sesuai Kelas
  selectKelas.addEventListener('change', () => {
    const kelasTerpilih = selectKelas.value;

    // Reset dua dropdown turunannya setiap kali kelas berganti
    selectKomp.disabled = true;
    selectKomp.innerHTML = '<option value="">Pilih siswa terlebih dahulu</option>';
    KOMPETENSI = [];

    if (!kelasTerpilih) {
      selectSiswa.disabled = true;
      selectSiswa.innerHTML = '<option value="">Pilih kelas terlebih dahulu</option>';
      return;
    }

    const siswaKelasIni = SISWA.filter(s => (s.kelas || 'Umum') === kelasTerpilih);

    if (!siswaKelasIni.length) {
      selectSiswa.disabled = true;
      selectSiswa.innerHTML = '<option value="">Belum ada siswa di kelas ini</option>';
      return;
    }

    selectSiswa.disabled = false;
    selectSiswa.innerHTML = '<option value="">Pilih siswa</option>' +
      siswaKelasIni.map(s => `
        <option value="${s.id}" data-program="${s.program_id || ''}">
          ${esc(s.nama || s.nama_lengkap)}
        </option>
      `).join('');
  });

  // Event Listener: Ketika Siswa Dipilih -> Muat Kompetensi Sesuai Program ID Siswa
  selectSiswa.addEventListener('change', async () => {
    const siswaId = selectSiswa.value;
    const optTerpilih = selectSiswa.options[selectSiswa.selectedIndex];
    const programId = optTerpilih?.dataset?.program;

    if (!siswaId) {
      selectKomp.disabled = true;
      selectKomp.innerHTML = '<option value="">Pilih siswa terlebih dahulu</option>';
      KOMPETENSI = [];
      return;
    }

    selectKomp.disabled = true;
    selectKomp.innerHTML = '<option value="">Memuat kompetensi jurusan...</option>';

    try {
      // Tarik kompetensi ter-filter berbasis program_id milik siswa
      const resKomp = await api.guru.listKompetensi(programId);
      KOMPETENSI = resKomp?.kompetensi_list ?? resKomp?.data ?? [];

      if (KOMPETENSI.length === 0) {
        selectKomp.innerHTML = '<option value="">Tidak ada kompetensi untuk jurusan ini</option>';
        renderTahapan([]);
      } else {
        selectKomp.disabled = false;
        selectKomp.innerHTML = '<option value="">Pilih kompetensi / jobsheet</option>' +
          KOMPETENSI.map(k => `<option value="${k.id}">${esc(k.nama || k.nama_kompetensi)}</option>`).join('');
        renderTahapan([]);
      }
    } catch (err) {
      toast.danger('Gagal memuat kompetensi jurusan', err.message);
      selectKomp.innerHTML = '<option value="">Gagal memuat kompetensi</option>';
    }
  });

  // Saat kompetensi dipilih, tampilkan tahapan job-sheet yang tersimpan.
  // Tahapan bersifat informatif di form guru; penyelesaian tetap dilaporkan
  // siswa melalui halaman Lapor Praktik.
  selectKomp.addEventListener('change', async () => {
    const kompId = selectKomp.value;
    const siswaId = selectSiswa.value;
    const komp = KOMPETENSI.find(k => String(k.id) === String(kompId));
    
    renderTahapan(komp?.tahapan || []);
    
    // 2. TAMBAHKAN BARIS INI: Panggil acuan laporan saat kompetensi dipilih
    await loadAcuanLaporanSiswa(siswaId, kompId);
  });
})();

function renderTahapan(list) {
  const slot = document.getElementById('tahapan-slot');
  if (!slot) return;
  const tahapan = Array.isArray(list) ? list : [];

  if (!tahapan.length) {
    slot.innerHTML = '';
    return;
  }

  slot.innerHTML = `
    <div class="card" style="margin-top:var(--sp-4); background:var(--slate-50);">
      <p class="section__title">Tahapan job-sheet</p>
      <p class="field__hint" style="margin-bottom:var(--sp-3);">
        Tahapan yang menjadi acuan progres siswa pada kompetensi ini.
      </p>
      <ol style="margin:0; padding-left:1.35rem; display:grid; gap:var(--sp-2);">
        ${tahapan.map((t, i) => `
          <li style="padding-left:.25rem; color:var(--text-title);">
            <span style="font-size:var(--fs-small);">${esc(t.teks || t.deskripsi_tahapan || `Tahapan ${i + 1}`)}</span>
          </li>
        `).join('')}
      </ol>
    </div>`;
}

// 3. FUNGSI UNTUK MENGAMBIL DAN MENAMPILKAN KENDALA & CATATAN SISWA
async function loadAcuanLaporanSiswa(siswaId, kompId) {
  const slot = document.getElementById('acuan-laporan-slot');
  if (!slot) return;

  if (!siswaId || !kompId) {
    slot.innerHTML = '';
    return;
  }

  slot.innerHTML = '<p class="field__hint" style="margin-top:var(--sp-3);">Memuat acuan laporan siswa...</p>';

  try {
    const res = await api.guru.detailSiswa(siswaId);
    const laporanList = res?.laporan_list ?? res?.laporan ?? [];
    
    // Cari laporan siswa yang sesuai dengan kompetensi yang dipilih
    const lap = laporanList.find(l => String(l.kompetensi_id) === String(kompId)) || laporanList[0];

    if (!lap) {
      slot.innerHTML = `
        <div class="card" style="margin-top:var(--sp-4); background:#f8fafc; border-left:4px solid var(--amber-500, #f59e0b);">
          <p style="margin:0; font-size:var(--fs-small); color:var(--text-body);">
            ℹ️ Siswa ini belum mengirimkan laporan mandiri untuk kompetensi ini.
          </p>
        </div>`;
      return;
    }

    slot.innerHTML = `
      <div class="card" style="margin-top:var(--sp-4); background: #f0f9ff; border-left: 4px solid #0284c7; padding: var(--sp-4);">
        <p class="section__title" style="margin-top:0; color:#0369a1; display:flex; justify-content:space-between; align-items:center;">
          <span>📌 Acuan Laporan Mandiri Siswa</span>
          <span class="badge" style="background:#e0f2fe; color:#0369a1; font-size:0.75rem; padding:2px 8px; border-radius:4px;">
            Status: ${esc(lap.status || 'proses')}
          </span>
        </p>

        <div class="grid grid--2" style="gap:var(--sp-2); margin-bottom:var(--sp-3); font-size:var(--fs-small);">
          <div>
            <span style="color:var(--text-muted);">Mandiri / Keterlibatan Self:</span><br>
            <strong>${lap.keterlibatan_self ? `${lap.keterlibatan_self} / 5` : 'Belum diisi'}</strong>
          </div>
          <div>
            <span style="color:var(--text-muted);">Waktu Selesai Praktik:</span><br>
            <strong>${esc(lap.waktu_selesai || '-')}</strong>
          </div>
        </div>

        <div style="margin-bottom:var(--sp-3);">
          <span style="font-size:var(--fs-small); color:var(--text-muted); display:block; margin-bottom:4px;">Kendala yang Dilaporkan Siswa:</span>
          ${lap.kendala && lap.kendala.length > 0 ? `
            <div class="chips" style="display:flex; flex-wrap:wrap; gap:6px;">
              ${lap.kendala.map(k => `<span class="chip" style="background:#fef3c7; color:#92400e; font-size:0.8rem; padding:2px 8px; border-radius:4px;">⚠️ ${esc(k)}</span>`).join('')}
            </div>
          ` : '<p style="margin:0; font-size:var(--fs-small); color:var(--text-muted); font-style:italic;">Tidak ada kendala dilaporkan.</p>'}
        </div>

        <div>
          <span style="font-size:var(--fs-small); color:var(--text-muted); display:block; margin-bottom:4px;">Catatan Tambahan Siswa:</span>
          ${lap.catatan ? `
            <div style="background:#ffffff; padding:var(--sp-2) var(--sp-3); border-radius:6px; font-size:var(--fs-small); border:1px solid #cbd5e1;">
              💬 "${esc(lap.catatan)}"
            </div>
          ` : '<p style="margin:0; font-size:var(--fs-small); color:var(--text-muted); font-style:italic;">Tidak ada catatan dari siswa.</p>'}
        </div>
      </div>`;
  } catch (err) {
    console.error('Gagal memuat acuan laporan:', err);
    slot.innerHTML = '';
  }
}

// Form Submit Handler
form.addEventListener('submit', async e => {
  e.preventDefault();

  const siswaId = document.getElementById('siswa_select').value;
  const kompId  = document.getElementById('kompetensi').value;

  const kurang = [];
  if (!siswaId)         kurang.push('nama siswa');
  if (!kompId)          kurang.push('kompetensi');
  if (nilai.P === null) kurang.push('pemahaman (P)');
  if (nilai.K === null) kurang.push('keterlibatan (K)');

  if (kurang.length) {
    toast.danger('Lengkapi dulu', `Belum diisi: ${kurang.join(', ')}.`);
    return;
  }

  busy(true);

  const siswaTerpilih = SISWA.find(x => String(x.id) === String(siswaId));

  try {
    const E = Number(document.getElementById('E').value);
    const gVal = Number(G.value);
    
    // Rumus kalkulasi skor akhir berbasis learning analytics
    const kalkulasiSkor = Math.round(
      ((nilai.P * 20) + (nilai.K * 20) + Math.max(0, 100 - (E * 3)) + gVal) / 4
    );
    const skorAkhir = Math.max(10, Math.min(100, kalkulasiSkor)); 

    // Jam input diambil otomatis dari jam perangkat guru
    const waktuPerangkat = new Date();

    const payloadAman = {
      siswa_id: siswaId,
      kompetensi_id: kompId,
      nilai: skorAkhir,
      P: nilai.P,
      K: nilai.K,
      E: E,
      G: gVal,
      ketepatan_waktu: document.getElementById('waktu').value,
      riwayat_intervensi: rw.checked,
      catatan: `Evaluasi Praktik. P:${nilai.P}, K:${nilai.K}, E:${E}, G:${gVal}%`,
      status: gVal >= 100 ? 'selesai' : 'proses',
      waktu_input: waktuPerangkat.toISOString()
    };

    const res = await api.guru.simpanPenilaian(payloadAman);

    const mockRes = {
      penilaian_id: res.id || `nilai_${Date.now()}`,
      rekomendasi_code: res.rekomendasi_code || "R_SUKSES",
      rekomendasi_label: res.rekomendasi_label || "Penilaian Dicatat",
      rekomendasi_alasan: res.message || "Data evaluasi learning analytics berhasil disimpan.",
      waktu_label: waktuPerangkat.toLocaleString('id-ID', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
      })
    };

    toast.success('Penilaian tersimpan', `Rekomendasi: ${mockRes.rekomendasi_label}`);
    
    // Visualisasikan hasil di panel kanan
    showHasil(mockRes, siswaTerpilih);

  } catch (err) {
    toast.danger('Gagal menyimpan', err.message);
  } finally {
    busy(false);
  }
});

// Rating 1–5 Handler
const nilai = { P: null, K: null };

['P', 'K'].forEach(key => {
  const group = document.getElementById(`rate-${key}`);
  group.addEventListener('click', e => {
    const btn = e.target.closest('.rating__opt');
    if (!btn) return;

    nilai[key] = Number(btn.dataset.v);
    group.querySelectorAll('.rating__opt').forEach(b =>
      b.classList.toggle('rating__opt--on', b === btn)
    );
  });
});

// Slider progres UI Sync
const G    = document.getElementById('G');
const gOut = document.getElementById('g-out');
const gBar = document.getElementById('g-bar');

G.addEventListener('input', () => {
  const v = Number(G.value);
  gOut.textContent = `${v}%`;
  gBar.style.width = `${v}%`;

  // FITUR BARU: begitu progres mencapai 100%, langsung tandai selesai
  // secara otomatis — guru tidak perlu menekan tombol tambahan apa pun.
  document.getElementById('g-auto-hint').style.display = v >= 100 ? 'block' : 'none';
});

// Checkbox riwayat intervensi UI
const rw     = document.getElementById('riwayat');
const rwWrap = document.getElementById('riwayat-wrap');

rw.addEventListener('change', () => {
  rwWrap.classList.toggle('check--on', rw.checked);
});

// Utilities Loading Button state
function busy(on) {
  submit.disabled = on;
  label.textContent = on ? 'Memproses' : 'Simpan dan proses';

  const old = submit.querySelector('.btn__spinner');
  if (on && !old) {
    const s = document.createElement('span');
    s.className = 'btn__spinner';
    submit.prepend(s);
  } else if (!on && old) {
    old.remove();
  }
}

// Menampilkan panel rekomendasi keputusan learning analytics di sisi kanan
function showHasil(res, dataSiswa) {
  const sev = severity(res.rekomendasi_code);

  const ind = [
    { k: 'P', v: nilai.P },
    { k: 'E', v: Number(document.getElementById('E').value) },
    { k: 'K', v: nilai.K },
    { k: 'G', v: Number(G.value) }
  ];

  document.getElementById('side').innerHTML = `
    <div class="rekom rekom--${sev}">
      <div class="rekom__head">
        <span class="rekom__code">${esc(res.rekomendasi_code)}</span>
        <span class="rekom__label">${esc(res.rekomendasi_label)}</span>
      </div>
      <p class="rekom__why">${esc(res.rekomendasi_alasan || '')}</p>
      ${res.waktu_label ? `
        <p class="rekom__why" style="opacity:.8;">
          Disimpan pukul ${esc(res.waktu_label)} (otomatis dari jam perangkat Anda)
        </p>` : ''}

      <div class="rekom__act">
        <button class="btn btn--secondary btn--sm" data-st="diterima">Terima</button>
        <button class="btn btn--secondary btn--sm" data-st="diubah">Ubah</button>
      </div>
    </div>

    <div class="card">
      <div class="card__header" style="margin-bottom: var(--sp-4);">
        <div>
          <h3 class="card__title" style="font-size: var(--fs-body);">
            ${esc(dataSiswa?.nama || dataSiswa?.nama_lengkap || '—')}
          </h3>
          <p class="card__subtitle">${esc(dataSiswa?.kelas || 'Umum')}</p>
        </div>
      </div>

      <div class="grid grid--2">
        ${ind.map(i => {
          const lv = klasifikasi(i.k, i.v);
          return `
            <div class="indikator indikator--${tone(i.k, i.v)}">
              <span class="indikator__key">
                <span class="indikator__sym">${i.k}</span>
                ${labelInd(i.k)}
              </span>
              <span class="indikator__val">${i.v}${i.k === 'G' ? '%' : ''}</span>
              <span class="indikator__level">${lv}</span>
            </div>`;
        }).join('')}
      </div>
    </div>

    <a class="btn btn--secondary btn--block"
       href="siswa.html?id=${dataSiswa?.id}">
      Lihat detail siswa
    </a>
  `;

  // Action button listener untuk status rekomendasi
  document.querySelectorAll('.rekom__act .btn').forEach(b => {
    b.addEventListener('click', async () => {
      const st = b.dataset.st;
      try {
        await api.guru.updateStatus(res.penilaian_id, st);

        document.querySelectorAll('.rekom__act .btn').forEach(x => {
          x.disabled = true;
          x.classList.remove('btn--primary');
        });
        b.classList.add('btn--primary');
        b.disabled = false;

        toast.success('Keputusan tercatat', `Rekomendasi ${st}.`);
      } catch (err) {
        toast.danger('Gagal menyimpan', err.message);
      }
    });
  });
}

function labelInd(k) {
  return {
    P: 'Pemahaman',
    E: 'Kesalahan',
    K: 'Keterlibatan',
    G: 'Progres'
  }[k];
}