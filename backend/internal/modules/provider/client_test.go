package provider

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func mockClient(server *httptest.Server) *Client {
	return &Client{endpoint: server.URL, model: "mock-model", key: "fixture-token", http: server.Client(), threshold: 0.25, maxAnalyzed: 3}
}

func TestNamedProviderEndpointsCannotRedirectKeys(t *testing.T) {
	for id, endpoint := range providerEndpoints {
		input := WriteRequest{ProviderType: TypeExternal, ProviderID: id, DisplayName: id, Endpoint: endpoint, Model: "example-model", APIKey: "example-key-123"}
		if err := validateExternalInput(input); err != nil {
			t.Fatalf("%s endpoint rejected: %v", id, err)
		}
		input.Endpoint = "https://attacker.example/v1"
		if !errors.Is(validateExternalInput(input), ErrInvalidConfig) {
			t.Fatalf("%s accepted a different endpoint", id)
		}
	}
	if providerIDForEndpoint("https://other.example/v1") != ProviderCustom {
		t.Fatal("unknown endpoint was not treated as custom")
	}
}

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(request *http.Request) (*http.Response, error) { return f(request) }

func TestNamedProviderRequestBudgets(t *testing.T) {
	for id, endpoint := range providerEndpoints {
		t.Run(id, func(t *testing.T) {
			client := &Client{endpoint: endpoint, model: "example-model", key: "fixture-token", http: &http.Client{Transport: roundTripFunc(func(request *http.Request) (*http.Response, error) {
				var body map[string]any
				if err := json.NewDecoder(request.Body).Decode(&body); err != nil {
					t.Fatal(err)
				}
				if id == ProviderOpenAI {
					if body["max_completion_tokens"] != float64(256) || body["max_tokens"] != nil {
						t.Fatalf("OpenAI budget mismatch: %v", body)
					}
				} else if body["max_tokens"] != float64(256) || body["max_completion_tokens"] != nil {
					t.Fatalf("compatible budget mismatch: %v", body)
				}
				return &http.Response{StatusCode: http.StatusOK, Body: io.NopCloser(strings.NewReader(`{"choices":[{"message":{"content":"{\"label\":\"unchanged\"}"}}]}`)), Header: make(http.Header)}, nil
			})}}
			if _, err := client.Predict(context.Background(), AnalyzeRequest{BaselineRequirement: "A", NewClientMessage: "A"}); err != nil {
				t.Fatal(err)
			}
		})
	}
}

func TestClientPredictValidAndSanitizedFailures(t *testing.T) {
	input := AnalyzeRequest{BaselineRequirement: "Export monthly reports", NewClientMessage: "Add CSV format"}
	valid := `{"choices":[{"message":{"content":"{\"label\":\"modified\"}"}}]}`
	cases := []struct {
		name   string
		status int
		body   string
		want   error
	}{
		{"valid", 200, valid, nil},
		{"bad json", 200, `{broken`, ErrProviderInvalidResponse},
		{"missing label", 200, `{"choices":[{"message":{"content":"{}"}}]}`, ErrProviderInvalidResponse},
		{"unknown label", 200, `{"choices":[{"message":{"content":"{\"label\":\"approved\"}"}}]}`, ErrProviderInvalidResponse},
		{"duplicate label", 200, `{"choices":[{"message":{"content":"{\"label\":\"added\",\"label\":\"removed\"}"}}]}`, ErrProviderInvalidResponse},
		{"unknown field", 200, `{"choices":[{"message":{"content":"{\"label\":\"added\",\"confidence\":0.8,\"reasoning\":\"x\",\"changed_elements\":[],\"approved\":true}"}}]}`, ErrProviderInvalidResponse},
		{"unsupported confidence", 200, `{"choices":[{"message":{"content":"{\"label\":\"added\",\"confidence\":0.8}"}}]}`, ErrProviderInvalidResponse},
		{"credential echo", 200, `{"choices":[{"message":{"content":"{\"label\":\"fixture-token\"}"}}]}`, ErrProviderInvalidResponse},
		{"unauthorized", 401, "do not show this response", ErrProviderAuthentication},
		{"forbidden", 403, "do not show this response", ErrProviderAuthentication},
		{"unknown model", 404, "do not show this response", ErrProviderModel},
		{"unsupported request", 400, "do not show this response", ErrProviderRequestRejected},
		{"rate limited", 429, "do not show this response", ErrProviderRateLimited},
		{"server error", 500, "do not show this response", ErrProviderUnavailable},
		{"oversized", 200, strings.Repeat("x", maxProviderResponseBytes+1), ErrProviderInvalidResponse},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if r.Header.Get("Authorization") != "Bearer fixture-token" || r.URL.Path != "/chat/completions" {
					t.Error("request did not use expected auth or endpoint")
				}
				w.WriteHeader(tc.status)
				_, _ = w.Write([]byte(tc.body))
			}))
			defer server.Close()
			prediction, err := mockClient(server).Predict(context.Background(), input)
			if tc.want == nil {
				if err != nil || prediction.Label != "modified" || !prediction.LabelOnly || prediction.Confidence != 0 || prediction.Reasoning != "" || len(prediction.ChangedElements) != 0 {
					t.Fatalf("valid prediction failed: %#v %v", prediction, err)
				}
				return
			}
			if !errors.Is(err, tc.want) || strings.Contains(err.Error(), "fixture-token") || strings.Contains(err.Error(), "do not show") {
				t.Fatalf("failure was not sanitized: %v", err)
			}
		})
	}
}

func TestClientTimeoutAndNoRedirect(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		select {
		case <-r.Context().Done():
		case <-time.After(200 * time.Millisecond):
		}
	}))
	defer server.Close()
	client := mockClient(server)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Millisecond)
	defer cancel()
	_, err := client.Predict(ctx, AnalyzeRequest{BaselineRequirement: "baseline", NewClientMessage: "change"})
	if !errors.Is(err, ErrProviderTimedOut) {
		t.Fatalf("timeout was not sanitized: %v", err)
	}
}
