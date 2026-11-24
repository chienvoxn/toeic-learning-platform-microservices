---
name: toeic-backend-standards
description: >-
  Áp dụng khi thêm hoặc sửa feature backend trong bất kỳ service nào của hệ thống TOEIC Microservices.
  Hướng dẫn phân tầng Hexagonal/Clean Architecture (entrypoints, core, data, adapters), Application Service pattern,
  Transactional Outbox, inter-service security (X-Service-Key), 5 PostgreSQL databases riêng biệt và code conventions.
---

# Tiêu chuẩn Phát triển Backend — TOEIC Microservices

Hệ thống backend bao gồm 5 bounded contexts độc lập (Java 21, Spring Boot 4.x), mỗi service sở hữu cơ sở dữ liệu PostgreSQL riêng biệt:
- **`identity-service`** (`identity_db`, port `8084`): IAM, JWT, RBAC, users.
- **`content-service`** (`content_db`, port `8085`): Quiz catalog, câu hỏi, snapshot đề, draft/publish.
- **`assessment-service`** (`assessment_db`, port `8086`): Attempts, autosave đáp án, chấm điểm TOEIC, Outbox `AttemptGraded`.
- **`membership-service`** (`membership_db`, port `8082`): Gói thành viên FREE/PRO, hạn ngạch (quota) lượt làm bài.
- **`interaction-service`** (`interaction_db`, port `8083`): Đánh giá nội dung (reviews), nhật ký hoạt động (activity feed).

---

## 1. Phân tầng Bắt buộc (Hexagonal / Clean Architecture)

Mỗi service tuân thủ cấu trúc package `com.toeic.<service>/{entrypoints,core,data,adapters}`:

| Tầng | Trách nhiệm | Phụ thuộc | Ghi chú |
|---|---|---|---|
| **`entrypoints`** | Controllers REST: Validate request, decode JWT claims, delegate sang Application Service, trả HTTP response | → `core` | Dùng Java 21 `record` cho DTOs. Không chứa logic nghiệp vụ, không gọi trực tiếp JPA repo. |
| **`core`** | Domain Models (Aggregate Root), Application Services, Port Interfaces | Độc lập tuyệt đối | Không import Spring MVC, không dùng JPA annotations ngoài aggregate root. |
| **`data`** | Triển khai Port interfaces bằng JPA / JDBC Repositories, Entity Mappings | → `core` interfaces | Ẩn chi tiết cơ sở dữ liệu khỏi tầng `core`. |
| **`adapters`** | Triển khai Port interfaces cho các hệ thống ngoại vi: HTTP clients liên service, RabbitMQ messaging, TokenService | → `core` interfaces | Quản lý kết nối mạng, serializing, retry và failover. |

> **Tham chiếu chuẩn:** [`assessment-service/src/main/java/com/toeic/assessment/`](../../../assessment-service/src/main/java/com/toeic/assessment/) — service được chuẩn hóa phân tầng DDD hoàn chỉnh nhất.

---

## 2. Application Service Pattern & Port Interfaces

Controller ủy quyền toàn bộ cho Application Service; Application Service điều phối qua Port interfaces:

```
Controller (entrypoints)
  → ApplicationService (core)
      → [AttemptStore, OutboxStore, QuizClient, IdentityClient] (Port Interfaces)
```

- **Quy tắc vàng**:
  - Không bao giờ inject trực tiếp JPA implementation vào Controller hay Application Service; luôn inject Port Interface.
  - Application Service chỉ trả về Domain Types hoặc Application DTOs, không trả về `ResponseEntity` hay HTTP types.

---

## 3. Ranh giới Cơ sở dữ liệu & Flyway Migrations

- **Database per Service**: 5 cơ sở dữ liệu hoàn toàn cô lập: `identity_db`, `content_db`, `assessment_db`, `membership_db`, `interaction_db`.
- **Tuyệt đối cấm**:
  - Không cross-database query hay JOIN giữa các bảng thuộc database khác.
  - Chỉ liên kết dữ liệu giữa các dịch vụ thông qua **UUID nguyên thủy** (ví dụ: `userId`, `quizId`, `attemptId`).
- **Flyway Migrations**:
  - Mỗi service có thư mục migration riêng: `<service>/src/main/resources/db/migration/V{n}__*.sql`.
  - **Cấm sửa hoặc xóa** migration đã áp dụng. Khi thay đổi schema, tạo file migration mới với số thứ tự kế tiếp.

---

## 4. Quản lý Giao dịch (Transaction) & Transactional Outbox

```java
@Transactional(readOnly = true)   // Áp dụng cho mọi GET endpoints
@Transactional                    // Áp dụng cho POST/PUT/DELETE
@Transactional(isolation = Isolation.REPEATABLE_READ) // Khi đọc draft/quota để chống race condition
```

- **Transactional Outbox**:
  - Khi chấm điểm (`assessment-service`), việc lưu kết quả điểm thi và lưu bản ghi Outbox event (`AttemptGraded`) **phải nằm trong cùng một transaction**.
  - Background worker / publisher đọc bảng Outbox và bắn event sang RabbitMQ exchange `toeic.events`.
- **Pessimistic Locking**: Dùng `lockOwn` hoặc `lockAdmin` pattern khi cập nhật đáp án và nộp bài thi đồng thời.

---

## 5. Bảo mật Giao tiếp Liên Dịch vụ (Inter-service Security)

- **User Context**: Truyền qua header `Authorization: Bearer <jwt>`. Controller trích xuất `userId` và roles từ JWT token.
- **Internal Service Calls**:
  - Các endpoint nội bộ (ví dụ: lấy snapshot đề có đáp án `/internal/*`) phải được bảo vệ bằng header `X-Service-Key`.
  - Nginx Gateway chặn toàn bộ các đường dẫn `/internal/*` từ mạng ngoài (trả về 404).

---

## 6. Code Conventions

- **Java Version**: Java 21 (Record, Pattern Matching, Text Blocks).
- **Logging**: `private static final Logger log = LoggerFactory.getLogger(ClassName.class);` — Tuyệt đối không dùng `System.out.println()`.
- **Bảo mật Logs**: Cấm in mật khẩu, JWT token, `INTERNAL_SERVICE_KEY`, hoặc dữ liệu nhạy cảm của người dùng ra log.
- **Timestamps**: Dùng `OffsetDateTime` với `ZoneOffset.UTC` hoặc `Instant`.

---

## 7. Checklist Kiểm tra Backend Trước khi Bàn giao

- [ ] Controller không chứa logic nghiệp vụ và không import repository trực tiếp.
- [ ] Mọi external dependency của `core` đều thông qua Port interface.
- [ ] Tất cả endpoint GET đều có `@Transactional(readOnly = true)`.
- [ ] Outbox event và chấm điểm nằm chung 1 transaction duy nhất.
- [ ] Không có query JOIN cross-service; chỉ tham chiếu qua UUID.
- [ ] Chạy unit test của service bị ảnh hưởng: `mvn test -pl <service-name>`.
