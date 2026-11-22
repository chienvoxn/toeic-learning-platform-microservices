---
name: toeic-domain-business
description: >-
  Phân tích và thiết kế nghiệp vụ TOEIC khi mở rộng vòng đời đề, lịch sử luyện tập, quản lý vai trò, chấm điểm, entitlement hoặc review. Xác định state machine, invariants, contract và tiêu chí nghiệm thu cho Learner, Teacher và Admin.
---

# Nghiệp vụ TOEIC

## Phân tích trạng thái hiện có

Đối chiếu [luồng demo](../../../README.md), controller, logic nghiệp vụ, schema và test liên quan. Với mỗi luồng, ghi trạng thái nguồn/đích, thao tác, actor, guard, dữ liệu ghi và kết quả khi từ chối, gọi lặp hoặc chạy đồng thời. Dùng transition cho hành vi có trạng thái, dùng bảng quyền cho RBAC.

| Service | Luật nghiệp vụ cần giữ |
| --- | --- |
| Identity | Đăng ký mặc định `LEARNER`. Cấp vai trò qua `rbac:manage`, xác định người thao tác từ JWT đã xác thực và đăng nhập lại để nhận claim mới. |
| Content | API tạo quiz xuất bản ngay, dùng cờ `published` cho list/detail và snapshot. Teacher/Admin tạo đề theo `content:write`. Giữ API công khai tách khỏi snapshot nội bộ có đáp án. |
| Assessment | Mở lượt cần `assessment:submit` hoặc vai trò `ADMIN`, đồng thời phải có entitlement phù hợp. Chấm từ snapshot đã lưu lúc mở lượt. Mỗi lượt mở thành công dùng một quota theo ngày UTC, ghi cùng transaction với attempt và câu hỏi. Hết quota trả 429. Đọc, trả lời và nộp theo ownership, trả 404 cho attempt của người khác. |
| Membership | Plan FREE ↔ PRO khi bật `ALLOW_DEMO_PLAN_CHANGE`, chỉ để demo. FREE mặc định có 10 lượt/ngày, PRO có 1.000 và mở đề premium. Assessment kiểm quyền lợi từ Membership. |
| Interaction | Review được tạo hoặc cập nhật theo cặp người dùng và nội dung. Activity xuất hiện bất đồng bộ qua `AttemptGraded`. Dùng `eventId` để chống tạo activity trùng. |

## Thay đổi Assessment

- Giữ quy tắc của lượt trên `Attempt` và `AttemptQuestion`. `AttemptApplicationService` điều phối snapshot, quota, transaction và lưu qua các port hiện có. Dùng khóa ghi của `AttemptRepo.lockOwn` cho answer và submit. Xem [Assessment DDD](../../../docs/ASSESSMENT_DDD.md).
- Chỉ chuyển `IN_PROGRESS` sang `GRADED` một lần. Nộp lại trả kết quả đã lưu và chỉ lần chấm đầu tạo outbox, cùng transaction với điểm. Giữ `correct` và `explanation` là `null` trước khi chấm và giữ `correctChoice` ngoài API attempt.
- Chọn `AttemptDomainTest` cho quy tắc aggregate, `AttemptApplicationServiceTest` cho quyền, quota và ghi grade/outbox. Dùng `tests/test_quota_concurrency.py`, `tests/test_concurrent_submit.py` hoặc `tests/smoke.py` khi thay đổi chạm hành vi cần PostgreSQL, Gateway hoặc tích hợp liên service.

## Khoảng thiếu và phương án đề xuất

| Vai trò | Baseline để đối chiếu | Phương án cần xác nhận |
| --- | --- | --- |
| Learner | Có danh sách lượt của mình và xem chi tiết từng lượt. | Lịch sử có phân trang, lọc theo trạng thái/Part và xem lại lượt đã chấm. Chốt nguồn dữ liệu cho Part và quy tắc hiển thị khi quiz đổi hoặc lưu trữ. |
| Teacher | Có tạo và xuất bản ngay. | Vòng đời `DRAFT → PUBLISHED → ARCHIVED` trong Content. Chốt ownership khi sửa, điều kiện xuất bản, version nếu cần và cách ngăn mở lượt mới từ đề đã lưu trữ trong khi giữ snapshot các lượt cũ. |
| Admin | Có cấp vai trò theo UUID và đọc quyền của chính mình. | Tra cứu người dùng, xem quyền, cấp/thu hồi vai trò và lưu lịch sử thao tác trong Identity. Chốt quyền người thao tác, bảo vệ Admin cuối cùng và thời điểm JWT có hiệu lực sau thay đổi. |

Đánh dấu mục đề xuất là **ĐỀ XUẤT** trong kế hoạch và báo cáo cho đến khi có triển khai và kiểm chứng. Chọn một lát cắt theo giá trị người dùng và dependency trong năm service hiện tại.

## Điều kiện nghiệm thu nghiệp vụ mới

- **Validation và quyền.** Ghi field bắt buộc, ràng buộc dữ liệu, guard trạng thái, ownership, quyền ghi và phản hồi từ chối. Xác định hành vi khi gọi lặp hoặc tranh chấp ghi nếu có.
- **API contract.** Ghi method, path, request/response, mã lỗi, quyền, caller và tương thích dữ liệu cũ. Ghi payload và idempotency nếu có event mới hoặc đổi event.
- **Kế hoạch migration.** Ghi DB sở hữu, schema, dữ liệu cũ/demo, backfill, thứ tự triển khai tương thích và phương án khôi phục không mất dữ liệu. Nếu giữ schema, ghi rõ lý do. Chỉ sửa migration khi được yêu cầu rõ ràng.
- **Acceptance tests.** Viết Given/When/Then cho luồng thành công, dữ liệu sai, thiếu quyền, trạng thái cấm và các ca lặp, đồng thời hoặc dữ liệu cũ có liên quan. Nêu điều cần quan sát ở API và dữ liệu/event sau khi ghi.
