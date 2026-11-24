# Kịch bản bảo vệ TOEIC Microservices — 9 phút

## Checklist trước giờ thi

- [ ] Kiểm tra SHA bản thi trên `feature/exam-eve-upgrade`, [GitHub Actions](https://github.com/chienvoxn/toeic-learning-platform-microservices/actions?query=branch%3Afeature%2Fexam-eve-upgrade) và [bằng chứng cục bộ](SUBMISSION_EVIDENCE.md). Giữ `0112dc7` làm bản dự phòng.
- [ ] Mở Docker Desktop và kiểm tra 12 container đang chạy. Năm PostgreSQL và RabbitMQ báo healthy. Xác nhận trang web và `GET /ms/v1/contents/quizzes` trả 200 sau khi Spring Boot sẵn sàng.
- [ ] Chuẩn bị ba phiên trình duyệt riêng cho Admin, Learner nhận quyền và Learner làm bài. Kiểm tra đăng nhập Admin và trạng thái FREE của Learner làm bài. Giữ thông tin đăng nhập ngoài tài liệu, slide và màn hình chia sẻ.
- [ ] Lưu sẵn [CSV mẫu Part 5](../web/quiz-import-template.csv). Đặt tiêu đề đề riêng cho buổi thi và chuẩn bị một đề PREMIUM có sẵn.
- [ ] Mở sẵn [C4 và runtime](EXAM_ARCHITECTURE.md), [ERD và sơ đồ RBAC](REPORT_TEMPLATE.md), [ADR](ADR_MVP.md) và [log QA-01–04](SUBMISSION_EVIDENCE.md#qa-0104). Khi dịch vụ mất kết nối, dùng log đúng phiên để trình bày kết quả đã đo. Giữ nguyên volumes.

## Trình tự bảo vệ

| Thời gian | Thao tác và nội dung trình bày |
|---|---|
| 0:00–0:55 | **C4 và năm dịch vụ.** L1 giới thiệu Learner, Teacher và Admin. L2 chỉ Nginx Gateway, Identity, Content, Assessment, Interaction, Membership, năm PostgreSQL và RabbitMQ. L3 chỉ `AttemptApplicationService`, aggregate `Attempt`, persistence ports và Outbox publisher. ERD thể hiện FK trong từng DB và UUID ở ranh giới service. |
| 0:55–1:50 | **Admin cấp Teacher.** Mở **Quản lý người dùng**, tìm Learner đã chuẩn bị bằng tên hoặc email, chọn **Quản lý** và xác nhận cấp **Giáo viên**. Hiển thị cả Học viên và Giáo viên trên cùng tài khoản. Identity xác thực quyền `rbac:manage`. |
| 1:50–3:05 | **Teacher đăng nhập lại và xuất bản.** Đăng xuất rồi đăng nhập lại để có claims mới. Trong workspace Giáo viên, mở **Tạo đề**, đặt tiêu đề riêng, chọn Part 5 và FREE, nhập CSV mẫu, xem trước, lưu nháp rồi xuất bản. Nêu quy tắc Teacher chỉ sửa và xuất bản bản nháp của mình. |
| 3:05–4:15 | **Learner luyện và xem giải thích.** Làm mới thư viện, mở đề FREE vừa tạo, trả lời hai câu và chờ lưu, rồi xác nhận nộp. Hiển thị điểm `GRADED`, lời giải và lịch sử. Mở thêm một lượt mới từ đề này để dùng ở bước kiểm duyệt. |
| 4:15–4:55 | **FREE/PRO.** Trên phiên Learner làm bài, cho xem đề PREMIUM đang yêu cầu PRO. Mở **Gói thành viên** và bật PRO demo, rồi mở đề PREMIUM. Assessment gọi Membership kiểm tra entitlement. Đây là cơ chế demo. |
| 4:55–6:10 | **Admin ẩn/hiện đề và chứng minh snapshot.** Trong **Quản lý đề thi**, tìm đề theo tiêu đề, xem chi tiết, ẩn và làm mới danh mục Learner trong phiên riêng. Quay về lượt FREE đã mở, lưu câu trả lời và nộp khi đề còn ẩn. Mở lịch sử và đọc kết quả đã chấm trước đó. Công khai lại đề và đối chiếu kết quả đã lưu. |
| 6:10–7:05 | **Outbox, RabbitMQ và idempotency.** Theo sequence, Assessment khóa attempt, lưu điểm và `AttemptGraded` trong một transaction. Publisher chỉ đánh dấu đã gửi sau broker ACK và khi message không bị trả về. Interaction deduplicate theo `eventId`. Mở activity nếu đã đồng bộ hoặc dùng log smoke và QA-03. |
| 7:05–8:20 | **QA-01–04.** QA-01 có HTTP 403 và số quiz giữ 2 → 2. QA-02 lưu 10 HTTP 200 cùng grade và đúng một outbox row. QA-03 A/B vẫn chấm HTTP 200 khi dependency dừng. Lượt mới hơn đo 29,36 s và 32,14 s từ submit đến activity, còn lượt cũ đo 12,70 s và 16,17 s từ lúc dịch vụ khôi phục. QA-04 có 50 VU trong 60 s, p95 29,18 ms và 0 lỗi HTTP trên 5.793 request. Hiển thị revision và phép đo theo từng log. |
| 8:20–9:00 | **Đánh đổi và giới hạn.** DB tách riêng bảo vệ ownership nhưng tăng chi phí vận hành. JWT HS256 dùng khóa chung và hết hạn sau 30 phút. Outbox giao ít nhất một lần. Đề ẩn dùng chung trạng thái bản nháp, tác giả hiển thị mã khi có, PRO là demo và K08 còn thiếu boilerplate chính thức để đối chiếu. |

## Màn hình dự phòng

- Dùng kịch bản đã thực hiện và [log smoke](evidence/exam-upgrade-20261124-122302-smoke.txt) nếu mất thời gian khi trình diễn thao tác.
- Dùng [log RBAC/Profile](evidence/exam-upgrade-20261124-122302-rbac-profile.txt) và [log Admin API/Edge](evidence/exam-upgrade-20261124-122302-live-admin-edge.txt) để đối chiếu 403, Teacher ownership, snapshot và khôi phục phiên.
- Dùng [biểu đồ k6](SUBMISSION_EVIDENCE.md#biểu-đồ-qa-04) khi giải thích đủ bối cảnh của số đo p95.
