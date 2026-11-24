
# TOEIC Microservices — Agent Guidelines

## Stack

Java 21 · Spring Boot 4.1.1 · PostgreSQL 17 · RabbitMQ 3.13 · Nginx 1.27 · Vanilla JS (no framework) · Flyway migrations · JUnit 5 + Mockito · Docker Compose (12 containers).

## Architecture

- Five bounded contexts: **Identity** (IAM), **Content** (quiz catalog), **Assessment** (exam execution + DDD aggregate), **Interaction** (reviews + activity), **Membership** (plan entitlement).
- Each service owns its PostgreSQL database; cross-service references are bare UUIDs only.
- Layering per service: `entrypoints/core/data/adapters` — reference: `assessment-service/`.
- Assessment is the most fully layered service (Aggregate, Application Service, Ports). Content and Membership have business logic in Controllers (known gap, see audit).
- Gateway (Nginx) is the only public entrypoint; internal routes are blocked at gateway level.
- Transactional Outbox: Assessment grades and publishes `AttemptGraded` → RabbitMQ → Interaction.

## Working Rules

- Read only files relevant to the current task.
- Prefer small changes in one service per task.
- Never change business behavior during package refactoring.
- Do not modify database migrations without explicit instruction.
- Never run `docker compose down -v` or delete volumes.
- Do not commit or push without explicit instruction.
- Do not expose secrets in logs, diffs, or reports.
- Avoid repeating tests already verified unless affected by changes.

## Skill Routing

Always load `toeic-planning` first to scope the task, and `toeic-verification` last before declaring done.

| Task | Skills to load |
| --- | --- |
| Any task (start) | `toeic-planning` |
| UI / frontend change | `toeic-mvp-guardian` + `toeic-ui-ux` |
| Backend feature | `toeic-mvp-guardian` + `toeic-backend-standards` + `toeic-domain-business` |
| Business / domain change | `toeic-mvp-guardian` + `toeic-domain-business` + `toeic-architecture-qa` |
| API / contract change | `toeic-mvp-guardian` + `toeic-api-contract` + `toeic-architecture-qa` |
| Security change | `toeic-mvp-guardian` + `toeic-security-checklist` |
| Cross-service change | `toeic-mvp-guardian` + `toeic-domain-business` + `toeic-architecture-qa` |
| Debugging | `toeic-debugging-guide` + `toeic-mvp-guardian` |
| Code review | `toeic-code-review` |
| Full MVP review / audit | `toeic-mvp-guardian` + `toeic-ui-ux` + `toeic-domain-business` + `toeic-architecture-qa` |
| Any task (end) | `toeic-verification` |

Skills live at `.agents/skills/<name>/SKILL.md`. Load the applicable set for the task; for tasks spanning categories, use their combined set.

## Validation

- Run focused tests first; full regression only when cross-service changes are involved.
- Keep tool outputs short; inspect errors rather than printing full logs.
- Report only: changed files, tests, failures, remaining risks.
- Preserve evidence for architecture quality scenarios (SHA, timestamp, command, result).
- `node --check web/app.js` before closing any frontend task.
