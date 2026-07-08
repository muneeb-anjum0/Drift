package evaluation

import (
	"os"
	"path/filepath"
	"testing"

	"driftledger/server-go/internal/modules/drift"
)

func TestWriteReportsCreatesJsonAndMarkdown(t *testing.T) {
	service := Service{reportDir: t.TempDir()}
	report := Report{
		SchemaVersion:    1,
		GeneratedAt:      "2026-07-08T10:00:00Z",
		Mode:             "q4",
		Model:            ModelInfo{Label: "Qwen GGUF", Quantization: "Q4_K_M", Runtime: "Local GGUF / llama.cpp", Health: "ok", ModelLoaded: true},
		PassCount:        1,
		CaseCount:        1,
		PassRate:         100,
		AverageLatencyMs: 1000,
		Recommendation:   "ready",
		Cases:            []CaseResult{{ID: "sms", Name: "SMS OTP", ExpectedLabel: "added", ActualLabel: "added", Score: 35, Passed: true}},
	}

	jsonPath, mdPath, err := service.writeReports(report)

	if err != nil {
		t.Fatalf("expected report write to succeed: %v", err)
	}
	if filepath.Ext(jsonPath) != ".json" || filepath.Ext(mdPath) != ".md" {
		t.Fatalf("unexpected report paths %q %q", jsonPath, mdPath)
	}
	if _, err := os.Stat(jsonPath); err != nil {
		t.Fatalf("json report missing: %v", err)
	}
	if _, err := os.Stat(mdPath); err != nil {
		t.Fatalf("markdown report missing: %v", err)
	}
}

func TestValidateBenchmarkCaseCatchesWrongLabel(t *testing.T) {
	item := benchmarkCase{ID: "sms", ExpectedLabel: "added", MinScore: 30, MaxScore: 40}
	analysis := drift.AnalysisPreview{DriftScore: 35, EstimatedExtraHours: 2, Summary: "SMS OTP requested"}
	change := drift.DetectedChange{ChangeType: "modified", Description: "SMS OTP requested"}

	notes := validateBenchmarkCase(item, analysis, change, "modified")

	if len(notes) == 0 {
		t.Fatal("expected label mismatch note")
	}
}
