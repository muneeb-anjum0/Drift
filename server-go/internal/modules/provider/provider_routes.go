package provider

import (
	"driftledger/server-go/internal/config"
	"driftledger/server-go/internal/middleware"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

func RegisterRoutes(group *gin.RouterGroup, db *mongo.Database, cfg config.Config, limiter *middleware.RateLimiter) {
	manager, err := NewManager(db, cfg)
	if err != nil {
		panic("invalid provider master key")
	}
	handler := NewHandler(manager)
	group.Use(middleware.Auth(db, cfg))
	group.GET("/:workspaceId/provider", handler.Get)
	group.POST("/:workspaceId/provider/test", limiter.Middleware(middleware.RateLimitByUser), handler.Test)
	group.PUT("/:workspaceId/provider", limiter.Middleware(middleware.RateLimitByUser), handler.Save)
	group.DELETE("/:workspaceId/provider", handler.Delete)
}
