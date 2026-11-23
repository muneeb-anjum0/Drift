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

func TestScopeHTTPClientKeepsRestrictedTransport(t *testing.T) {
	base := SafeHTTPClient()
	provider := &Client{http: base}
	scope := provider.scopeHTTPClient()
	baseTransport := base.Transport.(*http.Transport)
	scopeTransport := scope.Transport.(*http.Transport)
	if scope.Timeout != 120*time.Second || scopeTransport.ResponseHeaderTimeout != 110*time.Second {
		t.Fatalf("scope timeouts are too short: %v / %v", scope.Timeout, scopeTransport.ResponseHeaderTimeout)
	}
	if base.Timeout != 20*time.Second || baseTransport.ResponseHeaderTimeout != 15*time.Second {
		t.Fatal("scope request changed the short credential-check timeouts")
	}
	if scopeTransport == baseTransport || scopeTransport.Proxy != nil || scopeTransport.DialContext == nil || scope.CheckRedirect == nil || !scopeTransport.DisableKeepAlives {
		t.Fatal("scope request lost restricted transport or redirect policy")
	}
}

func TestScopeAssessTimeoutAndUpstreamStatus(t *testing.T) {
	client := &Client{endpoint: "https://provider.example/v1", model: "mock-model", key: "fixture-token", http: &http.Client{Transport: roundTripFunc(func(*http.Request) (*http.Response, error) {
		return nil, context.DeadlineExceeded
	})}}
	if _, err := client.AssessScope(context.Background(), "system", []byte(`{"requestText":"synthetic"}`)); !errors.Is(err, ErrProviderTimedOut) {
		t.Fatalf("timeout was not classified: %v", err)
	}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/chat/completions" || r.Header.Get("Authorization") != "Bearer fixture-token" {
			t.Error("scope request used unexpected route or authorization")
		}
		if strings.Contains(r.Header.Get("Authorization"), "do not show") {
			t.Error("unexpected credential")
		}
		w.WriteHeader(http.StatusServiceUnavailable)
		_, _ = w.Write([]byte("do not show this provider response"))
	}))
	defer server.Close()
	client = mockClient(server)
	_, err := client.AssessScope(context.Background(), "system", []byte(`{"requestText":"synthetic"}`))
	if !errors.Is(err, ErrProviderUnavailable) || !strings.Contains(err.Error(), "HTTP 503") || strings.Contains(err.Error(), "do not show") {
		t.Fatalf("upstream status was not sanitized: %v", err)
	}
}
