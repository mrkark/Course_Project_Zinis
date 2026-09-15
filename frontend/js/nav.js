// frontend/js/nav.js
// Общая логика для всех защищённых страниц: проверка сессии, подсветка
// активного пункта меню, блок пользователя в topbar, пункт "Пользователи"
// только для admin.

(async function initShell() {
  const page = document.body.dataset.page;
  const isPublicPage = document.body.dataset.public === 'true';

  let user = null;
  try {
    const res = await authApi.me();
    user = res.data;
  } catch (_) {
    user = null;
  }

  if (!user && !isPublicPage) {
    const next = encodeURIComponent(location.pathname);
    location.href = `/index.html?next=${next}`;
    return;
  }

  if (user && isPublicPage) {
    // Уже авторизован — не показываем форму логина/регистрации повторно.
    location.href = '/dashboard.html';
    return;
  }

  if (!user) return; // публичная страница, гостевой доступ

  window.currentUser = user;

  // Подсветка активного пункта меню
  document.querySelectorAll('.nav-link').forEach((link) => {
    link.classList.toggle('is-active', link.dataset.page === page);
  });

  // Пункт "Пользователи" — только для admin
  document.querySelectorAll('[data-role="admin-only"]').forEach((el) => {
    el.classList.toggle('hidden', user.role !== 'admin');
  });
  if (page === 'users' && user.role !== 'admin') {
    location.href = '/dashboard.html';
    return;
  }

  // Блок пользователя в topbar
  const userSlot = document.getElementById('topbar-user');
  if (userSlot) {
    userSlot.innerHTML = `
      <span>${escapeHtml(user.email)}</span>
      <span class="badge badge--neutral">${user.role === 'admin' ? 'admin' : 'user'}</span>
      <button class="btn btn--ghost btn--sm" id="logout-btn" type="button">Выйти</button>
    `;
    document.getElementById('logout-btn').addEventListener('click', async () => {
      try { await authApi.logout(); } catch (_) {}
      location.href = '/index.html';
    });
  }

  document.dispatchEvent(new CustomEvent('shell:ready', { detail: { user } }));
})();
