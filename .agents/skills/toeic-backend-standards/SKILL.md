---
name: toeic-backend-standards
description: >-
  Áp dụng khi thêm hoặc sửa feature backend trong bất kỳ service nào. Hướng dẫn
  phân tầng entrypoints/core/data/adapters, Application Service pattern, transaction
  management và code conventions của project.
---

# Backend Standards — TOEIC Microservices

## Phân tầng bắt buộc

Mỗi service tuân theo `com.toeic.<service>/{entrypoints,core,data,adapters}`:

| Tầng | Trách nhiệm | Phụ thuộc |
|---|---|---|
| `entrypoints` | Controller: validate input, delegate sang Application Service, trả response | → `core` |
| `core` | Domain model, Application Service, Port interfaces | Không phụ thuộc tầng khác |
| `data` | JPA/JDBC implementations của Port interfaces | → `core` interfaces |
| `adapters` | HTTP clients, messaging, security (TokenService) | → `core` interfaces |

**Tham chiếu chuẩn:** [`assessment-service/src/main/java/com/toeic/assessment/`](../../../assessment-service/src/main/java/com/toeic/assessment/) — đây là service phân tầng đầy đủ nhất.

## Application Service Pattern

Controller gọi Application Service; Application Service điều phối port interfaces:

```
Controller → ApplicationService → [AttemptStore, OutboxStore, QuizClient, IdentityClient]
```

- Không gọi trực tiếp Repository từ Controller (xem H-02 trong audit: `QuizController` là ngoại lệ cần refactor).
- Application Service không import Spring MVC; chỉ dùng domain types.
- Inject port interfaces (interface), không inject JPA implementation trực tiếp.

## Transaction Management

```java
@Transactional(readOnly = true)   // GET endpoints — luôn set
@Transactional                    // POST/PUT/DELETE — commit, rollback on exception
@Transactional(isolation = Isolation.REPEATABLE_READ)  // draft read để tránh phantom
```

- Outbox phải cùng transaction với grade: xem [`AttemptApplicationService`](../../../assessment-service/src/main/java/com/toeic/assessment/core/AttemptApplicationService.java).
- Pessimistic lock cho concurrent writes: `lockOwn` / `lockAdmin` pattern.

## Validation

- Input validation tại `entrypoints` với Jakarta Validation annotations (`@NotNull`, `@Size`, `@Pattern`).
- Domain invariants tại `core` (ném `IllegalStateException` hoặc `IllegalArgumentException`).
- HTTP errors tại `entrypoints` với `ResponseStatusException`.

## Code Conventions

- Format: match style của `AttemptController.java` và `Attempt.java` — không viết compact.
- Logger: `private static final Logger log = LoggerFactory.getLogger(ClassName.class);`
- Không dùng `System.out.println()`.
- Record cho DTOs trong Controller (Java 21 records).
- UUID cho primary keys; `OffsetDateTime` với `ZoneOffset.UTC` cho timestamps.

## Checklist trước khi kết thúc task backend

- [ ] Controller không chứa business logic
- [ ] Port interface cho mọi external dependency của core
- [ ] `@Transactional(readOnly=true)` trên mọi GET
- [ ] Outbox và grade trong cùng transaction (nếu có event)
- [ ] Không có cross-service DB query (chỉ bare UUID reference)
- [ ] Không log JWT, password, hay secret
- [ ] Chạy: `AttemptDomainTest` và `AttemptApplicationServiceTest` nếu chạm assessment
