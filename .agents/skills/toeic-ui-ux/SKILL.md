---
name: toeic-ui-ux
description: >-
  Thiết kế và kiểm tra frontend TOEIC Microservices (React 18 TypeScript trong frontend/ và Vanilla JS tĩnh trong web/).
  Áp dụng khi phát triển dashboard Learner, giao diện luyện thi TOEIC, màn hình tạo đề Teacher, quản trị RBAC,
  hệ thống thiết kế Tailwind CSS / Radix UI, và Visual QA responsive trên Nginx Gateway.
---

# Giao diện & Trải nghiệm Người dùng — TOEIC Microservices

Hệ thống hỗ trợ 2 nền tảng frontend kết nối đồng nhất qua Nginx Gateway (cổng `8088`):
1. **Modern React Frontend** tại [`frontend/`](../../../frontend/) (React 18 + TS + Tailwind + Vite).
2. **Legacy Demo Web** tại [`web/`](../../../web/) (Vanilla JS + HTML5 + CSS3).

---

## 1. Nền tảng Modern React Frontend (`frontend/`)

### Kiến trúc & Thư viện cốt lõi
- **Routing**: `react-router-dom` v7 với các tuyến phân quyền:
  - Public: `/login`, `/register`, `/quizzes` (catalog tự do)
  - Protected (Learner): `/dashboard`, `/attempts/:id`, `/attempts/:id/result`, `/profile`
  - Protected (Teacher): `/teacher/quizzes/new`, `/teacher/quizzes/mine`, `/teacher/quizzes/:id/edit`
  - Protected (Admin): `/admin/users`, `/admin/rbac`, `/admin/quizzes`
- **Server State & Caching**: `@tanstack/react-query` v5:
  - Cache quiz catalog, profile, attempt details.
  - Tự động invalidate và refetch sau mutation (nộp bài, tạo quiz, đổi role).
- **UI Components & Icons**: Radix UI Primitives (`@radix-ui/*`) + `lucide-react` icons.
- **Form & Validation**: `react-hook-form` tích hợp `zod` schema resolver.
- **Styling**: Tailwind CSS với các utility classes chuẩn, hỗ trợ dark/light tokens và responsive breakpoints (`sm: 640px`, `md: 768px`, `lg: 1024px`, `xl: 1280px`).

### Quy chuẩn kiểm tra chất lượng (Verification Gate)
Trước khi đóng task trên `frontend/`, bắt buộc chạy:
```powershell
cd frontend
npm run lint         # ESLint 9
npm run typecheck    # tsc --noEmit (0 TypeScript error)
npm run test         # Vitest (100% test pass)
npm run build        # Production build verification
```

---

## 2. Nền tảng Legacy Demo Web (`web/`)

- Dùng [HTML](../../../web/index.html), [CSS](../../../web/style.css), [JavaScript](../../../web/app.js) và [quiz-authoring.js](../../../web/quiz-authoring.js).
- Tất cả API calls đều gọi qua hàm wrapper `api(path, options)` gắn Bearer token tự động qua Nginx Gateway.
- **Chống XSS**: Sử dụng `textContent` hoặc hàm escape `html(...)`. Tuyệt đối không gán `innerHTML` trực tiếp chuỗi chưa kiểm duyệt từ API.
- Bảng màu gốc: Nền `#f4f7fc`, chữ `#15233c`, sidebar `#10234a`, accent `#009DFF`, warning `#F59E0B`, success `#10B981`.
- Kiểm tra cú pháp bắt buộc:
  ```powershell
  node --check web/app.js
  node --check web/quiz-authoring.js
  ```

---

## 3. Luồng Nghiệp vụ theo Vai trò (Learner, Teacher, Admin)

| Vai trò | Trải nghiệm cần đảm bảo trên UI |
|---|---|
| **Learner** | - Phân biệt rõ đề FREE và đề PRO (kèm nhãn kim cương / badge PRO).<br>- Làm bài thi: Đồng hồ đếm ngược, lưu tạm đáp án từng câu (autosave) qua `PUT /ms/v1/attempts/{id}/answers/{questionId}`.<br>- Nộp bài thi qua `POST /ms/v1/attempts/{id}/submit`, hiển thị điểm số TOEIC và chi tiết giải thích sau khi trạng thái là `GRADED`.<br>- Xử lý quota: Khi hết 10 lượt/ngày (FREE), hiển thị popup nâng cấp gói PRO hoặc thông báo lỗi HTTP 429 thân thiện. |
| **Teacher** | - Trình tạo đề thi: Chọn Part 1-7, tiêu đề, giới hạn thời gian, cờ `premium` (chỉ PRO mới làm được).<br>- Quản lý câu hỏi, 4 lựa chọn A-D, chọn đáp án đúng và nhập giải thích chi tiết.<br>- Hỗ trợ cả 2 chế độ: Lưu nháp (`DRAFT`) hoặc Xuất bản ngay (`PUBLISHED`).<br>- Giữ nguyên form dữ liệu nếu request ghi lên server bị lỗi mạng. |
| **Admin** | - Quản lý người dùng: Xem danh sách tài khoản, UUID, email, quyền hiện tại qua `/ms/v1/identity/admin/users`.<br>- Phân quyền RBAC: Cấp hoặc thu hồi role (`LEARNER`, `TEACHER`, `ADMIN`) qua `POST /ms/v1/identity/admin/users/{id}/roles`.<br>- Hướng dẫn tài khoản được phân quyền đăng nhập lại để nhận claim JWT mới. |

---

## 4. Visual QA & Tiêu chuẩn Tiếp cận (Accessibility)

- **Responsive**: Kiểm tra hiển thị chuẩn ở độ phân giải 320px (mobile nhỏ), 768px (tablet) và 1280px+ (desktop).
- **State Handling**: Bắt buộc có đầy đủ 4 trạng thái:
  1. *Loading State*: Skeleton shimmer hoặc spinner loading rõ ràng.
  2. *Error State*: Thông báo lỗi tương ứng với HTTP code (401, 403, 404, 429, 500) kèm nút thử lại (Retry).
  3. *Empty State*: Card trống lịch thiệp kèm nút gợi ý hành động (ví dụ: "Chưa có bài thi nào, hãy bắt đầu ngay").
  4. *Success State*: Thông báo lưu thành công và cập nhật UI tức thì.
- **Độ tương phản**: Tỷ lệ tương phản chữ/nền tối thiểu 4.5:1 đối với văn bản thông thường.
