import json
import secrets
from threading import Lock
from pathlib import Path
from typing import Any
from uuid import uuid4

from .models import InteractionRequest, InteractionResponse

MESSAGE_FILE = Path(__file__).parent / "data" / "messages.json"
_selection_lock = Lock()
_last_message_by_client: dict[str, str] = {}


def _load_messages() -> list[dict[str, Any]]:
    """Load on every interaction so copy can change without a restart."""
    try:
        data = json.loads(MESSAGE_FILE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise RuntimeError(f"Unable to load interaction messages: {error}") from error

    if not isinstance(data, list) or not data:
        raise RuntimeError("Interaction message file must contain a non-empty JSON list")
    return data


def _select_fresh_message(
    client_id: str, messages: list[dict[str, Any]]
) -> dict[str, Any]:
    with _selection_lock:
        previous = _last_message_by_client.get(client_id)
        candidates = [item for item in messages if item.get("message") != previous]
        selected = secrets.choice(candidates or messages)
        _last_message_by_client[client_id] = selected["message"]
        return selected


def create_interaction(request: InteractionRequest) -> InteractionResponse:
    selected = _select_fresh_message(request.client_id, _load_messages())
    return InteractionResponse(
        message=selected["message"],
        emotion=selected.get("emotion", "calm"),
        animation=selected.get("animation", "nod"),
        display_ms=selected.get("display_ms", 4_500),
        cooldown_ms=selected.get("cooldown_ms", 10_000),
        request_id=str(uuid4()),
    )
