#!/usr/bin/env python3
"""Recover development-only metrics from the completed Phase III-J adapter.

This is an inference-only repair for the v2 export check that mistook
``training_args.bin`` for model weights. It never trains, edits the original
run, or opens the sealed final holdout.
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import os
import random
import tempfile
import time
from pathlib import Path


TRAINING_SCRIPT_SHA256 = "35d98b849377196d791bbd86537475c4df87e2cc2dfafe60ecde2bdbc2913f95"
ADAPTER_SHA256 = "907c98a7156d878e694d6a854fe75c9c4624a6d7f9b077735c9f3b9070ef4b21"
CONFIG_SHA256 = "4ef6911d9e7508184db146bdb7e49dec18b4e26ba2edfe7285b5fb9d774bc0a3"
SELECTED_CHECKPOINT = "/kaggle/working/drift_phase_iii_j_compat_v2/checkpoint-60"


def load_training_module(path: Path):
    spec = importlib.util.spec_from_file_location("phase3j_frozen", path)
    if spec is None or spec.loader is None:
        raise RuntimeError("cannot load frozen training script")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--package-dir", required=True, type=Path)
    parser.add_argument("--run-dir", required=True, type=Path)
    parser.add_argument("--cache-dir", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--dry-run", action="store_true", help="check package and run artifacts without a model")
    args = parser.parse_args()

    # The frozen training script selected one GPU even on a two-T4 notebook.
    visible = os.environ.get("CUDA_VISIBLE_DEVICES")
    os.environ["CUDA_VISIBLE_DEVICES"] = visible.split(",")[0] if visible else "0"

    script = args.package_dir / "phase3j.py"
    if not script.is_file():
        raise RuntimeError("frozen package script missing")
    frozen = load_training_module(script)
    if frozen.sha256(script) != TRAINING_SCRIPT_SHA256:
        raise RuntimeError("training script differs from the executed v2 package")
    _, config, _, datasets = frozen.checked_inputs()
    if frozen.sha256(args.package_dir / "training_config_v1.json") != CONFIG_SHA256:
        raise RuntimeError("frozen configuration mismatch")
    if args.output_dir.exists():
        raise RuntimeError("recovery output already exists; refusing overwrite")
    if not args.output_dir.parent.is_dir() or not args.cache_dir.is_dir():
        raise RuntimeError("output parent or original model cache missing")

    identity_path = args.run_dir / "run_identity.json"
    state_path = args.run_dir / "checkpoint-180" / "trainer_state.json"
    if not identity_path.is_file() or not state_path.is_file():
        raise RuntimeError("completed-run identity or final trainer state missing")
    identity = json.loads(identity_path.read_text(encoding="utf-8"))
    for key, wanted in (("config_sha256", CONFIG_SHA256),
                        ("train_sha256", config["train_sha256"]),
                        ("development_sha256", config["development_sha256"]),
                        ("sealed_final_sha256", config["sealed_final_sha256"])):
        if identity.get(key) != wanted:
            raise RuntimeError(f"run identity mismatch: {key}")
    state = json.loads(state_path.read_text(encoding="utf-8"))
    selected = args.run_dir / "checkpoint-60"
    if (state.get("global_step") != 180 or state.get("best_global_step") != 60
            or state.get("best_model_checkpoint") != SELECTED_CHECKPOINT):
        raise RuntimeError("checkpoint selection differs from completed run")
    adapter_dir = args.run_dir / "best_adapter"
    adapter = adapter_dir / "adapter_model.safetensors"
    selected_adapter = selected / "adapter_model.safetensors"
    if (not adapter.is_file() or not selected_adapter.is_file()
            or frozen.sha256(adapter) != ADAPTER_SHA256
            or frozen.sha256(selected_adapter) != ADAPTER_SHA256):
        raise RuntimeError("saved adapter does not equal selected checkpoint")
    metadata = adapter_dir / "training_args.bin"
    if not metadata.is_file() or metadata.stat().st_size > 1_000_000:
        raise RuntimeError("expected small Trainer metadata file missing")
    unexpected_weights = [path.name for path in adapter_dir.iterdir()
                          if path.is_file() and path.suffix in {".safetensors", ".bin", ".pt"}
                          and path.name not in {"adapter_model.safetensors", "training_args.bin"}]
    if unexpected_weights:
        raise RuntimeError(f"unexpected model-like files: {unexpected_weights}")

    if args.dry_run:
        print(json.dumps({"status": "RECOVERY_MODEL_FREE_PREFLIGHT_PASS",
                          "global_step": state["global_step"],
                          "selected_checkpoint": SELECTED_CHECKPOINT,
                          "adapter_sha256": ADAPTER_SHA256,
                          "development_rows": len(datasets["development"])}, indent=2))
        return

    runtime = frozen.runtime_preflight(config, args.output_dir, args.cache_dir)
    from safetensors import safe_open
    with safe_open(str(adapter), framework="pt", device="cpu") as reader:
        tensor_names = list(reader.keys())
    if not tensor_names or not any("lora" in name.lower() for name in tensor_names):
        raise RuntimeError("adapter safetensors has no LoRA tensor keys")

    import torch
    from peft import PeftModel, prepare_model_for_kbit_training
    from transformers import (AutoModelForCausalLM, AutoTokenizer,
                              BitsAndBytesConfig, Trainer, TrainingArguments)

    started = time.monotonic()
    random.seed(config["seed"])
    torch.manual_seed(config["seed"])
    torch.backends.cuda.matmul.allow_tf32 = False
    tokenizer = AutoTokenizer.from_pretrained(
        config["tokenizer"], revision=config["tokenizer_revision"],
        cache_dir=str(args.cache_dir), trust_remote_code=False,
    )
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    tokenizer.padding_side = "right"
    p1 = frozen.read_json("P1.json")
    dev_rows = frozen.encode_rows(datasets["development"], tokenizer, p1,
                                  config["max_sequence_length"])
    quant = BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type="nf4",
                               bnb_4bit_use_double_quant=True,
                               bnb_4bit_compute_dtype=torch.float16)
    base = AutoModelForCausalLM.from_pretrained(
        config["base_model"], revision=config["base_revision"],
        cache_dir=str(args.cache_dir), quantization_config=quant,
        device_map={"": 0}, dtype=torch.float16, trust_remote_code=False,
    )
    base.config.use_cache = False
    base = prepare_model_for_kbit_training(base, use_gradient_checkpointing=True)
    model = PeftModel.from_pretrained(base, str(adapter_dir), is_trainable=False)
    model.eval()

    with tempfile.TemporaryDirectory(prefix="phase3j-recovery-eval-", dir=args.cache_dir) as temp:
        eval_args = TrainingArguments(
            output_dir=temp, per_device_eval_batch_size=config["per_device_eval_batch_size"],
            fp16=config["fp16"], bf16=config["bf16"],
            dataloader_num_workers=config["dataloader_workers"],
            remove_unused_columns=False, report_to=[], seed=config["seed"],
            data_seed=config["seed"],
        )
        trainer = Trainer(model=model, args=eval_args, eval_dataset=dev_rows,
                          data_collator=lambda rows: frozen.collate(rows, tokenizer.pad_token_id))
        dev_loss = float(trainer.evaluate()["eval_loss"])
    def with_progress(rows):
        for index, row in enumerate(rows, 1):
            yield row
            if index % 10 == 0 or index == len(rows):
                print(f"Development generation: {index}/{len(rows)}", flush=True)

    metrics, predictions = frozen.evaluate_development(
        model, tokenizer, p1, with_progress(datasets["development"]),
        config["generation_max_new_tokens"])
    metrics["development_label_token_loss_recomputed"] = dev_loss
    metrics["checkpoint_selection_eval_loss"] = state["best_metric"]
    metrics["trainer_history"] = state["log_history"]
    metrics["selected_checkpoint"] = str(selected)
    metrics["train_loss"] = None  # Exact TrainOutput value was lost in the failed export.
    metrics["recovery_status"] = "DEVELOPMENT_ONLY_RECOMPUTED_FROM_SELECTED_ADAPTER"

    args.output_dir.mkdir(exist_ok=False)
    metrics_path = args.output_dir / "development_metrics.json"
    predictions_path = args.output_dir / "development_predictions.json"
    frozen.save_json(metrics_path, metrics)
    frozen.save_json(predictions_path, predictions)
    recovery_manifest = {
        "status": "RECOVERED_DEVELOPMENT_ONLY_NOT_FINAL_EVALUATED_NOT_PROMOTED",
        "reason": "v2 export check falsely classified training_args.bin as model weights",
        "recovery_script_sha256": frozen.sha256(Path(__file__)),
        "frozen_training_script_sha256": TRAINING_SCRIPT_SHA256,
        "config_sha256": CONFIG_SHA256,
        "train_sha256": config["train_sha256"],
        "development_sha256": config["development_sha256"],
        "sealed_final_sha256_metadata_only": config["sealed_final_sha256"],
        "original_run_identity_sha256": frozen.sha256(identity_path),
        "trainer_state_sha256": frozen.sha256(state_path),
        "adapter_sha256": ADAPTER_SHA256,
        "selected_checkpoint": str(selected),
        "selection_metric": "development label-token loss",
        "selection_metric_value": state["best_metric"],
        "development_metrics_sha256": frozen.sha256(metrics_path),
        "development_predictions_sha256": frozen.sha256(predictions_path),
        "adapter_files": {path.name: frozen.sha256(path) for path in sorted(adapter_dir.iterdir())
                          if path.is_file()},
        "runtime": runtime,
        "recovery_duration_seconds": time.monotonic() - started,
        "provenance": "AI-authored and separately AI-reviewed; NOT human-reviewed",
    }
    frozen.save_json(args.output_dir / "recovery_manifest.json", recovery_manifest)
    print(json.dumps({"status": recovery_manifest["status"],
                      "adapter_sha256": ADAPTER_SHA256,
                      "development_macro_f1": metrics["macro_f1"],
                      "structure_valid": metrics["structure_valid"],
                      "structure_total": metrics["structure_total"],
                      "recovery_manifest": str(args.output_dir / "recovery_manifest.json")}, indent=2))


if __name__ == "__main__":
    main()
