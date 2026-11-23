#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

usage() {
  cat <<'EOF'
Локальный Sabacc: ./scripts/dev.sh <команда>

  up      Подготовить .env, собрать и запустить стенд
  build   Собрать Docker-образы с сайтом и backend, без запуска
  start   Запустить ранее собранный стенд, без пересборки
  stop    Остановить контейнеры, сохранив их и данные
  down    Удалить контейнеры и сеть, сохранив postgres-data
  status  Показать состояние всех контейнеров
  logs    Показать последние 100 строк логов и следить за новыми
  help    Показать справку

Нужен запущенный Docker с Compose v2 или новее. Node.js и Java на хосте не нужны.
Перезапуск backend прерывает активные партии. Скрипт не запускает тесты.
EOF
}

die() { printf 'Ошибка: %s\n' "$*" >&2; exit 1; }
require() { command -v "$1" >/dev/null 2>&1 || die "Не найдена команда $1."; }
compose() { docker compose --env-file "$ROOT/.env" -f "$ROOT/docker-compose.yaml" "$@"; }

prepare() {
  require docker
  docker compose version >/dev/null 2>&1 || die 'Нужен Docker Compose v2.'
  docker info >/dev/null 2>&1 || die 'Docker недоступен. Запустите Docker Desktop и проверьте права доступа.'
  if [[ ! -f .env ]]; then
    cp .env.example .env
    printf 'Создан .env из .env.example для локального запуска.\n'
  fi
  compose config --quiet
}

build() {
  printf 'Сборка сайта и backend внутри Docker...\n'
  compose build
}

start() {
  compose up -d --no-build --wait --wait-timeout 180
  compose ps
  printf '\nСтенд готов: http://localhost (порт HTTP_PORT из .env)\nЛоги: ./scripts/dev.sh logs\n'
}

[[ $# -le 1 ]] || { usage >&2; exit 2; }
case "${1:-help}" in
  help|-h|--help) usage ;;
  up) prepare; build; start ;;
  build) prepare; build ;;
  start) prepare; start ;;
  stop) prepare; compose stop ;;
  down) prepare; compose down ;;
  status) prepare; compose ps -a ;;
  logs) prepare; compose logs --tail=100 --follow ;;
  *) usage >&2; exit 2 ;;
esac
