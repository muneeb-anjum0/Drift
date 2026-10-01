# Phase III-C Initial State

Recorded before Phase III-C retrieval changes on 2026-10-01.

1. Source branch was `phase-3/model-improvement-v1`.
2. Source HEAD was `6b13d4856141dc6a05dd214e69b2f71ca7ca9294`.
3. The source worktree was clean.
4. `main` was `64aa7c0b2fee70e1c5132b9eeebed3d98d8f5ce6`.
5. `origin/main` was the same SHA.
6. The source branch was 24 commits ahead and 0 behind `origin/main`.
7. V0 evidence is `66bb5fe7a0c98c20a40b3dd19113a641f5b71b7f`; the protected tag still peels to artifact commit `5421d1f383796b1ec0e271586711e637a9ed0347`.
8. Rejected V1 is R1 retrieval + P1 prompt + PP1 postprocessing at the source HEAD. Its records and `REJECT` decision remain unchanged.
9. P1 defines mutually exclusive six-label boundaries and treats both compared fields as untrusted business content.
10. PP1 keeps canonical presentation enrichment but prevents rules from overwriting validated semantic labels.
11. V0 retrieval is deterministic lexical/domain scoring at threshold 0.25 and top-k 3; `and` remains retrieval evidence.
12. V1/R1 differs only by adding `and` to the retrieval stopword set.
13. R1 improved development ranking but failed final all-expected reach because `ifq-05` lost both expected requirements.
14. All five containers were healthy and running rejected V1 images, not an accepted production/default configuration.
15. Existing inventory contains two contaminated historical regression sets, a 48-case raw development set, a 24-query retrieval development set, a 28-pair oracle set, a 24-case final raw set, and a 12-query final retrieval set.
16. Both Phase III-B final sets are closed and may not guide Phase III-C.
17. Historical cases recur in source/tests/UI/rules; original adapter-training overlap is unknown.
18. The fixed 4,683,074,112-byte Q4_K_M artifact has recorded SHA256 `11e2ca8d10f6b52693256addca9b8f0d5bb01eebc53594b531586ea992419ac9`.
19. Runtime was llama.cpp with device `none`, GPU layers 0, one slot, six CPU threads, context 768, 120-token cap, 7 GiB memory, and 8 GiB memory+swap.
20. Unknowns include training data/splits, real-world retrieval distribution, independent generalisation, complete inactive/deleted requirement semantics, and retraining value after retrieval correction.

## Scientifically derived Phase III-C start

Phase III-C branches from the immutable rejected-V1 closeout so all evidence remains reachable, then removes only R1's `and` stopword and its test. P1 and PP1 stay byte-identifiable. This yields P1 + PP1 + exact V0 retrieval behavior without rewriting V1 history.
