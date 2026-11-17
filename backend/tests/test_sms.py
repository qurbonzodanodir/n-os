from uuid import uuid4

from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import app
from app.ratelimit import reset_rate_limits


def owner_headers() -> dict[str, str]:
    return {"X-User-Id": f"test-{uuid4()}"}


def device_token(client: TestClient, headers: dict[str, str]) -> dict[str, str]:
    created = client.post("/api/v1/sms/token", headers=headers)
    assert created.status_code == 201
    return {"Authorization": f"Bearer {created.json()['token']}"}


def test_ingest_requires_a_valid_device_token() -> None:
    body = {"from": "Bank", "text": "Списание 10.00 TJS"}
    with TestClient(app) as client:
        assert client.post("/api/v1/sms/ingest", json=body).status_code == 401
        wrong = {"Authorization": "Bearer not-a-real-token"}
        assert client.post("/api/v1/sms/ingest", json=body, headers=wrong).status_code == 401
        # The owner header must not be accepted in place of a device token.
        response = client.post("/api/v1/sms/ingest", json=body, headers=owner_headers())
        assert response.status_code == 401


def test_forwarded_sms_reaches_the_owners_inbox() -> None:
    reset_rate_limits()
    headers = owner_headers()
    with TestClient(app) as client:
        device = device_token(client, headers)
        sent = client.post(
            "/api/v1/sms/ingest",
            headers=device,
            json={"from": "AlifBank", "text": "Оплата 125.50 TJS", "sentStamp": 1763290000000},
        )
        assert sent.status_code == 201
        assert sent.json()["duplicate"] is False

        inbox = client.get("/api/v1/sms", headers=headers).json()
        assert len(inbox) == 1
        assert inbox[0]["sender"] == "AlifBank"
        assert inbox[0]["body"] == "Оплата 125.50 TJS"
        assert inbox[0]["status"] == "new"
        assert inbox[0]["received_at"].startswith("2025-11-16")

        # Another owner sees nothing.
        assert client.get("/api/v1/sms", headers=owner_headers()).json() == []


def test_retried_sms_is_stored_once() -> None:
    reset_rate_limits()
    headers = owner_headers()
    body = {"sender": "Bank", "body": "Пополнение 50 TJS", "received_at": "2026-11-16T10:00:00Z"}
    with TestClient(app) as client:
        device = device_token(client, headers)
        first = client.post("/api/v1/sms/ingest", headers=device, json=body)
        second = client.post("/api/v1/sms/ingest", headers=device, json=body)
        assert first.status_code == 201
        assert second.status_code == 200
        assert second.json() == {"id": first.json()["id"], "duplicate": True}
        assert len(client.get("/api/v1/sms", headers=headers).json()) == 1


def test_unresolved_forwarder_placeholders_are_ignored() -> None:
    reset_rate_limits()
    headers = owner_headers()
    with TestClient(app) as client:
        device = device_token(client, headers)
        sent = client.post(
            "/api/v1/sms/ingest",
            headers=device,
            json={"from": "Bank", "text": "Код 1234", "sentStamp": "%sentStamp%"},
        )
        assert sent.status_code == 201


def test_ingest_validates_the_message() -> None:
    reset_rate_limits()
    headers = owner_headers()
    with TestClient(app) as client:
        device = device_token(client, headers)
        for body in (
            {"from": "", "text": "x"},
            {"from": "Bank", "text": "   "},
            {"from": "Bank", "text": "x" * 2_001},
            {"from": "Bank", "text": "x", "source": "email"},
        ):
            response = client.post("/api/v1/sms/ingest", headers=device, json=body)
            assert response.status_code == 422, body


def test_rotating_the_token_revokes_the_old_one() -> None:
    reset_rate_limits()
    headers = owner_headers()
    body = {"from": "Bank", "text": "Оплата 1 TJS"}
    with TestClient(app) as client:
        assert client.get("/api/v1/sms/token", headers=headers).json()["exists"] is False
        old = device_token(client, headers)
        new = device_token(client, headers)
        assert client.get("/api/v1/sms/token", headers=headers).json()["exists"] is True
        assert client.post("/api/v1/sms/ingest", headers=old, json=body).status_code == 401
        assert client.post("/api/v1/sms/ingest", headers=new, json=body).status_code == 201

        assert client.delete("/api/v1/sms/token", headers=headers).status_code == 204
        assert client.post("/api/v1/sms/ingest", headers=new, json=body).status_code == 401
        assert client.get("/api/v1/sms/token", headers=headers).json()["exists"] is False


def test_token_management_requires_the_owner() -> None:
    with TestClient(app) as client:
        assert client.post("/api/v1/sms/token").status_code == 401
        assert client.get("/api/v1/sms").status_code == 401


def test_owner_marks_messages_as_reviewed() -> None:
    reset_rate_limits()
    headers = owner_headers()
    with TestClient(app) as client:
        device = device_token(client, headers)
        message_id = client.post(
            "/api/v1/sms/ingest", headers=device, json={"from": "Bank", "text": "Оплата 9 TJS"}
        ).json()["id"]

        updated = client.patch(
            f"/api/v1/sms/{message_id}", headers=headers, json={"status": "imported"}
        )
        assert updated.status_code == 200
        assert updated.json()["status"] == "imported"
        assert client.get("/api/v1/sms", headers=headers).json() == []
        imported = client.get("/api/v1/sms?status=imported", headers=headers).json()
        assert [row["id"] for row in imported] == [message_id]

        stranger = client.patch(
            f"/api/v1/sms/{message_id}", headers=owner_headers(), json={"status": "dismissed"}
        )
        assert stranger.status_code == 404
        invalid = client.patch(
            f"/api/v1/sms/{message_id}", headers=headers, json={"status": "deleted"}
        )
        assert invalid.status_code == 422


def test_ingest_is_rate_limited_and_bounded(monkeypatch) -> None:
    reset_rate_limits()
    headers = owner_headers()
    with TestClient(app) as client:
        device = device_token(client, headers)
        monkeypatch.setattr(get_settings(), "sms_inbox_limit", 1)
        first = client.post("/api/v1/sms/ingest", headers=device, json={"from": "B", "text": "1"})
        assert first.status_code == 201
        full = client.post("/api/v1/sms/ingest", headers=device, json={"from": "B", "text": "2"})
        assert full.status_code == 409
        assert full.json()["detail"] == "inbox_full"

        # Two ingest calls are already in this minute's window.
        monkeypatch.setattr(get_settings(), "sms_rate_limit_per_minute", 2)
        limited = client.post("/api/v1/sms/ingest", headers=device, json={"from": "B", "text": "3"})
        assert limited.status_code == 429
    reset_rate_limits()
