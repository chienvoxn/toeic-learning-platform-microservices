# Final Audit KTPM & KTHDV — TOEIC Learning Platform Microservices

**Cập nhật audit** 22/11/2026 · **Nhánh** `refactor/remaining-layered-services` · **HEAD đã kiểm tra** `e755d36` · **Baseline audit ban đầu** `2fd4ed8`

## 1. Executive Summary

- **KTHDV Hướng 3.** Audit ban đầu xác nhận năm database riêng bằng truy vấn chỉ đọc. ERD theo năm database và sơ đồ RBAC đã được đối chiếu với Flyway và mã Identity. Phạm vi ACL của rubric và hồ sơ demo vẫn cần bổ sung theo ma trận.
- **KTPM.** Nhóm xác nhận giảng viên đã chấp thuận đề tài TOEIC. Assessment được phân tầng tại `a0569d9`, bốn service còn lại tại `aa43453`. Hồ sơ hiện có truy vết ADD, bốn kịch bản QA đủ sáu trường, C4 L1 với Admin và sequence QA-03 hai nhánh sự cố. Còn hai P0 là đối chiếu boilerplate chính thức và xác minh link GitHub của revision nộp.
- **Bảo mật.** QA-01 **PASS** tại checkout `aa43453`. Learner tạo quiz nhận 403, SQL COUNT giữ 2 → 2. Log ghi thêm quyền Learner/Teacher/Admin, quyền sở hữu attempt và FREE/PRO. [Bằng chứng QA-01](evidence/qa01-security-rbac-aa43453.txt)

Đã đọc trực tiếp cả hai đề trong audit ban đầu. Số trang tính từ trang đầu PDF. Bản cập nhật này kiểm tra tĩnh tài liệu, source, Flyway và log trong `docs/evidence/`. HEAD audit `e755d36` là phiên bản được đối chiếu tĩnh. Mỗi kết quả thực nghiệm giữ phạm vi của phiên chạy ghi ở §7. [Thi KTPM.pdf](../../Thi%20KTPM.pdf) · [Thi KTHDV.pdf](../../Thi%20KTHDV.pdf)

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
| K05 · C4 L2, PDF tr. 2 §3 | **PASS** | [Kiến trúc §5](EXAM_ARCHITECTURE.md#5-arc42--building-block-view-c4-level-2) tách Web/Gateway, năm service, năm database, HTTP nội bộ và RabbitMQ. Đối chiếu [Compose](../compose.yaml) và [Gateway](../gateway/nginx.conf). | Giữ sơ đồ trong bản nộp và xác định rõ UI tĩnh được Nginx phục vụ. | P2 |
| K06 · Tối thiểu hai ADR, PDF tr. 3 §3 | **PASS** | [ADR-001–007](ADR_MVP.md), trong đó ADR-002/003/004 mô tả lựa chọn JWT, outbox/RabbitMQ và database riêng cùng phương án hoặc đánh đổi. | Gắn ADR vào bảng truy vết ADD khi hoàn thiện K02. | P2 |
| K07 · GitHub Repository chứa mã nộp, PDF tr. 3 §3 cuối kỳ | **PARTIAL** | [GitHub repository](https://github.com/chienvoxn/toeic-learning-platform-microservices) truy cập được ở lần kiểm tra trước. Lần đó API trả 422 với SHA `aa43453` và không tìm thấy nhánh `refactor/remaining-layered-services`. HEAD audit hiện là `e755d36`. | Chốt revision nộp, đồng bộ theo quy trình của nhóm và kiểm tra permalink bằng quyền người chấm. | P0 |
| K08 · Phân tầng dựa trên boilerplate `entrypoints/core/data`, PDF tr. 3 §3 cuối kỳ | **PARTIAL** | Cả năm service có `entrypoints`, `core`, `data` và `adapters` dưới `com.toeic.<service>`. Assessment đổi tại `a0569d9`, Identity, Content, Membership và Interaction đổi tại `aa43453`. [Assessment DDD §5](ASSESSMENT_DDD.md#5-application-services-ports-và-hướng-phụ-thuộc) · [Ánh xạ bốn service](EXAM_ARCHITECTURE.md#c4-component-to-package-mapping-for-identity-content-membership-and-interaction) | Chưa có boilerplate chính thức để đối chiếu. Xác nhận phiên bản mẫu, phạm vi áp dụng và cấu trúc hiện tại có được chấp nhận. | P0 |
| K09 · Thư mục ánh xạ chính xác thiết kế tĩnh, PDF tr. 3 §3 cuối kỳ | **PASS** | Đã đối chiếu bảng component → package → class với thư mục nguồn của năm service. Bootstrap Spring Boot vẫn ở package gốc từng service. [Ánh xạ Assessment](ASSESSMENT_DDD.md#ánh-xạ-c4-component--java-package--class--responsibility) · [Ánh xạ bốn service](EXAM_ARCHITECTURE.md#c4-component-to-package-mapping-for-identity-content-membership-and-interaction) | Giữ ánh xạ đồng bộ nếu boilerplate chính thức yêu cầu điều chỉnh ở K08. | P2 |
| K10 · Compose một lệnh, PDF tr. 3 §3 cuối kỳ | **PASS** | [Compose](../compose.yaml) khai báo build, DB, broker và Gateway. Config hợp lệ. Sau chuẩn hóa, bốn service đã được build/tạo lại với `up -d --build --no-deps` và đủ 12 container thường đang chạy. | Phạm vi đạt là triển khai trên stack hiện có. Lệnh toàn project chỉ qua dry-run. Xác minh clean rebuild thuộc E04. | P2 |
| K11 · C4 L3 cho dịch vụ cốt lõi, PDF tr. 3 §3 cuối kỳ | **PASS** | [C4 L3](EXAM_ARCHITECTURE.md#c4-level-3--assessment-components) phản ánh `AttemptController → AttemptApplicationService → domain/ports`, JPA adapters, `QuizClient`, quota JDBC và publisher dùng `OutboxRepo` trực tiếp. | Giữ hướng phụ thuộc khi áp dụng K08. | P2 |
| K12 · Runtime sequence cho kịch bản áp lực nhất, PDF tr. 3 §3 cuối kỳ | **PASS** | [Sequence QA-03](EXAM_ARCHITECTURE.md#qa-03-availability-and-recovery) mô tả transaction grade + outbox, Interaction ngừng, broker ngừng, retry và activity sau phục hồi. [Log QA-03](evidence/qa03-fault-injection-20261122-134619.txt) đối chiếu hai nhánh qua SQL, queue và HTTP. | Bằng chứng runtime thuộc lần thử trước refactor. Giới hạn publisher confirms vẫn được ghi trong sequence. | P2 |
| K13 · Deployment view, PDF tr. 3 §3 cuối kỳ | **PASS** | [Kiến trúc §7](EXAM_ARCHITECTURE.md#7-arc42--deployment-view-docker-compose), [Compose](../compose.yaml) và runtime PS nhất quán về node local, Docker network, cổng app nội bộ và hai cổng host. | Giữ ghi chú RabbitMQ UI dùng cổng loopback quản trị riêng. | P2 |
| K14 · Báo cáo thực nghiệm và hình chụp/số đo so cam kết, PDF tr. 3 §3 cuối kỳ | **PARTIAL** | [Bảng số liệu](REPORT_TEMPLATE.md#experiment-results-fill-after-actual-tests), [log QA-01](evidence/qa01-security-rbac-aa43453.txt) và log gốc QA-02/03/04 đối chiếu được các tiêu chí. | Còn thiếu tập ảnh/biểu đồ thực nghiệm trong bản nộp. | P1 |
| K15 · Tên file Compose theo đề, PDF tr. 3 §3 cuối kỳ | **NEED CONFIRMATION** | [Đề KTPM](../../Thi%20KTPM.pdf) nêu `docker-compose.yml`. [File hiện tại](../compose.yaml) được Compose nhận và đã chạy hệ thống. | Xác nhận bộ chấm có yêu cầu đúng tên file. | P1 |

### 2.3. KTHDV Hướng 3

| ID và yêu cầu | Kết quả | Vị trí và bằng chứng | Phần thiếu và hành động | Ưu tiên |
|---|---|---|---|---|
| H01 · IAM cấp JWT và RBAC đa cấp, PDF tr. 2 | **PARTIAL** | [Identity](../identity-service/src/main/java/com/toeic/identity) và [Flyway V3](../identity-service/src/main/resources/db/migration/V3__rbac.sql) triển khai role/permission và JWT. [Log QA-01](evidence/qa01-security-rbac-aa43453.txt) ghi quyền Learner/Teacher/Admin, Admin cấp Teacher rồi Teacher đăng nhập lại, quyền tạo quiz và việc Learner/Teacher bị từ chối cấp role. | Kiểm thử quyền theo API đã đạt. Cần xác nhận rubric có yêu cầu ACL theo từng tài nguyên. Sơ đồ phân quyền tiếp tục theo dõi ở H06. | P1 |
| H02 · Core Domain quản lý tài nguyên, PDF tr. 2 | **PASS** | [Content](../content-service/src/main/java/com/toeic/content) có `QuizController` list/detail/create và `ResourceController` create/private-by-owner. [Flyway Content](../content-service/src/main/resources/db/migration) cung cấp bảng và seed. [QA-04 preflight](evidence/qa04-k6-20261122-preflight.txt) xác nhận HTTP 200 và hai quiz. [QA-02](evidence/qa02-concurrent-submit.txt) chứng minh quiz đi vào luồng Assessment. | Đưa tạo quiz thành bước minh họa quyền ở H01. H02 đánh giá phạm vi tài nguyên MVP. | P2 |
| H03 · Interaction, PDF tr. 2 | **PASS** | `InteractionController`, `ActivityConsumer` trong [Interaction](../interaction-service/src/main/java/com/toeic/interaction), hai [migration](../interaction-service/src/main/resources/db/migration). `interaction:write`, upsert theo người dùng và nội dung, activity theo chủ sở hữu. [QA-03](evidence/qa03-fault-injection-20261122-134619.txt) chứng minh dự án tạo activity phụ thuộc từ bài nộp. | Log chấm bài/ghi activity đã đủ cho nhánh tương tác này. Bổ sung ảnh review hoặc log smoke nếu trình bày thêm nhánh review. | P2 |
| H04 · Membership và quyền lợi mở rộng, PDF tr. 2 | **PARTIAL** | [Membership controller](../membership-service/src/main/java/com/toeic/membership/entrypoints/MembershipController.java) và [Flyway](../membership-service/src/main/resources/db/migration/V1__memberships.sql) có FREE/PRO. [Log QA-01](evidence/qa01-security-rbac-aa43453.txt) ghi demo flag bật, FREE nhận 403 và không tạo attempt, PRO nhận 200 và tạo đúng một attempt cùng quiz. Quota concurrency sau refactor đạt. | Còn lưu raw output quota concurrency. Hạn mức hiện là hằng theo gói ở controller, không đọc từ cột plan. | P1 |
| H05 · ERD tách database, tham chiếu user qua ID, PDF tr. 2 | **PASS** | [ERD năm DB](REPORT_TEMPLATE.md#erd-ownership-five-databases) tách năm ranh giới và khớp các FK nội database trong Flyway. Bảng tham chiếu logic giải thích cách `Interaction.user_id` và các UUID liên quan trỏ về IAM hoặc service sở hữu. | Sơ đồ chọn các cột cần cho ownership và quan hệ khóa. | P2 |
| H06 · Class Diagram cấu trúc phân quyền, PDF tr. 2 | **PASS** | [RBAC Class Diagram](REPORT_TEMPLATE.md#class-diagram-for-rbac) vẽ User–Role và Role–Permission qua hai bảng nối có bội số, đúng theo [Flyway V3](../identity-service/src/main/resources/db/migration/V3__rbac.sql). Sơ đồ phân biệt SQL, `RbacService.Access` và verified `Actor`. | H01 tiếp tục theo dõi phạm vi ACL mà rubric yêu cầu. | P2 |
| H07 · Gateway trước toàn hệ thống, PDF tr. 3 | **PASS** | [nginx.conf](../gateway/nginx.conf) định tuyến năm API prefix và chặn hai đường internal. Runtime PS chỉ công bố Gateway và RabbitMQ management trên loopback. [QA-04](evidence/qa04-k6-20261122-run.txt) truy cập qua cổng 8088. | Giữ cổng admin tách riêng và ghi trong slide/demo. | P2 |
| H08 · Ít nhất bốn core service chạy độc lập, PDF tr. 3 | **PASS** | Năm ứng dụng Spring Boot với Dockerfile/POM riêng trong [Compose](../compose.yaml). Audit runtime ghi đủ năm service và năm DB. Assessment gọi HTTP nội bộ và RabbitMQ thay cho truy cập DB khác. | Lưu ảnh `docker compose ps` vào hồ sơ nộp nếu giảng viên cần hình minh họa. | P2 |
| H09 · Cùng một nền tảng Compose cho demo, PDF tr. 3 | **PASS** | [Compose](../compose.yaml), [README §2–4](../README.md#2-start-the-whole-system), [QA-03 đầu/cuối](evidence/qa03-fault-injection-20261122-134619.txt) và audit runtime xác nhận 12 service, 5 DB và RabbitMQ. | Duy trì cùng tên project và port loopback khi demo. | P2 |

### 2.4. Kiểm tra chất lượng triển khai và bằng chứng

| ID | Kết quả | Vị trí và bằng chứng | Phần thiếu và hành động | Ưu tiên |
|---|---|---|---|---|
| E01 · DDD và aggregate Assessment | **PASS** | [DDD §1–4](ASSESSMENT_DDD.md), `Attempt`, `AttemptQuestion`, `AttemptApplicationService` trong [source Assessment](../assessment-service/src/main/java/com/toeic/assessment) và [log QA-02](evidence/qa02-concurrent-submit.txt). Root giữ hai trạng thái, quyền sửa theo trạng thái, xác nhận câu thuộc lượt và chấm lại idempotent. | Phạm vi bằng chứng là luồng use case hiện tại. Đưa danh sách câu qua app vẫn là điều kiện để chấm đủ. | P2 |
| E02 · Ports & adapters và hướng phụ thuộc | **PASS** | [DDD §5](ASSESSMENT_DDD.md#5-application-services-ports-và-hướng-phụ-thuộc), [ADR-007](ADR_MVP.md#adr-007--persistence-ports-for-assessment-use-cases), ba port và ba JPA adapter. Use case tham chiếu port lưu trữ và domain. | Phạm vi đạt là persistence ports. App còn gọi `IdentityClient`, `QuizClient`, `DailyAttemptQuota` cụ thể; domain entity còn annotation JPA và field package-private. Chỉ xử lý sâu nếu K08 đòi hỏi. | P2 |
| E03 · Architecture tests | **MISSING** | [POM Assessment](../assessment-service/pom.xml), [test Assessment](../assessment-service/src/test/java/com/toeic/assessment) và [CI](../.github/workflows/microservices-ci.yml) có unit test hành vi. Chưa có rule tự động về hướng dependency hoặc package. | Sau khi chốt boilerplate, có thể thêm một rule dependency tối thiểu. Đề gốc không yêu cầu ArchUnit. | P2 |
| E04 · CI/CD và clean build theo revision nộp | **PARTIAL** | [Workflow](../.github/workflows/microservices-ci.yml) chạy `mvn -B clean verify` theo matrix năm service, kiểm JS và Compose config. Lịch sử chuẩn hóa ghi build/startup bốn service trên stack có sẵn và dry-run cho lệnh `up -d --build` toàn project. Lần kiểm tra GitHub trước trả danh sách rỗng cho commit status và workflow theo PR tại `aa43453`. | Chưa xác minh clean rebuild và startup toàn project theo revision nộp, cũng chưa có CI run xanh gắn revision đó. Lưu CI URL và output build/startup toàn project. CD nằm ngoài yêu cầu hai đề. | P1 |
| E05 · Unit tests, smoke và quota | **PARTIAL** | [Validation status](VALIDATION_STATUS.md) ghi lịch sử kiểm tra trước đó. Source có unit test cho Assessment, Identity, Membership và Interaction. Content chưa có unit test. [Smoke](../tests/smoke.py) · [Quota](../tests/test_quota_concurrency.py) | Lưu raw output Maven, smoke, quota và concurrent submit sau chuẩn hóa vào hồ sơ nộp, kèm SHA và demo flag. Log QA-02 đã lưu ở E07 thuộc lần chạy trước refactor. | P1 |
| E06 · QA-01 Security | **PASS** | [QA-01](EXAM_ARCHITECTURE.md#quality-attribute-scenarios) yêu cầu 403 và COUNT không đổi. [Log phiên chạy `aa43453`](evidence/qa01-security-rbac-aa43453.txt) ghi Learner 403, `toeic_quizzes` 2 → 2 và quiz theo mã lần chạy 0 → 0. Owner đọc attempt nhận 200, Learner và Admin không sở hữu nhận 404. | Phạm vi kiểm thử là các quyền trên stack demo. Fixture Admin được bootstrap riêng và đăng nhập bị vô hiệu hóa sau kiểm thử, xác nhận bằng HTTP 401. | P2 |
| E07 · QA-02 Concurrent Submit | **PASS** | [Log QA-02](evidence/qa02-concurrent-submit.txt) ghi 10/10 HTTP 200, body grade giống nhau, `GRADED` 0/3, `snapshotCorrect=0`, `outboxCount=1`, 65,9–298,2 ms. [Script](../tests/test_concurrent_submit.py) lọc `aggregate_id` và `event_type='AttemptGraded'`. | Log ghi thời điểm và attempt ID nhưng thiếu SHA của image. Dùng bằng chứng cho lần chạy này. | P2 |
| E08 · QA-03 Availability | **PASS** | [Log QA-03](evidence/qa03-fault-injection-20261122-134619.txt) ghi HTTP 200 khi A/B bị dừng, điểm đã lưu, đối chiếu queue, SQL và API sau khi khôi phục. Kết thúc 12 service chạy. | Giới hạn là hai tình huống trên stack đơn; lưu link log để minh họa. | P2 |
| E09 · QA-04 Performance | **PASS** | [Preflight](evidence/qa04-k6-20261122-preflight.txt), [console](evidence/qa04-k6-20261122-run.txt), [summary](evidence/qa04-k6-20261122-summary.json). 50 VUs/60 s, 5.793 request, 95,76 req/s, p95 29,18 ms, 0 HTTP lỗi, 0/17.379 check lỗi. | Chỉ đo list quiz qua loopback với hai quiz và think time 500 ms. p99 572,13 ms, ngoài tiêu chí p95. Ghi giới hạn cạnh bảng kết quả. | P2 |
| E10 · README và demo | **PARTIAL** | [README §2–7](../README.md#2-start-the-whole-system), [PowerShell demo](../scripts/run-demo.ps1) và [web/app.js](../web/app.js) mô tả khởi động và các luồng demo. [Kiến trúc §6](EXAM_ARCHITECTURE.md#qa-03-availability-and-recovery) đã dẫn log phục hồi, còn README vẫn dẫn thư mục `microservices` và trạng thái xác minh cũ. | Cập nhật hướng dẫn nộp từ root, kiểm tra sẵn sàng qua HTTP, dẫn log QA và ghi giới hạn clean rebuild. Hoàn thiện ảnh luồng demo và cách chuẩn bị tài khoản. | P1 |
| E11 · Phạm vi migration từ monolith | **PASS** | [ORIGINAL_REPO_MAPPING](ORIGINAL_REPO_MAPPING.md) và [README §7–8](../README.md#7-explicit-boundaries-and-remaining-work) giới hạn vertical slice, giữ account/quiz/attempt/interaction/membership, chỉ rõ SRS, RAG, mobile và đối soát lịch sử nằm ngoài MVP. | Giữ mô tả trong báo cáo. Hỏi giảng viên nếu đã cam kết thêm parity trong đề cương riêng. | P2 |

## 3. Những điểm đã đạt

### 3.1. Deployment và data ownership

`docker compose ps -a` và Compose labels tại `aa43453` xác nhận 12 container chạy, 12 service riêng, không có one-off. Trong lần chuẩn hóa, bốn service được build và tạo lại; Assessment, Gateway, năm PostgreSQL và RabbitMQ giữ ID, thời điểm khởi động và mount. Network và sáu volumes được giữ. Log ghi `Started` cho năm ứng dụng và Gateway trả HTTP 200. Gateway dùng `127.0.0.1:8088`, RabbitMQ management dùng `127.0.0.1:15672`. [Compose, services và volumes](../compose.yaml) · [Gateway routes](../gateway/nginx.conf)

Truy vấn `SELECT current_database(), to_regclass('public.<own_table>'), to_regclass('public.<other_table>') IS NULL` chạy trong transaction `READ ONLY` trên từng container DB. Kết quả xác nhận database ownership tại runtime ở phạm vi một bảng mẫu và một bảng đối chứng mỗi DB. Mỗi DB dùng user `toeic` với thông tin xác thực dùng chung của demo. [Compose, PostgreSQL và JDBC URLs](../compose.yaml)

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
| **P0** | **K07.** Chốt link GitHub mà giảng viên mở được tại revision nộp. | Repository công khai có thể mở nhầm `main` và thiếu các file audit/evidence mới. |
| **P1** | K14. Tập hợp ảnh hoặc biểu đồ thực nghiệm từ các log đã lưu. | Phần thực nghiệm còn thiếu hình đối chiếu trong bản nộp. |
| **P1** | H01, H04, E05. Xác nhận phạm vi ACL theo rubric và lưu raw output quota/smoke sau refactor. | Hồ sơ Hướng 3 còn thiếu xác nhận phạm vi quyền và bằng chứng quota/smoke đầy đủ. |
| **P1** | K15, E04, E10. Xác nhận tên file Compose, gắn clean build/CI với SHA nộp, cập nhật README và hình demo. | Khó tái lập runtime và dễ trình bày sai trạng thái hiện tại. |
| **P2** | E03 và cải tiến vận hành sau MVP. Có thể hoãn ArchUnit, CQRS/Event Sourcing, thêm broker confirms, DLQ, nhiều publisher, JWKS, CD và migration đầy đủ monolith. | Cần trình bày giới hạn MVP. Các đề không bắt buộc các cải tiến này cho phạm vi đã audit. |

## 5. Kế hoạch hoàn thiện tối thiểu

1. **Chốt P0.** Đối chiếu sơ đồ và cấu trúc của cả năm service với boilerplate chính thức hoặc lấy xác nhận cấu trúc hiện tại được chấp nhận. Chốt nhánh/tag nộp và thử mở permalink bằng quyền người chấm.
2. **Dùng log QA-01 khi demo RBAC.** Đưa ba vai trò, HTTP 403 và COUNT trước/sau, quyền sở hữu attempt và `FREE → PRO` vào phần thực nghiệm. Bổ sung ảnh review/activity và raw output smoke/quota nếu cần cho bản nộp.
3. **Hoàn chỉnh gói báo cáo nộp.** Dùng bảng ADD, sáu trường QAS, sequence QA-03, ERD và sơ đồ RBAC đã kiểm tra. Đính kèm hình thực nghiệm từ các log và đồng bộ hướng dẫn README.
4. **Ghim bản nộp và luyện demo.** Lưu CI, output clean rebuild toàn project và log khởi động theo SHA nộp. Lưu kết quả kiểm thử sau refactor, giữ mốc chạy gốc của QA-02/03/04 và tập luồng vai trò → quiz → nộp → activity → entitlement.

## 6. Câu hỏi xác nhận với giảng viên

1. Với đề tài TOEIC đã được chấp thuận, dùng QA-01–04 theo ngưỡng nhóm đề xuất có phù hợp không? QA-03 đã được chọn làm runtime view cho kịch bản áp lực.
2. Boilerplate phiên bản nào là chuẩn, áp dụng toàn bộ service hay service cốt lõi, và có chấp nhận tên thư mục tương đương khi dependency đúng không?
3. Có kiểm tra đúng tên `docker-compose.yml` hay chấp nhận `compose.yaml` chạy bằng một lệnh? Nộp link nhánh riêng hay tag/commit cố định?
4. Hướng 3 có đòi RBAC theo từng tài nguyên hay kiến trúc ba vai trò, permission thao tác và ownership hiện tại đủ? Có yêu cầu bổ sung nghiệp vụ ngoài scope MVP đã đăng ký không?

## 7. Danh sách bằng chứng

Kiểm tra tài liệu tại HEAD `e755d36` đã parse 14 sơ đồ Mermaid và render 14 SVG có kích thước hợp lệ trong Chrome headless. Kiểm tra tự động này xác nhận sơ đồ tạo được SVG. Bố cục khi hiển thị trên GitHub chưa được kiểm tra trực quan.

| Bằng chứng | Nội dung kiểm chứng | Nguồn |
|---|---|---|
| Đề gốc | KTPM tr. 1–3 và KTHDV tr. 1–3, đọc trực tiếp ngoài repo. | [Thi KTPM.pdf](../../Thi%20KTPM.pdf) · [Thi KTHDV.pdf](../../Thi%20KTHDV.pdf) |
| QA-01, smoke, quota | QA-01 đo tại checkout `aa43453`. Log có timestamp, HTTP, SQL COUNT và PASS. Smoke và quota còn thiếu raw output riêng trong `docs/evidence/`. | [Log QA-01](evidence/qa01-security-rbac-aa43453.txt) · [Smoke](../tests/smoke.py) · [Quota](../tests/test_quota_concurrency.py) · [Trạng thái](VALIDATION_STATUS.md) |
| Unit và package | Báo cáo Maven/Surefire lịch sử được ghi trong hồ sơ xác minh. Chưa lưu raw output trong `docs/evidence/`. Content không có unit test. | [Trạng thái](VALIDATION_STATUS.md) · [CI](../.github/workflows/microservices-ci.yml) |
| QA-02 | Log không ghi SHA checkout. Attempt `d59d38b4-cd72-4184-bf5a-40d396102609` có 10 submit và đúng một event SQL. | [Log QA-02](evidence/qa02-concurrent-submit.txt) |
| QA-03 A | Checkout `f191b7a`. Interaction dừng, submit 200/94,0 ms, queue ready 0→1 với 0 consumer, activity chưa có trong DB. Sau restart, API/SQL cùng thấy `eventId=56879c2e-4252-491b-a91d-614b8fbaebc9` ở poll 5. | [Log QA-03](evidence/qa03-fault-injection-20261122-134619.txt) |
| QA-03 B | Checkout `f191b7a`. RabbitMQ dừng, submit 200/93,0 ms, 4 poll `published=false`. Sau restart `published=true` và SQL/API thấy `eventId=e3feb4f5-3632-4e5e-a8ca-de10f29bafeb` ở poll 6. A/B đều kết thúc `ready=0`, `unacked=0`, một consumer. Publisher confirms chưa có. | [Log QA-03](evidence/qa03-fault-injection-20261122-134619.txt) |
| QA-04 | Checkout `19aa006`. p50 6,75 ms, p90 18,08 ms, p95 29,18 ms, p99 572,13 ms, 0/5.793 lỗi HTTP và 0/17.379 check lỗi. p95 làm tròn từ 29,1798 ms trong JSON. | [Preflight/môi trường](evidence/qa04-k6-20261122-preflight.txt) · [Console](evidence/qa04-k6-20261122-run.txt) · [JSON](evidence/qa04-k6-20261122-summary.json) |
| Deployment và nguồn nộp | Deployment sau refactor được ghi trong audit trước. Lệnh build toàn project mới qua dry-run. HEAD `e755d36` là revision đối chiếu tài liệu. Permalink nộp chưa xác minh. | [Compose](../compose.yaml) · [GitHub](https://github.com/chienvoxn/toeic-learning-platform-microservices) |
