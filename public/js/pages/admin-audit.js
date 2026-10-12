// Admin — jejak audit.

import { renderShell, esc, waktu } from '../core/shell.js';
import { api } from '../core/api.js';
import { toast } from '../core/toast.js';

const main = renderShell({
  active: 'audit',
  title: 'Jejak audit',
  sub: 'Catatan setiap tindakan yang mengubah data.'
});

main.innerHTML = `<div id="body">${skeleton()}</div>`;

const body = document.getElementById('body');

(async function init() {
  try {
    const { audit_list } = await api.admin.auditLog();
    render(audit_list);
  } catch (err) {
    toast.danger('Gagal memuat', err.message);
  }
})();

function render(list) {
  if (!list.length) {
    body.innerHTML = `
      <div class="card">
        <div class="empty">
          <p class="empty__title">Belum ada catatan</p>
          <p class="empty__desc">
            Jejak audit terisi otomatis saat pengguna masuk atau
            mengubah data.
          </p>
        </div>
      </div>`;
    return;
  }

  body.innerHTML = `
    <div class="alert alert--info" style="margin-bottom: var(--sp-4);">
      <span class="alert__icon" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor"
             stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="10" cy="10" r="7.5"/><path d="M10 13.5v-4M10 6.5h.01"/>
        </svg>
      </span>
      <span>
        Catatan ini tidak dapat dihapus atau diubah, termasuk oleh admin.
        Ini menjaga data penelitian tetap dapat ditelusuri.
      </span>
    </div>

    <div class="table-wrap">
      <div class="table-scroll">
        <table class="table">
          <thead>
            <tr>
              <th>Waktu</th>
              <th>Pengguna</th>
              <th>Aksi</th>
              <th>Tabel</th>
              <th>ID</th>
              <th>Alamat IP</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(a => `
              <tr>
                <td style="color: var(--text-muted); white-space:nowrap;">
                  ${waktu(a.created_at)}
                </td>
                <td class="table__name">${esc(a.nama)}</td>
                <td>${esc(a.aksi)}</td>
                <td style="font-family: var(--font-mono);
                           font-size: var(--fs-caption);
                           color: var(--text-hint);">
                  ${esc(a.tabel ?? '—')}
                </td>
                <td class="num" style="color: var(--text-hint);">
                  ${a.record_id ?? '—'}
                </td>
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
  `;
}

function skeleton() {
  return `<div class="skeleton" style="height:280px; border-radius: var(--r-lg);"></div>`;
}
