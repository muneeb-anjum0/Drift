package middleware

import (
	"testing"
	"time"
)

func TestRateLimiterEnforcesAndResetsWindow(t *testing.T) {
	limiter := NewRateLimiter(2, time.Minute)
	now := time.Date(2026, time.September, 30, 0, 0, 0, 0, time.UTC)

	allowed, remaining, _ := limiter.allow("user-1", now)
	if !allowed || remaining != 1 {
		t.Fatalf("unexpected first request result: allowed=%v remaining=%d", allowed, remaining)
	}
	allowed, remaining, _ = limiter.allow("user-1", now.Add(time.Second))
	if !allowed || remaining != 0 {
		t.Fatalf("unexpected second request result: allowed=%v remaining=%d", allowed, remaining)
	}
	allowed, remaining, retryAfter := limiter.allow("user-1", now.Add(2*time.Second))
	if allowed || remaining != 0 || retryAfter <= 0 {
		t.Fatalf("expected limit response, got allowed=%v remaining=%d retry=%s", allowed, remaining, retryAfter)
	}
	allowed, remaining, _ = limiter.allow("user-1", now.Add(time.Minute))
	if !allowed || remaining != 1 {
		t.Fatalf("expected reset window, got allowed=%v remaining=%d", allowed, remaining)
	}
}

func TestRateLimiterSeparatesKeys(t *testing.T) {
	limiter := NewRateLimiter(1, time.Minute)
	now := time.Now()
	if allowed, _, _ := limiter.allow("user-1", now); !allowed {
		t.Fatal("expected first user to be allowed")
	}
	if allowed, _, _ := limiter.allow("user-2", now); !allowed {
		t.Fatal("expected second user to have an independent limit")
	}
}
