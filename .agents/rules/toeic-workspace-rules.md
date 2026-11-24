# Workspace Rules — TOEIC Microservices

## Safety boundaries (absolute)

- Never run `docker compose down -v`, never delete named volumes or demo data.
- Never stage, commit, or push `.env` or any file containing secrets.
- Never modify DB migrations without explicit user instruction.
- Never reset or clean the working tree — existing changes belong to the user.
- Never install external packages, MCP servers, or run third-party scripts.
- Stop and report if a task requires crossing any boundary above.

## Scope discipline

- Read only files relevant to the current task; do not audit the full repository unless asked.
- Change one service at a time; prefer the smallest possible diff.
- Do not modify application source, `docker-compose.yml`, `gateway/nginx.conf`, or `pom.xml` unless that is the explicit task.
- Agent config changes (`.agents/`, `AGENTS.md`) are always safe and do not require Compose restart.

## Evidence and reporting

- Do not claim tests passed without running them.
- Do not fabricate file paths, test results, or audit findings.
- Report format: changed files · tests run + result · failures · remaining risks.
- Record SHA, timestamp, and command when storing test evidence.

## Communication

- Ask before assuming on ambiguous scope (especially cross-service changes).
- When blocked, state: what was attempted, what failed, what is needed to unblock.
