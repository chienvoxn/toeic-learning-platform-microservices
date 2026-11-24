---
name: toeic-test-strategy
description: >-
  Áp dụng khi implement feature mới, fix bug, hoặc quyết định scope regression.
  Hướng dẫn chọn loại test phù hợp và tránh chạy thừa test không cần thiết.
---

# Test Strategy — TOEIC Microservices

## Test Pyramid

```
        [E2E / Playwright]      ← tests/*.test.cjs — chỉ khi UI thay đổi
       [Smoke / Python]         ← tests/smoke.py — sau thay đổi cross-service
      [Integration / IT]        ← F02*IT.java, F02InteractionPostgresIT — khi DB/broker thay đổi
     [Application Service]      ← AttemptApplicationServiceTest — khi use case logic thay đổi
    [Domain Unit]               ← AttemptDomainTest, ContentReviewTest — khi domain thay đổi
```

## Chọn test theo thay đổi

| Thay đổi | Test tối thiểu | Test đầy đủ |
|---|---|---|
| Domain logic (Attempt, ContentReview) | `AttemptDomainTest` | + `AttemptApplicationServiceTest` |
| Application Service / quota / outbox | `AttemptApplicationServiceTest` | + smoke.py |
| Outbox publisher / RabbitMQ | `OutboxPublisherTest` | + `F02RabbitPublisherIT`, `F02OutboxRetryIT` |
| Controller / API path | `QuizAuthoringTest` (Content) | + smoke.py |
| Cross-service flow | smoke.py | + concurrent submit + quota |
| UI / frontend | `node --check web/app.js` | + `attempt_frontend.test.cjs` |
| Migration / schema | Verify SQL offline | + full compose restart test |

## Lệnh test theo service

```powershell
# Domain + Application Service (không cần Spring, DB, broker)
cd assessment-service
mvn test -pl . -Dtest="AttemptDomainTest,AttemptApplicationServiceTest" -q

# Content authoring
cd content-service
mvn test -pl . -Dtest="QuizAuthoringTest" -q

# Integration tests (cần Docker)
mvn test -pl assessment-service -Dtest="F02OutboxRetryIT,F02RabbitPublisherIT" -q

# Smoke (cần Compose stack chạy)
$env:GATEWAY_URL = "http://127.0.0.1:8088"
python tests/smoke.py

# Frontend syntax check
node --check web/app.js
```

## QA Scenarios — scope kiểm chứng

| Scenario | Script | Điều kiện chạy |
|---|---|---|
| QA-01 · RBAC | Manual + smoke | Khi thay đổi auth/authz |
| QA-02 · Concurrent submit | `tests/test_concurrent_submit.py` | Khi thay đổi Assessment submit |
| QA-03 · Fault injection | `tests/fault_injection.md` | Khi thay đổi Outbox/RabbitMQ |
| QA-04 · Performance | `tests/load.js` (k6) | Khi thay đổi Content list path |

## Quy tắc

- Chạy focused tests trước; chỉ chạy full smoke khi thay đổi cross-service.
- Không khai báo "test passed" nếu chưa thực sự chạy.
- Ghi SHA, môi trường, lệnh và kết quả khi lưu evidence.
- Dùng tài khoản email riêng cho mỗi lần chạy test có ghi dữ liệu.
