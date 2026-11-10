package middleware

import (
	"fmt"
	"log/slog"
	"time"

	"github.com/gin-gonic/gin"
)

func DevRequestLogger() gin.HandlerFunc {
	return gin.LoggerWithFormatter(func(p gin.LogFormatterParams) string {
		statusColor := p.StatusCodeColor()
		methodColor := p.MethodColor()
		resetColor := p.ResetColor()

		return fmt.Sprintf(
			"[API] %v |%s %3d %s| %13v | %15s |%s %-7s %s %#v\n",
			p.TimeStamp.Format("15:04:05"),
			statusColor,
			p.StatusCode,
			resetColor,
			p.Latency,
			p.ClientIP,
			methodColor,
			p.Method,
			resetColor,
			p.Path,
		)
	})
}

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
