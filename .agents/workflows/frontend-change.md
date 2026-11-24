---
name: frontend-change
description: Workflow chuẩn cho thay đổi frontend (bao gồm React 18 frontend/ và Legacy web/).
---

# Quy trình Thay đổi Frontend — TOEIC Microservices

## 1. Nền tảng Modern React Frontend (`frontend/`)

### Các bước thực hiện:
1. **Lập kế hoạch (Planning)**:
   - Xác định: Page, component, hook hoặc API service bị ảnh hưởng trong `frontend/src/`.
   - Đối chiếu API Gateway contract trong `gateway/nginx.conf` (`/ms/v1/...` hoặc `/api/v1/...`).
2. **Cài đặt & Triển khai (Implementation)**:
   - Dùng TanStack Query cho data fetching / cache revalidation.
   - Dùng Tailwind CSS và Radix UI cho styling & components.
   - Form validation bằng `react-hook-form` + `zod`.
   - Đảm bảo 4 trạng thái bắt buộc: `loading`, `error`, `empty`, `success`.
3. **Kiểm tra chất lượng cục bộ (Verification Gate)**:
   ```powershell
   cd frontend
   npm run lint         # ESLint 9
   npm run typecheck    # TypeScript compiler check
   npm run test         # Vitest unit & integration tests
   npm run build        # Build kiểm tra production bundle
   cd ..
   ```
   *Bắt buộc cả 4 lệnh đều PASS trước khi kết thúc task.*

---

## 2. Nền tảng Legacy Web (`web/`)

### Các bước thực hiện:
1. **Lập kế hoạch & Baseline**:
   - Xác định file thay đổi: `web/index.html`, `web/app.js`, `web/quiz-authoring.js`, `web/style.css`.
   - Liệt kê các `id`, `data-tab`, và event handlers liên quan.
2. **Triển khai (Implementation)**:
   - Dùng hàm `api()` wrapper có sẵn để gọi Gateway — không gọi `fetch` trực tiếp với URL hard-coded.
   - Chống XSS: Luôn dùng `textContent` hoặc hàm escape `html()` cho user data; không gán `innerHTML` trực tiếp dữ liệu thô từ API.
   - Giữ các biến CSS custom properties gốc.
3. **Kiểm tra cú pháp (Syntax Check)**:
   ```powershell
   node --check web/app.js
   node --check web/quiz-authoring.js
   ```
   *Bắt buộc cả 2 lệnh syntax check đều PASS.*
4. **Visual QA**:
   - Kiểm tra hiển thị responsive (320px mobile, 768px tablet, 1280px+ desktop).
   - Kiểm tra contrast text, focus tab, ARIA labels.
