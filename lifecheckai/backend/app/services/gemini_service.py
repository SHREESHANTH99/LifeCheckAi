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
