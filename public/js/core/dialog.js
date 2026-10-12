// Dialog dan konfirmasi. Pengganti confirm() bawaan browser.

const ICON = {
  danger: '<circle cx="10" cy="10" r="7.5"/><path d="M10 6.3v4.2M10 13.6h.01"/>',
  warning: '<path d="M10 2.5 18 16H2Z"/><path d="M10 8v3.5M10 14h.01"/>',
  info: '<circle cx="10" cy="10" r="7.5"/><path d="M10 13.5v-4M10 6.5h.01"/>'
};

/** Modal kosong. Kembalikan elemen agar pemanggil bisa mengisi & menutup. */
export function modal(html, { lebar = 440 } = {}) {
  const prevFocus = document.activeElement;

  const el = document.createElement('div');
  el.className = 'overlay';
  el.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true"
         style="max-width:${lebar}px">${html}</div>`;

  document.body.appendChild(el);
  document.body.style.overflow = 'hidden';

  const tutup = () => {
    el.classList.add('overlay--out');
    setTimeout(() => {
      el.remove();
      document.body.style.overflow = '';
      prevFocus?.focus();
    }, 160);
    document.removeEventListener('keydown', onKey);
  };

  const onKey = e => {
    if (e.key === 'Escape') { tutup(); return; }
    if (e.key === 'Tab') trapFocus(e, el);
  };

  el.querySelectorAll('[data-close]').forEach(b =>
    b.addEventListener('click', tutup));

  el.addEventListener('click', e => {
    if (e.target === el) tutup();
  });

  document.addEventListener('keydown', onKey);

  setTimeout(() => {
    const f = el.querySelector('input, select, textarea, button:not([data-close])');
    f?.focus();
  }, 60);

  el.tutup = tutup;
  return el;
}

/* Tab tidak boleh keluar dari modal selama modal terbuka. */
function trapFocus(e, root) {
  const f = [...root.querySelectorAll(
    'button, input, select, textarea, a[href]'
  )].filter(x => !x.disabled && x.offsetParent !== null);

  if (!f.length) return;

  const first = f[0];
  const last = f[f.length - 1];

  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

/**
 * Konfirmasi. Resolve true kalau pengguna melanjutkan.
 *
 * await konfirmasi({
 *   judul: 'Keluar dari sistem?',
 *   pesan: 'Sesi Anda akan berakhir.',
 *   aksi: 'Keluar',
 *   nada: 'danger'
 * })
 */
export function konfirmasi({
  judul,
  pesan = '',
  aksi = 'Lanjutkan',
  batal = 'Batal',
  nada = 'danger'
}) {
  return new Promise(resolve => {
    const el = modal(`
      <div class="konfirm">
        <span class="konfirm__icon konfirm__icon--${nada}" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"
               stroke="currentColor" stroke-width="1.7"
               stroke-linecap="round" stroke-linejoin="round">
            ${ICON[nada] ?? ICON.danger}
          </svg>
        </span>
        <h2 class="konfirm__title">${escape(judul)}</h2>
        ${pesan ? `<p class="konfirm__msg">${escape(pesan)}</p>` : ''}
      </div>

      <div class="modal__foot">
        <button class="btn btn--secondary" data-close>${escape(batal)}</button>
        <button class="btn btn--${nada === 'danger' ? 'danger' : 'primary'}"
                id="k-ok">${escape(aksi)}</button>
      </div>
    `, { lebar: 380 });

    let jawab = false;

    el.querySelector('#k-ok').addEventListener('click', () => {
      jawab = true;
      el.tutup();
      resolve(true);
    });

    /* Tutup lewat Escape / klik luar / batal = tidak. */
    const obs = new MutationObserver(() => {
      if (!document.body.contains(el) && !jawab) {
        obs.disconnect();
        resolve(false);
      }
    });
    obs.observe(document.body, { childList: true });

    /* Tombol batal difokuskan, bukan tombol merah —
       Enter tidak boleh langsung menghapus sesuatu. */
    setTimeout(() => el.querySelector('[data-close]')?.focus(), 60);
  });
}

function escape(s) {
  const d = document.createElement('div');
  d.textContent = String(s ?? '');
  return d.innerHTML;
}
