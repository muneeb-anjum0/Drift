package evaluation

import (
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestSummaryReturnsEmptyStateWhenReportFolderIsMissing(t *testing.T) {
	service := Service{reportDir: filepath.Join(t.TempDir(), "missing")}

	summary, err := service.Summary()

	if err != nil {
		t.Fatalf("expected empty summary without error, got %v", err)
	}
	if summary.HasReport {
		t.Fatalf("expected no report, got %#v", summary)
	}
	if len(summary.Cases) != 0 || len(summary.Reports) != 0 {
		t.Fatalf("expected empty slices, got %#v", summary)
	}
}

func TestSummaryReadsLatestEvaluationReport(t *testing.T) {
	dir := t.TempDir()
	older := writeReport(t, dir, "older.json", `{"schemaVersion":1,"generatedAt":"2026-07-07T10:00:00Z","mode":"q4","model":{"label":"old","quantization":"Q4_K_M","runtime":"Local GGUF / llama.cpp","health":"ok","modelLoaded":true},"passCount":1,"caseCount":1,"passRate":100,"averageLatencyMs":1000,"recommendation":"old","cases":[]}`)
	latest := writeReport(t, dir, "latest.json", `{"schemaVersion":1,"generatedAt":"2026-07-07T11:00:00Z","mode":"q4","model":{"label":"Qwen2.5-7B + DriftLedger LoRA","quantization":"Q4_K_M","runtime":"Local GGUF / llama.cpp","health":"ok","modelLoaded":true,"ggufModelPath":"/app/models/gguf/model.gguf"},"passCount":8,"caseCount":8,"passRate":100,"averageLatencyMs":9610,"recommendation":"ready","cases":[{"id":"sms","name":"Add SMS OTP as a password reset option","expectedLabel":"added","actualLabel":"added","score":35,"impact":"medium","estimatedHours":6,"latencyMs":1200,"passed":true,"title":"Add SMS OTP Password Reset","summary":"clean","reasoning":"clean","notes":[]}]}`)
	if err := os.Chtimes(older, mustTime("2026-07-07T10:00:00Z"), mustTime("2026-07-07T10:00:00Z")); err != nil {
		t.Fatal(err)
	}
	if err := os.Chtimes(latest, mustTime("2026-07-07T11:00:00Z"), mustTime("2026-07-07T11:00:00Z")); err != nil {
		t.Fatal(err)
	}

	summary, err := (Service{reportDir: dir}).Summary()

	if err != nil {
		t.Fatalf("expected summary, got %v", err)
	}
	if !summary.HasReport || summary.PassCount != 8 || summary.CaseCount != 8 {
		t.Fatalf("unexpected summary %#v", summary)
	}
	if summary.Model.Quantization != "Q4_K_M" || summary.LatestReportPath == "" {
		t.Fatalf("missing model/report metadata %#v", summary)
	}
	if len(summary.Cases) != 1 || summary.Cases[0].Title != "Add SMS OTP Password Reset" {
		t.Fatalf("case data was not parsed: %#v", summary.Cases)
	}
}

func TestReadReportRejectsPathTraversal(t *testing.T) {
	service := Service{reportDir: t.TempDir()}

	if _, err := service.readReport("../secret.json"); err == nil {
		t.Fatal("expected path traversal to be rejected")
	}
}

func writeReport(t *testing.T, dir, name, body string) string {
	t.Helper()
	path := filepath.Join(dir, name)
	if err := os.WriteFile(path, []byte(body), 0o600); err != nil {
		t.Fatal(err)
	}
	return path
}

func mustTime(value string) time.Time {
	parsed, err := time.Parse(time.RFC3339, value)
	if err != nil {
		panic(err)
	}
	return parsed
}
