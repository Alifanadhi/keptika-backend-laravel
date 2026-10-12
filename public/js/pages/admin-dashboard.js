// Admin — ringkasan sistem.

import { renderShell, esc, waktu } from '../core/shell.js';
import { api } from '../core/api.js';
import { toast } from '../core/toast.js';

const shellResult = renderShell({
  active: 'dashboard',
  title: 'Ringkasan sistem',
  sub: 'Kondisi sistem dan aktivitas terakhir.'
});

const main = shellResult || document.querySelector('main') || document.getElementById('app');

if (main) {
  main.innerHTML = `<div id="body">${skeleton()}</div>`;
} else {
  console.error("Elemen penampung utama (main/app) tidak ditemukan di halaman HTML.");
}

main.innerHTML = `<div id="body">${skeleton()}</div>`;

const body = document.getElementById('body');

(async function init() {
  try {
    const d = await api.admin.dashboard();
    render(d);
  } catch (err) {
    toast.danger('Gagal memuat', err.message);
  }
})();

function render(d) {
  body.innerHTML = `
    <div class="grid grid--4" style="margin-bottom: var(--sp-5);">
      ${metrik('Akun aktif', d.user_aktif, `${d.total_guru} guru · ${d.total_siswa} siswa`)}
      ${metrik('Kelas', d.total_kelas, `${d.total_kompetensi} kompetensi aktif`)}
      ${metrik('Penilaian', d.penilaian_hari_ini, 'Tercatat hari ini')}
      ${metrik('Belum ditanggapi', d.laporan_belum_ditanggapi,
               'Laporan siswa menunggu guru', d.laporan_belum_ditanggapi > 0)}
    </div>

    <div class="grid grid--main">

      <div class="card">
        <div class="card__header">
          <div>
            <h2 class="card__title">Aktivitas terakhir</h2>
            <p class="card__subtitle">Lima catatan terbaru dari jejak audit.</p>
          </div>
          <a class="btn btn--secondary btn--sm" href="audit.html">Lihat semua</a>
        </div>

        <div class="table-scroll">
          <table class="table" style="min-width: 520px;">
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Pengguna</th>
                <th>Aksi</th>
                <th>Alamat IP</th>
              </tr>
            </thead>
            <tbody>
              ${d.aktivitas_terakhir.map(a => `
                <tr>
                  <td style="color: var(--text-muted); white-space:nowrap;">
                    ${waktu(a.created_at)}
                  </td>
                  <td class="table__name">${esc(a.nama)}</td>
                  <td>${esc(a.aksi)}</td>
                  <td style="font-family: var(--font-mono);
                             font-size: var(--fs-caption);
                             color: var(--text-hint);">
                    ${esc(a.ip_address)}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="stack">
        <div class="card">
          <p class="section__title">Tindakan cepat</p>
          <div class="stack" style="gap: var(--sp-2);">
            <a class="btn btn--secondary btn--block" href="user.html">
              Kelola akun pengguna
            </a>
            <a class="btn btn--secondary btn--block" href="program.html">
              Kelola program keahlian
            </a>
            <a class="btn btn--secondary btn--block" href="kompetensi.html">
              Kelola kompetensi
            </a>
            <a class="btn btn--secondary btn--block" href="kelas.html">
              Kelola kelas
            </a>
          </div>
        </div>

        <div class="alert alert--info">
          <span class="alert__icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor"
                 stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="10" cy="10" r="7.5"/><path d="M10 13.5v-4M10 6.5h.01"/>
            </svg>
          </span>
          <span>
            Reset kata sandi guru dan siswa hanya dapat dilakukan dari
            halaman Akun pengguna. Tidak ada alur reset mandiri.
          </span>
        </div>
      </div>

    </div>
  `;
}

function metrik(label, nilai, foot, sorot = false) {
  return `
    <div class="metric" ${sorot ? 'style="border-color: rgba(199,122,34,0.3); background: var(--warning-soft);"' : ''}>
      <p class="metric__label">${esc(label)}</p>
      <p class="metric__value" ${sorot ? 'style="color: var(--warning);"' : ''}>${nilai}</p>
      <p class="metric__foot">${esc(foot)}</p>
    </div>`;
}

function skeleton() {
  return `
    <div class="grid grid--4" style="margin-bottom: var(--sp-5);">
      ${[1,2,3,4].map(() =>
        `<div class="skeleton" style="height:94px; border-radius: var(--r-lg);"></div>`
      ).join('')}
    </div>
    <div class="skeleton" style="height:260px; border-radius: var(--r-lg);"></div>`;
}
