---
name: architecture-review
description: Workflow review kiến trúc khi thay đổi cross-service, event contract, hoặc audit rubric.
---

# Architecture Review Workflow

## Steps

1. **Load** `toeic-architecture-qa` + `toeic-domain-business`.

2. **Traceability** — với mỗi thay đổi đề xuất:
   - Driver (D01-D05) → QA scenario → tactic → component → ADR → evidence.

3. **Contract review** (`toeic-api-contract`)
   - Method, path, DTO, status, auth thay đổi không?
   - Event schema (AttemptGraded) thay đổi không? → consumer compatible?
   - Gateway routing thay đổi không? → internal routes vẫn blocked?

4. **Boundary check**
   - Mỗi service vẫn sở hữu đúng database không?
   - Cross-service chỉ qua UUID reference, HTTP + X-Service-Key, hoặc RabbitMQ?
   - Không có cross-schema FK?

5. **QA scenario impact**
   | Thay đổi | QA bị ảnh hưởng |
   |---|---|
   | Auth / RBAC | QA-01 |
   | Submit / grade / outbox | QA-02, QA-03 |
   | Content list / performance | QA-04 |

6. **ADR** — nếu thay đổi kiến trúc có tradeoff rõ ràng → ghi ADR mới vào `docs/ADR_MVP.md`.

7. **Report** — trạng thái VERIFIED / PARTIAL / NOT VERIFIED theo tiêu chí `toeic-architecture-qa`.
