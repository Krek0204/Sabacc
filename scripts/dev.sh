#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

usage() {
  cat <<'EOF'
Локальный Sabacc: ./scripts/dev.sh <команда>

  up      Подготовить .env, собрать и запустить стенд
  build   Собрать frontend/dist и Docker-образы, без запуска
  start   Запустить ранее собранный стенд, без пересборки
  stop    Остановить контейнеры, сохранив их и данные
  down    Удалить контейнеры и сеть, сохранив postgres-data
  status  Показать состояние всех контейнеров
  logs    Показать последние 100 строк логов и следить за новыми
  help    Показать справку

Нужны запущенный Docker с Compose v2 и Node.js/npm для build/up.
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
  require node
  require npm
  printf 'Сборка frontend на хосте (статику использует Nginx)...\n'
  (
    cd "$ROOT/frontend"
    npm ci --no-audit --no-fund
    npm run build
  )
  printf 'Сборка Docker-образов...\n'
  compose build
}

start() {
  [[ -f frontend/dist/index.html ]] || die 'Нет frontend/dist. Сначала выполните ./scripts/dev.sh build или ./scripts/dev.sh up.'
  compose up -d --no-build
  compose ps -a
  printf '\nСтенд запущен: http://localhost\nBackend может ещё инициализироваться. Проверка: curl --fail http://localhost/api/v1/room/all\nЛоги: ./scripts/dev.sh logs\n'
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
