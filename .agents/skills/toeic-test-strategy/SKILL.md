---
name: toeic-test-strategy
description: >-
  Chiến lược kiểm thử toàn diện cho hệ thống TOEIC Microservices (5 Spring Boot services, React frontend, Legacy web, RabbitMQ outbox, và Gateway).
  Hướng dẫn chọn đúng cấp độ kiểm thử trong Test Pyramid, lệnh chạy test theo service và kịch bản nghiệm thu QA-01 đến QA-04.
---

# Chiến lược Kiểm thử — TOEIC Microservices

## 1. Test Pyramid

```
          [E2E / Playwright]         ← tests/*.test.cjs — khi luồng UI/E2E thay đổi
         [Smoke / Python Integration]← tests/smoke.py — sau thay đổi liên service qua Gateway
        [Integration Tests / Spring] ← *IT.java (F02*IT, Postgres, RabbitMQ) — khi DB/Outbox đổi
       [Application Service Tests]   ← *ApplicationServiceTest — khi logic điều phối/quota đổi
      [Domain Unit Tests / Java]     ← *DomainTest — khi luật nghiệp vụ/aggregate đổi
     [Frontend Tests / Vitest / npm] ← cd frontend && npm test — khi React components/hooks đổi
```

---

## 2. Chọn Cấp độ Kiểm thử theo Thay đổi

| Phạm vi thay đổi | Kiểm thử tối thiểu bắt buộc | Kiểm thử hồi quy đầy đủ |
|---|---|---|
| **Domain Logic** (`Attempt`, `ContentReview`) | `AttemptDomainTest` | + `AttemptApplicationServiceTest` |
| **Use Case / Quota / Outbox** | `AttemptApplicationServiceTest` | + `python tests/smoke.py` |
| **RabbitMQ Publisher / Outbox Worker** | `OutboxPublisherTest` | + `F02RabbitPublisherIT`, `F02OutboxRetryIT` |
| **Content Service** | `QuizAuthoringTest` | + `python tests/smoke.py` |
| **Identity Service (Auth / RBAC)** | `IdentityAuthTest` (nếu có) | + `python tests/smoke.py` (QA-01) |
| **Cross-service Flow** (Gateway, Token, Quota) | `python tests/smoke.py` | + `test_concurrent_submit.py` + `test_quota_concurrency.py` |
| **Modern Frontend (`frontend/`)** | `cd frontend && npm run typecheck && npm test` | + `npm run lint` + `npm run build` |
| **Legacy Web (`web/`)** | `node --check web/app.js` | + `attempt_frontend.test.cjs` |
| **Database Migration (`V{n}__*.sql`)** | Kiểm tra cú pháp SQL offline | + Test chạy trên container PostgreSQL riêng |

---

## 3. Lệnh Chạy Kiểm thử Cụ thể

### Backend Services (Maven)
Chạy tại thư mục gốc repository microservices:

```powershell
# 1. Assessment Service: Domain & Application Service (chạy nhanh, không cần DB/Docker)
mvn test -pl assessment-service -Dtest="AttemptDomainTest,AttemptApplicationServiceTest" -q

# 2. Assessment Service: Outbox & RabbitMQ Integration (yêu cầu Docker)
mvn test -pl assessment-service -Dtest="F02OutboxRetryIT,F02RabbitPublisherIT" -q

# 3. Content Service: Quiz authoring & validation
mvn test -pl content-service -Dtest="QuizAuthoringTest" -q

# 4. Identity Service: IAM & RBAC
mvn test -pl identity-service -q

# 5. Interaction Service: Reviews & Activities
mvn test -pl interaction-service -q

# 6. Membership Service: Entitlements
mvn test -pl membership-service -q
```

### Modern React Frontend (`frontend/`)
```powershell
cd frontend
npm run lint         # Kiểm tra cú pháp và code style ESLint 9
npm run typecheck    # Kiểm tra kiểu TypeScript (tsc --noEmit)
npm run test         # Chạy unit tests với Vitest
npm run build        # Build thử bản production
cd ..
```

### Legacy Web Frontend (`web/`)
```powershell
node --check web/app.js
node --check web/quiz-authoring.js
```

### Smoke Test Liên Dịch vụ qua Gateway (Python)
Yêu cầu Docker Compose stack đang hoạt động (`docker compose ps` báo healthy):
```powershell
$env:GATEWAY_URL = "http://127.0.0.1:8088"
python tests/smoke.py
```

---

## 4. Kịch bản Nghiệm thu Kiến trúc (QA Scenarios)

| Scenario | Mục tiêu kiểm chứng | Công cụ / Script |
|---|---|---|
| **QA-01: RBAC Enforcement** | Đảm bảo tài khoản `LEARNER` không thể tạo quiz (nhận 403 Forbidden). | `python tests/smoke.py` |
| **QA-02: Concurrent Submit** | 10 request nộp bài đồng thời cùng 1 attempt: Đảm bảo chấm điểm 1 lần duy nhất, kết quả nhất quán, chỉ tạo 1 outbox event. | `python tests/test_concurrent_submit.py` |
| **QA-03: Fault Injection** | Khi RabbitMQ hoặc Interaction Service tạm dừng: Assessment vẫn chấm và lưu điểm thành công; outbox retry tự động khi dependency phục hồi. | Xem `tests/fault_injection.md` |
| **QA-04: Performance & Load** | Đo tải qua Gateway: 50 VU trong 60 giây, p95 < 500ms, tỷ lệ lỗi < 1%. | `k6 run tests/load.js` |

---

## 5. Quy tắc Báo cáo Bằng chứng Kiểm thử (Evidence)

- Không bao giờ tuyên bố "đã test thành công" nếu chưa thực sự chạy lệnh và có kết quả output.
- Báo cáo kết quả theo mẫu chuẩn:
  ```
  Phạm vi thay đổi: [tên service / frontend]
  Lệnh kiểm thử đã chạy: [lệnh cụ thể]
  Kết quả: PASS (hoặc FAIL kèm nguyên nhân)
  Rủi ro còn lại / Phần chưa kiểm tra: [ghi rõ nếu chưa có môi trường Docker live]
  ```
