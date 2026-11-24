---
name: toeic-planning
description: >-
  Áp dụng trước khi implement bất kỳ feature hoặc thay đổi nào. Hướng dẫn plan
  có cấu trúc: phạm vi, file thay đổi, test scope, rủi ro — trước khi viết code.
---

# Engineering Planning — TOEIC Microservices

> **Superpowers principle:** Plan before code. Một plan tốt tốn 5 phút; một refactor tốn 5 giờ.

## Plan Template

Trước khi bắt đầu implement, trả lời 6 câu hỏi:

```
1. SCOPE
   Service(s) bị ảnh hưởng: [identity | content | assessment | membership | interaction]
   Loại thay đổi: [feature | bugfix | refactor | docs | config]

2. FILES TO CHANGE
   Liệt kê chính xác file sẽ thêm/sửa/xóa (không "có thể" hay "nếu cần")

3. CONTRACT IMPACT
   API path / DTO / event schema thay đổi không?
   Inter-service call thay đổi không?
   Gateway routing thay đổi không?

4. MIGRATION NEEDED?
   Có thay đổi schema DB không? → Nếu có: tên file migration, service DB nào

5. TEST SCOPE
   Unit test: [tên class test]
   Integration/Smoke: [lệnh cụ thể]
   Điều kiện bỏ qua test nào và lý do

6. RISKS
   Breaking change cho services khác?
   Rủi ro mất dữ liệu demo?
   Rủi ro regression nào đã biết?
```

## Quy tắc Planning

- **Một service một lần** — tránh thay đổi đồng thời nhiều service trong một task.
- **Không sửa migration** nếu không trong scope được approve.
- **Confirm contract** trước khi implement: đọc `toeic-api-contract` nếu có API thay đổi.
- **Minimal change** — không thêm abstraction, dependency, hay pattern không cần thiết.
- Nếu plan không rõ ràng → hỏi trước, không assume.

## Khi nào cần escalate

- Thay đổi chạm 3+ services → cần approval cross-service change
- Thay đổi JWT / TokenService → cần review `toeic-security-checklist`
- Thay đổi Gateway routing → cần verify internal route protection
- Thay đổi event schema (AttemptGraded) → cần confirm consumer compatibility
