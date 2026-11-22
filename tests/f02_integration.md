# F-02 Integration Tests on Windows

Gate status after preparation is **NOT READY**. The live tests are **NOT VERIFIED** until the commands below run successfully against the isolated dependencies. Maven does not start Docker or any external dependency.

## Isolated fixtures

- `tests/f02-integration.compose.yml` defines project `toeic-f02-it`. It exposes PostgreSQL 17 on `127.0.0.1:55432` and RabbitMQ 3.13 on `127.0.0.1:55672`. Test database, role, RabbitMQ user and vhost are all named `f02_it`. Use the two newly generated passwords below. Keep the demo project, data, credentials and vhost out of these tests.
- Data directories use `tmpfs`, so each new fixture starts empty. Each JVM with database tests creates its own randomly named schema and runs the unchanged module Flyway migrations inside it. Test events and IDs are generated for each run. The combined test uses a unique `f02.retry.<uuid>` queue to carry duplicate messages between two Maven runs.
- `*IT` classes require explicit Maven selection and `-Dtoeic.f02.it=true`. Fault cases also require `-Dtoeic.f02.faults=true`. The RabbitMQ-only group uses Mockito for the outbox repository and transaction manager. The PostgreSQL-only group uses the production repository SQL and two actual transactions. The combined group uses the real repository, broker, and transactional `ActivityConsumer.handle` bean, with a test channel receiving and acknowledging both wire messages.

## PowerShell setup

Run from the repository root when the isolated fixtures are authorized. Use Java 21, Maven and Docker Compose with images available locally. Run one Maven command at a time. The setup generates disposable test credentials in the current PowerShell process.

```powershell
$env:F02_POSTGRES_PASSWORD = [guid]::NewGuid().ToString('N')
$env:F02_RABBIT_PASSWORD = [guid]::NewGuid().ToString('N')
function Invoke-F02Compose {
    docker compose -p toeic-f02-it -f tests/f02-integration.compose.yml @args
    if ($LASTEXITCODE -ne 0) { throw 'F-02 test Compose command failed' }
}
```

The container limits are 384 MiB for PostgreSQL and 640 MiB for RabbitMQ. Maven and the test JVM also use memory beyond their heaps. Allow roughly 1 GiB of spare host RAM for a single-dependency group and 1.5–2 GiB for the combined group, with room in Docker Desktop's memory allocation. These are planning estimates. Check free memory before each group and defer the combined run or use another runner if RAM is tight. The sample commands cap the forked test JVM heap at 256 MiB and start zero application containers.

Start each group with an empty fixture. If a previous run was interrupted, inspect only `Invoke-F02Compose ps -a` and clean up that disposable project with `Invoke-F02Compose down` before continuing.

## 1. PostgreSQL only

```powershell
try {
    Invoke-F02Compose up -d --wait postgres
    mvn -B -f interaction-service/pom.xml '-Dtest=F02InteractionPostgresIT#twoRealTransactionsCommitWithOneInsertAndOneNoOp' '-Dtoeic.f02.it=true' '-DargLine=-Xmx256m' test
    if ($LASTEXITCODE -ne 0) { throw 'F-02 PostgreSQL group failed' }
} finally { Invoke-F02Compose down }
```

The test checks distinct PostgreSQL transaction IDs. A barrier forces both transactions to be active before the inserts. Both transactions must commit, one affecting one row and the other zero rows. The resulting activity must retain the expected user, attempt and kind.

## 2. RabbitMQ only

Run the routed ACK case first. The second Maven command explicitly enables fault fixtures. It needs a dedicated, empty test vhost with no other matching binding.

```powershell
try {
    Invoke-F02Compose up -d --wait rabbitmq
    mvn -B -f assessment-service/pom.xml '-Dtest=F02RabbitPublisherIT#routedBrokerAckMarksTheRow' '-Dtoeic.f02.it=true' '-DargLine=-Xmx256m' test
    if ($LASTEXITCODE -ne 0) { throw 'F-02 routed ACK case failed' }
    mvn -B -f assessment-service/pom.xml '-Dtest=F02RabbitPublisherIT' '-Dtoeic.f02.it=true' '-Dtoeic.f02.faults=true' '-DargLine=-Xmx256m' test
    if ($LASTEXITCODE -ne 0) { throw 'F-02 RabbitMQ fault fixtures failed' }
} finally { Invoke-F02Compose down }
```

| Case | Fixture and assertion |
| --- | --- |
| Routed ACK | Real broker confirm and matching body in the intended fixture queue. Publisher calls the outbox update. |
| Mandatory `NO_ROUTE` **fault fixture** | Publish to the test exchange before declaring a binding. Verify broker ACK plus return code 312 and zero outbox updates. Bind the queue and retry the same payload. |
| NACK **fault fixture** | Fill a one-message queue configured with `reject-publish`. Verify actual broker NACK, zero updates, then free the slot and retry. |
| Timeout and reconnect **fault fixture** | The test template obtains the first real broker ACK but withholds it from the worker to force its deadline. The worker resets its publisher connection before retry. Verify the old physical publisher connection closes, the same consumer connection and subscription receive both copies, and a late confirm cannot cause a second update. This fixture does not simulate packet loss on the wire. |

## 3. Combined retry and idempotency

Both commands below are part of the **fault fixture** group. They share the same two isolated dependencies and queue name. The Maven commands remain sequential. Keep both dependencies up between the two commands.

```powershell
$env:F02_RETRY_QUEUE = 'f02.retry.' + [guid]::NewGuid().ToString('N')
try {
    Invoke-F02Compose up -d --wait postgres rabbitmq
    mvn -B -f assessment-service/pom.xml '-Dtest=F02OutboxRetryIT' '-Dtoeic.f02.it=true' '-Dtoeic.f02.faults=true' '-DargLine=-Xmx256m' test
    if ($LASTEXITCODE -ne 0) { throw 'F-02 Assessment handoff failed' }
    mvn -B -f interaction-service/pom.xml '-Dtest=F02InteractionPostgresIT#duplicateWireDeliveriesFromTheRetryHandoffCommitOneActivity' '-Dtoeic.f02.it=true' '-Dtoeic.f02.faults=true' '-DargLine=-Xmx256m' test
    if ($LASTEXITCODE -ne 0) { throw 'F-02 Interaction handoff failed' }
} finally { Invoke-F02Compose down }
```

Assessment uses a deferred constraint trigger in its throwaway schema to reject the DB commit after a real broker ACK. The row must remain pending and one message must already be in the test queue. After the trigger is removed, the publisher retries and commits `published=true`. Interaction receives both byte-identical messages, commits one activity and proves the duplicate leaves the original timestamp intact. The first message and its retry use the same `eventId` and different correlation IDs.

## Evidence and release gate

- Do not point the fault fixtures at the demo or run the existing QA-03 script as part of this suite. The handoff verifies database commit and broker delivery through a test channel. A full listener-container ACK path and QA-03 recovery still need an authorized test environment.
- Record HEAD SHA, the working-tree diff under test, timestamps, image IDs, exact Maven commands, Surefire pass/fail/skip totals and the handoff `eventId`. Capture image IDs while the fixtures are up using `Invoke-F02Compose images`. Review evidence before sharing to remove sensitive values. Keep the results of each phase tied to its own run.
- Consider **READY** only after the live groups above pass with every required case executed, the handoff proves a single activity for the retried event, and QA-03 A/B passes in an authorized environment with the same release candidate. QA-03 must show a saved grade during each outage and the same activity ID within 60 seconds after recovery. Record the single-publisher assumption and the risk that an oldest failing row delays later rows.
