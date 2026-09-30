package middleware

import (
	"net/http"
	"strconv"
	"sync"
	"time"

	"driftledger/server-go/internal/response"
	"github.com/gin-gonic/gin"
)

type RateLimitKey func(*gin.Context) string

type rateLimitEntry struct {
	count   int
	resetAt time.Time
}

type RateLimiter struct {
	mu          sync.Mutex
	entries     map[string]rateLimitEntry
	limit       int
	window      time.Duration
	lastCleanup time.Time
}

func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
	return &RateLimiter{entries: make(map[string]rateLimitEntry), limit: limit, window: window}
}

func (l *RateLimiter) Middleware(keyFn RateLimitKey) gin.HandlerFunc {
	return func(c *gin.Context) {
		now := time.Now()
		key := keyFn(c)
		allowed, remaining, retryAfter := l.allow(key, now)
		c.Header("X-RateLimit-Limit", strconv.Itoa(l.limit))
		c.Header("X-RateLimit-Remaining", strconv.Itoa(remaining))
		if !allowed {
			c.Header("Retry-After", strconv.Itoa(max(1, int(retryAfter.Seconds()+0.999))))
			response.Error(c, http.StatusTooManyRequests, "Too many requests", nil)
			c.Abort()
			return
		}
		c.Next()
	}
}

func (l *RateLimiter) allow(key string, now time.Time) (bool, int, time.Duration) {
	l.mu.Lock()
	defer l.mu.Unlock()
	if l.lastCleanup.IsZero() || now.Sub(l.lastCleanup) >= l.window {
		for entryKey, entry := range l.entries {
			if !now.Before(entry.resetAt) {
				delete(l.entries, entryKey)
			}
		}
		l.lastCleanup = now
	}
	entry, exists := l.entries[key]
	if !exists || !now.Before(entry.resetAt) {
		l.entries[key] = rateLimitEntry{count: 1, resetAt: now.Add(l.window)}
		return true, l.limit - 1, 0
	}
	if entry.count >= l.limit {
		return false, 0, entry.resetAt.Sub(now)
	}
	entry.count++
	l.entries[key] = entry
	return true, l.limit - entry.count, 0
}

func RateLimitByIP(c *gin.Context) string {
	return c.ClientIP()
}

func RateLimitByUser(c *gin.Context) string {
	return CurrentUserID(c).Hex()
}
