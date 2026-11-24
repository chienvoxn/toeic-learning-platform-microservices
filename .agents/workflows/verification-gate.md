---
name: verification-gate
description: Checklist cuối cùng trước khi khai báo bất kỳ task nào hoàn thành.
---

# Verification Gate Workflow

## Mandatory steps (không skip)

1. **Git state**
   ```powershell
   git status --short
   git diff --stat HEAD
   ```
   - Chỉ files trong scope xuất hiện.
   - `.env` không trong staged list.
   - Nếu `git diff --stat HEAD` empty → tất cả changes là CRLF only (expected trên Windows).

2. **Test evidence** — theo `toeic-test-strategy`:
   - Paste kết quả tóm tắt: `Tests run: X, Failures: 0, Errors: 0`.
   - Nếu chưa chạy: ghi rõ lý do và bước cần để verify.

3. **Frontend syntax** — nếu có thay đổi `web/`:
   ```powershell
   node --check web/app.js
   ```

4. **Security** — nếu chạm auth/authz:
   - Confirm permission check pass/fail theo `toeic-security-checklist`.

5. **Report**
   ```
   SHA: 622aba1 (main)
   Changed files: [list]
   Tests: [command] → PASS / FAIL (X/Y)
   Remaining risks: [hoặc "none"]
   ```

## Stop conditions

Dừng và báo cáo ngay nếu phát hiện:
- File ngoài scope bị thay đổi
- Secret trong diff
- Test fail chưa được giải thích
- Migration thay đổi ngoài instruction
