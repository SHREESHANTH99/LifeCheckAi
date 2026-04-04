from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class StructuredAnswer(BaseModel):
    summary: str
    air: str
    weather: str
    water: str
    action: str


class ChatLocation(BaseModel):
    requested: str | None = None
    resolved_city: str | None = None
    groundwater_state: str | None = None
    formatted_address: str | None = None


class ChatModelMeta(BaseModel):
    provider: str
    used_ai: bool
    fallback_used: bool


class ChatResponse(BaseModel):
    query: str
    answer: str
    confidence: int
    intent: str
    location: ChatLocation
    source: dict[str, Any] = Field(default_factory=dict)
    safety_override: dict[str, Any] | None = None
    structured_answer: StructuredAnswer
    model: ChatModelMeta
    user_profile: dict[str, Any] | None = None
    action_type: str = "general"
    safety_guard_triggered: bool = False
    blocked_reason: str | None = None
    location_extracted: str | None = None
    intent_detected: str | None = None
