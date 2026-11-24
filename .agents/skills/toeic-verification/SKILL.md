---
name: toeic-verification
description: >-
  Áp dụng BẮT BUỘC trước khi khai báo bất kỳ task nào hoàn thành. Checklist
  verify thực chất (evidence-based), không chỉ "code đã viết".
---

# Verification Before Completion — TOEIC Microservices

> **Superpowers principle:** Done means verified, not just written.
> Không claim "done" khi chưa chạy ít nhất một bước verify thực chất.

## Verify Bắt buộc theo Task Type

| Task type | Verify tối thiểu |
|---|---|
| Backend logic change | Chạy relevant unit test; paste output tóm tắt |
| Controller / API change | `node --check web/app.js` (nếu chạm `web/`) hoặc verify API DTO (`frontend/`); test endpoint |
| Legacy frontend change (`web/`) | `node --check web/app.js` PASS |
| New React frontend change (`frontend/`) | `npm run lint && npm run typecheck && npm run test` PASS |
| Cross-service change | `python tests/smoke.py` PASS |
| Outbox / messaging change | `OutboxPublisherTest` + `F02RabbitPublisherIT` PASS |
| Agent config (skills/rules/AGENTS.md) | Verify file tồn tại; đọc lại nội dung key |
| Migration | Validate SQL offline; kiểm tra `V{n}` sequence không trùng |

## Git State Verify

Trước khi kết thúc:

```powershell
git status --short          # Chỉ file trong scope thay đổi
git diff --stat HEAD        # Không có thay đổi ngoài scope (nếu chỉ CRLF → empty là OK)
```

Phát hiện vi phạm:
- File ngoài scope bị modified → revert hoặc explain
- `.env` trong staged → STOP ngay, không commit
- Secret trong diff → STOP ngay

## Evidence Template

```
Task: [tên task]
SHA checkout: 622aba1 (main HEAD)
Files changed: [list]
Test run:
  Command: [lệnh cụ thể]
  Result: PASS / FAIL
  Output: [tóm tắt ngắn, không paste toàn bộ]
Remaining risks: [nếu có]
```

## Khi KHÔNG claim done

- Test chưa chạy → ghi "test pending, reason: [lý do]"
- Chỉ kiểm tra static (đọc code) không chạy → ghi "static review only"
- Môi trường chưa sẵn sàng → ghi "environment not available, [bước cần để verify]"
