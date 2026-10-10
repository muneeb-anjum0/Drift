# Phase III-J Label-Only Conversion Environment

## 1. Status

**Environment status: READY for review, not authorized for execution.** The frozen `checkpoint-120` adapter remains `TRAINED_NOT_YET_DEVELOPMENT_ACCEPTED`. The conversion-only Python lock installed in a fresh Python 3.12.3 environment with wheel-hash enforcement, and model-free imports of both pinned converters and the Qwen2 converter succeeded. This establishes dependency/import readiness only; no conversion operation or 7B model load was attempted. The exact conversion run still requires separate authorization and all other stops in the [conversion/CPU-screen plan](phase_iii_j_label_only_conversion_and_cpu_screen_plan.md) still apply.

At inspection the repository branch was `phase-3/targeted-retraining`, HEAD `88e81355688ad2daf21ffcc7fac95d26823477ca`. The pre-existing worktree included Phase III-J documentation and tool changes; they were preserved. The evidence ZIP SHA-256 remained `1384215ee87cac32a94a9bad93988806662cb80815d3194388bab152657a153f`; the selected `best_adapter/adapter_model.safetensors` remained `531457905d97c6f944316a6665df52593713b87513369794ecfd8bc6920c5c78`, matching the local training manifest and checkpoint-120.

## 2. llama.cpp Identity

The repository's `tools/model/setup_llama_cpp.py` pins `b11151`. The local checkout `tools/model/vendor/llama.cpp` is clean; `git rev-parse HEAD` is **`bd4f514db14d87fded667787a7a963bfbaa98e89`**, and `git describe --tags --exact-match HEAD` is **`b11151`**. The checkout's own `requirements/requirements-convert_lora_to_gguf.txt` includes the HF-converter requirements. Those specify `torch==2.11.0`, `transformers==4.57.6`, `numpy~=2.2.6`, `sentencepiece>=0.1.98,<0.3.0`, `protobuf>=4.21.0,<5.0.0`, and `gguf>=0.1.0` (the last supplied by the pinned vendored source here).

## 3. Converter Scripts

| Role | Exact repository path | SHA-256 |
| --- | --- | --- |
| Base HF converter (not planned to rerun; preverified base F16 is reused) | `tools/model/vendor/llama.cpp/convert_hf_to_gguf.py` | `e9a1da876330bbce9687541ab31736542a01b4ac43c6686126514a50f122fb7f` |
| Selected adapter converter | `tools/model/vendor/llama.cpp/convert_lora_to_gguf.py` | `3c5f109f3d7a5ef530ea388d8e994512df6f544ce1aa8b2e39be446223637b93` |

The LoRA converter uses local `conversion/` classes and inserts `gguf-py` into `sys.path`; the vendored `gguf-py/pyproject.toml` declares **gguf 0.19.0**. No PyPI `gguf` package is installed in the conversion environment. The pinned checkout hash covers `conversion/` and `gguf-py`; the verifier also asserts that `gguf` imports from that vendored directory and that `Qwen2ForCausalLM` resolves to `Qwen2Model`.

The planned, **not executed**, chain is: verify existing base HF and F16 GGUF (`models/gguf/Qwen2.5-7B-Instruct-F16.gguf`, SHA-256 `970ccec3ad83bb62aa25ce585bed4ebd297963257442afe697d350465933f2c5`); read the frozen adapter directory under `archive/phase_iii_j/label_only_evidence.IqqIf87M/drift_phase_iii_j_label_only_v1/best_adapter`; run the LoRA converter with `--base models/base/Qwen2.5-7B-Instruct --outtype f16`; merge with `llama-export-lora -t 4 --device none --n-gpu-layers 0`; validate nonempty `GGUF` headers, types, sizes, and hashes at each stage; run `llama-quantize ... Q4_K_M 4`; validate and record final Q4_K_M GGUF size/hash. The exact proposed commands and no-overwrite promotion rules remain in the conversion/CPU-screen plan. Historical `tools/model/build_q4km_model.py` and helpers hardcode old v5 paths and must **not** be run unchanged.

## 4. Python Version

**CPython 3.12.3**, Linux x86-64. The verification environment was `/tmp/phase3j-conversion-verify-py312` (temporary, not a deliverable), created by `uv 0.12.24` from its managed CPython 3.12.3 distribution. Its `bin/python` resolves to `/home/muneebanjum/.local/share/uv/python/cpython-3.12.3-linux-x86_64-gnu/bin/python3.12`; executable SHA-256 **`4933b6c4a8521fb3aa93856701e30b3ac2626d3c47ceb22965a3b0b422e85b44`**. A future setup with a different Python binary must stop and be separately reviewed, even if the version string agrees. The host Python 3.14 and Kaggle training environment were not used.

## 5. Exact Python Dependency Lock

The authoritative, 27-distribution, exact-version **and wheel-hash** lock is [`tools/phase3j_label_only/conversion_requirements.txt`](../tools/phase3j_label_only/conversion_requirements.txt), SHA-256 **`a4598236d9195ab1d567e199a825151ca5bc1b332e5f34b67fd3da45d87d582a`**. [`conversion_requirements.in`](../tools/phase3j_label_only/conversion_requirements.in) records the direct requirements and is not an installable lock. CPU PyTorch comes from the PyTorch CPU wheel index via `uv --torch-backend cpu`; the installed version is **`torch==2.11.0+cpu`**. `--require-hashes --no-deps --only-binary :all:` prevents unrecorded installations or source builds. The full lock pins transitive packages too; `verify_conversion_environment.py` rejects any installed distribution set/version drift.

| Direct package and pinned version | Encoded range / need | Import route |
| --- | --- | --- |
| `torch==2.11.0+cpu` | llama HF-converter requirement `==2.11.0`; tensor operations, safetensors loading | Both converter scripts; `conversion.base`, `conversion.qwen` |
| `transformers==4.57.6` | llama requirement `==4.57.6`; `AutoConfig`, `AutoTokenizer` | LoRA converter, `conversion.base`, token/vocab helpers |
| `numpy==2.2.6` | llama requirement `~=2.2.6`; array and GGUF tensor handling | `conversion.base/qwen`, vendored `gguf` |
| `sentencepiece==0.2.2` | llama requirement `>=0.1.98,<0.3.0`; tokenizer support | vendored `gguf.vocab`; `conversion.base` fallback |
| `protobuf==4.25.9` | llama requirement `>=4.21.0,<5.0.0`; tokenizer/protobuf dependency | tokenizer stack (import verified as `google.protobuf`) |
| `safetensors==0.8.0` | LoRA converter lazily imports `safetensors.torch.load_file` for selected `.safetensors` adapter | `convert_lora_to_gguf.py` |
| `huggingface-hub==0.36.2` | LoRA converter's `try_to_load_from_cache`; Transformers dependency | `convert_lora_to_gguf.py`, Transformers |
| `pyyaml==6.0.3`, `tqdm==4.70.1`, `requests==2.34.2` | vendored `gguf-py` declares minimums and imports them | `gguf.metadata`, `gguf_writer`, `gguf.utility` |
| `tokenizers==0.22.2` | Transformers tokenizer dependency | `transformers`/`AutoTokenizer` |

The other 16 exact transitive pins and all allowed wheel hashes are in the lock: `certifi`, `charset-normalizer`, `filelock`, `fsspec`, `hf-xet`, `idna`, `jinja2`, `markupsafe`, `mpmath`, `networkx`, `packaging`, `regex`, `setuptools`, `sympy`, `typing-extensions`, and `urllib3`. Optional Mistral-only `mistral-common` and unrelated GUI packages are not needed for Qwen2 and are intentionally absent; the optional import path is guarded in pinned source. This lock is for the **converter path**, not for training or inference.

## 6. Binary Identities

| Purpose | Path / immutable image | SHA-256 or image digest | Build evidence |
| --- | --- | --- | --- |
| GGUF LoRA merge | `tools/model/vendor/llama.cpp/build/bin/llama-export-lora` | `271f65d0b94cef7be8fa8a0266d4c8ed518862228a4d84a3c09337289849953e` | `--version`: `0.5.0-dev (build 1, commit bd4f514)`, GNU 16.2.1 Linux x86-64 |
| Q4_K_M quantizer | `tools/model/vendor/llama.cpp/build/bin/llama-quantize` | `5d2701c3de7986e574f92b150bff607ae63720244b153387cc3a8beba0b40a4b` | `--version` prints usage, not a build banner; exact binary hash and pinned checkout are the identity checks. Do not infer a version from its usage text. |
| Local model-free server identity check | `tools/model/vendor/llama.cpp/build/bin/llama-server` | `3a0d40cd6a311b69004fbe4c82cb8247c1ddb737212f4f55ebd309a6dafdce7f` | `--version`: `0.5.0-dev (build 1, commit bd4f514)`, GNU 16.2.1 Linux x86-64 |
| Future matched CPU screening (not run) | `ghcr.io/ggml-org/llama.cpp:server-b11151` | `sha256:fffcc1af1105bafc713a47b6680fb7cf5856ed43ea2e9e8bca5a62bbd6365edf` | Model-free container `--version`: `0.5.0-dev (build 11151, commit bd4f514db)`, GNU 14.2.0 Linux x86-64 |

The container image digest was verified against the locally present image. The local build and container build numbers differ; both link to the same source commit, and screening must use the **frozen container digest**, not silently substitute the local server.

## 7. Import/Compatibility Verification

`uv pip install` installed only the 27 hash-locked distributions into the fresh environment; `uv pip check` reported all packages compatible. [`verify_conversion_environment.py`](../tools/phase3j_label_only/verify_conversion_environment.py) passed: it checks Python version/binary hash, clean exact llama.cpp commit/tag, lock/script/binary hashes, all 27 installed distribution names and versions, all 27 corresponding package imports, vendored `gguf` source/version, `Qwen2ForCausalLM` class lookup, and import-level loading of both pinned converter modules. Result: `CONVERSION_ENVIRONMENT_IMPORT_PASS: Python 3.12.3, 27 exact distributions`.

The import check does **not** prove successful full tensor conversion, GGUF quality, tokenizer equivalence, quantization, or development-screen performance. Those require later separately authorized steps. It did not read model weights or development/final examples.

## 8. Reproducibility Procedure

From the repository root on a Linux x86-64 host, first confirm that the branch/HEAD and candidate/source hashes still match the candidate freeze. In a **new** temporary environment, use the recorded bootstrap version and exact lock:

```bash
set -euo pipefail
phase3j_bootstrap_dir=$(mktemp -d /tmp/phase3j-conversion-bootstrap.XXXXXX)
python3 -m venv "$phase3j_bootstrap_dir"
"$phase3j_bootstrap_dir/bin/python" -m pip install uv==0.12.24
"$phase3j_bootstrap_dir/bin/uv" python install 3.12.3
phase3j_env_dir=$(mktemp -d /tmp/phase3j-conversion-env.XXXXXX)
"$phase3j_bootstrap_dir/bin/uv" venv --python 3.12.3 "$phase3j_env_dir"
"$phase3j_bootstrap_dir/bin/uv" pip install --python "$phase3j_env_dir/bin/python" \
  --require-hashes --no-deps --only-binary :all: --torch-backend cpu \
  -r tools/phase3j_label_only/conversion_requirements.txt
"$phase3j_bootstrap_dir/bin/uv" pip check --python "$phase3j_env_dir/bin/python"
"$phase3j_env_dir/bin/python" tools/phase3j_label_only/verify_conversion_environment.py
```

The verifier fails closed on Python executable hash, any installed dependency/version drift, llama.cpp commit/tag/worktree drift, lock hash, converter script hashes, binary hashes, and vendored-gguf provenance. Independently verify the future screening image and model-free build banner before any CPU screen:

```bash
set -euo pipefail
docker image inspect ghcr.io/ggml-org/llama.cpp:server-b11151 \
  --format '{{range .RepoDigests}}{{println .}}{{end}}' |
  grep -Fx 'ghcr.io/ggml-org/llama.cpp@sha256:fffcc1af1105bafc713a47b6680fb7cf5856ed43ea2e9e8bca5a62bbd6365edf'
phase3j_server_version=$(docker run --rm --entrypoint /app/llama-server \
  ghcr.io/ggml-org/llama.cpp@sha256:fffcc1af1105bafc713a47b6680fb7cf5856ed43ea2e9e8bca5a62bbd6365edf \
  --version 2>&1)
printf '%s\n' "$phase3j_server_version" | grep -F 'build 11151, commit bd4f514db'
```

The container command must report build `11151`, commit `bd4f514db`; a missing image, digest mismatch, or build mismatch is a stop, not permission to choose a replacement. The verifier's exact file hashes are the script/binary/lock hash checks; `sha256sum` can be used to display them independently. No `setup_llama_cpp.py` rebuild is part of this procedure.

## 9. Blockers

**No remaining dependency/import or pinned-binary blocker was found.** A previous draft of the conversion plan identified the unpinned Python converter environment as a hard stop; this document and the hash-locked fresh-env verification resolve that **environment-specific** stop. Conversion itself has not been authorized. All later candidate/source hash, disk/RAM/swap, output-collision, tokenizer, GGUF validation, matched-CPU protocol, and runner/gate freeze stops remain as specified in the plan. An import pass is not a claim that the candidate has passed development screening.

## 10. Authorization Boundary

**THIS DOCUMENT DOES NOT AUTHORIZE CONVERSION.** It also does not authorize LoRA merge, quantization, candidate inference, development screening, final-holdout access, retraining, prompt/parser/gate changes, production migration, commit, or push. No final payload was accessed; the final holdout remains sealed and untouched. The next action is to review and authorize or reject the **exact frozen conversion run** separately.
