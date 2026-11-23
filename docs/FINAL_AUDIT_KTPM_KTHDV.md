# Final Audit KTPM & KTHDV — TOEIC Learning Platform Microservices

**Cập nhật audit** 22/11/2026 · **Nhánh** `refactor/remaining-layered-services` · **Revision mã trên GitHub và CI** `730dd5c` · **Build/runtime cục bộ đã lưu** `41b192d` · **Baseline audit ban đầu** `2fd4ed8`

## Audit supplement — current baseline, 24/11/2026

**Current verified code:** [`2e2681eab644f805f6765bb2969126a641088020`](https://github.com/chienvoxn/toeic-learning-platform-microservices/commit/2e2681eab644f805f6765bb2969126a641088020), `refactor/remaining-layered-services`. [CI run #7](https://github.com/chienvoxn/toeic-learning-platform-microservices/actions/runs/45244105920) completed **6/6 PASS**. The old revision references in the historical matrix are retained as per-run provenance; do not treat them as current baseline.

| Requirement / evidence | Current status | Scope and remaining action |
|---|---|---|
| K07, E04: GitHub baseline and CI | **PASS for code CI** | Run #7 at `2e2681e`, 6/6 jobs. F-02 and QA-03 are separate local live tests. |
| K12, E08: QA-03 availability | **PASS** | [24/11 A/B evidence](evidence/qa03-fault-injection-20261124-011437.txt), test checkout `ff9955b`: 200 and persisted grade in both outages, restored activity in SQL and API, 12/12 services running, exit 0. A 29.36 s, B 32.14 s submit-to-activity. |
| F-02 PostgreSQL/RabbitMQ/combined | **PASS locally, raw archive pending** | PostgreSQL 1/1, RabbitMQ 4/4 plus ACK-only 1/1, combined 2/2 all passed on `ff9955b`; complete Maven console logs not yet committed. |
| ADR-003: outbox publisher confirmation | **Implemented** | Correlated ACKs and mandatory returns, NACK/timeout handling, separate publisher connection and reset; broker ACK cannot atomically commit SQL mark-published. |
| K08: official `entrypoints/core/data` boilerplate | **PARTIAL / P0** | Layered packages exist in five services, but exact match with instructor boilerplate has not been confirmed. |
| K14, E10: final report and demo images | **PARTIAL / P1** | Mermaid diagrams, ERDs, RBAC and k6 chart available; report assembly, demo rehearsal and live screenshots remain. |

---

## 1. Executive Summary

- **KTHDV Hướng 3.** Audit ban đầu xác nhận năm database riêng bằng truy vấn chỉ đọc. ERD theo năm database và sơ đồ RBAC đã được đối chiếu với Flyway và mã Identity. Phạm vi ACL của rubric và hồ sơ demo vẫn cần bổ sung theo ma trận.
- **KTPM.** Nhóm xác nhận giảng viên đã chấp thuận đề tài TOEIC. Assessment được phân tầng tại `a0569d9`, bốn service còn lại tại `aa43453`. Hồ sơ hiện có truy vết ADD, bốn kịch bản QA đủ sáu trường, C4 L1 với Admin và sequence QA-03 hai nhánh sự cố. K07 đã xác minh [revision 730dd5c](https://github.com/chienvoxn/toeic-learning-platform-microservices/commit/730dd5cca4a9f8690720b4379bda8458e64707e0) và [CI run 45022782408](https://github.com/chienvoxn/toeic-learning-platform-microservices/actions/runs/45022782408) đạt 6/6 job. P0 còn lại là K08, đối chiếu boilerplate chính thức.
- **Bảo mật.** QA-01 **PASS** tại checkout `aa43453`. Learner tạo quiz nhận 403, SQL COUNT giữ 2 → 2. Log ghi thêm quyền Learner/Teacher/Admin, quyền sở hữu attempt và FREE/PRO. [Bằng chứng QA-01](evidence/qa01-security-rbac-aa43453.txt)

Đã đọc trực tiếp cả hai đề trong audit ban đầu. Số trang tính từ trang đầu PDF. Đối chiếu tĩnh tài liệu, source và Flyway được ghi tại `e755d36`. Tại `41b192d`, Maven clean verify và Compose no-cache build đạt. Startup được xác minh sau khi khởi động lại riêng container Interaction hiện có. Smoke và quota concurrency đạt, concurrent submit chưa chạy do RAM khả dụng thấp. Mỗi kết quả thực nghiệm giữ phạm vi của phiên chạy ghi ở §7. Đề nguồn lưu ngoài repository (`Thi KTPM.pdf` và `Thi KTHDV.pdf`).

## 2. Requirement Traceability Matrix

**Trạng thái** · `PASS` có bằng chứng đủ cho đúng phạm vi của dòng · `PARTIAL` có triển khai hoặc tài liệu nhưng thiếu phần yêu cầu hay bằng chứng · `MISSING` phần yêu cầu hoặc hiện vật chưa có · `NEED CONFIRMATION` cần quyết định hoặc xác minh ngoài repository. **Ưu tiên** · P0 có thể chặn việc nộp hoặc đáp ứng rubric · P1 ảnh hưởng trực tiếp đến điểm hay độ tin cậy của demo · P2 cải tiến ngoài phạm vi chốt bài. Dòng đã đạt dùng P2 cho việc lưu hoặc giữ bằng chứng.

### 2.1. Bắt buộc và khuyến nghị theo đề gốc

| Học phần | Bắt buộc | Gợi ý hoặc lựa chọn kỹ thuật |
|---|---|---|
| KTPM | ADD, tài liệu arc42/C4, tối thiểu ba Quality Attribute Scenarios hoàn chỉnh và hai ADR. Cuối kỳ có link GitHub, mã phân tầng `entrypoints/core/data` dựa trên boilerplate, thư mục khớp thiết kế tĩnh, Compose chạy toàn bộ bằng một lệnh, C4 L3 cho dịch vụ cốt lõi, sequence cho kịch bản chất lượng áp lực nhất, deployment view và báo cáo thực nghiệm có ảnh/biểu đồ, số đo đối chiếu cam kết. Trang 1 §1, trang 2–3 §3. | CQRS + Event-Driven, Hexagonal và Microservices/Data Pipeline là các ánh xạ được gợi ý theo A/B/C. JMeter, k6 và script giả lập sự cố là ví dụ công cụ. Ngưỡng số trong A/B/C gắn với từng đề. Nhóm xác nhận TOEIC đã được duyệt. Các ngưỡng QA của TOEIC vẫn là mục tiêu nhóm ghi trong tài liệu kiến trúc. Trang 1–3. |
| KTHDV, Hướng 3 | IAM cấp JWT có role/permission, Core Domain, Interaction và Membership. ERD phải thể hiện tách database và tham chiếu user bằng ID qua ranh giới. Class Diagram phải thể hiện cấu trúc phân quyền. Có một API Gateway, ít nhất bốn core microservices được triển khai, cả hệ thống chạy bằng Docker Compose cục bộ. Trang 2 Hướng 3 và trang 3 Cơ chế đánh giá. | MOOC và các hệ thống quản trị tài nguyên là ví dụ đề tài. Tối ưu luồng đọc và minh họa quyền xem/sửa là trọng tâm của hướng. Đề Hướng 3 không đặt giá trị p95/throughput cụ thể. |

### 2.2. KTPM

| ID và yêu cầu | Kết quả | Vị trí và bằng chứng | Phần thiếu và hành động | Ưu tiên |
|---|---|---|---|---|
| K01 · Phạm vi đề tài được duyệt, PDF tr. 1–2 §2 | **PASS** | Nhóm xác nhận giảng viên đã chấp thuận đề tài TOEIC qua trao đổi với nhóm. Phạm vi triển khai được ghi trong [Kiến trúc §1](EXAM_ARCHITECTURE.md#1-arc42--introduction-and-goals). | Lưu lại trao đổi nếu cần nộp kèm. K02–K03 tiếp tục theo dõi driver, kịch bản và ngưỡng QA. | P2 |
| K02 · ADD, chiến lược và tactics, PDF tr. 1 §1, tr. 2 §3 | **PASS** | [ADD traceability](EXAM_ARCHITECTURE.md#add-traceability) ghi ưu tiên D01–D05 và nối driver, scenario, tactic, component, ADR và log theo phiên ở [§7](#7-danh-sách-bằng-chứng). [Chiến lược §4](EXAM_ARCHITECTURE.md#4-arc42--solution-strategy) nêu HTTP nội bộ, local transaction và outbox. | Đạt ở phạm vi hồ sơ ADD. M-01 là bài đo modifiability dự kiến, chưa có phép đo thay adapter chuyên biệt. | P2 |
| K03 · Ít nhất ba QA scenario hoàn chỉnh, PDF tr. 2 §3 | **PASS** | [QA-01–04](EXAM_ARCHITECTURE.md#quality-attribute-scenarios) có đủ Source, Stimulus, Environment, Artifact, Response và Response Measure. Mốc 60 giây của QA-03 khớp [quy trình thử](../tests/fault_injection.md). Số đo theo [§7](#7-danh-sách-bằng-chứng). | Giữ phạm vi các ngưỡng theo môi trường demo được mô tả. | P2 |
| K04 · arc42 và C4 L1 cùng bảng actor, PDF tr. 2 §3 | **PASS** | [C4 L1](EXAM_ARCHITECTURE.md#3-arc42--context-and-scope-c4-level-1) vẽ Learner, Teacher và Admin. Examiner ở phần stakeholder. UI và API Identity có thao tác cấp role cho Admin, được kiểm qua [QA-01](evidence/qa01-security-rbac-aa43453.txt). | Đạt ở phạm vi context và các vai trò runtime trong MVP. | P2 |
| K05 · C4 L2, PDF tr. 2 §3 | **PASS** | [Kiến trúc §5](EXAM_ARCHITECTURE.md#5-arc42--building-block-view-c4-level-2) tách Web/Gateway, năm service, năm database, HTTP nội bộ và RabbitMQ. Đối chiếu [Compose](../docker-compose.yml) và [Gateway](../gateway/nginx.conf). | Giữ sơ đồ trong bản nộp và xác định rõ UI tĩnh được Nginx phục vụ. | P2 |
| K06 · Tối thiểu hai ADR, PDF tr. 3 §3 | **PASS** | [ADR-001–007](ADR_MVP.md), trong đó ADR-002/003/004 mô tả lựa chọn JWT, outbox/RabbitMQ và database riêng cùng phương án hoặc đánh đổi. | Gắn ADR vào bảng truy vết ADD khi hoàn thiện K02. | P2 |
| K07 · GitHub Repository chứa mã nộp, PDF tr. 3 §3 cuối kỳ | **PASS** | GitHub API trả đúng SHA đầy đủ cho [revision 730dd5c](https://github.com/chienvoxn/toeic-learning-platform-microservices/commit/730dd5cca4a9f8690720b4379bda8458e64707e0). [CI run 45022782408](https://github.com/chienvoxn/toeic-learning-platform-microservices/actions/runs/45022782408) trả nhánh `refactor/remaining-layered-services`, `completed/success` và 6/6 job đạt cùng SHA. | Dùng permalink này để định danh baseline mã đã xác minh. Các cập nhật hồ sơ đang ở working tree. | P2 |
| K08 · Phân tầng dựa trên boilerplate `entrypoints/core/data`, PDF tr. 3 §3 cuối kỳ | **PARTIAL** | Cả năm service có `entrypoints`, `core`, `data` và `adapters` dưới `com.toeic.<service>`. Assessment đổi tại `a0569d9`, Identity, Content, Membership và Interaction đổi tại `aa43453`. [Assessment DDD §5](ASSESSMENT_DDD.md#5-application-services-ports-và-hướng-phụ-thuộc) · [Ánh xạ bốn service](EXAM_ARCHITECTURE.md#c4-component-to-package-mapping-for-identity-content-membership-and-interaction) | Chưa có boilerplate chính thức để đối chiếu. Xác nhận phiên bản mẫu, phạm vi áp dụng và cấu trúc hiện tại có được chấp nhận. | P0 |
| K09 · Thư mục ánh xạ chính xác thiết kế tĩnh, PDF tr. 3 §3 cuối kỳ | **PASS** | Đã đối chiếu bảng component → package → class với thư mục nguồn của năm service. Bootstrap Spring Boot vẫn ở package gốc từng service. [Ánh xạ Assessment](ASSESSMENT_DDD.md#ánh-xạ-c4-component--java-package--class--responsibility) · [Ánh xạ bốn service](EXAM_ARCHITECTURE.md#c4-component-to-package-mapping-for-identity-content-membership-and-interaction) | Giữ ánh xạ đồng bộ nếu boilerplate chính thức yêu cầu điều chỉnh ở K08. | P2 |
| K10 · Compose một lệnh, PDF tr. 3 §3 cuối kỳ | **PASS** | [Compose](../docker-compose.yml) khai báo build, DB, broker và Gateway. Lần chuẩn hóa trước đã build/tạo lại bốn service và xác nhận 12 container thường. Tại `41b192d`, config và build toàn project từ đầu đã đạt. [Compose output](evidence/e04-e05-41b192d-runtime.txt) | Startup của lần chạy `41b192d` được xác minh sau khi khởi động lại riêng container Interaction hiện có. Giới hạn của lần triển khai được ghi ở E04. | P2 |
| K11 · C4 L3 cho dịch vụ cốt lõi, PDF tr. 3 §3 cuối kỳ | **PASS** | [C4 L3](EXAM_ARCHITECTURE.md#c4-level-3--assessment-components) phản ánh `AttemptController → AttemptApplicationService → domain/ports`, JPA adapters, `QuizClient`, quota JDBC và publisher dùng `OutboxRepo` trực tiếp. | Giữ hướng phụ thuộc khi áp dụng K08. | P2 |
| K12 · Runtime sequence cho kịch bản áp lực nhất, PDF tr. 3 §3 cuối kỳ | **PASS** | [Sequence QA-03](EXAM_ARCHITECTURE.md#qa-03-availability-and-recovery) mô tả transaction grade + outbox, Interaction ngừng, broker ngừng, retry và activity sau phục hồi. [Log QA-03](evidence/qa03-fault-injection-20261122-134619.txt) đối chiếu hai nhánh qua SQL, queue và HTTP. | Bằng chứng runtime thuộc lần thử trước refactor. Giới hạn publisher confirms vẫn được ghi trong sequence. | P2 |
| K13 · Deployment view, PDF tr. 3 §3 cuối kỳ | **PASS** | [Kiến trúc §7](EXAM_ARCHITECTURE.md#7-arc42--deployment-view-docker-compose), [Compose](../docker-compose.yml) và runtime PS nhất quán về node local, Docker network, cổng app nội bộ và hai cổng host. | Giữ ghi chú RabbitMQ UI dùng cổng loopback quản trị riêng. | P2 |
| K14 · Báo cáo thực nghiệm và hình/số đo so cam kết, PDF tr. 3 §3 cuối kỳ | **PARTIAL** | [Bảng QA-01–04 và biểu đồ QA-04 từ k6](SUBMISSION_EVIDENCE.md) đối chiếu ngưỡng với số đo, thời điểm, SHA và giới hạn của từng phép thử. [Mẫu báo cáo](REPORT_TEMPLATE.md#experiment-results-fill-after-actual-tests) dẫn tới nguồn và hình. | Bộ hình và số liệu đã sẵn sàng để chèn vào báo cáo tổng hợp. Còn chốt bản báo cáo nộp và thu ảnh demo trực tiếp nếu dùng. | P1 |
| K15 · Tên file Compose theo đề, PDF tr. 3 §3 cuối kỳ | **PASS** | Đề ghi “Phải có file docker-compose.yml”. Đã đổi tên file duy nhất tại root thành [docker-compose.yml](../docker-compose.yml). Nội dung byte-identical. Compose config dạng JSON trùng giữa tên cũ, tên mới và tự phát hiện tên mới với .env.example. Config mặc định với .env cục bộ cũng thoát 0. | Phạm vi xác minh là tên và cấu hình. Project `toeic-microservices-mvp` vẫn có 12 dịch vụ. | P2 |

### 2.3. KTHDV Hướng 3

| ID và yêu cầu | Kết quả | Vị trí và bằng chứng | Phần thiếu và hành động | Ưu tiên |
|---|---|---|---|---|
| H01 · IAM cấp JWT và RBAC đa cấp, PDF tr. 2 | **PARTIAL** | [Identity](../identity-service/src/main/java/com/toeic/identity) và [Flyway V3](../identity-service/src/main/resources/db/migration/V3__rbac.sql) triển khai role/permission và JWT. [Log QA-01](evidence/qa01-security-rbac-aa43453.txt) ghi quyền Learner/Teacher/Admin, Admin cấp Teacher rồi Teacher đăng nhập lại, quyền tạo quiz và việc Learner/Teacher bị từ chối cấp role. | Kiểm thử quyền theo API đã đạt. Cần xác nhận rubric có yêu cầu ACL theo từng tài nguyên. Sơ đồ phân quyền tiếp tục theo dõi ở H06. | P1 |
| H02 · Core Domain quản lý tài nguyên, PDF tr. 2 | **PASS** | [Content](../content-service/src/main/java/com/toeic/content) có `QuizController` list/detail/create và `ResourceController` create/private-by-owner. [Flyway Content](../content-service/src/main/resources/db/migration) cung cấp bảng và seed. [QA-04 preflight](evidence/qa04-k6-20261122-preflight.txt) xác nhận HTTP 200 và hai quiz. [QA-02](evidence/qa02-concurrent-submit.txt) chứng minh quiz đi vào luồng Assessment. | Đưa tạo quiz thành bước minh họa quyền ở H01. H02 đánh giá phạm vi tài nguyên MVP. | P2 |
| H03 · Interaction, PDF tr. 2 | **PASS** | `InteractionController`, `ActivityConsumer` trong [Interaction](../interaction-service/src/main/java/com/toeic/interaction), hai [migration](../interaction-service/src/main/resources/db/migration). `interaction:write`, upsert theo người dùng và nội dung, activity theo chủ sở hữu. [QA-03](evidence/qa03-fault-injection-20261122-134619.txt) chứng minh dự án tạo activity phụ thuộc từ bài nộp. | Log chấm bài/ghi activity đã đủ cho nhánh tương tác này. Bổ sung ảnh review hoặc log smoke nếu trình bày thêm nhánh review. | P2 |
| H04 · Membership và quyền lợi mở rộng, PDF tr. 2 | **PARTIAL** | [Membership controller](../membership-service/src/main/java/com/toeic/membership/entrypoints/MembershipController.java) và [Flyway](../membership-service/src/main/resources/db/migration/V1__memberships.sql) có FREE/PRO. [Log QA-01](evidence/qa01-security-rbac-aa43453.txt) ghi demo flag bật, FREE nhận 403 và không tạo attempt, PRO nhận 200 và tạo đúng một attempt cùng quiz. [Raw output quota](evidence/e04-e05-41b192d-tests.txt) xác nhận kịch bản đồng thời đạt tại `41b192d`. | Hạn mức hiện là hằng theo gói ở controller, không đọc từ cột plan. | P1 |
| H05 · ERD tách database, tham chiếu user qua ID, PDF tr. 2 | **PASS** | [ERD năm DB](REPORT_TEMPLATE.md#erd-ownership-five-databases) tách năm ranh giới và khớp các FK nội database trong Flyway. Bảng tham chiếu logic giải thích cách `Interaction.user_id` và các UUID liên quan trỏ về IAM hoặc service sở hữu. | Sơ đồ chọn các cột cần cho ownership và quan hệ khóa. | P2 |
| H06 · Class Diagram cấu trúc phân quyền, PDF tr. 2 | **PASS** | [RBAC Class Diagram](REPORT_TEMPLATE.md#class-diagram-for-rbac) vẽ User–Role và Role–Permission qua hai bảng nối có bội số, đúng theo [Flyway V3](../identity-service/src/main/resources/db/migration/V3__rbac.sql). Sơ đồ phân biệt SQL, `RbacService.Access` và verified `Actor`. | H01 tiếp tục theo dõi phạm vi ACL mà rubric yêu cầu. | P2 |
| H07 · Gateway trước toàn hệ thống, PDF tr. 3 | **PASS** | [nginx.conf](../gateway/nginx.conf) định tuyến năm API prefix và chặn hai đường internal. Runtime PS chỉ công bố Gateway và RabbitMQ management trên loopback. [QA-04](evidence/qa04-k6-20261122-run.txt) truy cập qua cổng 8088. | Giữ cổng admin tách riêng và ghi trong slide/demo. | P2 |
| H08 · Ít nhất bốn core service chạy độc lập, PDF tr. 3 | **PASS** | Năm ứng dụng Spring Boot với Dockerfile/POM riêng trong [Compose](../docker-compose.yml). Audit runtime ghi đủ năm service và năm DB. Assessment gọi HTTP nội bộ và RabbitMQ thay cho truy cập DB khác. | Lưu ảnh `docker compose ps` vào hồ sơ nộp nếu giảng viên cần hình minh họa. | P2 |
| H09 · Cùng một nền tảng Compose cho demo, PDF tr. 3 | **PASS** | [Compose](../docker-compose.yml), [README §2–4](../README.md#2-khởi-động-từ-repository-root), [QA-03 đầu/cuối](evidence/qa03-fault-injection-20261122-134619.txt) và audit runtime xác nhận 12 service, 5 DB và RabbitMQ. | Duy trì cùng tên project và port loopback khi demo. | P2 |

### 2.4. Kiểm tra chất lượng triển khai và bằng chứng

| ID | Kết quả | Vị trí và bằng chứng | Phần thiếu và hành động | Ưu tiên |
|---|---|---|---|---|
| E01 · DDD và aggregate Assessment | **PASS** | [DDD §1–4](ASSESSMENT_DDD.md), `Attempt`, `AttemptQuestion`, `AttemptApplicationService` trong [source Assessment](../assessment-service/src/main/java/com/toeic/assessment) và [log QA-02](evidence/qa02-concurrent-submit.txt). Root giữ hai trạng thái, quyền sửa theo trạng thái, xác nhận câu thuộc lượt và chấm lại idempotent. | Phạm vi bằng chứng là luồng use case hiện tại. Đưa danh sách câu qua app vẫn là điều kiện để chấm đủ. | P2 |
| E02 · Ports & adapters và hướng phụ thuộc | **PASS** | [DDD §5](ASSESSMENT_DDD.md#5-application-services-ports-và-hướng-phụ-thuộc), [ADR-007](ADR_MVP.md#adr-007--persistence-ports-for-assessment-use-cases), ba port và ba JPA adapter. Use case tham chiếu port lưu trữ và domain. | Phạm vi đạt là persistence ports. App còn gọi `IdentityClient`, `QuizClient`, `DailyAttemptQuota` cụ thể; domain entity còn annotation JPA và field package-private. Chỉ xử lý sâu nếu K08 đòi hỏi. | P2 |
| E03 · Architecture tests | **MISSING** | [POM Assessment](../assessment-service/pom.xml), [test Assessment](../assessment-service/src/test/java/com/toeic/assessment) và [CI](../.github/workflows/microservices-ci.yml) có unit test hành vi. Chưa có rule tự động về hướng dependency hoặc package. | Sau khi chốt boilerplate, có thể thêm một rule dependency tối thiểu. Đề gốc không yêu cầu ArchUnit. | P2 |
| E04 · CI/CD và clean build theo revision nộp | **PARTIAL** | **CI PASS 6/6 tại `730dd5c`**. Năm Maven clean verify và một kiểm tra cú pháp web/Compose config. [CI run 45022782408](https://github.com/chienvoxn/toeic-learning-platform-microservices/actions/runs/45022782408). Tại `41b192d`, Compose build `--no-cache` đạt. Sau khởi động lại Interaction hiện có, runtime ghi 12 container, 5 log Started và Gateway HTTP 200. [Build cục bộ](evidence/e04-e05-41b192d-build.txt) · [Runtime](evidence/e04-e05-41b192d-runtime.txt) | Clean build image và runtime toàn stack tại `730dd5c` còn thiếu evidence. Phiên cục bộ cũ cần phục hồi Interaction. | P1 |
| E05 · Unit tests, smoke và quota | **PARTIAL** | CI Maven đạt tại `730dd5c`. Tại `41b192d`, Maven đạt 17 test và Content chạy 0 test. Smoke 10/10. Quota trả 1 HTTP 200, 9 HTTP 429 và lưu đúng 10 attempt. [Raw Maven](evidence/e04-e05-41b192d-build.txt) · [Raw regression](evidence/e04-e05-41b192d-tests.txt) | Smoke, quota và concurrent submit chưa có evidence tại `730dd5c`. Concurrent submit ở `41b192d` chưa chạy vì RAM còn 51.780 KiB. Log lịch sử QA-02 thiếu SHA. | P1 |
| E06 · QA-01 Security | **PASS** | [QA-01](EXAM_ARCHITECTURE.md#quality-attribute-scenarios) yêu cầu 403 và COUNT không đổi. [Log phiên chạy `aa43453`](evidence/qa01-security-rbac-aa43453.txt) ghi Learner 403, `toeic_quizzes` 2 → 2 và quiz theo mã lần chạy 0 → 0. Owner đọc attempt nhận 200, Learner và Admin không sở hữu nhận 404. | Phạm vi kiểm thử là các quyền trên stack demo. Fixture Admin được bootstrap riêng và đăng nhập bị vô hiệu hóa sau kiểm thử, xác nhận bằng HTTP 401. | P2 |
| E07 · QA-02 Concurrent Submit | **PASS** | [Log QA-02](evidence/qa02-concurrent-submit.txt) ghi 10/10 HTTP 200, body grade giống nhau, `GRADED` 0/3, `snapshotCorrect=0`, `outboxCount=1`, 65,9–298,2 ms. [Script](../tests/test_concurrent_submit.py) lọc `aggregate_id` và `event_type='AttemptGraded'`. | Log ghi thời điểm và attempt ID, thiếu cả SHA checkout và SHA image. Dùng bằng chứng cho lần chạy này. | P2 |
| E08 · QA-03 Availability | **PASS** | [Log QA-03](evidence/qa03-fault-injection-20261122-134619.txt) ghi HTTP 200 khi A/B bị dừng, điểm đã lưu, đối chiếu queue, SQL và API sau khi khôi phục. Kết thúc 12 service chạy. | Giới hạn là hai tình huống trên stack đơn; lưu link log để minh họa. | P2 |
| E09 · QA-04 Performance | **PASS** | [Preflight](evidence/qa04-k6-20261122-preflight.txt), [console](evidence/qa04-k6-20261122-run.txt), [summary](evidence/qa04-k6-20261122-summary.json). 50 VUs/60 s, 5.793 request, 95,76 req/s, p95 29,18 ms, 0 HTTP lỗi, 0/17.379 check lỗi. | Chỉ đo list quiz qua loopback với hai quiz và think time 500 ms. p99 572,13 ms, ngoài tiêu chí p95. Ghi giới hạn cạnh bảng kết quả. | P2 |
| E10 · README và demo | **PARTIAL** | [README từ root](../README.md#2-khởi-động-từ-repository-root), [script PowerShell](../scripts/run-demo.ps1), health/readiness qua Gateway, chuẩn bị tài khoản và kịch bản Learner/Teacher/Admin, FREE/PRO, Assessment, Interaction. [Bộ hình và checklist chụp](SUBMISSION_EVIDENCE.md#ảnh-chụp-demo-còn-chờ). | Còn rehearsal và ảnh giao diện từ stack sẵn sàng. Lần rà này chỉ thấy Gateway chạy và Content qua Gateway trả 502. | P1 |
| E11 · Phạm vi migration từ monolith | **PASS** | [ORIGINAL_REPO_MAPPING](ORIGINAL_REPO_MAPPING.md) và [Phạm vi MVP](../README.md) giới hạn vertical slice, giữ account/quiz/attempt/interaction/membership, chỉ rõ SRS, RAG, mobile và đối soát lịch sử nằm ngoài MVP. | Giữ mô tả trong báo cáo. Hỏi giảng viên nếu đã cam kết thêm parity trong đề cương riêng. | P2 |

## 3. Những điểm đã đạt

### 3.1. Deployment và data ownership

`docker compose ps -a` và Compose labels tại `aa43453` xác nhận 12 container chạy, 12 service riêng, không có one-off. Trong lần chuẩn hóa, bốn service được build và tạo lại; Assessment, Gateway, năm PostgreSQL và RabbitMQ giữ ID, thời điểm khởi động và mount. Network và sáu volumes được giữ. Log ghi `Started` cho năm ứng dụng và Gateway trả HTTP 200. Gateway dùng `127.0.0.1:8088`, RabbitMQ management dùng `127.0.0.1:15672`. [Compose, services và volumes](../docker-compose.yml) · [Gateway routes](../gateway/nginx.conf)

Truy vấn `SELECT current_database(), to_regclass('public.<own_table>'), to_regclass('public.<other_table>') IS NULL` chạy trong transaction `READ ONLY` trên từng container DB. Kết quả xác nhận database ownership tại runtime ở phạm vi một bảng mẫu và một bảng đối chứng mỗi DB. Mỗi DB dùng user `toeic` với thông tin xác thực dùng chung của demo. [Compose, PostgreSQL và JDBC URLs](../docker-compose.yml)

| DB quan sát | Bảng thuộc DB | Bảng đối chứng vắng mặt |
|---|---|---|
| `identity_db` | `identity_users` | `attempts` |
| `content_db` | `toeic_quizzes` | `identity_users` |
| `assessment_db` | `attempts` | `toeic_quizzes` |
| `interaction_db` | `learning_activities` | `identity_users` |
| `membership_db` | `user_memberships` | `identity_users` |

### 3.2. Đối chiếu với DDD by Examples

| Khía cạnh | Library | Đối chiếu TOEIC và hệ quả cho bài thi |
|---|---|---|
| Bounded Context | Catalogue và Lending cùng nằm trong modular monolith, chọn kiến trúc cục bộ theo độ phức tạp. | TOEIC chốt năm ranh giới triển khai và DB riêng theo Hướng 3. Vì Assessment thực thi luật chấm điểm, việc tách domain ở đây có căn cứ nghiệp vụ. Các context còn lại có thể trình bày theo mức phức tạp thực tế. [Solution strategy](EXAM_ARCHITECTURE.md#4-arc42--solution-strategy) |
| Ubiquitous Language | Dùng EventStorming, Example Mapping để tìm thuật ngữ và kịch bản. | `Attempt`, quiz snapshot, selected choice, submit, grade, entitlement và daily quota đã gắn với lớp, API hoặc bảng. Example Mapping ghi rule/example/question. Có thể dùng ngay khi vấn đáp. [DDD §1, §6](ASSESSMENT_DDD.md) |
| Aggregate và invariants | Aggregate là ranh giới nhất quán. Ví dụ Library thảo luận nhất quán ngay hoặc eventual theo use case. | `Attempt` là consistency boundary khi answer/submit. `PESSIMISTIC_WRITE` đồng bộ các lần sửa và chấm; quota user/ngày có transaction và ranh giới riêng. PostgreSQL ghi grade + outbox cùng transaction, Interaction đồng bộ sau. [DDD §2–4](ASSESSMENT_DDD.md) |
| Domain Events và Integration Events | Ví dụ dùng `DomainEvents` và sự kiện domain rõ kiểu. | `Attempt.grade` đổi trạng thái và trả `boolean`; application tạo `EventOutbox`. `AttemptGraded` là integration event qua RabbitMQ. Không có Domain Event nội bộ riêng trong code. [DDD §4](ASSESSMENT_DDD.md#4-domain-events-và-integration-events) |
| Ports & Adapters | Cô lập nhánh nghiệp vụ Lending khỏi framework/hạ tầng, phần đơn giản dùng CRUD. | Ba persistence port đã tách call site khỏi Spring Data. Annotation JPA trên domain và dependency vào client cụ thể thể hiện mức áp dụng hiện tại. [DDD §5](ASSESSMENT_DDD.md#5-application-services-ports-và-hướng-phụ-thuộc) |
| Architecture Tests | Có ArchUnit để khóa hướng dependency và tách framework khỏi model. | Unit tests TOEIC kiểm luật và orchestration, chưa kiểm ranh giới kiến trúc. Chỉ cân nhắc rule nhỏ sau khi ổn định package. [CI](../.github/workflows/microservices-ci.yml) |

Nguồn so sánh trực tiếp. [Process discovery, architecture và aggregates](https://github.com/ddd-by-examples/library#general-assumptions) · [Events](https://github.com/ddd-by-examples/library#events) · [ArchUnit](https://github.com/ddd-by-examples/library#archunit)

## 4. Những điểm chưa đạt và vấn đề P0/P1/P2

| Mức | Việc cần xử lý | Hệ quả nếu bỏ qua |
|---|---|---|
| **P0** | **K08.** Đối chiếu cấu trúc đã phân tầng với boilerplate chính thức và xác nhận phạm vi áp dụng. | Mã và C4 đã khớp theo K09. Mức phù hợp với bộ mẫu của giảng viên vẫn cần xác nhận. |
| **P1** | K14 và E10. Đưa bộ hình vào bản báo cáo cuối và hoàn tất rehearsal, chụp ảnh trực tiếp nếu dùng. | Biểu đồ và sơ đồ đã có. Stack tại lần rà chưa sẵn sàng cho demo. |
| **P1** | H01 và H04. Xác nhận phạm vi ACL theo rubric và giới hạn của cách cấu hình quota theo gói. | H01 chỉ có bằng chứng cho quyền đã kiểm tra. H04 còn giới hạn hằng hạn mức. |
| **P1** | E04 và E05. Clean build image và runtime tại revision đã xác minh, smoke/quota/concurrent submit cùng SHA. | CI đạt tại `730dd5c`. Runtime và smoke/quota lưu ở `41b192d`. QA-02 thiếu SHA. |
| **P2** | E03 và cải tiến vận hành sau MVP. Có thể hoãn ArchUnit, CQRS/Event Sourcing, thêm broker confirms, DLQ, nhiều publisher, JWKS, CD và migration đầy đủ monolith. | Cần trình bày giới hạn MVP. Các đề không bắt buộc các cải tiến này cho phạm vi đã audit. |

## 5. Kế hoạch hoàn thiện tối thiểu

1. **Chốt K08.** Đối chiếu cả năm service với boilerplate chính thức hoặc lấy xác nhận cấu trúc hiện tại được chấp nhận.
2. **Gắn bằng chứng vào báo cáo nộp.** Dùng [bộ hình và bảng QA](SUBMISSION_EVIDENCE.md) cùng các log có timestamp. Giữ SHA riêng của từng phiên.
3. **Ghim revision và rehearsal.** Dùng [revision 730dd5c](https://github.com/chienvoxn/toeic-learning-platform-microservices/commit/730dd5cca4a9f8690720b4379bda8458e64707e0) và [CI run 45022782408](https://github.com/chienvoxn/toeic-learning-platform-microservices/actions/runs/45022782408) làm bằng chứng CI. Theo [README](../README.md), kiểm tra readiness trước các luồng vai trò, đề, nộp, activity và entitlement. Thu ảnh thật khi stack sẵn sàng.

## 6. Câu hỏi xác nhận với giảng viên

1. Với đề tài TOEIC đã được chấp thuận, dùng QA-01–04 theo ngưỡng nhóm đề xuất có phù hợp không? QA-03 đã được chọn làm runtime view cho kịch bản áp lực.
2. Boilerplate phiên bản nào là chuẩn, áp dụng toàn bộ service hay service cốt lõi, và có chấp nhận tên thư mục tương đương khi dependency đúng không?
3. Giảng viên muốn nhận link commit cố định kèm nhánh hay một tag nộp riêng?
4. Hướng 3 có đòi RBAC theo từng tài nguyên hay kiến trúc ba vai trò, permission thao tác và ownership hiện tại đủ? Có yêu cầu bổ sung nghiệp vụ ngoài scope MVP đã đăng ký không?

## 7. Danh sách bằng chứng

Kiểm tra tài liệu tại HEAD `e755d36` đã parse 14 sơ đồ Mermaid và render 14 SVG có kích thước hợp lệ trong Chrome headless. Kiểm tra tự động này xác nhận sơ đồ tạo được SVG. Bố cục khi hiển thị trên GitHub chưa được kiểm tra trực quan.

| Bằng chứng | Nội dung kiểm chứng | Nguồn |
|---|---|---|
| Đề gốc | KTPM tr. 1–3 và KTHDV tr. 1–3, đọc trực tiếp ngoài repo. | Đề nguồn lưu ngoài repository (`Thi KTPM.pdf` và `Thi KTHDV.pdf`). |
| QA-01, smoke, quota | QA-01 đo tại checkout `aa43453`. Log có timestamp, HTTP, SQL COUNT và PASS. Smoke 10/10 và quota concurrency đạt tại `41b192d`. | [Log QA-01](evidence/qa01-security-rbac-aa43453.txt) · [Log smoke/quota](evidence/e04-e05-41b192d-tests.txt) · [Trạng thái](VALIDATION_STATUS.md) |
| Maven clean verify | Checkout `41b192d`. Identity 3, Content 0, Assessment 12, Membership 1, Interaction 1. Cả năm lệnh thoát mã 0. | [Môi trường và raw output](evidence/e04-e05-41b192d-build.txt) |
| QA-02 | Log không ghi SHA checkout. Attempt `d59d38b4-cd72-4184-bf5a-40d396102609` có 10 submit và đúng một event SQL. | [Log QA-02](evidence/qa02-concurrent-submit.txt) |
| QA-03 A | Checkout `f191b7a`. Interaction dừng, submit 200/94,0 ms, queue ready 0→1 với 0 consumer, activity chưa có trong DB. Sau restart, API/SQL cùng thấy `eventId=56879c2e-4252-491b-a91d-614b8fbaebc9` ở poll 5. | [Log QA-03](evidence/qa03-fault-injection-20261122-134619.txt) |
| QA-03 B | Checkout `f191b7a`. RabbitMQ dừng, submit 200/93,0 ms, 4 poll `published=false`. Sau restart `published=true` và SQL/API thấy `eventId=e3feb4f5-3632-4e5e-a8ca-de10f29bafeb` ở poll 6. A/B đều kết thúc `ready=0`, `unacked=0`, một consumer. Publisher confirms chưa có. | [Log QA-03](evidence/qa03-fault-injection-20261122-134619.txt) |
| QA-04 | Checkout `19aa006`. p50 6,75 ms, p90 18,08 ms, p95 29,18 ms, p99 572,13 ms, 0/5.793 lỗi HTTP và 0/17.379 check lỗi. p95 làm tròn từ 29,1798 ms trong JSON. | [Preflight/môi trường](evidence/qa04-k6-20261122-preflight.txt) · [Console](evidence/qa04-k6-20261122-run.txt) · [JSON](evidence/qa04-k6-20261122-summary.json) |
| Deployment và regression mới | Checkout `41b192d`. Compose build no-cache và `up` thoát mã 0. Lần kiểm tra tiếp theo xác minh startup sau khi khởi động lại container Interaction. Smoke và quota thoát mã 0. Concurrent submit chưa chạy vì RAM thấp. GitHub và CI của baseline `730dd5c` có evidence ở dòng riêng bên dưới. | [Runtime](evidence/e04-e05-41b192d-runtime.txt) · [Tests](evidence/e04-e05-41b192d-tests.txt) · [GitHub](https://github.com/chienvoxn/toeic-learning-platform-microservices) |
| GitHub và CI | Baseline mã `730dd5cca4a9f8690720b4379bda8458e64707e0`. Run push trên `refactor/remaining-layered-services`, hoàn tất 22/11/2026 19:32:34 ICT, 6/6 job success cùng SHA. | [revision 730dd5c](https://github.com/chienvoxn/toeic-learning-platform-microservices/commit/730dd5cca4a9f8690720b4379bda8458e64707e0) · [CI run 45022782408](https://github.com/chienvoxn/toeic-learning-platform-microservices/actions/runs/45022782408) · [Jobs](https://github.com/chienvoxn/toeic-learning-platform-microservices/actions/runs/45022782408/jobs) |
| Bộ hình nộp | Chart k6 từ JSON lưu trữ. Sơ đồ PNG kết xuất từ Mermaid. | [Bộ bằng chứng](SUBMISSION_EVIDENCE.md) |
