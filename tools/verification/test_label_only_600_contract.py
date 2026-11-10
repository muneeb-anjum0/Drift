"""Contract tests use synthetic IDs only; they never open reviewed or locked cases."""

import json
import unittest
from pathlib import Path

from label_only_600_contract import LABELS, decision, parse_raw, repeat_ids, score

GATE = json.loads((Path(__file__).parents[2] / "evaluation/label_only_new/gate_v1.json").read_text())


def fixture():
    cases = [{"id": f"{label}-{index:02d}", "reviewed_label": label}
             for label in LABELS for index in range(25)]
    primary = {row["id"]: {"raw_text": json.dumps({"label": row["reviewed_label"]}),
                            "finish_reason": "eos"} for row in cases}
    repeat = {case_id: primary[case_id].copy() for case_id in repeat_ids(cases)}
    return cases, primary, repeat


class LabelOnlyContractTests(unittest.TestCase):
    def test_strict_parser(self):
        self.assertEqual(parse_raw(' \n{"label":"removed"}\t', "stop"), ("removed", None))
        for raw in (
            '{"label":"removed","label":"modified"}',
            '{"label":"removed","confidence":0.9}',
            '{"label":"Removed"}',
            '{"label":"removed"} trailing',
            '```json\n{"label":"removed"}\n```',
            '{"label":null}',
            '[{"label":"removed"}]',
            '{"label":NaN}',
        ):
            self.assertIsNone(parse_raw(raw, "stop")[0], raw)
        self.assertEqual(parse_raw('{"label":"removed"}', "length"),
                         (None, "incomplete_or_unknown_finish"))

    def test_gate_order_and_directed_error(self):
        cases, primary, repeat = fixture()
        clean = score(cases, primary, repeat)
        self.assertEqual(clean["correct"], 150)
        self.assertEqual(clean["macro_f1"], 1.0)
        self.assertEqual(decision(clean, GATE, True), "NO_TRAINING_JUSTIFIED")
        self.assertEqual(decision(clean, GATE, False), "INCONCLUSIVE")
        for index in range(6):
            case_id = f"removed-{index:02d}"
            primary[case_id] = {"raw_text": '{"label":"modified"}', "finish_reason": "eos"}
            if case_id in repeat:
                repeat[case_id] = primary[case_id].copy()
        report = score(cases, primary, repeat)
        self.assertEqual(report["confusion"]["removed"]["modified"], 6)
        self.assertEqual(decision(report, GATE, True), "TRAINING_EXPERIMENT_JUSTIFIED")

    def test_invalid_and_gray_zone_cannot_pass(self):
        cases, primary, repeat = fixture()
        primary["added-00"] = {"raw_text": '{"label":"added","label":"added"}',
                               "finish_reason": "eos"}
        report = score(cases, primary, repeat)
        self.assertEqual(report["invalid_reasons"], {"duplicate_key": 1})
        self.assertEqual(report["confusion"]["added"]["INVALID"], 1)
        self.assertEqual(decision(report, GATE, True), "INCONCLUSIVE")

        cases, primary, repeat = fixture()
        for index in range(4):
            case_id = f"removed-{index:02d}"
            primary[case_id] = {"raw_text": '{"label":"modified"}', "finish_reason": "eos"}
            if case_id in repeat:
                repeat[case_id] = primary[case_id].copy()
        self.assertEqual(decision(score(cases, primary, repeat), GATE, True), "INCONCLUSIVE")

    def test_repeat_label_flip_is_inconclusive(self):
        cases, primary, repeat = fixture()
        case_id = repeat_ids(cases)[0]
        repeat[case_id] = {"raw_text": '{"label":"modified"}', "finish_reason": "eos"}
        report = score(cases, primary, repeat)
        self.assertEqual(report["repeat"]["valid"], 30)
        self.assertEqual(report["repeat"]["label_agreement"], 29)
        self.assertEqual(decision(report, GATE, True), "INCONCLUSIVE")


if __name__ == "__main__":
    unittest.main()
