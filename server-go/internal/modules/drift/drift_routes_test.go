package drift

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"driftledger/server-go/internal/config"
	"driftledger/server-go/internal/middleware"
	"github.com/gin-gonic/gin"
)

func TestDirectInferenceRoutesRequireAuthentication(t *testing.T) {
	gin.SetMode(gin.TestMode)
	cfg := config.Config{InferenceRateLimitRequests: 20, RateLimitWindow: time.Minute}
	limiter := middleware.NewRateLimiter(cfg.InferenceRateLimitRequests, cfg.RateLimitWindow)
	router := gin.New()
	RegisterRoutes(router.Group("/api/v1/drift"), nil, cfg, limiter)
	RegisterModelRoutes(router.Group("/api/drift"), nil, cfg, limiter)

	for _, path := range []string{"/api/v1/drift/analyze-direct", "/api/drift/analyze"} {
		request := httptest.NewRequest(
			http.MethodPost,
			path,
			bytes.NewBufferString(`{"baseline_requirement":"baseline","new_client_message":"message"}`),
		)
		request.Header.Set("Content-Type", "application/json")
		response := httptest.NewRecorder()
		router.ServeHTTP(response, request)
		if response.Code != http.StatusUnauthorized {
			t.Fatalf("expected %s to require authentication, got %d", path, response.Code)
		}
	}
}
