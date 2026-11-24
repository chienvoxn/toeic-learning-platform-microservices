---
name: toeic-api-contract
description: >-
  Áp dụng khi thay đổi controller, DTO, path, method, auth requirement hoặc Gateway routing.
  Giúp duy trì API contract consistency và tránh breaking changes giữa các services.
---

# API Contract — TOEIC Microservices

## Bảng Contract hiện tại

| Method | Path (qua Gateway) | Auth | Service | Ghi chú |
|---|---|---|---|---|
| POST | `/ms/v1/identity/register` | None | Identity | Returns JWT session |
| POST | `/ms/v1/identity/login` | None | Identity | Returns JWT session |
| GET | `/ms/v1/identity/me` | Bearer | Identity | |
| PATCH | `/ms/v1/identity/me` | Bearer | Identity | |
| POST | `/ms/v1/identity/me/password` | Bearer | Identity | |
| GET | `/ms/v1/identity/rbac/me` | Bearer | Identity | |
| GET | `/ms/v1/identity/admin/users` | Bearer + `rbac:manage` | Identity | |
| POST | `/ms/v1/identity/admin/users/{id}/roles` | Bearer + `rbac:manage` | Identity | |
| GET | `/ms/v1/contents/quizzes` | None | Content | Public catalog |
| GET | `/ms/v1/contents/quizzes/{id}` | None | Content | Public detail, no answers |
| POST | `/ms/v1/contents/quizzes` | Bearer + `content:write` | Content | Publish immediately |
| GET | `/ms/v1/contents/quizzes/mine` | Bearer + `content:write` | Content | |
| POST | `/ms/v1/contents/quizzes/drafts` | Bearer + `content:write` | Content | |
| GET/PUT | `/ms/v1/contents/quizzes/{id}/draft` | Bearer + `content:write` + ownership | Content | |
| POST | `/ms/v1/contents/quizzes/{id}/publish` | Bearer + `content:write` + ownership | Content | |
| GET | `/ms/v1/contents/quizzes/admin` | Bearer + `rbac:manage` | Content | |
| GET | `/ms/v1/contents/quizzes/admin/{id}` | Bearer + `rbac:manage` | Content | |
| POST | `/ms/v1/contents/quizzes/admin/{id}/visibility` | Bearer + `rbac:manage` | Content | |
| POST | `/ms/v1/attempts` | Bearer + `assessment:submit` | Assessment | Quota check |
| GET | `/ms/v1/attempts` | Bearer | Assessment | Own attempts only |
| GET | `/ms/v1/attempts/{id}` | Bearer | Assessment | Ownership enforced |
| PUT | `/ms/v1/attempts/{id}/answers/{questionId}` | Bearer | Assessment | Ownership enforced |
| POST | `/ms/v1/attempts/{id}/submit` | Bearer | Assessment | Idempotent |
| GET | `/api/v1/memberships/me` | Bearer | Membership | |
| PUT | `/api/v1/memberships/me` | Bearer | Membership | Demo only |
| PUT | `/api/v1/interactions/contents/{id}/reviews/me` | Bearer | Interaction | Upsert |
| GET | `/api/v1/interactions/activities/me` | Bearer | Interaction | |

**Internal routes (blocked by Gateway):**
- `/ms/v1/contents/quizzes/internal/*` → 404 at Nginx
- `/api/v1/memberships/internal/*` → 404 at Nginx

## Checklist thay đổi API contract

- [ ] Path mới khớp với Gateway routing trong [`nginx.conf`](../../../gateway/nginx.conf)
- [ ] Auth requirement ghi rõ trong Controller header annotation
- [ ] DTO thay đổi backward-compatible (thêm optional field, không xóa)
- [ ] Frontend [`web/app.js`](../../../web/app.js) gọi đúng path mới (tìm `api(`)
- [ ] Internal endpoints không xuất hiện trong Gateway public routes
- [ ] Error response format nhất quán: `ResponseStatusException` với HTTP status rõ ràng
- [ ] Nếu thêm inter-service HTTP call: dùng `X-Service-Key` header

## Inter-service Contracts

| Caller | Callee | Endpoint | Key |
|---|---|---|---|
| Assessment | Content | `GET /ms/v1/contents/quizzes/internal/{id}/snapshot` | `X-Service-Key` |
| Assessment | Membership | `GET /api/v1/memberships/internal/{userId}` | `X-Service-Key` |

## Event Contract (RabbitMQ)

```json
// Exchange: toeic.events, Routing key: attempt.graded
// Queue: interaction.attempt-graded
{
  "eventId": "<UUID>",
  "userId": "<UUID>",
  "attemptId": "<UUID>",
  "type": "AttemptGraded"
}
```

Idempotency: consumer deduplicate theo `eventId` — xem [`ActivityConsumer`](../../../interaction-service/src/main/java/com/toeic/interaction/adapters/messaging/ActivityConsumer.java).
