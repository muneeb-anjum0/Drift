#!/usr/bin/env python3
"""Expand authored Phase III-I.5 scenarios into the reviewable flat draft."""

import argparse
import json
import re
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SEED = ROOT / "evaluation/phase_iii_i_5/candidate_seed_v1.json"
OUT = ROOT / "evaluation/phase_iii_i_5/candidate_draft_v1.json"
LABELS = {"unchanged", "added", "removed", "modified", "contradiction", "ambiguous"}

# Distinct, irrelevant context on selected T4 items. This is fixed before review/inference.
LONG_CONTEXT = {
    "s01-04": "The front desk is also redesigning the waiting-room sign, but that belongs to facilities. We had an unrelated conversation about whether appointment cards should be blue or green, and nobody expects that to affect how the reminder system works.",
    "s02-04": "The exhibition team is installing new floor labels next week. Security asked whether that changes ticket scanning, and the answer is no: the entry workflow itself stays at the same door with the same guard role.",
    "s03-04": "Facilities is pricing replacement freezer doors and the procurement spreadsheet has several draft quotes. Those costs are not part of this request; they are background from the same meeting and have no effect on the sensor's actual data fields.",
    "s04-04": "The teacher dashboard has an open accessibility bug about contrast, and the school plans to handle it separately. The proposed visibility change below is specifically about the grade record and who can see it before publication.",
    "s05-04": "Marketing also asked for new rail-pass artwork and a different welcome email. Neither request concerns the renewal channel, and the customer-service team has not asked to alter pass pricing or the expiry rule.",
    "s06-04": "The finance dashboard's table headers are being reviewed by design. That is unrelated to when a claim is paid. The approval record and the manager's identity would still be stored for audit purposes.",
    "s07-04": "The gallery layout is changing on older phones and the photo editor may receive a new toolbar. Those are separate client tickets; this note is limited to what the backup engine writes to each destination.",
    "s08-04": "The support team is updating its internal dispute playbook and discussing response scripts. Those changes are not part of the product behavior requested here, and the portal record must still be created for each dispute.",
    "s09-04": "Operations has a parallel ticket to revise how incident notes are filed. That ticket does not change how an API key is revoked or who can do it. Please keep these work items separate when reading the request.",
    "s10-04": "The court operator is redoing the lobby poster and pricing table, neither of which belongs to this booking change. We are talking about which duration the picker actually offers, not how the options are advertised.",
    "s11-04": "Library volunteers also mentioned a slow loading animation on the mobile page. That performance discussion is separate from the catalog filter behavior. The author and subject facets must continue to work on both device sizes.",
    "s12-04": "Finance will separately review the export filename and where it is stored on the shared drive. Neither of those housekeeping questions changes the content columns or the cadence requested in this ticket.",
}


def word_count(text):
    return len(re.findall(r"\b[\w'-]+\b", text))


def expand(seed):
    if seed.get("role") != "AUTHORING_SEED_NOT_REVIEWED_NOT_SCORED":
        raise ValueError("wrong seed role")
    if len(seed["groups"]) != 30 or len(seed["minimal_pairs"]) != 18:
        raise ValueError("expected 30 scenario groups and 18 contrast pairs")
    cases = []
    for group in seed["groups"] + seed["minimal_pairs"]:
        group_id = group["id"]
        expected = 6 if group_id.startswith("s") else 2
        if len(group["cases"]) != expected:
            raise ValueError(f"{group_id}: expected {expected} cases")
        for index, proposal in enumerate(group["cases"]):
            label, tier, message, rationale, tags = proposal
            if label not in LABELS or tier not in {"T1", "T2", "T3", "T4"}:
                raise ValueError(f"{group_id}: invalid label/tier")
            case_id = f"{group_id}-{index + 1:02d}"
            if case_id in LONG_CONTEXT:
                message += " " + LONG_CONTEXT[case_id]
            length = word_count(group["baseline"] + " " + message)
            if length > 160:
                raise ValueError(f"{case_id}: exceeds long bucket")
            bucket = "short" if length <= 20 else "medium" if length <= 60 else "long"
            cases.append({
                "id": case_id,
                "domain": group["domain"],
                "baseline_requirement": group["baseline"],
                "message": message,
                "proposed_label": label,
                "proposed_rationale": rationale,
                "difficulty_tier": tier,
                "semantic_family": group_id,
                "requirement_structure": group["structure"],
                "length_bucket": bucket,
                "phenomenon_tags": sorted(set(tags)),
                "author_provenance": "AI_ASSISTED_SYNTHETIC_PROPOSAL",
                "review_provenance": "PENDING_HUMAN",
            })
    relations = []
    for group in seed["groups"][:10]:
        name = group["id"]
        relations.append({"id": f"para-{name}", "type": "paraphrase_invariance",
                          "case_ids": [f"{name}-01", f"{name}-03", f"{name}-04"]})
    for group in seed["groups"][10:]:
        name = group["id"]
        relations.append({"id": f"dist-{name}", "type": "distractor_invariance",
                          "case_ids": [f"{name}-03", f"{name}-04"]})
        relations.append({"id": f"order-{name}", "type": "order_invariance",
                          "case_ids": [f"{name}-05", f"{name}-06"]})
    for pair in seed["minimal_pairs"]:
        name = pair["id"]
        relations.append({"id": f"contrast-{name}", "type": "minimal_pair_contrast",
                          "case_ids": [f"{name}-01", f"{name}-02"],
                          "expected_labels": [pair["cases"][0][0], pair["cases"][1][0]]})
    by_id = {case["id"]: case for case in cases}
    if len(by_id) != len(cases):
        raise ValueError("duplicate case IDs")
    for relation in relations:
        members = [by_id[case_id] for case_id in relation["case_ids"]]
        if relation["type"] != "minimal_pair_contrast" and len({case["proposed_label"] for case in members}) != 1:
            raise ValueError(f"{relation['id']}: invariant labels differ")
        if relation["type"] == "minimal_pair_contrast" and len({case["proposed_label"] for case in members}) != 2:
            raise ValueError(f"{relation['id']}: contrast labels do not differ")
    output = {"role": "PHASE_III_I_5_PROPOSED_NOT_REVIEWED_NOT_SCORED",
              "version": "1.0.0-draft", "methodology": "docs/phase_iii_i_5_methodology.md",
              "source": "NEW_SYNTHETIC_III_I_5_NOT_HISTORICAL_CASES",
              "cases": cases, "relations": relations}
    print(json.dumps({"cases": len(cases), "labels": Counter(case["proposed_label"] for case in cases),
                      "tiers": Counter(case["difficulty_tier"] for case in cases),
                      "lengths": Counter(case["length_bucket"] for case in cases),
                      "relations": Counter(relation["type"] for relation in relations)}, indent=2))
    return output


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", type=Path, default=OUT)
    args = parser.parse_args()
    candidate = expand(json.loads(SEED.read_text(encoding="utf-8")))
    if args.out.exists():
        raise FileExistsError(f"candidate exists: {args.out}")
    args.out.write_text(json.dumps(candidate, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
