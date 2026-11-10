package config

import (
	"encoding/base64"
	"strings"
	"testing"
	"time"
)

func validConfig() Config {
	return Config{
		JWTSecret:                  strings.Repeat("j", 32),
		JWTExpiresInHours:          24,
		AuthRateLimitRequests:      10,
		InferenceRateLimitRequests: 20,
		RateLimitWindow:            time.Minute,
		MaxUploadSizeMB:            10,
		ClientURL:                  "http://localhost:5173",
	}
}

func TestProviderMasterKeyOptionalButValidated(t *testing.T) {
	cfg := validConfig()
	if err := cfg.Validate(); err != nil {
		t.Fatalf("local-only config should not require provider key: %v", err)
	}
	for _, raw := range []string{"not-base64", base64.StdEncoding.EncodeToString([]byte("short"))} {
		cfg.ProviderMasterKey = raw
		if err := cfg.Validate(); err == nil {
			t.Fatal("invalid provider key accepted")
		}
	}
	cfg.ProviderMasterKey = base64.StdEncoding.EncodeToString([]byte(strings.Repeat("k", 32)))
	if err := cfg.Validate(); err != nil {
		t.Fatalf("valid provider key rejected: %v", err)
	}
}

func TestValidateRejectsMissingOrKnownJWTSecrets(t *testing.T) {
	for _, secret := range []string{"", "secret", "replace_with_strong_secret"} {
		cfg := validConfig()
		cfg.JWTSecret = secret
		if err := cfg.Validate(); err == nil {
			t.Fatalf("expected JWT secret %q to be rejected", secret)
		}
	}
}

func TestValidateRequiresIndependentInferenceCredential(t *testing.T) {
	cfg := validConfig()
	cfg.DriftInferenceEnabled = true
	cfg.DriftInferenceURL = "http://inference:8000"
	if err := cfg.Validate(); err == nil {
		t.Fatal("expected missing inference credential to be rejected")
	}
	cfg.DriftInferenceAPIKey = strings.Repeat("i", 32)
	if err := cfg.Validate(); err != nil {
		t.Fatalf("expected valid configuration: %v", err)
	}
}

func TestTrustedProxyCIDRsAreExplicit(t *testing.T) {
	for _, value := range []string{"invalid", "0.0.0.0/0", "::/0", ""} {
		cfg := validConfig()
		cfg.TrustedProxyCIDRs = []string{value}
		if err := cfg.Validate(); err == nil {
			t.Fatalf("expected trusted proxy value %q to fail", value)
		}
	}
	cfg := validConfig()
	cfg.TrustedProxyCIDRs = []string{"192.0.2.10/32", "2001:db8::10/128"}
	if err := cfg.Validate(); err != nil {
		t.Fatalf("expected explicit proxy hosts to pass: %v", err)
	}
}

func TestLoadTrustedProxyCIDRs(t *testing.T) {
	t.Setenv("TRUSTED_PROXY_CIDRS", "192.0.2.10/32, 2001:db8::10/128")
	cfg := Load()
	if len(cfg.TrustedProxyCIDRs) != 2 || cfg.TrustedProxyCIDRs[0] != "192.0.2.10/32" || cfg.TrustedProxyCIDRs[1] != "2001:db8::10/128" {
		t.Fatalf("unexpected trusted proxy configuration: %#v", cfg.TrustedProxyCIDRs)
	}
}

func TestClientURLRequiresHTTPSOutsideLoopback(t *testing.T) {
	for _, origin := range []string{"http://example.com", "http://192.0.2.1:5173", "https://example.com/path", "https://example.com?key=value"} {
		cfg := validConfig()
		cfg.ClientURL = origin
		if err := cfg.Validate(); err == nil {
			t.Fatalf("accepted insecure or non-origin CLIENT_URL %q", origin)
		}
	}
	for _, origin := range []string{"http://localhost:5173", "http://127.0.0.1:5173", "https://staging.example.com"} {
		cfg := validConfig()
		cfg.ClientURL = origin
		if err := cfg.Validate(); err != nil {
			t.Fatalf("rejected allowed CLIENT_URL %q: %v", origin, err)
		}
	}
}
