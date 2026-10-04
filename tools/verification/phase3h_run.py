#!/usr/bin/env python3
"""Bounded, sequential, CPU-only Phase III-H development inference recorder."""

import argparse
import hashlib
import json
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from phase3h_contracts import ROOT, batch_prompt, json_schema, p1_prompt, validate_raw

SERVER = "http://127.0.0.1:8080"
MODEL_SHA = "11e2ca8d10f6b52693256addca9b8f0d5bb01eebc53594b531586ea992419ac9"
PROMPT_SHA = "902ac43037c998afc4b6550995036bbc720bcae5dbbafc4504b2b9898abed339"
SELECTION_SHA = "930bccdb9a687adb2bfad40756c1ffac722a326ce331e30a2ec10a0a398996c1"
PLAN = {
    "A1": ("p1_single_v1", "p1", False),
    "C0": ("p1_single_v1", "p1", True),
    "I1": ("p1_single_v1", "p1", False),
    "A2": ("g_array_v1", "g_original", False),
    "B1": ("g_array_v1", "g_compact", False),
    "C1": ("g_array_v1", "g_original", True),
    "D1": ("h_map_v1", "h_map", False),
    "D2": ("h_map_v1", "h_map", True),
}


def sha(path):
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def post(path, payload, timeout=120):
    req = Request(SERVER + path, data=json.dumps(payload).encode(),
                  headers={"Content-Type": "application/json"})
    with urlopen(req, timeout=timeout) as response:
        return json.load(response)


def get(path):
    with urlopen(SERVER + path, timeout=5) as response:
        return json.load(response)


def available_kib():
    for line in Path("/proc/meminfo").read_text().splitlines():
        if line.startswith("MemAvailable:"):
            return int(line.split()[1])
    raise RuntimeError("MemAvailable not found")


def verify_environment():
    checks = {
        "model_sha256": sha(ROOT / "models/gguf/DriftLedger-Qwen2.5-7B-Q4_K_M.gguf"),
        "p1_sha256": sha(ROOT / "evaluation/prompts/P1.json"),
        "selection_sha256": sha(ROOT / "evaluation/phase_iii_h/diagnostic_selection_v1.json"),
    }
    if checks != {"model_sha256": MODEL_SHA, "p1_sha256": PROMPT_SHA,
                  "selection_sha256": SELECTION_SHA}:
        raise RuntimeError(f"frozen source hash mismatch: {checks}")
    props = get("/props")
    if (props.get("total_slots") != 1 or
            props["default_generation_settings"]["n_ctx"] != 768 or
            "b11151" not in props.get("build_info", "")):
        raise RuntimeError("pinned llama runtime/slot/context changed")
    if available_kib() < 4 * 1024 * 1024:
        raise RuntimeError("less than 4 GiB host memory available")
    return checks, {"build_info": props["build_info"], "n_ctx": 768,
                    "total_slots": 1, "model_ftype": props.get("model_ftype")}


def selected_cases(experiment, size):
    panel = json.loads((ROOT / "evaluation/phase_iii_h/diagnostic_selection_v1.json").read_text())
    if experiment == "I1":
        data = json.loads((ROOT / panel["batch_source"]).read_text())
        case = next(item for item in data["cases"] if item["id"] == "g-two-removals")
        return [(f"g-two-removals/{item['id']}", {"baseline_requirement": item["text"],
                 "client_message": case["message"], "expected_label": "removed"}, 1)
                for item in case["requirements"][:2]]
    if experiment in ("A1", "C0"):
        data = json.loads((ROOT / panel["raw_dev_source"]).read_text())
        index = {case["id"]: case for case in data["cases"]}
        if experiment == "C0":
            selected = [panel["single_case_ids"][index] for index in (0, 2, 4, 6, 8, 10)]
            return [(case_id, index[case_id], 1) for case_id in selected]
        return [(case_id, index[case_id], iteration) for case_id in panel["single_case_ids"]
                for iteration in ([1, 2] if case_id in panel["single_repeat_ids"] else [1])]
    data = json.loads((ROOT / panel["batch_source"]).read_text())
    index = {case["id"]: case for case in data["cases"]}
    return [(case_id, index[case_id], 1) for case_id in panel["batch_case_ids"]]


def run(experiment, size, order, output):
    contract, variant, constrained = PLAN[experiment]
    checks, runtime = verify_environment()
    cases = selected_cases(experiment, size)
    if output.exists():
        raise RuntimeError("refusing to overwrite existing evidence")
    rows = []
    report = {"experiment": experiment, "contract": contract, "variant": variant,
              "constrained": constrained, "size": size, "order": order, "source_checks": checks,
              "runtime": runtime, "request_settings": {"temperature": 0, "top_p": 1,
              "n_predict": 120, "stop": ["<|im_end|>", "<|im_start|>"]},
              "cases": rows}
    for case_id, case, iteration in cases:
        if available_kib() < 4 * 1024 * 1024:
            raise RuntimeError("resource guard stopped experiment before next call")
        if experiment in ("A1", "C0", "I1"):
            prompt = p1_prompt(case["baseline_requirement"], case["client_message"])
            ids = None
            expected = case["expected_label"]
        else:
            requirements = case["requirements"][:size]
            if order == "reversed":
                requirements = list(reversed(requirements))
            prompt = batch_prompt(case["message"], requirements, variant)
            ids = [item["id"] for item in requirements]
            expected = {rid: case["expected_labels"].get(rid) for rid in ids}
        tokenized = post("/tokenize", {"content": prompt, "add_special": False})
        prompt_tokens = len(tokenized["tokens"])
        if prompt_tokens > 568:
            raise RuntimeError(f"prompt budget exceeded ({case_id}: {prompt_tokens})")
        request = {"prompt": prompt, "temperature": 0, "top_p": 1, "n_predict": 120,
                   "stop": ["<|im_end|>", "<|im_start|>"]}
        if constrained:
            request["json_schema"] = json_schema(contract, ids)
        row = {"case_id": case_id, "iteration": iteration, "allowed_ids": ids,
               "expected_development_label": expected, "prompt_tokens": prompt_tokens,
               "prompt_sha256": hashlib.sha256(prompt.encode()).hexdigest(),
               "schema": request.get("json_schema"), "mem_available_kib_before": available_kib()}
        start = time.monotonic()
        try:
            response = post("/completion", request)
            row["latency_seconds"] = round(time.monotonic() - start, 3)
            row["raw_response"] = response
            row["raw_text"] = response.get("content", "")
            row["validation"] = validate_raw(row["raw_text"], contract, ids,
                                              stopped_limit=(response.get("stop_type") == "limit" or
                                                             response.get("stopped_limit", False)),
                                              generated_tokens=response.get("tokens_predicted"),
                                              output_budget=120)
            parsed = row["validation"]["parsed"]
            if parsed is not None:
                if experiment in ("A1", "C0", "I1"):
                    row["semantic_match"] = parsed["label"] == expected
                elif contract == "g_array_v1":
                    predicted = {item["id"]: item["label"] if item["affected"] else None
                                 for item in parsed}
                    row["semantic_match"] = predicted == expected
                else:
                    row["semantic_match"] = parsed == expected
            else:
                row["semantic_match"] = None
        except (HTTPError, URLError, TimeoutError) as exc:
            row["latency_seconds"] = round(time.monotonic() - start, 3)
            row["runtime_error"] = str(exc)
            if isinstance(exc, HTTPError):
                row["runtime_error_body"] = exc.read().decode(errors="replace")[:2000]
            row["validation"] = {"valid": False, "primary": "RUNTIME_ERROR"}
        row["mem_available_kib_after"] = available_kib()
        rows.append(row)
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n")
        print(f"{experiment} {case_id} #{iteration}: {row['validation']['primary']} "
              f"semantic={row.get('semantic_match')} tokens={row.get('raw_response', {}).get('tokens_predicted')} "
              f"seconds={row['latency_seconds']}", flush=True)
        if row["validation"]["primary"] == "RUNTIME_ERROR":
            raise RuntimeError("runtime request failed; evidence retained; stopping")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--experiment", choices=PLAN, required=True)
    parser.add_argument("--size", type=int, choices=[2, 3, 5])
    parser.add_argument("--order", choices=["original", "reversed"], default="original")
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--execute-inference", action="store_true", required=True)
    args = parser.parse_args()
    if args.experiment in ("A1", "C0", "I1") and args.size is not None:
        parser.error("single-item experiment must not have size")
    if args.experiment not in ("A1", "C0", "I1") and args.size is None:
        parser.error("batch size required")
    if args.experiment in ("A1", "C0", "I1") and args.order != "original":
        parser.error("single-item experiment has no order variant")
    run(args.experiment, args.size, args.order, args.output)


if __name__ == "__main__":
    main()
