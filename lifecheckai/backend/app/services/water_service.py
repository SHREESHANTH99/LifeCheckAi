from __future__ import annotations

import csv
import re
from collections import defaultdict
from functools import lru_cache
from pathlib import Path
from statistics import mean

from lifecheckai.backend.app.utils.parser import CITY_TO_STATE, extract_state_from_text

DATA_PATH = Path(__file__).resolve().parents[2] / "data"
DATA_ROW_RE = re.compile(r"^\s*(\d{2,6})(?:\s|$)")
TDS_SUPPORTED_YEARS = {2020, 2021, 2022, 2024}
TEXT_SKIP_PREFIXES = ("table", "water quality", "stn", "bis is", "station", "code")
PLACEHOLDERS = {"-", "bdl", "na", "nil"}
_SKIP = object()


def get_state_data(place: str, formatted_address: str | None = None) -> list[dict]:
    state = resolve_state_name(place, formatted_address)
    if not state:
        return []

    return [record for record in _load_groundwater_records() if record["state"] == state]


def analyze_trend(records: list[dict] | None) -> dict | None:
    if not records:
        return None

    ph_values = [record["ph"] for record in records if record.get("ph") is not None]
    tds_values = [record["tds"] for record in records if record.get("tds") is not None]
    tds_by_year: dict[int, list[float]] = defaultdict(list)

    for record in records:
        if record.get("tds") is not None:
            tds_by_year[record["year"]].append(record["tds"])

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


def resolve_state_name(place: str | None, formatted_address: str | None = None) -> str | None:
    for text in (formatted_address, place):
        state = extract_state_from_text(text)
        if state:
            return state

    if place:
        mapped = CITY_TO_STATE.get(place.strip().lower())
        if mapped:
            return mapped

    return None


@lru_cache(maxsize=1)
def _load_groundwater_records() -> list[dict]:
    records: list[dict] = []

    for path in sorted(DATA_PATH.glob("water_quality_data_*.csv")):
        year_match = re.search(r"(\d{4})", path.stem)
        if not year_match:
            continue

        year = int(year_match.group(1))
        records.extend(_load_year_records(path, year))

    return records


def _load_year_records(path: Path, year: int) -> list[dict]:
    with path.open("r", encoding="utf-8", errors="ignore", newline="") as handle:
        rows = list(csv.reader(handle))

    records: list[dict] = []
    current_state: str | None = None

    for index, row in enumerate(rows):
        joined_text = " ".join(cell.strip() for cell in row if cell and cell.strip())
        lowered_text = joined_text.lower()
        state_from_text = extract_state_from_text(joined_text)

        if state_from_text and any(marker in lowered_text for marker in ("water quality", "ground water", "nwmp")):
            current_state = state_from_text

        if not _is_data_row(row):
            continue

        state = (
            extract_state_from_text(joined_text)
            or extract_state_from_text(_nearby_text(rows, index))
            or current_state
        )
        if not state:
            continue

        ph_value = _extract_ph(row)
        tds_value = _extract_tds(row, year)

        if ph_value is None and tds_value is None:
            continue

        records.append(
            {
                "year": year,
                "state": state,
                "location": _extract_location(row, rows, index),
                "ph": ph_value,
                "tds": tds_value,
            }
        )

    return records


def _is_data_row(row: list[str]) -> bool:
    return bool(row and DATA_ROW_RE.match((row[0] or "").strip()))


def _nearby_text(rows: list[list[str]], index: int) -> str:
    snippets: list[str] = []

    for offset in (-2, -1, 1, 2, 3):
        probe = index + offset
        if probe < 0 or probe >= len(rows):
            continue
        snippets.extend(cell.strip() for cell in rows[probe] if cell and cell.strip())

    return " ".join(snippets)


def _extract_location(row: list[str], rows: list[list[str]], index: int) -> str | None:
    first_cell = (row[0] or "").strip()
    inline_match = re.match(r"^\s*\d{2,6}\s+(.+)$", first_cell)
    if inline_match:
        return inline_match.group(1).strip(" ,")

    for candidate in row[1:3]:
        if _looks_like_location(candidate):
            return candidate.strip(" ,")

    for offset in (1, -1, 2, -2):
        probe = index + offset
        if probe < 0 or probe >= len(rows):
            continue
        joined = " ".join(cell.strip() for cell in rows[probe] if cell and cell.strip())
        if _looks_like_location(joined):
            return joined.strip(" ,")

    return None


def _looks_like_location(value: str | None) -> bool:
    if not value:
        return False

    cleaned = value.strip()
    if not cleaned:
        return False

    lowered = cleaned.lower()
    if lowered.startswith(TEXT_SKIP_PREFIXES):
        return False

    if DATA_ROW_RE.match(cleaned):
        return False

    if extract_state_from_text(cleaned) and "," not in cleaned and len(cleaned.split()) <= 3:
        return False

    return any(char.isalpha() for char in cleaned)


def _extract_ph(row: list[str]) -> float | None:
    for first, second in _measurement_pairs(row):
        if _is_ph_value(first) and _is_ph_value(second):
            return round(_pair_mean(first, second), 2)

    return None


def _extract_tds(row: list[str], year: int) -> float | None:
    if year not in TDS_SUPPORTED_YEARS:
        return None

    for first, second in reversed(_measurement_pairs(row)):
        pair_mean = _pair_mean(first, second)
        if pair_mean is not None and pair_mean >= 50:
            return round(pair_mean, 2)

    return None


def _measurement_pairs(row: list[str]) -> list[tuple[float | None, float | None]]:
    filtered: list[float | None] = []

    for cell in row[1:]:
        parsed = _parse_measurement_cell(cell)
        if parsed is _SKIP:
            continue
        filtered.append(parsed)

    pairs: list[tuple[float | None, float | None]] = []
    for index in range(0, len(filtered) - 1, 2):
        pairs.append((filtered[index], filtered[index + 1]))

    return pairs


def _parse_measurement_cell(cell: str | None) -> float | None | object:
    if cell is None:
        return _SKIP

    text = cell.strip()
    if not text:
        return _SKIP

    lowered = text.lower()
    if lowered in PLACEHOLDERS:
        return None

    number_match = re.search(r"-?\d+(?:\.\d+)?", text.replace(",", ""))
    if number_match:
        try:
            return float(number_match.group(0))
        except ValueError:
            return _SKIP

    return _SKIP


def _is_ph_value(value: float | None) -> bool:
    return value is not None and 4 <= value <= 10.5


def _pair_mean(first: float | None, second: float | None) -> float | None:
    values = [value for value in (first, second) if value is not None]
    if not values:
        return None
    return mean(values)


# ──────────────────────────────────────────────────────────
# Enhanced multi-parameter extraction for ML
# ──────────────────────────────────────────────────────────

# CSV column layout (paired Min/Max):
#   Col 0: Station Code
#   Col 1-2: location text (sometimes)
#   Pairs:  Temp, pH, Conductivity, BOD, Nitrate+Nitrite,
#           Fecal Coliform, Total Coliform, TDS, Fluoride, Arsenic
# Each parameter has 2 columns (Min, Max) → 20 numeric columns
# But the exact offset depends on year/state header. We use a
# robust approach: parse ALL numeric pairs and map by position.

PARAM_NAMES = [
    "temperature", "ph", "conductivity", "bod", "nitrate",
    "fecal_coliform", "total_coliform", "tds", "fluoride", "arsenic",
]


def _extract_all_params(row: list[str]) -> dict[str, float | None]:
    """Extract all 10 water quality parameters from a CSV data row."""
    pairs = _measurement_pairs(row)
    result: dict[str, float | None] = {}

    for idx, name in enumerate(PARAM_NAMES):
        if idx < len(pairs):
            first, second = pairs[idx]
            result[name] = round(_pair_mean(first, second), 4) if _pair_mean(first, second) is not None else None
        else:
            result[name] = None

    # Sanity-check pH range
    if result.get("ph") is not None and not (4 <= result["ph"] <= 10.5):
        result["ph"] = None

    # Derived Feature: Water Quality Index (WQI)
    # Higher score = Worse Quality. Computed roughly over basic BIS standard scales.
    scores = []
    if result.get("tds"): scores.append(result["tds"] / 500.0) # 500 desirable limit
    if result.get("fluoride"): scores.append(result["fluoride"] / 1.0)
    if result.get("nitrate"): scores.append(result["nitrate"] / 45.0)
    if result.get("bod"): scores.append(result["bod"] / 5.0)
    if result.get("ph") and result["ph"] >= 7.0: scores.append(abs(result["ph"] - 7.0) / 1.5)
    
    if scores:
        # Scale to form an index out of 100 on average severity
        wqi = sum(scores) / len(scores) * 100
        result["wqi"] = round(wqi, 2)
    else:
        result["wqi"] = None

    return result


@lru_cache(maxsize=1)
def _load_all_param_records() -> list[dict]:
    """Load all CSV files and extract full 10-parameter records."""
    records: list[dict] = []

    for path in sorted(DATA_PATH.glob("water_quality_data_*.csv")):
        year_match = re.search(r"(\d{4})", path.stem)
        if not year_match:
            continue

        year = int(year_match.group(1))
        records.extend(_load_year_all_params(path, year))

    return records


def _load_year_all_params(path: Path, year: int) -> list[dict]:
    """Load a single CSV and extract full parameter records."""
    with path.open("r", encoding="utf-8", errors="ignore", newline="") as handle:
        rows = list(csv.reader(handle))

    records: list[dict] = []
    current_state: str | None = None

    for index, row in enumerate(rows):
        joined_text = " ".join(cell.strip() for cell in row if cell and cell.strip())
        lowered_text = joined_text.lower()
        state_from_text = extract_state_from_text(joined_text)

        if state_from_text and any(marker in lowered_text for marker in ("water quality", "ground water", "nwmp")):
            current_state = state_from_text

        if not _is_data_row(row):
            continue

        state = (
            extract_state_from_text(joined_text)
            or extract_state_from_text(_nearby_text(rows, index))
            or current_state
        )
        if not state:
            continue

        params = _extract_all_params(row)

        # Skip rows with no useful data at all
        if all(v is None for v in params.values()):
            continue

        records.append({
            "year": year,
            "state": state,
            "location": _extract_location(row, rows, index),
            **params,
        })

    return records


def get_all_records() -> list[dict]:
    """Public API: return all records with full 10 parameters."""
    return _load_all_param_records()


def get_available_states() -> list[str]:
    """Return sorted list of states that have water quality data."""
    states = {r["state"] for r in _load_all_param_records()}
    return sorted(states)
