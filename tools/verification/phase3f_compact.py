#!/usr/bin/env python3
"""Preserve small rank/score traces without committing verbose raw scorer internals."""

import hashlib
import json
from pathlib import Path

from phase3f_analyze import bm25_variant, derived_two_stage, normalize

ROOT = Path(__file__).resolve().parents[2]
DIR = ROOT / "evaluation/phase_iii_f"
FILES = {
    "R0": "R0_scaling_v1.json", "R5": "R5_scaling_v1.json", "R6": "R6_scaling_v1.json",
    "BM25": "BM25_scaling_v1.json", "HYB": "HYB_scaling_v1.json", "DECOMP": "DECOMP_scaling_v1.json",
}


def main():
    dataset_sha = hashlib.sha256((DIR / "scaling_dev_v1.json").read_bytes()).hexdigest()
    output = {"role": "DEVELOPMENT_COMPACT_RANK_TRACES", "dataset_sha256": dataset_sha,
              "configuration": "Frozen R0/R5/R6 and research BM25=.05, hybrid alpha=.5/.35, decomposition=.45; all cap3",
              "architectures": {}}
    rows_by_name = {}
    for name, filename in FILES.items():
        raw = (DIR / filename).read_bytes()
        report = json.loads(raw)
        if report.get("dataset_sha256", report.get("dataset", {}).get("sha256")) != dataset_sha:
            raise SystemExit(f"{name} dataset mismatch")
        rows = normalize(report, name)
        rows_by_name[name] = rows
        output["architectures"][name] = {
            "raw_report_sha256": hashlib.sha256(raw).hexdigest(),
        }
    dataset = json.loads((DIR / "scaling_dev_v1.json").read_bytes())
    for budget in (5, 10, 20):
        name = f"2STAGE-BM25-{budget}-SEM"
        rows_by_name[name] = derived_two_stage(dataset, rows_by_name["BM25"], rows_by_name["R6"], budget)
        output["architectures"][name] = {"derivation": f"BM25 top {budget}, semantic rerank, cosine >=.45 cap3"}
    for representation in ("title", "description"):
        name = f"BM25-{representation.upper()}"
        rows_by_name[name] = bm25_variant(dataset, rows_by_name["R5"], representation)
        output["architectures"][name] = {"derivation": f"BM25 {representation} only, normalized score >=.05 cap3"}
    for name, rows in rows_by_name.items():
        output["architectures"][name]["results"] = [
            {"query_id": row["id"], "project_id": row["project"], "expected_ids": row["expected"],
             "selected_ids": row["selected"],
             "ranked": [[item["id"], item["score"], item.get("decision", "UNSELECTED")] for item in row["ranked"]]}
            for row in rows]
    (DIR / "rank_traces_v1.json").write_text(json.dumps(output, separators=(",", ":")) + "\n")
    print((DIR / "rank_traces_v1.json").stat().st_size)


if __name__ == "__main__":
    main()
