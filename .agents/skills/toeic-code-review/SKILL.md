---
name: toeic-code-review
description: >-
  Áp dụng khi review code trước khi kết thúc một task hoặc khi được yêu cầu review
  thay đổi của người khác. Tập trung vào correctness, security, và architecture compliance.
---

# Code Review — TOEIC Microservices

> **Superpowers principle:** Review với mắt của người maintain, không phải người viết.

## Checklist Review Backend

### Architecture & Layering
- [ ] Controller không chứa business logic (delegate sang Application Service)
- [ ] Core không import Spring MVC, không import JPA annotations ngoài aggregate root
- [ ] Port interfaces ở `core/`; implementations ở `data/` hoặc `adapters/`
- [ ] Không có cross-service DB query (chỉ UUID reference, không JOIN qua service)

### Correctness
- [ ] Transaction boundary bao đúng những operation cần atomic
- [ ] Outbox tạo cùng transaction với grade (không tách thành 2 commit)
- [ ] Idempotent submit: grade chỉ 1 lần, lần sau return cached result
- [ ] Ownership check trả 404 (không 403) để không leak existence

### Security
- [ ] Không có secret trong code, log, hay response body
- [ ] Permission check trước khi query DB (fail fast)
- [ ] Input validation tại Controller (Jakarta Validation)
- [ ] Internal endpoints kiểm tra `X-Service-Key`

### Testing
- [ ] Thay đổi domain có unit test trong `AttemptDomainTest` tương ứng
- [ ] Thay đổi use case có test trong `AttemptApplicationServiceTest` tương ứng
- [ ] Test không phụ thuộc vào order hay shared state
- [ ] Không mock những thứ đang được test (mock chỉ external dependencies)

### Code Quality
- [ ] Không có dead code, commented-out code, `TODO` không có issue
- [ ] Không có `System.out.println()`
- [ ] Format nhất quán với file xung quanh
- [ ] `node --check web/app.js` nếu có thay đổi frontend

## Checklist Review Frontend (web/app.js)

- [ ] Dùng `textContent` / `html()` escape function — không dùng `innerHTML` trực tiếp với user data
- [ ] API calls qua `api()` wrapper — không gọi `fetch` trực tiếp với path hard-coded
- [ ] Loading / error / empty state được xử lý
- [ ] Không mock data để giả kết quả business

## Kết quả Review

Báo cáo theo format:
```
✅ PASS: [danh sách điểm đạt]
⚠️ WARN: [điểm cần chú ý nhưng không block]
❌ BLOCK: [điểm phải sửa trước khi done]
```
