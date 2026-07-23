from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class AlertItem(BaseModel):
    type: str
    level: str
    message: str
    city: str | None = None
    timestamp: str | None = None


class Air(BaseModel):
    aqi: int | None = None
    status: str = "Unknown"
    advice: str | None = None
    category: str | None = None
    dominant_pollutant: str | None = None


class Weather(BaseModel):
    temp: float | None = None
    condition: str = "Unknown"
    status: str = "Unknown"
    advice: str | None = None
    feels_like: float | None = None
    humidity: float | None = None


class Water(BaseModel):
    trend: str | None = None
    avg_tds: float | None = None
    avg_ph: float | None = None
    latest_tds: float | None = None
    latest_year: int | None = None
    sample_count: int | None = None
    year_count: int | None = None
    years: list[int] = Field(default_factory=list)
    status: str | None = None
    advisory: str | None = None


class Overall(BaseModel):
    verdict: str = "CAUTION"
    color: str = "yellow"
    summary: str = "Exercise caution."


class SafetyResponse(BaseModel):
    source: str = "live"
    cache_hit: bool = False
    city: str
    formatted_address: str | None = None
    coordinates: dict[str, float] | None = None
    geocoding: dict[str, Any] | None = None
    overall: Overall
    composite_score: int | None = None
    air: Air
    weather: Weather
    water: Water | None = None
    alerts: list[AlertItem] = Field(default_factory=list)
    prediction: str | None = None
    pollen: dict[str, Any] | None = None
    data_incomplete: bool = False


class AlertFeedResponse(BaseModel):
    active: list[AlertItem] = Field(default_factory=list)
    history: list[AlertItem] = Field(default_factory=list)
