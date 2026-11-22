# QA-03 — Fault injection procedure

Run from the repository root with Python and Docker Compose access. Use a local demo stack with no other test issuing submissions during the experiment, so that queue counts can be compared across snapshots. Start it with `docker compose up --build -d` if needed. The test creates a separate learner and attempt in each case.

## A. Interaction service failure

Stop `interaction-service`, then create, answer and submit a new attempt through Gateway. Expect HTTP 200 and a persisted `GRADED` result. While Interaction is stopped, verify one outbox row, no matching Interaction DB activity, and a higher ready-message count with zero consumers on `interaction.attempt-graded`.

## B. RabbitMQ failure

Stop `rabbitmq`, then create, answer and submit a new attempt. Expect HTTP 200 and a persisted grade. While RabbitMQ remains stopped, sample `event_outbox.published=false` for the attempt and verify that the activity is absent from Interaction DB. The script also counts publisher retry warnings during the outage.

For both cases the script starts the stopped service in `finally`, then polls for up to 60 seconds after Compose reports it running or healthy. A passing recovery requires the same outbox `eventId`, `published=true`, exactly one matching `ATTEMPT_GRADED` row in `learning_activities`, and the same activity visible through `GET /api/v1/interactions/activities/me`. RabbitMQ queue counters are aggregate measurements. The matching event ID in both databases and the API identifies the delivered event. Publisher confirms remain outside this MVP.

### Run and capture evidence in PowerShell

```powershell
$gatewayAddress = docker compose port gateway 8088
if ($LASTEXITCODE -ne 0) { throw 'Gateway Compose is unavailable' }
$env:GATEWAY_URL = 'http://' + $gatewayAddress.Trim()
$qa03Log = Join-Path (Resolve-Path docs/evidence) ('qa03-fault-injection-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.txt')
"Git HEAD: $(git rev-parse --short HEAD); branch: $(git branch --show-current)" | Tee-Object -FilePath $qa03Log
$qa03Exit = 1
try {
    python -B -u tests/test_fault_injection.py | Tee-Object -FilePath $qa03Log -Append
    $qa03Exit = $LASTEXITCODE
} finally {
    if ($qa03Exit -ne 0) {
        docker compose start --wait --wait-timeout 60 rabbitmq interaction-service 2>&1 |
            Tee-Object -FilePath $qa03Log -Append
    }
    "QA-03 exit code: $qa03Exit" | Tee-Object -FilePath $qa03Log -Append
}
[System.IO.File]::WriteAllText($qa03Log, (Get-Content -Raw -LiteralPath $qa03Log), [System.Text.UTF8Encoding]::new($false))
Write-Output "Evidence file $qa03Log"
```

Exit `0` requires both cases to pass with distinct attempt and event IDs and the initial services running again. If an interruption prevents cleanup, run `docker compose start --wait --wait-timeout 60 rabbitmq interaction-service` and verify `docker compose ps`.

## C. Consistency and access control

- Submit same attempt twice; expect same saved result and only one `event_outbox` row for the attempt.
- Create a second user and request the first user's attempt; expect 404.
- Call `POST /ms/v1/contents/quizzes` with learner token; expect 403.
- Try internal service snapshot URL through Gateway; expect 404.
- Try Premium quiz with FREE; expect 403.
