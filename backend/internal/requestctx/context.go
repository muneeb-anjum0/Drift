package requestctx

import (
	"context"
	"time"
)

func WithTimeout(parent context.Context) (context.Context, context.CancelFunc) {
	return context.WithTimeout(parent, 8*time.Second)
}
