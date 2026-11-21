
import concurrent.futures
import json
import os
import uuid

from urllib.error import HTTPError
from urllib.request import Request, urlopen

BASE = os.getenv(
    "GATEWAY_URL", "http://localhost:8088"
).rstrip("/")

FREE_QUIZ_ID = (
    "11111111-1111-1111-1111-111111111111"
)


def request(method, path, payload=None, token=None):
    data = (
        json.dumps(payload).encode("utf-8")
        if payload is not None
        else None
    )

    headers = {"Content-Type": "application/json"}

    if token:
        headers["Authorization"] = f"Bearer {token}"

    req = Request(
        BASE + path,
        data=data,
        headers=headers,
        method=method,
    )

    try:
        with urlopen(req, timeout=30) as response:
            body = response.read().decode("utf-8")
            return response.status, json.loads(body)

    except HTTPError as error:
        return error.code, error.read().decode("utf-8")


def create_attempt(token):
    return request(
        "POST",
        "/ms/v1/attempts",
        {"quizId": FREE_QUIZ_ID},
        token,
    )


def main():
    email = f"quota-test-{uuid.uuid4().hex}@example.test"

    status, registered = request(
        "POST",
        "/ms/v1/identity/register",
        {
            "email": email,
            "displayName": "Quota Test",
            "password": "QuotaTest123!",
        },
    )

    assert status == 200, (
        f"Register failed: {status} {registered}"
    )

    token = registered["accessToken"]

    print("1. Creating 9 attempts sequentially...")

    for index in range(9):
        status, body = create_attempt(token)

        assert status == 200, (
            f"Attempt {index + 1} failed: "
            f"{status} {body}"
        )

    print("PASS: 9 attempts created")

    print("2. Sending 10 concurrent requests...")

    with concurrent.futures.ThreadPoolExecutor(
        max_workers=10
    ) as executor:
        results = list(
            executor.map(
                create_attempt,
                [token] * 10,
            )
        )

    success = sum(
        1 for status, _ in results
        if status == 200
    )

    rejected = sum(
        1 for status, _ in results
        if status == 429
    )

    print(f"HTTP 200: {success}")
    print(f"HTTP 429: {rejected}")

    unexpected = [
        status
        for status, _ in results
        if status not in (200, 429)
    ]

    assert not unexpected, (
        f"Unexpected HTTP statuses: {unexpected}"
    )

    assert success == 1, (
        f"Expected 1 success, got {success}"
    )

    assert rejected == 9, (
        f"Expected 9 quota rejections, got {rejected}"
    )

    status, attempts = request(
        "GET",
        "/ms/v1/attempts",
        token=token,
    )

    assert status == 200
    assert len(attempts) == 10, (
        f"Expected 10 attempts, got {len(attempts)}"
    )

    print("PASS: Exactly 10 attempts persisted")
    print("ALL QUOTA CONCURRENCY ASSERTIONS PASSED")


if __name__ == "__main__":
    main()
