---
name: toeic-security-checklist
description: >-
  Áp dụng khi thay đổi TokenService, RBAC, gateway config, internal endpoints hoặc
  bất kỳ thứ gì liên quan đến auth/authz. Review trước khi kết thúc mọi task có security scope.
---

# Security Checklist — TOEIC Microservices

## JWT Validation (custom HS256)

Mỗi service tự verify JWT — không có centralized auth gateway. Kiểm tra:

- [ ] `iss` = `"toeic-identity"`, `aud` = `"toeic-services"` — xem [`TokenService.java`](../../../identity-service/src/main/java/com/toeic/identity/adapters/security/TokenService.java) L44
- [ ] `exp` > now, `iat` <= now + 30s clock skew
- [ ] Signature verified với `MessageDigest.isEqual()` (constant-time)
- [ ] `auth.jwt-secret` >= 32 chars — enforced ở constructor L17
- [ ] JWT secret không xuất hiện trong log hay response

## RBAC Enforcement

| Permission | Endpoint scope |
|---|---|
| `content:write` | Tạo/sửa/xuất bản quiz |
| `assessment:submit` | Mở và nộp attempt |
| `membership:read` | Xem plan của mình |
| `interaction:write` | Tạo review |
| `rbac:manage` | Admin user/role management, quiz moderation |

- [ ] Mọi write endpoint kiểm tra permission trước khi query DB
- [ ] Admin `can("rbac:manage")` — ADMIN role tự động có mọi permission (xem `Actor.can()`)
- [ ] Ownership check trả 404 (không 403) để không leak existence — xem Assessment `lockOwn`

## Internal Service Key

- [ ] `X-Service-Key` so sánh bằng `MessageDigest.isEqual()` (constant-time bytes)
- [ ] Internal routes bị block tại Gateway (`nginx.conf` L21-27)
- [ ] `INTERNAL_SERVICE_KEY` không xuất hiện trong log

## Secrets Management

- [ ] `.env` trong `.gitignore` — không stage bao giờ
- [ ] `.env.example` chỉ chứa placeholders, không chứa giá trị thật
- [ ] Không hardcode secret trong source code hay Docker config

## OWASP API Security — scope MVP

| Risk | Trạng thái | Mitigation |
|---|---|---|
| Broken Auth (API1) | Partial | Custom JWT — không dùng library chuẩn (C-01 audit) |
| Broken Object Auth (API3) | Mitigated | Ownership check trả 404; `lockOwn` với row lock |
| Unrestricted Resource Consumption (API4) | Partial | Quota per-user/day; không có rate limit tại Gateway |
| Broken Function Auth (API5) | Mitigated | Permission check per endpoint; Gateway block internal |
| Mass Assignment (API6) | Mitigated | Explicit DTO records; không dùng `@JsonIgnoreProperties` |
| Injection (API8) | Mitigated | JPA/parameterized queries; validation trên input |

> [!WARNING]
> C-01 (custom JWT) và thiếu Gateway rate limit là rủi ro đã biết, được chấp nhận cho MVP demo scope. Không thay đổi JWT implementation mà không có explicit approval và full test coverage.
