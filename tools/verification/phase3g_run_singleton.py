#!/usr/bin/env python3
"""Opt-in P1-only CPU development comparison on frozen R5-selected pairs."""

import argparse
import hashlib
import json
import sys
import time
from pathlib import Path

from phase3g_model_free import fits_context, tokens
from phase3g_run_pilot import EXPECTED_MODEL_SHA, MODEL, ROOT, request_json

sys.path.insert(0, str(ROOT))
from services.inference.contracts import parse_prediction


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--execute-inference", action="store_true")
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--llama-url", default="http://127.0.0.1:8080")
    args = parser.parse_args()
    if not args.execute_inference:
        raise SystemExit("Opt-in --execute-inference required")
    digest = hashlib.file_digest(MODEL.open("rb"), "sha256").hexdigest()
    if digest != EXPECTED_MODEL_SHA:
        raise SystemExit("Frozen Q4 model mismatch")
    raw = (ROOT / "evaluation/phase_iii_g/batch_dev_v1.json").read_bytes()
    freeze = json.loads((ROOT / "evaluation/phase_iii_g/batch_dev_freeze_v1.json").read_bytes())
    if hashlib.sha256(raw).hexdigest() != freeze["dataset_sha256"]:
        raise SystemExit("Frozen development panel mismatch")
    panel = json.loads(raw)
    report = json.loads((ROOT / "evaluation/phase_iii_g/retrieval_r5_dev_v1.json").read_bytes())
    selected = {row["query_id"]: row["selected_requirement_ids"] for row in report["results"]}
    p1 = json.loads((ROOT / "evaluation/prompts/P1.json").read_bytes())
    if hashlib.sha256((ROOT / "evaluation/prompts/P1.json").read_bytes()).hexdigest() != \
            "902ac43037c998afc4b6550995036bbc720bcae5dbbafc4504b2b9898abed339":
        raise SystemExit("Frozen P1 mismatch")
    results = []
    for case in panel["cases"]:
        requirements = {item["id"]: item["text"] for item in case["requirements"]}
        for rid in selected[case["id"]]:
            user = p1["user_template"].format(baseline_requirement=requirements[rid],
                                              new_client_message=case["message"])
            prompt = ("<|im_start|>system\n" + p1["system_prompt"] + "\n<|im_end|>\n"
                      "<|im_start|>user\n" + user + "\n<|im_end|>\n<|im_start|>assistant\n")
            prompt_tokens = tokens(prompt, args.llama_url)
            if not fits_context(prompt_tokens):
                raise SystemExit("Unexpected P1 prompt budget exceeded")
            started = time.monotonic()
            try:
                response = request_json(args.llama_url.rstrip("/") + "/completion", {
                    "prompt": prompt, "n_predict": 120, "temperature": 0, "top_p": 1,
                    "stop": ["<|im_end|>", "<|im_start|>"],
                }, 65)
                output = str(response.get("content") or response.get("response") or response.get("text") or "")
                row = {"case_id": case["id"], "requirement_id": rid,
                       "expected_affected": rid in case["expected_affected_ids"],
                       "expected_label": case["expected_labels"].get(rid),
                       "prompt_tokens": prompt_tokens, "generated_tokens": response.get("tokens_predicted"),
                       "elapsed_seconds": round(time.monotonic() - started, 3), "raw": output}
                try:
                    parsed = parse_prediction(output)
                    row["parsed"] = parsed.model_dump()
                    row["valid_contract"] = True
                except Exception as exc:
                    row["valid_contract"] = False
                    row["error"] = type(exc).__name__ + ": " + str(exc)
            except Exception as exc:
                row = {"case_id": case["id"], "requirement_id": rid,
                       "expected_affected": rid in case["expected_affected_ids"],
                       "expected_label": case["expected_labels"].get(rid),
                       "prompt_tokens": prompt_tokens,
                       "elapsed_seconds": round(time.monotonic() - started, 3),
                       "valid_contract": False, "error": type(exc).__name__ + ": " + str(exc)}
            results.append(row)
            args.output.write_text(json.dumps({"role": "DEVELOPMENT_P1_COMPONENT_NOT_FULL_PRODUCT",
                                                "dataset_sha256": freeze["dataset_sha256"],
                                                "model_sha256": digest, "results": results}, indent=2) + "\n")
            print(json.dumps({key: row.get(key) for key in
                              ("case_id", "requirement_id", "expected_label", "valid_contract",
                               "generated_tokens", "elapsed_seconds", "error")}), flush=True)


if __name__ == "__main__":
    main()
