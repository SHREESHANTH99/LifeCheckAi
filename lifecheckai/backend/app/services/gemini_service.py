from __future__ import annotations

import json
import re

import google.generativeai as genai
import requests

from lifecheckai.backend.app.config import (
    DEEPSEEK_API_KEY,
    DEEPSEEK_MODEL,
    GEMINI_API_KEY,
    GEMINI_MODEL,
    GOOGLE_API_KEY,
    GROQ_API_KEY,
    GROQ_MODEL,
)

LAST_PROVIDER_ERRORS: dict[str, str | None] = {"gemini": None, "groq": None, "deepseek": None}
LAST_LLM_PROVIDER: str | None = None

MODEL_CANDIDATES = [
    GEMINI_MODEL,
    "gemini-1.5-flash",
    "gemini-1.5-pro",
]

KEY_CANDIDATES = [
    GEMINI_API_KEY,
    GOOGLE_API_KEY,
]


def generate_response(prompt: str) -> dict | None:
    global LAST_PROVIDER_ERRORS
    global LAST_LLM_PROVIDER
    LAST_PROVIDER_ERRORS = {"gemini": None, "groq": None, "deepseek": None}
    LAST_LLM_PROVIDER = None

    key_candidates = [key for key in _unique_key_candidates(KEY_CANDIDATES)]
    if key_candidates:
        print("[GEMINI] CALLING GEMINI...")
        for key_index, api_key in enumerate(key_candidates, start=1):
            genai.configure(api_key=api_key)
            for model_name in _unique_model_candidates(MODEL_CANDIDATES):
                try:
                    model = genai.GenerativeModel(model_name=model_name)
                    response = model.generate_content(
                        prompt,
                        generation_config={
                            "temperature": 0.9,
                            "top_p": 0.95,
                        },
                    )

                    text = _extract_text(response)
                    if not text:
                        print(f"[GEMINI WARN] Empty response text for model {model_name} (key#{key_index})")
                        continue

                    parsed = _parse_json_object(text)
                    if parsed is None:
                        print(f"[GEMINI WARN] Invalid JSON payload from model {model_name} (key#{key_index})")
                        continue

                    print(f"[GEMINI] RESPONSE RECEIVED via {model_name} (key#{key_index})")
                    LAST_LLM_PROVIDER = "gemini"
                    return parsed
                except Exception as exc:
                    LAST_PROVIDER_ERRORS["gemini"] = f"key#{key_index} model={model_name}: {exc}"
                    print(f"[GEMINI ERROR] {LAST_PROVIDER_ERRORS['gemini']}")
                    continue
    else:
        LAST_PROVIDER_ERRORS["gemini"] = "Missing GEMINI_API_KEY"
        print(f"[GEMINI ERROR] {LAST_PROVIDER_ERRORS['gemini']}")

    groq_result = _generate_with_openai_compatible(
        provider="groq",
        api_key=GROQ_API_KEY,
        model_name=GROQ_MODEL,
        endpoint="https://api.groq.com/openai/v1/chat/completions",
        prompt=prompt,
    )
    if groq_result is not None:
        LAST_LLM_PROVIDER = "groq"
        return groq_result

    deepseek_result = _generate_with_openai_compatible(
        provider="deepseek",
        api_key=DEEPSEEK_API_KEY,
        model_name=DEEPSEEK_MODEL,
        endpoint="https://api.deepseek.com/v1/chat/completions",
        prompt=prompt,
    )
    if deepseek_result is not None:
        LAST_LLM_PROVIDER = "deepseek"
        return deepseek_result

    return None


def get_last_provider_errors() -> dict[str, str | None]:
    return LAST_PROVIDER_ERRORS


def get_last_llm_provider() -> str | None:
    return LAST_LLM_PROVIDER


def _extract_text(payload: object) -> str | None:
    if payload is None:
        return None

    text = getattr(payload, "text", None)
    if isinstance(text, str) and text.strip():
        return text

    candidates = getattr(payload, "candidates", None)
    if not candidates:
        return None

    try:
        parts = candidates[0].content.parts
    except Exception:
        return None

    if not parts:
        return None

    part_text = getattr(parts[0], "text", None)
    if isinstance(part_text, str) and part_text.strip():
        return part_text

    return None


def _unique_model_candidates(candidates: list[str]) -> list[str]:
    seen: set[str] = set()
    ordered: list[str] = []
    for model_name in candidates:
        name = (model_name or "").strip()
        if not name or name in seen:
            continue
        seen.add(name)
        ordered.append(name)
    return ordered


def _unique_key_candidates(candidates: list[str | None]) -> list[str]:
    seen: set[str] = set()
    ordered: list[str] = []
    for api_key in candidates:
        key = (api_key or "").strip()
        if not key or key in seen:
            continue
        seen.add(key)
        ordered.append(key)
    return ordered


def _parse_json_object(raw_text: str) -> dict | None:
    cleaned = raw_text.strip()

    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)

    try:
        parsed = json.loads(cleaned)
        return parsed if isinstance(parsed, dict) else None
    except json.JSONDecodeError:
        pass

    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None

    try:
        parsed = json.loads(cleaned[start : end + 1])
    except json.JSONDecodeError:
        return None

    return parsed if isinstance(parsed, dict) else None


def _flatten_json_sections(data: dict) -> dict:
    """Convert nested objects (from Groq/DeepSeek) into flat strings (required by normalize_sections)."""
    if not isinstance(data, dict):
        return data
    
    flattened = {}
    for key, value in data.items():
        if isinstance(value, str):
            flattened[key] = value
        elif isinstance(value, dict):
            # Convert dict to readable string
            parts = []
            for k,v in value.items():
                if isinstance(v, (int, float)):
                    parts.append(f"{k}: {v}")
                else:
                    parts.append(f"{k}: {v}")
            flattened[key] = ", ".join(parts) if parts else str(value)
        elif isinstance(value, list):
            flattened[key] = ", ".join(str(v) for v in value)
        else:
            flattened[key] = str(value)
    
    return flattened


def _generate_with_openai_compatible(
    provider: str,
    api_key: str | None,
    model_name: str,
    endpoint: str,
    prompt: str,
) -> dict | None:
    global LAST_PROVIDER_ERRORS

    key = (api_key or "").strip()
    if not key:
        LAST_PROVIDER_ERRORS[provider] = "missing API key"
        print(f"[{provider.upper()} WARN] missing API key")
        return None

    try:
        response = requests.post(
            endpoint,
            headers={
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
            },
            json={
                "model": model_name,
                "temperature": 0.9,
                "top_p": 0.95,
                "messages": [
                    {
                        "role": "system",
                        "content": "Return valid JSON only.",
                    },
                    {
                        "role": "user",
                        "content": prompt,
                    },
                ],
            },
            timeout=20,
        )
        response.raise_for_status()
        payload = response.json()
        content = (
            payload.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
        )

        parsed = _parse_json_object(content)
        if parsed is None:
            LAST_PROVIDER_ERRORS[provider] = "non-JSON response"
            print(f"[{provider.upper()} WARN] non-JSON response")
            return None

        # Flatten nested objects for consistency with normalize_sections expectations
        flattened = _flatten_json_sections(parsed)
        print(f"[{provider.upper()}] Parsed response: {flattened}")
        return flattened
    except requests.exceptions.HTTPError as exc:
        try:
            error_detail = exc.response.json()
            error_msg = error_detail.get("error", {}).get("message", str(exc))
        except:
            error_msg = str(exc)
        LAST_PROVIDER_ERRORS[provider] = f"model={model_name}: {exc.response.status_code} - {error_msg}"
        print(f"[{provider.upper()} ERROR] Status {exc.response.status_code}: {error_msg}")
        return None
    except Exception as exc:
        LAST_PROVIDER_ERRORS[provider] = f"model={model_name}: {exc}"
        print(f"[{provider.upper()} ERROR] {exc}")
        return None


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
