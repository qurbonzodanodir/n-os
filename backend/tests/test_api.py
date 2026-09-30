from uuid import uuid4

from fastapi.testclient import TestClient

from app import api
from app.config import get_settings
from app.main import app
from app.ratelimit import reset_rate_limits


def workspace() -> dict:
    return {
        "schema": 3,
        "settings": {
            "name": "",
            "language": "ru",
            "theme": "system",
            "timezone": "Asia/Dushanbe",
            "currency": "TJS",
            "weekStart": 1,
            "reducedTransparency": False,
        },
        "tasks": [],
        "events": [],
        "habits": [],
        "notes": [],
        "projects": [],
        "goals": [],
        "accounts": [],
        "transactions": [],
        "budgets": [],
        "reviews": [],
        "islam": {},
    }


def test_health_is_public() -> None:
    with TestClient(app) as client:
        assert client.get("/api/v1/health").json() == {"ok": True}


def test_workspace_requires_an_owner() -> None:
    with TestClient(app) as client:
        assert client.get("/api/v1/workspace").status_code == 401


def test_workspace_revision_prevents_lost_updates() -> None:
    headers = {"X-User-Id": f"test-{uuid4()}"}
    body = {"workspace": workspace(), "revision": 0}

    with TestClient(app) as client:
        initial = client.get("/api/v1/workspace", headers=headers)
        assert initial.json() == {"workspace": None, "revision": 0}

        created = client.put("/api/v1/workspace", headers=headers, json=body)
        assert created.status_code == 200
        assert created.json() == {"revision": 1}

        conflict = client.put("/api/v1/workspace", headers=headers, json=body)
        assert conflict.status_code == 409

        current = client.get("/api/v1/workspace", headers=headers)
        assert current.json()["revision"] == 1

        history = client.get("/api/v1/workspace/history", headers=headers)
        assert history.status_code == 200
        assert history.json()[0]["revision"] == 1

        snapshot = client.get("/api/v1/workspace/history/1", headers=headers)
        assert snapshot.status_code == 200
        assert snapshot.json()["workspace"] == body["workspace"]


def test_workspace_rejects_unknown_schema() -> None:
    payload = workspace()
    payload["schema"] = 99
    with TestClient(app) as client:
        response = client.put(
            "/api/v1/workspace",
            headers={"X-User-Id": f"test-{uuid4()}"},
            json={"workspace": payload, "revision": 0},
        )
    assert response.status_code == 422


def test_workspace_rejects_cross_currency_transfer() -> None:
    payload = workspace()
    payload["accounts"] = [
        {"id": "a", "title": "TJS", "opening": 0, "currency": "TJS"},
        {"id": "b", "title": "USD", "opening": 0, "currency": "USD"},
    ]
    payload["transactions"] = [
        {
            "id": "transfer",
            "kind": "transfer",
            "amount": 100,
            "date": "2026-09-28",
            "accountId": "a",
            "toAccountId": "b",
        }
    ]
    with TestClient(app) as client:
        response = client.put(
            "/api/v1/workspace",
            headers={"X-User-Id": f"test-{uuid4()}"},
            json={"workspace": payload, "revision": 0},
        )
    assert response.status_code == 422


def test_workspace_rejects_oversized_owner_identity() -> None:
    with TestClient(app) as client:
        response = client.get("/api/v1/workspace", headers={"X-User-Id": "x" * 256})
    assert response.status_code == 401


def test_writes_are_rate_limited_per_owner(monkeypatch) -> None:
    reset_rate_limits()
    monkeypatch.setattr(get_settings(), "write_rate_limit_per_minute", 2)
    headers = {"X-User-Id": f"test-{uuid4()}"}
    with TestClient(app) as client:
        codes = [
            client.put(
                "/api/v1/workspace", headers=headers, json={"workspace": workspace(), "revision": 0}
            ).status_code
            for _ in range(3)
        ]
        other = client.put(
            "/api/v1/workspace",
            headers={"X-User-Id": f"test-{uuid4()}"},
            json={"workspace": workspace(), "revision": 0},
        )
    assert codes == [200, 409, 429]
    assert other.status_code == 200
    reset_rate_limits()


def test_prayer_times_forward_the_requested_location(monkeypatch) -> None:
    seen: dict = {}

    class FakeResponse:
        def raise_for_status(self) -> None: ...

        def json(self) -> dict:
            return {"data": {"timings": {k: "05:00 (UTC)" for k in (
                "Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha")}}}

    class FakeClient:
        def __init__(self, **_: object) -> None: ...
        async def __aenter__(self) -> "FakeClient":
            return self
        async def __aexit__(self, *_: object) -> None: ...
        async def get(self, _url: str, params: dict) -> FakeResponse:
            seen.update(params)
            return FakeResponse()

    monkeypatch.setattr(api.httpx, "AsyncClient", FakeClient)
    with TestClient(app) as client:
        response = client.get(
            "/api/v1/prayer-times",
            params={"date": "2026-09-30", "city": "Istanbul", "country": "Turkey",
                    "method": 2, "school": 0},
            headers={"X-User-Id": f"test-{uuid4()}"},
        )
        bad = client.get(
            "/api/v1/prayer-times",
            params={"date": "2026-09-30", "method": 99},
            headers={"X-User-Id": f"test-{uuid4()}"},
        )
    assert seen == {"city": "Istanbul", "country": "Turkey", "method": 2, "school": 0}
    assert response.json()["method"] == "ISNA" and response.json()["school"] == "Shafi'i"
    assert response.json()["timings"]["Fajr"] == "05:00"
    assert bad.status_code == 422
