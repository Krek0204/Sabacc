# Sabacc (Kessel Sabacc)

Веб-приложение — сетевая карточная игра **Kessel Sabacc** (вселенная «Звёздных войн»). Партия идёт между двумя игроками в реальном времени через браузер.

Учебный проект НГТУ им. Р. Е. Алексеева (ИРИТ, кафедра ЭСВМ). Код унаследован от предыдущей команды разработки.

Подробное описание предметной области, архитектуры и стека — в [`Project.md`](Project.md). Известные дефекты — в [`Bugs.md`](Bugs.md).

## Стек

| Слой | Технологии |
| --- | --- |
| Frontend | React 18, TypeScript, Vite 5, Redux Toolkit, STOMP / SockJS |
| Backend | Java 21, Kotlin 1.9, Spring Boot 3.3, WebSocket/STOMP, JPA, Flyway |
| БД | PostgreSQL 14 |
| Инфра | Docker Compose, Nginx |

## Быстрый старт

### 1. Переменные окружения

```bash
cp .env.example .env
```

Для локального Docker оставьте `PUBLIC_IP=localhost`. Пароль из примера годится только для разработки.

### 2. Запуск всего стека

```bash
docker compose --env-file .env up --build
```

После сборки:

- Игра: [http://localhost](http://localhost)
- Backend API: [http://localhost/api](http://localhost/api) (через Nginx)
- Swagger: [http://localhost:8080/swagger-ui/index.html](http://localhost:8080/swagger-ui/index.html) — если пробросить порт `8080` у backend

Образы собираются из исходников в этом репозитории. Чужие теги Docker Hub предыдущей команды в compose больше не используются.

Nginx сейчас отдаёт статику из `./frontend/dist` на хосте. Перед `docker compose up` соберите клиент:

```bash
cd frontend && npm ci && npm run build && cd ..
```

### 3. Только база

```bash
docker compose -f docker-compose-db.yaml up -d
```

### 4. Локальная разработка без полного Compose

Backend (из каталога `backend`, нужна запущенная PostgreSQL):

```bash
./gradlew bootRun
```

Frontend:

```bash
cd frontend
npm ci
npm run dev
```

Vite поднимается на порту `5173` и проксирует `/api` и `/ws` на `localhost:8080`.

## Структура

```
backend/     Spring Boot + игровое ядро на Kotlin
frontend/    React SPA
app.conf     Nginx: статика + прокси API/WebSocket
docker-compose.yaml
docker-compose-db.yaml
prometheus.yml
```

Состояние партии живёт **в памяти JVM**, в PostgreSQL хранятся пользователи и комнаты. После рестарта backend активные партии теряются.

## Переменные окружения

| Ключ | Назначение |
| --- | --- |
| `PUBLIC_IP` | Хост для CORS и WebSocket в профиле `prod` |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Доступ к PostgreSQL |
| `VITE_API_URL` | Префикс API при сборке frontend (`/api`) |
| `CRON_USER_CLEANUP` | Cron-выражение очистки анонимных пользователей |
| `SPRING_PROFILES_ACTIVE` | Профиль Spring (`prod` в текущем compose) |

Файл `.env` в git не попадает. В репозитории только `.env.example`.

## Что нужно сменить при своём деплое

В `backend/src/main/resources/application-prod.yml` CORS и WebSocket origins всё ещё завязаны на сервер предыдущей команды (`45.89.66.57`). Перед выкладкой замените их на ваш IP или домен.

Nginx (`app.conf`) слушает любой `server_name`.

## Документация

- [`Project.md`](Project.md) — продукт, правила, архитектура, требования
- [`Bugs.md`](Bugs.md) — критические и прочие дефекты по состоянию ветки
- [`backend/README.md`](backend/README.md) — REST/WebSocket DTO и эндпоинты
