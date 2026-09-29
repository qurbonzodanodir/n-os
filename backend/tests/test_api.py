from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app


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
