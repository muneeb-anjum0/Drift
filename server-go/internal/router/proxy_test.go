package router

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"driftledger/server-go/internal/config"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func TestRouterTrustedProxyConfiguration(t *testing.T) {
	client, err := mongo.NewClient(options.Client().ApplyURI("mongodb://example.invalid:27017"))
	if err != nil {
		t.Fatal(err)
	}
	for _, tc := range []struct {
		name    string
		trusted []string
		wantIP  string
	}{
		{"default trusts no forwarding peer", nil, "192.0.2.10"},
		{"configured ingress peer is trusted", []string{"192.0.2.10/32"}, "203.0.113.7"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			cfg := config.Config{
				AppEnv:                     "test",
				ClientURL:                  "https://staging.example.test",
				JWTSecret:                  strings.Repeat("j", 32),
				AuthRateLimitRequests:      10,
				InferenceRateLimitRequests: 20,
				RateLimitWindow:            time.Minute,
				TrustedProxyCIDRs:          tc.trusted,
			}
			r := New(client.Database("proxy_test"), cfg, nil)
			r.GET("/proxy-test", func(c *gin.Context) { c.String(http.StatusOK, c.ClientIP()) })
			request := httptest.NewRequest(http.MethodGet, "/proxy-test", nil)
			request.RemoteAddr = "192.0.2.10:1234"
			request.Header.Set("X-Forwarded-For", "203.0.113.7")
			writer := httptest.NewRecorder()
			r.ServeHTTP(writer, request)
			if writer.Code != http.StatusOK || writer.Body.String() != tc.wantIP {
				t.Fatalf("status=%d client IP=%q, want %q", writer.Code, writer.Body.String(), tc.wantIP)
			}
		})
	}
}
