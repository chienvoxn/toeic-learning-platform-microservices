---
name: debugging
description: Workflow debugging có hệ thống cho distributed system.
---

# Debugging Workflow

## Steps

1. **Observe** (`toeic-debugging-guide`)
   - Mô tả triệu chứng: HTTP status, error message, log line.
   - Xác định service cuối cùng handle request.
   - `git status --short` — confirm working tree state.

2. **Narrow scope**
   - `docker compose logs --tail=50 <service>` — tìm exception và stack trace.
   - Nếu liên quan outbox: query `event_outbox WHERE published=false`.
   - Nếu liên quan auth: decode JWT payload (base64, locally only).

3. **Hypothesize**
   - Đặt ra 1-3 giả thuyết root cause cụ thể (không "có thể là nhiều thứ").
   - Chọn giả thuyết có khả năng nhất để test trước.

4. **Test hypothesis**
   - Thực hiện thay đổi nhỏ nhất để verify hypothesis.
   - Nếu hypothesis sai → quay bước 2 với scope mới.

5. **Fix và verify** (`toeic-verification`)
   - Fix root cause, không chỉ suppress symptom.
   - Chạy test tương ứng; paste kết quả ngắn.
   - `git diff --stat HEAD` — confirm chỉ files trong scope.

6. **Report**
   - Triệu chứng → Root cause → Fix → Verify → Remaining risks.
