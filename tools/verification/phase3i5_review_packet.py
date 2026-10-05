#!/usr/bin/env python3
"""Create a prediction-blind human review packet and blank response template."""

import hashlib
import json
import os
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
DRAFT = ROOT / "evaluation/phase_iii_i_5/candidate_draft_v1.json"
PACKET = ROOT / "docs/phase_iii_i_5_independent_review_packet.md"
TEMPLATE = ROOT / "evaluation/phase_iii_i_5/independent_review_template_v1.json"


def create_new(path, data):
    fd = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o644)
    with os.fdopen(fd, "wb") as target:
        target.write(data)


def main():
    raw = DRAFT.read_bytes()
    draft = json.loads(raw)
    if draft["role"] != "PHASE_III_I_5_PROPOSED_NOT_REVIEWED_NOT_SCORED":
        raise ValueError("not a proposed corpus")
    sha = hashlib.sha256(raw).hexdigest()
    counts = Counter(case["proposed_label"] for case in draft["cases"])
    lines = [
        "# Phase III-I.5 independent semantic-label review packet",
        "",
        "Status: **AI-assisted proposals only, not ground truth or scored results.** No Phase III-I.5 model prediction has been run. The reviewer must judge semantics, not whether a case is difficult or whether the proposed label seems plausible.",
        "",
        f"Candidate SHA-256: `{sha}`. Cases: {len(draft['cases'])}. Proposed class distribution: " +
        ", ".join(f"{name} {count}" for name, count in sorted(counts.items())) + ".",
        "",
        "Return one decision per ID: `CONFIRMED`, `REVISED` (give a different canonical label), `AMBIGUOUS`, or `EXCLUDE`. Give a short reason for every non-confirmation. If an item contains simultaneous operations with no canonical precedence, mark `AMBIGUOUS` or `EXCLUDE` and explain the ontology gap. Do not force class balance. Review all 216 cases, including controlled paraphrase/minimal-pair/distractor/order families. Treat proposed labels as fallible; do not look at model outputs. Supply your own reviewer name, ISO date, and actual review provenance. An AI review must not be described as independent human review.",
        "",
        "The canonical P1 boundaries are: unchanged = no material change; added = new capability/option/actor/channel/data item while baseline remains; removed = explicit baseline capability/option/permission/scope item eliminated even if others remain; modified = existing behavior survives with timing/value/format/access/rule changed; contradiction = incompatibility with an explicit must/must-not/only/never/required/optional/before/after invariant; ambiguous = unresolved/hypothetical/insufficient/internally conflicting intent. A question alone need not be ambiguous. Consider explicit partial removal and invariant priority carefully.",
        "",
        "The companion blank JSON template has every ID in order. A signed text list of decisions is also acceptable; Codex can transcribe it without changing the reviewer's choices. Do not use the proposal file as a training set. Prior Phase III-I review was self-attested by the user but not independently observed; this packet does not silently upgrade that provenance.",
        "",
    ]
    for case in draft["cases"]:
        lines.extend([
            f"## {case['id']} — {case['domain']} / {case['difficulty_tier']}",
            "",
            f"Baseline: {case['baseline_requirement']}",
            "",
            f"Message: {case['message']}",
            "",
            f"Proposed: `{case['proposed_label']}` — {case['proposed_rationale']}",
            "",
            f"Family: `{case['semantic_family']}`; tags: {', '.join(case['phenomenon_tags'])}.",
            "",
        ])
    packet = "\n".join(lines)
    template = {
        "role": "PHASE_III_I_5_BLANK_INDEPENDENT_REVIEW_TEMPLATE_NOT_COMPLETED",
        "draft_sha256": sha,
        "reviewer": None,
        "review_provenance": None,
        "review_date": None,
        "decisions": [
            {"case_id": case["id"], "decision": None, "reviewed_label": None, "review_note": ""}
            for case in draft["cases"]
        ],
    }
    if PACKET.exists() or TEMPLATE.exists():
        raise FileExistsError("packet or template already exists")
    create_new(PACKET, packet.encode())
    create_new(TEMPLATE, (json.dumps(template, indent=2) + "\n").encode())
    print(json.dumps({"packet": str(PACKET), "template": str(TEMPLATE), "draft_sha256": sha,
                      "cases": len(draft["cases"])}))


if __name__ == "__main__":
    main()
