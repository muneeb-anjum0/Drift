package config

import (
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
