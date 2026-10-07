# Phase III-J development-only raw-output probe

Status (2026-10-08): **prepared and model-free checked; not run on a GPU**. This is a diagnostic of the already-trained, rejected adapter, not another training run or a final-holdout evaluation. The private local upload bundle is `archive/phase_iii_j/drift_phase_iii_j_probe_bundle_v1.zip` (162,237,608 bytes; SHA-256 `c8f03c5ae2f32812371bd0f79aa0afa23fb52ae08525a6fc71c76d19108d563c`). It contains the frozen v2 training package, run identity, final trainer state, selected adapter, and probe code; it excludes optimizer checkpoints and final-holdout rows. The original full backup remains untouched.

Upload this ZIP as a **private** Kaggle dataset, attach only that dataset to a **private** GPU notebook, and enable Internet for the pinned dependencies and base-model download. Do not upload or attach the sealed final JSON. The bundle's script checks frozen package/run hashes and selects the first two development IDs in each label, sorted by ID, without consulting outcomes. It records the exact evaluation-decoded raw text, token IDs, unstripped decoded text, strict parser result, diagnostic-only recoverable label, parse-failure reason, prompt/generated token counts, inferred stop reason, latency, and runtime in a small evidence ZIP. The stop reason is inferred from the final token and generation limit; the library does not provide an authoritative stop-reason field here.

Pre-probe verification: the 15-member bundle passed ZIP integrity and a model-free dry run. Its selected adapter is SHA-256 `907c98a7156d878e694d6a854fe75c9c4624a6d7f9b077735c9f3b9070ef4b21` from checkpoint 60, with frozen `Qwen/Qwen2.5-7B-Instruct` revision `a09a35458c702b33eeacc393d103063234e8bc28`, P1 SHA-256 `902ac43037c998afc4b6550995036bbc720bcae5dbbafc4504b2b9898abed339`, greedy decoding, and 120 new-token limit. No final-holdout payload member or `FH` case-ID marker was present; exact-string checks found no protected Phase III-D/E/I/I.5 case text in textual bundle members. The sealed final case text itself was not opened for this audit. The probe script SHA-256 is `226d09a8501eb311164ffff4691743afb1fb1fdc5c0b413102ca7d7b40271e36`. The 12 selected development IDs are `DV0008`, `DV0011`, `DV0003`, `DV0005`, `DV0001`, `DV0002`, `DV0004`, `DV0017`, `DV0058`, `DV0120`, `DV0007`, and `DV0009`.

Run these cells in order in the notebook. Stop and share the error if any cell fails; do not improvise a different package, model, parser, prompt, or dependency version.

## Cell 1 — locate the private bundle

```python
from pathlib import Path
import subprocess

scripts = list(Path("/kaggle/input").rglob("drift_phase_iii_j_probe_v1/probe_phase3j.py"))
assert len(scripts) == 1, f"Expected one extracted private probe bundle, found {len(scripts)}"
bundle = scripts[0].parent
print("Bundle:", bundle)
subprocess.run(["nvidia-smi", "--query-gpu=name,memory.total", "--format=csv,noheader"], check=True)
```

## Cell 2 — model-free identity check

```python
import sys

cache = Path("/tmp/drift_hf_cache")
probe_output = Path("/kaggle/working/drift_phase_iii_j_probe_v1")
probe_args = ["-B", "-u", str(bundle / "probe_phase3j.py"), "probe",
              "--bundle-dir", str(bundle), "--cache-dir", str(cache),
              "--output-dir", str(probe_output)]
subprocess.run([sys.executable, *probe_args, "--dry-run"], check=True)
```

Expected status: `PROBE_MODEL_FREE_PREFLIGHT_PASS`, with 12 development IDs and adapter SHA-256 ending `...ef4b21`. No dependencies are installed and no model is loaded in this cell.

## Cell 3 — isolate Python 3.12 and install the frozen pins

```python
import shutil

uv = shutil.which("uv")
assert uv and Path("/usr/bin/python3.12").is_file(), "Python 3.12 or uv is unavailable"
venv = Path("/tmp/drift_phase3j_probe_py312")
assert not venv.exists(), "Probe environment already exists; stop rather than reuse it blindly"
subprocess.run([uv, "venv", "--python", "/usr/bin/python3.12", str(venv)], check=True)
python312 = str(venv / "bin/python")
subprocess.run([uv, "pip", "install", "--python", python312, "-r",
                str(bundle / "drift_phase_iii_j_training" / "requirements.txt")], check=True)
```

## Cell 4 — GPU/resource and pinned-dependency preflight

```python
cache.mkdir(exist_ok=True)
probe_command = [python312, *probe_args]
subprocess.run([*probe_command, "--gpu-preflight"], check=True)
```

Expected status: `PROBE_GPU_PREFLIGHT_PASS`, with the frozen dependency versions, CUDA GPU, RAM, and scratch/output disk checks. The base model is not loaded in this cell.

## Cell 5 — GPU diagnostic inference only

```python
subprocess.run(probe_command, check=True)
```

Expected final status: `DEVELOPMENT_ONLY_RAW_OUTPUT_PROBE_NOT_FINAL_NOT_PROMOTED`. This cell loads the pinned base and saved adapter, then generates exactly 12 development outputs. It performs no optimizer steps and does not read final-holdout rows.

## Cell 6 — verify, then immediately download the small evidence ZIP

```python
import hashlib
import zipfile

evidence_zip = probe_output.with_suffix(".zip")
assert evidence_zip.is_file(), "Evidence ZIP was not written"
with zipfile.ZipFile(evidence_zip) as archive:
    assert archive.testzip() is None, "Evidence ZIP failed integrity check"
print("DOWNLOAD NOW:", evidence_zip)
print("SIZE BYTES:", evidence_zip.stat().st_size)
print("SHA-256:", hashlib.sha256(evidence_zip.read_bytes()).hexdigest())
```

Download `drift_phase_iii_j_probe_v1.zip` from the Kaggle notebook's Output panel **before closing the session**. Confirm it appears in the laptop Downloads folder, then move it to the Git-ignored `archive/phase_iii_j/` directory and compare SHA-256. Do not rely on the draft session or saved-version Output as the only copy. The ZIP contains raw model output and development-case IDs, so keep it private and out of GitHub. Only after local verification should the raw outputs be inspected and the response-target hypothesis accepted or rejected.
