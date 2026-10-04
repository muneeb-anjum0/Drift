#!/usr/bin/env python3
"""Summarize recorded Phase III-H raw development experiments; never infer."""

import argparse
import json
import statistics
from collections import Counter
from pathlib import Path

from phase3h_contracts import ROOT


def summarize(paths):
    registry = []
    ledger = []
    for path in paths:
        path = path.resolve()
        report = json.loads(path.read_text())
        rows = report["cases"]
        counts = Counter(row["validation"]["primary"] for row in rows)
        valid = sum(row["validation"]["valid"] for row in rows)
        semantic = sum(row.get("semantic_match") is True for row in rows)
        semantic_scored = sum(row.get("semantic_match") is not None for row in rows)
        latencies = [row["latency_seconds"] for row in rows]
        output_tokens = [row["raw_response"]["tokens_predicted"] for row in rows
                         if "raw_response" in row]
        prompt_tokens = [row["prompt_tokens"] for row in rows]
        entry = {"experiment": report["experiment"], "variant": report["variant"],
                 "contract": report["contract"], "constrained": report["constrained"],
                 "size": report["size"], "order": report.get("order", "original"),
                 "source": str(path.relative_to(ROOT)), "calls": len(rows),
                 "raw_valid": valid, "raw_valid_rate": valid / len(rows),
                 "semantic_match_valid_outputs": semantic,
                 "semantic_scored": semantic_scored, "primary_failures": dict(counts),
                 "prompt_tokens_min_max": [min(prompt_tokens), max(prompt_tokens)],
                 "output_tokens_min_max": [min(output_tokens), max(output_tokens)] if output_tokens else None,
                 "latency_seconds_total": round(sum(latencies), 3),
                 "latency_seconds_median": round(statistics.median(latencies), 3),
                 "mem_available_kib_min": min(min(row["mem_available_kib_before"],
                                                  row["mem_available_kib_after"]) for row in rows)}
        registry.append(entry)
        for row in rows:
            if row["validation"]["valid"]:
                continue
            ledger.append({"experiment": report["experiment"], "case_id": row["case_id"],
                           "size": report["size"], "order": report.get("order", "original"),
                           "raw_source": str(path.relative_to(ROOT)),
                           "primary": row["validation"]["primary"],
                           "secondary": row["validation"].get("secondary", []),
                           "details": row["validation"].get("details", {}),
                           "prompt_tokens": row["prompt_tokens"],
                           "output_tokens": row.get("raw_response", {}).get("tokens_predicted"),
                           "latency_seconds": row["latency_seconds"],
                           "repair": "NOT_ATTEMPTED", "retry": "NOT_ATTEMPTED"})
    return registry, ledger


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("paths", nargs="+", type=Path)
    parser.add_argument("--registry", required=True, type=Path)
    parser.add_argument("--ledger", required=True, type=Path)
    args = parser.parse_args()
    registry, ledger = summarize(args.paths)
    for output, payload in ((args.registry, registry), (args.ledger, ledger)):
        if output.exists():
            raise RuntimeError(f"refusing to overwrite {output}")
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps(payload, indent=2) + "\n")
    print(json.dumps({"experiments": len(registry), "calls": sum(r["calls"] for r in registry),
                      "failures": len(ledger)}, indent=2))


if __name__ == "__main__":
    main()
