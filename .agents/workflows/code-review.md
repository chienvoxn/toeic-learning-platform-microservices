---
name: code-review
description: Workflow review code thay đổi theo pull request hoặc yêu cầu review cụ thể.
---

# Code Review Workflow

## Steps

1. **Scope** — xác định files thay đổi và loại thay đổi (feature/bugfix/refactor).

2. **Architecture check** (`toeic-code-review` → Architecture & Layering)
   - Controller có delegate sang Application Service không?
   - Cross-service DB query không?

3. **Correctness check** (`toeic-code-review` → Correctness)
   - Transaction boundary đúng không?
   - Outbox cùng transaction với grade không?
   - Idempotent submit đúng không?

4. **Security check** (`toeic-security-checklist`) — nếu chạm auth/authz
   - Permission check trước DB query?
   - Ownership check trả 404?
   - Không có secret trong code?

5. **Test check** (`toeic-code-review` → Testing)
   - Thay đổi logic có unit test không?
   - Test không phụ thuộc shared state?

6. **Report** theo format:
   ```
   ✅ PASS: ...
   ⚠️ WARN: ...
   ❌ BLOCK: ...
   ```
