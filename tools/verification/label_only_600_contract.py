"""Frozen strict parser and development scoring rules for label-only-600-v1.

Pure functions only: no model invocation, dataset discovery, or locked-test read.
"""

import hashlib
import json
from collections import Counter
from typing import Any

LABELS = ("added", "ambiguous", "contradiction", "modified", "removed", "unchanged")
REPEAT_SEED = "label-only-600-repeat-v1"


class DuplicateKeyError(ValueError):
    pass


def _unique_object(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise DuplicateKeyError(key)
        result[key] = value
    return result


def _invalid_constant(value: str) -> None:
    raise ValueError(f"non-JSON constant {value}")


def parse_raw(raw: str, finish_reason: str) -> tuple[str | None, str | None]:
    """Return (canonical label, None) or (None, stable invalid reason)."""
    if finish_reason not in {"stop", "eos"}:
        return None, "incomplete_or_unknown_finish"
    if not isinstance(raw, str) or len(raw.encode("utf-8")) > 8192:
        return None, "missing_or_oversize_text"
    try:
        parsed = json.loads(raw, object_pairs_hook=_unique_object, parse_constant=_invalid_constant)
    except DuplicateKeyError:
        return None, "duplicate_key"
    except (ValueError, UnicodeError):
        return None, "invalid_json"
    if not isinstance(parsed, dict):
        return None, "not_object"
    if set(parsed) != {"label"}:
        return None, "wrong_keys"
    if not isinstance(parsed["label"], str) or parsed["label"] not in LABELS:
        return None, "invalid_label"
    return parsed["label"], None


def repeat_ids(cases: list[dict[str, str]]) -> list[str]:
    """Select five primary IDs per class without using model outputs."""
    selected: list[str] = []
    for label in LABELS:
        ids = [row["id"] for row in cases if row["reviewed_label"] == label]
        if len(ids) != 25 or len(set(ids)) != 25:
            raise ValueError(f"Expected 25 distinct development IDs for {label}")
        ids.sort(key=lambda case_id: hashlib.sha256(f"{REPEAT_SEED}:{case_id}".encode()).hexdigest())
        selected.extend(ids[:5])
    return selected


def score(cases: list[dict[str, str]], primary: dict[str, dict[str, str]],
          repeat: dict[str, dict[str, str]]) -> dict[str, Any]:
    """Score first-pass raw outputs; repeats test only stability."""
    case_ids = [row["id"] for row in cases]
    if len(cases) != 150 or len(set(case_ids)) != 150 or set(primary) != set(case_ids):
        raise ValueError("Primary evidence must contain exactly the 150 development IDs")
    support = Counter(row["reviewed_label"] for row in cases)
    if support != Counter({label: 25 for label in LABELS}):
        raise ValueError("Development support must be exactly 25 per class")
    selected = repeat_ids(cases)
    if set(repeat) != set(selected):
        raise ValueError("Repeat evidence must contain exactly the preselected 30 IDs")
    predictions: dict[str, str | None] = {}
    reasons: Counter[str] = Counter()
    confusion = {label: dict.fromkeys((*LABELS, "INVALID"), 0) for label in LABELS}
    for row in cases:
        case_id = row["id"]
        output = primary[case_id]
        label, reason = parse_raw(output.get("raw_text"), output.get("finish_reason"))
        predictions[case_id] = label
        confusion[row["reviewed_label"]][label or "INVALID"] += 1
        if reason:
            reasons[reason] += 1
    per_class: dict[str, dict[str, float | int]] = {}
    for label in LABELS:
        tp = confusion[label][label]
        fp = sum(confusion[truth][label] for truth in LABELS if truth != label)
        fn = 25 - tp
        precision = tp / (tp + fp) if tp + fp else 0.0
        recall = tp / 25
        f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
        per_class[label] = {"support": 25, "tp": tp, "fp": fp, "fn": fn,
                            "precision": precision, "recall": recall, "f1": f1}
    repeat_valid = 0
    repeat_label_agreement = 0
    repeat_raw_agreement = 0
    for case_id in selected:
        output = repeat[case_id]
        label, reason = parse_raw(output.get("raw_text"), output.get("finish_reason"))
        if reason is None:
            repeat_valid += 1
            if label == predictions[case_id]:
                repeat_label_agreement += 1
        if output.get("raw_text") == primary[case_id].get("raw_text"):
            repeat_raw_agreement += 1
    correct = sum(per_class[label]["tp"] for label in LABELS)
    return {
        "rows": 150, "correct": correct, "accuracy": correct / 150,
        "macro_f1": sum(per_class[label]["f1"] for label in LABELS) / 6,
        "structurally_valid": 150 - sum(reasons.values()),
        "invalid_reasons": dict(sorted(reasons.items())),
        "per_class": per_class, "confusion": confusion,
        "repeat": {"ids": selected, "valid": repeat_valid,
                   "label_agreement": repeat_label_agreement, "raw_string_agreement": repeat_raw_agreement},
    }


def decision(report: dict[str, Any], gate: dict[str, Any], identity_verified: bool) -> str:
    """Apply the predeclared gate in order; identity is checked outside this module."""
    prereq = gate["prerequisites"]
    repeat = report["repeat"]
    if (not identity_verified or report["rows"] != 150 or
            report["structurally_valid"] != prereq["primary_structurally_valid"] or
            repeat["valid"] != prereq["repeat_subset_structurally_valid"] or
            repeat["label_agreement"] != prereq["repeat_subset_label_agreement"]):
        return "INCONCLUSIVE"
    confusion = report["confusion"]
    per_class = report["per_class"]
    train = gate["training_experiment_justified_if_any"]
    if (report["correct"] <= train["accuracy_correct_at_most"] or
            report["macro_f1"] < train["macro_f1_below"] or
            confusion["removed"]["modified"] >= train["removed_to_modified_at_least"] or
            confusion["contradiction"]["modified"] >= train["contradiction_to_modified_at_least"] or
            confusion["added"]["modified"] >= train["added_to_modified_at_least"] or
            per_class["ambiguous"]["tp"] <= train["ambiguous_correct_at_most"]):
        return "TRAINING_EXPERIMENT_JUSTIFIED"
    no_train = gate["no_training_justified_if_all"]
    if (report["correct"] >= no_train["accuracy_correct_at_least"] and
            report["macro_f1"] >= no_train["macro_f1_at_least"] and
            all(per_class[label]["tp"] >= no_train["each_class_correct_at_least"] for label in LABELS) and
            confusion["removed"]["modified"] <= no_train["removed_to_modified_at_most"] and
            confusion["contradiction"]["modified"] <= no_train["contradiction_to_modified_at_most"] and
            confusion["added"]["modified"] <= no_train["added_to_modified_at_most"]):
        return "NO_TRAINING_JUSTIFIED"
    return "INCONCLUSIVE"
