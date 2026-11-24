---
name: testing-workflow
description: >-
  Lựa chọn, thực thi, chẩn đoán lỗi và mở rộng kiểm thử tự động cho hệ thống TOEIC Microservices.
  Hỗ trợ 5 Spring Boot services (Maven), React frontend (Vitest, ESLint, TypeScript), Legacy web (node --check),
  Smoke tests liên dịch vụ qua Nginx Gateway (Python), và các kịch bản kiểm thử đồng thời / chịu tải (QA-01 đến QA-04).
  Áp dụng khi chạy test suite, điều tra nguyên nhân bài test thất bại, hoặc xác minh an toàn hồi quy.
---

# Quy trình Kiểm thử & Xác minh — TOEIC Microservices

Quy trình chuẩn mực để xác định phạm vi, thực thi, phân tích nguyên nhân gốc (RCA) và mở rộng kiểm thử tự động cho toàn bộ hệ thống TOEIC Microservices.

---

## 1. Khi nào sử dụng Skill này
- Người dùng yêu cầu chạy kiểm thử cho một service cụ thể (`identity`, `assessment`, `content`, `membership`, `interaction`) hoặc toàn bộ hệ thống.
- Người dùng gõ lệnh `/testing-workflow` hoặc yêu cầu kiểm tra hồi quy trước khi commit.
- Một bài kiểm thử bị thất bại (`FAIL`), cần chẩn đoán nguyên nhân do logic mã nguồn hay do môi trường (chưa bật Docker/Postgres/RabbitMQ).
- Cần viết bổ sung kiểm thử tự động sau khi hoàn thành tính năng hoặc sửa lỗi.

---

## 2. Nguyên tắc Bắt buộc (Rules & Boundaries)
- **Tính xác thực:** Tuyệt đối không tuyên bố bài test `PASS` nếu lệnh chưa được chạy thực tế trong phiên làm việc hoặc mã thoát khác `0`.
- **Phân định rõ nguyên nhân:** Phân biệt lỗi do môi trường (ví dụ: container PostgreSQL/RabbitMQ chưa sẵn sàng, chưa tạo file `.env`, Gateway 502) với lỗi logic mã nguồn.
- **Bảo mật logs:** Không in token JWT, mật khẩu hoặc secret key trong báo cáo đầu ra kiểm thử.

---

## 3. Ma trận Lệnh Thực thi Kiểm thử theo Thành phần

| Phạm vi | Thư mục làm việc | Lệnh thực thi chuẩn | Mục tiêu kiểm tra |
| :--- | :--- | :--- | :--- |
| **Assessment Unit** | Root repo | `mvn test -pl assessment-service -Dtest="AttemptDomainTest,AttemptApplicationServiceTest" -q` | Kiểm tra nghiệp vụ chấm điểm, snapshot đề, và kiểm tra quota ngày (không cần Docker). |
| **Assessment IT** | Root repo | `mvn test -pl assessment-service -Dtest="F02OutboxRetryIT,F02RabbitPublisherIT" -q` | Kiểm thử tích hợp Transactional Outbox và RabbitMQ publisher (yêu cầu Docker). |
| **Content Service** | Root repo | `mvn test -pl content-service -Dtest="QuizAuthoringTest" -q` | Kiểm tra luồng tạo đề, xuất bản và draft của giáo viên. |
| **Identity Service** | Root repo | `mvn test -pl identity-service -q` | Kiểm tra đăng ký, đăng nhập JWT, và phân quyền RBAC. |
| **Interaction Service**| Root repo | `mvn test -pl interaction-service -q` | Kiểm tra nhận event `AttemptGraded` và lưu trữ review/activity. |
| **Membership Service** | Root repo | `mvn test -pl membership-service -q` | Kiểm tra phân hạng gói FREE/PRO và hạn mức lượt thi. |
| **Modern React Unit** | `frontend/` | `npm run test` (Vitest) | Chạy unit tests cho các component và hooks React. |
| **Modern React Quality**| `frontend/` | `npm run lint && npm run typecheck && npm run build` | Kiểm tra cú pháp ESLint 9, trình biên dịch TypeScript và đóng gói Vite. |
| **Legacy Web Syntax** | Root repo | `node --check web/app.js; node --check web/quiz-authoring.js` | Kiểm tra cú pháp JavaScript tĩnh của giao diện demo. |
| **Cross-service Smoke** | Root repo | `$env:GATEWAY_URL = "http://127.0.0.1:8088"; python tests/smoke.py` | Kiểm thử tích hợp toàn bộ luồng nghiệp vụ Learner/Teacher/Admin qua Nginx Gateway. |
| **Concurrent Submit** | Root repo | `python tests/test_concurrent_submit.py` | Kiểm thử tranh chấp 10 submit đồng thời cùng một attempt. |
| **Quota Concurrency** | Root repo | `python tests/test_quota_concurrency.py` | Kiểm thử hạn mức 10 lượt/ngày của gói FREE khi chạy song song. |

---

## 4. Quy trình Thực thi 4 Bước (Execution Workflow)

### Bước 1: Xác định Cấp độ Kiểm thử Tối thiểu
- Thay đổi logic trong 1 service: Chỉ chạy unit test của service đó (`mvn test -pl <service>`).
- Thay đổi DTO / API / Controller: Chạy unit test của service + cú pháp frontend liên quan.
- Thay đổi cấu hình Gateway hoặc RabbitMQ: Chạy integration test + `python tests/smoke.py`.

### Bước 2: Thực thi và Thu thập Kết quả
- Thực thi lệnh và ghi nhận:
  - Exit code (0 = Thành công).
  - Số lượng bài test: `Tests run`, `Failures`, `Errors`, `Skipped`.
  - Thông báo lỗi chi tiết (stack trace / assertion failure) nếu có.

### Bước 3: Chẩn đoán Lỗi khi Kiểm thử Thất bại (RCA Guide)
1. **Lỗi Kết nối Cơ sở dữ liệu (`PSQLException: Connection refused`)**:
   - Kiểm tra xem 5 container database (`identity-db`, `content-db`, `assessment-db`, `membership-db`, `interaction-db`) đã chạy chưa (`docker compose ps`).
   - Kiểm tra biến môi trường `DB_PASSWORD` trong file `.env`.
2. **Lỗi HTTP 502 Bad Gateway**:
   - Container backend tương ứng bị dừng hoặc chưa khởi động xong (kiểm tra `docker compose logs <service-name>`).
3. **Lỗi HTTP 429 Too Many Requests trong Smoke Test**:
   - Gói FREE đã dùng hết hạn ngạch 10 lượt làm bài trong ngày UTC. Chạy test với tài khoản PRO hoặc đổi ngày/dùng tài khoản mới.
4. **Lỗi RabbitMQ Message Unacknowledged / Missing Activity**:
   - Kiểm tra container `rabbitmq` cổng `15672` (RabbitMQ Management) xem exchange `toeic.events` và queue có binding hợp lệ hay không.
5. **Lỗi TypeScript Compile (`tsc --noEmit`)**:
   - Kiểm tra interface types của DTO trả về từ Gateway trong `frontend/src/`.

### Bước 4: Lập Bảng Ma trận Bằng chứng Kiểm thử (Evidence Matrix)

Báo cáo kết quả kiểm thử bắt buộc sử dụng định dạng bảng:

| ID | Phạm vi / Thành phần | Lệnh Đã Thực Thi | Bằng Chứng / Output | Cấp Độ Xác Minh | Kết Quả |
|:---:|:---|:---|:---|:---:|:---:|
| TC-01 | Assessment Domain & Use Case | `mvn test -pl assessment-service -Dtest="AttemptDomainTest,AttemptApplicationServiceTest"` | `Tests run: 14, Failures: 0, Errors: 0` | `MAVEN UNIT VERIFIED` | **PASS** |
| TC-02 | Content Quiz Authoring | `mvn test -pl content-service -Dtest="QuizAuthoringTest"` | `Tests run: 5, Failures: 0, Errors: 0` | `MAVEN UNIT VERIFIED` | **PASS** |
| TC-03 | React Frontend Quality | `npm run lint && npm run typecheck && npm test` (trong `frontend/`) | `0 errors, 18 tests passed` | `REACT VITEST VERIFIED` | **PASS** |
| TC-04 | Legacy Web Syntax | `node --check web/app.js` | Exit code 0 | `SYNTAX VERIFIED` | **PASS** |
| TC-05 | Gateway Smoke Test | `python tests/smoke.py` | `All smoke scenarios passed` | `SMOKE GATEWAY VERIFIED`| **PASS** |
| TC-06 | Concurrent Submit Guard | `python tests/test_concurrent_submit.py` | `Single grade committed, 1 outbox` | `CONCURRENCY VERIFIED` | **PASS** |
