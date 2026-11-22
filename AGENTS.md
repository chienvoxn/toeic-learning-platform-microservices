
# TOEIC Microservices — Codex Guidelines

## Architecture
- Java 21, Spring Boot, PostgreSQL, RabbitMQ, Docker Compose.
- Five services: Identity, Content, Assessment, Interaction, Membership.
- Follow entrypoints/core/data layering.
- Use DDD selectively; Assessment has an Attempt aggregate.
- Preserve JWT, RBAC, database ownership and transactional outbox.

## Working rules
- Read only files relevant to the current task.
- Do not read all docs, PDFs or entire repository unless requested.
- Prefer small changes in one service per task.
- Never change business behavior during package refactoring.
- Do not modify database migrations without explicit instruction.
- Never run docker compose down -v or delete volumes.
- Do not commit or push without explicit instruction.
- Avoid repeating tests already verified unless affected by changes.

## Validation
- Run focused tests first.
- Use full regression only when necessary.
- Keep tool outputs short; inspect errors rather than printing full logs.
- Report only: changed files, tests, failures, remaining risks.
- Preserve evidence for architecture quality scenarios.
