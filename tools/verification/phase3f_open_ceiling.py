#!/usr/bin/env python3
"""Rank ceilings from previously open development traces; no closed case reads."""

import hashlib
import json
from pathlib import Path

from phase3f_analyze import bm25_variant, derived_two_stage, describe, normalize

ROOT = Path(__file__).resolve().parents[2]
DATA = {
    "new_dev_8_16_32": {
        "dataset": "evaluation/phase_iii_e/retrieval_dev_v1.json",
        "R0": "evaluation/phase_iii_e/R0_dev_v1.json",
        "R5": "evaluation/phase_iii_e/R5_dev_v1.json",
        "R6": "evaluation/phase_iii_e/R6-S1_dev_v1.json",
        "BM25": "evaluation/phase_iii_e/R6-L1-cal-0.05_dev_v1.json",
        "HYB": "evaluation/phase_iii_e/R6-H1_dev_v1.json",
        "DECOMP": "evaluation/phase_iii_e/R6-Q2_dev_v1.json",
    },
    "legacy_dev_8_12_20": {
        "dataset": "evaluation/datasets/retrieval_dev_v2.json",
        "R0": "evaluation/phase_iii_c/reports/R0_retrieval_dev_v2.json",
        "R5": "evaluation/phase_iii_c/reports/R5_aliases_retrieval_dev_v2.json",
        "R6": "evaluation/phase_iii_e/R6-S1_dev_v2.json",
        "BM25": "evaluation/phase_iii_e/R6-L1-cal-0.05_dev_v2.json",
        "HYB": "evaluation/phase_iii_e/R6-H1_dev_v2.json",
        "DECOMP": "evaluation/phase_iii_e/R6-Q2_dev_v2.json",
    },
}


def main():
    output = {"role": "OPEN_DEVELOPMENT_RANK_CEILING", "corpora": {}}
    for label, paths in DATA.items():
        raw = (ROOT / paths["dataset"]).read_bytes()
        dataset = json.loads(raw)
        digest = hashlib.sha256(raw).hexdigest()
        if dataset.get("role") not in {"DEVELOPMENT_NOT_FINAL", None}:
            raise SystemExit("refusing non-development source")
        result = {"dataset_sha256": digest, "architectures": {}}
        rows = {}
        for name, path in paths.items():
            if name == "dataset":
                continue
            report = json.loads((ROOT / path).read_bytes())
            actual = report.get("dataset_sha256", report.get("dataset", {}).get("sha256"))
            if actual != digest:
                raise SystemExit(f"{label}/{name} hash mismatch: {actual}")
            rows[name] = normalize(report, name)
            result["architectures"][name] = describe(rows[name], dataset)
        for budget in (5, 10, 20):
            name = f"2STAGE-BM25-{budget}-SEM"
            result["architectures"][name] = describe(derived_two_stage(dataset, rows["BM25"], rows["R6"], budget), dataset)
        for representation in ("title", "description"):
            name = f"BM25-{representation.upper()}"
            result["architectures"][name] = describe(bm25_variant(dataset, rows["R5"], representation), dataset)
        output["corpora"][label] = result
    path = ROOT / "evaluation/phase_iii_f/open_development_ceiling_v1.json"
    path.write_text(json.dumps(output, separators=(",", ":")) + "\n")
    print(json.dumps({label: {name: {"selected": item["selected"]["target_hits"],
                                     "top3": item["budget_curve"]["3"]["target_hits"],
                                     "top5": item["budget_curve"]["5"]["target_hits"]}
                              for name, item in corpus["architectures"].items()}
                      for label, corpus in output["corpora"].items()}, indent=2))


if __name__ == "__main__":
    main()
