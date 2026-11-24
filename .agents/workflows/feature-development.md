---
name: feature-development
description: Workflow tái sử dụng cho full-stack feature development từ planning đến verification.
---

# Feature Development Workflow

## Steps

1. **Plan** (`toeic-planning`)
   - Xác định service(s), files, contract impact, migration, test scope, risks.
   - Confirm không vi phạm safety boundaries (volumes, migrations, secrets).

2. **Baseline** (`toeic-mvp-guardian`)
   - `git status --short` ghi SHA và trạng thái working tree.
   - Liệt kê contracts bị ảnh hưởng.

3. **Backend implementation** (`toeic-backend-standards`)
   - `entrypoints` → validate input, delegate.
   - `core` → Application Service điều phối ports.
   - `data` → migration (nếu cần) rồi repository.
   - Giữ transactional boundary đúng.

4. **API / contract** (`toeic-api-contract`)
   - Confirm Gateway routing khớp controller path.
   - Update contract table trong skill nếu có endpoint mới.

5. **Frontend** (`toeic-ui-ux`) — nếu có
   - Dùng `api()` wrapper; escape output qua `html()`.
   - `node --check web/app.js` phải PASS.

6. **Security review** (`toeic-security-checklist`)
   - Nếu thay đổi chạm auth/authz/internal endpoint.

7. **Test** (`toeic-test-strategy`)
   - Chạy focused test theo bảng chọn test.
   - Smoke nếu cross-service.

8. **Code review** (`toeic-code-review`)
   - Tự review theo checklist trước khi báo done.

9. **Verification** (`toeic-verification`)
   - `git diff --stat HEAD` chỉ show files trong scope.
   - Evidence: command + result tóm tắt.
   - Ghi remaining risks nếu có.
