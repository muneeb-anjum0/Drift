# Phase III-J Label-Only Conversion and Matched CPU Development Screen Plan

**DESIGN ONLY — NOT AUTHORIZED FOR EXECUTION.** The [selected candidate](phase_iii_j_label_only_candidate_freeze.md) is trained but **not development-accepted**. No merge, conversion, quantization, candidate inference, retraining, final-holdout access, or production migration occurs under this plan. The existing four-field production model and its paths remain untouched. Approve or reject this frozen procedure before any conversion.

## 1. Frozen candidate and source inputs

- Selected `checkpoint-120` adapter: `archive/phase_iii_j/label_only_evidence.IqqIf87M/drift_phase_iii_j_label_only_v1/best_adapter/adapter_model.safetensors`, SHA-256 `531457905d97c6f944316a6665df52593713b87513369794ecfd8bc6920c5c78`; adapter config SHA-256 `2adae8421b6445aa6235f57b0afd81597b87f077ad9c8d422273d3f11a653828`. The source directory is read-only input for conversion; do not copy over the old v5 adapter.
- Base: `Qwen/Qwen2.5-7B-Instruct` revision `a09a35458c702b33eeacc393d103063234e8bc28`. All four local `models/base/Qwen2.5-7B-Instruct/model-0000{1..4}-of-00004.safetensors` hashes exactly match the four Kaggle hashes in `training_manifest.json` (listed in the candidate freeze). The base's existing F16 GGUF, `models/gguf/Qwen2.5-7B-Instruct-F16.gguf`, is 15,237,853,760 bytes, SHA-256 `970ccec3ad83bb62aa25ce585bed4ebd297963257442afe697d350465933f2c5`, verified locally. Reuse this **only** after rechecking that hash; do not regenerate or substitute it without a revised plan.
- Prompt: P1-L1 SHA-256 `67204d638542f75bb140e5236adbd416c981a38d4903ef500cc8ac18a884b470`. Development partition: 124 rows, SHA-256 `89a9506ddf3c65dd6a7361a4e69366917046c8ea38ef0c45f81838f8b661baa7`. Approved development-gate JSON SHA-256 `cadc64da3c89e1c450cbee8096d4bc64d54101cb74559343fbcd363106bb8967`. None may change.
- Saved adapter tokenizer SHA-256 `3fd169731d2cbde95e10bf356d66d5997fd885dd8dbb6fb4684da3f23b2585d8` differs bytewise from the packaged audit/base tokenizer SHA-256 `c0382117ea329cdf097041132f6d735924b697924d6f6fc3945713e96ce87539`. Kaggle preflight checked their effective tokenization on permitted inputs; before screening, inspect converted GGUF tokenizer metadata and verify the actual P1-L1 prompt/label tokens and chat stop IDs against the frozen baseline. A tokenizer mismatch is **INCONCLUSIVE**, not a reason to edit the prompt or output.

## 2. Exact established conversion path and tool identities

Use **B: convert the base and selected LoRA to GGUF separately, then merge their GGUF tensors and quantize**. This is the repository's low-memory path: [`build_q4km_model.py`](../tools/model/build_q4km_model.py) orchestrates [`convert_sources_to_gguf.py`](../tools/model/convert_sources_to_gguf.py), [`merge_gguf_lora.py`](../tools/model/merge_gguf_lora.py), and [`quantize_gguf_q4km.py`](../tools/model/quantize_gguf_q4km.py). The older HF/PyTorch `merge_and_unload` route caused a documented host OOM ([evidence](phase_iii_evidence.md)) and is **not** the selected method. The existing orchestrator and helpers hardcode the *historical v5 adapter and GGUF filenames*; **do not run them unchanged or with `--force`** for this candidate. The proposed new-path commands below use their exact converter/exporter/quantizer flags without modifying old artifacts.

| Tool | Frozen identity |
| --- | --- |
| llama.cpp source | tag `b11151`, full commit `bd4f514db14d87fded667787a7a963bfbaa98e89`; local checkout was clean at inspection |
| Base converter | `tools/model/vendor/llama.cpp/convert_hf_to_gguf.py`, SHA-256 `e9a1da876330bbce9687541ab31736542a01b4ac43c6686126514a50f122fb7f`; the preverified base F16 GGUF is reused rather than rerunning it |
| LoRA converter | `tools/model/vendor/llama.cpp/convert_lora_to_gguf.py`, SHA-256 `3c5f109f3d7a5ef530ea388d8e994512df6f544ce1aa8b2e39be446223637b93` |
| GGUF LoRA merge | `tools/model/vendor/llama.cpp/build/bin/llama-export-lora`, SHA-256 `271f65d0b94cef7be8fa8a0266d4c8ed518862228a4d84a3c09337289849953e`, locally reports commit `bd4f514` |
| Quantizer | `tools/model/vendor/llama.cpp/build/bin/llama-quantize`, SHA-256 `5d2701c3de7986e574f92b150bff607ae63720244b153387cc3a8beba0b40a4b`; command type **`Q4_K_M`**, CPU, four threads, no importance matrix or requantization |
| Future CPU screening server | `ghcr.io/ggml-org/llama.cpp:server-b11151` **image digest** `sha256:fffcc1af1105bafc713a47b6680fb7cf5856ed43ea2e9e8bca5a62bbd6365edf`; executable build `11151`, commit `bd4f514db` (distinct from locally built conversion binaries) |

The vendored llama.cpp conversion requirements specify `torch==2.11.0`, `transformers==4.57.6`, `numpy~=2.2.6`, `sentencepiece>=0.1.98,<0.3.0`, `protobuf>=4.21.0,<5.0.0`, and local vendored `gguf` code. They did not fully pin every conversion Python dependency. The separate [conversion environment freeze](phase_iii_j_label_only_conversion_environment.md) now records a hash-locked Python 3.12.3 environment and successful fresh-env import verification; that **environment-specific hard stop is resolved for review**, subject to rechecking its fail-closed verifier before any authorized run. The host Python 3.14.7 and Kaggle training environment are not substitutes. This plan still does **not** authorize conversion or screening.

## 3. Predeclared output names and conversion operations

All new outputs are under ignored `models/gguf/phase3j_label_only_v1/`; none may exist before execution. Work sequentially on CPU with `CUDA_VISIBLE_DEVICES` empty; no concurrent stages. From the repository root, with a separately verified Python 3.12.3 conversion interpreter substituted **once before starting** for `<PINNED_CONVERSION_PYTHON>`, the proposed commands are the established script operations with new paths:

```bash
<PINNED_CONVERSION_PYTHON> tools/model/vendor/llama.cpp/convert_lora_to_gguf.py \
  archive/phase_iii_j/label_only_evidence.IqqIf87M/drift_phase_iii_j_label_only_v1/best_adapter \
  --base models/base/Qwen2.5-7B-Instruct --outtype f16 \
  --outfile models/gguf/phase3j_label_only_v1/DriftLedger-Phase3J-LabelOnly-v1-LoRA-F16.gguf.tmp

tools/model/vendor/llama.cpp/build/bin/llama-export-lora \
  -m models/gguf/Qwen2.5-7B-Instruct-F16.gguf \
  --lora models/gguf/phase3j_label_only_v1/DriftLedger-Phase3J-LabelOnly-v1-LoRA-F16.gguf \
  -o models/gguf/phase3j_label_only_v1/DriftLedger-Phase3J-LabelOnly-v1-Merged-F16.gguf.tmp \
  -t 4 --device none --n-gpu-layers 0

tools/model/vendor/llama.cpp/build/bin/llama-quantize \
  models/gguf/phase3j_label_only_v1/DriftLedger-Phase3J-LabelOnly-v1-Merged-F16.gguf \
  models/gguf/phase3j_label_only_v1/DriftLedger-Phase3J-LabelOnly-v1-Q4_K_M.gguf.tmp \
  Q4_K_M 4
```

After each successful stage, verify nonzero size and `GGUF` header, compute SHA-256, then atomically promote its `.gguf.tmp` to the corresponding `.gguf` **only if that final path is absent**. Verify the promoted hash again. Preserve the three stage hashes, sizes, command line, tool hashes, base/adapter hashes, interpreter/dependency lock, timestamps, and peak RAM/swap. The intended final artifact is **`models/gguf/phase3j_label_only_v1/DriftLedger-Phase3J-LabelOnly-v1-Q4_K_M.gguf`**, type `Q4_K_M`, maximum **6,000,000,000 bytes**. Its SHA-256 is necessarily **unknown until conversion** and must be frozen before any candidate inference. A wrong type, tokenizer metadata, missing stage hash, size above cap, nonzero swap when resource policy requires zero, or attempted overwrite stops the procedure. No generated artifact is committed or placed at the old production filename.

## 4. Frozen original-model CPU comparator

The preserved [P1-L1 baseline result](phase_iii_j_label_only_baseline_result.md) and ignored `archive/phase_iii_j/label_only_baseline_v1/execution_manifest.json`/`runner.py` are the protocol authority. Original model: `models/gguf/DriftLedger-Qwen2.5-7B-Q4_K_M.gguf`, 4,683,074,112 bytes, SHA-256 `11e2ca8d10f6b52693256addca9b8f0d5bb01eebc53594b531586ea992419ac9` (reverified locally). Baseline runner SHA-256 `fb4b5599b8a8633da2ca5b36a980c83f3b0026967b4ec3ca15a9d2fecf0edc7d`; frozen prompt SHA-256 `67204d638542f75bb140e5236adbd416c981a38d4903ef500cc8ac18a884b470`.

The candidate must be run on the **same Intel i7-8750H host** and the identical CPU llama.cpp image digest/build above. Server flags: context `768`, one slot (`--parallel 1`), `--threads 6`, `--n-gpu-layers 0`, `--device none`, internal port `8080`; model mount read-only, 7 GiB container memory limit and 8 GiB memory+swap limit as in `docker-compose.yml`. No GPU offload, server upgrade, altered thread count, or concurrent inference. Verify `/props` reports `Q4_K - Medium`, `n_ctx=768`, one slot, and default `top_k=20`; verify executable version and image digest before requests. A different host/build/configuration is **INCONCLUSIVE**, not a result to normalize.

Request the same plain P1-L1 chat prompt from the empty assistant turn for each oracle baseline requirement and new client message. Exact request settings from the saved runner: `n_predict=32`, `temperature=0`, `top_p=1`, `top_k=20`, `seed=1729`, `stop=["<|im_end|>","<|im_start|>"]`, `stream=false`; no forced JSON prefix, grammar, constrained decoder, retry, repair, or Go/FastAPI postprocessing. Use the same `evaluation/phase_iii_j/frozen/reviewed_development_v1.json` bytes and fixed `DV0001`–`DV0124` order. Run **three complete sequential passes**. Pass 1 alone supplies semantic metrics; passes 2/3 test exact raw-string, parsed-label, and structural-validity agreement with pass 1. The old baseline's three passes were 124/124 valid and exactly repeatable, with primary 90/124 accuracy and macro F1 `0.6954`; these are paired *development* context, not final evidence.

Use the saved baseline runner's duplicate-key-aware `strict_prediction(raw, stopped_limit)` semantics **unchanged**: one complete JSON object, exactly one `label` key with one of six canonical lowercase strings, JSON whitespace permitted, no surrounding text; `stopped_limit` is invalid. Invalid raw output counts as incorrect, and raw content/reason is preserved. The future candidate runner must be versioned and frozen before any inference; it may change only model path/hash, isolated server identity/endpoint, evidence destination, and the approved candidate gate/recording fields, not prompt construction, parser, decoding, row order, or first-pass scoring. Do **not** run the historical baseline runner unchanged against a candidate: it hardcodes the original model hash and retraining-justification A/B/C gate.

## 5. Development gates — unchanged, all required

The machine-readable authority is packaged `development_gate_label_only_v1.json` (hash above), **not** the old four-field final gate. Check all conditions without retuning after outputs:

| Category | Required result |
| --- | --- |
| Structure | **124/124** strict-valid outputs in **each** of three passes |
| Global | Accuracy **≥100/124**, macro F1 **≥0.78** |
| Modified | **≥27/39** correct and F1 **≥0.68** |
| Removed | **≥19/24** correct and F1 **≥0.83** |
| Contradiction | **≥13/16** correct and F1 **≥0.84** |
| Added | **≥20/24** correct and F1 **≥0.86** |
| Unchanged | **≥18/19** correct and F1 **≥0.82** |
| Ambiguous | Both **2/2** true ambiguous correct and **≤6** false ambiguous predictions among the other 122 cases |
| Directed confusions | removed→modified **≤3/24**; contradiction→modified **≤2/16**; added→modified **≤1/24**; modified→ambiguous **≤5/39** |
| Repeatability | Passes 2 and 3 each match pass 1 on **all 124 exact raw strings, parsed labels, and validity statuses** |

No individual-case retry, majority vote, checkpoint switch, class-specific tuning, new prompt, or threshold adjustment is permitted. A semantic or structural miss is **DEVELOPMENT REJECT**. Missing/invalid evidence, an incomplete pass, unmatched runtime/protocol, or unverifiable artifact identity is **INCONCLUSIVE**. Only a fully evidenced all-gates pass is **DEVELOPMENT PASS**. The single Kaggle GPU diagnostic pass is `GPU_ADAPTER_DIAGNOSTIC_NOT_COMPARABLE` (124/124 structure, 115/124 correct, macro F1 `0.78275334314808`, ambiguous **0/2**); it cannot pass or fail this CPU gate.

## 6. Required future evidence and stop conditions

Before any candidate CPU call, freeze an execution manifest containing candidate GGUF SHA/size/type, original GGUF SHA, adapter/base and all conversion-stage hashes, converter lock/tool hashes, exact Docker image digest and runtime flags, P1-L1/development/gate/parser/scorer hashes, case order, request JSON, host identity, and source revision. Preserve an immutable read-only copy of the candidate GGUF and original GGUF; neither is renamed into the production path. The original baseline's raw evidence stays untouched. If machine identity cannot be established, first resolve the comparator protocol **before** candidate predictions; no post hoc normalization.

For **every case in every pass**, write case ID, truth, raw output, parsed label, invalid reason/structural validity, generation-limit/stop metadata, latency, model SHA-256, llama.cpp image/build identity, request/protocol SHA-256, pass number, and case index. Then independently recompute from raw outputs: six-class confusion matrix plus `INVALID`, accuracy, macro F1, per-class support/TP/FP/FN/precision/recall/F1, directed confusion counts, false ambiguous count, three-pass raw/label/validity repeatability, each gate Boolean, and one decision: **DEVELOPMENT PASS**, **DEVELOPMENT REJECT**, or **INCONCLUSIVE**. Hash and preserve each raw pass, metrics, manifest, server configuration/`/props`, logs, and converted artifact. Preserve failures without repair.

**Hard stops before conversion:** any candidate/source/hash mismatch; missing exact Python converter lock; different llama.cpp checkout/script/binary hash; changed P1-L1/development/gate; output collision; insufficient disk/RAM; inability to keep the historical artifacts immutable. **Hard stops before inference:** missing candidate GGUF hash or Q4_K_M/type/size/tokenizer proof; runtime/host mismatch; parser/scorer/runner not frozen; incomplete protocol evidence. Do not access the sealed final in any of these steps. Passing development would authorize only a later request for separate approval and formal freezing of the *proposed* label-only final-gate translation; it would not authorize final inference or production promotion.
