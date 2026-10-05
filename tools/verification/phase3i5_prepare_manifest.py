#!/usr/bin/env python3
"""Create the immutable pre-inference identity/eligibility manifest."""

import hashlib
import json
import os
from collections import Counter

from phase3i5_freeze import validate_review
from phase3i_run_oracle import REQUEST, ROOT, sha256


BASE = ROOT / "evaluation/phase_iii_i_5"
OUT = BASE / "pre_inference_manifest_v1.json"
PATHS = {
    "candidate": "evaluation/phase_iii_i_5/candidate_draft_v1.json",
    "review_source_json": "evaluation/phase_iii_i_5/human_review/source.json",
    "review_source_csv": "evaluation/phase_iii_i_5/human_review/source.csv",
    "review_source_txt": "evaluation/phase_iii_i_5/human_review/source.txt",
    "review_transcription": "evaluation/phase_iii_i_5/human_review/normalized_review_v1.json",
    "frozen_corpus": "evaluation/phase_iii_i_5/reviewed_frozen_v1.json",
    "frozen_corpus_checksum": "evaluation/phase_iii_i_5/reviewed_frozen_v1.json.sha256",
    "stability_selection": "evaluation/phase_iii_i_5/stability_selection_v1.json",
    "reviewed_overlap": "evaluation/phase_iii_i_5/reviewed_overlap_v1.json",
    "methodology": "docs/phase_iii_i_5_methodology.md",
    "author_exposure_disclosure": "docs/phase_iii_i_5_provenance_deviation.md",
    "model": "models/gguf/DriftLedger-Qwen2.5-7B-Q4_K_M.gguf",
    "p1_prompt": "evaluation/prompts/P1.json",
    "pp1_source": "server-go/internal/modules/drift/drift_postprocess.go",
    "singleton_runner": "tools/verification/phase3i_run_oracle.py",
    "singleton_contract": "tools/verification/phase3h_contracts.py",
    "stress_runner": "tools/verification/phase3i5_run_oracle.py",
}
EXPECTED = {
    "candidate": "5477c3a1444aec75b7054ee35e68bb97cdc9ed1369341b1d22f9a617c43704fe",
    "model": "11e2ca8d10f6b52693256addca9b8f0d5bb01eebc53594b531586ea992419ac9",
    "p1_prompt": "902ac43037c998afc4b6550995036bbc720bcae5dbbafc4504b2b9898abed339",
    "pp1_source": "0c8bf5cf8fad54d2f9285a4392c2a4fa96d3fc758d3331a0fb0020c834b643e7",
}


def build():
    if OUT.exists() or (BASE / "primary_results").exists() or (BASE / "stability_results").exists():
        raise FileExistsError("manifest or prediction output exists; refusing pre-inference freeze")
    reviewed = validate_review(ROOT / PATHS["candidate"], ROOT / PATHS["review_transcription"])
    frozen = json.loads((ROOT / PATHS["frozen_corpus"]).read_text())
    if reviewed != frozen:
        raise ValueError("on-disk frozen corpus differs from validated review")
    scored = [case for case in frozen["cases"] if case["primary_scored"]]
    if len(frozen["cases"]) != 216 or len(scored) != 215:
        raise ValueError("frozen corpus scoring eligibility changed")
    class_counts = Counter(case["review"]["reviewed_label"] for case in scored)
    tier_counts = Counter(case["difficulty_tier"] for case in scored)
    domains = Counter(case["domain"] for case in scored)
    if (min(class_counts.values()) < 20 or min(tier_counts.values()) < 30
            or len(domains) < 15 or max(domains.values()) / len(scored) > 0.12):
        raise ValueError("preregistered class/tier/domain coverage not met")
    relations = Counter((relation["type"], relation["primary_eligible"]) for relation in frozen["relations"])
    if (relations[("minimal_pair_contrast", True)] < 18 or
            relations[("paraphrase_invariance", True)] < 9 or
            relations[("distractor_invariance", True)] < 12 or
            relations[("order_invariance", True)] < 12):
        raise ValueError("reviewed family coverage below documented eligible counts")
    selection = json.loads((ROOT / PATHS["stability_selection"]).read_text())
    if selection.get("corpus_sha256") != sha256(ROOT / PATHS["frozen_corpus"]):
        raise ValueError("stability subset not tied to frozen corpus")
    overlap = json.loads((ROOT / PATHS["reviewed_overlap"]).read_text())
    if overlap.get("draft_sha256") != sha256(ROOT / PATHS["frozen_corpus"]):
        raise ValueError("overlap report not tied to reviewed corpus")
    if overlap["internal_exact_duplicate_pairs"] or overlap["cross_family_same_baseline_near_pairs"]:
        raise ValueError("internal duplicate/near-overlap found")
    for source in overlap["closed_final_aggregate_only"].values():
        if source["exact_normalized_pair_candidate_ids"]:
            raise ValueError("closed final exact pair overlap found")
    for source in overlap["archive"]["sources"].values():
        if source["exact_normalized_pair_case_ids"]:
            raise ValueError("archive exact pair overlap found")
    files = {name: {"path": path, "sha256": sha256(ROOT / path)} for name, path in PATHS.items()}
    for name, expected in EXPECTED.items():
        if files[name]["sha256"] != expected:
            raise ValueError(f"{name} identity mismatch")
    expected_sidecar = f"{files['frozen_corpus']['sha256']}  reviewed_frozen_v1.json\n"
    if (ROOT / PATHS["frozen_corpus_checksum"]).read_text() != expected_sidecar:
        raise ValueError("frozen corpus checksum sidecar differs")
    return {
        "role": "PHASE_III_I_5_PRE_INFERENCE_FREEZE_MANIFEST",
        "status": "NO_MODEL_PREDICTIONS_EXISTED_AT_MANIFEST_CREATION",
        "starting_main": "2c54555dc09580f759e8a2cbf92b8f82e4f4a3af",
        "methodology_commit": "922ee58",
        "files": files,
        "review_decision_counts": frozen["review_decision_counts"],
        "proposed_cases": len(frozen["cases"]),
        "primary_scored_cases": len(scored),
        "unscored_ontology_gap_case_ids": [case["id"] for case in frozen["cases"] if not case["primary_scored"]],
        "scored_class_counts": dict(sorted(class_counts.items())),
        "scored_tier_counts": dict(sorted(tier_counts.items())),
        "eligible_relation_counts": {kind: sum(value for (category, eligible), value in relations.items()
                                           if category == kind and eligible)
                                     for kind in ("minimal_pair_contrast", "paraphrase_invariance",
                                                  "distractor_invariance", "order_invariance")},
        "review_provenance": "Muneeb human semantic review, self-attested; process not independently witnessed",
        "author_exposure": "ACCEPTABLE_WITH_LIMITATION; not perfectly blind to old proposed III-I text",
        "primary_score_policy": "All 215 human-reviewed CONFIRMED/REVISED cases; one AMBIGUOUS review case retained but unscored",
        "request_settings": REQUEST,
        "expected_runtime": {"image": "ghcr.io/ggml-org/llama.cpp:server-b11151",
                             "n_ctx": 768, "slots": 1, "threads": 6, "gpu_layers": 0,
                             "device": "none", "device_requests": None,
                             "container_memory_bytes": 7516192768,
                             "container_memory_swap_bytes": 8589934592},
        "limitations": ["V5 archive-to-adapter byte identity unproven", "Exact/lexical overlap is not semantic proof",
                        "Review is human self-attested, not independently witnessed",
                        "Case author saw a few old proposed III-I cases before authoring"],
    }


def main():
    manifest = build()
    body = (json.dumps(manifest, indent=2, ensure_ascii=False) + "\n").encode()
    fd = os.open(OUT, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o644)
    with os.fdopen(fd, "wb") as target:
        target.write(body)
    print(json.dumps({"manifest_sha256": hashlib.sha256(body).hexdigest(),
                      "frozen_corpus_sha256": manifest["files"]["frozen_corpus"]["sha256"],
                      "scored": manifest["primary_scored_cases"]}, indent=2))


if __name__ == "__main__":
    main()
