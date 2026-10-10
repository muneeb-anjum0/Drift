package middleware

import (
	"net/http"
	"net/http/httptest"
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
