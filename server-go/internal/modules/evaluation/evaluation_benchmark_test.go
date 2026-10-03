package evaluation

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"driftledger/server-go/internal/config"
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

func TestInferenceHealthSendsInternalCredential(t *testing.T) {
	const apiKey = "0123456789abcdef0123456789abcdef"
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got := r.Header.Get("X-Drift-Inference-Key"); got != apiKey {
			t.Fatalf("expected inference credential, got %q", got)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"status":"ok","model_loaded":true}`))
	}))
	defer server.Close()

	service := Service{cfg: config.Config{
		DriftInferenceURL:     server.URL,
		DriftInferenceAPIKey:  apiKey,
		DriftInferenceTimeout: time.Second,
	}}
	result, err := service.inferenceHealth(context.Background())
	if err != nil {
		t.Fatalf("inference health failed: %v", err)
	}
	if result["status"] != "ok" {
		t.Fatalf("unexpected health payload: %#v", result)
	}
}
