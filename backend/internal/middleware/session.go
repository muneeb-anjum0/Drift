package middleware

import (
	"net/http"
	"net/url"
	"strings"

	"driftledger/backend/internal/config"
	"driftledger/backend/internal/response"
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
	if origin == "" {
		return false
	}
	if origin == cfg.ClientURL || (cfg.AppEnv == "development" && origin == localViteOrigin) {
		return true
	}
	// Local Docker installs are reachable through either loopback name. Keep
	// the configured scheme and port; other hosts and ports stay disallowed.
	configured, configuredErr := url.Parse(cfg.ClientURL)
	requested, requestedErr := url.Parse(origin)
	if configuredErr != nil || requestedErr != nil || configured.Scheme != "http" || requested.Scheme != "http" ||
		configured.Port() != requested.Port() || configured.Port() == "" || requested.Path != "" ||
		requested.RawQuery != "" || requested.Fragment != "" || requested.User != nil {
		return false
	}
	return localLoopbackHost(configured.Hostname()) && localLoopbackHost(requested.Hostname())
}

func localLoopbackHost(host string) bool {
	return host == "localhost" || host == "127.0.0.1"
}

// Browsers send Origin on writes. Reject cross-origin attempts before they can
// create or change sessions, including login CSRF and provider-key updates.
func BrowserOrigin(cfg config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Method != http.MethodGet && c.Request.Method != http.MethodHead && c.Request.Method != http.MethodOptions {
			origin := c.GetHeader("Origin")
			if (origin != "" && !allowedBrowserOrigin(cfg, origin)) || c.GetHeader("Sec-Fetch-Site") == "cross-site" {
				response.Error(c, http.StatusForbidden, "This browser address is not allowed. Open Drift at the configured app address and try again.", nil)
				c.Abort()
				return
			}
		}
		c.Next()
	}
}
