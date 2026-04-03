from __future__ import annotations

import re

INDIAN_STATES = [
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
    "Delhi",
    "Jammu and Kashmir",
    "Ladakh",
    "Puducherry",
    "Chandigarh",
    "Andaman and Nicobar Islands",
    "Dadra and Nagar Haveli and Daman and Diu",
]

CITY_TO_STATE = {
    "mumbai": "Maharashtra",
    "bombay": "Maharashtra",
    "pune": "Maharashtra",
    "nagpur": "Maharashtra",
    "delhi": "Delhi",
    "new delhi": "Delhi",
    "jaipur": "Rajasthan",
    "jodhpur": "Rajasthan",
    "udaipur": "Rajasthan",
    "amritsar": "Punjab",
    "ludhiana": "Punjab",
    "chandigarh": "Chandigarh",
    "hyderabad": "Telangana",
    "vijayawada": "Andhra Pradesh",
    "visakhapatnam": "Andhra Pradesh",
    "bengaluru": "Karnataka",
    "bangalore": "Karnataka",
    "chennai": "Tamil Nadu",
    "kolkata": "West Bengal",
    "ahmedabad": "Gujarat",
    "lucknow": "Uttar Pradesh",
}

STATE_ALIASES = {
    "andhra": "Andhra Pradesh",
    "andhra pradesh": "Andhra Pradesh",
    "arunachal pradesh": "Arunachal Pradesh",
    "assam": "Assam",
    "bihar": "Bihar",
    "chhattisgarh": "Chhattisgarh",
    "goa": "Goa",
    "gujarat": "Gujarat",
    "haryana": "Haryana",
    "himachal pradesh": "Himachal Pradesh",
    "jharkhand": "Jharkhand",
    "karnataka": "Karnataka",
    "kerala": "Kerala",
    "madhya pradesh": "Madhya Pradesh",
    "maharashtra": "Maharashtra",
    "manipur": "Manipur",
    "meghalaya": "Meghalaya",
    "mizoram": "Mizoram",
    "nagaland": "Nagaland",
    "odisha": "Odisha",
    "orissa": "Odisha",
    "punjab": "Punjab",
    "rajasthan": "Rajasthan",
    "sikkim": "Sikkim",
    "tamil nadu": "Tamil Nadu",
    "telangana": "Telangana",
    "tripura": "Tripura",
    "uttar pradesh": "Uttar Pradesh",
    "uttarakhand": "Uttarakhand",
    "west bengal": "West Bengal",
    "delhi": "Delhi",
    "new delhi": "Delhi",
    "jammu and kashmir": "Jammu and Kashmir",
    "ladakh": "Ladakh",
    "puducherry": "Puducherry",
    "pondicherry": "Puducherry",
    "chandigarh": "Chandigarh",
    "dadra and nagar haveli and daman and diu": "Dadra and Nagar Haveli and Daman and Diu",
}

LOCATION_ALIASES = {
    **{state.lower(): state for state in INDIAN_STATES},
    **{city: city.title() if city != "new delhi" else "New Delhi" for city in CITY_TO_STATE},
}

LOCATION_ALIASES["andhra"] = "Andhra Pradesh"
LOCATION_ALIASES["orissa"] = "Odisha"
LOCATION_ALIASES["bombay"] = "Mumbai"
LOCATION_ALIASES["bangalore"] = "Bengaluru"

LOCATION_MATCHES = sorted(LOCATION_ALIASES.items(), key=lambda item: len(item[0]), reverse=True)
STATE_MATCHES = sorted(STATE_ALIASES.items(), key=lambda item: len(item[0]), reverse=True)
LOCATION_HINT_RE = re.compile(
    r"\b(?:in|at|near|around|for|across|from)\s+([a-zA-Z][a-zA-Z\s-]+?)(?:[?.!,]|$)"
)


def _normalize_text(value: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z\s]", " ", value.lower())
    return re.sub(r"\s+", " ", cleaned).strip()


def extract_state_from_text(text: str | None) -> str | None:
    if not text:
        return None

    normalized = _normalize_text(text)
    if not normalized:
        return None

    for alias, canonical in STATE_MATCHES:
        if alias in normalized:
            return canonical

    return None


def extract_location(query: str) -> str:
    normalized = _normalize_text(query)

    for alias, canonical in LOCATION_MATCHES:
        if alias in normalized:
            return canonical

    hint_match = LOCATION_HINT_RE.search(query)
    if hint_match:
        candidate = hint_match.group(1).strip()
        candidate_state = extract_state_from_text(candidate)
        if candidate_state:
            return candidate_state
        return candidate.title()

    return "Delhi"
