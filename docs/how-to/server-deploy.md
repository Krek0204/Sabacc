# Запуск на Ubuntu-сервере

Нужны Git, Docker Engine с Compose v2 или новее, исходящий интернет на время сборки
и свободный TCP-порт 80. Node.js, Java и PostgreSQL на хост устанавливать не нужно:
Docker собирает frontend/backend и запускает PostgreSQL. Для сборки желательно
2–4 ГБ RAM. Команды ниже выполняются на сервере.

## Публичный IP

В облачной панели привяжите публичный IPv4 к серверу. Обычно Ubuntu получает сеть
автоматически: вручную прописывать IP в Netplan не нужно. Если провайдер выдал
отдельные параметры сети, используйте именно его IP, префикс и шлюз.

В сетевом экране провайдера разрешите входящие TCP 22 (SSH) и 80 (игра).
Если UFW установлен и включён, добавьте правила, сохранив доступ по SSH:

```sh
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw status
```

Порты 5432 и 8080 наружу не открывайте. Публичный IP в код или .env вписывать
не требуется: Nginx принимает запросы по адресу сайта, frontend использует /api,
SockJS — /game. Backend проверяет совпадение origin с адресом сайта;
это [стандартное поведение Spring](https://docs.spring.io/spring-framework/reference/web/websocket/server.html#websocket-server-allowed-origins).
Текущий адрес игры: http://103.85.115.215/.

## Первая установка

```sh
docker version
docker compose version
git clone --branch bugfix/no-ticket-cloud-server-startup https://github.com/HardRandom/Sabacc.git /opt/Sabacc
cd /opt/Sabacc
cp .env.example .env
chmod 600 .env
```

Пока исправление находится в отдельной ветке, используется указанный --branch.
После слияния можно устанавливать main.

В новом .env замените POSTGRES_PASSWORD до первого запуска БД. Например:

```sh
db_password=$(openssl rand -hex 24)
sed -i "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$db_password/" .env
unset db_password
```

Оставьте VITE_API_URL=/api и HTTP_PORT=80. Не выполняйте source .env:
расписание cron содержит пробелы, Compose читает файл сам.
Существующие .env и postgres-data/ не перезаписывайте.
Смена пароля только в .env не меняет пароль уже созданной PostgreSQL.

## Сборка и запуск

```sh
cd /opt/Sabacc
docker compose --env-file .env config --quiet
docker compose --env-file .env up -d --build --wait --wait-timeout 180
docker compose --env-file .env ps
```

Либо ./scripts/dev.sh up. Отдельная npm-сборка на хосте не нужна.
Сайт и Nginx входят в образ sabacc-web:local. Compose ждёт готовности PostgreSQL,
затем backend, затем запускает Nginx. Flyway применяет миграции автоматически.
После перезагрузки сервера контейнеры поднимаются политикой unless-stopped,
если Docker включён в автозагрузку: sudo systemctl enable --now docker.

## Проверка

```sh
curl --fail http://127.0.0.1/
curl --fail http://127.0.0.1/api/v1/room/all
curl --fail http://127.0.0.1/game/info
docker compose --env-file .env logs --tail=100 backend nginx
```

Откройте http://103.85.115.215/ с другого устройства. Создайте разных игроков
в двух браузерах, войдите в одну комнату, выберите жетоны и сделайте ходы.
До прихода второго игрока обновление и возврат должны сохранять ожидание с номером
комнаты. Во время партии соперник видит паузу до возврата.

Если localhost отвечает, а публичный IP — нет, проверяйте привязку IP и firewall
у провайдера/Ubuntu. Если контейнер unhealthy, смотрите его лог; не удаляйте базу
для устранения ошибки. Не передавайте логи с паролями и токенами.

## Обновление и остановка

Обновляйте игру между партиями: состояние игры находится в памяти JVM,
перезапуск backend его теряет. PostgreSQL сохраняет пользователей и комнаты;
восстановление самой партии после рестарта не реализовано.

```sh
cd /opt/Sabacc
git pull --ff-only
docker compose --env-file .env up -d --build --wait --wait-timeout 180
```

Остановка без удаления данных:

```sh
docker compose --env-file .env stop
```

Повторный запуск готовых образов:

```sh
docker compose --env-file .env up -d --wait --wait-timeout 180
```

Каталог postgres-data/ не удаляйте. Перед обновлением сохраните дамп:

```sh
docker compose --env-file .env exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip > "sabacc-$(date +%Y%m%d-%H%M%S).sql.gz"
```

HTTP по IP не требует домена или туннеля. HTTPS, серверная авторизация пользователей,
мониторинг и автоматические резервные копии требуют отдельной настройки.

После перезапуска backend ранее начатые партии помечаются завершёнными: их карты
не сохранились. Пользователи и комнаты остаются в БД, комнаты ожидания доступны;
можно начать новую партию без попытки вернуться в потерянную сессию.
