# Architecture Decision Records — TOEIC Microservices MVP

## ADR-001 — Five business services vs one modular monolith
**Status:** Accepted for course MVP. **Context:** KTHDV requires at least four core microservices and Gateway. Monolith is more operationally simple but does not demonstrate independent service/database ownership. **Decision:** Identity, Content, Assessment, Interaction and Membership deployed independently with five databases. **Consequence:** More operations complexity, no FK across services, network failure handling. **Alternative rejected:** rename package without independent processes.

## ADR-002 — JWT access tokens for Identity
**Status:** Accepted for demo, production hardening pending. **Context:** original platform uses opaque bearer sessions stored in DB; KTHDV Hướng 3 requires IAM issuing JWT with roles/permissions. **Decision:** 30-minute HS256 signed tokens with role, permissions, subject, issuer, audience and expiration. Verify at service; do not accept `userId` from body. **Tradeoff:** revocation delayed, secret shared by services. **Recommended production:** RS256/EdDSA with JWKS, refresh/rotation/revocation.

## ADR-003 — RabbitMQ + transactional outbox
**Status:** Accepted with publisher-confirm limitation. **Context:** success of grading should not depend on Interaction uptime. **Decision:** save grade and outbox in single Assessment DB transaction, publish `AttemptGraded` on background poll to RabbitMQ, consume in Interaction with event ID as PK. **Alternative:** synchronous HTTP write to Interaction (rejected: failure coupling). **Tradeoff:** eventual consistency, retry/duplicate handling, confirm gap. In production wait for publisher confirms.

## ADR-004 — PostgreSQL per service
**Status:** Accepted. **Context:** domain separation and transactional correctness. **Decision:** separate PostgreSQL databases; each service owns migrations and tables; cross-service reference userId, quizId are UUID without FK across DB. **Alternative:** shared DB schema (rejected because it hides coupling). **Tradeoff:** reference integrity verified through API and business rules.

## ADR-005 — Small standalone web UI
**Status:** Accepted for exam demo. **Context:** existing complete React and React Native UIs depend on monolith endpoints; migrating all features is substantially larger. **Decision:** a small same-origin HTML/CSS/JS frontend served by Nginx tests the new 5-service workflow without copying old UI. **Consequence:** works for grading demonstration; does not prove full compatibility with existing frontend. Later migration via Strangler Fig routing and frontend contract adapters.

## ADR-006 — Attempt as the Assessment Aggregate Root

**Status.** Accepted and implemented.

**Context.** Answering and grading a practice attempt must follow the same state rules. Each attempt must use the question snapshot captured at start.

**Decision.** Keep `answer` and `grade` on `Attempt`, and delegate selection validation and correctness to `AttemptQuestion`. Use `IN_PROGRESS` and `GRADED`. The application loads children by attempt and takes a pessimistic write lock on the root for both answer and submit. On the first grade it saves the result and outbox row in one transaction.

**Trade-off.** A service-only state model would leave the grading rules in orchestration code. The chosen aggregate makes rules directly unit-testable and retains existing JPA mappings and the separate child store. The application is responsible for supplying all children for grading. The archived QA-02 run observed ten identical grades and one outbox row for the same attempt. [QA-02 log](evidence/qa02-concurrent-submit.txt) · [ADD traceability](EXAM_ARCHITECTURE.md#add-traceability)

## ADR-007 — Persistence ports for Assessment use cases

**Status.** Accepted and implemented.

**Context.** Use-case tests need to isolate orchestration from Spring Data JPA while preserving the existing schema and lock semantics.

**Decision.** Inject `AttemptStore`, `AttemptQuestionStore` and `OutboxStore` into `AttemptApplicationService`. Their `Jpa*Store` adapters delegate to Spring Data repositories. Keep `lockOwn` in the attempt port and implement it in `AttemptRepo`. The scheduled publisher uses `OutboxRepo` for polling and updating, and quota reservation uses the dedicated JDBC component.

**Trade-off.** Direct Spring Data injection would remove adapter classes while coupling use-case tests to repository interfaces from the framework. Separate domain and persistence entities would add mapping and transaction verification. The selected boundary isolates persistence calls for use-case tests and keeps JPA annotations on the mapped model. See the [dependency review](ASSESSMENT_DDD.md#5-application-services-ports-và-hướng-phụ-thuộc).
