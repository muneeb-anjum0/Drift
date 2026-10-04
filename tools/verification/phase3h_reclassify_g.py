#!/usr/bin/env python3
"""Layer-classify eight frozen Phase III-G raw diagnostics without new inference."""

import argparse
import hashlib
import json
from collections import Counter
from pathlib import Path

from phase3h_contracts import ROOT, validate_raw

SOURCE = ("evaluation/phase_iii_g/pilot_probe_v1.json",
          "evaluation/phase_iii_g/pilot_position_v1.json")
EXPECTED_SHA = ("34714090d1c6723996fa82b21bb19200e893683d42a2b597639349dfcd88bda4",
                "b6f37451ae60ff237532ca73e5e6cdd49896f0e43debe082e6753584ce00062a")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    entries = []
    for source, expected_sha in zip(SOURCE, EXPECTED_SHA, strict=True):
        raw = (ROOT / source).read_bytes()
        if hashlib.sha256(raw).hexdigest() != expected_sha:
            raise SystemExit("Phase III-G raw diagnostic evidence changed")
        for index, row in enumerate(json.loads(raw)["results"]):
            diagnosis = validate_raw(row["raw"], "g_array_v1", row["ids"],
                                     stopped_limit=row.get("stopped_limit") is True,
                                     generated_tokens=row.get("generated_tokens"), output_budget=120)
            if diagnosis["valid"] != row["valid_contract"]:
                raise SystemExit("new taxonomy disagrees with original strict contract decision")
            entries.append({"case_id": row["case_id"], "experiment_id": "H-G-RECLASS",
                            "source": source, "source_index": index,
                            "batch_size": row["size"], "position": row.get("position", "original"),
                            "raw_sha256": hashlib.sha256(row["raw"].encode()).hexdigest(),
                            "prompt_tokens": row["prompt_tokens"], "generated_tokens": row["generated_tokens"],
                            "output_budget": 120, "syntax_valid": diagnosis["primary"] not in
                            {"INVALID_JSON", "EXTRA_PROSE", "TRUNCATED_OUTPUT", "EMPTY_OUTPUT"},
                            "primary_failure": diagnosis["primary"], "secondary": diagnosis["secondary"],
                            "details": diagnosis["details"],
                            "parser_result": row.get("error", "valid"),
                            "repair_result": "NOT_ATTEMPTED", "retry_result": "NOT_ATTEMPTED",
                            "notes": "Raw JSON is preserved in cited Phase III-G source; no Phase III-H model call."})
    if len(entries) != 8:
        raise SystemExit("expected exactly eight Phase III-G diagnostic calls")
    report = {"role": "HISTORICAL_OPEN_DEVELOPMENT_RECLASSIFICATION", "sources": dict(zip(SOURCE, EXPECTED_SHA, strict=True)),
              "total": len(entries), "raw_json_valid": sum(item["syntax_valid"] for item in entries),
              "strict_contract_valid": sum(item["primary_failure"] == "VALID" for item in entries),
              "primary_failure_counts": dict(Counter(item["primary_failure"] for item in entries)),
              "all_generated_below_limit": all(item["generated_tokens"] < 120 for item in entries),
              "entries": entries,
              "root_causes": [
                  {"symptom": "omitted candidate IDs/results", "likely_layer": "unconstrained model/contract compliance",
                   "evidence": "four syntactically valid complete JSON objects omit required results at 18-19 tokens",
                   "fix_attempted": "NONE_AT_RECLASSIFICATION", "result": "OPEN", "confidence": "HIGH"},
                  {"symptom": "affected=false with label=unchanged", "likely_layer": "contract-design ambiguity plus unconstrained compliance",
                   "evidence": "two syntactically valid outputs violate nullable-label rule, while unchanged is canonical in P1",
                   "fix_attempted": "NONE_AT_RECLASSIFICATION", "result": "OPEN", "confidence": "MODERATE"},
                  {"symptom": "parser rejection", "likely_layer": "strict validator correctly enforcing G-B1",
                   "evidence": "new independent strict validation agrees with original 2/8; all eight raw outputs parse as JSON",
                   "fix_attempted": "NONE", "result": "PARSER_DEFECT_NOT_OBSERVED", "confidence": "HIGH"},
              ]}
    args.output.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({key: report[key] for key in ("total", "raw_json_valid", "strict_contract_valid",
                                                    "primary_failure_counts", "all_generated_below_limit")}, indent=2))


if __name__ == "__main__":
    main()
