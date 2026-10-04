import unittest

from phase3e_semantic_dev import rank_select


class RankSelectTests(unittest.TestCase):
    def test_boundary_and_stable_tie(self):
        ranked, selected = rank_select([
            {"id": "first", "score": 0.45},
            {"id": "second", "score": 0.45},
            {"id": "third", "score": 0.90},
            {"id": "fourth", "score": 0.45},
        ], 0.45)
        self.assertEqual(selected, ["third", "first", "second"])
        self.assertEqual(ranked[3]["decision"], "TOP_K_EXCLUDED")

    def test_zero_selection_is_valid(self):
        ranked, selected = rank_select([{"id": "only", "score": 0.449999}], 0.45)
        self.assertEqual(selected, [])
        self.assertEqual(ranked[0]["decision"], "BELOW_THRESHOLD")

    def test_empty_candidates(self):
        self.assertEqual(rank_select([], 0.45), ([], []))


if __name__ == "__main__":
    unittest.main()
