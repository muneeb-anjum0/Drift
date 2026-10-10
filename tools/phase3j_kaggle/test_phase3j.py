"""Model-free tests for the upload package's frozen classifier contract."""

from phase3j import classification_metrics, encode_rows, prompt_for, strict_prediction


def test_prompt_uses_p1_singleton_contract():
    row = {"baseline_requirement": "Store a record.", "message": "Delete it."}
    p1 = {"system_prompt": "Classifier system", "user_template":
          "Baseline requirement:\n{baseline_requirement}\n\nNew client message:\n{new_client_message}"}
    prompt = prompt_for(row, p1)
    assert prompt.startswith("<|im_start|>system\nClassifier system\n<|im_end|>\n")
    assert "Baseline requirement:\nStore a record." in prompt
    assert "New client message:\nDelete it." in prompt
    assert prompt.endswith("<|im_start|>assistant\n")


def test_strict_raw_json_rejects_extra_and_invalid_fields():
    good = '{"label":"removed","confidence":0.8,"reasoning":"Scope removed","changed_elements":[]}'
    assert strict_prediction(good) == "removed"
    assert strict_prediction(good[:-1] + ',"extra":1}') is None
    assert strict_prediction(good.replace("0.8", "true")) is None
    assert strict_prediction(good.replace('"removed"', '"other"')) is None
    assert strict_prediction("not JSON") is None


def test_label_only_training_target_never_fabricates_rationale():
    class CharacterTokenizer:
        def encode(self, value, add_special_tokens=False):
            return [ord(char) for char in value]

    row = {"id": "TR0001", "baseline_requirement": "Archive records.",
           "message": "Stop archiving.", "review": {"reviewed_label": "removed"}}
    p1 = {"system_prompt": "Classifier", "user_template":
          "{baseline_requirement} / {new_client_message}"}
    encoded = encode_rows([row], CharacterTokenizer(), p1, 1024)[0]
    supervised = "".join(chr(x) for x in encoded["labels"] if x != -100)
    assert supervised == 'removed"'
    assert "reasoning" not in supervised


def test_metrics_keep_invalid_as_error_and_export_boundary_confusions():
    rows = [("removed", "modified", 1.0), ("modified", "modified", 2.0),
            ("added", None, 3.0)]
    result = classification_metrics(rows)
    assert result["accuracy"] == 1 / 3
    assert result["structure_valid"] == 2
    assert result["confusion_matrix"]["added"]["INVALID"] == 1
    assert result["raw_confusions"]["removed_to_modified"] == 1
    assert result["latency_seconds_p95"] == 3.0
