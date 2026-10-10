#!/usr/bin/env python3
"""Frozen Phase III-J Kaggle preflight and one-candidate QLoRA training.

Model libraries are imported only after package/data/resource preflight. The
protected final holdout is never opened by this program.
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.metadata
import json
import math
import os
import random
import shutil
import statistics
import sys
import tempfile
import time
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parent
LABELS = ("added", "modified", "removed", "contradiction", "ambiguous", "unchanged")
DATA_FILES = {"train": "reviewed_train_v1.json", "development": "reviewed_development_v1.json"}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def read_json(name: str):
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def checked_inputs():
    manifest = read_json("package_manifest.json")
    files = manifest["files"]
    for name, expected in files.items():
        if Path(name).is_absolute() or ".." in Path(name).parts or "/" in name:
            raise ValueError(f"unsafe package member: {name}")
        path = ROOT / name
        if not path.is_file() or sha256(path) != expected:
            raise ValueError(f"package hash mismatch: {name}")
    if set(files) != {
        "phase3j.py", "requirements.txt", "README.md", "P1.json",
        "training_config_v1.json", "acceptance_gate_v1.json",
        "reviewed_train_v1.json", "reviewed_development_v1.json",
    }:
        raise ValueError("package member inventory differs from frozen allowlist")
    config = read_json("training_config_v1.json")
    gate = read_json("acceptance_gate_v1.json")
    if (manifest["config_sha256"] != sha256(ROOT / "training_config_v1.json")
            or manifest["acceptance_gate_sha256"] != sha256(ROOT / "acceptance_gate_v1.json")
            or manifest["train_sha256"] != config["train_sha256"]
            or manifest["development_sha256"] != config["development_sha256"]
            or manifest["sealed_final_sha256_metadata_only"] != config["sealed_final_sha256"]
            or manifest["sealed_final_count_metadata_only"] != config["sealed_final_rows"]):
        raise ValueError("package manifest identity mismatch")
    if sha256(ROOT / "P1.json") != config["prompt_sha256"]:
        raise ValueError("P1 prompt hash mismatch")
    if config["sealed_final_sha256"] != gate["sealed_final_sha256"]:
        raise ValueError("sealed-final metadata mismatch")
    if config["ontology"] != list(LABELS) or gate["final_total"] != config["sealed_final_rows"]:
        raise ValueError("ontology/final-count metadata mismatch")
    pins = dict(line.strip().split("==", 1) for line in (ROOT / "requirements.txt").read_text().splitlines()
                if line.strip() and not line.startswith("#"))
    for name, wanted in config["required_versions"].items():
        distribution = "huggingface-hub" if name == "huggingface_hub" else name
        if name != "python" and pins.get(distribution) != wanted:
            raise ValueError(f"requirements/config version mismatch: {distribution}")
    if set(pins) != {"torch", "transformers", "peft", "accelerate", "bitsandbytes",
                     "safetensors", "huggingface-hub"}:
        raise ValueError("unexpected dependency pin")
    datasets = {}
    all_ids, family_partition = set(), {}
    for partition, filename in DATA_FILES.items():
        if sha256(ROOT / filename) != config[f"{partition}_sha256"]:
            raise ValueError(f"frozen {partition} hash mismatch")
        payload = read_json(filename)
        if not isinstance(payload, list) or len(payload) != config[f"{partition}_rows"]:
            raise ValueError(f"frozen {partition} row count mismatch")
        for row in payload:
            label = row.get("review", {}).get("reviewed_label")
            if (row.get("partition") != partition or not row.get("primary_scored")
                    or label not in LABELS or not row.get("baseline_requirement")
                    or not row.get("message")):
                raise ValueError(f"invalid reviewed {partition} row")
            if row["id"] in all_ids:
                raise ValueError("duplicate train/development ID")
            all_ids.add(row["id"])
            family = row["family_id"]
            if family in family_partition and family_partition[family] != partition:
                raise ValueError("family crosses train/development")
            family_partition[family] = partition
        datasets[partition] = payload
    return manifest, config, gate, datasets


def bytes_available(path: Path) -> int:
    return shutil.disk_usage(path).free


def host_ram_bytes() -> int:
    return os.sysconf("SC_PAGE_SIZE") * os.sysconf("SC_PHYS_PAGES")


def runtime_preflight(config, output_dir: Path, cache_dir: Path):
    if f"{sys.version_info.major}.{sys.version_info.minor}" not in {"3.11", "3.12"}:
        raise RuntimeError("Python version differs from frozen 3.11/3.12 policy")
    import torch
    import transformers
    import peft
    import accelerate
    import bitsandbytes

    required = config["required_versions"]
    for distribution, wanted in (("torch", required["torch"]),
                                 ("transformers", required["transformers"]),
                                 ("peft", required["peft"]),
                                 ("accelerate", required["accelerate"]),
                                 ("bitsandbytes", required["bitsandbytes"]),
                                 ("safetensors", required["safetensors"]),
                                 ("huggingface-hub", required["huggingface_hub"])):
        actual = importlib.metadata.version(distribution)
        if actual != wanted:
            raise RuntimeError(f"{distribution} version {actual} != frozen {wanted}")
    if not torch.cuda.is_available() or torch.cuda.device_count() < 1:
        raise RuntimeError("CUDA GPU required; no CPU/local training fallback")
    gpu = torch.cuda.get_device_properties(0)
    limits = config["minimum_resources"]
    if gpu.total_memory < limits["gpu_vram_bytes"]:
        raise RuntimeError(f"GPU VRAM {gpu.total_memory} below frozen minimum")
    if host_ram_bytes() < limits["host_ram_bytes"]:
        raise RuntimeError("host RAM below frozen minimum")
    if bytes_available(cache_dir) < limits["cache_free_bytes"]:
        raise RuntimeError("model-cache disk below frozen minimum")
    if bytes_available(output_dir.parent) < limits["output_free_bytes"]:
        raise RuntimeError("output disk below frozen minimum")
    if not torch.version.cuda:
        raise RuntimeError("PyTorch has no CUDA build")
    for parent in (output_dir.parent, cache_dir):
        with tempfile.NamedTemporaryFile(dir=parent) as check:
            check.write(b"write-test")
            check.flush()
    return {
        "python": f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
        "gpu_name": gpu.name,
        "gpu_vram_bytes": gpu.total_memory,
        "cuda_runtime": torch.version.cuda,
        "torch": torch.__version__,
        "transformers": transformers.__version__,
        "peft": peft.__version__,
        "accelerate": accelerate.__version__,
        "bitsandbytes": bitsandbytes.__version__,
        "safetensors": importlib.metadata.version("safetensors"),
        "huggingface_hub": importlib.metadata.version("huggingface-hub"),
        "host_ram_bytes": host_ram_bytes(),
        "cache_free_bytes": bytes_available(cache_dir),
        "output_free_bytes": bytes_available(output_dir.parent),
    }


def prompt_for(row, p1):
    user = p1["user_template"].format(
        baseline_requirement=row["baseline_requirement"],
        new_client_message=row["message"],
    )
    return ("<|im_start|>system\n" + p1["system_prompt"] + "\n<|im_end|>\n"
            "<|im_start|>user\n" + user + "\n<|im_end|>\n<|im_start|>assistant\n")


def encode_rows(rows, tokenizer, p1, max_length):
    output = []
    for row in rows:
        prefix = prompt_for(row, p1) + '{"label":"'
        before = tokenizer.encode(prefix, add_special_tokens=False)
        target = tokenizer.encode(row["review"]["reviewed_label"] + '"', add_special_tokens=False)
        if not target or len(before) + len(target) > max_length:
            raise ValueError(f"training token length exceeds frozen limit: {row['id']}")
        output.append({"input_ids": before + target,
                       "attention_mask": [1] * (len(before) + len(target)),
                       "labels": [-100] * len(before) + target})
    return output


def collate(features, pad_id):
    import torch
    width = max(len(row["input_ids"]) for row in features)
    return {
        "input_ids": torch.tensor([row["input_ids"] + [pad_id] * (width - len(row["input_ids"]))
                                   for row in features]),
        "attention_mask": torch.tensor([row["attention_mask"] + [0] * (width - len(row["attention_mask"]))
                                        for row in features]),
        "labels": torch.tensor([row["labels"] + [-100] * (width - len(row["labels"]))
                                for row in features]),
    }


def strict_prediction(text):
    try:
        obj = json.loads(text.strip())
    except (json.JSONDecodeError, TypeError):
        return None
    if (not isinstance(obj, dict) or set(obj) != {"label", "confidence", "reasoning", "changed_elements"}
            or obj["label"] not in LABELS or type(obj["confidence"]) not in (int, float)
            or not math.isfinite(obj["confidence"]) or not 0 <= obj["confidence"] <= 1
            or not isinstance(obj["reasoning"], str)
            or not isinstance(obj["changed_elements"], list)
            or not all(isinstance(x, str) for x in obj["changed_elements"])):
        return None
    return obj["label"]


def classification_metrics(rows):
    support = Counter(truth for truth, _, _ in rows)
    confusion = {truth: {pred: 0 for pred in (*LABELS, "INVALID")} for truth in LABELS}
    for truth, pred, _ in rows:
        confusion[truth][pred or "INVALID"] += 1
    per_class = {}
    for label in LABELS:
        tp = confusion[label][label]
        predicted = sum(confusion[truth][label] for truth in LABELS)
        precision = tp / predicted if predicted else 0.0
        recall = tp / support[label] if support[label] else 0.0
        f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
        per_class[label] = {"precision": precision, "recall": recall, "f1": f1,
                            "support": support[label], "correct": tp}
    return {
        "accuracy": sum(truth == pred for truth, pred, _ in rows) / len(rows),
        "macro_precision": statistics.mean(x["precision"] for x in per_class.values()),
        "macro_recall": statistics.mean(x["recall"] for x in per_class.values()),
        "macro_f1": statistics.mean(x["f1"] for x in per_class.values()),
        "per_class": per_class,
        "confusion_matrix": confusion,
        "raw_confusions": {f"{truth}_to_{pred}": confusion[truth][pred]
                           for truth, pred in (("removed", "modified"), ("modified", "removed"),
                                               ("contradiction", "modified"), ("modified", "contradiction"),
                                               ("added", "modified"), ("modified", "added"))},
        "structure_valid": sum(pred is not None for _, pred, _ in rows),
        "structure_total": len(rows),
        "latency_seconds_p95": sorted(seconds for _, _, seconds in rows)[math.ceil(0.95 * len(rows)) - 1],
    }


def evaluate_development(model, tokenizer, p1, rows, max_new_tokens):
    import torch
    model.eval()
    results, predictions = [], []
    for row in rows:
        tokens = tokenizer(prompt_for(row, p1), return_tensors="pt", add_special_tokens=False)
        tokens = {key: value.to("cuda:0") for key, value in tokens.items()}
        torch.cuda.synchronize()
        started = time.monotonic()
        with torch.inference_mode():
            generated = model.generate(**tokens, max_new_tokens=max_new_tokens,
                                       do_sample=False, pad_token_id=tokenizer.eos_token_id)
        torch.cuda.synchronize()
        elapsed = time.monotonic() - started
        raw = tokenizer.decode(generated[0, tokens["input_ids"].shape[1]:], skip_special_tokens=True)
        predicted = strict_prediction(raw)
        truth = row["review"]["reviewed_label"]
        results.append((truth, predicted, elapsed))
        predictions.append({"id": row["id"], "truth": truth, "prediction": predicted,
                            "structure_valid": predicted is not None, "latency_seconds": elapsed})
    return classification_metrics(results), predictions


def save_json(path: Path, value):
    path.write_text(json.dumps(value, indent=2, sort_keys=True, ensure_ascii=False) + "\n", encoding="utf-8")


def train(config, datasets, output_dir, cache_dir, runtime, resume):
    import torch
    from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
    from transformers import (AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig,
                              Trainer, TrainingArguments)
    from transformers.trainer_utils import get_last_checkpoint

    torch.manual_seed(config["seed"])
    random.seed(config["seed"])
    torch.backends.cuda.matmul.allow_tf32 = False
    config_sha = sha256(ROOT / "training_config_v1.json")
    run_manifest = output_dir / "run_identity.json"
    if resume:
        if not run_manifest.is_file() or json.loads(run_manifest.read_text()).get("config_sha256") != config_sha:
            raise RuntimeError("resume identity/config mismatch")
        checkpoint = get_last_checkpoint(str(output_dir))
        if not checkpoint:
            raise RuntimeError("resume requested without checkpoint")
    else:
        if output_dir.exists() and any(output_dir.iterdir()):
            raise RuntimeError("output directory is not empty; use --resume only for this run")
        output_dir.mkdir(parents=True, exist_ok=True)
        save_json(run_manifest, {"config_sha256": config_sha,
                                 "train_sha256": config["train_sha256"],
                                 "development_sha256": config["development_sha256"],
                                 "sealed_final_sha256": config["sealed_final_sha256"]})
        checkpoint = None
    started = time.monotonic()
    tokenizer = AutoTokenizer.from_pretrained(config["tokenizer"], revision=config["tokenizer_revision"],
                                              cache_dir=str(cache_dir), trust_remote_code=False)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    tokenizer.padding_side = "right"
    p1 = read_json("P1.json")
    train_rows = encode_rows(datasets["train"], tokenizer, p1, config["max_sequence_length"])
    dev_rows = encode_rows(datasets["development"], tokenizer, p1, config["max_sequence_length"])
    quant = BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type="nf4",
                               bnb_4bit_use_double_quant=True, bnb_4bit_compute_dtype=torch.float16)
    model = AutoModelForCausalLM.from_pretrained(
        config["base_model"], revision=config["base_revision"], cache_dir=str(cache_dir),
        quantization_config=quant, device_map={"": 0}, dtype=torch.float16,
        trust_remote_code=False,
    )
    model.config.use_cache = False
    model = prepare_model_for_kbit_training(model, use_gradient_checkpointing=True)
    lora = config["lora"]
    model = get_peft_model(model, LoraConfig(r=lora["rank"], lora_alpha=lora["alpha"],
                                            lora_dropout=lora["dropout"], bias=lora["bias"],
                                            target_modules=lora["target_modules"], task_type="CAUSAL_LM"))
    args = TrainingArguments(
        output_dir=str(output_dir), per_device_train_batch_size=1, per_device_eval_batch_size=1,
        gradient_accumulation_steps=config["gradient_accumulation_steps"],
        learning_rate=config["learning_rate"], lr_scheduler_type=config["scheduler"],
        warmup_steps=config["warmup_steps"], num_train_epochs=config["epochs"],
        max_steps=config["max_steps"], optim=config["optimizer"],
        fp16=config["fp16"], bf16=config["bf16"], gradient_checkpointing=config["gradient_checkpointing"],
        eval_strategy="epoch", save_strategy="epoch", save_total_limit=config["checkpoint_limit"],
        load_best_model_at_end=True, metric_for_best_model="eval_loss", greater_is_better=False,
        logging_steps=10, dataloader_num_workers=config["dataloader_workers"],
        remove_unused_columns=False, report_to=[],
        seed=config["seed"], data_seed=config["seed"],
    )
    trainer = Trainer(model=model, args=args, train_dataset=train_rows, eval_dataset=dev_rows,
                      data_collator=lambda features: collate(features, tokenizer.pad_token_id))
    train_result = trainer.train(resume_from_checkpoint=checkpoint)
    dev_loss = trainer.evaluate()["eval_loss"]
    metrics, predictions = evaluate_development(trainer.model, tokenizer, p1,
                                                datasets["development"], config["generation_max_new_tokens"])
    metrics["train_loss"] = train_result.training_loss
    metrics["development_label_token_loss"] = dev_loss
    metrics["trainer_history"] = trainer.state.log_history
    metrics["selected_checkpoint"] = trainer.state.best_model_checkpoint
    adapter_dir = output_dir / "best_adapter"
    if adapter_dir.exists():
        raise RuntimeError("adapter output already exists")
    trainer.save_model(str(adapter_dir))
    tokenizer.save_pretrained(str(adapter_dir))
    adapter = adapter_dir / "adapter_model.safetensors"
    unexpected_weights = [path.name for path in adapter_dir.iterdir()
                          if path.is_file() and path.suffix in {".safetensors", ".bin", ".pt"}
                          and path.name != "adapter_model.safetensors"]
    if not adapter.is_file() or unexpected_weights:
        raise RuntimeError("expected adapter-only safetensors artifact")
    save_json(output_dir / "development_metrics.json", metrics)
    save_json(output_dir / "development_predictions.json", predictions)
    manifest = {
        "status": "TRAINED_DEVELOPMENT_ONLY_NOT_FINAL_EVALUATED_NOT_PROMOTED",
        "base_model": config["base_model"], "base_revision": config["base_revision"],
        "adapter_sha256": sha256(adapter), "config_sha256": config_sha,
        "train_sha256": config["train_sha256"],
        "development_sha256": config["development_sha256"],
        "sealed_final_sha256": config["sealed_final_sha256"],
        "selected_checkpoint": trainer.state.best_model_checkpoint,
        "selection_metric": "development label-token loss",
        "runtime": runtime, "duration_seconds": time.monotonic() - started,
        "peak_gpu_allocated_bytes": torch.cuda.max_memory_allocated(0),
        "development_metrics_sha256": sha256(output_dir / "development_metrics.json"),
        "development_predictions_sha256": sha256(output_dir / "development_predictions.json"),
        "adapter_files": {path.name: sha256(path) for path in sorted(adapter_dir.iterdir()) if path.is_file()},
        "provenance": "AI-authored and separately AI-reviewed; NOT human-reviewed",
    }
    save_json(output_dir / "training_manifest.json", manifest)
    print(json.dumps({"training_manifest": str(output_dir / "training_manifest.json"),
                      "adapter_sha256": manifest["adapter_sha256"],
                      "development_macro_f1": metrics["macro_f1"]}, indent=2))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=("preflight", "train"))
    parser.add_argument("--dry-run", action="store_true", help="model-free package/hash/data check only")
    parser.add_argument("--resume", action="store_true", help="resume only this config from last checkpoint")
    parser.add_argument("--output-dir", type=Path, default=Path("/kaggle/working/drift_phase_iii_j"))
    parser.add_argument("--cache-dir", type=Path, default=Path("/kaggle/temp/drift_hf_cache"))
    args = parser.parse_args()
    # Kaggle commonly exposes two GPUs; this frozen experiment uses exactly one.
    visible = os.environ.get("CUDA_VISIBLE_DEVICES")
    os.environ["CUDA_VISIBLE_DEVICES"] = visible.split(",")[0] if visible else "0"
    manifest, config, gate, datasets = checked_inputs()
    if args.dry_run:
        if args.command != "preflight":
            parser.error("--dry-run applies only to preflight")
        print(json.dumps({"status": "MODEL_FREE_PREFLIGHT_PASS", "train": len(datasets["train"]),
                          "development": len(datasets["development"]),
                          "sealed_final_sha256": gate["sealed_final_sha256"],
                          "config_sha256": sha256(ROOT / "training_config_v1.json")}, indent=2))
        return
    if not args.output_dir.parent.is_dir() or not args.cache_dir.parent.is_dir():
        raise RuntimeError("output/cache parent missing; Kaggle paths must exist")
    args.cache_dir.mkdir(exist_ok=True)
    runtime = runtime_preflight(config, args.output_dir, args.cache_dir)
    if args.command == "preflight":
        print(json.dumps({"status": "GPU_PREFLIGHT_PASS", "runtime": runtime}, indent=2))
    else:
        train(config, datasets, args.output_dir, args.cache_dir, runtime, args.resume)


if __name__ == "__main__":
    main()
