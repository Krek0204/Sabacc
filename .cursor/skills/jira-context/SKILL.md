---
name: jira-context
description: >-
  Gathers the context of a Jira issue from a link or key (description, acceptance
  criteria, comments, links, status), locates the affected Sabacc code, docs and
  checks, and produces a structured brief before implementation. Use when the user
  shares a Jira issue link such as https://<site>.atlassian.net/browse/SCRUM-123,
  mentions an issue key like SCRUM-123, or asks to start, analyze or plan work on
  a Jira ticket.
---

# Jira context

All links below are relative to this file; the repository root is `../../../`.

## Workflow

Copy and track:

```
- [ ] 0. Baseline: git status, required reading
- [ ] 1. Parse the link
- [ ] 2. Fetch the issue
- [ ] 3. Collect the fields
- [ ] 4. Map to code and docs
- [ ] 5. Pick checks
- [ ] 6. Write the brief
```

## 0. Baseline

- Run `git status --short --branch`; keep user changes; note the current branch.
  If it already contains the issue key, the work is in progress: continue in it.
- Read before mapping (source of truth; do not duplicate them in the brief):
  - [AGENTS.md](../../../AGENTS.md): boundaries, reply language (Russian).
  - [project-context.md](../../../docs/agents/project-context.md): links, code map, pitfalls.
  - [tickets.md](../../../docs/agents/rules/tickets.md): Jira and PR rules.
  - [git.md](../../../docs/agents/rules/git.md): branch and commit formats.
- Read on demand: [architecture.md](../../../docs/architecture.md) (data flows, session
  lifecycle), [task-to-pr.md](../../../docs/how-to/task-to-pr.md) (ticket template,
  path to PR), [frontend/AGENTS.md](../../../frontend/AGENTS.md),
  [backend/AGENTS.md](../../../backend/AGENTS.md) for the affected side.

The skill is read-only for Jira: change statuses, comments, assignee or create
issues only when explicitly instructed.

## 1. Parse the link

- Key: `([A-Z][A-Z0-9_]+-\d+)` from the `/browse/<KEY>` path or the
  `selectedIssue=<KEY>` parameter; site is the `<site>.atlassian.net` host.
- Sabacc project: site `isa-sabacc.atlassian.net`, key `SCRUM`. If the key or site
  differs, say so and work with the given value; never substitute the key.
- `SCRUM-123` in docs is a placeholder, not a real issue.
- Links in [Project.md](../../../Project.md) belong to the former team; ignore them.

## 2. Fetch the issue

Try in order and stop at the first that works:

1. Jira/Atlassian MCP: `GetDynamicTools` with pattern `(?i)jira|atlassian`. If the
   status is `needsAuth`, call `mcp_auth` once, then retry. Read the issue, its
   comments and linked issues with the matching tools.
2. Issue text the user has already provided in the chat or a file.
3. Otherwise ask the user to paste the description, acceptance criteria and comments,
   and continue independent work (code search) meanwhile.

Never ask for API tokens, never store them in the repository or print them in logs.
A public page fetched without authentication is not a source: it is a login page.
State missing access explicitly in the brief.

## 3. Collect the fields

- Summary, type, status, priority, assignee, sprint, epic/parent.
- Description and acceptance criteria. If criteria are missing, say so; do not
  invent them. Expected ticket structure: section 1 of
  [task-to-pr.md](../../../docs/how-to/task-to-pr.md).
- Comments: requirement clarifications, decisions, open questions.
- Links: blockers, `is blocked by`, duplicates, subtasks and their statuses.
- Attachments and links (mockups, logs, PRs): list them; open if accessible.

## 4. Map to code and docs

Locate by the topic of the issue, then confirm with Grep/Read: docs may lag behind code.

| Issue topic | Start here |
|-------------|-----------|
| Game rules, scoring, cards, tokens, dice | `backend/src/main/kotlin/ru/ngtu/sabacc/gamecore/` (`game/session/GameSession.kt`, `card/`, `token/`, `turn/`, `player/`) |
| Turn and game-state messages | `gamecore/turn/TurnDto.kt`, `TurnType.kt`, `gamecore/game/*Dto.kt`, `backend/src/main/java/ru/ngtu/sabacc/game/messaging/dto/` |
| Session lifecycle, disconnect, finish | `game/session/GameSessionService.java`, `GameSessionWsController.java`, `ws/WebSocketEventListener.java` |
| Rooms | `room/SessionRoomService.java`, `SessionRoomController.java`, `SessionRoomStatus.java` |
| Users, cleanup | `user/UserService.java`, `UsersCleanupService.java`, `UserController.java` |
| REST routes | `constants/RestApiEndpoint.java`, controllers in `user/`, `room/`, `game/session/` |
| STOMP destinations | `constants/WebSocketApiEndpoint.java`, `system/config/websocket/WebSocketConfig.java`, `ws/` |
| Security, CORS, config | `system/config/security/`, `backend/src/main/resources/application.yml`, `application-prod.yml` |
| DB schema | `backend/src/main/resources/db/migration/` (new Flyway migration only) |
| Game UI | `frontend/src/features/Game/ui/` (`GameTable`, `GameDiceModal`, `GameCardModal`, `GameTokens`, ...) |
| Client game state | `frontend/src/features/Game/model/hooks/useGameState.tsx`, `model/types/game.ts` |
| Client STOMP | `frontend/src/shared/lib/hooks/useWebSocketGame.ts`, `useWebSocketSubscription.ts` |
| Client HTTP | `frontend/src/shared/api/rtkApi.ts`, `shared/lib/hooks/useRoomManager.ts`, `useSetupRoom.ts` |
| Cards, rooms (client types) | `frontend/src/entities/GameCard/`, `frontend/src/entities/Room/types/room.ts` |
| Pages, routing | `frontend/src/pages/`, `frontend/src/app/providers/Router/config/routeConfig.tsx`, `shared/const/router.ts` |
| Login | `frontend/src/features/Auth/`, `pages/LoginPage/` |
| Local stand, Docker, CI | [local-setup.md](../../../docs/how-to/local-setup.md), [troubleshooting.md](../../../docs/how-to/troubleshooting.md), `scripts/dev.sh`, `.github/workflows/` |

Backend Java paths are under `backend/src/main/java/ru/ngtu/sabacc/`.

- REST/STOMP changes touch both sides: server DTO/enum/destination and client
  types/handlers. List both in the brief.
- Requirements and rules: [Project.md](../../../Project.md); known defects:
  [Bugs.md](../../../Bugs.md). Link a `Bugs.md` item to the issue only on an
  explicit match, otherwise mark it as an assumption.
- Message formats: [backend/README.md](../../../backend/README.md); verify against code.
- Note contradictions between the issue, code and docs. Raise significant ones as
  questions before changing the disputed behavior.

## 5. Pick checks

Take commands from [verification.md](../../../docs/agents/verification.md) for the
affected side only:

- Frontend: `npm run test -- --run`, `npm run build` in `frontend/`; lint is known-red.
  Existing tests to extend: `features/Game/ui/GameDiceModal/isDiceFace.test.ts`,
  `entities/GameCard/ui/getNumericCardAsset.test.ts`.
- Backend: `./gradlew test` in `backend/` (needs DB). `gamecore` has no executable
  tests (`GameSessionTest.kt` is commented out): plan a new test for core changes.
- API/STOMP/UI: manual two-browser scenario from `verification.md`.
- Bug: plan a regression test reproducing the issue.

## 6. Write the brief

Reply in Russian, translating the headings. Omit empty sections except "Limitations":

```markdown
## SCRUM-<N>: <summary>
Source: <MCP | user text> · Type / status / priority: <...>
Link: https://isa-sabacc.atlassian.net/browse/SCRUM-<N>

### Summary
<1–3 sentences: the problem and the expected outcome>

### Acceptance criteria
- [ ] <item from the issue> → <file or check that covers it>

### Key points from comments and links
- <decision / blocker / dependency>

### Affected areas
- `<path>` — <why>

### Related docs
- `Project.md` / `Bugs.md` <section or item> — <match | assumption>

### How to verify
- <command from verification.md / test to add / manual scenario>

### Open questions
- <what blocks the solution>

### Limitations
- <no Jira access, incomplete data, etc.; "none" if everything was read>

Branch: `<type>/SCRUM-<N>-<slug>`
PR title: `SCRUM-<N> <Описание с заглавной буквы>`
```

- Branch type per [git.md](../../../docs/agents/rules/git.md): Bug → `bugfix`,
  new capability → `feature`, docs → `docs`, tooling → `chore`.
- PR title format and template: [tickets.md](../../../docs/agents/rules/tickets.md),
  [pull_request_template.md](../../../.github/pull_request_template.md).
- If the change needs a changelog entry, note it per
  [changelog.md rules](../../../docs/agents/rules/changelog.md) with the issue link.

Do not create the branch or start implementing if the user asked only for context.
