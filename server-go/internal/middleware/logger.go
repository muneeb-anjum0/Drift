package middleware

import (
	"log/slog"
	"time"

	"github.com/gin-gonic/gin"
)

func RequestLogger(logger *slog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		startedAt := time.Now()
		c.Next()
		latency := time.Since(startedAt)

		level := slog.LevelInfo
		if c.Writer.Status() >= 500 {
			level = slog.LevelError
		} else if c.Writer.Status() >= 400 {
			level = slog.LevelWarn
		}

		logger.LogAttrs(
			c.Request.Context(),
			level,
			"http_request",
			slog.String("method", c.Request.Method),
			slog.String("path", c.FullPath()),
			slog.String("raw_path", c.Request.URL.Path),
			slog.Int("status", c.Writer.Status()),
			slog.Int("bytes", c.Writer.Size()),
			slog.String("client_ip", c.ClientIP()),
			slog.Duration("latency", latency),
		)
	}
}
