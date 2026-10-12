package middleware

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"driftledger/server-go/internal/config"
	"github.com/gin-gonic/gin"
)

func TestCORSAllowsOnlyConfiguredOriginOutsideDevelopment(t *testing.T) {
	for _, tc := range []struct {
		name, appEnv, origin, want string
	}{
		{"staging origin", "staging", "https://staging.example.test", "https://staging.example.test"},
		{"staging rejects local Vite", "staging", localViteOrigin, ""},
		{"staging rejects unrelated", "staging", "https://other.example.test", ""},
		{"development keeps local Vite", "development", localViteOrigin, localViteOrigin},
	} {
		t.Run(tc.name, func(t *testing.T) {
			engine := gin.New()
			engine.Use(CORS(config.Config{AppEnv: tc.appEnv, ClientURL: "https://staging.example.test"}))
			engine.GET("/probe", func(c *gin.Context) { c.Status(http.StatusNoContent) })
			request := httptest.NewRequest(http.MethodGet, "/probe", nil)
			request.Header.Set("Origin", tc.origin)
			response := httptest.NewRecorder()
			engine.ServeHTTP(response, request)
			if got := response.Header().Get("Access-Control-Allow-Origin"); got != tc.want {
				t.Fatalf("allow origin = %q, want %q", got, tc.want)
			}
		})
	}
}

func TestCORSPreflightIncludesProviderPUTWithoutGrantingOtherOrigins(t *testing.T) {
	for _, tc := range []struct {
		name, origin, method, wantOrigin string
	}{
		{"provider PUT", "https://staging.example.test", http.MethodPut, "https://staging.example.test"},
		{"existing GET", "https://staging.example.test", http.MethodGet, "https://staging.example.test"},
		{"existing POST", "https://staging.example.test", http.MethodPost, "https://staging.example.test"},
		{"existing PATCH", "https://staging.example.test", http.MethodPatch, "https://staging.example.test"},
		{"existing DELETE", "https://staging.example.test", http.MethodDelete, "https://staging.example.test"},
		{"untrusted PUT origin", "https://other.example.test", http.MethodPut, ""},
	} {
		t.Run(tc.name, func(t *testing.T) {
			engine := gin.New()
			engine.Use(CORS(config.Config{AppEnv: "staging", ClientURL: "https://staging.example.test"}))
			request := httptest.NewRequest(http.MethodOptions, "/api/v1/workspaces/abc/provider", nil)
			request.Header.Set("Origin", tc.origin)
			request.Header.Set("Access-Control-Request-Method", tc.method)
			response := httptest.NewRecorder()
			engine.ServeHTTP(response, request)
			if response.Code != http.StatusNoContent {
				t.Fatalf("preflight status = %d, want 204", response.Code)
			}
			if got := response.Header().Get("Access-Control-Allow-Origin"); got != tc.wantOrigin {
				t.Fatalf("allow origin = %q, want %q", got, tc.wantOrigin)
			}
			methods := strings.Split(response.Header().Get("Access-Control-Allow-Methods"), ", ")
			if !strings.Contains(" "+strings.Join(methods, " ")+" ", " "+tc.method+" ") {
				t.Fatalf("%s missing from allow methods: %v", tc.method, methods)
			}
		})
	}
}
