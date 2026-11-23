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

Нужны Git, Docker Desktop либо Docker Engine с Compose v2+ и свободный порт **80**.
Node.js, Java и PostgreSQL для полного Docker-запуска на хост не устанавливаются.

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

Пароль PostgreSQL из примера годится для локального теста. На сервере замените его до первого запуска новой БД. Публичный IP в конфигурации указывать не нужно.

### 2. Сборка и запуск стека

```sh
docker compose --env-file .env up -d --build --wait --wait-timeout 180
docker compose --env-file .env ps
```

Docker собирает frontend по package-lock.json и включает его в образ Nginx.
Отдельный frontend/dist на хосте не нужен. PostgreSQL запускается автоматически,
backend ждёт готовности БД, Nginx — backend. Первая сборка занимает несколько минут.

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
| `HTTP_PORT` | Внешний HTTP-порт; по умолчанию 80 |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Доступ к PostgreSQL |
| `VITE_API_URL` | Префикс API при сборке frontend (`/api`) |
| `CRON_USER_CLEANUP` | Cron-выражение очистки анонимных пользователей |
| `SPRING_PROFILES_ACTIVE` | В Compose жёстко задан `prod`; значение из `.env` его не меняет |

Файл `.env` в git не попадает. В репозитории только `.env.example`.

## Запуск на своём сервере

Тот же Compose можно поднять на Linux с открытым портом 80. Пошагово:
[docs/how-to/server-deploy.md](docs/how-to/server-deploy.md).

Адрес для игроков — http://<публичный-IP>/ (TCP 80 должен быть открыт у провайдера
и на сервере). Вписывать адрес в frontend/backend не требуется.
Исторические IP и образы из Project.md для этой установки не используются.

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
