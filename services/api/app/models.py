from typing import Literal

from pydantic import BaseModel, Field


class InteractionRequest(BaseModel):
    event: Literal["hover_enter", "manual_click"]
    pet_id: str = Field(min_length=1, max_length=64)
    client_id: str = Field(min_length=1, max_length=128)
    locale: str = Field(default="zh-CN", min_length=2, max_length=32)
    app_version: str = Field(min_length=1, max_length=32)


class InteractionResponse(BaseModel):
    message: str = Field(min_length=1, max_length=240)
    emotion: str = Field(min_length=1, max_length=32)
    animation: Literal["bounce", "nod", "wave"]
    display_ms: int = Field(ge=1_000, le=30_000)
    cooldown_ms: int = Field(ge=1_000, le=300_000)
    request_id: str


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
