# Деплой Railway и Vercel

## Backend на Railway

1. Создайте PostgreSQL и backend-сервис из этого репозитория.
2. Укажите Root Directory: `/backend`.
3. Railway использует `backend/Dockerfile`, выполняет Alembic-миграции и запускает FastAPI.
4. Подключите Railway Volume с Mount Path `/app/uploads`. Без volume загруженные препараты будут удаляться при новом деплое.
5. Добавьте переменные из `.env.example`:

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=<случайная строка длиной от 32 символов>
ENVIRONMENT=production
LOG_LEVEL=INFO
ENABLE_DOCS=false
ALLOW_TEACHER_REGISTRATION=false
ADMIN_EMAIL=<email администратора>
ADMIN_USERNAME=<логин администратора>
ADMIN_PASSWORD=<сложный пароль>
ADMIN_FULL_NAME=<имя администратора>
BACKEND_CORS_ORIGINS=https://<frontend-domain>
FRONTEND_URL=https://<frontend-domain>
UPLOAD_DIR=/app/uploads
WEB_CONCURRENCY=2
```

6. Создайте публичный домен. Проверки `/health` и `/ready` должны возвращать HTTP 200.

## Frontend на Vercel

1. Импортируйте репозиторий и укажите Root Directory: `frontend`.
2. Framework Preset: Vite.
3. Добавьте переменную для Production и Preview:

```env
VITE_BACKEND_URL=https://<backend-domain>
```

4. Выполните deploy.
5. Добавьте production-домен Vercel в `BACKEND_CORS_ORIGINS` Railway и перезапустите backend.

## Frontend на Railway

1. Создайте второй сервис с Root Directory `/frontend`.
2. Добавьте `BACKEND_URL=https://<backend-domain>`.
3. Создайте публичный домен frontend и добавьте его в `BACKEND_CORS_ORIGINS` backend-сервиса.

Не используйте `*` для CORS и не храните секреты в репозитории.
