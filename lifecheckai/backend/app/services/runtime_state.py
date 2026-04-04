from __future__ import annotations

from collections import defaultdict, deque
from datetime import datetime, timezone
from threading import Lock


_lock = Lock()
_aqi_history: dict[str, deque[int]] = defaultdict(lambda: deque(maxlen=12))
_snapshot_history: dict[str, deque[dict]] = defaultdict(lambda: deque(maxlen=240))
_alert_history: deque[dict] = deque(maxlen=200)
_active_alert_keys: set[tuple[str, str, str, str]] = set()


def record_aqi(city: str, aqi: int | None) -> list[int]:
    if aqi is None:
        return get_aqi_history(city)

    with _lock:
        history = _aqi_history[city.lower()]
        history.append(int(aqi))
        return list(history)


def get_aqi_history(city: str) -> list[int]:
    with _lock:
        return list(_aqi_history.get(city.lower(), ()))


def record_alerts(city: str, alerts: list[dict]) -> None:
    timestamp = datetime.now(timezone.utc).isoformat()
    city_key = city.lower()

    with _lock:
        fresh_keys: set[tuple[str, str, str, str]] = set()

        for alert in alerts:
            key = (
                city_key,
                alert.get("type", "general"),
                alert.get("level", "info"),
                alert.get("message", ""),
            )
            fresh_keys.add(key)

            if key in _active_alert_keys:
                continue

            _active_alert_keys.add(key)
            _alert_history.appendleft(
                {
                    **alert,
                    "city": city,
                    "timestamp": timestamp,
                }
            )

        stale_keys = {key for key in _active_alert_keys if key[0] == city_key and key not in fresh_keys}
        _active_alert_keys.difference_update(stale_keys)


def get_alert_history(limit: int = 40) -> list[dict]:
    with _lock:
        return list(_alert_history)[:limit]


def record_snapshot(city: str, snapshot: dict) -> None:
    timestamp = datetime.now(timezone.utc).isoformat()
    air = snapshot.get("air") if isinstance(snapshot.get("air"), dict) else {}
    weather = snapshot.get("weather") if isinstance(snapshot.get("weather"), dict) else {}
    water = snapshot.get("water") if isinstance(snapshot.get("water"), dict) else {}
    overall = snapshot.get("overall") if isinstance(snapshot.get("overall"), dict) else {}

    with _lock:
        _snapshot_history[city.lower()].append(
            {
                "timestamp": timestamp,
                "aqi": air.get("aqi"),
                "temperature": weather.get("temp"),
                "water_tds": water.get("latest_tds") or water.get("avg_tds"),
                "composite_score": snapshot.get("composite_score"),
                "status": overall.get("verdict"),
            }
        )


def get_snapshot_history(cities: list[str], limit: int = 60) -> dict[str, list[dict]]:
    with _lock:
        return {
            city: list(_snapshot_history.get(city.lower(), ()))[:limit]
            if city.lower() not in _snapshot_history
            else list(_snapshot_history[city.lower()])[-limit:]
            for city in cities
        }
