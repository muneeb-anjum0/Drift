# Phase III-H preregistration — structured-output reliability

Status: DEVELOPMENT research only, frozen before new predictions. Starting main: `766abcf6dc96dd753e5d19da72db9285709e051c`. Branch: `phase-3/structured-output-hardening`. No production inference, P1/PP1, R0/R5/R6, model, runtime image/config, gates, or closed III-D/E data may change.

## Root-cause prior from Phase III-G (not a new prediction)

The eight open diagnostic raw outputs are all syntactically valid, complete JSON texts using 18–46 generated tokens against a 120-token cap. Two satisfy the exact existing research contract; one of those is semantically wrong. Four omit candidates; two encode `affected=false` with the legal six-class `unchanged` instead of required `null`. The strict research parser correctly rejects those six; no parser defect or token truncation was observed in these eight. This motivates independent tests of contract shape, output constraints, and exact-ID enforcement. It does **not** prove batching intrinsically impossible.

## Frozen identities and data

The local model is Qwen2.5-7B + DriftLedger LoRA, GGUF Q4_K_M SHA256 `11e2ca8d10f6b52693256addca9b8f0d5bb01eebc53594b531586ea992419ac9`. Runtime: `ghcr.io/ggml-org/llama.cpp:server-b11151`, build `b11151-bd4f514db`, one CPU slot, context 768. P1 SHA256 `902ac43037c998afc4b6550995036bbc720bcae5dbbafc4504b2b9898abed339`; PP1 source SHA256 `0c8bf5cf8fad54d2f9285a4392c2a4fa96d3fc758d3331a0fb0020c834b643e7`. Generation in experiments mirrors production: temperature 0, top-p 1, no explicit top-k, no explicit seed, `n_predict=120`, same two chat stop strings. Runtime default top-k is 20 and default seed is -1/random; seed/greedy behavior is recorded, not treated as verified determinism. No entropy tuning is planned.

The [selection](../evaluation/phase_iii_h/diagnostic_selection_v1.json) references exactly 12 open raw-development single pairs (two per six-class label, spanning short/long, negation, number, role, temporal and unchanged cases), three bounded repeats, and four already-open III-G batch cases (single target, numeric change, two-target, zero-target). Source bytes and selection are hashed in the freeze manifest. Labels are historical/author development labels, not independent truth. The Phase III-D/E sets remain closed and are not consulted case-by-case. No new holdout is made.

## Contracts and failure layers

Production P1 single: JSON object with `label`, `confidence`, `reasoning`, `changed_elements`; FastAPI currently normalizes bounded variants, Go validates the normalized response. The Phase III-G research batch contract G-B1 requires an ordered array of exactly one `{id,affected,label}` object per supplied candidate, with `label=null` if unaffected and a canonical six-class string if affected. Research variant H-MAP-v1 uses an object `{"results":{"supplied-id":null|"canonical-label"}}`, with **every** supplied ID as a required key; `null` means unrelated candidate, not the historical `unchanged` class. This eliminates redundant boolean/nullable-field coupling without changing six-class semantics. Dynamic grammar/schema and server validator must both enforce the trusted candidate-ID set; duplicate JSON keys must fail closed.

Capture raw model text before every parse. Diagnose in order: transport/runtime/timeout → empty/truncated/prose → strict JSON syntax with duplicate-key rejection → top-level/field types → trusted IDs → enum/null coherence → cardinality/order → normalization/semantic diagnostics. The primary category is the earliest failed layer; secondary symptoms are counted separately. Do not guess missing IDs or labels. Research rejects an invalid whole batch atomically; no persistence is involved. Production parser/normalization remains unchanged.

## Gate, before results

Machine-to-machine output requires a demanding **development screening** gate, distinct from the 90% retrieval gate: single P1 raw contract validity must be 12/12, with the three repeated calls valid; exact-ID batch raw validity must be 4/4 at each attempted size 2, 3 and 5 on the four named development cases, with no foreign/duplicate/missing IDs or invalid labels. A batch architecture can be called **development-supported** only after at least 24 varied calls across these sizes and order variants achieve 24/24 raw exact-ID validity, no material semantic regression versus comparable singleton outputs, and no timeout/resource failure. One bounded retry may recover a failure for a separately reported assisted gate (all attempted failures recovered), but cannot make raw validity pass. Zero observed failures in 24 calls has a weak lower confidence bound, so this is not a production/generalisation guarantee. Fewer calls or an untested size yield INCONCLUSIVE; repeated core failures yield NOT SUPPORTED. Do not tune the gate after outcomes.

## Controlled sequence and hypotheses

| ID | Hypothesis and single changed variable | Preregistered diagnostic sample / stop condition |
| --- | --- | --- |
| H-A1 | Current P1 singleton parser/model can speak its present contract without structural failures. No change. | 12 selected raw-dev pairs once, three repeat calls. Record strict raw validity, existing parser-assisted validity, semantic labels separately. |
| H-A2 | Existing G-B1 failures recur without model/runtimes changes. No new prompt. | Use frozen eight III-G outputs; at most four repeat calls on named batch cases at size 2. |
| H-B1 | Shorter output-only instruction improves G-B1 structure without grammar; semantic definitions and output fields unchanged. | Four batch cases size 2; compare exact G-B1 shape. Do not add few-shot examples. |
| H-C1 | Pinned `/completion` `json_schema` constrains G-B1 shape sufficiently to eliminate syntax/cardinality errors without semantic regression; same prompt as H-A2. | Four batch cases size 2. Advance to size 3 only if ≥3/4 exact valid; to size 5 only if size 3 ≥3/4. No size 8 unless size 5 is 4/4 and context fits. |
| H-D1 | Removing redundant `affected` and using H-MAP-v1 exact keys reduces missing/contradictory outputs. Contract shape only, no grammar, four size-2 cases. | Compare raw validity against H-A2/H-B1. |
| H-D2 | Pinned JSON-schema constraints plus H-MAP-v1 yield exact keys and canonical values with acceptable semantic agreement. Grammar is added to H-D1. | Same four cases size 2; advance 3/5 only if preceding size ≥3/4 exact valid. Expand to ≥24 varied calls only if 4/4 at sizes 2/3/5. |
| H-E1 | One retry with a generic contract-only correction recovers structural failures. | At most four failed development calls from best schema configuration; record new call, tokens, latency, label instability. No answers in retry instruction. |
| H-F1 | A narrow syntax-only repair is useful only if actual failures are a known fence/whitespace wrapper. | Do not run absent an observed repairable syntax failure; never invent IDs/labels/results. |

The [pinned llama.cpp README](https://github.com/ggml-org/llama.cpp/blob/bd4f514db14d87fded667787a7a963bfbaa98e89/tools/server/README.md) documents `/completion` `json_schema` and `grammar`; the image binary advertises grammar/schema flags. Runtime requests will still be probed against this exact build before accepting capability. Schema constraints are not trusted to guarantee unique IDs, correct semantics, or complete output: the strict server validator remains authoritative. Use actual `/tokenize` counts, 768 context, reserve 120 output + 80 headroom (prompt ≤568) unless a separately recorded output-budget experiment is justified by observed truncation. CPU inference is opt-in, sequential, no concurrent model-heavy work; inspect RAM/swap/container state before each series.

## Decision scope

Report raw, repair-assisted and one-retry-assisted validity separately; exact-ID, enum, truncation, timeout, latency/tokens and semantic diagnostics separately. No new independent evaluation, retrieval work, training, R7, V3, GPU, model/runtime change or production batch activation. Conclude exactly one single-item and one batch-contract reliability status, plus parser, unconstrained-model, truncation, retry, repair and next-phase decisions. Any positive finding only permits a future development phase, not production promotion.
