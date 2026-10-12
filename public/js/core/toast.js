// Toast: pesan singkat non-blocking.

const ICONS = {
  success: '<svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16.7 5.8 8 14.5l-4.7-4.7"/></svg>',
  danger:  '<svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="7.5"/><path d="M10 6.5v4M10 13.5h.01"/></svg>',
  warning: '<svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2.5 18 16H2Z"/><path d="M10 8v3.5M10 14h.01"/></svg>',
  info:    '<svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="7.5"/><path d="M10 13.5v-4M10 6.5h.01"/></svg>'
};

function stack() {
  let el = document.querySelector('.toast-stack');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast-stack';
    /* aria-live="polite": pembaca layar mengumumkan
       toast setelah selesai membaca kalimat berjalan,
       bukan memotong di tengah. */
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-atomic', 'false');
    document.body.appendChild(el);
  }
  return el;
}

function show(type, title, desc = '', opts = {}) {
  const duration = opts.duration ?? 4000;

  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  el.setAttribute('role', type === 'danger' ? 'alert' : 'status');

  el.innerHTML = `
    <span class="toast__icon" aria-hidden="true">${ICONS[type]}</span>
    <div class="toast__body">
      <div class="toast__title">${escape(title)}</div>
      ${desc ? `<div class="toast__desc">${escape(desc)}</div>` : ''}
    </div>
  `;

  stack().appendChild(el);

  const remove = () => {
    el.classList.add('toast--out');
    el.addEventListener('animationend', () => el.remove(), { once: true });
  };

  const timer = setTimeout(remove, duration);

  /* Hover menahan toast. Pesan penting tidak boleh
     hilang saat pengguna sedang membacanya. */
  el.addEventListener('mouseenter', () => clearTimeout(timer));
  el.addEventListener('mouseleave', () => setTimeout(remove, 1200));

  return { dismiss: remove };
}

/* Semua teks yang berasal dari data (nama siswa,
   catatan guru) harus di-escape. Ini pertahanan
   XSS lapisan klien — server tetap wajib melakukan
   sanitasi juga. */
function escape(s) {
  const d = document.createElement('div');
  d.textContent = String(s);
  return d.innerHTML;
}

export const toast = {
  success: (t, d, o) => show('success', t, d, o),
  danger:  (t, d, o) => show('danger',  t, d, o),
  warning: (t, d, o) => show('warning', t, d, o),
  info:    (t, d, o) => show('info',    t, d, o)
};
