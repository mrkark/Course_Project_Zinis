# Итоговая версия Course_Project_Zinis

## Запуск

1. Выполнить `backend/database.sql`, `backend/database_procedures.sql` и `backend/database_auth_migration.sql` в MSSQL.
2. Скопировать `backend/.env.example` в `backend/.env` и заполнить параметры БД.
3. В `backend`: `npm install`, затем `npm start`.
4. В `frontend`: `npm install`, затем `npm run dev`.

## Авторизация

Единая форма `/login`. Роль берётся из `Users.role` (`user` или `admin`).
Для назначения администратора:

```sql
UPDATE dbo.Users SET role = N'admin' WHERE email = N'admin@example.com';
```

## Важно

Для загрузки через браузер не задавайте вручную `Content-Type: application/json` для `FormData`: Axios сам добавляет `multipart/form-data` с boundary. Это исправлено в `frontend/src/services/api.js`.
