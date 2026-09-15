// frontend/js/pages/users.js

async function loadUsers() {
  const el = document.getElementById('users-table');
  try {
    const res = await adminApi.users();
    const users = res.data;
    if (!users.length) {
      el.innerHTML = `<div class="empty-state"><div>Пользователей нет.</div></div>`;
      return;
    }
    el.innerHTML = `
      <table class="data-table">
        <thead><tr><th>Email</th><th>Роль</th><th>Сканов</th><th>Статус</th><th>Регистрация</th><th></th></tr></thead>
        <tbody>
          ${users.map((u) => `
            <tr data-id="${u.id}">
              <td>${escapeHtml(u.email)}</td>
              <td><span class="badge badge--neutral">${u.role}</span></td>
              <td class="mono">${u.scanCount}</td>
              <td>${u.isBlocked ? '<span class="badge badge--critical">заблокирован</span>' : '<span class="badge badge--clean">активен</span>'}</td>
              <td class="mono">${formatDate(u.createdAt)}</td>
              <td class="flex-row">
                <button class="btn btn--ghost btn--sm js-toggle-block" data-id="${u.id}" data-blocked="${u.isBlocked}">${u.isBlocked ? 'Разблокировать' : 'Заблокировать'}</button>
                <button class="btn btn--danger btn--sm js-delete" data-id="${u.id}">Удалить</button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>`;

    el.querySelectorAll('.js-toggle-block').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const blocked = btn.dataset.blocked === 'true';
        try {
          await adminApi.setBlocked(btn.dataset.id, !blocked);
          loadUsers();
        } catch (err) {
          showToast(extractErrorMessage(err), 'error');
        }
      });
    });
    el.querySelectorAll('.js-delete').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Удалить пользователя и всю его историю сканирований?')) return;
        try {
          await adminApi.deleteUser(btn.dataset.id);
          loadUsers();
        } catch (err) {
          showToast(extractErrorMessage(err), 'error');
        }
      });
    });
  } catch (err) {
    el.innerHTML = `<div class="empty-state"><div>${extractErrorMessage(err)}</div></div>`;
  }
}

document.addEventListener('shell:ready', loadUsers);
