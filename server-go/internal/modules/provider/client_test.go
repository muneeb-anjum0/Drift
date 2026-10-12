package provider

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func mockClient(server *httptest.Server) *Client {
	return &Client{endpoint: server.URL, model: "mock-model", key: "fixture-token", http: server.Client(), threshold: 0.25, maxAnalyzed: 3}
}

func TestClientPredictValidAndSanitizedFailures(t *testing.T) {
	input := AnalyzeRequest{BaselineRequirement: "Export monthly reports", NewClientMessage: "Add CSV format"}
	valid := `{"choices":[{"message":{"content":"{\"label\":\"modified\",\"confidence\":0.8,\"reasoning\":\"CSV adds a format\",\"changed_elements\":[\"CSV\"]}"}}]}`
	cases := []struct {
		name   string
		status int
		body   string
		want   error
	}{
		{"valid", 200, valid, nil},
		{"bad json", 200, `{broken`, ErrProviderInvalidResponse},
		{"missing field", 200, `{"choices":[{"message":{"content":"{\"label\":\"added\"}"}}]}`, ErrProviderInvalidResponse},
		{"unknown label", 200, `{"choices":[{"message":{"content":"{\"label\":\"approved\",\"confidence\":0.8,\"reasoning\":\"x\",\"changed_elements\":[]}"}}]}`, ErrProviderInvalidResponse},
		{"duplicate label", 200, `{"choices":[{"message":{"content":"{\"label\":\"added\",\"label\":\"removed\",\"confidence\":0.8,\"reasoning\":\"x\",\"changed_elements\":[]}"}}]}`, ErrProviderInvalidResponse},
		{"unknown field", 200, `{"choices":[{"message":{"content":"{\"label\":\"added\",\"confidence\":0.8,\"reasoning\":\"x\",\"changed_elements\":[],\"approved\":true}"}}]}`, ErrProviderInvalidResponse},
		{"confidence out of range", 200, `{"choices":[{"message":{"content":"{\"label\":\"added\",\"confidence\":1.5,\"reasoning\":\"x\",\"changed_elements\":[]}"}}]}`, ErrProviderInvalidResponse},
		{"credential echo", 200, `{"choices":[{"message":{"content":"{\"label\":\"added\",\"confidence\":0.8,\"reasoning\":\"fixture-token\",\"changed_elements\":[]}"}}]}`, ErrProviderInvalidResponse},
		{"unauthorized", 401, "do not show this response", ErrProviderAuthentication},
		{"forbidden", 403, "do not show this response", ErrProviderAuthentication},
		{"unknown model", 404, "do not show this response", ErrProviderModel},
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
				if err != nil || prediction.Label != "modified" {
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
