package workspace

import (
	"driftledger/server-go/internal/config"
	"driftledger/server-go/internal/middleware"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

func RegisterRoutes(group *gin.RouterGroup, db *mongo.Database, cfg config.Config) {
	handler := NewHandler(NewService(db))
	group.Use(middleware.Auth(db, cfg))
	group.POST("", handler.Create)
	group.GET("", handler.List)
	group.GET("/:workspaceId", handler.Get)
	group.PATCH("/:workspaceId", handler.Update)
	group.DELETE("/:workspaceId", handler.Delete)
}
