# Phase III-G preregistration — pipeline architecture study

Status: DEVELOPMENT research, no production activation. Phase III-D/E independent cases and failures are closed. R0/R5/R6, P1, PP1, GGUF, retrieval gates, and production runtime configuration remain unchanged. No R7 or pipeline candidate exists.

## Product task and errors

The authorized Go service receives a client message and an immutable project/version requirement snapshot. Its current R5 scorer ranks all nonempty requirements, selects up to three passing relevance, then performs one sequential P1/six-label inference request **per selected requirement**. FastAPI orchestrates llama.cpp; Go validates, normalizes, scores and controls workflow. Analyze previews are not persisted. Authenticated Save separately verifies project/version and persists the submitted analysis. A missing relevant requirement is a retrieval false negative; an irrelevant selected requirement is a retrieval false positive/cost, not necessarily a final false drift. Classifier semantic errors, invalid model JSON/IDs, contract normalization errors, PP1 errors and workflow errors must be counted separately. Product monetary costs and desired human-review burden are UNKNOWN.

Keep existing component gates. Exploratory system metrics: final affected-requirement recall, complete-message success, false final drift findings, six-class quality on affected pairs, calls/message, candidates/message, prompt/generated tokens, latency/message, structural validity, and CPU/RAM. Do not optimize a weighted magic score.

## Predeclared experiments and decisions

| ID | Architecture / hypothesis | Changed variable | Expected benefit and risk | Dataset | Decision rule |
| --- | --- | --- | --- | --- | --- |
| G-A1 | Frozen current retrieve→singleton-classify | none | Baseline behavior; hard retrieval bottleneck | open development and small labeled panel | descriptive only |
| G-M1 | Model-free broad candidate recovery | rank top 5/8/10 versus current threshold/cap | Recover missed links; more calls/noise | open III-E/F development traces only | quantify exact recovery and cost, not select from this alone |
| G-B1 | Research-only structured batch classification | batch sizes 1/2/3/5/8 if context feasible | fewer calls; omissions, interference, ID/JSON failures | frozen labeled development panel | require all requested IDs, exact valid schema, no hallucinated IDs, no material target-label regression, substantial call reduction and bounded latency |
| G-C1 | Whole-baseline single pass | N=5/10/20/32/50/75/100 context probe; inference only when safe | removes retrieval bottleneck; context/output failure | open III-F scaling material only | reject sizes exceeding 768-token context less reserve/headroom; quality tests only if feasible |
| G-D1 | Natural hierarchy or section batch | real snapshot fields only | lower competition; taxonomy/maintenance cost | schema and open development data | no experiment if fields do not encode validated grouping |
| G-E1 | Model-side candidate selection | broader deterministic filter then model affectedness | semantic recovery; extra call and ID errors | same labeled panel | test only if G-B1 schema/quality viable |
| G-H1 | Adaptive budget | fixed score-margin rule, max 5/8 | recover uncertain targets, bound calls | open III-F traces | material recall gain at defensible calls and false exposures; do not tune against closed sets |
| G-I1 | Decomposition + batching | existing deterministic split only | multi-intent recovery; invented/overselected intent risk | open development | test only if G-B1 works and isolated benefit justified |

Do **model-free** context/coverage and parser tests before any inference. The batch research contract is one result for every supplied candidate, with server-supplied `id`, `affected` boolean and `label` drawn from the established six classes only when affected (otherwise null). This adds an affectedness field, not a seventh class. Reject unknown, duplicate, missing or extra IDs, invalid labels/types, partial JSON, and wrong result counts; never silently treat missing as unchanged. This contract is not a production endpoint. A zero-target message requires all `affected=false`. Research output retains raw/parsed/validated stages outside normal logs.

Reserve at least 120 output tokens and 80 additional context tokens under the measured 768-token llama slot. A batch whose actual `/tokenize` prompt exceeds 568 tokens is infeasible under this conservative policy. Do not increase production context or timeout for this study. If minimal batches fail the contract or show target-label interference, stop candidate progression; no independent holdout is justified. One- or two-case differences on author-labeled development data do not establish a winner.

If inference is justified, verify Q4 SHA, CPU-only args (`--n-gpu-layers 0`, `--device none`), one slot, available RAM/swap, and no competing heavy jobs; use the existing model instance sequentially. No GPU, model training, new service, cloud API, or persistence change. A real pipeline candidate requires coherent development improvement in final complete-message outcomes, false-drift control, model-call/latency cost and contract reliability; only then freeze code/config/prompt before a new independently reviewed holdout.
