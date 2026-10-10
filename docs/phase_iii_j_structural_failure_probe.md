# Phase III-J rejected-adapter structural-failure probe

Date: 2026-10-08. Diagnosis: **HYPOTHESIS SUPPORTED**. This is development-only evidence about the already-rejected baseline adapter, not final-holdout evaluation or a candidate rescue. No retraining, promotion, or production change occurred.

## Objective and evidence boundary

The probe tested whether the adapter emits label information but fails the required four-field JSON response. It ran the 12 development IDs frozen before the probe: `DV0008`, `DV0011`, `DV0003`, `DV0005`, `DV0001`, `DV0002`, `DV0004`, `DV0017`, `DV0058`, `DV0120`, `DV0007`, `DV0009` (two per class). The protected 182-case final holdout was not opened, attached, or used. The training data were AI-authored and separately AI-reviewed, **not human-reviewed**; the original human-review requirement remains unmet.

The only preserved raw-output artifact is the private, Git-ignored `archive/phase_iii_j/drift_phase3j_raw_probe.zip` (SHA-256 `178d44fd5feb7c4db5c01a84bb52ad11d8ea33a80415961e4ffe8f5200ba0039`). Its two members are `raw_outputs.json` (SHA-256 `0aa1aed87c48b9241040e91f195a08fe0650b42f49f67f628d111df7464d4854`) and `probe_manifest.json`; ZIP integrity and internal hashes passed. The manifest matches the committed probe script SHA-256 `226d09a8501eb311164ffff4691743afb1fb1fdc5c0b413102ca7d7b40271e36`, the local probe-bundle manifest hash, and the preserved full-run backup hash. It identifies the selected checkpoint-60 adapter as SHA-256 `907c98a7156d878e694d6a854fe75c9c4624a6d7f9b077735c9f3b9070ef4b21`. The evidence archive contains no final case payload; the sealed-final SHA-256 appears only as metadata.

## Runtime and result

The manifest records one Tesla T4 (15,636,037,632 VRAM bytes), Python 3.12.3, CUDA 13.0, PyTorch 2.14.1+cu130, Transformers 5.18.0, PEFT 0.21.2, frozen `Qwen/Qwen2.5-7B-Instruct` base/tokenizer revision `a09a35458c702b33eeacc393d103063234e8bc28`, and unchanged P1 prompt SHA-256 `902ac43037c998afc4b6550995036bbc720bcae5dbbafc4504b2b9898abed339`. Generation was greedy (`do_sample=false`), with a 120-new-token limit and EOS/pad token ID 151645. All **12/12** cases generated outputs; **0/12** passed the frozen strict structural parser. All 12 end with the recorded EOS token, as *inferred* from token IDs, after 23–88 generated tokens. None reached the 120-token limit. The 12 recorded generation latencies total 74.121 seconds (median 6.499 seconds); this excludes model loading/download time.

The frozen parser was rerun locally against each preserved raw string without loading the model: all 12 remain invalid, matching the manifest. Eleven fail JSON parsing at character 0; `DV0009` starts an object but fails at character 29. No malformed output is counted as a valid classification.

## Case-level failure pattern

The apparent label below is manually read from the **unaltered raw output**, not from the strict parser. The probe's conservative `diagnostic_label_if_recoverable` field is `null` for all 12. “Matches truth” is a diagnostic observation, **not** a valid-output accuracy score. Full raw text, token IDs, inferred stop reasons, and latencies remain in the ignored evidence ZIP.

| Development ID | Frozen truth | Apparent raw label | Shape | Structure valid | Parse failure | Label matches truth? |
| --- | --- | --- | --- | --- | --- | --- |
| DV0008 | added | added | bare label + JSON fragments | No | invalid JSON at char 0 | Yes |
| DV0011 | added | added | bare label + JSON fragments + prose | No | invalid JSON at char 0 | Yes |
| DV0003 | modified | removed | YAML-like fields | No | invalid JSON at char 0 | **No** |
| DV0005 | modified | added | YAML-like fields | No | invalid JSON at char 0 | **No** |
| DV0001 | removed | removed | bare label + JSON fragments | No | invalid JSON at char 0 | Yes |
| DV0002 | removed | removed | bare label + JSON fragments | No | invalid JSON at char 0 | Yes |
| DV0004 | contradiction | contradiction | YAML-like fields | No | invalid JSON at char 0 | Yes |
| DV0017 | contradiction | contradiction | YAML-like fields | No | invalid JSON at char 0 | Yes |
| DV0058 | ambiguous | modified | YAML-like fields | No | invalid JSON at char 0 | **No** |
| DV0120 | ambiguous | modified | YAML-like fields | No | invalid JSON at char 0 | **No** |
| DV0007 | unchanged | unchanged | bare label + JSON fragments + prose | No | invalid JSON at char 0 | Yes |
| DV0009 | unchanged | unchanged | malformed nested JSON object | No | missing delimiter at char 29 | Yes |

Five responses begin with a bare class label followed by separately braced JSON fragments, for example `added {"confidence" : 1.0} {"changed_elements" : [...]}`. Six use YAML-like `label: ...` / `confidence: ...` lines rather than a JSON object; some `changed_elements` lists are malformed as well. One begins with a JSON object but nests another object where a comma and field were required. The model did **not** merely stop immediately after the label: it emitted additional fields or prose in every case, then EOS. Four apparent labels disagree with frozen truth (`DV0003`, `DV0005`, `DV0058`, `DV0120`), so structural failure is **not the only observed problem**.

## Training versus evaluation contract

The frozen [`encode_rows`](../tools/phase3j_kaggle/phase3j.py#L180-L191) builds a prompt ending in `{"label":"` and supervises only `reviewed_label + '"'`; preceding prompt/prefix tokens are masked with `-100`. No closing object, `confidence`, `reasoning`, or `changed_elements` tokens are supervised. [`evaluate_development`](../tools/phase3j_kaggle/phase3j.py#L253-L273) generates from the plain assistant prompt, without the training-time JSON prefix, and passes decoded raw text to [`strict_prediction`](../tools/phase3j_kaggle/phase3j.py#L207-L219). That parser requires one complete JSON object with exactly `label`, `confidence`, `reasoning`, and `changed_elements`, including the declared types/ranges.

The probe used that same plain P1 assistant prompt and greedy generation path; it preserved the evaluation-decoded text, unstripped special-token text, and token IDs before applying the strict parser. The checked package, run identity, selected adapter hash, and pinned base revision provide no evidence of an accidental adapter swap or changed prompt. They do not, by themselves, prove every runtime component was faultless.

## Diagnosis and limitations

**HYPOTHESIS SUPPORTED:** the raw pattern strongly supports a training/inference output-contract mismatch as a contributor. All 12 responses expose a class label but none produce the supervised system's required complete JSON shape. Five are especially close to a label fragment followed by disconnected fields. The code confirms that training never supervised the full structure. This is **not a controlled causal proof** that label-fragment supervision is the sole defect: six outputs are YAML-like, one is malformed nested JSON, and four apparent class labels are wrong. The baseline remains rejected on development evidence; do not reclassify these outputs through a permissive wrapper or weaken the frozen gate.

This 12-case probe is a preselected diagnostic sample, not a replacement for the lost full 124-case machine-readable recovery metrics. The runtime values are recorded in the probe manifest, not independently attested by this repository. Inferred EOS is not an API-provided stop reason. The protected final remains sealed.

**Next action:** prepare a proposal for at most one evidence-backed corrective training iteration, including a defensible way to supervise the required complete output contract without fabricating unsupported `reasoning` or `changed_elements`. Do **not** start that iteration in this task.
