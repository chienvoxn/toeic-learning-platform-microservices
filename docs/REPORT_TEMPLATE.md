# Báo cáo KTHDV & KTPM — Bảng bằng chứng thực nghiệm

**Chỉ điền số liệu từ lần chạy có bằng chứng.** [Trạng thái xác minh](VALIDATION_STATUS.md) ghi nguồn kết quả và các phép thử còn thiếu.

## I. KTHDV — Hướng 3

| Tiêu chí | Bằng chứng cần chụp | Kết quả |
|---|---|---|
| 5 independent Core Microservices | `docker compose ps`, image/service logs | Đã cấu hình. Chờ ảnh runtime. |
| Independent Gateway | network tab: UI → :8088, nginx routes | Đã cấu hình. Smoke trước đó được báo đạt, chờ log và ảnh. |
| 5 databases | `docker compose exec <db> psql ... \l` | Có cấu hình và migrations riêng. Chờ ảnh hoặc output DB. |
| JWT roles/permissions | Quyền từ `/rbac/me`, HTTP và SQL COUNT theo vai trò | Learner bị từ chối tạo quiz và cấp role. Teacher tạo được quiz, bị từ chối cấp Admin. Admin cấp được Teacher và tạo được quiz. [Log QA-01](evidence/qa01-security-rbac-aa43453.txt) |
| Interaction records reviews + activity | UI screenshot and `interaction_db` rows | Smoke trước đó được báo đạt. Chờ log. |
| Membership FREE vs PRO | FREE trả 403, demo PRO mở được cùng quiz premium | FREE trả 403 với COUNT attempt giữ 0. Sau demo upgrade, PRO trả 200 và COUNT tăng 0 → 1. [Log QA-01](evidence/qa01-security-rbac-aa43453.txt) |
| No cross-database FK | ERD and migrations in each service | Đối chiếu migrations và mô hình sở hữu database. |
| Docker Compose | `docker compose config --quiet` & full stack boot | Config exit 0. Chờ bằng chứng full stack boot. |

### Class diagram for RBAC

```mermaid
classDiagram
 class IdentityUser {
   UUID userId
   String email
   String role
 }
 class UserRole {
   <<table>>
   UUID userId
   String roleCode
 }
 class Role {
   <<table>>
   String code
 }
 class RolePermission {
   <<table>>
   String roleCode
   String permissionCode
 }
 class Permission {
   <<table>>
   String code
 }
 class RbacService {
   +access(userId) Access
   +grant(userId, role)
 }
 class Access {
   <<record>>
   Set~String~ roles
   Set~String~ permissions
 }
 class TokenService {
   +issue(userId, roles, permissions) String
   +require(bearer) Actor
 }
 class Actor {
   UUID userId
   Set~String~ roles
   Set~String~ permissions
   +can(permission) boolean
 }
 IdentityUser "1" -- "0..*" UserRole : identity_user_roles
 Role "1" -- "0..*" UserRole : assigned role
 Role "1" -- "0..*" RolePermission : identity_role_permissions
 Permission "1" -- "0..*" RolePermission : granted permission
 IdentityDirectoryController ..> IdentityUser : credentials
 IdentityDirectoryController --> RbacService : resolves or grants roles
 IdentityDirectoryController --> TokenService : issues token from Access
 RbacService ..> UserRole : reads and writes using JDBC
 RbacService ..> RolePermission : reads using JDBC
 RbacService ..> Access : returns effective permissions
 TokenService ..> Actor : returns verified JWT claims
```

Các kiểu `<<table>>` biểu diễn cấu trúc SQL. Mỗi hàng gán nối đúng một User và một Role, hoặc đúng một Role và một Permission. Vì mỗi đầu có thể xuất hiện trong nhiều hàng gán, User–Role và Role–Permission đều là quan hệ nhiều–nhiều. `IdentityUser.role` là trường hiển thị cũ. Khi đăng nhập, controller lấy `RbacService.Access` từ DB để phát các tập role và permission trong JWT. `Actor` mang claims đã xác minh khi xử lý request, nên grant mới được phản ánh trong JWT ở lần phát token kế tiếp. [Controller](../identity-service/src/main/java/com/toeic/identity/entrypoints/IdentityDirectoryController.java) · [RbacService](../identity-service/src/main/java/com/toeic/identity/data/jdbc/RbacService.java) · [TokenService](../identity-service/src/main/java/com/toeic/identity/adapters/security/TokenService.java) · [Log QA-01](evidence/qa01-security-rbac-aa43453.txt)

### ERD ownership (five databases)

Mỗi sơ đồ dưới đây là một ranh giới database, hiển thị các cột khóa và cột cần để giải thích ownership. Mọi cạnh là FK nội database theo Flyway. Cạnh liền biểu thị FK thuộc khóa chính của bảng con. Cạnh đứt biểu thị FK ngoài khóa chính của bảng con. Tham chiếu bằng UUID xuyên service nằm ở bảng riêng.

#### identity_db — Identity

```mermaid
erDiagram
 IDENTITY_USERS {
   uuid user_id PK
   string email UK
   string role
 }
 IDENTITY_ROLES {
   string code PK
 }
 IDENTITY_PERMISSIONS {
   string code PK
 }
 IDENTITY_USER_ROLES {
   uuid user_id PK,FK
   string role_code PK,FK
 }
 IDENTITY_ROLE_PERMISSIONS {
   string role_code PK,FK
   string permission_code PK,FK
 }
 IDENTITY_USERS ||--o{ IDENTITY_USER_ROLES : user_id
 IDENTITY_ROLES ||--o{ IDENTITY_USER_ROLES : role_code
 IDENTITY_ROLES ||--o{ IDENTITY_ROLE_PERMISSIONS : role_code
 IDENTITY_PERMISSIONS ||--o{ IDENTITY_ROLE_PERMISSIONS : permission_code
```

#### content_db — Content

```mermaid
erDiagram
 LEARNING_RESOURCES {
   uuid resource_id PK
   uuid owner_user_id
 }
 TOEIC_QUIZZES {
   uuid quiz_id PK
   string title
   boolean premium
 }
 TOEIC_QUESTIONS {
   uuid question_id PK
   uuid quiz_id FK
 }
 TOEIC_QUIZZES ||..o{ TOEIC_QUESTIONS : quiz_id
```

#### assessment_db — Assessment

```mermaid
erDiagram
 ATTEMPTS {
   uuid attempt_id PK
   uuid user_id
   uuid quiz_id
   string status
 }
 ATTEMPT_QUESTIONS {
   uuid attempt_id PK,FK
   uuid question_id PK
   string correct_choice
   string selected_choice
 }
 DAILY_ATTEMPT_USAGE {
   uuid user_id PK
   date quota_date PK
   int used_count
 }
 EVENT_OUTBOX {
   uuid event_id PK
   uuid aggregate_id
   uuid actor_id
   string event_type
   boolean published
 }
 ATTEMPTS ||--o{ ATTEMPT_QUESTIONS : attempt_id
```

`event_outbox.aggregate_id` lưu ID của attempt từ ứng dụng. Migration không khai báo FK cho cột này.

#### interaction_db — Interaction

```mermaid
erDiagram
 CONTENT_REVIEWS {
   uuid id PK
   uuid user_id
   uuid content_id
   int stars
 }
 LEARNING_ACTIVITIES {
   uuid event_id PK
   uuid user_id
   uuid attempt_id
   string kind
 }
```

`content_reviews` có ràng buộc UNIQUE ghép `(user_id, content_id)`. `learning_activities.event_id` khớp event outbox để đối chiếu và chống ghi lặp.

#### membership_db — Membership

```mermaid
erDiagram
 MEMBERSHIP_PLANS {
   string code PK
   int max_practice_per_day
 }
 USER_MEMBERSHIPS {
   uuid id PK
   uuid user_id UK
   string plan_code FK
   string status
 }
 MEMBERSHIP_PLANS ||..o{ USER_MEMBERSHIPS : plan_code
```

#### Tham chiếu logic xuyên service

| Database giữ UUID | Cột | Ranh giới được tham chiếu |
|---|---|---|
| Content | `learning_resources.owner_user_id` | `identity_db.identity_users.user_id` |
| Assessment | `attempts.user_id`, `daily_attempt_usage.user_id`, `event_outbox.actor_id` | `identity_db.identity_users.user_id` |
| Interaction | `content_reviews.user_id`, `learning_activities.user_id` | `identity_db.identity_users.user_id`. Review lấy subject của JWT, activity nhận `userId` từ `AttemptGraded`. |
| Membership | `user_memberships.user_id` | `identity_db.identity_users.user_id` |
| Assessment | `attempts.quiz_id`, `attempt_questions.question_id` | ID từ Content snapshot, trỏ về `toeic_quizzes.quiz_id` và `toeic_questions.question_id`. |
| Interaction | `content_reviews.content_id` | ID nội dung do caller truyền. UI demo dùng quiz ID của Content. |
| Interaction | `learning_activities.attempt_id`, `learning_activities.event_id` | `assessment_db.attempts.attempt_id` và `assessment_db.event_outbox.event_id` qua integration event. |

Các tham chiếu ở bảng này không có FK xuyên DB. Nguồn đối chiếu gồm các migration [Identity](../identity-service/src/main/resources/db/migration), [Content](../content-service/src/main/resources/db/migration), [Assessment](../assessment-service/src/main/resources/db/migration), [Interaction](../interaction-service/src/main/resources/db/migration) và [Membership](../membership-service/src/main/resources/db/migration).

## II. KTPM — ADD / arc42 / C4

- arc42 1/3/4/5/6/7/9/10 sections are in the [architecture document](EXAM_ARCHITECTURE.md).
- Four six-field scenarios and the supporting modifiability exercise. [Quality attribute scenarios](EXAM_ARCHITECTURE.md#quality-attribute-scenarios) · [ADD traceability](EXAM_ARCHITECTURE.md#add-traceability)
- Seven ADRs, including the Assessment aggregate and persistence ports. [ADR log](ADR_MVP.md)
- C4 L1, L2, L3 and Deployment views are in the architecture file. [QA-03 runtime and recovery](EXAM_ARCHITECTURE.md#qa-03-availability-and-recovery)
- Assessment bounded context, aggregate, invariants and Example Mapping. [Assessment DDD](ASSESSMENT_DDD.md)

### Experiment results (fill after actual tests)

Phiên chạy trong `docs/evidence/` ghi checkout `aa43453` cho QA-01, `f191b7a` cho QA-03 và `19aa006` cho QA-04. Log QA-02 không ghi SHA checkout. Các số liệu dưới đây thuộc phiên chạy tương ứng.

| Experiment | Command | Expected | Observed | Screenshot |
|---|---|---|---|---|
| Assessment unit tests | `mvn -f assessment-service/pom.xml test` | domain rules and use-case orchestration | Raw report pending in `docs/evidence/`. | Archive the Surefire reports with run metadata. |
| Functional smoke | `python tests/smoke.py` | all enabled assertions pass | Raw output pending in `docs/evidence/`. | [Validation history](VALIDATION_STATUS.md) |
| Daily quota concurrency | `python tests/test_quota_concurrency.py` | after 9 starts, parallel starts yield 1 HTTP 200 and 9 HTTP 429, total 10 | Raw output pending in `docs/evidence/`. | [Validation history](VALIDATION_STATUS.md) |
| Performance 50 VUs / 60 s (QA-04) | `k6 run tests/load.js` | p95 < 500 ms, HTTP failures < 1%, all checks pass | **PASS, 2026-11-22.** 5,793 requests, 95.76 req/s, p95 29.18 ms, HTTP failures 0%, failed checks 0%. | [k6 console output](evidence/qa04-k6-20261122-run.txt) |
| Interaction down (QA-03 A) | `python -B -u tests/test_fault_injection.py` | Grade persists while Interaction is down. Queue holds the event and activity appears after recovery. | **PASS, 2026-11-22.** Submit HTTP 200 in 94.0 ms, `GRADED` 0/3. Queue `ready` increased 0 → 1 with zero consumers. Matching activity observed at recovery poll 5. | [QA-03 log, case A](evidence/qa03-fault-injection-20261122-134619.txt) |
| RabbitMQ down (QA-03 B) | `python -B -u tests/test_fault_injection.py` | Grade persists with outbox pending during outage. Same event is processed after recovery. | **PASS, 2026-11-22.** Submit HTTP 200 in 93.0 ms, `GRADED` 0/3. `published=false` in all 4 outage polls and 1 retry warning observed. Matching activity observed at recovery poll 6. | [QA-03 log, case B](evidence/qa03-fault-injection-20261122-134619.txt) |
| QA-01 Security / RBAC | `POST /ms/v1/contents/quizzes` và SQL COUNT trước/sau | Learner nhận 403, số quiz không đổi | **PASS, `aa43453`.** Tổng quiz 2 → 2, quiz theo mã lần chạy 0 → 0. Teacher và Admin mỗi lần nhận 200 và thêm đúng một quiz. | [Log QA-01](evidence/qa01-security-rbac-aa43453.txt) |
| No cross-user read | `GET /ms/v1/attempts/{id}` | Chủ sở hữu 200, người khác 404 | **PASS.** Cả Learner và Admin không sở hữu attempt đều nhận 404. | [Log QA-01](evidence/qa01-security-rbac-aa43453.txt) |
| Concurrent submit | `python -B -u tests/test_concurrent_submit.py` | 10 HTTP 200, identical grade, one outbox row | **PASS, 2026-11-22.** 10/10 HTTP 200, `GRADED` 0/3, 65.9–298.2 ms, one `AttemptGraded` row. | Log QA-02 với attempt `d59d38b4-cd72-4184-bf5a-40d396102609`. |

#### Kế hoạch chạy các phép thử

1. **k6 (QA-04).** Chạy preflight rồi chạy profile 50 VUs theo lệnh PowerShell bên dưới. Đường đọc đo là `GET /ms/v1/contents/quizzes` qua Gateway cục bộ, không cần JWT. Mỗi VU nghỉ 500 ms giữa các lượt. Script yêu cầu HTTP 200, JSON và một danh sách `QuizView` hợp lệ có dữ liệu seed. Tất cả check phải đạt cùng hai ngưỡng p95 < 500 ms và `http_req_failed` < 1%.
2. **Concurrent submit (QA-02).** Chạy [script QA-02](../tests/test_concurrent_submit.py) trên stack Compose đang hoạt động. Mỗi lần chạy đăng ký learner mới, mở một quiz FREE, lưu lựa chọn A và gửi 10 yêu cầu submit cùng JWT qua Gateway. Script ghi HTTP status, độ trễ và điểm của từng request, so sánh các phản hồi theo ID câu hỏi rồi truy vấn PostgreSQL ở chế độ chỉ đọc. Exit `0` khi cả 10 yêu cầu trả cùng kết quả `GRADED`, điểm khớp với snapshot đã lưu và outbox có đúng một sự kiện `AttemptGraded`. Exit `1` khi tiêu chí sai hoặc lỗi thiết lập. Exit `2` khi HTTP đạt nhưng thiếu xác minh DB.
3. **Fault injection (QA-03).** Chạy [quy trình PowerShell](../tests/fault_injection.md) để lưu log mới. Script dùng attempt và event ID riêng, đối chiếu HTTP, outbox, queue và Interaction DB. Lần chạy trên stack Windows tại checkout `f191b7a` quan sát activity qua API sau khoảng 23,64 giây (A) và 35,36 giây (B) tính từ lúc gửi submit. Các số đo này lấy từ timestamp lần polling đầu tiên thấy đúng event qua API. Cả 12 service ban đầu ở trạng thái running khi kết thúc. [Bằng chứng QA-03](evidence/qa03-fault-injection-20261122-134619.txt)

#### Kết quả QA-04 ngày 2026-11-22

| Chỉ số | Kết quả |
|---|---:|
| Requests / throughput | 5,793 / 95.76 req/s |
| p50 / p90 / p95 / p99 | 6.75 / 18.08 / 29.18 / 572.13 ms |
| HTTP request failure rate | 0% (0/5,793) |
| Check failure rate | 0% (0/17,379) |
| k6 exit code | 0 |

Checkout `19aa006`, Windows 11 x64, AMD Ryzen 7 6800H (8 nhân, 16 luồng), RAM 7.19 GiB. Docker Desktop Engine 29.8.2, Compose 5.5.1, Docker báo 16 CPU và 3.43 GiB RAM. k6 v2.4.0 chạy trên cùng máy với Gateway. Preflight 2 VUs trong 5 giây gửi 20 requests với 60/60 checks đạt. Dữ liệu thử gồm hai quiz. p99 là 572.13 ms, cao hơn mốc 500 ms dùng cho p95. [Preflight và cấu hình máy](evidence/qa04-k6-20261122-preflight.txt) · [Summary JSON](evidence/qa04-k6-20261122-summary.json)

Ghi kèm commit, ngày giờ, cấu hình máy, trạng thái Compose và dữ liệu thử đã ẩn JWT hoặc khóa dịch vụ. Log QA-01 ghi timestamp, SHA checkout, HTTP status và SQL COUNT. Tài khoản Admin cần cho phép thử được provision riêng và đăng nhập đã bị vô hiệu hóa sau khi chạy. [Log QA-01](evidence/qa01-security-rbac-aa43453.txt)

#### Chạy lại QA-04 trên Windows

Nếu chưa có k6, chạy `winget install k6 --source winget`, rồi mở PowerShell mới. Từ thư mục gốc repository, xác nhận `docker compose ps` hiển thị Gateway, Content Service và Content DB đang chạy. [Hướng dẫn cài k6](https://grafana.com/docs/k6/latest/set-up/install-k6/)

```powershell
$env:GATEWAY_URL = 'http://127.0.0.1:8088'
$env:K6_NO_USAGE_REPORT = 'true'
$qa04Stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$qa04Preflight = "docs/evidence/qa04-k6-$qa04Stamp-preflight.txt"
$qa04Run = "docs/evidence/qa04-k6-$qa04Stamp-run.txt"
$qa04Summary = "docs/evidence/qa04-k6-$qa04Stamp-summary.json"
k6 run --quiet --no-color --vus 2 --duration 5s tests/load.js 2>&1 |
    Tee-Object -FilePath $qa04Preflight
if ($LASTEXITCODE -ne 0) { throw 'QA-04 preflight failed' }
k6 run --quiet --no-color --vus 50 --duration 60s --summary-export $qa04Summary tests/load.js 2>&1 |
    Tee-Object -FilePath $qa04Run
$qa04Exit = $LASTEXITCODE
"QA-04 k6 exit code: $qa04Exit" | Tee-Object -FilePath $qa04Run -Append
```

#### Lưu bằng chứng QA-02 trên Windows

Tại thư mục gốc repository, mở PowerShell và chạy các lệnh sau khi stack đã sẵn sàng. Nếu stack chưa chạy, khởi động bằng `docker compose up -d --build` trước.

```powershell
$gatewayAddress = docker compose port gateway 8088
if ($LASTEXITCODE -ne 0) { throw 'Gateway Compose chưa sẵn sàng' }
$env:GATEWAY_URL = 'http://' + $gatewayAddress.Trim()
$qa02Log = Join-Path $env:TEMP ('toeic-qa02-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.txt')
"Git HEAD: $(git rev-parse --short HEAD)" | Tee-Object -FilePath $qa02Log
python -B -u tests/test_concurrent_submit.py | Tee-Object -FilePath $qa02Log -Append
$qa02Exit = $LASTEXITCODE
"QA-02 exit code $qa02Exit" | Tee-Object -FilePath $qa02Log -Append
Write-Output "Evidence file $qa02Log"
```

### Suggested screenshot set

1. Login / learner homepage / quiz list
2. Exam in progress (no answer key) / graded result (explanations)
3. FREE denied for PRO quiz / PRO demo activation
4. Content/Identity/Assessment/Interaction/Membership logs and `docker compose ps`
5. RabbitMQ management queue + activity received after Interaction restart
6. k6 summary with requests, p95 and failures

### Final conclusion template

> Trong môi trường [MÁY], ngày [NGÀY], hệ thống chạy [SỐ] container. Kịch bản QA-01 ... [SỐ LIỆU]. Những kịch bản chưa đạt: ... Phân tích nguyên nhân: ... Biện pháp cải tiến: ...

## III. Limitations to disclose in report

This bundle is an integrated **TOEIC MVP**; it does not migrate all original source features. The original project is a Spring Boot modular monolith with mature question bank, assessment, SRS and RAG. The demo's compact service code has not yet been reorganized to a literal `entrypoints/core/data` boilerplate. Any requirement for full original feature parity or strict provided boilerplate remains future work. Execution evidence must be captured on a machine capable of Docker+Maven dependency resolution.
