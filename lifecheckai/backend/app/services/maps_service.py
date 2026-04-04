from __future__ import annotations

import re
from functools import lru_cache
from typing import Any

import requests

from lifecheckai.backend.app.config import GEOCODING_COUNTRY, GEOCODING_REGION, GOOGLE_API_KEY

GEOCODING_URL = "https://maps.googleapis.com/maps/api/geocode/json"
REVERSE_GEOCODING_URL = "https://maps.googleapis.com/maps/api/geocode/json"

MOCK_COORDS = {
    "delhi": {"lat": 28.6139, "lon": 77.2090, "formatted_address": "New Delhi, Delhi, India"},
    "mumbai": {"lat": 19.0760, "lon": 72.8777, "formatted_address": "Mumbai, Maharashtra, India"},
    "bangalore": {"lat": 12.9716, "lon": 77.5946, "formatted_address": "Bengaluru, Karnataka, India"},
    "chennai": {"lat": 13.0827, "lon": 80.2707, "formatted_address": "Chennai, Tamil Nadu, India"},
    "kolkata": {"lat": 22.5726, "lon": 88.3639, "formatted_address": "Kolkata, West Bengal, India"},
    "pune": {"lat": 18.5204, "lon": 73.8567, "formatted_address": "Pune, Maharashtra, India"},
    "hyderabad": {"lat": 17.3850, "lon": 78.4867, "formatted_address": "Hyderabad, Telangana, India"},
}

INDIA_STATES_AND_UTS = [
    "Andhra Pradesh",
    "Arunachal Pradesh",
    "Assam",
    "Bihar",
    "Chhattisgarh",
    "Goa",
    "Gujarat",
    "Haryana",
    "Himachal Pradesh",
    "Jharkhand",
    "Karnataka",
    "Kerala",
    "Madhya Pradesh",
    "Maharashtra",
    "Manipur",
    "Meghalaya",
    "Mizoram",
    "Nagaland",
    "Odisha",
    "Punjab",
    "Rajasthan",
    "Sikkim",
    "Tamil Nadu",
    "Telangana",
    "Tripura",
    "Uttar Pradesh",
    "Uttarakhand",
    "West Bengal",
    "Andaman and Nicobar Islands",
    "Chandigarh",
    "Dadra and Nagar Haveli and Daman and Diu",
    "Delhi",
    "Jammu and Kashmir",
    "Ladakh",
    "Lakshadweep",
    "Puducherry",
]


def _clean_query(city: str) -> str:
    cleaned = re.sub(r"\s+", " ", city.strip())
    return cleaned


def _safe_str(value: Any) -> str:
    return value if isinstance(value, str) else ""


def _result_score(result: dict, cleaned_query: str) -> float:
    types = result.get("types") or []
    components = result.get("address_components") or []
    formatted_address = _safe_str(result.get("formatted_address")).lower()

    score = 0.0

    if "locality" in types:
        score += 4.0
    if "administrative_area_level_2" in types:
        score += 2.0
    if "administrative_area_level_1" in types:
        score += 1.5
    if "country" in types:
        score -= 3.0

    location_type = _safe_str((result.get("geometry") or {}).get("location_type"))
    if location_type == "ROOFTOP":
        score += 1.5
    elif location_type == "RANGE_INTERPOLATED":
        score += 0.8

    if result.get("partial_match"):
        score -= 1.2

    query_lower = cleaned_query.lower()
    if query_lower and query_lower in formatted_address:
        score += 2.0

    for component in components:
        long_name = _safe_str(component.get("long_name")).lower()
        short_name = _safe_str(component.get("short_name")).lower()
        c_types = component.get("types") or []
        if query_lower and (query_lower == long_name or query_lower == short_name):
            score += 1.8
            if "locality" in c_types:
                score += 1.2

    return score


def _best_result(results: list[dict], cleaned_query: str) -> dict | None:
    if not results:
        return None

    ranked = sorted(results, key=lambda row: _result_score(row, cleaned_query), reverse=True)
    return ranked[0]


def _confidence_from_result(result: dict, cleaned_query: str) -> float:
    score = _result_score(result, cleaned_query)
    normalized = max(0.0, min(1.0, (score + 1.0) / 8.0))
    return round(normalized, 2)


def _mock_payload(city: str) -> dict | None:
    key = city.strip().lower()
    if key in MOCK_COORDS:
        row = MOCK_COORDS[key]
        return {
            **row,
            "geocoding": {
                "provider": "mock",
                "match": "city_seed",
                "confidence": 0.55,
                "source": "mock_fallback",
            },
        }

    if key:
        return {
            "lat": 20.0,
            "lon": 78.0,
            "formatted_address": city,
            "geocoding": {
                "provider": "mock",
                "match": "unknown_seed",
                "confidence": 0.2,
                "source": "mock_default",
            },
        }

    return None


def _request_geocode(params: dict) -> dict | None:
    for _ in range(2):
        try:
            response = requests.get(GEOCODING_URL, params=params, timeout=6)
            response.raise_for_status()
            return response.json()
        except Exception:
            continue
    return None


@lru_cache(maxsize=512)
def _get_coordinates_cached(cleaned_city: str) -> dict | None:
    if not GOOGLE_API_KEY or GOOGLE_API_KEY == "dummy":
        return _mock_payload(cleaned_city)

    params = {
        "address": cleaned_city,
        "key": GOOGLE_API_KEY,
        "region": GEOCODING_REGION,
    }

    if GEOCODING_COUNTRY:
        params["components"] = f"country:{GEOCODING_COUNTRY}"

    data = _request_geocode(params)
    if not data:
        return _mock_payload(cleaned_city)

    status = data.get("status")
    if status != "OK":
        if status == "ZERO_RESULTS":
            relaxed_params = {
                "address": cleaned_city,
                "key": GOOGLE_API_KEY,
                "region": GEOCODING_REGION,
            }
            data = _request_geocode(relaxed_params)
            if not data or data.get("status") != "OK":
                return _mock_payload(cleaned_city)
        else:
            return _mock_payload(cleaned_city)

    results = data.get("results") or []
    result = _best_result(results, cleaned_city)
    if not result:
        return _mock_payload(cleaned_city)

    location = (result.get("geometry") or {}).get("location") or {}
    lat = location.get("lat")
    lon = location.get("lng")
    if lat is None or lon is None:
        return _mock_payload(cleaned_city)

    confidence = _confidence_from_result(result, cleaned_city)

    return {
        "lat": lat,
        "lon": lon,
        "formatted_address": result.get("formatted_address", cleaned_city),
        "geocoding": {
            "provider": "google",
            "match": "exact" if confidence >= 0.85 else "approximate",
            "confidence": confidence,
            "place_id": result.get("place_id"),
            "location_type": _safe_str((result.get("geometry") or {}).get("location_type")),
            "types": result.get("types") or [],
            "source": "google_geocoding",
        },
    }


def get_coordinates(city: str) -> dict | None:
    cleaned_city = _clean_query(city)
    if not cleaned_city:
        return None

    payload = _get_coordinates_cached(cleaned_city)
    if not payload:
        return None
    return dict(payload)


def get_place_from_coordinates(lat: float, lon: float) -> dict | None:
    if not GOOGLE_API_KEY or GOOGLE_API_KEY == "dummy":
        return {
            "city": "Current Location",
            "formatted_address": f"{lat:.4f}, {lon:.4f}",
            "geocoding": {
                "provider": "mock",
                "match": "approximate",
                "confidence": 0.5,
                "source": "coords_fallback",
            },
        }

    try:
        params = {
            "latlng": f"{lat},{lon}",
            "key": GOOGLE_API_KEY,
            "result_type": "locality|administrative_area_level_2|administrative_area_level_1",
            "region": GEOCODING_REGION,
        }
        response = requests.get(REVERSE_GEOCODING_URL, params=params, timeout=6)
        response.raise_for_status()
        data = response.json()
        if data.get("status") != "OK":
            return None

        result = (data.get("results") or [{}])[0]
        components = result.get("address_components") or []

        city = None
        for component in components:
            c_types = component.get("types") or []
            if "locality" in c_types:
                city = component.get("long_name")
                break
            if "administrative_area_level_2" in c_types and not city:
                city = component.get("long_name")

        return {
            "city": city or "Current Location",
            "formatted_address": result.get("formatted_address", f"{lat:.4f}, {lon:.4f}"),
            "geocoding": {
                "provider": "google",
                "match": "reverse_geocode",
                "confidence": 0.82,
                "place_id": result.get("place_id"),
                "types": result.get("types") or [],
                "source": "google_reverse_geocoding",
            },
        }
    except Exception:
        return None


def suggest_locations(query: str, limit: int = 8) -> list[dict]:
    cleaned_query = _clean_query(query)
    if not cleaned_query:
        return []

    safe_limit = max(1, min(limit, 12))

    state_fallback = [
        {
            "city": state,
            "formatted_address": f"{state}, India",
            "lat": None,
            "lon": None,
            "confidence": 0.45,
        }
        for state in INDIA_STATES_AND_UTS
        if cleaned_query.lower() in state.lower()
    ]

    if not GOOGLE_API_KEY or GOOGLE_API_KEY == "dummy":
        matches = []
        for name, row in MOCK_COORDS.items():
            if cleaned_query.lower() in name:
                matches.append(
                    {
                        "city": name.title(),
                        "formatted_address": row.get("formatted_address") or name.title(),
                        "lat": row.get("lat"),
                        "lon": row.get("lon"),
                        "confidence": 0.5,
                    }
                )
        return (state_fallback + matches)[:safe_limit]

    params = {
        "address": cleaned_query,
        "key": GOOGLE_API_KEY,
        "region": GEOCODING_REGION,
    }
    if GEOCODING_COUNTRY:
        params["components"] = f"country:{GEOCODING_COUNTRY}"

    data = _request_geocode(params)
    if not data or data.get("status") != "OK":
        return []

    results = data.get("results") or []
    ranked = sorted(results, key=lambda row: _result_score(row, cleaned_query), reverse=True)
    suggestions: list[dict] = []

    for result in ranked[: safe_limit * 2]:
        geometry = (result.get("geometry") or {}).get("location") or {}
        lat = geometry.get("lat")
        lon = geometry.get("lng")
        if lat is None or lon is None:
            continue

        components = result.get("address_components") or []
        city_name = None
        for component in components:
            c_types = component.get("types") or []
            if "locality" in c_types:
                city_name = component.get("long_name")
                break
            if "administrative_area_level_2" in c_types and not city_name:
                city_name = component.get("long_name")

        formatted = _safe_str(result.get("formatted_address"))
        city_value = _safe_str(city_name) or (formatted.split(",")[0].strip() if formatted else cleaned_query)
        confidence = _confidence_from_result(result, cleaned_query)

        suggestions.append(
            {
                "city": city_value,
                "formatted_address": formatted or city_value,
                "lat": lat,
                "lon": lon,
                "confidence": confidence,
                "place_id": result.get("place_id"),
            }
        )

    deduped = []
    for item in suggestions:
        signature = f"{item.get('city','').lower()}::{item.get('formatted_address','').lower()}"
        if any(
            f"{row.get('city','').lower()}::{row.get('formatted_address','').lower()}" == signature
            for row in deduped
        ):
            continue
        deduped.append(item)

    if len(deduped) < safe_limit:
        for state in state_fallback:
            signature = f"{state.get('city', '').lower()}::{state.get('formatted_address', '').lower()}"
            if any(
                f"{row.get('city', '').lower()}::{row.get('formatted_address', '').lower()}" == signature
                for row in deduped
            ):
                continue
            deduped.append(state)
            if len(deduped) >= safe_limit:
                break

    return deduped[:safe_limit]
