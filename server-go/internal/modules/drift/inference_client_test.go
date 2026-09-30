package drift

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"driftledger/server-go/internal/config"
)

func TestInferenceClientSendsInternalCredential(t *testing.T) {
	const apiKey = "0123456789abcdef0123456789abcdef"
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("X-Drift-Inference-Key") != apiKey {
			http.Error(w, "missing credential", http.StatusUnauthorized)
			return
		}
		if r.URL.Path == "/health" {
			w.WriteHeader(http.StatusOK)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"label":"unchanged","confidence":0.9,"reasoning":"same","changed_elements":[]}`))
	}))
	defer server.Close()

	client := NewInferenceClient(config.Config{
		DriftInferenceEnabled: true,
		DriftInferenceURL:     server.URL,
		DriftInferenceTimeout: time.Second,
		DriftInferenceAPIKey:  apiKey,
	})
	if err := client.Health(context.Background()); err != nil {
		t.Fatalf("health request failed: %v", err)
	}
	if _, err := client.Predict(context.Background(), ModelAnalyzeRequest{
		BaselineRequirement: "baseline",
		NewClientMessage:    "message",
	}); err != nil {
		t.Fatalf("prediction request failed: %v", err)
	}
}
