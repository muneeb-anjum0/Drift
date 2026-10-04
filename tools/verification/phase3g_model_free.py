#!/usr/bin/env python3
"""Phase III-G development-only coverage, batch context and cost feasibility."""

import argparse
import hashlib
import json
import statistics
import urllib.request
from pathlib import Path

from phase3g_batch_research import batch_prompt

ROOT = Path(__file__).resolve().parents[2]
CTX = 768
OUTPUT_RESERVE = 120
HEADROOM = 80


def fits_context(prompt_tokens, output_reserve=OUTPUT_RESERVE, headroom=HEADROOM):
    if any(not isinstance(value, int) or value < 0 for value in
           (prompt_tokens, output_reserve, headroom)):
        raise ValueError("invalid context budget")
    return prompt_tokens + output_reserve + headroom <= CTX


def tokens(prompt, base_url):
    request = urllib.request.Request(base_url.rstrip("/") + "/tokenize",
                                     data=json.dumps({"content": prompt}).encode(),
                                     headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(request, timeout=10) as response:
        payload = json.load(response)
    if not isinstance(payload.get("tokens"), list):
        raise ValueError("tokenizer response lacks tokens")
    return len(payload["tokens"])


def aggregate_budget(rows, budget):
    hits = false = calls = complete = 0
    for row in rows:
        selected = {item[0] for item in row["ranked"][:budget]}
        expected = set(row["expected_ids"])
        hits += len(selected & expected)
        false += len(selected - expected)
        calls += len(selected)
        complete += bool(expected) and expected <= selected
    return {"queries": len(rows), "expected_links": sum(len(row["expected_ids"]) for row in rows),
            "target_hits": hits, "false_exposures": false, "candidate_calls_if_singleton": calls,
            "complete_positive_queries": complete}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--llama-url", default="http://127.0.0.1:8080")
    args = parser.parse_args()
    panel_path = ROOT / "evaluation/phase_iii_g/batch_dev_v1.json"
    panel_raw = panel_path.read_bytes()
    panel = json.loads(panel_raw)
    freeze = json.loads((ROOT / "evaluation/phase_iii_g/batch_dev_freeze_v1.json").read_bytes())
    if panel.get("role") != "DEVELOPMENT_NOT_FINAL" or hashlib.sha256(panel_raw).hexdigest() != freeze["dataset_sha256"]:
        raise SystemExit("frozen development panel mismatch")
    sizing = []
    for case in panel["cases"]:
        for size in (1, 2, 3, 5):
            positions = ("first", "middle", "last") if case["expected_affected_ids"] else ("original",)
            for position in positions:
                reqs = case["requirements"][:size]
                target = case["expected_affected_ids"][0] if case["expected_affected_ids"] else None
                if target:
                    target_item = next(item for item in case["requirements"] if item["id"] == target)
                    others = [item for item in case["requirements"] if item["id"] != target][:size - 1]
                    index = 0 if position == "first" else size // 2 if position == "middle" else size - 1
                    reqs = others[:index] + [target_item] + others[index:]
                count = tokens(batch_prompt(case["message"], reqs), args.llama_url)
                sizing.append({"case_id": case["id"], "batch_size": size, "position": position,
                               "prompt_tokens": count, "fits_768_with_reserve": fits_context(count)})
    scaling = json.loads((ROOT / "evaluation/phase_iii_f/scaling_dev_v1.json").read_bytes())
    whole = []
    for project in scaling["projects"]:
        reqs = [{"id": r["id"], "text": r["title"] + ". " + r["description"]} for r in project["requirements"]]
        count = tokens(batch_prompt(project["queries"][0]["message"], reqs), args.llama_url)
        whole.append({"project_size": len(reqs), "prompt_tokens": count,
                      "fits_768_with_reserve": fits_context(count),
                      "output_token_lower_bound_estimate": 12 * len(reqs),
                      "output_bound_note": "12 tokens/result is a rough JSON lower bound, not tokenizer measurement"})
    compact = json.loads((ROOT / "evaluation/phase_iii_f/rank_traces_v1.json").read_bytes())
    rows = compact["architectures"]["R5"]["results"]
    selected = sum(len(row["selected_ids"]) for row in rows)
    current_hits = sum(len(set(row["selected_ids"]) & set(row["expected_ids"])) for row in rows)
    current_false = selected - current_hits
    budgets = {str(k): aggregate_budget(rows, k) for k in (3, 5, 8, 10)}
    adaptive = []
    for row in rows:
        ranked = row["ranked"]
        margin = ranked[2][1] - ranked[3][1] if len(ranked) >= 4 else float("inf")
        size = 5 if margin <= 0.05 else 3
        adaptive.append({**row, "ranked": ranked[:size]})
    adaptive_metric = aggregate_budget(adaptive, 5)
    output = {"role": "DEVELOPMENT_MODEL_FREE_PIPELINE_FEASIBILITY", "dataset_sha256": freeze["dataset_sha256"],
              "runtime_context_tokens": CTX, "output_reserve_tokens": OUTPUT_RESERVE, "additional_headroom_tokens": HEADROOM,
              "prompt_limit_tokens": CTX - OUTPUT_RESERVE - HEADROOM,
              "batch_sizing": sizing, "whole_baseline_sizing": whole,
              "batch_by_size": {str(n): {"count": len(group), "min_prompt_tokens": min(group),
                                         "median_prompt_tokens": statistics.median(group), "max_prompt_tokens": max(group),
                                         "fitting": sum(fits_context(x) for x in group)}
                                for n in (1, 2, 3, 5) if (group := [r["prompt_tokens"] for r in sizing if r["batch_size"] == n])},
              "frozen_r5_scaling": {"dataset_sha256": compact["dataset_sha256"], "queries": len(rows),
                                    "current_selected_calls": selected, "current_target_hits": current_hits,
                                    "current_false_exposures": current_false,
                                    "threshold_free_budgets": budgets,
                                    "adaptive_margin_le_0_05_top5_else_top3": adaptive_metric},
              "limitations": ["Token counts use running llama.cpp tokenizer; no completion was generated.",
                              "Batch output length lower bound is estimated; actual JSON generation may be longer.",
                              "Scaling requirements are short synthetic text; real long requirements/acceptance criteria are unmeasured.",
                              "The seven panel cases are author-labeled development data, not independent evidence."]}
    args.output.write_text(json.dumps(output, indent=2) + "\n")
    print(json.dumps({"batch_by_size": output["batch_by_size"], "whole": whole,
                      "r5_budgets": budgets, "adaptive": adaptive_metric}, indent=2))


if __name__ == "__main__":
    main()
