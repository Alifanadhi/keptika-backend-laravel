// Guru — dashboard siswa individual.

import { renderShell, esc, waktu } from '../core/shell.js';
import { api } from '../core/api.js';
import { toast } from '../core/toast.js';
import { klasifikasi, tone, severity } from '../core/rules.js';

const main = renderShell({
  active: 'siswa',
  title: 'Dashboard siswa',
  sub: 'Kondisi individual dan tindak lanjut.'
});

let SISWA = [];
let PENILAIAN_SEMUA = [];
let LAPORAN_SEMUA = [];

main.innerHTML = `
  <div class="row row--wrap" style="margin-bottom: var(--sp-5); gap: var(--sp-4);">
    <div class="field" style="max-width: 260px; margin:0; flex:1; min-width:200px;">
      <label class="field__label" for="pick-kelas">Kelas</label>
      <select class="select" id="pick-kelas"><option>Memuat…</option></select>
    </div>
    <div class="field" style="max-width: 280px; margin:0; flex:1; min-width:200px;">
      <label class="field__label" for="pick">Nama Siswa</label>
      <select class="select" id="pick" disabled><option value="">Pilih kelas dahulu</option></select>
    </div>
    <div class="field" style="max-width: 280px; margin:0; flex:1; min-width:200px;">
      <label class="field__label" for="pick-jobsheet">Jobsheet / Kompetensi</label>
      <select class="select" id="pick-jobsheet" disabled><option value="">Pilih siswa dahulu</option></select>
    </div>
  </div>
  <div id="body"></div>
`;

const pickKelas = document.getElementById('pick-kelas');
const pick      = document.getElementById('pick');
const pickJob   = document.getElementById('pick-jobsheet');
const body      = document.getElementById('body');

(async function init() {
  try {
    // PANGGIL ENDPOINT KHUSUS GURU
    const u = await api.guru.listSiswa();

    // PENGAMAN ARRAY USER LIST
    SISWA = u?.siswa_list ?? u?.data ?? u?.siswa ?? (Array.isArray(u) ? u : []);

    // FITUR BARU: kelas dipilih lebih dulu supaya guru yang megang beberapa
    // kelas tidak perlu menyisir satu daftar siswa yang panjang dan campur.
    const daftarKelas = [...new Set(SISWA.map(s => s.kelas || 'Umum'))].sort();

    pickKelas.innerHTML = SISWA.length
      ? '<option value="">Pilih kelas</option>' + daftarKelas.map(k => `<option value="${esc(k)}">${esc(k)}</option>`).join('')
      : '<option value="">Tidak ada siswa diampu</option>';

    pickKelas.addEventListener('change', () => {
      isiDropdownSiswa(pickKelas.value);
      pick.value = '';
      pickJob.disabled = true;
      pickJob.innerHTML = '<option value="">Pilih siswa dahulu</option>';
      body.innerHTML = awal();
    });

    pick.addEventListener('change', () => {
      if (pick.value) load(pick.value);
      else {
        pickJob.disabled = true;
        pickJob.innerHTML = '<option value="">Pilih siswa dahulu</option>';
        body.innerHTML = awal();
      }
    });

    pickJob.addEventListener('change', () => {
      renderTerfilter(pickJob.value);
    });

    /* Datang dari dashboard kelas atau notifikasi? ?id=4 → langsung buka siswa itu. */
    const id = new URLSearchParams(location.search).get('id');
    if (id) {
      const siswaTerkait = SISWA.find(s => String(s.id) === String(id));
      const kelasTerkait = siswaTerkait?.kelas || 'Umum';

      pickKelas.value = kelasTerkait;
      isiDropdownSiswa(kelasTerkait);
      pick.value = id;
      load(id);
    } else {
      body.innerHTML = awal();
    }

  } catch (err) {
    toast.danger('Data gagal dimuat', err.message);
  }
})();

/* Isi dropdown "Nama Siswa" sesuai kelas yang dipilih. */
function isiDropdownSiswa(namaKelas) {
  if (!namaKelas) {
    pick.disabled = true;
    pick.innerHTML = '<option value="">Pilih kelas dahulu</option>';
    return;
  }

  const siswaKelasIni = SISWA.filter(s => (s.kelas || 'Umum') === namaKelas);

  if (!siswaKelasIni.length) {
    pick.disabled = true;
    pick.innerHTML = '<option value="">Belum ada siswa di kelas ini</option>';
    return;
  }

  pick.disabled = false;
  pick.innerHTML = '<option value="">Pilih siswa</option>' +
    siswaKelasIni.map(s => `<option value="${s.id}">${esc(s.nama || s.nama_lengkap || 'Siswa')}</option>`).join('');
}

async function load(id) {
  body.innerHTML = skeleton();
  pickJob.disabled = true;
  pickJob.innerHTML = '<option value="">Memuat jobsheet…</option>';

  try {
    const res = await api.guru.detailSiswa(id);

    // EKSTRAKSI AMAN BEBAS UNDEFINED
    const siswa = res?.siswa ?? null;
    PENILAIAN_SEMUA = res?.penilaian_list ?? res?.penilaian ?? [];
    LAPORAN_SEMUA = res?.laporan_list ?? res?.laporan ?? [];

    // FITUR BARU: dropdown Jobsheet/Kompetensi diisi dari kompetensi yang
    // pernah dinilai/dilaporkan siswa ini — supaya guru bisa fokus ke satu
    // jobsheet tertentu kalau siswanya sudah mengerjakan lebih dari satu.
    const daftarJobsheet = new Map();
    [...PENILAIAN_SEMUA, ...LAPORAN_SEMUA].forEach(item => {
      if (item.kompetensi_id) {
        daftarJobsheet.set(String(item.kompetensi_id), item.nama_kompetensi || 'Praktik Umum');
      }
    });

    if (daftarJobsheet.size) {
      pickJob.disabled = false;
      pickJob.innerHTML = '<option value="">Semua jobsheet</option>' +
        [...daftarJobsheet.entries()].map(([id, nama]) => `<option value="${esc(id)}">${esc(nama)}</option>`).join('');
    } else {
      pickJob.disabled = true;
      pickJob.innerHTML = '<option value="">Belum ada jobsheet</option>';
    }

    render(siswa, PENILAIAN_SEMUA, LAPORAN_SEMUA);
  } catch (err) {
    toast.danger('Gagal memuat siswa', err.message);
  }
}

/* Terapkan filter Jobsheet/Kompetensi ke data siswa yang sudah dimuat,
   tanpa perlu memanggil API lagi. */
function renderTerfilter(kompetensiId) {
  const siswaTerkait = SISWA.find(s => String(s.id) === String(pick.value)) || null;

  const penilaianTerfilter = kompetensiId
    ? PENILAIAN_SEMUA.filter(p => String(p.kompetensi_id) === String(kompetensiId))
    : PENILAIAN_SEMUA;

  const laporanTerfilter = kompetensiId
    ? LAPORAN_SEMUA.filter(l => String(l.kompetensi_id) === String(kompetensiId))
    : LAPORAN_SEMUA;

  render(siswaTerkait, penilaianTerfilter, laporanTerfilter);
}

function render(siswa, penilaian = [], laporan = []) {
  const safePenilaian = Array.isArray(penilaian) ? penilaian : [];
  const safeLaporan = Array.isArray(laporan) ? laporan : [];

  const kini = safePenilaian.length ? safePenilaian.at(-1) : null;
  const lap  = safeLaporan.length ? safeLaporan.at(-1) : null;

  body.innerHTML = `
    <div class="grid grid--main">

      <div class="stack">
        ${kini ? kartuIndikator(kini) : belumDinilai()}
        ${lap ? kartuLaporan(lap) : ''}
        ${safePenilaian.length > 1 ? kartuRiwayat(safePenilaian) : ''}
      </div>

      <div class="stack">
        ${kini ? kartuRekomendasi(kini) : ''}
        ${kartuProfil(siswa || {})}
      </div>

    </div>
  `;

  if (kini) bindKeputusan(kini.id);
}

// Indikator

function kartuIndikator(p) {
  const ind = [
    { k: 'P', v: p.P ?? 0, nama: 'Pemahaman' },
    { k: 'E', v: p.E ?? 0, nama: 'Kesalahan' },
    { k: 'K', v: p.K ?? 0, nama: 'Keterlibatan' },
    { k: 'G', v: p.G ?? 0, nama: 'Progres' }
  ];

  return `
    <div class="card">
      <div class="card__header">
        <div>
          <h2 class="card__title">Indikator terkini</h2>
          <p class="card__subtitle">Dinilai ${waktu(p.created_at || p.waktu_nilai)}</p>
        </div>
      </div>

      <div class="grid grid--4">
        ${ind.map(i => {
          const lv = klasifikasi(i.k, i.v);
          return `
            <div class="indikator indikator--${tone(i.k, i.v)}">
              <span class="indikator__key">
                <span class="indikator__sym">${i.k}</span>${i.nama}
              </span>
              <span class="indikator__val">${i.v}${i.k === 'G' ? '%' : ''}</span>
              <span class="indikator__level">${lv}</span>
            </div>`;
        }).join('')}
      </div>
    </div>`;
}

function kartuLaporan(l) {
  const tahapan = Array.isArray(l.tahapan_selesai) ? l.tahapan_selesai : [];
  const total = l.total_tahapan || tahapan.length || 1;
  const done  = tahapan.length;
  const pct   = Math.round((done / total) * 100);

  return `
    <div class="card">
      <div class="card__header">
        <div>
          <h2 class="card__title">Laporan siswa</h2>
          <p class="card__subtitle">Dikirim ${waktu(l.created_at)}</p>
        </div>
        <span class="badge badge--${l.status === 'selesai' ? 'success' : 'warning'}">
          ${l.status === 'selesai' ? 'Selesai' : 'Belum selesai'}
        </span>
      </div>

      <p class="section__title">Tahapan job-sheet</p>
      <div class="bar-row" style="margin-bottom: var(--sp-4);">
        <div class="bar">
          <div class="bar__fill" style="width:${pct}%"></div>
        </div>
        <span class="bar-row__num">${done}/${total}</span>
      </div>

      <div class="grid grid--2" style="margin-bottom: var(--sp-4);">
        <div>
          <p class="section__title">Keterlibatan (menurut siswa)</p>
          <span class="num" style="font-size: var(--fs-h2); color: var(--text-title);">
            ${l.keterlibatan_self ?? 0}<span style="font-size: var(--fs-body); color: var(--text-hint); font-weight: 400;">/5</span>
          </span>
        </div>
        <div>
          <p class="section__title">Waktu selesai</p>
          <span class="num" style="font-size: var(--fs-h2); color: var(--text-title);">
            ${l.waktu_selesai ?? '—'}
          </span>
        </div>
      </div>

      ${l.kendala?.length ? `
        <p class="section__title">Kendala yang dilaporkan</p>
        <div class="chips" style="margin-bottom: var(--sp-4);">
          ${l.kendala.map(k => `<span class="chip chip--warning">${esc(k)}</span>`).join('')}
        </div>` : ''}

      ${l.catatan ? `
        <p class="section__title">Catatan siswa</p>
        <div class="note">
          <p class="note__from">Ditulis oleh siswa</p>
          ${esc(l.catatan)}
        </div>` : ''}
    </div>`;
}

function kartuRiwayat(list) {
  return `
    <div class="card">
      <div class="card__header">
        <h2 class="card__title">Riwayat penilaian</h2>
      </div>

      <div class="table-scroll">
        <table class="table" style="min-width: 480px;">
          <thead>
            <tr>
              <th>Waktu</th>
              <th style="text-align:center">P</th>
              <th style="text-align:center">E</th>
              <th style="text-align:center">K</th>
              <th style="text-align:center">G</th>
              <th>Rekomendasi</th>
            </tr>
          </thead>
          <tbody>
            ${[...list].reverse().map(p => `
              <tr>
                <td style="color: var(--text-muted); white-space:nowrap;">
                  ${waktu(p.created_at || p.waktu_nilai)}
                </td>
                <td style="text-align:center">
                  <span class="pill pill--${tone('P', p.P)}">${p.P ?? 0}</span></td>
                <td style="text-align:center">
                  <span class="pill pill--${tone('E', p.E)}">${p.E ?? 0}</span></td>
                <td style="text-align:center">
                  <span class="pill pill--${tone('K', p.K)}">${p.K ?? 0}</span></td>
                <td style="text-align:center">
                  <span class="pill pill--${tone('G', p.G)}">${p.G ?? 0}</span></td>
                <td>
                  <span class="badge badge--${severity(p.rekomendasi_code || 'S0')}">
                    ${esc(p.rekomendasi_code || 'S0')}
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}

function kartuRekomendasi(p) {
  const sev = severity(p.rekomendasi_code || 'S0');
  const sudah = p.status_guru;

  return `
    <div class="rekom rekom--${sev}">
      <div class="rekom__head">
        <span class="rekom__code">${esc(p.rekomendasi_code || 'S0')}</span>
        <span class="rekom__label">${esc(p.rekomendasi_label || 'Siap Pengayaan')}</span>
      </div>
      <p class="rekom__why">
        Sistem mengusulkan langkah ini. Keputusan akhir ada pada Anda.
      </p>

      <div class="rekom__act">
        ${['diterima', 'diubah'].map(st => `
          <button class="btn btn--${sudah === st ? 'primary' : 'secondary'} btn--sm"
                  data-st="${st}" ${sudah && sudah !== st ? 'disabled' : ''}>
            ${st === 'diterima' ? 'Terima' : st === 'diubah' ? 'Ubah' : 'Tolak'}
          </button>
        `).join('')}
      </div>
    </div>`;
}

function bindKeputusan(penilaianId) {
  document.querySelectorAll('.rekom__act .btn').forEach(b => {
    b.addEventListener('click', async () => {
      const st = b.dataset.st;
      try {
        await api.guru.updateStatus(penilaianId, st);

        document.querySelectorAll('.rekom__act .btn').forEach(x => {
          x.disabled = true;
          x.classList.remove('btn--primary');
          x.classList.add('btn--secondary');
        });
        b.disabled = false;
        b.classList.remove('btn--secondary');
        b.classList.add('btn--primary');

        toast.success('Keputusan tercatat', `Rekomendasi ${st}.`);
      } catch (err) {
        toast.danger('Gagal menyimpan', err.message);
      }
    });
  });
}

function kartuProfil(s) {
  const baris = [
    ['NIS', s.nis],
    ['Kelas', s.kelas],
    ['Program keahlian', s.program_keahlian || s.program],
    ['Username', s.username]
  ];

  return `
    <div class="card">
      <p class="section__title">Profil siswa</p>
      <h3 style="font-size: var(--fs-h3); margin-bottom: var(--sp-4);">
        ${esc(s.nama || 'Nama Siswa')}
      </h3>

      ${baris.map(([k, v]) => `
        <div class="row" style="padding: var(--sp-2) 0; border-bottom: 1px solid var(--slate-100);">
          <span style="font-size: var(--fs-caption); color: var(--text-muted);">${k}</span>
          <span class="spacer"></span>
          <span style="font-size: var(--fs-small); color: var(--text-title);">${esc(v ?? '—')}</span>
        </div>
      `).join('')}
    </div>`;
}

function belumDinilai() {
  return `
    <div class="card">
      <div class="empty">
        <span class="empty__icon" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor"
               stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 2.5h8a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5H4A1.5 1.5 0 0 1 2.5 16V4A1.5 1.5 0 0 1 4 2.5h4Z"/>
            <path d="M6 7.5h6M6 10.5h6"/>
          </svg>
        </span>
        <p class="empty__title">Belum ada penilaian</p>
        <p class="empty__desc">
          Siswa ini belum pernah dinilai. Rekomendasi baru muncul setelah ada data aktivitas praktik.
        </p>
        <a class="btn btn--primary" href="input.html">Input penilaian</a>
      </div>
    </div>`;
}

function awal() {
  return `
    <div class="card">
      <div class="empty">
        <span class="empty__icon" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor"
               stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="10" cy="6.8" r="3.3"/>
            <path d="M3.8 17a6.2 6.2 0 0 1 12.4 0"/>
          </svg>
        </span>
        <p class="empty__title">Pilih siswa</p>
        <p class="empty__desc">
          Gunakan pilihan di atas untuk melihat indikator, laporan, dan rekomendasi seorang siswa.
        </p>
      </div>
    </div>`;
}

function skeleton() {
  return `
    <div class="grid grid--main">
      <div class="card">
        <div class="skeleton" style="width:180px; height:18px; margin-bottom: var(--sp-5);"></div>
        <div class="grid grid--4">
          ${[1,2,3,4].map(() => `<div class="skeleton" style="height:78px; border-radius: var(--r-md);"></div>`).join('')}
        </div>
      </div>
      <div class="card">
        <div class="skeleton" style="height:120px;"></div>
      </div>
    </div>`;
}