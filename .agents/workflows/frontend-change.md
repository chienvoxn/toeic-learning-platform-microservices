---
name: frontend-change
description: Workflow cho thay đổi frontend (web/index.html, web/app.js, web/style.css).
---

# Frontend Change Workflow

## Steps

1. **Plan** (`toeic-planning`)
   - Xác định: màn hình / component / luồng vai trò bị ảnh hưởng.
   - Confirm: không dùng mock data thay API thật.

2. **Baseline** (`toeic-mvp-guardian`)
   - Liệt kê `id`, `data-tab`, và event handlers sẽ thay đổi.

3. **Implement** (`toeic-ui-ux`)
   - Dùng `textContent` hoặc `html()` escape cho user data.
   - Dùng `api()` wrapper — không gọi `fetch` trực tiếp.
   - Giữ CSS custom properties hiện có; không thêm framework.
   - Viết nhãn tiếng Việt ngắn gọn.

4. **Syntax check** (bắt buộc)
   ```powershell
   node --check web/app.js
   ```
   Phải PASS trước khi tiếp tục.

5. **Visual QA** (`toeic-ui-ux` → Visual QA)
   - Kiểm tra 320px, tablet, desktop.
   - Keyboard navigation, focus order, ARIA labels.
   - Contrast ratio >= 4.5:1 cho body text.

6. **API integration verify**
   - Mọi UI state (loading, error, empty, success) được xử lý.
   - 401/403/429 hiển thị đúng context.

7. **Verification** (`toeic-verification`)
   - `node --check web/app.js` PASS (paste output).
   - Nếu stack đang chạy: quan sát theo vai trò Learner/Teacher/Admin.
