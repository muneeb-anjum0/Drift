#!/usr/bin/env python3
"""Development-only rank, budget, scaling and architecture analysis."""

import argparse
import collections
import hashlib
import json
import math
import statistics
from pathlib import Path

BUDGETS = (1, 2, 3, 5, 8, 10, 16, 32, 50, 75, 100)


def fraction(n, d):
    return n / d if d else None


def normalize(report, kind):
    if kind in {"R0", "R5"}:
        return [{"id": r["query_id"], "project": r["project_id"], "expected": r["expected_requirement_ids"],
                 "ranked": r["ranked_requirements"], "selected": r["selected_requirement_ids"]}
                for r in report["results"]]
    if kind == "HYB":
        source = report["grid"]["a0.5-t0.35"]["results"]
    else:
        source = report["thresholds"]["0.45"]["results"] if kind in {"R6", "DECOMP"} else report["results"]
    return [{"id": r["query_id"], "project": r["project_id"], "expected": r["expected_ids"],
             "ranked": r["ranked"], "selected": r["selected_ids"]} for r in source]


def row_for(project, query, ranked, selected):
    return {"id": query["id"], "project": project["id"], "expected": query["expected_requirement_ids"],
            "ranked": ranked, "selected": selected}


def derived_two_stage(dataset, bm25, semantic, stage_budget):
    first = {r["id"]: r for r in bm25}
    second = {r["id"]: r for r in semantic}
    rows = []
    for project in dataset["projects"]:
        for query in project["queries"]:
            lexical = first[query["id"]]
            sem = second[query["id"]]
            admitted = {r["id"] for r in lexical["ranked"][:stage_budget]}
            ranked = [r.copy() for r in sem["ranked"] if r["id"] in admitted]
            selected = [r["id"] for r in ranked if r["score"] >= 0.45][:3]
            rows.append(row_for(project, query, ranked, selected))
    return rows


def bm25_variant(dataset, r5, representation):
    traces = {r["id"]: r for r in r5}
    rows = []
    for project in dataset["projects"]:
        n = len(project["requirements"])
        for query in project["queries"]:
            trace = {r["id"]: r for r in traces[query["id"]]["ranked"]}
            qwords = set(next(iter(trace.values()))["trace"]["input_tokens"])
            docs = {}
            for requirement in project["requirements"]:
                t = trace[requirement["id"]]["trace"]
                title, body = set(t["title_tokens"]), set(t["baseline_tokens"])
                docs[requirement["id"]] = title if representation == "title" else body if representation == "description" else title | body
            df = collections.Counter(term for terms in docs.values() for term in terms)
            avg_len = sum(len(terms) for terms in docs.values()) / n or 1
            idf = {term: math.log(1 + (n - df[term] + 0.5) / (df[term] + 0.5)) for term in qwords}
            ceiling = sum(idf.values()) * 2.2
            ranked = []
            for requirement in project["requirements"]:
                rid = requirement["id"]
                words = docs[rid]
                denominator = 1 + 1.2 * (0.25 + 0.75 * len(words) / avg_len)
                score = sum(idf[t] * 2.2 / denominator for t in qwords & words) / ceiling if ceiling else 0
                ranked.append({"id": rid, "score": score})
            ranked.sort(key=lambda item: -item["score"])
            selected = [r["id"] for r in ranked if r["score"] >= 0.05][:3]
            rows.append(row_for(project, query, ranked, selected))
    return rows


def metrics(rows, budget=None):
    targets = sum(len(r["expected"]) for r in rows)
    positive = [r for r in rows if r["expected"]]
    hits = false = calls = full = zero_exposed = 0
    ranks = []
    for row in rows:
        expected = set(row["expected"])
        selected = row["selected"] if budget is None else [x["id"] for x in row["ranked"][:budget]]
        hits += len(expected & set(selected))
        false += len(set(selected) - expected)
        calls += len(selected)
        full += bool(expected) and expected <= set(selected)
        zero_exposed += not expected and bool(selected)
        ranks.extend(next((i for i, item in enumerate(row["ranked"], 1) if item["id"] == rid), None) for rid in expected)
    return {"queries": len(rows), "positive_queries": len(positive), "expected_links": targets,
            "target_hits": hits, "target_recall": fraction(hits, targets), "full_query_reach": [full, len(positive)],
            "false_exposures": false, "false_per_query": fraction(false, len(rows)),
            "false_per_selected": fraction(false, calls), "candidate_calls": calls,
            "mean_calls_per_query": fraction(calls, len(rows)), "max_calls_per_query": max((len(r["selected"] if budget is None else r["ranked"][:budget]) for r in rows), default=0),
            "zero_target_exposed": [zero_exposed, len(rows) - len(positive)],
            "mean_target_rank": statistics.mean(x for x in ranks if x is not None) if any(x is not None for x in ranks) else None,
            "median_target_rank": statistics.median(x for x in ranks if x is not None) if any(x is not None for x in ranks) else None,
            "mrr": fraction(sum(1 / min(i for i, item in enumerate(r["ranked"], 1) if item["id"] in r["expected"])
                                 for r in positive if any(item["id"] in r["expected"] for item in r["ranked"])), len(positive))}


def score_distribution(rows):
    positive, negative = [], []
    for row in rows:
        expected = set(row["expected"])
        for item in row["ranked"]:
            (positive if item["id"] in expected else negative).append(item["score"])
    return {"positive_pairs": len(positive), "negative_pairs": len(negative),
            "positive_median": statistics.median(positive) if positive else None,
            "negative_median": statistics.median(negative) if negative else None,
            "positive_min": min(positive) if positive else None,
            "negative_max": max(negative) if negative else None}


def describe(rows, dataset):
    projects = {p["id"]: p for p in dataset["projects"]}
    categories = {(p["id"], q["id"]): q.get("categories", ["legacy_unclassified"])
                  for p in dataset["projects"] for q in p["queries"]}
    result = {"selected": metrics(rows),
              "budget_curve": {str(k): metrics(rows, k) for k in BUDGETS},
              "score_distribution": score_distribution(rows),
              "by_size": {str(n): {"selected": metrics(group), "budget_curve": {str(k): metrics(group, k) for k in BUDGETS}}
                          for n in sorted({p.get("project_size", len(p["requirements"])) for p in projects.values()})
                          if (group := [r for r in rows if projects[r["project"]].get("project_size", len(projects[r["project"]]["requirements"])) == n])},
              "by_target_count": {str(n): {"selected": metrics(group), "budget_curve": {str(k): metrics(group, k) for k in BUDGETS}}
                                  for n in range(5) if (group := [r for r in rows if len(r["expected"]) == n])},
              "by_category": {category: {"selected": metrics(group), "top3": metrics(group, 3), "top5": metrics(group, 5)}
                              for category in sorted({c for values in categories.values() for c in values})
                              if (group := [r for r in rows if category in categories[(r["project"], r["id"])]])}}
    distributions = collections.Counter()
    stage = collections.Counter()
    for row in rows:
        selected = set(row["selected"])
        for target in row["expected"]:
            match = next(((i, item) for i, item in enumerate(row["ranked"], 1) if item["id"] == target), None)
            if match is None:
                distributions["missing_candidate"] += 1
                stage["candidate_generation"] += 1
                continue
            rank, item = match
            distributions["rank_1" if rank == 1 else "rank_2_3" if rank <= 3 else "rank_4_5" if rank <= 5 else "rank_6_10" if rank <= 10 else "rank_11_plus"] += 1
            if item.get("score", 0) <= 0:
                distributions["zero_score_not_meaningfully_retrieved"] += 1
            if target not in selected:
                decision = item.get("decision", "UNSELECTED")
                if decision == "BELOW_THRESHOLD":
                    stage["threshold_or_specific_gate"] += 1
                elif decision == "TOP_K_EXCLUDED":
                    stage["candidate_cap"] += 1
                else:
                    stage[decision.lower()] += 1
    result["rank_distribution"] = dict(distributions)
    result["missed_selection_stages"] = dict(stage)
    result["minimum_budget_for_target_recall"] = {str(target): next((k for k in BUDGETS if result["budget_curve"][str(k)]["target_recall"] >= target), None)
                                                  for target in (0.70, 0.80, 0.85, 0.90, 0.95, 1.0)}
    return result


def pareto(summary):
    points = []
    for architecture, result in summary.items():
        for budget, metric in result["budget_curve"].items():
            points.append({"architecture": architecture, "budget": int(budget), "recall": metric["target_recall"],
                           "calls": metric["candidate_calls"], "false": metric["false_exposures"]})
    frontier = []
    for point in points:
        if not any(other is not point and other["recall"] >= point["recall"] and other["calls"] <= point["calls"]
                   and other["false"] <= point["false"] and (other["recall"] > point["recall"] or other["calls"] < point["calls"] or other["false"] < point["false"])
                   for other in points):
            frontier.append(point)
    return frontier


def from_compact(document):
    return {name: [{"id": row["query_id"], "project": row["project_id"], "expected": row["expected_ids"],
                    "selected": row["selected_ids"],
                    "ranked": [{"id": item[0], "score": item[1], "decision": item[2]} for item in row["ranked"]]}
                   for row in value["results"]]
            for name, value in document["architectures"].items()}


def validate_rows(rows, dataset):
    projects = {p["id"]: p for p in dataset["projects"]}
    allowed = {(p["id"], q["id"]) for p in dataset["projects"] for q in p["queries"]}
    if len(allowed) != sum(len(p["queries"]) for p in dataset["projects"]):
        raise ValueError("duplicate project/query identity")
    for name, group in rows.items():
        seen = set()
        for row in group:
            key = row["project"], row["id"]
            if key not in allowed or key in seen:
                raise ValueError(f"{name}: unknown or duplicate project/query")
            seen.add(key)
            requirement_ids = {r["id"] for r in projects[row["project"]]["requirements"]}
            ranked_ids = [item["id"] for item in row["ranked"]]
            if len(ranked_ids) != len(set(ranked_ids)) or not set(ranked_ids) <= requirement_ids:
                raise ValueError(f"{name}: duplicate or cross-project ranked requirement")
            if not set(row["expected"]) <= requirement_ids or not set(row["selected"]) <= set(ranked_ids):
                raise ValueError(f"{name}: invalid expected or selected requirement")
            if len(row["selected"]) > 3 or any(not math.isfinite(item["score"]) for item in row["ranked"]):
                raise ValueError(f"{name}: cap exceeded or nonfinite score")
        if seen != allowed:
            raise ValueError(f"{name}: missing queries")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--directory", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    directory = args.directory
    raw = (directory / "scaling_dev_v1.json").read_bytes()
    dataset = json.loads(raw)
    freeze = json.loads((directory / "scaling_freeze_v1.json").read_bytes())
    digest = hashlib.sha256(raw).hexdigest()
    if dataset.get("role") != "DEVELOPMENT_NOT_FINAL" or freeze["dataset_sha256"] != digest:
        raise SystemExit("not frozen development bytes")
    compact = json.loads((directory / "rank_traces_v1.json").read_bytes())
    if compact["dataset_sha256"] != digest:
        raise SystemExit("compact traces/dataset hash mismatch")
    rows = from_compact(compact)
    validate_rows(rows, dataset)
    for name, group in rows.items():
        if len(group) != 90 or len({r["id"] for r in group}) != 90:
            raise SystemExit(f"{name} incomplete")
    summary = {name: describe(group, dataset) for name, group in rows.items()}
    output = {"role": "DEVELOPMENT_ARCHITECTURE_STUDY", "dataset_sha256": digest,
              "budgets": BUDGETS, "selected_policy": {"R0": "frozen .25 cap3 specific gate", "R5": "frozen .25 cap3 specific gate",
                                               "R6": "frozen .45 cap3", "BM25": "research .05 cap3",
                                               "HYB": "research alpha=.5 threshold=.35 cap3", "DECOMP": "research .45 cap3"},
              "architectures": summary, "threshold_free_pareto": pareto(summary),
              "cost_assumption": "Model-call counts are exact selected-candidate counts; seconds are not estimated from this benchmark. Historical ~7.35 s per sequential call is only contextual, not a measured scaling latency.",
              "limitations": ["Synthetic fixed-query panel repeated nine times; 90 rows are 10 paired cases, not independent observations.",
                              "At N>36 distractors are mostly cross-domain, making large-size scaling optimistic.",
                              "Two-stage reranks only first-stage admitted requirements; no model inference.",
                              "Threshold-free top-k includes low/zero-score candidates and is an oracle ceiling, not safe selection."]}
    args.output.write_text(json.dumps(output, separators=(",", ":")) + "\n")
    print(json.dumps({name: {"selected": item["selected"]["target_hits"],
                             "top3": item["budget_curve"]["3"]["target_hits"],
                             "top5": item["budget_curve"]["5"]["target_hits"]} for name, item in summary.items()}, indent=2))


if __name__ == "__main__":
    main()
