package file

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"driftledger/server-go/internal/config"
	"github.com/gin-gonic/gin"
)

func TestCapabilitiesRequireAuthentication(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	RegisterRoutes(router.Group("/api/v1/files"), nil, config.Config{}, nil)
	response := httptest.NewRecorder()
	router.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/api/v1/files/capabilities", nil))
	if response.Code != http.StatusUnauthorized {
		t.Fatalf("expected file capabilities to require authentication, got %d", response.Code)
	}
}
