package evaluation

import (
	"testing"

	"driftledger/server-go/internal/modules/drift"
)

func TestBenchmarkSuiteHasTenFocusedCases(t *testing.T) {
	if len(benchmarkCases) != 10 {
		t.Fatalf("expected 10 benchmark cases, got %d", len(benchmarkCases))
	}
}

func TestValidateBenchmarkCaseCatchesWrongLabel(t *testing.T) {
	item := benchmarkCase{ID: "sms", ExpectedLabel: "added", MinConfidence: 0.4}
	prediction := drift.ModelPrediction{Label: "modified", Confidence: 0.8, Reasoning: "SMS OTP requested"}

	notes := validateBenchmarkCase(item, prediction, "modified")

	if len(notes) == 0 {
		t.Fatal("expected label mismatch note")
	}
}

func TestValidateBenchmarkCaseCatchesLowConfidence(t *testing.T) {
	item := benchmarkCase{ID: "sms", ExpectedLabel: "added", MinConfidence: 0.6}
	prediction := drift.ModelPrediction{Label: "added", Confidence: 0.2, Reasoning: "SMS OTP requested"}

	notes := validateBenchmarkCase(item, prediction, "added")

	if len(notes) == 0 {
		t.Fatal("expected low confidence note")
	}
}
