from __future__ import annotations

import json
import re
from typing import Any, Literal

from fastapi import HTTPException
from pydantic import BaseModel, Field, ValidationError, field_validator


LABELS = {"added", "modified", "removed", "contradiction", "ambiguous", "unchanged"}
MAX_REASONING_LENGTH = 4000
MAX_CHANGED_ELEMENTS = 50
MAX_CHANGED_ELEMENT_LENGTH = 500


class PredictRequest(BaseModel):
    baseline_requirement: str = Field(min_length=1, max_length=12000)
    new_client_message: str = Field(min_length=1, max_length=12000)

    @field_validator("baseline_requirement", "new_client_message")
    @classmethod
    def strip_non_empty(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("must not be empty")
        return stripped


class DriftPrediction(BaseModel):
    label: Literal["added", "modified", "removed", "contradiction", "ambiguous", "unchanged"]
    confidence: float = Field(ge=0, le=1)
    reasoning: str
    changed_elements: list[str] = Field(default_factory=list)


def parse_prediction(raw: str) -> DriftPrediction:
    candidates = [raw]
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if match:
        candidates.append(match.group(0))
    for candidate in candidates:
        try:
            return normalize_payload(json.loads(candidate))
        except (json.JSONDecodeError, TypeError, ValidationError, ValueError):
            continue
    raise HTTPException(status_code=502, detail="Model returned malformed JSON that could not be normalized.")


def normalize_payload(payload: Any) -> DriftPrediction:
    if isinstance(payload, dict) and "data" in payload and isinstance(payload["data"], dict):
        payload = payload["data"]
    if isinstance(payload, dict) and "prediction" in payload and isinstance(payload["prediction"], dict):
        payload = payload["prediction"]
    if not isinstance(payload, dict):
        raise ValueError("prediction payload must be an object")
    required = {"label", "confidence", "reasoning", "changed_elements"}
    missing = sorted(required.difference(payload))
    if missing:
        raise ValueError(f"prediction payload is missing required fields: {', '.join(missing)}")
    label = str(payload.get("label", "")).strip().lower()
    if label not in LABELS:
        raise ValueError(f"invalid label: {label}")
    confidence = payload["confidence"]
    if isinstance(confidence, bool) or not isinstance(confidence, (int, float)):
        raise ValueError("confidence must be numeric")
    if confidence > 1:
        confidence = confidence / 100
    reasoning = payload["reasoning"]
    if not isinstance(reasoning, str) or len(reasoning) > MAX_REASONING_LENGTH:
        raise ValueError("reasoning must be a bounded string")
    changed = payload["changed_elements"]
    if isinstance(changed, str):
        changed = [changed]
    if not isinstance(changed, list) or len(changed) > MAX_CHANGED_ELEMENTS:
        raise ValueError("changed_elements must be a bounded list")
    if any(not isinstance(item, str) or len(item) > MAX_CHANGED_ELEMENT_LENGTH for item in changed):
        raise ValueError("changed_elements entries must be bounded strings")
    return DriftPrediction.model_validate(
        {
            "label": label,
            "confidence": confidence,
            "reasoning": reasoning,
            "changed_elements": [item for item in changed if item.strip()],
        }
    )
