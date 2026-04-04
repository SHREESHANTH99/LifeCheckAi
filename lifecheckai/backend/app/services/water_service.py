from __future__ import annotations

import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from difflib import SequenceMatcher, get_close_matches
from functools import lru_cache
from pathlib import Path
from statistics import mean
from typing import Any

import pandas as pd

from lifecheckai.backend.app.services.maps_service import (
    calculate_distance,
    get_coordinates,
    get_place_from_coordinates,
)
from lifecheckai.backend.app.utils.parser import CITY_TO_STATE, extract_state_from_text

DATA_PATH = Path(__file__).resolve().parents[2] / "data"
DATA_GLOB = "water_quality_clean_*.csv"

PARAM_NAMES = [
    "temperature",
    "ph",
    "conductivity",
    "bod",
    "nitrate",
    "fecal_coliform",
    "total_coliform",
    "tds",
    "fluoride",
    "arsenic",
]

PARAMETER_COLUMN_MAP = {
    "temperature": "Temp_Mean",
    "ph": "pH_Mean",
    "conductivity": "Conductivity_Mean",
    "bod": "BOD_Mean",
    "nitrate": "NitrateN_NitriteN_Mean",
    "fecal_coliform": "Fecal_Coliform_Mean",
    "total_coliform": "Total_Coliform_Mean",
    "tds": "TDS_Mean",
    "fluoride": "Fluoride_Mean",
    "arsenic": "Arsenic_Mean",
}

PARAMETER_RANGE_COLUMN_MAP = {
    "temperature": ("Temp_Min_C", "Temp_Max_C"),
    "ph": ("pH_Min", "pH_Max"),
    "conductivity": ("Conductivity_Min", "Conductivity_Max"),
    "bod": ("BOD_Min", "BOD_Max"),
    "nitrate": ("NitrateN_NitriteN_Min", "NitrateN_NitriteN_Max"),
    "fecal_coliform": ("Fecal_Coliform_Min", "Fecal_Coliform_Max"),
    "total_coliform": ("Total_Coliform_Min", "Total_Coliform_Max"),
    "tds": ("TDS_Min", "TDS_Max"),
    "fluoride": ("Fluoride_Min", "Fluoride_Max"),
    "arsenic": ("Arsenic_Min", "Arsenic_Max"),
}

NUMERIC_COLUMNS = [
    "Year",
    "STN_Code",
    "Temp_Min_C",
    "Temp_Max_C",
    "pH_Min",
    "pH_Max",
    "Conductivity_Min",
    "Conductivity_Max",
    "BOD_Min",
    "BOD_Max",
    "NitrateN_NitriteN_Min",
    "NitrateN_NitriteN_Max",
    "Fecal_Coliform_Min",
    "Fecal_Coliform_Max",
    "Total_Coliform_Min",
    "Total_Coliform_Max",
    "TDS_Min",
    "TDS_Max",
    "Fluoride_Min",
    "Fluoride_Max",
    "Arsenic_Min",
    "Arsenic_Max",
    "Temp_Mean",
    "Temp_Exceeds_BIS",
    "pH_Mean",
    "pH_Exceeds_BIS",
    "Conductivity_Mean",
    "BOD_Mean",
    "NitrateN_NitriteN_Mean",
    "NitrateN_NitriteN_Exceeds_BIS",
    "Fecal_Coliform_Mean",
    "Total_Coliform_Mean",
    "TDS_Mean",
    "TDS_Exceeds_BIS",
    "Fluoride_Mean",
    "Fluoride_Exceeds_BIS",
    "Arsenic_Mean",
    "Arsenic_Exceeds_BIS",
]


def _normalize_text(value: str | None) -> str:
    if value is None:
        return ""
    return re.sub(r"[^a-z0-9]+", " ", str(value).lower()).strip()


def _tokenize(value: str | None) -> list[str]:
    normalized = _normalize_text(value)
    return [token for token in normalized.split() if len(token) > 1]


def _safe_float(value: Any) -> float | None:
    if value is None or pd.isna(value):
        return None
    return round(float(value), 4)


def _format_station_code(value: Any) -> str:
    if value is None or pd.isna(value):
        return ""

    try:
        return str(int(float(value)))
    except (TypeError, ValueError):
        return str(value).strip()


def _clean_location_name(value: Any, state_name: str = "") -> str:
    """Removes redundant dashes, repeated state names, and cleans up spacing."""
    if value is None or pd.isna(value):
        return ""

    text = str(value).strip()
    # Aggressively remove leading/trailing non-alphanumeric junk
    text = re.sub(r"^[^a-zA-Z0-9]+", "", text)
    text = re.sub(r"[^a-zA-Z0-9]+$", "", text)

    if state_name:
        upper_state = state_name.upper().strip()
        # Remove "DELHI DELHI" pattern
        text = text.replace(f"{upper_state} {upper_state}", upper_state)
        
        # Remove state name at the end if redundant (case-insensitive)
        text = re.sub(rf"[, ]+{re.escape(upper_state)}$", "", text, flags=re.IGNORECASE).strip()

    # Final cleanup of multiple spaces/dashes
    text = re.sub(r"[\s]{2,}", " ", text)
    text = re.sub(r"-{2,}", "-", text)
    return text.strip()


def _score_station_name(query: str, station_name: str, station_code: str | None = None) -> float:
    normalized_query = _normalize_text(query)
    normalized_station = _normalize_text(station_name)

    if not normalized_query or not normalized_station:
        return 0.0

    if station_code and normalized_query == _normalize_text(station_code):
        return 1.0

    if normalized_query == normalized_station:
        return 0.98

    if normalized_query in normalized_station or normalized_station in normalized_query:
        return 0.92

    query_tokens = set(_tokenize(query))
    station_tokens = set(_tokenize(station_name))
    token_overlap = len(query_tokens & station_tokens) / max(1, len(query_tokens))
    text_ratio = SequenceMatcher(None, normalized_query, normalized_station).ratio()

    score = float(max(text_ratio * 0.8 + token_overlap * 0.4, token_overlap * 0.9))
    return float(f"{score:.4f}")


def _dataset_paths() -> list[Path]:
    return sorted(DATA_PATH.glob(DATA_GLOB))


def _station_preview(station: dict, *, include_distance: bool = True) -> dict:
    payload = {
        "id": station["id"],
        "code": station.get("code"),
        "name": station["name"],
        "sample_count": station["sample_count"],
        "latest_year": station.get("latest_year"),
        "years": station["years"],
    }
    if include_distance:
        payload["distance_km"] = station.get("distance_km")
    return payload


@lru_cache(maxsize=1)
def get_dataset_years() -> list[int]:
    frame = get_water_dataframe()
    if frame.empty:
        return []
    return sorted(int(year) for year in frame["Year"].dropna().astype(int).unique().tolist())


@lru_cache(maxsize=1)
def get_water_dataframe() -> pd.DataFrame:
    frames: list[pd.DataFrame] = []

    for path in _dataset_paths():
        year_match = re.search(r"(\d{4})", path.stem)
        fallback_year = int(year_match.group(1)) if year_match else None

        frame = pd.read_csv(path, low_memory=False)
        if "Year" not in frame.columns and fallback_year is not None:
            frame["Year"] = fallback_year

        for column in NUMERIC_COLUMNS:
            if column in frame.columns:
                frame[column] = pd.to_numeric(frame[column], errors="coerce")

        frame["State"] = frame.get("State", "").fillna("").astype(str).str.strip()
        frame["Monitoring_Location"] = frame.apply(
            lambda row: _clean_location_name(row.get("Monitoring_Location"), row.get("State", "")),
            axis=1,
        )
        frame["Station_Code"] = frame.get("STN_Code", "").map(_format_station_code)

        frame["station_key"] = frame["Station_Code"]
        missing_keys = frame["station_key"].eq("")
        frame.loc[missing_keys, "station_key"] = frame.loc[missing_keys, "Monitoring_Location"].map(
            _normalize_text
        )
        still_missing = frame["station_key"].eq("")
        frame.loc[still_missing, "station_key"] = (
            "station-" + frame.loc[still_missing].index.astype(str)
        )

        missing_location = frame["Monitoring_Location"].eq("")
        frame.loc[missing_location, "Monitoring_Location"] = frame.loc[missing_location, "Station_Code"].map(
            lambda value: f"Station {value}" if value else "Unknown monitoring location"
        )

        frames.append(frame)

    if not frames:
        return pd.DataFrame()

    water = pd.concat(frames, ignore_index=True)
    water = water[water["State"].str.len() > 0].copy()
    water["Year"] = water["Year"].astype("Int64")
    water = water.drop_duplicates(
        subset=["Year", "State", "station_key", "Monitoring_Location"],
        keep="last",
    )
    return water.reset_index(drop=True)


@lru_cache(maxsize=1)
def _state_lookup() -> dict[str, str]:
    frame = get_water_dataframe()
    states = sorted(str(state).strip() for state in frame["State"].dropna().unique().tolist())
    return {_normalize_text(state): state for state in states}


@lru_cache(maxsize=1)
def get_state_catalog() -> list[dict]:
    frame = get_water_dataframe()
    if frame.empty:
        return []

    states: list[dict] = []
    for state, group in frame.groupby("State"):
        years = sorted(int(year) for year in group["Year"].dropna().astype(int).unique().tolist())
        states.append(
            {
                "name": state,
                "sample_count": int(len(group)),
                "station_count": int(group["station_key"].nunique()),
                "years": years,
            }
        )

    return sorted(states, key=lambda item: item["name"].lower())


def get_available_states() -> list[str]:
    return [state["name"] for state in get_state_catalog()]


def resolve_state_name(place: str | None, formatted_address: str | None = None) -> str | None:
    state_lookup = _state_lookup()

    for text in (formatted_address, place):
        extracted = extract_state_from_text(text)
        if extracted:
            return extracted

    if place:
        normalized_place = _normalize_text(place)
        if normalized_place in state_lookup:
            return state_lookup[normalized_place]

        if place:
            mapped_state = CITY_TO_STATE.get(place.strip().lower())
            if mapped_state:
                return mapped_state

        close_match = get_close_matches(normalized_place, list(state_lookup.keys()), n=1, cutoff=0.75)
        if close_match:
            return state_lookup[close_match[0]]

    return None


def _choose_station_name(group: pd.DataFrame) -> str:
    candidates = group[["Year", "Monitoring_Location"]].dropna()
    if candidates.empty:
        return group.get("Station_Code", pd.Series(dtype=str)).astype(str).iloc[0]

    ranked = (
        candidates.assign(name=candidates["Monitoring_Location"].astype(str).str.strip())
        .groupby("name")
        .agg(latest_year=("Year", "max"), frequency=("Year", "count"))
        .reset_index()
    )
    ranked["length"] = ranked["name"].str.len()
    best = ranked.sort_values(
        by=["latest_year", "frequency", "length", "name"],
        ascending=[False, False, False, True],
    ).iloc[0]
    return str(best["name"]).strip()


@lru_cache(maxsize=1)
def _station_catalog_by_state() -> dict[str, list[dict]]:
    frame = get_water_dataframe()
    if frame.empty:
        return {}

    catalog: dict[str, list[dict]] = {}
    for state, state_frame in frame.groupby("State"):
        items: list[dict] = []
        for station_key, group in state_frame.groupby("station_key"):
            years = sorted(int(year) for year in group["Year"].dropna().astype(int).unique().tolist())
            station_code = next(
                (value for value in group["Station_Code"].astype(str).tolist() if value and value != "nan"),
                None,
            )
            items.append(
                {
                    "id": station_key,
                    "code": station_code,
                    "name": _choose_station_name(group),
                    "sample_count": int(len(group)),
                    "latest_year": max(years) if years else None,
                    "years": years,
                }
            )

        catalog[state] = sorted(items, key=lambda item: item["name"].lower())

    return catalog


def get_station_options(state: str) -> list[dict]:
    resolved_state = resolve_state_name(state)
    if not resolved_state:
        return []

    stations = _station_catalog_by_state().get(resolved_state, [])
    return [_station_preview(station, include_distance=False) for station in stations]


def get_stations_for_state(state: str) -> list[str]:
    return [station["name"] for station in get_station_options(state)]


def _rank_stations(state: str, queries: list[str], limit: int = 12) -> list[dict]:
    catalog = _station_catalog_by_state().get(state, [])
    if not catalog:
        return []

    ranked: list[tuple[float, dict]] = []
    for station in catalog:
        best_score = max(
            (_score_station_name(query, station["name"], station.get("code")) for query in queries if query),
            default=0.0,
        )
        if best_score <= 0:
            continue
        ranked.append((best_score, station))

    def _get_sort_key(item: Any) -> tuple[float, str]:
        score, station = item
        name = str(station.get("name", "")).lower()
        return (-float(score), name)

    ranked.sort(key=_get_sort_key)
    return [station for _, station in ranked[:limit]]


def resolve_station(state: str, station_id: str | None = None, location: str | None = None) -> tuple[dict | None, list[dict]]:
    resolved_state = resolve_state_name(state)
    if not resolved_state:
        return None, []

    catalog = _station_catalog_by_state().get(resolved_state, [])
    if not catalog:
        return None, []

    if station_id:
        for station in catalog:
            if station["id"] == station_id or (station.get("code") and station["code"] == station_id):
                return station, [station]

    if not location:
        return None, []

    normalized_query = _normalize_text(location)
    for station in catalog:
        if normalized_query == _normalize_text(station["name"]):
            return station, [station]
        if station.get("code") and normalized_query == _normalize_text(station["code"]):
            return station, [station]

    ranked = _rank_stations(resolved_state, [location], limit=5)
    if not ranked:
        return None, []

    best_station = ranked[0]
    best_score = _score_station_name(location, best_station["name"], best_station.get("code"))
    if best_score >= 0.42:
        return best_station, ranked

    return None, ranked


def _build_selection_payload(
    *,
    state: str,
    frame: pd.DataFrame,
    scope: str,
    matched_station: dict | None = None,
    nearby_stations: list[dict] | None = None,
    matched_location: str | None = None,
    distance_km: float | None = None,
    resolved_place: dict | None = None,
) -> dict:
    return {
        "state": state,
        "frame": frame.copy(),
        "scope": scope,
        "matched_station": matched_station,
        "nearby_stations": nearby_stations or [],
        "matched_location": matched_location,
        "distance_km": round(distance_km, 2) if distance_km is not None else None,
        "resolved_place": resolved_place,
    }


def select_records(state: str, station_id: str | None = None, location: str | None = None) -> dict | None:
    resolved_state = resolve_state_name(state)
    if not resolved_state:
        return None

    frame = get_water_dataframe()
    state_frame = frame[frame["State"] == resolved_state].copy()
    if state_frame.empty:
        return None

    if not station_id and not location:
        default_stations = [
            _station_preview(station, include_distance=False)
            for station in _station_catalog_by_state().get(resolved_state, [])[:5]
        ]
        return _build_selection_payload(
            state=resolved_state,
            frame=state_frame,
            scope="state",
            nearby_stations=default_stations,
        )

    matched_station, ranked = resolve_station(resolved_state, station_id=station_id, location=location)
    if matched_station:
        station_frame = state_frame[state_frame["station_key"] == matched_station["id"]].copy()
        nearby = [_station_preview(matched_station, include_distance=False)]
        return _build_selection_payload(
            state=resolved_state,
            frame=station_frame,
            scope="station",
            matched_station=matched_station,
            matched_location=matched_station["name"],
            nearby_stations=nearby,
        )

    return _build_selection_payload(
        state=resolved_state,
        frame=state_frame,
        scope="state",
        nearby_stations=[_station_preview(station, include_distance=False) for station in ranked],
    )


@lru_cache(maxsize=4096)
def _station_coordinates(state: str, station_name: str) -> dict | None:
    coords = get_coordinates(f"{station_name}, {state}, India")
    if not coords or coords.get("lat") is None or coords.get("lon") is None:
        return None

    geocoding = coords.get("geocoding") or {}
    if geocoding.get("provider") == "mock" and geocoding.get("source") == "mock_default":
        return None

    return {
        "lat": float(coords["lat"]),
        "lon": float(coords["lon"]),
        "formatted_address": coords.get("formatted_address"),
        "confidence": geocoding.get("confidence"),
    }


def select_records_by_coordinates(lat: float, lon: float) -> dict | None:
    resolved_place = get_place_from_coordinates(lat, lon) or {}
    state = resolve_state_name(
        str(resolved_place.get("city") or ""),
        str(resolved_place.get("formatted_address") or ""),
    )
    if not state:
        return None

    frame = get_water_dataframe()
    state_frame = frame[frame["State"] == state].copy()
    if state_frame.empty:
        return None

    search_queries = [
        str(resolved_place.get("city") or "").strip(),
        str(resolved_place.get("formatted_address") or "").strip(),
    ]
    candidate_stations = _rank_stations(state, search_queries, limit=12)
    if not candidate_stations:
        candidate_stations = _station_catalog_by_state().get(state, [])[:12]

    geocoded_matches: list[dict] = []
    with ThreadPoolExecutor(max_workers=6) as executor:
        future_map = {
            executor.submit(_station_coordinates, state, station["name"]): station
            for station in candidate_stations
        }
        for future in as_completed(future_map):
            station = future_map[future]
            coords = future.result()
            if not coords:
                continue

            station_with_distance = dict(station)
            station_with_distance["distance_km"] = calculate_distance(
                lat,
                lon,
                coords["lat"],
                coords["lon"],
            )
            geocoded_matches.append(station_with_distance)

    geocoded_matches.sort(key=lambda item: item.get("distance_km") or 0.0)
    chosen = [station for station in geocoded_matches if (station.get("distance_km") or 0.0) <= 60][:3]
    if not chosen:
        chosen = geocoded_matches[:3]
    if not chosen:
        chosen = candidate_stations[:3]

    if chosen:
        station_ids = [station["id"] for station in chosen]
        nearby_frame = state_frame[state_frame["station_key"].isin(station_ids)].copy()
        if not nearby_frame.empty:
            matched_station = chosen[0]
            matched_location = matched_station["name"]
            nearby = [_station_preview(station) for station in chosen]
            return _build_selection_payload(
                state=state,
                frame=nearby_frame,
                scope="nearby",
                matched_station=matched_station,
                matched_location=matched_location,
                nearby_stations=nearby,
                distance_km=matched_station.get("distance_km"),
                resolved_place={
                    "city": resolved_place.get("city"),
                    "formatted_address": resolved_place.get("formatted_address"),
                    "state": state,
                },
            )

    fallback_stations = [
        _station_preview(station, include_distance=False)
        for station in _station_catalog_by_state().get(state, [])[:5]
    ]
    return _build_selection_payload(
        state=state,
        frame=state_frame,
        scope="state",
        nearby_stations=fallback_stations,
        resolved_place={
            "city": resolved_place.get("city"),
            "formatted_address": resolved_place.get("formatted_address"),
            "state": state,
        },
    )


def get_all_records() -> list[dict]:
    frame = get_water_dataframe()
    if frame.empty:
        return []

    records: list[dict] = []
    for row in frame.itertuples(index=False):
        records.append(
            {
                "year": int(row.Year),
                "state": str(row.State),
                "location": str(row.Monitoring_Location),
                "station_id": str(row.station_key),
                "station_code": str(row.Station_Code) if row.Station_Code else None,
                **{
                    parameter: _safe_float(getattr(row, column))
                    for parameter, column in PARAMETER_COLUMN_MAP.items()
                },
            }
        )
    return records


def get_state_data(place: str, formatted_address: str | None = None) -> list[dict]:
    state = resolve_state_name(place, formatted_address)
    if not state:
        return []

    frame = get_water_dataframe()
    state_frame = frame[frame["State"] == state]
    if state_frame.empty:
        return []

    records: list[dict] = []
    for row in state_frame.itertuples(index=False):
        records.append(
            {
                "year": int(row.Year),
                "state": state,
                "location": str(row.Monitoring_Location),
                "ph": _safe_float(getattr(row, "pH_Mean", None)),
                "tds": _safe_float(getattr(row, "TDS_Mean", None)),
            }
        )

    return records


def analyze_trend(records: list[dict] | None) -> dict | None:
    if not records:
        return None

    ph_values = [record["ph"] for record in records if record.get("ph") is not None]
    tds_values = [record["tds"] for record in records if record.get("tds") is not None]
    tds_by_year: dict[int, list[float]] = {}

    for record in records:
        tds_value = record.get("tds")
        if tds_value is None:
            continue
        tds_by_year.setdefault(int(record["year"]), []).append(float(tds_value))

    years = sorted(tds_by_year)
    avg_tds = round(mean(tds_values), 2) if tds_values else None
    avg_ph = round(mean(ph_values), 2) if ph_values else None
    latest_year = years[-1] if years else None
    latest_tds = round(mean(tds_by_year[latest_year]), 2) if latest_year else None

    trend = "unknown"
    if len(years) >= 2:
        first_tds = mean(tds_by_year[years[0]])
        last_tds = mean(tds_by_year[years[-1]])
        delta = last_tds - first_tds
        if abs(delta) <= 50:
            trend = "stable"
        elif delta > 0:
            trend = "worsening"
        else:
            trend = "improving"
    elif latest_tds is not None:
        trend = "stable"

    status = "unknown"
    advisory = "Groundwater history is limited for this state."

    if latest_tds is not None or avg_ph is not None:
        tds_status = "unknown"
        if latest_tds is not None:
            if latest_tds <= 500:
                tds_status = "good"
            elif latest_tds <= 2000:
                tds_status = "caution"
            else:
                tds_status = "unsafe"

        ph_status = "unknown"
        if avg_ph is not None:
            ph_status = "good" if 6.5 <= avg_ph <= 8.5 else "caution"

        if "unsafe" in {tds_status, ph_status}:
            status = "unsafe"
        elif "caution" in {tds_status, ph_status}:
            status = "caution"
        else:
            status = "good"

        if status == "good":
            advisory = "Historical groundwater signals are broadly normal, but treated water is still safer for drinking."
        elif status == "caution":
            advisory = "Groundwater quality shows caution-level signals. Prefer filtered or tested water before drinking."
        else:
            advisory = "Groundwater quality looks poor in the historical dataset. Avoid untreated drinking use."

    return {
        "state": records[0]["state"],
        "sample_count": len(records),
        "year_count": len(years),
        "years": years,
        "avg_tds": avg_tds,
        "latest_tds": latest_tds,
        "avg_ph": avg_ph,
        "latest_year": latest_year,
        "trend": trend,
        "status": status,
        "advisory": advisory,
    }
