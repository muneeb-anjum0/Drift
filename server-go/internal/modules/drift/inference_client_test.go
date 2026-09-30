package drift

import (
	"context"
	"errors"
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

func TestInferenceClientRejectsMalformedContract(t *testing.T) {
	tests := []struct {
		name string
		body string
	}{
		{"missing confidence", `{"label":"added","reasoning":"x","changed_elements":[]}`},
		{"wrong confidence type", `{"label":"added","confidence":"0.9","reasoning":"x","changed_elements":[]}`},
		{"negative confidence", `{"label":"added","confidence":-0.1,"reasoning":"x","changed_elements":[]}`},
		{"confidence over percentage", `{"label":"added","confidence":101,"reasoning":"x","changed_elements":[]}`},
		{"unknown label", `{"label":"invented","confidence":0.9,"reasoning":"x","changed_elements":[]}`},
		{"unknown field", `{"label":"added","confidence":0.9,"reasoning":"x","changed_elements":[],"trusted":true}`},
		{"multiple objects", `{"label":"added","confidence":0.9,"reasoning":"x","changed_elements":[]} {"label":"removed"}`},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
				w.Header().Set("Content-Type", "application/json")
				_, _ = w.Write([]byte(tt.body))
			}))
			defer server.Close()
			client := NewInferenceClient(config.Config{
				DriftInferenceEnabled: true,
				DriftInferenceURL:     server.URL,
				DriftInferenceTimeout: time.Second,
				DriftInferenceAPIKey:  "0123456789abcdef0123456789abcdef",
			})
			_, err := client.Predict(context.Background(), ModelAnalyzeRequest{BaselineRequirement: "baseline", NewClientMessage: "message"})
			if !errors.Is(err, ErrInferenceBadResponse) {
				t.Fatalf("expected ErrInferenceBadResponse, got %v", err)
			}
		})
	}
}

func TestInferenceClientNormalizesPercentageConfidence(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"label":"modified","confidence":95,"reasoning":"changed","changed_elements":["format"]}`))
	}))
	defer server.Close()
	client := NewInferenceClient(config.Config{
		DriftInferenceEnabled: true,
		DriftInferenceURL:     server.URL,
		DriftInferenceTimeout: time.Second,
		DriftInferenceAPIKey:  "0123456789abcdef0123456789abcdef",
	})
	prediction, err := client.Predict(context.Background(), ModelAnalyzeRequest{BaselineRequirement: "baseline", NewClientMessage: "message"})
	if err != nil {
		t.Fatal(err)
	}
	if prediction.Confidence != 0.95 {
		t.Fatalf("expected normalized confidence 0.95, got %v", prediction.Confidence)
	}
}
