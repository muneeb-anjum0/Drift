#!/usr/bin/env python3
"""Hash-select the preregistered 24-case repeat subset before inference."""

import hashlib
import json
import os
from collections import Counter, defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
CORPUS = ROOT / "evaluation/phase_iii_i_5/reviewed_frozen_v1.json"
OUT = ROOT / "evaluation/phase_iii_i_5/stability_selection_v1.json"
N = 24


def rank(corpus_sha, value):
    return hashlib.sha256(f"{corpus_sha}:{value}".encode()).hexdigest()


def select(corpus_path):
    body = corpus_path.read_bytes()
    corpus_sha = hashlib.sha256(body).hexdigest()
    corpus = json.loads(body)
    scored = {case["id"]: case for case in corpus["cases"] if case["primary_scored"]}
    boundaries = defaultdict(list)
    for relation in corpus["relations"]:
        if relation["type"] == "minimal_pair_contrast" and relation["primary_eligible"]:
            boundary = "/".join(sorted(relation["expected_labels"]))
            boundaries[boundary].append(relation)
    expected_boundaries = {
        "modified/removed", "added/modified", "contradiction/modified", "modified/unchanged",
        "ambiguous/modified", "added/unchanged", "contradiction/removed", "added/contradiction",
    }
    if set(boundaries) != expected_boundaries:
        raise ValueError(f"minimal-pair boundary coverage differs: {set(boundaries)}")
    selected = set()
    selected_relations = {}
    for boundary in sorted(boundaries):
        relation = min(boundaries[boundary], key=lambda item: rank(corpus_sha, item["id"]))
        case_id = min(relation["case_ids"], key=lambda value: rank(corpus_sha, value))
        selected.add(case_id)
        selected_relations[boundary] = {"relation_id": relation["id"], "selected_case_id": case_id}
    if len(selected) > N:
        raise ValueError("boundary coverage exceeds repeat budget")

    def deficits(ids):
        classes = Counter(scored[case_id]["review"]["reviewed_label"] for case_id in ids)
        tiers = Counter(scored[case_id]["difficulty_tier"] for case_id in ids)
        class_need = {label: max(0, 2 - classes[label]) for label in
                      ("unchanged", "added", "removed", "modified", "contradiction", "ambiguous")}
        tier_need = {tier: max(0, 4 - tiers[tier]) for tier in ("T1", "T2", "T3", "T4")}
        return class_need, tier_need

    while len(selected) < N:
        class_need, tier_need = deficits(selected)
        candidates = [case_id for case_id in scored if case_id not in selected]
        candidates.sort(key=lambda case_id: (
            -(int(class_need[scored[case_id]["review"]["reviewed_label"]] > 0) +
              int(tier_need[scored[case_id]["difficulty_tier"]] > 0)),
            rank(corpus_sha, case_id),
        ))
        selected.add(candidates[0])
    class_need, tier_need = deficits(selected)
    if any(class_need.values()) or any(tier_need.values()):
        raise ValueError(f"stability subset cannot meet predeclared strata: {class_need}, {tier_need}")
    ordered = sorted(selected, key=lambda case_id: rank(corpus_sha, case_id))
    return {
        "role": "PHASE_III_I_5_PRE_INFERENCE_STABILITY_SELECTION",
        "corpus_sha256": corpus_sha,
        "selection_algorithm": "One hash-first case from a hash-first contrast pair per eight boundaries, then greedy class/tier deficit with SHA-256 tie-break; 24 distinct cases",
        "selection_count": N,
        "case_ids": ordered,
        "selected_minimal_pair_relations": selected_relations,
        "class_counts": dict(sorted(Counter(scored[case_id]["review"]["reviewed_label"] for case_id in selected).items())),
        "tier_counts": dict(sorted(Counter(scored[case_id]["difficulty_tier"] for case_id in selected).items())),
        "repeat_policy": "Exactly one additional raw singleton call per selected case after primary scoring; no majority vote",
    }


def main():
    manifest = select(CORPUS)
    data = (json.dumps(manifest, indent=2) + "\n").encode()
    fd = os.open(OUT, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o644)
    with os.fdopen(fd, "wb") as target:
        target.write(data)
    print(json.dumps({"selected": manifest["selection_count"], "class_counts": manifest["class_counts"],
                      "tier_counts": manifest["tier_counts"], "corpus_sha256": manifest["corpus_sha256"]}, indent=2))


if __name__ == "__main__":
    main()
