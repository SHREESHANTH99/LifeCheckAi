from __future__ import annotations

import json

import requests

from lifecheckai.backend.app.config import GEMINI_API_KEY, GEMINI_MODEL

GEMINI_ENDPOINT = (
    f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"
)


def generate_response(prompt: str) -> dict | None:
    if not GEMINI_API_KEY:
        return None

    payload = {
        "contents": [
            {
                "parts": [
                    {
                        "text": prompt,
                    }
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.2,
            "responseMimeType": "application/json",
        },
    }

    try:
        response = requests.post(
            GEMINI_ENDPOINT,
            headers={
                "Content-Type": "application/json",
                "x-goog-api-key": GEMINI_API_KEY,
            },
            json=payload,
            timeout=20,
        )
        response.raise_for_status()
        body = response.json()
        text = _extract_text(body)
        if not text:
            return None
        return json.loads(text)
    except Exception as exc:
        print(f"[GEMINI ERROR] {exc}")
        return None


def _extract_text(payload: dict) -> str | None:
    candidates = payload.get("candidates") or []
    if not candidates:
        return None

    content = candidates[0].get("content") or {}
    parts = content.get("parts") or []
    if not parts:
        return None

    return parts[0].get("text")


def analyze_water_quality(state: str, params: dict, violations: list) -> dict | None:
    """Ask Gemini to analyze water quality and explain contamination reasons."""
    violations_text = "\n".join(
        f"- {v['param']}: {v['value']} (limit: {v['limit']})" for v in violations
    ) if violations else "No BIS limit violations detected."

    params_text = "\n".join(
        f"- {k}: {v}" for k, v in params.items() if v is not None
    )

    prompt = f"""Analyze the groundwater quality for {state}, India.

Water quality parameters (averaged from monitoring stations):
{params_text}

BIS IS 10500:2012 violations:
{violations_text}

Respond in JSON with these fields:
{{
  "summary": "2-3 sentence summary of water quality status",
  "contamination_causes": ["list of likely contamination causes based on the parameters and region"],
  "health_risks": ["list of specific health risks from the detected contaminants"],
  "remediation": ["list of recommended remediation/treatment methods"],
  "regional_factors": "Brief explanation of geological/industrial factors in {state} affecting water quality"
}}"""

    return generate_response(prompt)
