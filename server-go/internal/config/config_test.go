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
