# Phase III-J post-review data validation and freeze

Date: 2026-10-06. Status: **PASS for the current AI-reviewed mechanical data gates; the earlier human-review aspiration is not met. No training, model inference, or Kaggle package was run or built.** This report uses reviewed canonical labels, not the stale pre-review quality report in Downloads. The original Phase III-J proposal sought human review; this corpus has **separate AI semantic adjudication, not human review**. Do not present it as human-reviewed or use it as proof of author/reviewer independence.

## Source and freeze identities

All source case and review files and the sealed final payload remain local under `/home/muneebanjum/Downloads/`; their exact filenames and SHA-256 values are also recorded in [the freeze manifest](../evaluation/phase_iii_j/frozen/pretraining_manifest_v1.json). No final case text is committed to Git. The original 757 case rows and original 757 review decisions were left unchanged. The supplemental author wrote 26 new final candidates in two rounds; a separate AI review confirmed 18, revised 5 to other canonical classes, and marked 3 review-`AMBIGUOUS` and unscored. The blank supplemental review template was retained separately from the completed review. Supplemental source cases, their review, and the original corpus retain their distinct hashes; they were not overwritten by a merged relabeling.

The supplied `cases (1).csv` matched the union of the supplied train/development and final CSVs by ID and row content; its 757 IDs matched the original review artifact exactly.

| Source artifact in Downloads | SHA-256 |
| --- | --- |
| `cases (1).csv` | `eb9c3587fb46b927a5cb7e53ec52a8e8a607bad23b092ea9bdabb28bb8691ded` |
| `train_development_cases (1).csv` | `795614776a1d35780f92da7f82ccff94c73b1f8769be78466a9d5240e28b1360` |
| `final_holdout_cases (1).csv` | `b88ae447517a8959f696c0f3354cbe2f9c25f868f77f479824b54fdb19e9ff8a` |
| `phase_iii_j_ai_semantic_review.csv` | `e0133f42dd9ecc8a5109ec54a526aaa0faaace2e11d5cb4c137ec9e1e7d1d82f` |
| `phase_iii_j_supplemental_cases.csv` | `2550974ed4a3141f059fef0c7037525a86dc5851c71dbc6483725a861ed008c8` |
| `phase_iii_j_supplemental_cases_round2.csv` | `fa29b1f98b28d4875adac537f088078de9e054e0b40a2031f502840061fa4488` |
| `phase_iii_j_supplemental_review.csv` | `aa592799d80f18f496752cbf7fb90d1af3719025af4dbd2b0907e8c972de6fd6` |
| `phase_iii_j_supplemental_review_template.csv` | `18e5242e3ca7b0392f6e2a59a6581d5a9a5653e7bce0ad561b4ed7a836af5ad6` |

| Frozen object | SHA-256 | Location |
| --- | --- | --- |
| Full reviewed corpus, canonical serialization (783 rows) | `af6cb5d281dbdac6e37ac8daa84d97e2a9e7ff99f126d12ec3ea7a7b5c449f46` | Manifest hash only |
| Reviewed train (477 rows) | `d3198232c18b48aaafbb795e511f94e033d01172803465fa63ee13630bfc0658` | `evaluation/phase_iii_j/frozen/reviewed_train_v1.json` |
| Reviewed development (124 rows) | `89a9506ddf3c65dd6a7361a4e69366917046c8ea38ef0c45f81838f8b661baa7` | `evaluation/phase_iii_j/frozen/reviewed_development_v1.json` |
| Combined reviewed train/development | `ad7faba61a75078c7215f22636d913cd09642c5311e97f1ec56fe424336b2d86` | `evaluation/phase_iii_j/frozen/reviewed_train_dev_v1.json` |
| Sealed reviewed final (182 rows) | `a3a391962e0fac7b6129d4ea57808a6b4189444fb106395d4d944b9c93670ccb` | `/home/muneebanjum/Downloads/phase_iii_j_reviewed_final_sealed_v1.json`, mode `0444` |

The final payload is excluded from Git and any future training ZIP. The freezer writes destinations with exclusive creation and refuses to overwrite them; a rerun against these paths failed with `FileExistsError` as expected. The seal is a hash, not encryption or an off-device backup. Preserve the local source files and sealed final payload separately.

## Reviewed support

| Partition | added | modified | removed | contradiction | ambiguous | unchanged | Scored / all | Families |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Train | 81 | 156 | 84 | 82 | 6 | 68 | 477 / 477 | 128 |
| Development | 24 | 39 | 24 | 16 | 2 | 19 | 124 / 124 | 41 |
| Final | 29 | 48 | 32 | 21 | **23** | 26 | 179 / 182 | 68 |

Total: 783 rows, 780 scored, 3 unscored, 237 families. Review decisions: 691 `CONFIRMED`, 89 `REVISED`, 3 review-`AMBIGUOUS`, 0 `EXCLUDE`. Canonical `ambiguous` and review decision `AMBIGUOUS` are distinct; the three unscored rows were not counted toward support. Final canonical `ambiguous` increased from 5 to 23 without changing any existing reviewed label or partition. No extra numeric train/development minimum was invented: the committed validator requires at least one scored row per class in those partitions and at least 20 per class in final.

## Gate results

| Frozen data gate | Result | Evidence |
| --- | --- | --- |
| One review decision per case; valid decision/label/reason/date | PASS | Fail-closed validator accepted all 783 linked rows. |
| Final support at least 20 scored rows in each of six classes | PASS | Minimum is contradiction 21; ambiguous is 23. |
| Every class present in train and development | PASS | Minimum supports are train ambiguous 6 and development ambiguous 2. |
| Unique IDs and normalized case pairs; no cross-partition identical messages | PASS | Validator accepted 783 unique IDs/pairs and no cross-partition identical message. |
| Semantic-family partition isolation | PASS | 237 distinct family IDs; no family crosses partitions. |
| High lexical overlap across partitions | PASS | Validator's baseline/message Jaccard proxy found no cross-partition pair above its 0.8/0.8 rule. |
| Protected III-D/E/I/I.5 exact overlap and III-I/I.5 high lexical overlap | PASS | Validator found none under its implemented exact and lexical checks. |
| Historical training exact normalized-pair overlap | PASS | Validator found none against the available V5 archive. |
| Required source/privacy/upload metadata | PASS | Case metadata valid; all train/development rows are explicitly approved for Kaggle upload. |
| ID syntax correction | PASS | Corpus uses `TR0001`–`TR0477`, `DV0001`–`DV0124`, and `FH0001`–`FH0182`; validator now accepts matching partition prefixes with four or more digits while retaining its previous lowercase ID rule. Wrong prefix, short/malformed/empty/whitespace IDs and duplicates are rejected. |
| Final text exclusion and accidental-overwrite refusal | PASS | Final payload is local outside Git; rerun refused all pre-existing freeze destinations. |
| Human review under the earlier proposal | **NOT MET** | Original and supplemental adjudications are AI reviews. The current repair directive explicitly requested AI review, but this is not evidence of human review. |

The ID amendment is **non-semantic**: no labels, partitions, ontology, scoring, overlap policy, or class-support threshold changed. It was made before this freeze. The 26 supplemental final families were authored separately from the review pass; the review revised or rejected eight proposals rather than forcing class balance. Mechanical overlap checks cannot certify deeper semantic independence, and the AI provenance cannot substitute for a human adjudication if that is later required.

Validation: `.venv/bin/python -m pytest -q tools/verification/test_phase3j_freeze_inputs.py tools/verification/test_phase3j_audit_training.py` → 26 passed. Full freeze validation passed before output creation; a second invocation refused overwrite. The pre-review quality report remains pre-review evidence only and is not used as a post-review gate result.

**Stop here:** no acceptance gate, training configuration, Kaggle ZIP, model training, final evaluation, candidate selection, or promotion is part of this data-repair checkpoint.
