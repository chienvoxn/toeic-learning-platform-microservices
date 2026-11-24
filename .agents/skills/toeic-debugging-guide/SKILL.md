---
name: toeic-debugging-guide
description: >-
  Áp dụng khi gặp lỗi cross-service, lỗi khó reproduce, hoặc cần debug distributed system.
  Hướng dẫn thứ tự kiểm tra có hệ thống từ Gateway đến DB.
---

# Systematic Debugging — TOEIC Microservices

## Nguyên tắc Root-Cause Debugging

1. **Quan sát trước** — đọc log, kiểm tra state, trước khi thay đổi bất cứ thứ gì.
2. **Hẹp phạm vi** — xác định service nào thực sự fail (không phải chỉ service cuối báo lỗi).
3. **Một thay đổi một lần** — đừng sửa nhiều thứ cùng lúc khi debug.
4. **Ghi lại quan sát** — SHA, timestamp, lệnh, output ngắn.

## Luồng Debug theo triệu chứng

### HTTP 502 / 504 từ Gateway

```powershell
docker compose ps -a                              # Service nào exit?
docker compose logs --tail=50 <service-name>      # Log của service fail
docker compose logs --tail=20 gateway             # Nginx upstream error
```

### Attempt không grade / outbox chưa published

```sql
-- Kiểm tra outbox state
SELECT event_id, aggregate_id, actor_id, occurred_at, published
FROM event_outbox
WHERE published = false
ORDER BY occurred_at DESC
LIMIT 10;
```

```powershell
docker compose logs --tail=50 assessment-service   # OutboxPublisher warnings
```

### Activity không xuất hiện sau grade (QA-03 related)

```powershell
docker compose logs --tail=30 interaction-service  # ActivityConsumer
docker compose logs --tail=20 rabbitmq
# Kiểm tra queue qua RabbitMQ Management: http://127.0.0.1:15672
# Queue: interaction.attempt-graded — messages ready, consumers
```

```sql
-- Kiểm tra dedup trong interaction_db
SELECT event_id, user_id, attempt_id, created_at
FROM learning_activities
ORDER BY created_at DESC LIMIT 5;
```

### Auth / RBAC failures

```
# Decode JWT thủ công (không dùng tool online — dữ liệu sensitive)
# Base64URL decode phần giữa (payload) của token
# Kiểm tra: iss, aud, exp, roles, permissions
```

```powershell
docker compose logs --tail=20 identity-service    # TokenService errors
```

### Compose không khởi động / container exit

```powershell
docker compose config --quiet                      # Validate compose file
docker compose logs --tail=30 <failed-service>     # Startup error
# Kiểm tra: DB_URL đúng service name, DB healthy trước app start
```

## Lệnh hữu ích

```powershell
# Tail nhiều service cùng lúc
docker compose logs --tail=30 --follow assessment-service interaction-service rabbitmq

# Kiểm tra resource usage
docker stats --no-stream

# Kiểm tra network connectivity giữa services
docker compose exec assessment-service wget -qO- http://content-service:8085/ms/v1/contents/quizzes

# RabbitMQ queue state via CLI
docker compose exec rabbitmq rabbitmqctl list_queues name messages consumers
```

## Checklist khi báo cáo lỗi / kết thúc debug session

- [ ] Triệu chứng quan sát được (HTTP status, log line, SQL result)
- [ ] Root cause xác định được (file, dòng, lý do)
- [ ] Fix áp dụng và verify (lệnh chạy, output)
- [ ] Rủi ro còn lại hoặc giới hạn của fix
