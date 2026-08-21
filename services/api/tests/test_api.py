from fastapi.testclient import TestClient

from app import interaction_service
from app.main import app
from app.models import InteractionRequest

client = TestClient(app)


def test_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_hover_interaction_matches_contract() -> None:
    response = client.post(
        "/api/v1/interactions",
        json={
            "event": "hover_enter",
            "pet_id": "default",
            "client_id": "test-client",
            "locale": "zh-CN",
            "app_version": "0.1.0",
        },
    )
    payload = response.json()

    assert response.status_code == 200
    assert payload["message"]
    assert payload["animation"] in {"bounce", "nod", "wave"}
    assert 1_000 <= payload["display_ms"] <= 30_000
    assert 1_000 <= payload["cooldown_ms"] <= 300_000
    assert payload["request_id"]


def test_unknown_event_is_rejected() -> None:
    response = client.post(
        "/api/v1/interactions",
        json={
            "event": "mouse_move",
            "pet_id": "default",
            "client_id": "test-client",
            "locale": "zh-CN",
            "app_version": "0.1.0",
        },
    )
    assert response.status_code == 422


def test_manual_click_returns_new_copy() -> None:
    request = {
        "event": "manual_click",
        "pet_id": "default",
        "client_id": "manual-click-client",
        "locale": "zh-CN",
        "app_version": "0.1.0",
    }

    first = client.post("/api/v1/interactions", json=request)
    second = client.post("/api/v1/interactions", json=request)

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["message"] != second.json()["message"]


def test_message_copy_is_reloaded_without_restart(tmp_path, monkeypatch) -> None:
    message_file = tmp_path / "messages.json"
    monkeypatch.setattr(interaction_service, "MESSAGE_FILE", message_file)
    request = InteractionRequest(
        event="hover_enter",
        pet_id="default",
        client_id="test-client",
        locale="zh-CN",
        app_version="0.1.0",
    )

    message_file.write_text(
        '[{"message":"第一条","animation":"nod"}]', encoding="utf-8"
    )
    first = interaction_service.create_interaction(request)

    message_file.write_text(
        '[{"message":"更新后的文案","animation":"wave"}]', encoding="utf-8"
    )
    second = interaction_service.create_interaction(request)

    assert first.message == "第一条"
    assert second.message == "更新后的文案"
    assert second.animation == "wave"
