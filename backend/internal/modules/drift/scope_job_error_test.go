package drift

import (
	"errors"
	"strings"
	"testing"

	"driftledger/backend/internal/modules/provider"
)

func TestPublicScopeJobErrorExplainsProviderFailureWithoutDetails(t *testing.T) {
	cases := []struct {
		err  error
		want string
	}{
		{provider.ErrProviderTimedOut, "took too long"},
		{provider.ErrProviderRateLimited, "rate limit"},
		{provider.ErrProviderAuthentication, "API key"},
		{provider.ErrProviderUnavailable, "did not respond"},
	}
	for _, tc := range cases {
		message := publicScopeJobError(tc.err)
		if !strings.Contains(message, tc.want) || !strings.Contains(message, "No partial result was saved") {
			t.Fatalf("unexpected public error for %v: %q", tc.err, message)
		}
	}
	internal := errors.New("upstream response contained a private token")
	if strings.Contains(publicScopeJobError(internal), "private token") {
		t.Fatal("internal error reached the job response")
	}
}
