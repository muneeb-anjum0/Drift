package middleware

import (
	"net/http"
	"strings"

	"driftledger/backend/internal/config"
	"github.com/gin-gonic/gin"
)

const SessionCookie = "drift_session"

func SetSessionCookie(c *gin.Context, cfg config.Config, token string) {
	http.SetCookie(c.Writer, &http.Cookie{
		Name: SessionCookie, Value: token, Path: "/api/v1",
		MaxAge:   cfg.JWTExpiresInHours * 60 * 60,
		HttpOnly: true, Secure: strings.HasPrefix(cfg.ClientURL, "https://"),
		SameSite: http.SameSiteStrictMode,
	})
}

func ClearSessionCookie(c *gin.Context, cfg config.Config) {
	http.SetCookie(c.Writer, &http.Cookie{
		Name: SessionCookie, Path: "/api/v1", MaxAge: -1,
		HttpOnly: true, Secure: strings.HasPrefix(cfg.ClientURL, "https://"),
		SameSite: http.SameSiteStrictMode,
	})
}

func allowedBrowserOrigin(cfg config.Config, origin string) bool {
	return origin != "" && (origin == cfg.ClientURL || (cfg.AppEnv == "development" && origin == localViteOrigin))
}

// Browsers send Origin on writes. Reject cross-origin attempts before they can
// create or change sessions, including login CSRF and provider-key updates.
func BrowserOrigin(cfg config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Method != http.MethodGet && c.Request.Method != http.MethodHead && c.Request.Method != http.MethodOptions {
			origin := c.GetHeader("Origin")
			if (origin != "" && !allowedBrowserOrigin(cfg, origin)) || c.GetHeader("Sec-Fetch-Site") == "cross-site" {
				c.AbortWithStatus(http.StatusForbidden)
				return
			}
		}
		c.Next()
	}
}
