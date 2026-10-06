# Drift Phase III-J — Kaggle training package

Status: **untrained**. This package contains only frozen reviewed train (477) and development (124) cases. The 182-row final holdout is **not here**; its SHA-256 `a3a391962e0fac7b6129d4ea57808a6b4189444fb106395d4d944b9c93670ccb` is metadata only. Cases were AI-authored and separately AI-reviewed, **not human-reviewed**. The earlier human-review requirement remains unmet.

Compatibility repair (2026-10-07): the original package stopped before its first training step because pinned Transformers 5.18.0 no longer accepts `save_safetensors` in `TrainingArguments`. This package removes only that unsupported constructor argument. The frozen data, configuration, dependency pins, model revision, acceptance gate, and required adapter-only safetensors output are unchanged. The script still rejects a missing `best_adapter/adapter_model.safetensors` or any unexpected weight file. Do not resume the failed attempt: no checkpoint was created. Start this repaired package with a fresh output directory and retain the failed run for provenance.

Use a private Kaggle notebook and private dataset. Enable one GPU and Internet access before installation. Upload `drift_phase_iii_j_training_compat_v2.zip` as a private dataset; do not attach the superseded package at the same time. Kaggle may expose its extracted directory under `/kaggle/input/<your-dataset>/drift_phase_iii_j_training`; locate the folder containing `phase3j.py` if the dataset slug differs. Do not upload the protected final JSON.

Use Python 3.11 or 3.12, as frozen in `training_config_v1.json`. If the Kaggle notebook kernel is Python 3.13 but `/usr/bin/python3.12` and `uv` are available, create an isolated 3.12 environment and install exactly the packaged requirements. This does not change the notebook kernel; every package-script call must use the environment's Python:

```python
from pathlib import Path
import shutil, subprocess
package = next(Path('/kaggle/input').rglob('drift_phase_iii_j_training/phase3j.py')).parent
python312 = '/tmp/drift_phase3j_uv_py312/bin/python'
subprocess.run([shutil.which('uv'), 'venv', '--python', '/usr/bin/python3.12',
                '/tmp/drift_phase3j_uv_py312'], check=True)
subprocess.run([shutil.which('uv'), 'pip', 'install', '--python', python312,
                '-r', str(package / 'requirements.txt')], check=True)
```

Run the model-free and full preflights before training. On the 2026-10-07 Kaggle session `/kaggle/temp` was absent; `/tmp` had sufficient free space, so both full preflight and training used the same `--cache-dir /tmp/drift_hf_cache`. Use a fresh output directory for this repaired run because the failed attempt left an identity file but no checkpoint:

```python
from pathlib import Path
import subprocess
package = next(Path('/kaggle/input').rglob('drift_phase_iii_j_training/phase3j.py')).parent
python312 = '/tmp/drift_phase3j_uv_py312/bin/python'
output = '/kaggle/working/drift_phase_iii_j_compat_v2'
cache = '/tmp/drift_hf_cache'
subprocess.run([python312, str(package/'phase3j.py'), 'preflight', '--dry-run'], check=True)
subprocess.run([python312, str(package/'phase3j.py'), 'preflight', '--cache-dir', cache,
                '--output-dir', output], check=True)
subprocess.run([python312, '-u', str(package/'phase3j.py'), 'train', '--cache-dir', cache,
                '--output-dir', output], check=True)
```

The dry run verifies package, config, prompt, train/development hashes and counts without importing model libraries or using a GPU. The full preflight checks exact dependency versions, CUDA/PyTorch, GPU type and VRAM, host RAM, cache and output disk, and write access. It fails closed when resources are insufficient; it does not change batch size, quantization or other training semantics to fit a GPU. The base model is downloaded at its frozen revision; no weights are included in the ZIP. Default cache is `/kaggle/temp/drift_hf_cache`, and outputs are written to `/kaggle/working/drift_phase_iii_j`. If Kaggle exposes a different writable scratch directory, pass `--cache-dir PATH` to both full preflight and train; it must have the frozen free-space minimum. No local-PC training is intended.

If Kaggle interrupts an existing run after checkpoint creation, rerun `train --resume` with the same package and output directory. Resume refuses mismatched config or missing checkpoints. Do not start a second configuration or use final data to repair this run.

The training loss is restricted to the reviewed label value after the exact P1 prompt and JSON label prefix. No unsupported rationale or changed-elements content is fabricated. Model selection uses only development label-token loss at epoch checkpoints; development generation exports raw six-class metrics, structural validity and confusion counts. A selected training checkpoint is **not** yet a final candidate or a deployment artifact.

Expected output under the chosen fresh output directory: `checkpoint-*`, `best_adapter/adapter_model.safetensors`, tokenizer/adapter metadata, `run_identity.json`, `development_metrics.json`, `development_predictions.json`, and `training_manifest.json`. Save/download the output directory, preserving hashes and logs. Do not open the final holdout on Kaggle. Later, after one candidate adapter and inference artifact are separately frozen, compare old and new raw models once against the sealed final under the predeclared gate. No promotion is automatic.

If the preflight or run fails, keep the logs and partial output; report the exact error. Do not lower resource checks, edit config, relabel data, install a different dependency set, or substitute a model without a new explicitly documented experiment.
