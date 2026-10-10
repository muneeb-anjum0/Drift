# Phase III-J Label-Only Corrective Training Runbook (Preparation Only)

**Status: package preparation. This document does not authorize training.** One run may occur only after review of the verified package and separate explicit authorization. The rejected Phase III-J output and all earlier evidence remain immutable. Use a **private Kaggle notebook** and attach the new package as a **private dataset**; do not publish notebook versions, logs, outputs, or datasets containing reviewed examples or adapters.

## Package identity and boundaries

Experiment `phase3j-label-only-corrective-v1` starts from pinned `Qwen/Qwen2.5-7B-Instruct` revision `a09a35458c702b33eeacc393d103063234e8bc28` with no rejected adapter. Frozen train/development SHA-256 values are `d3198232c18b48aaafbb795e511f94e033d01172803465fa63ee13630bfc0658` and `89a9506ddf3c65dd6a7361a4e69366917046c8ea38f8b661baa7`. P1-L1 SHA-256 is `67204d638542f75bb140e5236adbd416c981a38d4903ef500cc8ac18a884b470`. The final seal is metadata only; the package excludes its payload, old weights, rejected adapter, and probe archives. Package ZIP is built under ignored `archive/phase_iii_j/phase3j_label_only_v1/`; inspect and verify its SHA before uploading. The package manifest records current HEAD and byte hashes of all members. A dirty-tree HEAD is not a complete source identity, so retain the ZIP SHA and manifest together.

Build locally with `python tools/phase3j_label_only/build_package.py`. The reviewed artifact is `archive/phase_iii_j/phase3j_label_only_v1/phase3j_label_only_v1_verified.zip`, SHA-256 `4888ae364903b1375b18c902ac5462c0e71071c416ec000bd9800a37d7855082`; two consecutive builds from unchanged inputs matched byte-for-byte. Earlier draft ZIPs in this ignored directory are **not** the verified artifact. If sources change, re-review and record a new package SHA rather than treating it as this verified v1. The builder checks frozen hyperparameters and exact development thresholds against the original config and approved proposal. Do not rebuild after training has begun or silently swap a Kaggle dataset version.

## Exact notebook sequence — only after separate training authorization

Set Kaggle accelerator to one T4 (the script selects the first visible CUDA device), internet on for pinned Hugging Face revision, and private notebook/dataset. Attach the ZIP package as a private dataset, then run cells in order. Replace only `PACKAGE_ZIP` with the attached ZIP's actual absolute path; do not change the expected SHA, config, prompt, or output location. Python 3.12 is required by these cells because Kaggle's notebook kernel may use 3.13.

Cell 1 — verify and extract the package into a fresh working path:

```python
from pathlib import Path
import hashlib, zipfile

PACKAGE_ZIP = Path("/kaggle/input/REPLACE_WITH_PRIVATE_DATASET/phase3j_label_only_v1_verified.zip")
EXPECTED_ZIP_SHA256 = "4888ae364903b1375b18c902ac5462c0e71071c416ec000bd9800a37d7855082"
package_dir = Path("/kaggle/working/phase3j_label_only_package_v1")
assert PACKAGE_ZIP.is_file() and len(EXPECTED_ZIP_SHA256) == 64
assert hashlib.sha256(PACKAGE_ZIP.read_bytes()).hexdigest() == EXPECTED_ZIP_SHA256
assert not package_dir.exists()
package_dir.mkdir()
with zipfile.ZipFile(PACKAGE_ZIP) as archive:
    assert archive.testzip() is None
    assert all(Path(name).name == name for name in archive.namelist())
    archive.extractall(package_dir)
print(package_dir)
```

Cell 2 — use installed `uv` to create a Python 3.12 environment, then install exact pins. Do not use the notebook kernel's Python 3.13 for the training script:

```python
import shutil, subprocess
venv = Path("/tmp/drift_phase3j_label_only_py312")
assert shutil.which("python3.12") and shutil.which("uv")
assert not venv.exists()
subprocess.run([shutil.which("uv"), "venv", "--python", shutil.which("python3.12"), str(venv)], check=True)
python312 = str(venv / "bin/python")
subprocess.run([shutil.which("uv"), "pip", "install", "--python", python312,
                "-r", str(package_dir / "requirements.txt")], check=True)
```

Cell 3 — model-free preflight first; it reads only package-reviewed train/development data and local audit tokenizer. It writes six-class representative token traces, labels tensors, EOS, prompt-mask positions, and padding evidence. No GPU model is loaded:

```python
audit = Path("/kaggle/working/phase3j_label_only_mask_audit.json")
assert not audit.exists()
subprocess.run([python312, str(package_dir / "phase3j_label_only.py"), "preflight", "--dry-run",
                "--audit-output", str(audit)], check=True)
```

Cell 4 — full runtime preflight. It verifies Python/dependencies/CUDA/minimum 14 GB VRAM, 12 GB RAM, 22 GB model-cache free, 5 GB output free, write paths, pinned tokenizer behavior, base revision/weight-file availability, and a nonexistent output path:

```python
cache = Path("/tmp/drift_hf_cache")
output = Path("/kaggle/working/drift_phase_iii_j_label_only_v1")
assert not output.exists()
subprocess.run([python312, str(package_dir / "phase3j_label_only.py"), "preflight",
                "--cache-dir", str(cache), "--output-dir", str(output)], check=True)
```

Cell 5 — **do not run under this preparation task**. After explicit one-run training authorization and only if both preflights passed, this is the sole training command:

```python
assert not output.exists()
subprocess.run([python312, "-u", str(package_dir / "phase3j_label_only.py"), "train",
                "--cache-dir", str(cache), "--output-dir", str(output)], check=True)
```

No `--resume`, second run, alternate directory, class balancing, prompt edits, or hyperparameter changes are preauthorized. A failed preflight stops the run. An interrupted training run is not permission to retry; preserve the partial output and request review.

## Required evidence and post-run boundary

The future training output must contain `checkpoint-*` directories, `best_adapter/adapter_model.safetensors`, tokenizer files, `run_identity.json`, `mask_audit.json`, `development_predictions.json` (raw GPU diagnostics only), `development_metrics.json` (including selected checkpoint/full-response loss), `training_manifest.json`, and Trainer logs/checkpoint state. Record SHA-256 for each required artifact and all base-weight shards used. Inspect for unexpected base weights in the adapter directory. Any missing required evidence makes the outcome inconclusive.

**The training script does not declare a development-gate pass.** Its GPU adapter predictions are diagnostic and not directly comparable to the original Q4_K_M CPU baseline. After training, a separately frozen conversion/evaluation procedure must select the lowest-development-loss checkpoint, convert exactly that adapter to one Q4_K_M GGUF, and run the approved identical CPU llama.cpp P1-L1 protocol for three full 124-case passes. Preserve every raw string and apply all encoded gates; any failed gate rejects advancement and no automatic retraining follows. If conversion, matched runtime, three-pass raw evidence, or gate scoring is unavailable, development outcome is **INCONCLUSIVE**. Do not open final. The proposed final-gate translation also needs separate approval before any final comparison.

Back up the entire output directory and download its archive while the Kaggle session is alive; a closed draft session may erase `/kaggle/working`. Verify ZIP integrity and SHA-256 after local download, retain a second copy, and do not rely only on browser click feedback. Keep archives under ignored local `archive/phase_iii_j/`; do not commit binary artifacts. A private notebook or dataset setting does not make a public link safe.
