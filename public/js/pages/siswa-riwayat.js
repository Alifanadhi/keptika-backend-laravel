// Siswa — riwayat laporan dan feedback guru.

import { renderShell, esc, waktu } from '../core/shell.js';
import { api } from '../core/api.js';
import { toast } from '../core/toast.js';
import { severity } from '../core/rules.js';

const main = renderShell({
  active: 'riwayat',
  title: 'Riwayat & feedback',
  sub: 'Laporan yang pernah Anda kirim, beserta tanggapan guru.'
});

main.innerHTML = `<div id="body">${skeleton()}</div>`;

const body = document.getElementById('body');

(async function init() {
  try {
    const res = await api.siswa.riwayat();
    
    // EKSTRAKSI DEFENTIF: Membaca array dari res.laporan_list, res.data, atau res mentah jika berupa array
    const daftarRiwayat = res?.laporan_list ?? res?.data ?? (Array.isArray(res) ? res : []);
    
    render(daftarRiwayat);
  } catch (err) {
    toast.danger('Gagal memuat riwayat', err.message);
  }
})();

function render(list) {
  if (!list.length) {
    body.innerHTML = `
      <div class="card">
        <div class="empty">
          <span class="empty__icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor"
                 stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2.8 10a7.2 7.2 0 1 0 2.1-5.1"/><path d="M2.5 3v3.5H6"/>
              <path d="M10 6v4.2l2.8 1.6"/>
            </svg>
          </span>
          <p class="empty__title">Belum ada laporan</p>
          <p class="empty__desc">
            Setiap laporan yang Anda kirim akan tersimpan di sini,
            lengkap dengan tanggapan guru.
          </p>
          <a class="btn btn--primary" href="lapor.html">Buat laporan pertama</a>
        </div>
      </div>`;
    return;
  }

  const belumDitanggapi = list.filter(l => !l.feedback_guru).length;

  body.innerHTML = `
    <div class="chips" style="margin-bottom: var(--sp-5);">
      <span class="chip chip--neutral">
        <span class="chip__n">${list.length}</span> laporan
      </span>
      ${belumDitanggapi ? `
        <span class="chip chip--warning">
          <span class="chip__n">${belumDitanggapi}</span> menunggu tanggapan
        </span>` : `
        <span class="chip chip--success">Semua sudah ditanggapi</span>`}
    </div>

    <div class="stack">
      ${list.map(kartu).join('')}
    </div>
  `;
}

function kartu(l) {
  const selesai = l.status === 'selesai';

  return `
    <div class="card">
      <div class="card__header">
        <div>
          <h3 class="card__title" style="font-size: var(--fs-body);">
            ${esc(l.kompetensi_nama)}
          </h3>
          <p class="card__subtitle">${waktu(l.created_at)}</p>
        </div>
        <span class="badge badge--${selesai ? 'success' : 'warning'}">
          ${selesai ? 'Selesai' : 'Belum selesai'}
        </span>
      </div>

      <div class="bar-row" style="margin-bottom: var(--sp-4);">
        <div class="bar">
          <div class="bar__fill" style="width:${l.progres}%"></div>
        </div>
        <span class="bar-row__num">${l.progres}%</span>
      </div>

      ${l.kendala?.length ? `
        <p class="section__title">Kendala yang Anda laporkan</p>
        <div class="chips" style="margin-bottom: var(--sp-4);">
          ${l.kendala.map(k =>
            `<span class="chip chip--warning">${esc(k)}</span>`
          ).join('')}
        </div>` : ''}

      ${l.catatan ? `
        <p class="section__title">Catatan Anda</p>
        <p style="font-size: var(--fs-small); color: var(--text-muted);
                  line-height: var(--lh-relaxed); margin-bottom: var(--sp-4);">
          ${esc(l.catatan)}
        </p>` : ''}

      <div class="divider" style="margin: var(--sp-4) 0;"></div>

      ${l.rekomendasi_label ? `
        <div class="rekom rekom--${severity(l.rekomendasi_code || 'S0')}" style="margin-bottom:var(--sp-4);">
          <div class="rekom__head">
            <span class="rekom__code">${esc(l.rekomendasi_code || 'REKOMENDASI')}</span>
            <span class="rekom__label">Rekomendasi guru</span>
          </div>
          <p class="rekom__why">${esc(l.rekomendasi_label)}</p>
          ${l.status_penilaian ? `<p class="rekom__why" style="opacity:.75;">Status penilaian: ${esc(l.status_penilaian)}</p>` : ''}
        </div>` : ''}

      ${l.feedback_guru ? `
        <div class="note">
          <p class="note__from">Tanggapan guru</p>
          ${esc(l.feedback_guru)}
        </div>` : `
        <p style="font-size: var(--fs-small); color: var(--text-hint);
                  display: flex; align-items: center; gap: var(--sp-2);">
          <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor"
               stroke-width="1.6" stroke-linecap="round" aria-hidden="true">
            <circle cx="10" cy="10" r="7.5"/><path d="M10 6v4.2l2.8 1.6"/>
          </svg>
          Menunggu tanggapan guru.
        </p>`}
    </div>`;
}

function skeleton() {
  return `
    <div class="stack">
      ${[1, 2].map(() => `
        <div class="card">
          <div class="skeleton" style="height:18px; width:220px;
               margin-bottom: var(--sp-4);"></div>
          <div class="skeleton" style="height:6px; margin-bottom: var(--sp-4);"></div>
          <div class="skeleton" style="height:44px;"></div>
        </div>
      `).join('')}
    </div>`;
}
