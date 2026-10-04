import hashlib
import json
import unittest

from freeze_phase3e_retrieval import freeze


def fixture():
    draft = {"role": "REVIEW_DRAFT_NOT_FINAL_TEST", "r6_development_freeze_commit": "fixed",
             "projects": [{"id": "p", "size": "small", "requirements": [{"id": "r", "title": "t", "description": "d"}],
                           "queries": [{"id": "q", "message": "m", "expected_requirement_ids": ["r"],
                                        "categories": ["test"], "provenance": "MODEL_GENERATED"}]}]}
    raw = (json.dumps(draft) + "\n").encode()
    review = {"reviewer": "external-reviewer", "review_date": "2026-10-04",
              "draft_sha256": hashlib.sha256(raw).hexdigest(),
              "decisions": [{"case_id": "q", "status": "CONFIRMED", "reviewed_requirement_ids": ["r"], "note": ""}]}
    return raw, review


class FreezeTests(unittest.TestCase):
    def test_preserves_proposal_and_review(self):
        raw, review = fixture()
        dataset_raw, trail_raw = freeze(raw, json.dumps(review).encode())
        query = json.loads(dataset_raw)["projects"][0]["queries"][0]
        self.assertEqual(query["proposed_requirement_ids"], ["r"])
        self.assertEqual(query["expected_requirement_ids"], ["r"])
        self.assertEqual(json.loads(trail_raw)["decision_counts"], {"CONFIRMED": 1})

    def test_rejects_false_confirmation(self):
        raw, review = fixture()
        review["decisions"][0]["reviewed_requirement_ids"] = []
        with self.assertRaisesRegex(ValueError, "CONFIRMED"):
            freeze(raw, json.dumps(review).encode())

    def test_rejects_unresolved_ambiguity(self):
        raw, review = fixture()
        review["decisions"][0].update(status="AMBIGUOUS", note="unclear")
        with self.assertRaisesRegex(ValueError, "ambiguous"):
            freeze(raw, json.dumps(review).encode())

    def test_rejects_wrong_draft_hash(self):
        raw, review = fixture()
        review["draft_sha256"] = "0" * 64
        with self.assertRaisesRegex(ValueError, "different draft"):
            freeze(raw, json.dumps(review).encode())


if __name__ == "__main__":
    unittest.main()
