# Как поднять локальный стенд

Полный Compose проверен 2026-09-30 на macOS arm64: Node.js 22.17.0, npm 10.9.2,
Docker 28.5.1 и Compose 2.40.3. Сборка, старт PostgreSQL/backend/Nginx, главная страница,
REST списка комнат и SockJS `/game/info` проверены успешно; экран открыт в Safari.
Пользователь также подтвердил запуск. Полная партия и отдельный dev-режим не проверены.
Для первого знакомства используй полный Compose; ограничения dev-режима перечислены ниже.

## Подготовка

Нужны Git, запущенный Docker Desktop (либо работающий Docker Engine) с Compose v2, Node.js/npm для сборки frontend и свободный
порт 80. README исходного проекта указывает Node.js 18+; точная версия не закреплена.
Для backend вне контейнера нужен JDK 21. Frontend устанавливается по package-lock.json.
На macOS проверь `java -version`; при нескольких JDK выбери 21:

```sh
export JAVA_HOME="$(/usr/libexec/java_home -v 21)"
export PATH="$JAVA_HOME/bin:$PATH"
java -version
```

На других ОС укажи `JAVA_HOME` на установленный JDK 21.

Если репозитория ещё нет:

```sh
git clone https://github.com/Krek0204/Sabacc.git
cd Sabacc
```

Остальные команды выполняются из корня существующего checkout, если не указано иное.
Создай `.env` только если его ещё нет; не перезаписывай свои настройки:

```sh
cp .env.example .env
```

Оставь локальные значения PostgreSQL для нового стенда либо согласуй свои реквизиты.
`.env` не коммитится. Не выполняй `source .env`: это файл Compose, а cron-значение
содержит пробелы. Compose загружает его самостоятельно.

## Запуск одной командой

Из корня checkout выполни `./scripts/dev.sh up`. Скрипт проверяет Docker,
создаёт отсутствующий `.env`, выполняет `npm ci`, собирает локальный `frontend/dist`
и Docker-образы, затем запускает Compose. Существующий `.env` не перезаписывается.
Скрипт можно вызвать по полному пути из любого каталога.

- `./scripts/dev.sh build` — только сборка, без перезапуска контейнеров.
- `./scripts/dev.sh start` — запуск готовой сборки.
- `./scripts/dev.sh stop` — остановка.
- `./scripts/dev.sh down` — удаление контейнеров/сети, данные БД сохраняются.
- `./scripts/dev.sh status` — состояние, включая завершившийся frontend-контейнер.
- `./scripts/dev.sh logs` — поток логов; выход через Ctrl+C. Перед передачей логов убери секреты.

Ниже приведены ручные команды для диагностики и отдельных режимов.

## Полный стек

Nginx использует `frontend/dist` с хоста; сборка образа frontend его не заменяет.

```sh
cd frontend
npm ci
npm run build
cd ..
docker compose --env-file .env config --quiet
docker compose --env-file .env up --build -d
docker compose --env-file .env ps -a
```

Проверь http://localhost и API:

```sh
curl --fail http://localhost/api/v1/room/all
```

Успешный API-ответ проверяет только этот endpoint. Для проверки игры открой второй
браузер/инкогнито с другим именем и выполни [ручной сценарий](../agents/verification.md).
Frontend-контейнер может завершиться с кодом 0: статику обслуживает Nginx.
Если backend ещё запускается, посмотри логи; `depends_on` здесь не ждёт готовности БД.

После изменения frontend заново выполни `npm run build` в `frontend/`.
После изменения backend пересобери сервис:

```sh
docker compose --env-file .env up --build -d backend
```

Это перезапустит JVM и потеряет активные игровые сессии.
Для остановки без удаления контейнеров:

```sh
docker compose --env-file .env stop
```

Для удаления контейнеров и сети:

```sh
docker compose --env-file .env down
```

Bind-каталог `postgres-data/` остаётся на диске. Не удаляй его для обычного перезапуска.

## Только БД и разработка на хосте

Сначала останови полный стек через `down`: два Compose-файла используют одинаковые
имя контейнера и каталог БД. Затем:

```sh
docker compose --env-file .env -f docker-compose-db.yaml up -d
```

БД доступна на `localhost:5432`. Для backend передай реквизиты своей локальной БД,
хост и cron. Пример ниже рассчитан на стандартные реквизиты из `.env.example`
и использует существующий prod-профиль ради настроек STOMP:

```sh
cd backend
SPRING_PROFILES_ACTIVE=prod SPRING_DATASOURCE_DATABASE_HOST=localhost CRON_USER_CLEANUP='0 */30 * * * *' ./gradlew bootRun
```

Gradle сам не загружает корневой `.env`; нестандартные реквизиты передавай через
локальную конфигурацию запуска (`SPRING_DATASOURCE_USERNAME`,
`SPRING_DATASOURCE_PASSWORD`, `SPRING_DATASOURCE_DATABASE_NAME`). Не сохраняй их в Git.

В другом терминале из корня:

```sh
cd frontend
npm ci
npm run dev
```

Vite слушает 5173, backend — 8080. Текущий Vite proxy удаляет `/api` и не содержит
`/game`, поэтому полный игровой сценарий в этом режиме не считается рабочим без
исправления конфигурации. Для знакомства с игрой используй полный Compose;
подробности — в [диагностике](troubleshooting.md).

## Переменные и ограничения

- `POSTGRES_*` — инициализация БД; Compose передаёт их backend как `SPRING_DATASOURCE_*`.
- `CRON_USER_CLEANUP` — расписание очистки пользователей; обязательно для запуска Spring.
- `VITE_API_URL` — префикс API при сборке; по умолчанию Vite использует `/api`.
  Корневой `.env` не загружается автоматически при `npm run build` в `frontend/`.
  Для другого префикса передай переменную процессу сборки явно.
- `SPRING_PROFILES_ACTIVE` — в полном Compose сейчас жёстко задан `prod`;
  одноимённая запись `.env` не переключает профиль этого сервиса.
- `PUBLIC_IP` — передаётся backend, но не заменяет автоматически захардкоженные origins
  в текущем `application-prod.yml`. Для нового домена нужно менять настройки приложения.

Публичное развёртывание требует отдельного согласованного процесса; старые адреса
команды в Project.md не являются адресами вашего стенда.
