"""Frozen 600-case, development-only baseline. No training or locked-test access."""

import argparse
import csv
import hashlib
import json
import platform
from pathlib import Path

from label_only_600_contract import decision, repeat_ids, score


def digest(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def paths(bundle: Path) -> dict[str, Path]:
    return {name: bundle / filename for name, filename in {
        "development": "development.csv",
        "prompt": "prompt_v1.json",
        "gate": "gate_v1.json",
        "parser": "label_only_600_contract.py",
        "model": "model_freeze_v1.json",
        "runner": "kaggle_baseline.py",
    }.items()}


def verify_bundle(bundle: Path) -> tuple[list[dict[str, str]], dict, dict, dict, dict[str, Path]]:
    p = paths(bundle)
    freeze = read_json(bundle / "protocol_freeze_v1.json")
    expected = {
        "development": freeze["private_data"]["development_sha256"],
        "prompt": freeze["prompt"]["sha256"],
        "gate": freeze["gate"]["sha256"],
        "parser": freeze["parser_and_scorer"]["sha256"],
    }
    for name, sha in expected.items():
        if digest(p[name]) != sha:
            raise ValueError(f"Frozen {name} hash mismatch")
    with p["development"].open(newline="", encoding="utf-8") as stream:
        cases = list(csv.DictReader(stream))
    repeat_ids(cases)  # Also checks six-class support and unique IDs.
    if len(cases) != 150:
        raise ValueError("Development partition must contain exactly 150 cases")
    return cases, read_json(p["prompt"]), read_json(p["gate"]), read_json(p["model"]), p


def model_files(snapshot: Path, model_freeze: dict) -> dict[str, str]:
    expected = dict(model_freeze["expected_model_shards_sha256"])
    expected["config.json"] = model_freeze["expected_config_sha256"]
    expected["tokenizer_config.json"] = model_freeze["expected_tokenizer_config_sha256"]
    actual = {name: digest(snapshot / name) for name in expected}
    if actual != expected:
        raise ValueError("Pinned model files failed SHA-256 verification")
    return actual


def runtime() -> dict:
    import accelerate
    import huggingface_hub
    import torch
    import transformers

    if not torch.cuda.is_available():
        raise RuntimeError("Kaggle GPU is required for this baseline")
    return {
        "python": platform.python_version(),
        "torch": torch.__version__,
        "transformers": transformers.__version__,
        "accelerate": accelerate.__version__,
        "huggingface_hub": huggingface_hub.__version__,
        "gpu": torch.cuda.get_device_name(0),
        "cuda_runtime": torch.version.cuda,
    }


def snapshot_for(model_freeze: dict) -> Path:
    from huggingface_hub import snapshot_download

    return Path(snapshot_download(
        repo_id=model_freeze["repository"], revision=model_freeze["revision"],
        allow_patterns=["*.json", "*.safetensors", "*.txt"],
    ))


def preflight(bundle: Path, output: Path) -> None:
    cases, _, _, model_freeze, p = verify_bundle(bundle)
    environment = runtime()
    snapshot = snapshot_for(model_freeze)
    files = model_files(snapshot, model_freeze)
    from transformers import AutoTokenizer

    tokenizer = AutoTokenizer.from_pretrained(snapshot, local_files_only=True)
    template = tokenizer.chat_template
    if not isinstance(template, str) or not template:
        raise ValueError("Model chat template is missing")
    manifest = {
        "status": "PREFLIGHT_ONLY_NO_MODEL_CALLS",
        "model_repository": model_freeze["repository"],
        "model_revision": model_freeze["revision"],
        "model_dtype": model_freeze["dtype"],
        "model_file_sha256": files,
        "chat_template_sha256": hashlib.sha256(template.encode()).hexdigest(),
        "chat_template_kwargs": model_freeze["chat_template_kwargs"],
        "tokenizer_eos_token_id": tokenizer.eos_token_id,
        "runtime": environment,
        "bundle_sha256": {name: digest(path) for name, path in p.items()},
        "protocol_freeze_sha256": digest(bundle / "protocol_freeze_v1.json"),
        "ordered_development_ids_sha256": hashlib.sha256(
            ("\n".join(row["id"] for row in cases) + "\n").encode()
        ).hexdigest(),
        "model_calls": 0,
        "locked_test": "NOT_PRESENT_NOT_USED",
    }
    output.mkdir(parents=True, exist_ok=False)
    (output / "preflight_manifest.json").write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n")
    print(json.dumps({"status": manifest["status"], "manifest": str(output / "preflight_manifest.json"),
                      "model": manifest["model_repository"], "gpu": environment["gpu"]}, indent=2))


def checked_preflight(bundle: Path, output: Path, model_freeze: dict, p: dict[str, Path]) -> tuple[Path, dict]:
    manifest = read_json(output / "preflight_manifest.json")
    if manifest["status"] != "PREFLIGHT_ONLY_NO_MODEL_CALLS" or manifest["runtime"] != runtime():
        raise ValueError("Kaggle runtime differs from the reviewed preflight")
    if manifest["model_repository"] != model_freeze["repository"] or manifest["model_revision"] != model_freeze["revision"]:
        raise ValueError("Model identity differs from preflight")
    if manifest["bundle_sha256"] != {name: digest(path) for name, path in p.items()} or \
            manifest["protocol_freeze_sha256"] != digest(bundle / "protocol_freeze_v1.json"):
        raise ValueError("Bundle differs from preflight")
    snapshot = snapshot_for(model_freeze)
    if manifest["model_file_sha256"] != model_files(snapshot, model_freeze):
        raise ValueError("Model files differ from preflight")
    return snapshot, manifest


def run(bundle: Path, output: Path) -> None:
    cases, prompt, gate, model_freeze, p = verify_bundle(bundle)
    if (output / "primary.jsonl").exists() or (output / "repeat.jsonl").exists():
        raise FileExistsError("Evidence exists; do not rerun or select a replacement output")
    snapshot, manifest = checked_preflight(bundle, output, model_freeze, p)
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer

    tokenizer = AutoTokenizer.from_pretrained(snapshot, local_files_only=True)
    template = tokenizer.chat_template
    if hashlib.sha256(template.encode()).hexdigest() != manifest["chat_template_sha256"] or \
            tokenizer.eos_token_id != manifest["tokenizer_eos_token_id"]:
        raise ValueError("Tokenizer template or EOS differs from preflight")
    model = AutoModelForCausalLM.from_pretrained(
        snapshot, torch_dtype=torch.float16, local_files_only=True, low_cpu_mem_usage=True,
    ).to("cuda").eval()
    eos = tokenizer.eos_token_id
    if not isinstance(eos, int):
        raise ValueError("Expected one integer EOS token ID")

    def infer(row: dict[str, str]) -> dict[str, str]:
        user_text = prompt["user_template"].format(
            baseline_requirement=row["baseline_requirement"],
            new_client_message=row["new_client_message"],
        )
        ids = tokenizer.apply_chat_template(
            [{"role": "system", "content": prompt["system_prompt"]},
             {"role": "user", "content": user_text}],
            tokenize=True, add_generation_prompt=True,
            **model_freeze["chat_template_kwargs"], return_tensors="pt",
        ).to("cuda")
        with torch.inference_mode():
            generated = model.generate(
                ids, do_sample=False, max_new_tokens=32, eos_token_id=eos,
                pad_token_id=eos, use_cache=True,
            )[0, ids.shape[-1]:].tolist()
        finished = bool(generated and generated[-1] == eos)
        raw = tokenizer.decode(generated[:-1] if finished else generated,
                               skip_special_tokens=False, clean_up_tokenization_spaces=False)
        return {"id": row["id"], "raw_text": raw,
                "finish_reason": "eos" if finished else "length"}

    by_id = {row["id"]: row for row in cases}
    primary = {}
    with (output / "primary.jsonl").open("x", encoding="utf-8") as stream:
        for index, row in enumerate(cases, 1):
            result = infer(row)
            primary[row["id"]] = result
            stream.write(json.dumps(result, ensure_ascii=False) + "\n")
            stream.flush()
            if index % 10 == 0:
                print(f"Primary {index}/150", flush=True)
    repeat = {}
    with (output / "repeat.jsonl").open("x", encoding="utf-8") as stream:
        for index, case_id in enumerate(repeat_ids(cases), 1):
            result = infer(by_id[case_id])
            repeat[case_id] = result
            stream.write(json.dumps(result, ensure_ascii=False) + "\n")
            stream.flush()
            if index % 10 == 0:
                print(f"Repeat {index}/30", flush=True)
    report = score(cases, primary, repeat)
    report["decision"] = decision(report, gate, identity_verified=True)
    report["evidence_sha256"] = {name: digest(output / name) for name in ("primary.jsonl", "repeat.jsonl")}
    (output / "score.json").write_text(json.dumps(report, indent=2, sort_keys=True) + "\n")
    print(json.dumps({"decision": report["decision"], "correct": report["correct"],
                      "macro_f1": report["macro_f1"], "structurally_valid": report["structurally_valid"],
                      "repeat": report["repeat"]["label_agreement"]}, indent=2))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("preflight", "run"))
    parser.add_argument("--bundle", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if args.command == "preflight":
        preflight(args.bundle, args.output)
    else:
        run(args.bundle, args.output)


if __name__ == "__main__":
    main()
