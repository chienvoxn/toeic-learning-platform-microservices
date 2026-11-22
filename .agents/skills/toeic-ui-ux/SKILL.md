---
name: toeic-ui-ux
description: >-
  Thiết kế và kiểm tra web TOEIC Flow khi làm dashboard Learner, màn luyện đề, form tạo đề Teacher, quản trị RBAC, hệ thống thiết kế hoặc visual QA. Tập trung vào thao tác, responsive và khả năng tiếp cận trên frontend tĩnh.
---

# Giao diện TOEIC Flow

## Hệ thiết kế

- Dùng [HTML](../../../web/index.html), [CSS](../../../web/style.css) và [JavaScript](../../../web/app.js) thuần, Nginx cùng origin và `api()` hiện có. Cải tiến giao diện trong framework hiện tại. Khi đổi markup, đối chiếu `id`, `data-tab` và handler.
- Khi chuẩn hóa CSS, dùng custom properties theo vai trò cho nền trang, surface, chữ, chữ phụ, viền, hành động chính, focus và trạng thái. Lấy màu hiện có làm điểm xuất phát cho nền `#f4f7fc`, chữ `#15233c` và sidebar `#10234a`. Kiểm tra tương phản trên từng cặp màu thực tế.
- Giữ system font với bản tiếng Việt, phân cấp tiêu đề trang, tiêu đề khu vực, nội dung và nhãn. Dùng thang spacing 4/8/12/16/24/32 px làm mặc định khi chuẩn hóa và tái sử dụng panel, card, nút chính/phụ, form, thông báo và badge trạng thái. Viết nhãn tiếng Việt ngắn, giữ tiếng Anh trong câu hỏi TOEIC.

## Luồng theo vai trò

| Vai trò | Trải nghiệm cần kiểm tra |
| --- | --- |
| Learner | Phân biệt FREE/PRO, mở hoặc tiếp tục lượt hiện có, lưu đáp án, nộp, xem kết quả và lịch sử của mình. Báo lỗi lưu từng câu, giữ câu trả lời khi thử lại và chờ lần lưu pending hoàn tất trước khi nộp. Chỉ hiển thị điểm và lời giải sau `GRADED`. |
| Teacher | Form tạo đề rõ Part, quyền truy cập, câu hỏi, lựa chọn A–D, đáp án và giải thích. Hiển thị lỗi tại trường liên quan, giữ nội dung nếu yêu cầu ghi thất bại và xác nhận xuất bản bằng phản hồi từ API. |
| Admin | Hiển thị thao tác theo permission, làm rõ UUID và vai trò đích trước khi gửi, hiển thị kết quả từ API và hướng dẫn tài khoản được cấp quyền đăng nhập lại để nhận claim mới. |

- Backend quyết định quyền và entitlement. Dùng dữ liệu API cho điểm, tiến độ, số lượt, trạng thái gói và activity. Cấm thêm mock data để giả kết quả nghiệp vụ. Khi thiếu dữ liệu, hiển thị empty state có hành động phù hợp. Đánh dấu đổi gói là demo và cho phép làm mới activity đến bất đồng bộ.
- Hiển thị loading, empty, lỗi, thành công và trạng thái đang ghi. Giữ lỗi 401/403/429 theo ngữ cảnh thao tác và cho phép thử lại khi phù hợp. Dùng `textContent` hoặc escape đúng ngữ cảnh khi hiển thị dữ liệu từ API.

## Visual QA

- Kiểm tra ở 320 CSS px, tablet và desktop. Thử câu hỏi dài, tên đề dài, bảng/lịch sử, form và điều hướng. Kiểm tra không tràn ngang ngoài vùng cuộn chủ đích, thao tác chính dễ thấy và đủ lớn trên cảm ứng.
- Kiểm tra bàn phím, thứ tự tab, focus khi đổi màn hình hoặc hiện lỗi, label, `fieldset`/`legend` cho nhóm đáp án và thông báo qua `#flash` hoặc vùng live phù hợp. Dùng chữ cùng màu cho trạng thái, tương phản chữ thường tối thiểu 4,5:1.
- Nếu sửa JS, chạy `node --check web/app.js`. Khi Gateway sẵn sàng, đối chiếu ảnh hoặc quan sát trình duyệt theo các vai trò và trạng thái đã sửa. Ghi viewport, vai trò, trạng thái đã kiểm tra và phần chưa quan sát. [Kịch bản demo](../../../README.md#4-kịch-bản-demo-learner--teacher--admin)
