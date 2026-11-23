# TOEIC Learning Platform — Microservices MVP

MVP demo TOEIC cho KTPM/KTHDV gồm giao diện web, Nginx Gateway, năm dịch vụ Spring Boot, năm PostgreSQL riêng và RabbitMQ. Phạm vi gồm tài khoản và phân quyền, đề luyện, lưu và chấm bài, tương tác và quyền thành viên. [Ánh xạ với hệ thống TOEIC gốc](docs/ORIGINAL_REPO_MAPPING.md).

## 1. Chuẩn bị

- Mở Docker Desktop ở chế độ Linux containers và kiểm tra `docker compose version`. Chừa đủ tài nguyên để chạy đồng thời 12 container.
- Mở PowerShell tại **thư mục gốc repository**, nơi có `docker-compose.yml` và `.env.example`. Dùng trình duyệt cho demo. Python 3 chỉ cần cho smoke test. Các Dockerfile tự build ứng dụng bằng Java 21 và Maven.
- Tạo `.env` nếu chưa có, rồi mở file để cấu hình.

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
notepad .env
```

Thay `DB_PASSWORD`, `JWT_SECRET` (ít nhất 32 byte), `INTERNAL_SERVICE_KEY` và `RABBIT_PASSWORD` bằng giá trị riêng của máy demo. Giữ `ALLOW_DEMO_PLAN_CHANGE=true` để trình diễn FREE → PRO. Điền cả email và mật khẩu cho từng tài khoản cần cấp sẵn qua `DEMO_ADMIN_EMAIL` / `DEMO_ADMIN_PASSWORD` và `DEMO_TEACHER_EMAIL` / `DEMO_TEACHER_PASSWORD`. Dùng email demo riêng và mật khẩu từ 8 ký tự. Với email đã tồn tại, Identity cấp role khi khởi động nhưng giữ mật khẩu đã lưu. Giữ thông tin xác thực DB và broker tương ứng với volumes hiện có. `.env` được Git bỏ qua.

## 2. Khởi động từ repository root

```powershell
docker compose config --quiet
if ($LASTEXITCODE -ne 0) { throw 'Compose config failed' }
docker compose up -d --build
if ($LASTEXITCODE -ne 0) { throw 'Compose startup failed' }
docker compose ps -a
```

Có thể dùng `powershell -ExecutionPolicy Bypass -File .\scripts\run-demo.ps1` cho các bước kiểm tra cấu hình và khởi động. Với máy đã có image ứng dụng phù hợp với revision demo, dùng `docker compose up -d --no-build` để khởi động từ image đó.

Cổng mặc định là `http://127.0.0.1:8088` cho web/API và `http://127.0.0.1:15672` cho RabbitMQ Management. Hai cổng bind loopback. RabbitMQ Management dùng `RABBIT_USER` và `RABBIT_PASSWORD` trong `.env`. Các cổng có thể đổi bằng `GATEWAY_PORT` và `RABBIT_UI_PORT`.

## 3. Health và readiness

`docker compose ps -a` phải có 12 container đang chạy. Năm PostgreSQL và RabbitMQ phải báo `healthy`. Các container ứng dụng và Gateway chỉ có trạng thái chạy trong Compose. Kiểm tra thêm log Spring Boot và HTTP qua Gateway trước khi demo.

```powershell
$gatewayAddress = docker compose port gateway 8088
if ($LASTEXITCODE -ne 0 -or -not $gatewayAddress) { throw 'Gateway port unavailable' }
$gateway = 'http://' + $gatewayAddress.Trim()
$catalogUrl = "$gateway/ms/v1/contents/quizzes"
$deadline = (Get-Date).AddSeconds(90)
do {
    try {
        $catalog = Invoke-RestMethod -Uri $catalogUrl -TimeoutSec 5 -ErrorAction Stop
        if (@($catalog | Where-Object { $_.premium -eq $false }).Count -gt 0 -and
            @($catalog | Where-Object { $_.premium -eq $true }).Count -gt 0) {
            break
        }
    } catch {
        if ((Get-Date) -ge $deadline) { throw }
    }
    if ((Get-Date) -ge $deadline) { throw 'Expected FREE and PRO quizzes are unavailable' }
    Start-Sleep -Seconds 2
} while ($true)
$catalog | Select-Object title, part, premium
```

HTTP 200 và danh sách FREE/PRO xác nhận tuyến Gateway → Content. Đăng nhập rồi mở **Tổng quan**, **Luyện thi TOEIC** và **Tương tác** để kiểm tra lần lượt các tuyến đọc đã xác thực của Identity, Membership, Assessment và Interaction. Nếu có 502 hoặc container thoát, kiểm tra log theo dịch vụ và chạy lại probe sau khi dịch vụ sẵn sàng.

```powershell
docker compose logs --tail=100 identity-service content-service assessment-service interaction-service membership-service
```

Dừng demo và giữ dữ liệu bằng `docker compose stop`.

## 4. Kịch bản demo Learner / Teacher / Admin

1. **Learner và Assessment.** Đăng ký tài khoản mới. Trong **Luyện thi TOEIC**, mở đề Part 5 FREE, chọn A/B/C/D và chờ lưu từng câu trước khi bấm **Nộp bài và chấm điểm**. Đối chiếu `GRADED`, điểm, lời giải và **Lịch sử làm bài**. QA-02 lưu bằng chứng gửi đồng thời cùng một attempt.
2. **FREE → PRO.** Khi còn FREE, mở đề Part 6 PRO và kiểm tra yêu cầu bắt đầu nhận HTTP 403. Vào **Gói thành viên → Kích hoạt PRO (Demo)**, quay lại và mở cùng đề. Đây là chuyển quyền demo tại chỗ, không có giao dịch thanh toán. Hạn mức demo là 10 lượt/ngày với FREE và 1.000 lượt/ngày với PRO.
3. **Interaction.** Trong **Tương tác**, chọn đề, nhập số sao và nhận xét, sau đó bấm **Lưu đánh giá**. Dùng **Làm mới** để tìm `ATTEMPT_GRADED` ứng với attempt vừa chấm. Assessment ghi điểm và Outbox trong transaction. Activity xuất hiện bất đồng bộ sau khi RabbitMQ giao sự kiện. [Log phục hồi QA-03](docs/evidence/qa03-fault-injection-20261122-134619.txt).
4. **Admin.** Đăng ký thêm một Learner riêng làm tài khoản nhận quyền. Lấy `userId` từ JSON của yêu cầu đã xác thực `GET /ms/v1/identity/me` trong DevTools → Network. Có thể tải lại trang sau khi đăng nhập để tạo GET này. Đăng xuất, đăng nhập Admin đã cấu hình, mở **Quản trị RBAC**, nhập UUID và cấp `TEACHER`.
5. **Teacher.** Đăng nhập lại bằng tài khoản vừa được cấp quyền để JWT nhận claim mới, hoặc dùng tài khoản Teacher cấp sẵn. Mở **Giáo viên**, điền tiêu đề và đủ bốn lựa chọn cùng đáp án, giải thích, rồi bấm **Xuất bản đề mới**. Chuyển về Learner và làm mới danh mục để thấy đề vừa tạo. Learner thiếu `content:write` nhận HTTP 403 nếu gọi API tạo đề. [HTTP và SQL trong QA-01](docs/evidence/qa01-security-rbac-aa43453.txt).

Dùng email và tiêu đề dành riêng cho demo. Các bước trên tạo dữ liệu trong volumes. Những lỗi có chủ đích của QA-03 đã được lưu trong log và có thể trình bày từ evidence.

## 5. Kiểm tra và bằng chứng nộp

Smoke test thủ công sau readiness, dùng Python chuẩn và tạo một Learner riêng cho mỗi lần chạy.

```powershell
$env:GATEWAY_URL = $gateway
python tests/smoke.py
```

Smoke bao gồm đăng ký, lưu đáp án, nộp lặp, ownership, entitlement PRO khi bật demo và activity. Quota, concurrent submit, fault injection và k6 có kịch bản riêng dưới [tests](tests/).

[CI run 45250496826](https://github.com/chienvoxn/toeic-learning-platform-microservices/actions/runs/45250496826) đạt 6/6 job trên [revision 47a94aa](https://github.com/chienvoxn/toeic-learning-platform-microservices/commit/47a94aaac6b6f6e289003ac9745fb3f2b801f07a). Năm job Maven chạy `clean verify`; job thứ sáu kiểm tra cú pháp JavaScript và `docker compose config --quiet`. Lịch sử build image, runtime, smoke và thử nghiệm QA có mốc riêng trong [Validation status](docs/VALIDATION_STATUS.md).

- [Audit KTPM/KTHDV](docs/FINAL_AUDIT_KTPM_KTHDV.md) và [bộ hình, số liệu QA-01–04](docs/SUBMISSION_EVIDENCE.md).
- [Kiến trúc ADD, arc42, C4 và QA](docs/EXAM_ARCHITECTURE.md), [ADR](docs/ADR_MVP.md) và [Assessment DDD](docs/ASSESSMENT_DDD.md).
- [Mẫu báo cáo có ERD theo database và Class Diagram RBAC](docs/REPORT_TEMPLATE.md).

## 6. Dịch vụ và tuyến API

| Dịch vụ | Cổng nội bộ | Dữ liệu sở hữu | Tuyến qua Gateway |
|---|---|---|---|
| Identity | 8084 | `identity_db` | `/ms/v1/identity/` |
| Content | 8085 | `content_db` | `/ms/v1/contents/` |
| Assessment | 8086 | `assessment_db` | `/ms/v1/attempts` |
| Interaction | 8083 | `interaction_db` | `/api/v1/interactions/` |
| Membership | 8082 | `membership_db` | `/api/v1/memberships/` |
| Gateway | 8088 | Web tĩnh | `/` và các tuyến API trên |
| RabbitMQ | 5672 | Queue sự kiện | Management trên cổng loopback riêng |

Các thao tác API dùng trong demo và smoke test.

| Thao tác | Phương thức và endpoint |
|---|---|
| Đăng ký / đăng nhập | `POST /ms/v1/identity/register`, `POST /ms/v1/identity/login` |
| Xem quyền hoặc cấp vai trò | `GET /ms/v1/identity/rbac/me`, `POST /ms/v1/identity/admin/users/{id}/roles` |
| Danh mục / chi tiết / tạo đề | `GET /ms/v1/contents/quizzes`, `GET /ms/v1/contents/quizzes/{id}`, `POST /ms/v1/contents/quizzes` |
| Mở bài / lịch sử | `POST /ms/v1/attempts`, `GET /ms/v1/attempts` |
| Lưu đáp án / nộp bài | `PUT /ms/v1/attempts/{id}/answers/{questionId}`, `POST /ms/v1/attempts/{id}/submit` |
| Xem gói / chuyển gói demo | `GET /api/v1/memberships/me`, `PUT /api/v1/memberships/me` |
| Lưu review / xem activity | `PUT /api/v1/interactions/contents/{id}/reviews/me`, `GET /api/v1/interactions/activities/me` |

Gateway chặn các tuyến snapshot và entitlement nội bộ. API danh mục công khai chỉ cung cấp metadata. Assessment giữ snapshot riêng và chỉ trả kết quả của attempt cho chủ sở hữu. Cấu hình JWT HS256 dùng chung khóa và cơ chế tự chuyển PRO phục vụ demo cục bộ. Outbox chỉ đánh dấu `published=true` sau khi nhận correlated publisher ACK từ RabbitMQ mà không có mandatory return. NACK, NO_ROUTE, timeout hoặc lỗi kết nối giữ sự kiện ở trạng thái pending để retry; vì broker ACK và cập nhật SQL không nguyên tử, hệ thống bảo đảm at-least-once delivery kết hợp consumer idempotency theo eventId, không phải exactly-once delivery.
