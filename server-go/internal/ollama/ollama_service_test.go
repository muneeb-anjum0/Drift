package ollama

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"driftledger/server-go/internal/config"
)

func TestEnhanceSummaryDisabledDoesNotCallOllama(t *testing.T) {
	service := New(config.Config{OllamaEnabled: false, OllamaTimeout: time.Second})

	if summary, ok := service.EnhanceSummary(context.Background(), "summary", ""); ok || summary != "" {
		t.Fatalf("expected disabled ollama to return no enhancement, got %q %v", summary, ok)
	}
}

func TestEnhanceSummaryUsesOllamaWhenAvailable(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/generate" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"response":"client friendly summary"}`))
	}))
	defer server.Close()

	service := New(config.Config{OllamaEnabled: true, OllamaBaseURL: server.URL, OllamaModel: "test", OllamaTimeout: time.Second})
	summary, ok := service.EnhanceSummary(context.Background(), "summary", "")

	if !ok || summary != "client friendly summary" {
		t.Fatalf("expected ollama enhancement, got %q %v", summary, ok)
	}
}

func TestEnhanceChangeRequestInvalidJSONFallsBack(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"response":"not json"}`))
	}))
	defer server.Close()

	service := New(config.Config{OllamaEnabled: true, OllamaBaseURL: server.URL, OllamaModel: "test", OllamaTimeout: time.Second})
	enhancement, ok := service.EnhanceChangeRequest(context.Background(), map[string]any{"summary": "plain"}, "")

	if ok || enhancement != nil {
		t.Fatalf("expected invalid ollama JSON to fall back, got %#v %v", enhancement, ok)
	}
}
