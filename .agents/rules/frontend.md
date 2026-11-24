# Frontend Rules — TOEIC Microservices

## 1. Hai nền tảng Frontend trong hệ thống

Dự án microservices có 2 nền tảng frontend riêng biệt:
1. **Modern Frontend (`frontend/`)**:
   - Stack: React 18, TypeScript 5, Vite, React Router v7, TanStack Query v5, Radix UI primitives, Tailwind CSS, Lucide Icons, Vitest.
   - Được định hướng cho ứng dụng chính thức, dashboard hiện đại và trải nghiệm người dùng cao cấp.
2. **Legacy Web (`web/`)**:
   - Stack: Vanilla JS (`app.js`, `quiz-authoring.js`), HTML5 tĩnh (`index.html`), CSS3 (`style.css`).
   - Được phục vụ trực tiếp qua Nginx Gateway cho mục đích demo nhẹ và kiểm thử nhanh.

## 2. Kết nối API qua Nginx Gateway

- Tất cả các request từ client **bắt buộc** đi qua Nginx Gateway (mặc định cổng `8088`).
- **Tuyệt đối không** hardcode port hay địa chỉ trực tiếp của các backend services (như `8084`, `8085`, `8086`, `8082`, `8083`).
- Định tuyến API chuẩn qua Gateway:
  - `/ms/v1/identity/*` ➔ Identity Service
  - `/ms/v1/contents/*` ➔ Content Service
  - `/ms/v1/attempts*` ➔ Assessment Service
  - `/api/v1/memberships/*` ➔ Membership Service
  - `/api/v1/interactions/*` ➔ Interaction Service
- Tuyến `/internal/*` đã bị Gateway chặn; frontend không được phép gọi trực tiếp các endpoint nội bộ này.

## 3. Quy chuẩn lập trình React Frontend (`frontend/`)

- **State Management**:
  - Dùng **TanStack Query (React Query)** cho server state (caching, revalidation, optimistic updates).
  - Dùng React local state hoặc Context cho UI state đơn giản.
- **Form & Validation**:
  - Dùng `react-hook-form` kết hợp `zod` schema validation (`@hookform/resolvers/zod`).
- **Styling**:
  - Dùng Tailwind CSS với utility classes, kết hợp `clsx` và `tailwind-merge` cho dynamic styles.
  - Tuân thủ thiết kế responsive: Mobile (320px+), Tablet, Desktop.
- **Xử lý trạng thái UX bắt buộc**:
  - Luôn xử lý 4 trạng thái cốt lõi: `Loading` (Skeleton/Spinner), `Error` (thông báo lỗi thân thiện kèm nút thử lại), `Empty` (trạng thái trống có hướng dẫn), `Success`.
  - Xử lý mã lỗi HTTP chuẩn: 401 (chuyển hướng đăng nhập), 403 (thông báo quyền hạn/gói PRO), 429 (hết lượt làm bài trong ngày).
- **Kiểm thử & Syntax Check**:
  - `npm run lint` (ESLint 9)
  - `npm run typecheck` (`tsc --noEmit`)
  - `npm run test` (Vitest)
  - `npm run build` (Vite build)

## 4. Quy chuẩn lập trình Legacy Web (`web/`)

- Dùng `api()` wrapper có sẵn trong `web/app.js` cho mọi HTTP calls; không dùng `fetch` trần với URL hard-coded.
- Bảo mật XSS: Dùng `textContent` hoặc hàm escape `html()` khi render dữ liệu từ người dùng hoặc API; không gán `innerHTML` trực tiếp dữ liệu thô.
- Giữ các biến CSS custom properties và bảng màu gốc (`#f4f7fc`, `#15233c`, `#10234a`).
- Kiểm tra cú pháp bắt buộc trước khi đóng task:
  ```powershell
  node --check web/app.js
  ```
