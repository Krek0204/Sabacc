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

Нужны Docker Desktop, Node.js 18+ и свободный порт **80**.

Самый короткий путь — из корня репозитория:

```sh
./scripts/dev.sh up
```

Скрипт создаст `.env`, если его нет, установит зависимости, соберёт frontend и Docker-образы,
затем запустит стенд. Для повторного старта без сборки — `./scripts/dev.sh start`.
Только сборка — `./scripts/dev.sh build`; остановка — `./scripts/dev.sh stop`;
состояние — `./scripts/dev.sh status`; логи — `./scripts/dev.sh logs`.
Скрипт не запускает тесты и не удаляет данные БД. Ниже — те же шаги вручную.

### 1. Переменные окружения

```bash
cp .env.example .env
```

Для локального Docker оставьте `PUBLIC_IP=localhost`. Пароль из примера годится только для разработки.

### 2. Сборка frontend на хосте

Nginx отдаёт статику из `./frontend/dist` на вашей машине, а не из Docker-образа frontend. Сначала:

```bash
cd frontend
npm ci
npm run build
cd ..
```

`npm ci` берёт версии из `package-lock.json`. Без него `npx tsc` может подтянуть несовместимый TypeScript и сборка упадёт.

### 3. Запуск стека

```bash
docker compose --env-file .env up --build
```

Первая сборка backend в Docker занимает несколько минут. Контейнер `sabacc_frontend` сразу завершается с кодом 0 — так и задумано: он только собирает образ, игру отдаёт Nginx.

После старта:

- Игра: [http://localhost](http://localhost)
- Backend API: [http://localhost/api/v1/...](http://localhost/api/v1/room/all)

Порт `8080` наружу не проброшен, Swagger с хоста недоступен. Партия — на двоих: откройте второй браузер (или инкогнито) и введите другое имя.

### Другие режимы и диагностика

Пошаговый запуск, остановка, отдельная БД и ограничения dev-режима описаны
в [инструкции запуска](docs/how-to/local-setup.md).
Текущий dev proxy требует исправления для полного игрового сценария;
[диагностика](docs/how-to/troubleshooting.md) описывает известные причины.

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
| `PUBLIC_IP` | Передаётся backend; текущие origins в YAML автоматически не заменяет |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Доступ к PostgreSQL |
| `VITE_API_URL` | Префикс API при сборке frontend (`/api`) |
| `CRON_USER_CLEANUP` | Cron-выражение очистки анонимных пользователей |
| `SPRING_PROFILES_ACTIVE` | В Compose жёстко задан `prod`; значение из `.env` его не меняет |

Файл `.env` в git не попадает. В репозитории только `.env.example`.

## Что нужно сменить при своём деплое

В `backend/src/main/resources/application-prod.yml` CORS и WebSocket origins всё ещё завязаны на сервер предыдущей команды (`45.89.66.57`). Перед выкладкой замените их на ваш IP или домен.

Nginx (`app.conf`) слушает любой `server_name`.

## Документация

- [`docs/README.md`](docs/README.md) — карта документации и how-to
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — работа команды и критерии готовности
- [`docs/architecture.md`](docs/architecture.md) — базовая архитектура

- [`AGENTS.md`](AGENTS.md) — начало работы для агентов, контекст и правила разработки
- [`docs/agents/project-context.md`](docs/agents/project-context.md) — карта кода и текущие интеграции
- [`changelog.md`](changelog.md) — значимые изменения проекта
- [`Project.md`](Project.md) — продукт, правила, архитектура, требования
- [`Bugs.md`](Bugs.md) — критические и прочие дефекты по состоянию ветки
- [`backend/README.md`](backend/README.md) — REST/WebSocket DTO и эндпоинты
