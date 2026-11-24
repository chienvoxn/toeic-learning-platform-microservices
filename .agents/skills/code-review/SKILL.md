---
name: code-review
description: >-
  Rà soát, đánh giá và audit chất lượng mã nguồn hoặc git diff trong TOEIC Microservices.
  Kiểm tra vi phạm kiến trúc Hexagonal/Clean Architecture, ranh giới 5 database cô lập,
  inter-service security (X-Service-Key), Transactional Outbox / RabbitMQ, React TypeScript frontend,
  và độ bao phủ kiểm thử tự động. Áp dụng khi người dùng yêu cầu review code, audit PR, hoặc kiểm định chất lượng.
---

# Quy trình Code Review — TOEIC Microservices

Quy trình rà soát và đánh giá chất lượng mã nguồn ở chế độ **chỉ đọc (Read-Only Audit)** dành cho hệ thống TOEIC Microservices (gồm 5 Spring Boot services, Nginx Gateway, RabbitMQ broker, React 18 TypeScript frontend, và Legacy web tĩnh).

---

## 1. Khi nào sử dụng Skill này
- Người dùng yêu cầu review code, kiểm tra tính đúng đắn của một PR, commit, hoặc một service cụ thể.
- Người dùng gõ lệnh `/code-review`.
- Kiểm tra tính tuân thủ với tài liệu kiến trúc microservices (`docs/EXAM_ARCHITECTURE.md`, `docs/ADR_MVP.md`, `docs/FINAL_AUDIT_KTPM_KTHDV.md`) và quy tắc an toàn trong `AGENTS.md`.

---

## 2. Ranh giới Thực thi (Boundaries)
- **Chế độ Read-Only:** Tuyệt đối không tự ý sửa file mã nguồn, không chạy lệnh Git gây thay đổi trạng thái (`git checkout`, `git reset`, `git commit`), trừ khi người dùng yêu cầu sửa lỗi sau khi xem báo cáo.
- **Dẫn chứng minh bạch:** Mọi phát hiện lỗi đều phải có đường dẫn file và số dòng cụ thể.
- **Bảo vệ dữ liệu:** Tuyệt đối cấm chạy lệnh `docker compose down -v` hoặc can thiệp phá hủy dữ liệu demo.

---

## 3. Quy trình Thực thi (Review Workflow)

### Bước 1: Xác định Phạm vi Mã nguồn cần Review
- Dùng `git status --short` và `git diff` để xác định chính xác danh sách file vừa thay đổi.
- Phân loại file theo từng service: `identity-service`, `content-service`, `assessment-service`, `membership-service`, `interaction-service`, `gateway`, `frontend/`, hoặc `web/`.

### Bước 2: Kiểm tra theo Checklist Kiến trúc Microservices

#### A. Backend Services (`com.toeic.<service>/*`)
1. **Phân tầng Hexagonal & Ranh giới Tầng:**
   - Cấu trúc package có tuân thủ đúng `entrypoints / core / data / adapters` không?
   - Controller (`entrypoints`): Có chứa business logic không? Có inject trực tiếp JPA Repository không? (Bắt buộc phải ủy quyền sang Application Service trong `core`).
   - Domain & Application Service (`core`): Có bị rò rỉ phụ thuộc Spring MVC hoặc JPA annotations ngoài aggregate root không?
   - Tầng `core` có giao tiếp với thế giới bên ngoài thông qua Port interfaces không?
2. **Nguyên tắc Cô lập Cơ sở dữ liệu (Database per Service):**
   - **Tuyệt đối cấm:** Có câu lệnh SQL nào JOIN bảng hoặc query cross-database giữa 5 DBs (`identity_db`, `content_db`, `assessment_db`, `membership_db`, `interaction_db`) không?
   - Mọi liên kết giữa các dịch vụ có duy trì dưới dạng **UUID nguyên thủy** (ví dụ: `userId`, `quizId`, `attemptId`) không?
   - Có file Flyway migration cũ nào (`src/main/resources/db/migration/`) bị sửa đổi không? (Migration mới phải là append-only `V{n}__*.sql`).
3. **Quản lý Giao dịch & Transactional Outbox:**
   - Các phương thức ghi dữ liệu tại Application Service có `@Transactional` không?
   - Tại `assessment-service`: Việc lưu điểm bài thi (`grade`) và ghi nhận sự kiện Outbox (`AttemptGraded`) có nằm trong **cùng một transaction** không?
   - Consumer tại `interaction-service`: Có kiểm tra khử trùng lặp (`deduplication`) theo `eventId` để đảm bảo tính lũy kế (idempotency) không?
   - Khi cập nhật đáp án và nộp bài thi đồng thời: Có sử dụng khóa ghi (`lockOwn`) để chống race condition không?
4. **Bảo mật & Hợp đồng API:**
   - Các endpoint nội bộ (như `/internal/*` trong `content-service` hay `membership-service`) có kiểm tra header bí mật `X-Service-Key` không?
   - Các endpoint công khai có kiểm tra quyền sở hữu ID (`ownership`) và trả về `404 Not Found` (thay vì `403`) để tránh rò rỉ sự tồn tại của tài nguyên không?
   - Có chuỗi mật khẩu, JWT token, hoặc API key bị hardcode trong mã nguồn hoặc log console không? (DTOs nhạy cảm phải redact trong `toString()`).

#### B. Modern React Frontend (`frontend/`)
1. **Kiến trúc & Quản lý State:**
   - Server state có sử dụng TanStack Query (`useQuery`, `useMutation`) và invalidate cache sau khi mutate không?
   - Form validation có sử dụng `react-hook-form` kết hợp `zod` schema resolver không?
2. **Giao tiếp Gateway:**
   - Endpoint gọi API có đi qua Gateway (`/ms/v1/...` hoặc `/api/v1/...`) không? (Tuyệt đối cấm gọi thẳng port backend 8084, 8085, 8086...).
   - Có xử lý đầy đủ 4 trạng thái UI không: `loading`, `error` (401/403/429), `empty`, `success`?
   - Cấm dùng mock data để giả lập kết quả nghiệp vụ thành công.

#### C. Legacy Web Frontend (`web/`)
1. **Bảo mật XSS:**
   - Dữ liệu người dùng hoặc API trả về có được escape qua `textContent` hoặc hàm `html()` không? (Cấm gán `innerHTML` trực tiếp dữ liệu chưa kiểm duyệt).
2. **Giao tiếp API:**
   - Có gọi qua hàm wrapper `api(path, options)` để đính kèm Bearer token và đi qua Nginx Gateway không?

---

## 4. Xuất Báo cáo Code Review Chuẩn

Trình bày kết quả đánh giá bằng tiếng Việt theo định dạng chuẩn:

```markdown
### 1. Phạm vi Rà soát
- Danh sách các file / services đã kiểm tra: [ví dụ: assessment-service, frontend/src/features/attempts]

### 2. Bảng Phát hiện (Findings)
| Mức độ | Vị trí (File & Dòng) | Vấn đề phát hiện | Đề xuất khắc phục |
|:---:|:---|:---|:---|
| **[CRITICAL]** | `file:line` | Sửa migration cũ / Cross-DB JOIN / Rò rỉ secret | Hoàn nguyên và tạo V{n+1} / chuyển sang UUID |
| **[HIGH]** | `file:line` | Outbox tách khỏi transaction / Thiếu khóa ghi đồng thời | Gom chung `@Transactional` / Thêm `lockOwn` |
| **[MEDIUM]** | `file:line` | Controller chứa business logic / Frontend hardcode port | Delegate sang ApplicationService / Gọi qua Gateway |
| **[LOW]** | `file:line` | Thiếu validation record / Logging thừa | Bổ sung `@NotNull` / Dọn dẹp log |

### 3. Đánh giá Độ phủ Kiểm thử (Test Coverage)
- Đã có unit test bao phủ use case / domain mới chưa?
- Lệnh kiểm thử đã chạy thực tế và kết quả cụ thể.

### 4. Kết luận & Khuyến nghị
- Đạt điều kiện commit / merge hay cần chỉnh sửa trước.
```
