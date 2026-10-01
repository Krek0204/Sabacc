# Changelog

Значимые изменения Sabacc. Правила ведения: [docs/agents/rules/changelog.md](docs/agents/rules/changelog.md).
История начинается с добавления этого журнала; прошлые релизы не реконструированы.

## [Unreleased]

### Added

- Добавлен базовый GitHub Actions CI: frontend lint, проверка формата заголовка PR
  и актуальности ветки относительно `main`
  ([SCRUM-25](https://isa-sabacc.atlassian.net/browse/SCRUM-25)).
- Добавлен `scripts/dev.sh`: сборка и запуск локального стенда одной командой,
  отдельные команды управления контейнерами и просмотра логов.

- Добавлены инструкции и контекст для агентов, правила веток и работы с Jira/GitHub,
  шаблон pull request и порядок ведения changelog.
- Добавлены инструкции для команды: локальный запуск, диагностика, путь от Jira до PR,
  критерии готовности и базовая архитектура; уточнены ограничения конфигурации в README.

### Changed

- Уточнены инструкции агентов: уровни чтения в `AGENTS.md`, lint как known-red вне
  lint-задач, действия при `403` на push (collaborator или fork+PR), сжатие
  `project-context.md` относительно архитектуры; срез проверок вынесен в
  `docs/agents/verification-history.md`.
- Формат заголовка PR: `SCRUM-<номер> Краткое описание с заглавной буквы`
  ([SCRUM-25](https://isa-sabacc.atlassian.net/browse/SCRUM-25)).

### Fixed

- Модалка кубиков больше не скрывается при выпадении `1`; карта номинала `1`
  снова показывает лицо, а не рубашку
  ([SCRUM-24](https://isa-sabacc.atlassian.net/browse/SCRUM-24), Bugs.md C4, H10).
- Исправлен запуск Gradle wrapper на Unix; Docker-сборка backend использует
  закреплённую проектом версию Gradle и собирает исполняемый `bootJar`.
- Добавлены `.dockerignore` для frontend/backend: локальные зависимости,
  результаты сборки и файлы окружения исключены из Docker-контекста.
- Инструкция запуска дополнена проверенным сценарием Compose и выбором JDK 21;
  фактический срез проверок зафиксирован в `docs/agents/verification-history.md`.
