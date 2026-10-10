# Phase III-J Label-Only Conversion Result

## 1. Status

**Conversion completed; candidate status: `CONVERTED_NOT_YET_DEVELOPMENT_ACCEPTED`.** Exactly one approved route ran: frozen checkpoint-120 LoRA → pinned llama.cpp LoRA GGUF → tensor-streaming merge with the frozen base F16 GGUF → one `Q4_K_M` quantization. All three outputs were written under ignored `models/gguf/phase3j_label_only_v1/`, validated, hashed, and promoted without overwriting any existing path. The complete machine-readable [conversion manifest](../archive/phase_iii_j/phase3j_label_only_v1_conversion_manifest.json) is ignored evidence, not a production artifact. This result does not authorize a development screen or final-holdout access.

## 2. Candidate Identity

The selected adapter is `best_adapter/adapter_model.safetensors` from the verified Phase III-J training evidence, SHA-256 `531457905d97c6f944316a6665df52593713b87513369794ecfd8bc6920c5c78`. It is byte-identical to `checkpoint-120/adapter_model.safetensors`; the training evidence ZIP remains SHA-256 `1384215ee87cac32a94a9bad93988806662cb80815d3194388bab152657a153f`. Neither changed during conversion. Checkpoints 60/180 and the rejected earlier adapter were not used.

The base is `Qwen/Qwen2.5-7B-Instruct`, frozen revision `a09a35458c702b33eeacc393d103063234e8bc28`. All four local HF shards matched the [candidate freeze](phase_iii_j_label_only_candidate_freeze.md), and the reused `models/gguf/Qwen2.5-7B-Instruct-F16.gguf` matched SHA-256 `970ccec3ad83bb62aa25ce585bed4ebd297963257442afe697d350465933f2c5` (15,237,853,760 bytes). No base redownload or reconversion occurred.

## 3. Conversion Environment

The [frozen environment verifier](../tools/phase3j_label_only/verify_conversion_environment.py) passed before model operations: CPython `3.12.3`, executable SHA-256 `4933b6c4a8521fb3aa93856701e30b3ac262d3c47ceb22965a3b0b422e85b44`, 27 exact hash-locked distributions from [`conversion_requirements.txt`](../tools/phase3j_label_only/conversion_requirements.txt) (lock SHA-256 `a4598236d9195ab1d567e199a825151ca5bc1b332e5f34b67fd3da45d87d582a`), and vendored `gguf 0.19.0`. The llama.cpp checkout remained clean at tag `b11151`, commit `bd4f514db14d87fded667787a7a963bfbaa98e89`. Both converter script hashes and the merge/quantizer binary hashes matched the [environment freeze](phase_iii_j_label_only_conversion_environment.md).

## 4. Conversion Commands

From the repository root, with CPU execution and no GPU offload, these are the three model-changing commands that ran **once each** (the `/usr/bin/time -v` wrapper recorded peak RSS and process swaps):

```bash
env CUDA_VISIBLE_DEVICES='' OMP_NUM_THREADS=4 /usr/bin/time -v /tmp/phase3j-conversion-verify-py312/bin/python -u tools/model/vendor/llama.cpp/convert_lora_to_gguf.py archive/phase_iii_j/label_only_evidence.IqqIf87M/drift_phase_iii_j_label_only_v1/best_adapter --base models/base/Qwen2.5-7B-Instruct --outtype f16 --outfile models/gguf/phase3j_label_only_v1/DriftLedger-Phase3J-LabelOnly-v1-LoRA-F16.gguf.tmp

env CUDA_VISIBLE_DEVICES='' /usr/bin/time -v tools/model/vendor/llama.cpp/build/bin/llama-export-lora -m models/gguf/Qwen2.5-7B-Instruct-F16.gguf --lora models/gguf/phase3j_label_only_v1/DriftLedger-Phase3J-LabelOnly-v1-LoRA-F16.gguf -o models/gguf/phase3j_label_only_v1/DriftLedger-Phase3J-LabelOnly-v1-Merged-F16.gguf.tmp -t 4 --device none --n-gpu-layers 0

env CUDA_VISIBLE_DEVICES='' /usr/bin/time -v tools/model/vendor/llama.cpp/build/bin/llama-quantize models/gguf/phase3j_label_only_v1/DriftLedger-Phase3J-LabelOnly-v1-Merged-F16.gguf models/gguf/phase3j_label_only_v1/DriftLedger-Phase3J-LabelOnly-v1-Q4_K_M.gguf.tmp Q4_K_M 4
```

Each `.gguf.tmp` passed its header/metadata/size/hash check before no-overwrite promotion; the promoted files were rehashed. The merge reported **196 LoRA-merged tensors** and 339 total output tensors. Quantization reported build `bd4f514`, Q4_K_M, 4 threads, and exit code 0. No alternative route, settings, or second quantization ran.

## 5. Intermediate Artifacts

| Ignored artifact | Bytes | SHA-256 | Checks |
| --- | ---: | --- | --- |
| `models/gguf/phase3j_label_only_v1/DriftLedger-Phase3J-LabelOnly-v1-LoRA-F16.gguf` | 80,767,648 | `b0d47041878acb71886a59ae0323f508cd05574f9a32ecc63d14800b40bd02fd` | GGUF header, 392 LoRA tensors |
| `models/gguf/phase3j_label_only_v1/DriftLedger-Phase3J-LabelOnly-v1-Merged-F16.gguf` | 15,237,853,760 | `8e5015b701a5cd2c50711ad0e7467955ee28fb5a857ae4a3501a6f8ed62be783` | GGUF header, Qwen2, 339 tensors, 10 tokenizer fields identical to frozen base |

No temporary `.gguf.tmp` file remains. The LoRA converter, merge, and quantizer reported peak RSS of 483,288, 1,654,712, and 3,677,116 KiB respectively; each process reported zero swaps. Host swap usage was nonzero during conversion and is recorded separately in the manifest; this is **not** a claim about the later matched CPU-screening zero-swap requirement.

## 6. Final Q4_K_M Artifact

The final ignored candidate is [DriftLedger-Phase3J-LabelOnly-v1-Q4_K_M.gguf](../models/gguf/phase3j_label_only_v1/DriftLedger-Phase3J-LabelOnly-v1-Q4_K_M.gguf):

| Field | Verified value |
| --- | --- |
| SHA-256 | `cc3029ed17bcf14138b96d37c9c1442bf52cfec05b51e0ea6e4297ec3264846f` |
| Size | **4,683,074,112 bytes**, below the 6,000,000,000-byte cap |
| GGUF | Valid `GGUF` header, readable metadata, 339 tensors |
| Architecture | `qwen2` |
| Quantization | `general.file_type=15` = `MOSTLY_Q4_K_M`; llama-cli reports `Q4_K - Medium` |
| Tensor types | F32, Q4_K, Q6_K (the expected Q4_K_M mixture) |

The frozen original production GGUF remained at its original path and SHA-256 `11e2ca8d10f6b52693256addca9b8f0d5bb01eebc53594b531586ea992419ac9` after conversion. No candidate file was promoted into a production filename.

## 7. Tokenizer / Metadata Verification

The final GGUF's **all 10** `tokenizer.*` metadata fields matched the frozen base F16 GGUF exactly, including model/pre-tokenizer, 152,064 GGUF token entries, merges, special IDs, and chat template. EOS is `151645`; BOS and padding are `151643`. Its Qwen2 architecture and 339-tensor count match the merged source.

The saved adapter's `tokenizer.json` differs bytewise from the base file, but a direct tokenizer-library comparison found the same vocabulary mapping and identical token IDs on four synthetic/prompt probes. Its separate `chat_template.jinja` is byte-identical to the base tokenizer's chat template. The saved adapter's `tokenizer_config.json` has an `extra_special_tokens` list that frozen Transformers 4.57.6 cannot load directly; this did **not** enter the approved LoRA conversion path (`LoraModel.set_vocab()` is a no-op, and there was no aLoRA invocation string). The base tokenizer itself loaded under the frozen environment. No tokenizer file or template was rewritten, and no semantic mismatch was observed on the checks above; this remains subject to the separate tokenizer proof required before development screening.

## 8. Integrity Checks

All input and output hashes matched their recorded values before/after their respective stages. The final GGUF was parsed with the pinned vendored GGUF reader, checked against the size cap and `MOSTLY_Q4_K_M` enum, and opened by the pinned llama.cpp CLI. The selected adapter and training evidence ZIP hashes matched after conversion. The original production GGUF hash matched after conversion. Existing datasets were not edited; the worktree's pre-existing edits were preserved. `git diff --check` passed. The candidate GGUF and evidence manifest are ignored by `.gitignore`.

## 9. Development Acceptance Status

**NOT YET EVALUATED.** No `DV0001`–`DV0124` case was run, no three-pass CPU screen was started, no development metric or gate was calculated, and no candidate acceptance decision was made. The candidate status is only **`CONVERTED_NOT_YET_DEVELOPMENT_ACCEPTED`**.

The sole model-load sanity check used the synthetic string `Synthetic model-load check only.`, `--no-warmup`, and `--n-predict 0`; the CLI returned exit code 0 and reported `Q4_K - Medium`. This build nevertheless emitted the short synthetic response `It`. That call was not a development case or evaluation and was not repeated. It is not evidence of task accuracy or repeatability.

## 10. Final-Holdout Status

**SEALED AND UNTOUCHED.** No final payload was opened, no final inference ran, and no final metric was calculated. No prompt, parser, gate, model weight, or production API was changed. No commit, push, merge, or tag occurred.

## 11. Next Action

Review the frozen candidate identity and this conversion evidence. Development screening requires a separate explicit authorization and the matched three-pass Q4_K_M CPU protocol in the conversion/CPU-screen plan; this conversion result does not authorize it.
