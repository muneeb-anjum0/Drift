"""Model-free checks for the Phase III-I independent-review gate."""

import copy
import hashlib
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from freeze_phase3i_decision import validate, write_new


class ReviewGateTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.draft_path = self.root / "draft.json"
        self.review_path = self.root / "review.json"
        self.draft = {
            "role": "PROPOSED_DECISION_CASES_NOT_REVIEWED_NOT_SCORED",
            "cases": [{"id": f"case-{index:02d}", "proposed_label": "added"}
                      for index in range(90)],
        }
        self.draft_path.write_text(json.dumps(self.draft), encoding="utf-8")
        self.review = {
            "reviewer": "fixture-human-reviewer",
            "review_date": "2026-10-05",
            "draft_sha256": hashlib.sha256(self.draft_path.read_bytes()).hexdigest(),
            "decisions": [{"case_id": case["id"], "decision": "CONFIRMED",
                           "reviewed_label": "added", "review_note": ""}
                          for case in self.draft["cases"]],
        }

    def check(self, review=None):
        self.review_path.write_text(json.dumps(review or self.review), encoding="utf-8")
        return validate(self.draft_path, self.review_path)

    def test_complete_review_preserves_proposals(self):
        result = self.check()
        self.assertEqual(result["review_decision_counts"]["CONFIRMED"], 90)
        self.assertTrue(all(case["proposed_label"] == case["review"]["reviewed_label"]
                            for case in result["cases"]))

    def test_incomplete_template_rejected(self):
        review = copy.deepcopy(self.review)
        review["decisions"][0]["decision"] = None
        with self.assertRaisesRegex(ValueError, "invalid or missing decision"):
            self.check(review)

    def test_revision_note_and_ambiguous_exclusion(self):
        review = copy.deepcopy(self.review)
        review["decisions"][0].update(decision="REVISED", reviewed_label="removed", review_note="")
        with self.assertRaisesRegex(ValueError, "requires a note"):
            self.check(review)
        review["decisions"][0]["review_note"] = "Explicit option withdrawn."
        review["decisions"][1].update(decision="AMBIGUOUS", reviewed_label=None,
                                       review_note="Intent is unresolved.")
        review["decisions"][2].update(decision="EXCLUDE", reviewed_label=None,
                                       review_note="Defective baseline.")
        result = self.check(review)
        self.assertEqual(sum(case["primary_scored"] for case in result["cases"]), 88)
        self.assertEqual(result["cases"][0]["proposed_label"], "added")
        self.assertEqual(result["cases"][0]["review"]["reviewed_label"], "removed")

    def test_stale_sha_duplicate_and_wrong_confirmation_rejected(self):
        review = copy.deepcopy(self.review)
        review["draft_sha256"] = "0" * 64
        with self.assertRaisesRegex(ValueError, "draft SHA"):
            self.check(review)
        review = copy.deepcopy(self.review)
        review["decisions"][1]["case_id"] = "case-00"
        with self.assertRaisesRegex(ValueError, "duplicate"):
            self.check(review)
        review = copy.deepcopy(self.review)
        review["decisions"][0]["reviewed_label"] = "removed"
        with self.assertRaisesRegex(ValueError, "confirmed label"):
            self.check(review)

    def test_new_file_write_does_not_overwrite(self):
        path = self.root / "frozen.json"
        write_new(path, b"first")
        with self.assertRaises(FileExistsError):
            write_new(path, b"second")
        self.assertEqual(path.read_bytes(), b"first")


if __name__ == "__main__":
    unittest.main()
