"""Model-free invariants for the Phase III-F development research tools."""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from phase3f_analyze import derived_two_stage, from_compact, metrics, validate_rows
from phase3f_scaling_dev import CORE, SIZES, build


class ScalingDevelopmentTest(unittest.TestCase):
    def test_nested_deterministic_and_scoped(self):
        first, second = build(), build()
        self.assertEqual(first, second)
        self.assertEqual(first["role"], "DEVELOPMENT_NOT_FINAL")
        self.assertEqual([p["project_size"] for p in first["projects"]], list(SIZES))
        previous = []
        for project in first["projects"]:
            current = [r["id"] for r in project["requirements"]]
            self.assertEqual(current[:len(previous)], previous)
            self.assertEqual(len(current), len(set(current)))
            for query in project["queries"]:
                self.assertTrue(set(query["expected_requirement_ids"]) <= set(current))
                self.assertEqual(query["provenance"], "SYNTHETIC")
            previous = current
        self.assertEqual(previous[:5], list(CORE))

    def test_empty_single_large_and_four_targets(self):
        projects = build()["projects"]
        self.assertEqual(len(projects[0]["requirements"]), 5)
        self.assertEqual(len(projects[-1]["requirements"]), 100)
        self.assertEqual(len(projects[0]["queries"][6]["expected_requirement_ids"]), 4)
        self.assertEqual(projects[0]["queries"][7]["expected_requirement_ids"], [])


class AnalysisTest(unittest.TestCase):
    def test_budget_and_zero_target(self):
        rows = [{"expected": ["a"], "ranked": [{"id": "b", "score": 0.8}, {"id": "a", "score": 0.7}], "selected": ["b"]},
                {"expected": [], "ranked": [{"id": "c", "score": 0.9}], "selected": []}]
        selected, top2 = metrics(rows), metrics(rows, 2)
        self.assertEqual((selected["target_hits"], selected["false_exposures"]), (0, 1))
        self.assertEqual((top2["target_hits"], top2["false_exposures"]), (1, 2))
        self.assertEqual(top2["zero_target_exposed"], [1, 1])

    def test_two_stage_never_resurrects_excluded_candidate(self):
        data = {"projects": [{"id": "p", "requirements": [{"id": "a"}, {"id": "b"}],
                               "queries": [{"id": "q", "expected_requirement_ids": ["b"]}]}]}
        bm = [{"id": "q", "project": "p", "ranked": [{"id": "a", "score": 1}, {"id": "b", "score": 0}], "expected": ["b"], "selected": []}]
        sem = [{"id": "q", "project": "p", "ranked": [{"id": "b", "score": 0.9}, {"id": "a", "score": 0.8}], "expected": ["b"], "selected": ["b"]}]
        one = derived_two_stage(data, bm, sem, 1)
        self.assertEqual([r["id"] for r in one[0]["ranked"]], ["a"])
        self.assertEqual(metrics(one)["target_hits"], 0)

    def test_compact_trace_preserves_rank_and_decision(self):
        document = {"architectures": {"R5": {"results": [
            {"query_id": "q", "project_id": "p", "expected_ids": ["a"], "selected_ids": [],
             "ranked": [["a", 0.1, "BELOW_THRESHOLD"]]}]}}}
        rows = from_compact(document)["R5"]
        self.assertEqual(rows[0]["ranked"][0]["decision"], "BELOW_THRESHOLD")
        self.assertEqual(metrics(rows)["target_hits"], 0)

    def test_cross_project_and_nan_fail_closed(self):
        data = {"projects": [{"id": "p", "requirements": [{"id": "a"}],
                               "queries": [{"id": "q", "expected_requirement_ids": ["a"]}]}]}
        row = {"id": "q", "project": "p", "expected": ["a"], "selected": [],
               "ranked": [{"id": "foreign", "score": 0.5}]}
        with self.assertRaisesRegex(ValueError, "cross-project"):
            validate_rows({"test": [row]}, data)
        row["ranked"] = [{"id": "a", "score": float("nan")}]
        with self.assertRaisesRegex(ValueError, "nonfinite"):
            validate_rows({"test": [row]}, data)


if __name__ == "__main__":
    unittest.main()
