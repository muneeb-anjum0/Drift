# Phase III-J historical training-data forensics

Status: **pre-training, aggregate-only audit**. No training data was created or approved for reuse by this audit. The user-supplied V5 archive at `archive/drift-dataset-kaggle-v5-cumulative` remained untracked and read-only. The reproducible [v2 machine report](../evaluation/phase_iii_j/v5_training_forensics_v2.json) contains counts and file hashes but no source or protected-evaluation case text. The [earlier Phase III-I inventory](phase_iii_i_data_inventory.md) and [archive audit](../evaluation/phase_iii_i/archive_audit_v2.json) provide historical context.

## Identity and source quality

The shipped V5 SFT train has **8,327** rows (SHA-256 `ab80546e9ac74f4f11c6a15cf2f5626ef8ed4f189a574999601d06264caee435`), validation **969** (`f60a3f5dd9091cc48ac383ee2c0dc8a27a1aa04dd5d8f7b7fa9134b39048edc5`), and test **974** (`c3d4f05ca355827a815d01005943603109d00f4c81737f4c7f797f3bfba7343c`). The CSV training view has **7,757** rows (`d30a5a77b423a3308bd2d528f7000e845ef17a1d6ccd4f183b195f7f48d67ab8`). The SFT train has **572 normalized Baseline + Message pairs absent from the CSV train**; source-row lineage for these additions has not been resolved. The old archive's asserted legacy 1,858-row source remains report-supported rather than recovered row-for-row. Archive-to-historical-adapter byte identity remains unproven.

All 7,757 CSV train rows identify their license/provenance as a *simulated final robustness dataset, not public real-world data*, and their annotation status as simulated labels. They are not an independently human-reviewed, real-world corpus. The train mix is 3,517 normal simulation, 1,308 shortcut-trap simulation, 762 long-thread, 731 domain-transfer, 634 multi-intent, 485 noisy-ticket, 147 contradiction-security, 90 ambiguous-edge, and 83 unchanged-hard-negative. The archive's historical reports describe multiple generation phases; their totals do not all match the final shipped files, so the shipped hashes/counts take precedence.

## Duplicate, family, and leakage screens

| Screen | Train | Train vs historical validation | Train vs historical test |
| --- | ---: | ---: | ---: |
| Exact/normalized Baseline + Message duplicate excess, CSV | 2 / 2 | 0 shared pairs | 0 shared pairs |
| Exact/normalized Baseline + Message duplicate excess, SFT | 0 / 0 | 0 shared pairs | 0 shared pairs |
| Conflicting labels for identical normalized pairs | 0 CSV / 0 SFT | — | — |
| Identical normalized message text, CSV and SFT | — | 368 shared keys | 388 shared keys |
| Numeric-masked *pair* skeleton keys, CSV and SFT | 2 excess CSV / 0 SFT | 0 shared keys | 0 shared keys |
| Rare-token candidate screen: both baseline and message token Jaccard ≥0.8, excluding exact pairs | — | 2 target rows | 1 target row |
| CSV metadata-family proxy `(source, scenario, project, component, baseline type)` | 3,610 train keys | 738/969 target rows in shared proxy keys | 731/974 target rows in shared proxy keys |

The new near screen examined 407,140/414,409 CSV candidate comparisons and 447,794/455,942 SFT comparisons for validation/test. It is deliberately bounded by rare-token retrieval; it can miss paraphrases and should **not** be interpreted as a semantic-independence certificate. The metadata-family proxy is broad and can overgroup unrelated semantics, but its large cross-split overlap shows that the old row split is not credible evidence of template-family separation. The earlier audit also measured 3,436 excess reused baseline rows and 2,594 excess reused message rows in CSV train. An exact-pair-clean split can still share vocabulary, templates, projects, and semantic skeletons.

The SFT train class mix is `modified` **2,061/8,327 (24.75%)**, `added` **1,732 (20.80%)**, `unchanged` **1,450 (17.41%)**, `ambiguous` **1,290 (15.49%)**, `contradiction` **917 (11.01%)**, and `removed` **877 (10.53%)**. Modified has about **2.35×** the removed support and **2.25×** the contradiction support. This imbalance and repeated simulated templates are plausible contributors to the observed modified overprediction, **not causal proof**; the adapter's exact training bytes are unverified, and the stress-test distributions differ.

An aggregate-only screen of the available closed Phase III-D/E/I/I.5 datasets found **zero exact normalized query-message overlap** for D's 40 and E's 30 retrieval queries and **zero exact normalized pair or message overlap** for I's 90 and I.5's 216 classifier cases against CSV/SFT train. The screen does not prove absence of semantic or template contamination, cannot cover unavailable historical sources, and emitted no protected case text. Those four datasets remain closed regardless of overlap counts.

## Disposition before any training package

- **Preserve:** the original V5 archive byte-for-byte as a historical source. Retain the old model and its rollback hash. Treat SFT train rows as *candidates* for background retention only after row lineage, license/privacy, label quality, and group-split review—not as an automatically approved corpus.
- **Quarantine/remove from any proposed reuse:** the two duplicate CSV rows; the 572 SFT-only pairs until their lineage is mapped; conflicting or ambiguous labels if subsequently found; and any row/family that fails overlap or manual semantic review. Never put historical V5 validation/test or closed Phase III-D/E/I/I.5 examples into a new training partition or claim them as an independent III-J final holdout.
- **Augment safely:** use newly authored, human-reviewed Baseline + Message cases derived only from aggregate removal/contradiction/addition boundary findings. Assign semantic/template-family IDs before grouping train/development/final. Keep same-family paraphrases, minimal variants, and domain transformations together. Do not derive any new training case from an individual held-out failure or closed-case text.

The go/no-go state is **NOT READY TO TRAIN**: the newly authored/reviewed Phase III-J corpus, its family-disjoint partitions, and protected final holdout have not yet been supplied or frozen. The current host is also not the approved Kaggle training environment. Do not repurpose this audit as permission to train on the complete V5 SFT file.
