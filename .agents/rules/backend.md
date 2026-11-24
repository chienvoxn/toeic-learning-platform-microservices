# Backend Rules — TOEIC Microservices

## 1. Kiến trúc phân tán (5 Bounded Contexts)

Hệ thống gồm 5 microservices độc lập viết bằng Java 21 và Spring Boot 4.x:
1. **`identity-service`** (Port 8084, DB `identity_db`): Quản lý người dùng, authentication (JWT), RBAC, cấp phát quyền.
2. **`content-service`** (Port 8085, DB `content_db`): Quản lý ngân hàng đề thi TOEIC, quiz catalog, câu hỏi, snapshot đề thi và luồng draft/publish của giáo viên.
3. **`assessment-service`** (Port 8086, DB `assessment_db`): Quản lý phiên làm bài (attempts), autosave đáp án, chấm điểm TOEIC, DDD Aggregate Root, Transactional Outbox.
4. **`membership-service`** (Port 8082, DB `membership_db`): Quản lý gói thành viên (FREE vs PRO) và hạn ngạch lượt làm bài (entitlement/quota).
5. **`interaction-service`** (Port 8083, DB `interaction_db`): Quản lý đánh giá (reviews) và nhật ký hoạt động (activity feed) nhận qua RabbitMQ.

## 2. Nguyên tắc ranh giới cơ sở dữ liệu (Database per Service)

- **Tuyệt đối cấm** truy vấn cross-database, không JOIN giữa các bảng thuộc service khác nhau.
- Mọi quan hệ liên service chỉ được tham chiếu qua **UUID nguyên thủy** (ví dụ: `userId`, `quizId`, `attemptId`).
- Mỗi service quản lý bộ Flyway migrations riêng biệt (`src/main/resources/db/migration/`). Cấm sửa migration đã áp dụng; khi đổi schema phải tạo file migration `V{n}__*.sql` mới.

## 3. Quy chuẩn phân tầng bắt buộc (Hexagonal / Clean Architecture)

Tất cả các service tuân thủ cấu trúc package: `com.toeic.<service>/{entrypoints,core,data,adapters}`
(Lấy `assessment-service` làm chuẩn tham chiếu):

- **`entrypoints`**: Controllers REST, DTOs (Java 21 records), validate request bằng Jakarta Validation (`@NotNull`, `@Size`, `@Pattern`), xử lý `ResponseStatusException`. Tuyệt đối không chứa logic nghiệp vụ và không gọi trực tiếp JPA repository.
- **`core`**: Chứa Domain Models / Aggregate Roots, Application Services, và Port Interfaces. Tầng này độc lập, không import Spring MVC, không chứa JPA annotations ngoài aggregate root.
- **`data`**: Triển khai Port interfaces bằng Spring Data JPA / JDBC repositories.
- **`adapters`**: Triển khai các port giao tiếp bên ngoài: HTTP client liên service, messaging publisher/consumer, bảo mật token.

## 4. Giao tiếp liên dịch vụ & Bất đồng bộ

- **Đồng bộ (Sync HTTP)**:
  - Internal calls giữa các services phải đính kèm header `X-Service-Key` xác thực bảo mật.
  - Tuyến nội bộ (`/internal/*`) được Nginx Gateway chặn triệt để đối với client bên ngoài (trả về 404).
- **Bất đồng bộ (Async Messaging via RabbitMQ)**:
  - Sử dụng **Transactional Outbox Pattern**: Lưu outbox event (`AttemptGraded`) trong cùng database transaction với kết quả chấm điểm (grade attempt).
  - Exchange: `toeic.events`, Routing Key: `attempt.graded`.
  - Consumer tại `interaction-service` phải đảm bảo tính lũy kế (idempotent) bằng cách khử trùng theo `eventId`.

## 5. Kiểm thử & Thực thi

- Kiểm thử đơn vị (Unit Test) cho domain và application service không phụ thuộc container hay database.
- Lệnh kiểm thử theo từng service:
  - `mvn test -pl <service-name>` (ví dụ: `mvn test -pl assessment-service`).
- Trước khi báo cáo hoàn thành: Luôn chạy kiểm thử tập trung cho service bị ảnh hưởng và xác minh không có lỗi hồi quy.
