package middleware

import (
	"crypto/tls"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestClientIPTrustBoundary(t *testing.T) {
	tests := []struct {
		name       string
		trusted    []string
		remote     string
		xff        string
		xRealIP    string
		wantClient string
	}{
		{"direct ignores spoofed headers", nil, "198.51.100.10:1234", "6.6.6.6", "7.7.7.7", "198.51.100.10"},
		{"untrusted peer ignores forwarding headers", []string{"192.0.2.10/32"}, "198.51.100.10:1234", "6.6.6.6", "7.7.7.7", "198.51.100.10"},
		{"trusted peer accepts forwarded client", []string{"192.0.2.10/32"}, "192.0.2.10:1234", "203.0.113.7", "", "203.0.113.7"},
		{"trusted peer accepts real IP fallback", []string{"192.0.2.10/32"}, "192.0.2.10:1234", "", "203.0.113.8", "203.0.113.8"},
		{"multiple hops discard spoofed prefix", []string{"192.0.2.10/32", "192.0.2.11/32"}, "192.0.2.10:1234", "6.6.6.6, 203.0.113.9, 192.0.2.11", "", "203.0.113.9"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := gin.New()
			if err := r.SetTrustedProxies(tt.trusted); err != nil {
				t.Fatal(err)
			}
			r.GET("/ip", func(c *gin.Context) { c.String(http.StatusOK, RateLimitByIP(c)) })
			request := httptest.NewRequest(http.MethodGet, "/ip", nil)
			request.RemoteAddr = tt.remote
			if tt.xff != "" {
				request.Header.Set("X-Forwarded-For", tt.xff)
			}
			if tt.xRealIP != "" {
				request.Header.Set("X-Real-IP", tt.xRealIP)
			}
			writer := httptest.NewRecorder()
			r.ServeHTTP(writer, request)
			if writer.Code != http.StatusOK || writer.Body.String() != tt.wantClient {
				t.Fatalf("status=%d client IP=%q, want %q", writer.Code, writer.Body.String(), tt.wantClient)
			}
		})
	}
}

func TestForwardedProtoCannotForgeHSTS(t *testing.T) {
	r := gin.New()
	r.Use(SecurityHeaders())
	r.GET("/", func(c *gin.Context) { c.Status(http.StatusOK) })
	request := httptest.NewRequest(http.MethodGet, "/", nil)
	request.Header.Set("X-Forwarded-Proto", "https")
	writer := httptest.NewRecorder()
	r.ServeHTTP(writer, request)
	if writer.Header().Get("Strict-Transport-Security") != "" {
		t.Fatal("untrusted forwarded protocol must not set HSTS")
	}
	request.TLS = &tls.ConnectionState{}
	writer = httptest.NewRecorder()
	r.ServeHTTP(writer, request)
	if writer.Header().Get("Strict-Transport-Security") == "" {
		t.Fatal("direct TLS must set HSTS")
	}
}
