package middleware

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"driftledger/backend/internal/config"
	"github.com/gin-gonic/gin"
)

func TestSessionCookieIsHttpOnlyAndSecureForHTTPS(t *testing.T) {
	for _, tc := range []struct {
		origin string
		secure bool
	}{
		{"https://staging.example.test", true},
		{"http://localhost:5173", false},
	} {
		router := gin.New()
		cfg := config.Config{ClientURL: tc.origin, JWTExpiresInHours: 24}
		router.GET("/login", func(c *gin.Context) { SetSessionCookie(c, cfg, "signed-token") })
		response := httptest.NewRecorder()
		router.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/login", nil))
		cookies := response.Result().Cookies()
		if len(cookies) != 1 {
			t.Fatalf("%s: expected one cookie, got %d", tc.origin, len(cookies))
		}
		cookie := cookies[0]
		if cookie.Name != SessionCookie || cookie.Path != "/api/v1" || cookie.Value != "signed-token" || !cookie.HttpOnly || cookie.Secure != tc.secure || cookie.SameSite != http.SameSiteStrictMode || cookie.MaxAge != 24*60*60 {
			t.Fatalf("%s: unexpected cookie attributes: %#v", tc.origin, cookie)
		}
	}
}

func TestBrowserOriginBlocksCrossSiteWritesButAllowsSameOriginAndCLI(t *testing.T) {
	cfg := config.Config{ClientURL: "https://staging.example.test", AppEnv: "staging"}
	router := gin.New()
	router.Use(BrowserOrigin(cfg))
	router.POST("/auth/login", func(c *gin.Context) { c.Status(http.StatusNoContent) })
	for _, tc := range []struct {
		origin, fetchSite string
		want              int
	}{
		{"https://staging.example.test", "same-origin", http.StatusNoContent},
		{"https://other.example.test", "cross-site", http.StatusForbidden},
		{"https://staging.example.test", "cross-site", http.StatusForbidden},
		{"", "cross-site", http.StatusForbidden},
		{"", "", http.StatusNoContent},
	} {
		request := httptest.NewRequest(http.MethodPost, "/auth/login", strings.NewReader("{}"))
		if tc.origin != "" {
			request.Header.Set("Origin", tc.origin)
		}
		if tc.fetchSite != "" {
			request.Header.Set("Sec-Fetch-Site", tc.fetchSite)
		}
		response := httptest.NewRecorder()
		router.ServeHTTP(response, request)
		if response.Code != tc.want {
			t.Errorf("origin=%q fetchSite=%q: status=%d, want=%d", tc.origin, tc.fetchSite, response.Code, tc.want)
		}
	}
}
