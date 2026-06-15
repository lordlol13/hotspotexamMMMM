# Деплой проекта на Railway

Проект (Dockerfiles, Nginx конфигурации, миграции БД) **полностью готов** к деплою на Railway. Вся архитектура разделена на микросервисы, которые отлично ложатся на инфраструктуру Railway.

Следуйте этой пошаговой инструкции для успешного запуска проекта:

## Шаг 1: Создание проекта и Базы Данных
1. Зайдите в панель управления [Railway](https://railway.app/).
2. Нажмите **New Project** -> **Provision PostgreSQL**.
3. Railway создаст базу данных и автоматически сгенерирует переменные окружения, включая `DATABASE_URL`.

## Шаг 2: Деплой Backend (FastAPI)
1. В том же проекте Railway нажмите **New** -> **GitHub Repo** (и выберите ваш репозиторий).
2. Сразу после добавления сервиса, зайдите в его **Settings** (Настройки).
3. Найдите секцию **Service** -> **Root Directory** и укажите `/backend`.
4. В секции **Build** убедитесь, что выбран **Dockerfile** (Railway сам подхватит `/backend/Dockerfile`).
5. Перейдите во вкладку **Variables** (Переменные) этого сервиса и добавьте следующие переменные:
   - `DATABASE_URL` (Нажмите "Add Reference" и выберите переменную из PostgreSQL, которую вы создали на Шаге 1).
   - `JWT_SECRET` (Сгенерируйте длинную случайную строку).
   - `ADMIN_EMAIL` (Email администратора, например, `admin@emergent.edu`).
   - `ADMIN_USERNAME` (например, `admin`).
   - `ADMIN_PASSWORD` (например, `admin123`).
   - `ADMIN_FULL_NAME` (например, `System Admin`).
   - `ENVIRONMENT` = `production`
   - `BACKEND_CORS_ORIGINS` (пока оставьте пустым, мы добавим сюда домен фронтенда позже, или напишите `*` для тестов).
6. Перейдите во вкладку **Networking** и нажмите **Generate Domain**. Railway выдаст вам публичный URL для бэкенда (например, `https://backend-production.up.railway.app`).
   - *Скопируйте этот URL, он понадобится для фронтенда.*

## Шаг 3: Деплой Frontend (React / Nginx)
1. В том же проекте Railway нажмите **New** -> **GitHub Repo** (и снова выберите ваш репозиторий).
2. Зайдите в **Settings** (Настройки) нового сервиса.
3. В секции **Service** -> **Root Directory** укажите `/frontend`.
4. В секции **Build** убедитесь, что выбран **Dockerfile** (Railway подхватит `/frontend/Dockerfile`).
5. Перейдите во вкладку **Variables** (Переменные) и добавьте:
   - `BACKEND_URL` = Вставьте домен вашего бэкенда из Шага 2 (например, `https://backend-production.up.railway.app`). *Важно: без слеша на конце!*
6. Перейдите во вкладку **Networking** и нажмите **Generate Domain**. Railway выдаст вам публичный URL для фронтенда (например, `https://hotspot-frontend.up.railway.app`).

## Шаг 4: Настройка CORS на Backend
1. Вернитесь в сервис **Backend** -> **Variables**.
2. Измените переменную `BACKEND_CORS_ORIGINS`, добавив туда сгенерированный URL фронтенда (например, `https://hotspot-frontend.up.railway.app`).

## Готово! 🎉
- Ваш фронтенд будет доступен по своему URL.
- Запросы `/api/*` будут автоматически проксироваться Nginx'ом на ваш бэкенд.
- Миграции Alembic для базы данных выполняются автоматически при каждом деплое бэкенда (согласно `CMD` в `backend/Dockerfile`).

---
**Примечание:** Корневые файлы `railway.json` и `railway.toml` были удалены, так как они могут сбивать Railway с толку при деплое монорепозитория. Теперь каждый сервис (backend и frontend) имеет свои локальные `railway.json`, которые Railway прочитает, когда вы укажете правильный `Root Directory`.
