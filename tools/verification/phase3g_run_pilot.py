#!/usr/bin/env python3
"""Opt-in, sequential CPU-only Phase III-G development batch pilot."""

import argparse
import hashlib
import json
import time
import urllib.request
from pathlib import Path

from phase3g_batch_research import batch_prompt, parse_batch
from phase3g_model_free import fits_context, tokens

ROOT = Path(__file__).resolve().parents[2]
EXPECTED_MODEL_SHA = "11e2ca8d10f6b52693256addca9b8f0d5bb01eebc53594b531586ea992419ac9"
MODEL = ROOT / "models/gguf/DriftLedger-Qwen2.5-7B-Q4_K_M.gguf"


def request_json(url, payload, timeout):
    request = urllib.request.Request(url, data=json.dumps(payload).encode(),
                                     headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.load(response)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--execute-inference", action="store_true")
    parser.add_argument("--cases", nargs="+", required=True)
    parser.add_argument("--sizes", type=int, nargs="+", required=True)
    parser.add_argument("--target-position", choices=("original", "first", "middle", "last"), default="original")
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--llama-url", default="http://127.0.0.1:8080")
    args = parser.parse_args()
    if not args.execute_inference:
        raise SystemExit("Opt-in --execute-inference required")
    if any(size not in (1, 2, 3, 5) for size in args.sizes):
        raise SystemExit("Allowed pilot sizes: 1, 2, 3, 5")
    digest = hashlib.file_digest(MODEL.open("rb"), "sha256").hexdigest()
    if digest != EXPECTED_MODEL_SHA:
        raise SystemExit("Frozen Q4 model hash mismatch")
    raw = (ROOT / "evaluation/phase_iii_g/batch_dev_v1.json").read_bytes()
    freeze = json.loads((ROOT / "evaluation/phase_iii_g/batch_dev_freeze_v1.json").read_bytes())
    if hashlib.sha256(raw).hexdigest() != freeze["dataset_sha256"]:
        raise SystemExit("Frozen development dataset mismatch")
    panel = json.loads(raw)
    cases = {case["id"]: case for case in panel["cases"]}
    if any(case_id not in cases for case_id in args.cases):
        raise SystemExit("Unknown development case")
    results = []
    for case_id in args.cases:
        case = cases[case_id]
        for size in args.sizes:
            requirements = case["requirements"][:size]
            if args.target_position != "original" and case["expected_affected_ids"]:
                target = next(item for item in case["requirements"]
                              if item["id"] == case["expected_affected_ids"][0])
                others = [item for item in case["requirements"] if item["id"] != target["id"]][:size - 1]
                index = (0 if args.target_position == "first" else
                         size // 2 if args.target_position == "middle" else size - 1)
                requirements = others[:index] + [target] + others[index:]
            ids = [item["id"] for item in requirements]
            prompt = batch_prompt(case["message"], requirements)
            count = tokens(prompt, args.llama_url)
            if not fits_context(count):
                results.append({"case_id": case_id, "size": size, "position": args.target_position, "ids": ids,
                                "prompt_tokens": count, "error": "prompt_budget_exceeded"})
                continue
            started = time.monotonic()
            try:
                response = request_json(args.llama_url.rstrip("/") + "/completion", {
                    "prompt": prompt, "n_predict": 120, "temperature": 0, "top_p": 1,
                    "stop": ["<|im_end|>", "<|im_start|>"],
                }, 75)
                elapsed = time.monotonic() - started
                output = str(response.get("content") or response.get("response") or response.get("text") or "")
                row = {"case_id": case_id, "size": size, "position": args.target_position, "ids": ids, "prompt_tokens": count,
                       "elapsed_seconds": round(elapsed, 3), "generated_tokens": response.get("tokens_predicted"),
                       "stopped_eos": response.get("stopped_eos"), "stopped_limit": response.get("stopped_limit"),
                       "raw": output}
                try:
                    row["parsed"] = parse_batch(output, ids)
                    row["valid_contract"] = True
                except (ValueError, TypeError) as exc:
                    row["valid_contract"] = False
                    row["error"] = str(exc)
            except Exception as exc:  # Preserve failure as evidence, never silently retry.
                row = {"case_id": case_id, "size": size, "position": args.target_position, "ids": ids, "prompt_tokens": count,
                       "elapsed_seconds": round(time.monotonic() - started, 3),
                       "valid_contract": False, "error": type(exc).__name__ + ": " + str(exc)}
            results.append(row)
            args.output.write_text(json.dumps({"role": "DEVELOPMENT_CPU_PILOT_NOT_INDEPENDENT",
                                                "dataset_sha256": freeze["dataset_sha256"],
                                                "model_sha256": digest, "results": results}, indent=2) + "\n")
            print(json.dumps({key: row.get(key) for key in
                              ("case_id", "size", "prompt_tokens", "generated_tokens", "elapsed_seconds",
                               "valid_contract", "error")}), flush=True)


if __name__ == "__main__":
    main()
