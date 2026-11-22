#!/usr/bin/env python3
"""QA-02 against a running Compose stack. Uses Python's standard library."""

import json
import subprocess
import sys
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
from threading import Barrier, BrokenBarrierError
from time import perf_counter

from smoke import BASE, req


WORKERS = 10
HTTP_STATUSES = range(100, 600)
ROOT = Path(__file__).resolve().parents[1]


def setup_request(method, path, **kwargs):
    status, body = req(method, path, expected=HTTP_STATUSES, **kwargs)
    if status != 200:
        raise ValueError(f"{method} {path} returned HTTP {status}; expected 200")
    return body


def prepare_attempt():
    user = setup_request(
        "POST",
        "/ms/v1/identity/register",
        payload={
            "email": f"qa02-{uuid.uuid4().hex}@example.test",
            "displayName": "QA-02 Concurrent Submit",
            "password": "Qa02Demo123!",
        },
    )
    token = user["accessToken"]
    quizzes = setup_request("GET", "/ms/v1/contents/quizzes")
    free_quiz = next((quiz for quiz in quizzes if quiz["premium"] is False), None)
    if free_quiz is None:
        raise ValueError("No public FREE quiz available")

    attempt = setup_request(
        "POST", "/ms/v1/attempts", payload={"quizId": free_quiz["id"]}, token=token
    )
    attempt_id = str(uuid.UUID(attempt["id"]))
    print(f"Attempt ID: {attempt_id}")
    if attempt["status"] != "IN_PROGRESS" or not attempt["questions"]:
        raise ValueError("Expected a new IN_PROGRESS attempt with questions")

    question = attempt["questions"][0]
    question_id = str(uuid.UUID(question["id"]))
    if "A" not in question["choices"]:
        raise ValueError("The selected question has no option A")
    saved = setup_request(
        "PUT",
        f"/ms/v1/attempts/{attempt_id}/answers/{question_id}",
        payload={"choice": "A"},
        token=token,
    )
    if saved["status"] != "IN_PROGRESS" or not any(
        item["id"] == question_id and item["selectedChoice"] == "A"
        for item in saved["questions"]
    ):
        raise ValueError("The answer response did not confirm choice A on the open attempt")
    print(f"Saved choice A for question {question_id}; status=IN_PROGRESS")
    return attempt_id, token


def submit_worker(number, gate, path, token):
    try:
        gate.wait(timeout=10)
    except BrokenBarrierError:
        return number, None, None, None, "Start barrier timed out"

    started = perf_counter()
    try:
        status, body = req("POST", path, token=token, expected=HTTP_STATUSES)
        return number, status, (perf_counter() - started) * 1000, body, None
    except (OSError, SystemExit, ValueError) as error:
        return number, None, (perf_counter() - started) * 1000, None, str(error)


def grade_view(body, attempt_id):
    if (
        not isinstance(body, dict)
        or body.get("id") != attempt_id
        or body.get("status") != "GRADED"
        or type(body.get("correct")) is not int
        or type(body.get("total")) is not int
        or not 0 <= body["correct"] <= body["total"]
        or not isinstance(body.get("questions"), list)
        or len(body["questions"]) != body["total"]
    ):
        raise ValueError("Expected a GRADED AttemptView with a valid score and question list")
    # The question repository does not specify an order. Compare by question ID.
    return {**body, "questions": sorted(body["questions"], key=lambda item: item["id"])}


def check_responses(attempt_id, token):
    path = f"/ms/v1/attempts/{attempt_id}/submit"
    gate = Barrier(WORKERS)
    views = []
    successes = 0
    with ThreadPoolExecutor(max_workers=WORKERS) as executor:
        requests = [
            executor.submit(submit_worker, number, gate, path, token)
            for number in range(1, WORKERS + 1)
        ]
        for request in requests:
            number, status, elapsed, body, error = request.result()
            successes += status == 200
            latency = f"{elapsed:.1f} ms" if elapsed is not None else "unavailable"
            fields = body if isinstance(body, dict) else {}
            score = f"{fields.get('correct', '-')}/{fields.get('total', '-')}"
            if status == 200:
                try:
                    views.append(grade_view(body, attempt_id))
                except (KeyError, TypeError, ValueError) as invalid:
                    error = str(invalid)
            detail = f"; {error}" if error else ""
            print(
                f"Submit {number:02d}: HTTP {status or '-'}; {latency}; "
                f"status={fields.get('status', '-')}; score={score}{detail}"
            )

    identical = len(views) == WORKERS and all(view == views[0] for view in views)
    print(f"HTTP 200: {successes}/{WORKERS}; identical graded responses: {identical}")
    return views[0] if identical else None


def read_database(attempt_id):
    # attempt_id has been parsed and canonicalized as a UUID before SQL interpolation.
    sql = f"""
        BEGIN READ ONLY;
        SELECT json_build_object(
            'status', a.status,
            'correct', a.correct_count,
            'graded', a.graded_at IS NOT NULL,
            'snapshotCorrect', (
                SELECT count(*) FROM attempt_questions q
                WHERE q.attempt_id = a.attempt_id AND q.selected_choice = q.correct_choice
            ),
            'outboxCount', (
                SELECT count(*) FROM event_outbox e
                WHERE e.aggregate_id = a.attempt_id AND e.event_type = 'AttemptGraded'
            )
        ) FROM attempts a WHERE a.attempt_id = '{attempt_id}'::uuid;
        ROLLBACK;
    """
    result = subprocess.run(
        [
            "docker", "compose", "exec", "-T", "assessment-db",
            "psql", "-X", "-w", "-qAt", "-v", "ON_ERROR_STOP=1",
            "-U", "toeic", "-d", "assessment_db", "-c", sql,
        ],
        cwd=ROOT,
        capture_output=True,
        text=True,
        timeout=20,
    )
    if result.returncode:
        raise RuntimeError(result.stderr.strip() or f"psql exit {result.returncode}")
    return json.loads(result.stdout) if result.stdout.strip() else None


def main():
    print(f"QA-02 Concurrent Submit | {datetime.now(timezone.utc).isoformat()} | {BASE}")
    try:
        attempt_id, token = prepare_attempt()
    except (KeyError, OSError, SystemExit, TypeError, ValueError) as error:
        print(f"QA-02 FAIL: setup did not complete: {error}")
        return 1

    view = check_responses(attempt_id, token)
    try:
        row = read_database(attempt_id)
    except (OSError, RuntimeError, subprocess.TimeoutExpired, ValueError) as error:
        print(f"Database verification unavailable: {error}")
        if view is None:
            print("QA-02 FAIL: HTTP criteria failed and outbox could not be verified")
            return 1
        print("QA-02 NOT VERIFIED: HTTP criteria met, outbox count unavailable")
        return 2

    print(f"PostgreSQL: {json.dumps(row, sort_keys=True)}")
    if view is None:
        print("QA-02 FAIL: expected 10 HTTP 200 responses with the same graded result")
        return 1
    if (
        row is None
        or row["status"] != "GRADED"
        or not row["graded"]
        or row["correct"] != view["correct"]
        or row["snapshotCorrect"] != view["correct"]
        or row["outboxCount"] != 1
    ):
        print("QA-02 FAIL: expected a matching persisted grade and exactly one AttemptGraded row")
        return 1

    print("QA-02 PASS: 10 identical graded responses, matching DB grade, one AttemptGraded row")
    return 0


if __name__ == "__main__":
    sys.exit(main())
