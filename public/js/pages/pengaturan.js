// Pengaturan. Dipakai guru dan siswa.

import { renderShell, esc } from '../core/shell.js';
import { api } from '../core/api.js';
import { auth } from '../core/auth.js';
import { toast } from '../core/toast.js';

const user = auth.user();
const role = auth.role();

const main = renderShell({
  active: 'pengaturan',
  title: 'Pengaturan',
  sub: 'Profil dan kata sandi Anda.'
});

/* Baris profil berbeda antara guru dan siswa. */
const PROFIL = role === 'siswa'
  ? [
      ['Nama',             user.nama],
      ['NIS',              user.nis],
      ['Kelas',            user.kelas],
      ['Program keahlian', user.program_keahlian],
      ['Username',         user.username]
    ]
  : [
      ['Nama',     user.nama],
      ['Jabatan',  user.jabatan],
      ['Username', user.username]
    ];

main.innerHTML = `
  <div class="grid grid--main">

    <div class="card">
      <div class="card__header">
        <div>
          <h2 class="card__title">Ganti kata sandi</h2>
          <p class="card__subtitle">Minimal 8 karakter.</p>
        </div>
      </div>

      <form id="pw-form">
        <div class="field">
          <label class="field__label" for="lama">Kata sandi saat ini</label>
          <input class="input" type="password" id="lama"
                 autocomplete="current-password" required>
        </div>

        <div class="field">
          <label class="field__label" for="baru">Kata sandi baru</label>
          <input class="input" type="password" id="baru"
                 autocomplete="new-password" required>
          <p class="field__hint">Minimal 8 karakter.</p>
        </div>

        <div class="field">
          <label class="field__label" for="ulang">Ulangi kata sandi baru</label>
          <input class="input" type="password" id="ulang"
                 autocomplete="new-password" required>
        </div>

        <button type="submit" class="btn btn--primary" id="pw-btn">
          <span id="pw-label">Simpan kata sandi</span>
        </button>
      </form>
    </div>

    <div class="stack">
      <div class="card">
        <p class="section__title">Profil</p>

        ${PROFIL.map(([k, v]) => `
          <div class="row" style="padding: var(--sp-3) 0;
               border-bottom: 1px solid var(--slate-100);">
            <span style="font-size: var(--fs-caption); color: var(--text-muted);">
              ${k}
            </span>
            <span class="spacer"></span>
            <span style="font-size: var(--fs-small); color: var(--text-title);
                  text-align: right;">
              ${esc(v ?? '—')}
            </span>
          </div>
        `).join('')}
      </div>

      <div class="alert alert--info">
        <span class="alert__icon" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor"
               stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="10" cy="10" r="7.5"/><path d="M10 13.5v-4M10 6.5h.01"/>
          </svg>
        </span>
        <span>
          Data profil hanya dapat diubah oleh admin sekolah.
          Kalau ada yang keliru, sampaikan kepada admin.
        </span>
      </div>
    </div>

  </div>
`;

// Ganti sandi

const form  = document.getElementById('pw-form');
const btn   = document.getElementById('pw-btn');
const label = document.getElementById('pw-label');

form.addEventListener('submit', async e => {
  e.preventDefault();

  const lama  = document.getElementById('lama').value;
  const baru  = document.getElementById('baru').value;
  const ulang = document.getElementById('ulang').value;

  /* Validasi. Setiap pesan menyebut MASALAHNYA,
     bukan sekadar "input tidak valid". */
  if (baru.length < 8) {
    toast.danger('Kata sandi terlalu pendek', 'Gunakan minimal 8 karakter.');
    return;
  }

  if (baru !== ulang) {
    toast.danger('Kata sandi tidak cocok', 'Ulangi kata sandi baru dengan benar.');
    document.getElementById('ulang').classList.add('input--error');
    return;
  }

  if (baru === lama) {
    toast.danger('Kata sandi sama', 'Pilih kata sandi yang berbeda dari sebelumnya.');
    return;
  }

  busy(true);

  try {
    await api.changePassword(lama, baru);
    toast.success('Kata sandi diperbarui', 'Gunakan sandi baru saat masuk berikutnya.');
    form.reset();
    document.getElementById('ulang').classList.remove('input--error');
  } catch (err) {
    toast.danger('Gagal mengganti', err.message);
  } finally {
    busy(false);
  }
});

document.querySelectorAll('#pw-form .input').forEach(el => {
  el.addEventListener('input', () => el.classList.remove('input--error'));
});

function busy(on) {
  btn.disabled = on;
  label.textContent = on ? 'Menyimpan' : 'Simpan kata sandi';

  const old = btn.querySelector('.btn__spinner');
  if (on && !old) {
    btn.prepend(Object.assign(document.createElement('span'), {
      className: 'btn__spinner'
    }));
  } else if (!on && old) {
    old.remove();
  }
}
