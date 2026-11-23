"""Phase 3B contract checks against dedicated loopback fixtures. Never use demo endpoints."""

import argparse
import base64
import hashlib
import hmac
import json
import time
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import ProxyHandler, Request, build_opener
from uuid import UUID, uuid4

CONTENT = "http://127.0.0.1:18085/ms/v1/contents/quizzes"
ASSESSMENT = "http://127.0.0.1:18086/ms/v1/attempts"
INTERNAL_KEY = "phase3b-fixture-internal-key"
SIGNING_KEY = b"phase3b-fixture-key-for-isolated-content-tests"
SEED = "11111111-1111-1111-1111-111111111111"
CHOICES = dict(zip("ABCD", ("One", "Two", "Three", "Four")))
LOOPBACK_HTTP = build_opener(ProxyHandler({}))


def bearer(user_id, role, permission):
    def encode(payload):
        return base64.urlsafe_b64encode(json.dumps(payload).encode()).rstrip(b"=")

    now = int(time.time())
    claims = {"sub": str(user_id), "roles": [role], "permissions": [permission],
              "iss": "toeic-identity", "aud": "toeic-services", "iat": now, "exp": now + 300}
    unsigned = encode({"alg": "HS256", "typ": "JWT"}) + b"." + encode(claims)
    signature = base64.urlsafe_b64encode(hmac.digest(SIGNING_KEY, unsigned, "sha256")).rstrip(b"=")
    return {"Authorization": "Bearer " + (unsigned + b"." + signature).decode()}


def call(method, url, status=200, headers=None, payload=None):
    body = json.dumps(payload).encode() if payload is not None else None
    request = Request(url, data=body, headers={"Content-Type": "application/json", **(headers or {})},
                      method=method)
    try:
        with LOOPBACK_HTTP.open(request, timeout=25) as response:
            actual, data = response.status, json.load(response)
    except HTTPError as error:
        actual, data = error.code, None
        error.close()
    check(actual == status, f"{method} {url} expected HTTP {status}, got {actual}")
    return data


def check(condition, message):
    if not condition:
        raise RuntimeError(message)


def snapshot(quiz_id, status=200):
    return call("GET", f"{CONTENT}/internal/{quiz_id}/snapshot", status, {"X-Service-Key": INTERNAL_KEY})


def fingerprint(attempt):
    # An old server omits position; after V4 the same legacy row exposes NULL.
    normalized = {**attempt, "questions": sorted(
        ({key: value for key, value in question.items() if key != "position" or value is not None}
         for question in attempt["questions"]), key=lambda item: item["id"])}
    return hashlib.sha256(json.dumps(normalized, sort_keys=True).encode()).hexdigest()


def check_order(attempt, expected_ids):
    questions = attempt["questions"]
    check([item["id"] for item in questions] == expected_ids, "Assessment reordered the snapshot questions")
    check([item.get("position") for item in questions] == list(range(1, len(expected_ids) + 1)),
          "Assessment positions differ from the snapshot array indexes")


def finish(attempt, questions, learner, verify_order=False):
    attempt_url = f"{ASSESSMENT}/{attempt['id']}"
    by_id = {item["id"]: item for item in questions}
    actual = {item["id"]: item for item in attempt["questions"]}
    expected_ids = list(by_id)
    check(actual.keys() == by_id.keys(), "Assessment question IDs differ from Content snapshot")
    for question_id, expected in by_id.items():
        item = actual[question_id]
        check(item["choices"] == expected["choices"] and item["prompt"] == expected["prompt"],
              "Assessment did not copy the snapshot content")
        check("correctChoice" not in item and item["correct"] is None and item["explanation"] is None,
              "Assessment leaked pre-grade answer data")
        answered = call("PUT", f"{attempt_url}/answers/{question_id}", headers=learner,
                        payload={"choice": expected["correctChoice"]})
        if verify_order:
            check_order(answered, expected_ids)
    graded = call("POST", f"{attempt_url}/submit", headers=learner)
    check(graded["status"] == "GRADED" and graded["correct"] == graded["total"] == len(by_id),
          "Grading differed from the Content snapshot")
    for item in graded["questions"]:
        expected = by_id[item["id"]]
        check(item["selectedChoice"] == expected["correctChoice"] and item["correct"] is True
              and item["explanation"] == expected["explanation"], "Graded answer or explanation differs")
    reread = call("GET", attempt_url, headers=learner)
    if verify_order:
        check_order(graded, expected_ids)
        check_order(reread, expected_ids)
    check(fingerprint(graded) == fingerprint(reread), "Stored result differs from submission response")
    return reread


def capture(output):
    check(not output.exists(), "Choose a new baseline path to preserve existing evidence")
    seed = snapshot(SEED)["questions"]
    user_id = uuid4()
    learner = bearer(user_id, "LEARNER", "assessment:submit")
    call("GET", ASSESSMENT, headers=learner)
    attempt = call("POST", ASSESSMENT, headers=learner, payload={"quizId": SEED})
    graded = finish(attempt, seed, learner)
    with output.open("x", encoding="utf-8") as file:
        json.dump({"learner": str(user_id), "id": graded["id"], "sha256": fingerprint(graded)}, file)
    print("PASS captured graded V2 attempt fingerprint")


def verify(baseline):
    previous = json.loads(baseline.read_text(encoding="utf-8"))
    learner = bearer(UUID(previous["learner"]), "LEARNER", "assessment:submit")
    prior_url = f"{ASSESSMENT}/{UUID(previous['id'])}"
    old = call("GET", prior_url, headers=learner)
    check(fingerprint(old) == previous["sha256"], "V2 attempt changed")
    check(all("position" in question for question in old["questions"]), "Assessment V4 not detected")
    if all(question["position"] is None for question in old["questions"]):
        ids = [UUID(question["id"]) for question in old["questions"]]
        check(ids == sorted(ids), "Legacy attempt questions are not in UUID order")
    teacher = bearer(uuid4(), "TEACHER", "content:write")
    questions = [
        {"prompt": f"Safety question {i}", **{key.lower(): value for key, value in CHOICES.items()},
         "answer": key, "explanation": f"Safety explanation {i}"}
        for i, key in enumerate("CBA", 1)
    ]
    draft = call("POST", f"{CONTENT}/drafts", headers=teacher, payload={
        "title": f"QA Phase 3B contract {uuid4().hex[:8]}", "part": 5, "premium": False, "questions": questions
    })["quiz"]
    quiz_id = str(UUID(draft["id"]))
    print(f"Fixture quiz {quiz_id}", flush=True)
    snapshot(quiz_id, 404)
    before = call("GET", ASSESSMENT, headers=learner)
    call("POST", ASSESSMENT, 404, learner, {"quizId": quiz_id})
    check(call("GET", ASSESSMENT, headers=learner) == before, "Opening a draft changed the attempt list")
    print("PASS draft denied by snapshot and Assessment")
    call("POST", f"{CONTENT}/{quiz_id}/publish", headers=teacher, payload={"version": draft["version"]})
    snap = snapshot(quiz_id)["questions"]
    check(len(snap) == len(questions) and len({UUID(item["id"]) for item in snap}) == len(snap),
          "Invalid snapshot count or question IDs")
    for item, expected in zip(snap, questions):
        check(item["prompt"] == expected["prompt"] and item["choices"] == CHOICES
              and item["correctChoice"] == expected["answer"] and item["explanation"] == expected["explanation"],
              "Content snapshot ordering or fields differ")
    print("PASS ordered snapshot fields and unique question IDs")

    attempt = call("POST", ASSESSMENT, headers=learner, payload={"quizId": quiz_id})
    attempt_url = f"{ASSESSMENT}/{UUID(attempt['id'])}"
    reopened = call("GET", attempt_url, headers=learner)
    expected_ids = [q["id"] for q in snap]
    for view in (attempt, reopened, call("GET", attempt_url, headers=learner)):
        check_order(view, expected_ids)
    finish(reopened, snap, learner, verify_order=True)
    check(fingerprint(call("GET", prior_url, headers=learner)) == previous["sha256"], "V2 attempt changed after V3 writes")
    print("PASS published attempt, answer, grade, stored result and unchanged V2 history")
    print("PASS Assessment order and positions: start, repeated reads, answer, submit, graded read")
    return 0


class MembershipFixture(BaseHTTPRequestHandler):
    def do_GET(self):
        prefix = "/api/v1/memberships/internal/"
        if not self.path.startswith(prefix):
            self.send_error(404)
            return
        if not hmac.compare_digest(self.headers.get("X-Service-Key", ""), INTERNAL_KEY):
            self.send_error(403)
            return
        try:
            user = str(UUID(self.path.removeprefix(prefix)))
        except ValueError:
            self.send_error(404)
            return
        body = json.dumps({"userId": user, "planCode": "FREE", "maxPracticePerDay": 100}).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("stage", choices=("capture-v2", "verify-v3", "membership-fixture"))
    parser.add_argument("baseline", nargs="?", type=Path)
    args = parser.parse_args()
    if args.stage == "membership-fixture":
        with HTTPServer(("127.0.0.1", 18082), MembershipFixture) as server:
            server.serve_forever()
        return 0
    if args.baseline is None:
        parser.error("supply a path for the V2 baseline")
    if args.stage == "capture-v2":
        capture(args.baseline)
        return 0
    return verify(args.baseline)


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, RuntimeError, ValueError) as error:
        raise SystemExit(f"FAIL {error}") from None
