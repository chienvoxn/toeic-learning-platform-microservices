---
name: toeic-mvp-guardian
description: >-
  Giữ baseline và kiểm soát hồi quy khi sửa UI, refactor Java, đổi nghiệp vụ, API, tích hợp liên service hoặc cấu hình TOEIC. Dùng để bảo vệ ranh giới triển khai, dữ liệu demo và hành vi đã kiểm chứng trước và sau thay đổi.
---

# Bảo vệ MVP TOEIC

## Checklist trước thay đổi

- [ ] Đọc [AGENTS.md](../../../AGENTS.md), chạy `git status --short --untracked-files=all` và ghi nhận SHA cùng các thay đổi đã staged, unstaged và untracked. Giữ nguyên công việc ngoài phạm vi, tránh reset hoặc dọn working tree để lấy baseline.
- [ ] Xác định service sở hữu hành vi, caller, dữ liệu và kịch bản có thể bị ảnh hưởng. Đối chiếu [luồng demo](../../../README.md) và [trạng thái kiểm chứng](../../../docs/VALIDATION_STATUS.md) để chọn kiểm thử tập trung theo revision và môi trường.
- [ ] Lập danh sách contract bị chạm. So method, path, status, DTO, JWT/RBAC/ownership qua [Gateway](../../../gateway/nginx.conf), controller, client liên service và [UI](../../../web/app.js). Với event, đối chiếu schema, exchange, routing key, transaction outbox và khóa dedup của consumer. Chốt cách giữ tương thích nếu yêu cầu thay đổi contract.

## Ranh giới bảo vệ

- Giữ Identity, Content, Assessment, Interaction và Membership, mỗi service sở hữu PostgreSQL riêng. Giữ RabbitMQ, Nginx Gateway, frontend HTML/CSS/JS tĩnh và phân tầng hiện có. Refactor package giữ nguyên nghiệp vụ, wiring Spring và transaction.
- Giữ Compose project, named volumes, database, dữ liệu demo và quiz mẫu FREE/PRO. Cấm `docker compose down -v` và mọi thao tác xóa volumes, database hoặc dữ liệu demo. Chỉ sửa migration khi có yêu cầu rõ ràng. Dùng tài khoản và tiêu đề riêng cho mỗi phép thử có ghi dữ liệu.
- Cấm gây hồi quy hành vi đã kiểm chứng. Giữ API nội bộ về snapshot và entitlement ngoài Gateway, đáp án ngoài payload trước khi chấm, và `AttemptGraded` cùng transaction với kết quả chấm.
- Cấm stage hoặc commit `.env` và secrets, kể cả khi có yêu cầu commit. Dùng placeholder trong `.env.example` nếu cần hướng dẫn cấu hình. Loại bỏ mật khẩu, JWT và giá trị bí mật khỏi log, ảnh và báo cáo.

## Checklist sau thay đổi

- [ ] So `git status`, diff và staged diff với baseline. Kiểm tra file ngoài phạm vi, thay đổi contract, migration và dấu vết secrets. Nếu được yêu cầu commit, rà lại danh sách file staged trước khi commit.
- [ ] Chạy kiểm thử tập trung trước và chọn [smoke](../../../tests/smoke.py), [quota](../../../tests/test_quota_concurrency.py) hoặc [concurrent submit](../../../tests/test_concurrent_submit.py) theo luồng bị ảnh hưởng và readiness của môi trường. Tránh build hoặc restart cả stack cho thay đổi cục bộ.
- [ ] Nếu có hồi quy, xử lý trước khi kết luận hoàn tất. Báo file thay đổi, kiểm thử, lỗi và rủi ro còn lại. Ghi rõ luồng chưa chạy và phạm vi chứng minh của từng kết quả.
