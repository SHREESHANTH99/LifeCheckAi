from __future__ import annotations

import math
from collections import deque
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, Field
from fastapi import APIRouter, Body, Path, Query
from lifecheckai.backend.app.services.db_service import get_all_cities

class PresencePayload(BaseModel):
    sessionId: str = Field(default="anonymous")
    city: str = Field(default="Unknown")
    lat: float = Field(default=0.0)
    lon: float = Field(default=0.0)
    timestamp: int | None = None
    avatar: str = Field(default="🛡️")

class CrowdReportPayload(BaseModel):
    sessionId: str = Field(default="anonymous")
    city: str = Field(default="Unknown")
    lat: float = Field(default=0.0)
    lon: float = Field(default=0.0)
    type: str = Field(default="road_block")
    description: str = Field(default="")

router = APIRouter(prefix="/realtime", tags=["Realtime"])

PRESENCE_TTL_MS = 30_000
REPORT_TTL_MS = 24 * 60 * 60 * 1000

presence_store: dict[str, dict[str, Any]] = {}
crowd_reports: list[dict[str, Any]] = []
activity_ring: deque[dict[str, Any]] = deque(maxlen=100)


def _now_ms() -> int:
    import time

    return int(time.time() * 1000)


def _add_activity(event_type: str, city: str, session_id: str, avatar: str, message: str) -> None:
    activity_ring.appendleft(
        {
            "id": str(uuid4()),
            "type": event_type,
            "city": city,
            "sessionId": session_id,
            "avatar": avatar,
            "message": message,
            "timestamp": _now_ms(),
        }
    )


def _distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return radius * c


def _purge_expired_presence() -> None:
    now = _now_ms()
    expired = [sid for sid, row in presence_store.items() if now - int(row.get("timestamp", 0)) > PRESENCE_TTL_MS]
    for sid in expired:
        presence_store.pop(sid, None)


def _purge_expired_reports() -> None:
    now = _now_ms()
    crowd_reports[:] = [row for row in crowd_reports if now - int(row.get("timestamp", 0)) <= REPORT_TTL_MS]


@router.post("/presence")
def post_presence(payload: PresencePayload):
    try:
        session_id = payload.sessionId
        row = {
            "sessionId": session_id,
            "city": payload.city,
            "lat": payload.lat,
            "lon": payload.lon,
            "timestamp": payload.timestamp or _now_ms(),
            "avatar": payload.avatar,
        }
        presence_store[session_id] = row
        _add_activity("city_check", row["city"], session_id, row["avatar"], f"{row['city']} checked")
        return {"ok": True}
    except Exception:
        return {"ok": True}

@router.get("/presence")
def get_presence():
    try:
        _purge_expired_presence()
        return list(presence_store.values())
    except Exception:
        return []


@router.post("/crowd-report")
def post_crowd_report(payload: CrowdReportPayload):
    try:
        row = {
            "id": str(uuid4()),
            "sessionId": payload.sessionId,
            "city": payload.city,
            "lat": payload.lat,
            "lon": payload.lon,
            "type": payload.type,
            "description": payload.description,
            "upvotes": 0,
            "timestamp": _now_ms(),
        }
        crowd_reports.insert(0, row)
        _add_activity(
            "crowd_report",
            row["city"],
            row["sessionId"],
            "⚡",
            f"Crowd report in {row['city']} ({row['type']})",
        )
        return row
    except Exception:
        return {
            "id": "fallback",
            "sessionId": "anonymous",
            "city": "Unknown",
            "lat": 0,
            "lon": 0,
            "type": "road_block",
            "description": "",
            "upvotes": 0,
            "timestamp": _now_ms(),
        }


@router.get("/crowd-reports")
def get_crowd_reports(
    lat: float | None = Query(None),
    lon: float | None = Query(None),
    radius_km: float = Query(50),
):
    try:
        _purge_expired_reports()
        if lat is None or lon is None:
            return sorted(crowd_reports, key=lambda row: row.get("timestamp", 0), reverse=True)

        filtered = [
            row
            for row in crowd_reports
            if _distance_km(lat, lon, float(row.get("lat", 0)), float(row.get("lon", 0))) <= radius_km
        ]
        return sorted(filtered, key=lambda row: row.get("timestamp", 0), reverse=True)
    except Exception:
        return []


@router.get("/activity")
def get_activity(limit: int = Query(20, ge=1, le=100)):
    try:
        return list(activity_ring)[:limit]
    except Exception:
        return []


@router.put("/crowd-report/{report_id}/upvote")
def upvote_crowd_report(report_id: str = Path(...)):
    try:
        for row in crowd_reports:
            if str(row.get("id")) == report_id:
                row["upvotes"] = int(row.get("upvotes", 0)) + 1
                return row
        return {
            "id": report_id,
            "upvotes": 0,
        }
    except Exception:
        return {
            "id": report_id,
            "upvotes": 0,
        }

@router.get("/snapshot")
def snapshot():
    """
    Returns latest snapshot of all cities.
    Frontend polls this every 60s for live updates.
    """
    return {
        "cities": get_all_cities()
    }