#!/usr/bin/env python3
"""Build a deterministic, derived, DEVELOPMENT-ONLY nested scaling corpus."""

import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SIZES = (5, 8, 10, 16, 20, 32, 50, 75, 100)
CORE = ("fl-water", "fl-pump", "fl-meter", "fl-field", "fl-crop")
EXTRA = (
    ("synthetic-allocation", "Water allocation approval", "Supervisors shall approve monthly irrigation water allocations for farm departments."),
    ("synthetic-pump-service", "Irrigation pump maintenance", "Mechanics shall inspect irrigation pumps for wear each month."),
    ("synthetic-drainage", "Field drainage survey", "Surveyors shall map standing water and drainage channels in each field."),
    ("synthetic-crop-forecast", "Crop yield forecast", "Analysts shall estimate seasonal crop yield from historical records."),
)
QUERIES = (
    ("q01", "Let growers choose when each field gets irrigated.", ("fl-water",), ("one_target", "paraphrase")),
    ("q02", "Allow operators to turn an irrigation pump off from their phone.", ("fl-pump",), ("one_target", "partial_modification")),
    ("q03", "Track how much water every paddock consumes.", ("fl-meter",), ("one_target", "low_overlap")),
    ("q04", "Record what was planted and adjust its watering timetable.", ("fl-crop", "fl-water"), ("two_target", "multi_intent")),
    ("q05", "Register the boundary of each field and its planted crop.", ("fl-field", "fl-crop"), ("two_target", "multi_intent")),
    ("q06", "Schedule field watering, start the pump remotely, and log the water volume used.", ("fl-water", "fl-pump", "fl-meter"), ("three_target", "multi_intent")),
    ("q07", "Register field boundaries, note the crop planted, schedule watering, and record the volume consumed.", ("fl-field", "fl-crop", "fl-water", "fl-meter"), ("four_target", "multi_intent")),
    ("q08", "Add a cafeteria menu for farm staff.", (), ("zero_target", "hard_negative")),
    ("q09", "Stop recording the irrigation water volume by field.", ("fl-meter",), ("one_target", "negation")),
    ("q10", "Could the farm publish a children's music playlist?", (), ("zero_target", "hard_negative", "question")),
)


def build():
    source = json.loads((ROOT / "evaluation/phase_iii_e/retrieval_dev_v1.json").read_text())
    legacy = json.loads((ROOT / "evaluation/datasets/retrieval_dev_v2.json").read_text())
    farm = next(p for p in source["projects"] if p["id"] == "farm-large")
    if len(farm["requirements"]) != 32 or source["role"] != "DEVELOPMENT_NOT_FINAL":
        raise ValueError("unexpected farm development source")
    base = {r["id"]: r for r in farm["requirements"]}
    pool = [{**base[rid], "source": "phase_iii_e_dev:farm-large"} for rid in CORE]
    pool.extend({"id": rid, "title": title, "description": description,
                 "source": "phase_iii_f:synthetic_hard_distractor"} for rid, title, description in EXTRA)
    pool.extend({**r, "source": "phase_iii_e_dev:farm-large"} for r in farm["requirements"] if r["id"] not in CORE)
    for dataset, label in ((source, "phase_iii_e_dev"), (legacy, "retrieval_dev_v2")):
        for project in dataset["projects"]:
            if dataset is source and project["id"] == "farm-large":
                continue
            for requirement in project["requirements"]:
                pool.append({**requirement, "source": f"{label}:{project['id']}"})
    if len(pool) != 100 or len({r["id"] for r in pool}) != 100:
        raise ValueError("expected exactly 100 distinct requirements")
    projects = []
    for size in SIZES:
        queries = [{"id": f"scale-{size}-{qid}", "message": message,
                    "expected_requirement_ids": list(expected), "categories": list(categories),
                    "provenance": "SYNTHETIC", "generation_method": "fixed_author_query_reused_across_nested_project_sizes",
                    "notes": "Development-only synthetic label; not independently reviewed."}
                   for qid, message, expected, categories in QUERIES]
        projects.append({"id": f"scale-{size}", "size": "small" if size <= 10 else "medium" if size <= 32 else "large",
                         "project_size": size, "requirements": pool[:size], "queries": queries})
    return {"name": "drift-phase-iii-f-derived-scaling-development", "version": "1.0.0",
            "role": "DEVELOPMENT_NOT_FINAL", "provenance": ["DERIVED", "SYNTHETIC"],
            "generation_method": "fixed 10-query farm panel over nested requirements; four authored same-domain distractors plus open-development requirements",
            "notes": "Not a new independent test. Repeated queries are intentional paired controls. At N>36 additional requirements are predominantly cross-domain; scaling beyond 36 is optimistic and labels may be incomplete for broad cross-domain queries.",
            "threshold": 0.25, "max_selected": 3, "projects": projects}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    args.output.write_text(json.dumps(build(), indent=2) + "\n")


if __name__ == "__main__":
    main()
