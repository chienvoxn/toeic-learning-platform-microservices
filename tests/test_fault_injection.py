#!/usr/bin/env python3
"""QA-03 for a running local Docker Compose stack."""

import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from time import monotonic, sleep

from smoke import BASE, req
from test_concurrent_submit import HTTP_STATUSES, ROOT, grade_view, prepare_attempt


QUEUE = "interaction.attempt-graded"
ACTIVITIES = "/api/v1/interactions/activities/me"
DEPENDENCIES = {"interaction-service", "rabbitmq"}
RECOVERY_TIMEOUT = 60
EXPECTED_ERRORS = (
    AssertionError, KeyError, OSError, RuntimeError, SystemExit, TypeError, ValueError,
    subprocess.TimeoutExpired,
)


def log(message):
    stamp = datetime.now(timezone.utc).isoformat(timespec="milliseconds")
    print(f"{stamp} {message}", flush=True)


def compose(*args, timeout=20):
    result = subprocess.run(
        ["docker", "compose", *args], cwd=ROOT, capture_output=True, text=True, timeout=timeout
    )
    if result.returncode:
        raise RuntimeError(f"Docker Compose {args[0]} exited {result.returncode}: {result.stderr.strip()}")
    return result.stdout


def running_services():
    return set(compose("ps", "--status", "running", "--services").splitlines())


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def query(service, database, statement):
    output = compose(
        "exec", "-T", service, "psql", "-X", "-w", "-qAt", "-v", "ON_ERROR_STOP=1",
        "-U", "toeic", "-d", database, "-c", f"BEGIN READ ONLY; {statement}; ROLLBACK;",
    )
    return json.loads(output)


def assessment_state(attempt_id):
    # prepare_attempt has validated and canonicalized this UUID.
    return query("assessment-db", "assessment_db", f"""
        SELECT json_build_object(
            'status', a.status, 'correct', a.correct_count, 'graded', a.graded_at IS NOT NULL,
            'outbox', (SELECT COALESCE(json_agg(json_build_object(
                'eventId', e.event_id, 'published', e.published, 'type', e.event_type
            )), '[]'::json) FROM event_outbox e
            WHERE e.aggregate_id = a.attempt_id AND e.event_type = 'AttemptGraded')
        ) FROM attempts a WHERE a.attempt_id = '{attempt_id}'::uuid
    """)


def activity_rows(attempt_id):
    return query("interaction-db", "interaction_db", f"""
        SELECT COALESCE(json_agg(json_build_object(
            'eventId', event_id, 'attemptId', attempt_id, 'kind', kind
        )), '[]'::json) FROM learning_activities WHERE attempt_id = '{attempt_id}'::uuid
    """)


def queue_state():
    output = compose(
        "exec", "-T", "rabbitmq", "rabbitmqctl", "-q", "list_queues",
        "name", "messages_ready", "messages_unacknowledged", "consumers",
    )
    for line in output.splitlines():
        fields = line.split()
        if len(fields) == 4 and fields[0] == QUEUE:
            return dict(zip(("ready", "unacked", "consumers"), map(int, fields[1:])))
    raise RuntimeError(f"RabbitMQ queue {QUEUE} was not listed")


def assert_binding():
    output = compose(
        "exec", "-T", "rabbitmq", "rabbitmqctl", "-q", "list_bindings",
        "source_name", "destination_name", "routing_key",
    )
    binding = ["toeic.events", QUEUE, "attempt.graded"]
    require(any(line.split() == binding for line in output.splitlines()), "Expected binding missing")
    log(f"RabbitMQ binding: exchange={binding[0]} routing_key={binding[2]} queue={binding[1]}")


def restore(service):
    for attempt in (1, 2):
        try:
            log(f"Restore {service}: docker compose start (try {attempt})")
            compose("start", "--wait", "--wait-timeout", "60", service, timeout=70)
            log(f"Restore {service}: Compose reports running/healthy")
            return
        except (OSError, RuntimeError, subprocess.TimeoutExpired) as error:
            log(f"Restore {service}: {error}")
    raise RuntimeError(f"Restore failed; run docker compose start {service}")


def observe_outage(label, service, attempt_id, grade, queue_before, stopped_at):
    # Keep RabbitMQ down long enough to sample across multiple scheduled publisher polls.
    deadline = monotonic() + (60 if label == "A" else 8)
    poll = 0
    event_id = None
    while True:
        poll += 1
        state = assessment_state(attempt_id)
        rows = activity_rows(attempt_id)
        queue = queue_state() if label == "A" else "broker stopped"
        log(f"{label} outage poll {poll}: Assessment SQL={state}; Interaction SQL={rows}; queue={queue}")
        require(service not in running_services(), f"{service} came up during the outage check")
        require(state["status"] == "GRADED" and state["graded"] and state["correct"] == grade["correct"],
                "Persisted grade differs from submit response")
        require(len(state["outbox"]) == 1 and not rows, "Expected one outbox row and no activity during outage")
        event = state["outbox"][0]
        require(event_id is None or event_id == event["eventId"], "Outbox event ID changed")
        event_id = event["eventId"]

        if label == "A":
            if event["published"] and queue["consumers"] == 0 and queue["ready"] > queue_before["ready"]:
                return event_id
            require(monotonic() < deadline, "No queued message observed while Interaction was stopped")
        else:
            require(event["published"] is False, "Outbox was marked published while RabbitMQ was stopped")
            if monotonic() >= deadline:
                publisher_output = compose("logs", "--no-color", "--since", stopped_at, "assessment-service")
                retry_types = re.findall(r"Event broker unavailable; retry next poll: (\w+)", publisher_output)
                log(f"B publisher retry lines observed: {len(retry_types)}; exception types={sorted(set(retry_types))}")
                return event_id
        sleep(2)


def observe_recovery(label, attempt_id, event_id, token, submitted_at):
    expected = {"eventId": event_id, "attemptId": attempt_id, "kind": "ATTEMPT_GRADED"}
    deadline = monotonic() + RECOVERY_TIMEOUT
    poll = 0
    while True:
        poll += 1
        state = assessment_state(attempt_id)
        rows = activity_rows(attempt_id)
        status, payload = req("GET", ACTIVITIES, token=token, expected=HTTP_STATUSES)
        activity_visible = status == 200 and isinstance(payload, list) and any(
            all(item.get(key) == value for key, value in expected.items()) for item in payload
        )
        outbox = state["outbox"]
        log(f"{label} recovery poll {poll}: Assessment SQL={state}; Interaction SQL={rows}; "
            f"activity HTTP={status}, matching event={activity_visible}")
        if outbox == [{"eventId": event_id, "published": True, "type": "AttemptGraded"}] and (
            rows == [expected] and activity_visible
        ):
            elapsed = monotonic() - submitted_at
            log(f"{label} final queue={queue_state()}; submit-to-activity={elapsed:.2f}s")
            return
        require(monotonic() < deadline, f"{label} activity/outbox evidence incomplete after {poll} recovery polls")
        sleep(2)


def run_case(label, service):
    require(DEPENDENCIES <= running_services(), "Both fault targets must be running before injection")
    log(f"{label} stop requested: {service}")
    stopped_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    try:
        compose("stop", service, timeout=45)
        require(service not in running_services(), f"{service} is still running")
        log(f"{label} confirmed stopped: {service}")
        queue_before = queue_state() if label == "A" else None
        log(f"{label} outage baseline queue={queue_before if label == 'A' else 'broker stopped'}")
        attempt_id, token = prepare_attempt()
        submitted_at = monotonic()
        log(f"{label} submit requested for {attempt_id}")
        status, body = req("POST", f"/ms/v1/attempts/{attempt_id}/submit", token=token, expected=HTTP_STATUSES)
        response_ms = (monotonic() - submitted_at) * 1000
        log(f"{label} submit HTTP={status}; {response_ms:.1f}ms")
        require(status == 200, f"Submit returned HTTP {status}")
        grade = grade_view(body, attempt_id)
        log(f"{label} submit status={grade['status']}; score={grade['correct']}/{grade['total']}")
        event_id = observe_outage(label, service, attempt_id, grade, queue_before, stopped_at)
    finally:
        restore(service)

    observe_recovery(label, attempt_id, event_id, token, submitted_at)
    log(f"{label} PASS: attemptId={attempt_id}; eventId={event_id}")
    return attempt_id, event_id


def main():
    log(f"QA-03 Gateway={BASE}")
    try:
        initial = running_services()
        required = DEPENDENCIES | {
            "gateway", "assessment-service", "assessment-db", "interaction-db", "identity-service",
            "content-service", "membership-service",
        }
        require(required <= initial, f"Missing running Compose services: {sorted(required - initial)}")
        log(f"Initial running services: {', '.join(sorted(initial))}")
        assert_binding()
    except EXPECTED_ERRORS as error:
        log(f"A NOT RUN; B NOT RUN: preflight failed: {error}")
        return 1

    outcomes = {}
    for label, service in (("A", "interaction-service"), ("B", "rabbitmq")):
        try:
            outcomes[label] = run_case(label, service)
        except EXPECTED_ERRORS as error:
            log(f"{label} FAIL: {error}")

    final = running_services()
    restored = initial <= final
    distinct = len(outcomes) == 2 and all(a != b for a, b in zip(outcomes["A"], outcomes["B"]))
    log(f"Final running services: {', '.join(sorted(final))}")
    log(f"QA-03 summary: A={'PASS' if 'A' in outcomes else 'FAIL'}; B={'PASS' if 'B' in outcomes else 'FAIL'}; "
        f"services restored={restored}; distinct attempt/event IDs={distinct}")
    return 0 if restored and distinct else 1


if __name__ == "__main__":
    sys.exit(main())
