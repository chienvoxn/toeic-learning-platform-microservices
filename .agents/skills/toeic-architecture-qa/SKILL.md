---
name: toeic-architecture-qa
description: >-
  Kiểm chứng rubric KTPM và KTHDV Hướng 3 khi audit bản nộp, đổi API/event liên service, rà JWT/RBAC hoặc lập kế hoạch kiểm thử QA-01–04. Truy vết từ yêu cầu đến thành phần, phép thử và bằng chứng theo phiên bản.
---

# QA kiến trúc TOEIC

## Ma trận KTPM

- Bắt đầu từ tiêu chí `Kxx` trong [audit](../../../docs/FINAL_AUDIT_KTPM_KTHDV.md). Với mỗi yêu cầu, ghi `ID và nguồn → component/service hoặc cấu phần tài liệu → phép đối chiếu/test → evidence → trạng thái và phần còn thiếu`.
- Nối driver ADD → kịch bản có ngưỡng → tactic/component → ADR → phép đo. Đối chiếu arc42, C4 L1–L3, runtime và deployment với package, Compose và luồng thật. Kiểm tra đối chiếu boilerplate chính thức riêng với việc đã có `entrypoints/core/data`. [Kiến trúc](../../../docs/EXAM_ARCHITECTURE.md) · [ADR](../../../docs/ADR_MVP.md)

## Ma trận KTHDV Hướng 3

- Dùng nhóm `Hxx` trong audit và cùng cấu trúc truy vết. Đối chiếu IAM/JWT/RBAC, core resources, Interaction, Membership/entitlement, Gateway, triển khai độc lập, ERD ownership năm DB và class diagram RBAC. Đối chiếu ID tham chiếu qua API/event và ranh giới schema giữa các service.
- Đối chiếu method, path, DTO, status và quyền giữa controller, [Gateway](../../../gateway/nginx.conf), `web/app.js` và client liên service. Kiểm tra JWT tại service, RBAC và ownership, chặn tuyến nội bộ qua Gateway, giữ đáp án ngoài payload trước khi chấm. Với ca từ chối ghi, đối chiếu cả HTTP và dữ liệu.
- Đối chiếu publisher/consumer của `AttemptGraded` gồm `eventId`, `userId`, `attemptId`, `type` trên `toeic.events` với routing key `attempt.graded`. Kiểm tra grade/outbox cùng transaction, retry khi dependency lỗi, dedup theo `eventId` tại Interaction và phạm vi bảo đảm publisher confirms.

## Chọn kịch bản theo thay đổi

| Kịch bản | Tiêu chí và cách đối chiếu |
| --- | --- |
| QA-01 · RBAC | Learner có JWT hợp lệ nhưng thiếu `content:write` gọi API tạo quiz, nhận HTTP 403 và SQL đếm quiz giữ nguyên. Đối chiếu cả tổng và tiêu đề riêng của lần chạy. |
| QA-02 · Nhất quán | `tests/test_concurrent_submit.py` kiểm tra 10 submit cùng attempt đều trả 200 và cùng grade, SQL khớp kết quả và có đúng một outbox. |
| QA-03 · Phục hồi | Theo [quy trình fault injection](../../../tests/fault_injection.md), dừng từng dependency Interaction hoặc RabbitMQ khi môi trường cho phép. Submit vẫn trả 200 và lưu điểm. Khôi phục dependency sau mỗi ca và đối chiếu cùng `eventId` trong SQL và API trong 60 giây kể từ khi service chạy hoặc healthy. |
| QA-04 · Hiệu năng | `tests/load.js` đo list quiz qua Gateway với 50 VU trong 60 giây, p95 dưới 500 ms, lỗi HTTP dưới 1% và mọi check payload đều đạt. |

## Trạng thái và nguồn bằng chứng

| Trạng thái | Điều kiện |
| --- | --- |
| `VERIFIED` | Có bằng chứng đạt toàn bộ tiêu chí cho đúng phạm vi, revision và môi trường đang đánh giá. |
| `PARTIAL` | Có bằng chứng phù hợp cho một phần tiêu chí. Ghi phần đã kiểm chứng và phần còn thiếu. |
| `NOT VERIFIED` | Chưa có bằng chứng phù hợp hoặc phép thử thất bại. Ghi rõ chưa chạy, sai baseline, thiếu thông tin truy vết hay lỗi quan sát được. |

Chạy kiểm thử tập trung trước. Tách evidence kiểm tra tĩnh, CI, runtime và từng phiên đo. Ghi SHA checkout, trạng thái working tree, SHA/digest image nếu dùng container, môi trường, thời điểm kèm múi giờ, lệnh/phương pháp, ngưỡng, kết quả và đường dẫn log/JSON/ảnh đã loại secrets. Ghi rõ giá trị truy vết bị thiếu. Giữ kết quả lịch sử ở đúng lần chạy của nó và chỉ gán `PASS` cho phép thử có bằng chứng đạt tương ứng. [Trạng thái kiểm chứng](../../../docs/VALIDATION_STATUS.md) · [Bộ bằng chứng](../../../docs/SUBMISSION_EVIDENCE.md)
